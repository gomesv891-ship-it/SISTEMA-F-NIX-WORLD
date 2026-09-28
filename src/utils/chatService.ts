import { getSupabaseClient } from './supabaseClient';
import { ChatMessage, UserPresenceInfo, ConversationSummary } from '../types/chat';

export const CHAT_MESSAGES_KEY = 'fenix_chat_messages';
export const CHAT_PRESENCE_KEY = 'fenix_user_presence';
export const REALTIME_CHAT_CHANNEL = 'fenix_crm_chat_realtime';

export const TEAM_MEMBERS = [
  {
    name: 'Éder Perez',
    canonical: 'Eder Perez',
    cargo: 'Diretor',
    avatarInitials: 'EP',
    avatarColor: '#10B981',
    email: 'eder@fenixworld.com.br',
  },
  {
    name: 'Vanessa Gomes',
    canonical: 'Vanessa Gomes',
    cargo: 'Consultora Comercial',
    avatarInitials: 'VG',
    avatarColor: '#0066FF',
    email: 'vanessa@fenixworld.com.br',
  },
  {
    name: 'Jhessica Camargo',
    canonical: 'Jhessica Camargo',
    cargo: 'Consultora Comercial',
    avatarInitials: 'JC',
    avatarColor: '#8B5CF6',
    email: 'jhessica@fenixworld.com.br',
  },
  {
    name: 'Jeferson Trolesi',
    canonical: 'Jeferson Trolesi',
    cargo: 'Marketplace',
    avatarInitials: 'JT',
    avatarColor: '#F97316',
    email: 'jeferson@fenixworld.com.br',
  },
];

/**
 * Normaliza o nome do usuário para correspondência consistente
 */
export function normalizeChatUserName(name: string): string {
  const clean = (name || '').trim();
  const lower = clean
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('eder')) return 'Eder Perez';
  if (lower.includes('vanessa')) return 'Vanessa Gomes';
  if (lower.includes('jhessica') || lower.includes('jessica')) return 'Jhessica Camargo';
  if (lower.includes('jeferson') || lower.includes('trolesi')) return 'Jeferson Trolesi';

  return clean;
}

/**
 * Retorna o nome amigável com acentuação correta para exibição
 */
export function getChatDisplayName(name: string): string {
  const norm = normalizeChatUserName(name);
  if (norm === 'Eder Perez') return 'Éder Perez';
  return norm;
}

/**
 * Gera um ID de conversa individual privado e canônico entre dois usuários
 */
export function getDirectConversationId(userA: string, userB: string): string {
  const normA = normalizeChatUserName(userA);
  const normB = normalizeChatUserName(userB);
  const sorted = [normA, normB].sort();
  return `direct__${sorted[0]}__${sorted[1]}`;
}

/**
 * Verifica se um usuário é participante de uma conversa (privacidade estrita)
 */
export function isUserParticipant(conversationId: string, userName: string): boolean {
  if (conversationId === 'equipe') return true;
  if (conversationId.startsWith('direct__')) {
    const normUser = normalizeChatUserName(userName);
    const parts = conversationId.replace('direct__', '').split('__');
    return parts.includes(normUser);
  }
  return false;
}

