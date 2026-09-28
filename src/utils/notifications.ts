import { getStoredAccounts, getCurrentAuthUser } from './auth';
import { saveWholeCollectionToSupabase } from './supabaseClient';
import {
  getUserNotificationPreferences,
  playUserCustomSoundForCategory,
  NotificationCategoryType,
  sendExternalNotification,
  isWithinNotificationSchedule,
} from './userNotificationPreferences';
import { playNotificationSound } from './soundAlerts';

export { playUserCustomSoundForCategory };
export type { NotificationCategoryType };

export type NotificationCategory =
  | 'Tarefas'
  | 'Boletos'
  | 'Follow-up'
  | 'Meta'
  | 'Notas'
  | 'Pendências'
  | 'Pós-Vendas'
  | 'Estoque'
  | 'Tabela Comercial';

export interface SystemNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  targetTab: string;
  recipientId?: string;
  recipientName?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'fenix_header_notifications_v2';

// Sistema oficial Fênix World: somente notificações REAIS de eventos do sistema/Supabase.
// Zero notificações fictícias, de demonstração ou seed falso.
const INITIAL_SYSTEM_NOTIFICATIONS: SystemNotification[] = [];

/**
 * Filtro de validação de notificações reais: remove dados fictícios, seeds legados ou mensagens de Chat
 */
function isRealSystemNotification(n: any): boolean {
  if (!n || typeof n !== 'object') return false;
  const id = String(n.id || '');
  // Bloquear seeds legados fictícios
  if (
    id === 'notif_met_1' ||
    id === 'notif_bol_1' ||
    id === 'notif_fup_1' ||
    id === 'notif_tar_1' ||
    id === 'notif_not_1' ||
    id === 'notif_pen_1' ||
    id === 'notif_tar_2' ||
    id === 'notif_bol_2' ||
    id === 'notif_fup_2' ||
    id.startsWith('mock-') ||
    id.startsWith('demo-')
  ) {
    return false;
  }
  // Bloquear Chat: mensagens de chat pertencem exclusivamente ao balãozinho do Chat
  if ((n.category as any) === 'Chat' || n.targetTab === 'Chat') {
    return false;
  }
  return true;
}

/**
 * Normaliza e localiza a conta do usuário pelo ID ou Nome
 */
function resolveUser(identifier: string | { id?: string; name?: string } | null | undefined) {
  if (!identifier) return null;
  const rawStr = typeof identifier === 'string' ? identifier : (identifier.name || identifier.id || '');
  if (!rawStr || typeof rawStr !== 'string') return null;

  const accounts = getStoredAccounts();
  const idLower = rawStr.trim().toLowerCase();

  // 1. Busca por nome exato
  if (accounts[rawStr]) return accounts[rawStr];

  // 2. Busca por ID
  const byId = Object.values(accounts).find((u) => u.id === rawStr || (typeof identifier === 'object' && identifier.id && u.id === identifier.id));
  if (byId) return byId;

  // 3. Busca por similaridade no nome (Eder, Vanessa, Jessica/Jhessica)
  const byName = Object.values(accounts).find((u) => {
    const n = u.name.toLowerCase();
    if (n === idLower) return true;
    if (idLower.includes('eder') && n.includes('eder')) return true;
    if (idLower.includes('vanessa') && n.includes('vanessa')) return true;
    if (
      (idLower.includes('jhessica') || idLower.includes('jessica')) &&
      (n.includes('jhessica') || n.includes('jessica'))
    ) {
      return true;
    }
    return false;
  });

  return byName || null;
}

/**
 * Lê todas as notificações salvas no LocalStorage
 */
export function getAllStoredNotifications(): SystemNotification[] {
  if (typeof window === 'undefined') return INITIAL_SYSTEM_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Valida que somente notificações REAIS e SEM CHAT permaneçam
        const cleaned = parsed.filter(isRealSystemNotification);
        if (cleaned.length !== parsed.length) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          } catch {}
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Erro ao ler notificações do storage:', err);
  }
  return INITIAL_SYSTEM_NOTIFICATIONS;
}