// In-memory cache pré-inicializado a partir do localStorage para manter contador exato pós-refresh
let cachedMessages: ChatMessage[] = (() => {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(CHAT_MESSAGES_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
})();
let cachedPresence: Record<string, UserPresenceInfo> = (() => {
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(CHAT_PRESENCE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }
  return {};
})();
let isInitialized = false;
let realtimeChannelRef: any = null;
let heartbeatInterval: any = null;

/**
 * Carrega mensagens iniciais do Supabase e sincroniza cache
 */
export async function loadChatMessagesFromSupabase(): Promise<ChatMessage[]> {
  const client = getSupabaseClient();
  if (!client) {
    // Fallback local caso supabase indisponível
    try {
      const local = localStorage.getItem(CHAT_MESSAGES_KEY);
      if (local) cachedMessages = JSON.parse(local);
    } catch {}
    return cachedMessages;
  }

  try {
    const { data, error } = await client
      .from('fenix_kv_store')
      .select('data')
      .eq('key', CHAT_MESSAGES_KEY)
      .single();

    if (!error && data && Array.isArray(data.data)) {
      cachedMessages = data.data;
      try {
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
      } catch {}
    } else if (!data) {
      // Se ainda não existir no banco, inicializa com mensagem de boas-vindas da equipe
      const initialSeed: ChatMessage[] = [
        {
          id: 'msg-welcome-01',
          conversationId: 'equipe',
          senderName: 'Éder Perez',
          senderAvatarInitials: 'EP',
          senderAvatarColor: '#10B981',
          text: 'Bem-vindos ao Chat Oficial da Fênix World! Canal direto para comunicação e alinhamento da equipe.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          readBy: ['Eder Perez'],
        },
      ];
      cachedMessages = initialSeed;
      await client.from('fenix_kv_store').upsert({
        key: CHAT_MESSAGES_KEY,
        data: initialSeed,
        updated_at: new Date().toISOString(),
        updated_by: 'Sistema Chat',
      });
      try {
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
      } catch {}
    }
  } catch (err) {
    console.warn('Erro ao carregar mensagens do chat no Supabase:', err);
    try {
      const local = localStorage.getItem(CHAT_MESSAGES_KEY);
      if (local) cachedMessages = JSON.parse(local);
    } catch {}
  }

  return cachedMessages;
}

/**
 * Carrega mapa de presença do Supabase
 */
export async function loadPresenceFromSupabase(): Promise<Record<string, UserPresenceInfo>> {
  const client = getSupabaseClient();
  if (!client) {
    return cachedPresence;
  }

  try {
    const { data, error } = await client
      .from('fenix_kv_store')
      .select('data')
      .eq('key', CHAT_PRESENCE_KEY)
      .single();

    if (!error && data && data.data && typeof data.data === 'object') {
      cachedPresence = data.data;
      try {
        localStorage.setItem(CHAT_PRESENCE_KEY, JSON.stringify(cachedPresence));
      } catch {}
    }
  } catch (err) {
    console.warn('Erro ao carregar presença no Supabase:', err);
  }

  return cachedPresence;
}

/**
 * Envia batimento de presença para o usuário ativo (Heartbeat)
 */
export async function sendUserHeartbeat(userName: string, status: 'Online' | 'Offline' = 'Online'): Promise<void> {
  const norm = normalizeChatUserName(userName);
  if (!norm) return;

  const nowIso = new Date().toISOString();
  cachedPresence[norm] = {
    userName: norm,
    lastSeen: nowIso,
    manualStatus: status,
  };

  try {
    localStorage.setItem(CHAT_PRESENCE_KEY, JSON.stringify(cachedPresence));
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Broadcast instantâneo
      if (realtimeChannelRef) {
        realtimeChannelRef.send({
          type: 'broadcast',
          event: 'presence_update',
          payload: { userName: norm, lastSeen: nowIso, manualStatus: status },
        });
      }

      // 2. Persistência no banco de dados
      await client.from('fenix_kv_store').upsert({
        key: CHAT_PRESENCE_KEY,
        data: cachedPresence,
        updated_at: nowIso,
        updated_by: norm,
      });
    } catch (e) {
      // ignore transient error
    }
  }

  window.dispatchEvent(new CustomEvent('fenix_presence_updated', { detail: cachedPresence }));
}

/**
 * Determina o status Online / Offline de um usuário em tempo real
 */
export function isUserOnline(userName: string, currentUserName?: string): boolean {
  const norm = normalizeChatUserName(userName);
  if (currentUserName && normalizeChatUserName(currentUserName) === norm) {
    // Se é o próprio usuário, verifica se não está com status manual Offline
    const ownInfo = cachedPresence[norm];
    return ownInfo?.manualStatus !== 'Offline';
  }

  const info = cachedPresence[norm];
  if (!info) return false;
  if (info.manualStatus === 'Offline') return false;

  const lastSeenMs = new Date(info.lastSeen).getTime();
  const diff = Date.now() - lastSeenMs;
  // Considera online se enviou batimento nos últimos 50 segundos
  return !isNaN(diff) && diff < 50000;
}

/**
 * Retorna os usuários disponíveis para iniciar uma nova conversa individual
 * (exclui o próprio usuário logado)
 */
export function getAvailableUsersForNewConversation(currentUserName: string) {
  const normCurrent = normalizeChatUserName(currentUserName);
  return TEAM_MEMBERS.filter((m) => m.canonical !== normCurrent).map((m) => ({
    ...m,
    isOnline: isUserOnline(m.canonical, currentUserName),
  }));
}

export interface ChatAttachment {
  fileUrl: string;
  fileName: string;
  fileType: 'image' | 'file';
  fileSize?: number;
}

/**
 * Envia uma mensagem e sincroniza no Supabase e em tempo real via broadcast
 */
export async function sendChatMessage(
  conversationId: string,
  senderName: string,
  text: string,
  recipientName?: string,
  attachment?: ChatAttachment
): Promise<ChatMessage> {
  const trimmed = text.trim();
  if (!trimmed && !attachment) throw new Error('Mensagem ou anexo vazio');

  // Validação estrita de privacidade: remetente deve ser participante
  if (!isUserParticipant(conversationId, senderName)) {
    throw new Error('Acesso negado: você não é participante desta conversa privada.');
  }

  const senderNorm = normalizeChatUserName(senderName);
  const senderMeta = TEAM_MEMBERS.find((m) => m.canonical === senderNorm) || {
    name: senderName,
    avatarInitials: senderName.substring(0, 2).toUpperCase(),
    avatarColor: '#1D4ED8',
  };

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conversationId,
    senderName: senderMeta.name,
    senderAvatarInitials: senderMeta.avatarInitials,
    senderAvatarColor: senderMeta.avatarColor,
    recipientName: recipientName ? getChatDisplayName(recipientName) : undefined,
    text: trimmed,
    createdAt: new Date().toISOString(),
    readBy: [senderNorm],
    fileUrl: attachment?.fileUrl,
    fileName: attachment?.fileName,
    fileType: attachment?.fileType,
    fileSize: attachment?.fileSize,
  };

  // 1. Atualiza cache local
  cachedMessages = [...cachedMessages, newMsg];
  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
  } catch {}

  // 2. Dispara evento local imediato para a UI responder instantaneamente
  window.dispatchEvent(new CustomEvent('fenix_chat_message_received', { detail: newMsg }));
  window.dispatchEvent(new CustomEvent('fenix_chat_updated'));

  // 3. Broadcast instantâneo via Supabase Realtime
  if (realtimeChannelRef) {
    try {
      realtimeChannelRef.send({
        type: 'broadcast',
        event: 'new_chat_message',
        payload: newMsg,
      });
    } catch (e) {
      console.warn('Erro no broadcast do chat:', e);
    }
  }

  // 4. Salva no banco de dados Supabase (fonte da verdade)
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('fenix_kv_store').upsert({
        key: CHAT_MESSAGES_KEY,
        data: cachedMessages,
        updated_at: new Date().toISOString(),
        updated_by: senderMeta.name,
      });
    } catch (e) {
      console.warn('Erro ao salvar mensagem no Supabase:', e);
    }
  }

  // 5. As notificações de mensagens do Chat aparecem exclusivamente no balãozinho do chat,
  // mantendo a central de notificações limpa para tarefas, boletos, pendências, etc.

  return newMsg;
}

/**
 * Exclui uma mensagem enviada pelo próprio usuário com sincronização no Supabase
 */