/**
 * Desativa lembretes de um Follow-up diretamente a partir do sino de notificações.
 * Salva no localStorage e sincroniza no Supabase.
 */
export function deactivateFollowUpFromNotification(followUpId: string): boolean {
  if (!followUpId) return false;
  try {
    const raw = localStorage.getItem('fenix_followup_cards_v2') || localStorage.getItem('fenix_followup_db');
    if (raw) {
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        let changed = false;
        const updated = items.map((it: any) => {
          if (it.id === followUpId) {
            changed = true;
            return { ...it, lembretesAtivos: false };
          }
          return it;
        });
        if (changed) {
          localStorage.setItem('fenix_followup_cards_v2', JSON.stringify(updated));
          saveWholeCollectionToSupabase('fenix_followup_cards_v2', updated).catch(() => {});
          window.dispatchEvent(new Event('fenix_followup_updated'));
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao desativar lembretes do follow-up:', err);
  }
  return false;
}

/**
 * Salva a lista completa no storage e notifica o aplicativo
 */
function saveAllNotifications(list: SystemNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('fenix_notifications_updated'));
    window.dispatchEvent(new Event('storage'));
    saveWholeCollectionToSupabase(STORAGE_KEY, list).catch((err) => {
      console.warn('Erro ao sincronizar notificações com Supabase:', err);
    });
  } catch (err) {
    console.error('Erro ao persistir notificações:', err);
  }
}

/**
 * Envia uma notificação direcionada especificamente para um usuário.
 * Identifica o destinatário de forma consistente por ID e Nome Canônico.
 */
export function sendUserNotification(params: {
  id?: string;
  category: NotificationCategory;
  title: string;
  description: string;
  targetTab: string;
  recipientName?: string;
  recipientId?: string;
  authorName?: string;
  authorId?: string;
  metadata?: Record<string, any>;
}): SystemNotification {
  const targetUser = (params.recipientId || params.recipientName)
    ? resolveUser(params.recipientId || params.recipientName || '')
    : null;
  const authorUser = params.authorName ? resolveUser(params.authorName) : null;

  const resolvedRecipientName = targetUser ? targetUser.name : (params.recipientName?.trim() || 'Todos');
  const resolvedRecipientId = targetUser ? targetUser.id : params.recipientId;

  const now = new Date();
  const horaStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newNotification: SystemNotification = {
    id: params.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    category: params.category,
    title: params.title,
    description: params.description,
    time: `Hoje às ${horaStr}`,
    unread: true,
    targetTab: params.targetTab,
    recipientId: resolvedRecipientId,
    recipientName: resolvedRecipientName,
    authorId: authorUser ? authorUser.id : params.authorId,
    authorName: authorUser ? authorUser.name : params.authorName,
    createdAt: now.toISOString(),
    metadata: params.metadata,
  };

  const currentList = getAllStoredNotifications().filter((n) => n.id !== newNotification.id);
  const updatedList = [newNotification, ...currentList];
  saveAllNotifications(updatedList);

  // Broadcast entre abas / sessões ativas
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fenix_new_assignment_notification', { detail: newNotification })
      );
    }
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('fenix_notifications_channel');
      bc.postMessage({ type: 'NEW_NOTIFICATION', notification: newNotification });
      bc.close();
    }
  } catch {}

  // Toca o som no momento do envio para o usuário destinatário ou sempre para Pendências
  try {
    const currentUserName = getCurrentAuthUser() || 'Usuário';
    const isPendencia = newNotification.category === 'Pendências';
    const isSelfAuthor = Boolean(
      newNotification.authorName &&
      currentUserName &&
      newNotification.authorName.trim().toLowerCase() === currentUserName.trim().toLowerCase()
    );

    const isDirected = isNotificationDirectedToUser(newNotification, currentUserName);

    // REGRA EXPLÍCITA: Pendências SEMPRE toca som para feedback sonoro no sino
    if (isPendencia || (!isSelfAuthor && isDirected) || (isSelfAuthor && isDirected)) {
      const categoryKeyMap: Record<NotificationCategory, NotificationCategoryType> = {
        'Tarefas': 'tarefas',
        'Boletos': 'boletos',
        'Follow-up': 'followup',
        'Meta': 'metas',
        'Notas': 'notas',
        'Pendências': 'pendencias',
        'Pós-Vendas': 'posvendas',
        'Estoque': 'estoque',
        'Tabela Comercial': 'tabelas',
      };
      const catType = categoryKeyMap[newNotification.category] || 'pendencias';
      playUserCustomSoundForCategory(currentUserName, catType);

      // Dispara notificação externa no dispositivo se ativada
      const prefs = getUserNotificationPreferences(currentUserName);
      if (
        prefs.enabled !== false &&
        prefs.externalAlerts?.[catType] !== false &&
        isWithinNotificationSchedule(prefs)
      ) {
        sendExternalNotification(newNotification.title, {
          body: newNotification.description,
          targetTab: newNotification.targetTab,
          metadata: newNotification.metadata,
          tag: `fenix_notif_${newNotification.id}`,
        });
      }
    }
  } catch (audioErr) {
    console.warn('Aviso: Não foi possível reproduzir som de notificação:', audioErr);
  }

  return newNotification;
}