export async function deleteChatMessage(
  messageId: string,
  currentUserName: string
): Promise<boolean> {
  const target = cachedMessages.find((m) => m.id === messageId);
  if (!target) return false;

  const currentNorm = normalizeChatUserName(currentUserName);
  const senderNorm = normalizeChatUserName(target.senderName);

  // Permite excluir APENAS mensagens enviadas pelo próprio usuário
  if (currentNorm !== senderNorm) {
    throw new Error('Você só pode excluir mensagens enviadas por você mesmo.');
  }

  // 1. Atualiza cache local
  cachedMessages = cachedMessages.filter((m) => m.id !== messageId);
  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
  } catch {}

  // 2. Dispara evento local imediato
  window.dispatchEvent(new CustomEvent('fenix_chat_message_deleted', { detail: { messageId } }));
  window.dispatchEvent(new CustomEvent('fenix_chat_updated'));

  // 3. Broadcast de exclusão
  if (realtimeChannelRef) {
    try {
      realtimeChannelRef.send({
        type: 'broadcast',
        event: 'chat_message_deleted',
        payload: { messageId },
      });
    } catch (e) {
      console.warn('Erro no broadcast de exclusão:', e);
    }
  }

  // 4. Persiste no Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('fenix_kv_store').upsert({
        key: CHAT_MESSAGES_KEY,
        data: cachedMessages,
        updated_at: new Date().toISOString(),
        updated_by: currentUserName,
      });
    } catch (e) {
      console.warn('Erro ao sincronizar exclusão no Supabase:', e);
    }
  }

  return true;
}

/**
 * Exclui múltiplas mensagens selecionadas de uma conversa, garantindo que o usuário tenha acesso
 */
export async function deleteMultipleChatMessages(
  messageIds: string[],
  conversationId: string,
  currentUserName: string
): Promise<boolean> {
  if (!messageIds || messageIds.length === 0) return false;

  // Validação estrita de acesso à conversa
  if (!isUserParticipant(conversationId, currentUserName)) {
    throw new Error('Acesso negado: você não possui acesso a esta conversa.');
  }

  const idsSet = new Set(messageIds);

  // Filtra mensagens que pertencem a essa conversa e cujos IDs foram selecionados
  const messagesToDelete = cachedMessages.filter(
    (m) => m.conversationId === conversationId && idsSet.has(m.id)
  );

  if (messagesToDelete.length === 0) return false;

  const validIdsToDelete = new Set(messagesToDelete.map((m) => m.id));

  // 1. Atualiza cache local
  cachedMessages = cachedMessages.filter((m) => !validIdsToDelete.has(m.id));
  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
  } catch {}

  // 2. Dispara evento local imediato
  window.dispatchEvent(
    new CustomEvent('fenix_chat_messages_deleted', {
      detail: { conversationId, messageIds: Array.from(validIdsToDelete) },
    })
  );
  window.dispatchEvent(new CustomEvent('fenix_chat_updated'));

  // 3. Broadcast de exclusão em massa via Realtime
  if (realtimeChannelRef) {
    try {
      realtimeChannelRef.send({
        type: 'broadcast',
        event: 'chat_messages_deleted',
        payload: { conversationId, messageIds: Array.from(validIdsToDelete) },
      });
    } catch (e) {
      console.warn('Erro no broadcast de exclusão em massa:', e);
    }
  }

  // 4. Persiste no Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('fenix_kv_store').upsert({
        key: CHAT_MESSAGES_KEY,
        data: cachedMessages,
        updated_at: new Date().toISOString(),
        updated_by: currentUserName,
      });
    } catch (e) {
      console.warn('Erro ao sincronizar exclusão em massa no Supabase:', e);
    }
  }

  return true;
}

/**
 * Marca mensagens de uma conversa como lidas pelo usuário atual
 */
export async function markConversationAsRead(conversationId: string, currentUserName: string): Promise<void> {
  const normUser = normalizeChatUserName(currentUserName);
  if (!normUser) return;

  let hasChanges = false;
  const updated = cachedMessages.map((msg) => {
    if (msg.conversationId === conversationId && !msg.readBy.includes(normUser)) {
      hasChanges = true;
      return {
        ...msg,
        readBy: [...msg.readBy, normUser],
      };
    }
    return msg;
  });

  if (!hasChanges) return;

  cachedMessages = updated;
  try {
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
  } catch {}

  window.dispatchEvent(new CustomEvent('fenix_chat_updated'));

  // Broadcast de mensagens lidas
  if (realtimeChannelRef) {
    try {
      realtimeChannelRef.send({
        type: 'broadcast',
        event: 'messages_read',
        payload: { conversationId, readBy: normUser },
      });
    } catch (e) {}
  }

  // Persiste no Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('fenix_kv_store').upsert({
        key: CHAT_MESSAGES_KEY,
        data: cachedMessages,
        updated_at: new Date().toISOString(),
        updated_by: normUser,
      });
    } catch (e) {}
  }
}

/**
 * Retorna as conversas disponíveis para o usuário logado
 * Equipe Fênix World (Geral) + Conversas individuais já iniciadas
 * (ou conversa explicitamente aberta via '+ Nova conversa')
 */
export function getConversationsForUser(
  currentUserName: string,
  extraActiveConversationIds: string[] = []
): ConversationSummary[] {
  const normCurrent = normalizeChatUserName(currentUserName);

  const results: ConversationSummary[] = [];

  // 1. Equipe Fênix World (Geral)
  const teamMessages = cachedMessages.filter((m) => m.conversationId === 'equipe');
  const lastTeamMsg = teamMessages[teamMessages.length - 1];
  const unreadTeam = teamMessages.filter(
    (m) => normalizeChatUserName(m.senderName) !== normCurrent && !m.readBy.includes(normCurrent)
  ).length;

  results.push({
    id: 'equipe',
    type: 'group',
    title: 'Equipe Fênix World',
    subtitle: 'Canal Geral da Empresa',
    lastMessage: lastTeamMsg,
    unreadCount: unreadTeam,
  });

  // 2. Conversas Individuais já iniciadas com outros membros
  TEAM_MEMBERS.forEach((member) => {
    if (member.canonical === normCurrent) return;

    const directId = getDirectConversationId(normCurrent, member.canonical);
    const directMessages = cachedMessages.filter((m) => m.conversationId === directId);
    const hasMessages = directMessages.length > 0;
    const isExplicitlyOpened = extraActiveConversationIds.includes(directId);

    // Exibe apenas se já tiver mensagens iniciadas ou se foi selecionada via '+ Nova conversa'
    if (!hasMessages && !isExplicitlyOpened) {
      return;
    }

    const lastMsg = directMessages[directMessages.length - 1];
    const unreadCount = directMessages.filter(
      (m) => normalizeChatUserName(m.senderName) !== normCurrent && !m.readBy.includes(normCurrent)
    ).length;

    const online = isUserOnline(member.canonical, currentUserName);

    results.push({
      id: directId,
      type: 'direct',
      title: member.name,
      subtitle: member.cargo,
      targetUser: {
        name: member.name,
        cargo: member.cargo,
        avatarInitials: member.avatarInitials,
        avatarColor: member.avatarColor,
        status: online ? 'Online' : 'Offline',
        email: member.email,
      },
      lastMessage: lastMsg,
      unreadCount,
    });
  });

  return results;
}

/**
 * Retorna as mensagens de uma conversa específica (garantindo privacidade)
 */
export function getMessagesForConversation(conversationId: string, currentUserName: string): ChatMessage[] {
  if (!isUserParticipant(conversationId, currentUserName)) {
    return [];
  }
  return cachedMessages.filter((m) => m.conversationId === conversationId);
}

/**
 * Retorna o total de mensagens não lidas para o usuário logado em todas as suas conversas
 */
export function getTotalUnreadChatCount(currentUserName: string): number {
  const normUser = normalizeChatUserName(currentUserName);
  if (!normUser) return 0;

  let total = 0;

  // Equipe
  const teamMessages = cachedMessages.filter((m) => m.conversationId === 'equipe');
  total += teamMessages.filter(
    (m) => normalizeChatUserName(m.senderName) !== normUser && !m.readBy.includes(normUser)
  ).length;

  // Conversas privadas deste usuário
  TEAM_MEMBERS.forEach((member) => {
    if (member.canonical === normUser) return;
    const directId = getDirectConversationId(normUser, member.canonical);
    const msgs = cachedMessages.filter((m) => m.conversationId === directId);
    total += msgs.filter(
      (m) => normalizeChatUserName(m.senderName) !== normUser && !m.readBy.includes(normUser)
    ).length;
  });

  return total;
}

/**
 * Inicializa o serviço de chat em tempo real:
 * - Carrega mensagens do banco
 * - Inicia heartbeat do usuário ativo
 * - Conecta ao canal Realtime do Supabase
 */