/**
 * Verifica se uma notificação é direcionada para um determinado usuário (por ID ou Nome)
 */
export function isNotificationDirectedToUser(
  notif: SystemNotification,
  userNameOrId: string | { id?: string; name?: string }
): boolean {
  if (!userNameOrId) return true;

  const user = resolveUser(userNameOrId);
  const targetId = user?.id || (typeof userNameOrId === 'object' ? userNameOrId.id : undefined);
  const targetName = (user?.name || (typeof userNameOrId === 'string' ? userNameOrId : userNameOrId?.name || '')).trim().toLowerCase();

  // Se for notificação de Chat enviada pelo próprio usuário, não deve notificar o autor
  if ((notif.category as string) === 'Chat' && notif.authorName) {
    const authorNorm = notif.authorName.trim().toLowerCase();
    if (
      authorNorm === targetName ||
      (targetName.includes('eder') && authorNorm.includes('eder')) ||
      (targetName.includes('vanessa') && authorNorm.includes('vanessa')) ||
      (targetName.includes('jhessica') && authorNorm.includes('jhessica')) ||
      (targetName.includes('jeferson') && authorNorm.includes('jeferson'))
    ) {
      return false;
    }
  }

  // 1. Se tem ID de destinatário específico
  if (notif.recipientId && targetId) {
    return notif.recipientId === targetId;
  }

  // 2. Se tem Nome de destinatário específico
  if (notif.recipientName && notif.recipientName !== 'Todos' && notif.recipientName !== 'Geral') {
    const rec = notif.recipientName.trim().toLowerCase();
    if (rec === targetName) return true;
    if (rec.includes(targetName) || targetName.includes(rec)) return true;
    if (targetName.includes('eder') && rec.includes('eder')) return true;
    if (targetName.includes('vanessa') && rec.includes('vanessa')) return true;
    if (
      (targetName.includes('jhessica') || targetName.includes('jessica')) &&
      (rec.includes('jhessica') || rec.includes('jessica'))
    ) {
      return true;
    }
    if (targetName.includes('lucilene') && rec.includes('lucilene')) return true;
    if (targetName.includes('fernando') && rec.includes('fernando')) return true;
    return false;
  }

  // 3. Notificações broadcast ou legadas do sistema geral (sem destinatário único ou destinadas a 'Todos')
  return true;
}

/**
 * Retorna somente as notificações destinadas ao usuário logado ou gerais da empresa
 */
export function getUserNotifications(userNameOrId: string): SystemNotification[] {
  const all = getAllStoredNotifications().filter(
    (n) => (n.category as any) !== 'Chat' && n.targetTab !== 'Chat'
  );
  if (!userNameOrId) return all;
  return all.filter((notif) => isNotificationDirectedToUser(notif, userNameOrId));
}

/**
 * Marca notificações que atendem a uma condição como lidas (ex: tarefa concluída, chat lido)
 */
export function markNotificationsAsReadByCondition(predicate: (n: SystemNotification) => boolean): void {
  const current = getAllStoredNotifications();
  let changed = false;
  const updated = current.map((n) => {
    if (n.unread && predicate(n)) {
      changed = true;
      return { ...n, unread: false };
    }
    return n;
  });
  if (changed) {
    saveAllNotifications(updated);
  }
}

/**
 * Marca uma notificação específica como lida
 */
export function markNotificationAsRead(id: string): void {
  const current = getAllStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, unread: false } : n));
  saveAllNotifications(updated);
}

/**
 * Marca todas as notificações do usuário logado como lidas
 */
export function markAllNotificationsAsReadForUser(userNameOrId: string): void {
  const user = resolveUser(userNameOrId);
  const targetId = user?.id;
  const targetName = (user?.name || userNameOrId).trim().toLowerCase();

  const current = getAllStoredNotifications();
  const updated = current.map((n) => {
    const isTarget =
      (n.recipientId && targetId && n.recipientId === targetId) ||
      (n.recipientName && (
        n.recipientName.toLowerCase() === targetName ||
        (targetName.includes('eder') && n.recipientName.toLowerCase().includes('eder')) ||
        (targetName.includes('vanessa') && n.recipientName.toLowerCase().includes('vanessa')) ||
        ((targetName.includes('jhessica') || targetName.includes('jessica')) &&
          (n.recipientName.toLowerCase().includes('jhessica') || n.recipientName.toLowerCase().includes('jessica')))
      )) ||
      (!n.recipientId && !n.recipientName);

    if (isTarget) {
      return { ...n, unread: false };
    }
    return n;
  });

  saveAllNotifications(updated);
}

/**
 * Remove uma notificação específica
 */
export function deleteNotification(id: string): void {
  const current = getAllStoredNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveAllNotifications(updated);
}

/**
 * Remove múltiplas notificações em massa
 */
export function deleteNotifications(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = getAllStoredNotifications();
  const updated = current.filter((n) => !idSet.has(n.id));
  saveAllNotifications(updated);
}

/**
 * Marca múltiplas notificações como lidas em massa
 */
export function markNotificationsAsRead(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = getAllStoredNotifications();
  const updated = current.map((n) => (idSet.has(n.id) ? { ...n, unread: false } : n));
  saveAllNotifications(updated);
}

/**
 * Alterna status de leitura (lida / não lida) de uma notificação
 */
export function toggleNotificationRead(id: string): void {
  const current = getAllStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n));
  saveAllNotifications(updated);
}

/**
 * Limpa todas as notificações já lidas do usuário
 */
export function clearAllReadNotificationsForUser(userNameOrId: string): void {
  const user = resolveUser(userNameOrId);
  const targetId = user?.id;
  const targetName = (user?.name || userNameOrId).trim().toLowerCase();

  const current = getAllStoredNotifications();
  const updated = current.filter((n) => {
    const isUserNotif =
      (n.recipientId && targetId && n.recipientId === targetId) ||
      (n.recipientName && n.recipientName.toLowerCase() === targetName) ||
      (!n.recipientId && !n.recipientName);

    // Se for do usuário e estiver lida, remove
    if (isUserNotif && !n.unread) {
      return false;
    }
    return true;
  });

  saveAllNotifications(updated);
}