export function initChatService(currentUserName: string): () => void {
  const normUser = normalizeChatUserName(currentUserName);

  // 1. Carrega dados iniciais do banco
  loadChatMessagesFromSupabase();
  loadPresenceFromSupabase();

  // 2. Envia batimento de presença imediatamente
  sendUserHeartbeat(currentUserName, 'Online');

  // 3. Heartbeat periódico a cada 20 segundos
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    sendUserHeartbeat(currentUserName, 'Online');
  }, 20000);

  // 4. Realtime Channel com Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      if (realtimeChannelRef) {
        client.removeChannel(realtimeChannelRef);
      }

      realtimeChannelRef = client
        .channel(REALTIME_CHAT_CHANNEL, {
          config: { broadcast: { self: false } },
        })
        .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
          if (payload && payload.id) {
            // Evita duplicar se já foi adicionado
            if (!cachedMessages.some((m) => m.id === payload.id)) {
              cachedMessages = [...cachedMessages, payload];
              try {
                localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
              } catch {}
              window.dispatchEvent(new CustomEvent('fenix_chat_message_received', { detail: payload }));
              window.dispatchEvent(new CustomEvent('fenix_chat_updated'));
            }
          }
        })
        .on('broadcast', { event: 'chat_message_deleted' }, ({ payload }) => {
          if (payload && payload.messageId) {
            cachedMessages = cachedMessages.filter((m) => m.id !== payload.messageId);
            try {
              localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
            } catch {}
            window.dispatchEvent(new CustomEvent('fenix_chat_message_deleted', { detail: payload }));
            window.dispatchEvent(new CustomEvent('fenix_chat_updated'));
          }
        })
        .on('broadcast', { event: 'chat_messages_deleted' }, ({ payload }) => {
          if (payload && Array.isArray(payload.messageIds)) {
            const idsSet = new Set(payload.messageIds);
            cachedMessages = cachedMessages.filter((m) => !idsSet.has(m.id));
            try {
              localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
            } catch {}
            window.dispatchEvent(new CustomEvent('fenix_chat_messages_deleted', { detail: payload }));
            window.dispatchEvent(new CustomEvent('fenix_chat_updated'));
          }
        })
        .on('broadcast', { event: 'messages_read' }, ({ payload }) => {
          if (payload && payload.conversationId && payload.readBy) {
            cachedMessages = cachedMessages.map((m) => {
              if (m.conversationId === payload.conversationId && !m.readBy.includes(payload.readBy)) {
                return { ...m, readBy: [...m.readBy, payload.readBy] };
              }
              return m;
            });
            try {
              localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
            } catch {}
            window.dispatchEvent(new CustomEvent('fenix_chat_updated'));
          }
        })
        .on('broadcast', { event: 'presence_update' }, ({ payload }) => {
          if (payload && payload.userName) {
            cachedPresence[payload.userName] = {
              userName: payload.userName,
              lastSeen: payload.lastSeen || new Date().toISOString(),
              manualStatus: payload.manualStatus,
            };
            try {
              localStorage.setItem(CHAT_PRESENCE_KEY, JSON.stringify(cachedPresence));
            } catch {}
            window.dispatchEvent(new CustomEvent('fenix_presence_updated', { detail: cachedPresence }));
          }
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fenix_kv_store' },
          (payload: any) => {
            const key = payload?.new?.key;
            if (key === CHAT_MESSAGES_KEY && payload?.new?.data) {
              const freshData = Array.isArray(payload.new.data) ? payload.new.data : [];
              // Mescla mensagens
              if (freshData.length >= cachedMessages.length) {
                cachedMessages = freshData;
                try {
                  localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(cachedMessages));
                } catch {}
                window.dispatchEvent(new CustomEvent('fenix_chat_updated'));
              }
            } else if (key === CHAT_PRESENCE_KEY && payload?.new?.data) {
              cachedPresence = payload.new.data;
              try {
                localStorage.setItem(CHAT_PRESENCE_KEY, JSON.stringify(cachedPresence));
              } catch {}
              window.dispatchEvent(new CustomEvent('fenix_presence_updated', { detail: cachedPresence }));
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Erro ao configurar canal realtime do chat:', err);
    }
  }

  return () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (client && realtimeChannelRef) {
      try {
        client.removeChannel(realtimeChannelRef);
      } catch {}
    }
  };
}
