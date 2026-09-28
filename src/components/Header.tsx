import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Users,
  Calculator,
  FileText,
  PhoneCall,
  Target,
  Package,
  CheckSquare,
  HeartHandshake,
  Barcode,
  AlertCircle,
  FileEdit,
  Settings,
  Check,
  Calendar,
  Phone,
  Home,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  Star,
  ExternalLink,
  ArrowRight,
  Clock,
  CheckCircle2,
  DollarSign,
  Tag,
  BookOpen,
  User,
  LogOut,
  MessageSquare,
  Trash2,
  EyeOff,
  Square,
  MessageCircle,
  Table,
  BellOff,
} from 'lucide-react';
import officeBg from '../assets/images/fenix_office_bg_1788695593982.jpg';
import { ClientRecord } from '../types';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsReadForUser,
  SystemNotification,
  isNotificationDirectedToUser,
  playUserCustomSoundForCategory,
  deleteNotification,
  deleteNotifications,
  markNotificationsAsRead,
  toggleNotificationRead,
  deactivateFollowUpFromNotification,
} from '../utils/notifications';
import { getUserDetails } from '../utils/auth';
import { isPendenciaVisibleToUser } from '../utils/userDataFilter';
import {
  getUserNotificationPreferences,
  sendExternalNotification,
  isWithinNotificationSchedule,
} from '../utils/userNotificationPreferences';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';
import { ChatPanel } from './chat/ChatPanel';
import { initChatService, getTotalUnreadChatCount, sendUserHeartbeat, normalizeChatUserName } from '../utils/chatService';
import { getDailyBibleVerse, BibleVerse } from '../data/dailyBibleVerses';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  userName: string;
  onOpenProfile?: () => void;
  onSelectTab?: (tab: string) => void;
  onSelectClient?: (client: ClientRecord) => void;
  onSelectSearchResult?: (result: GlobalSearchResult) => void;
  onLogout?: () => void;
}

// Categorias oficiais do Sino de Notificações conforme a especificação:
// "Todas | Tarefas | Boletos | Follow-up | Meta | Notas | Pendências | Estoque"
export type NotifCategory =
  | 'Todas'
  | 'Tarefas'
  | 'Boletos'
  | 'Follow-up'
  | 'Meta'
  | 'Notas'
  | 'Pendências'
  | 'Estoque';

export const NOTIF_CATEGORIES: NotifCategory[] = [
  'Todas',
  'Tarefas',
  'Boletos',
  'Follow-up',
  'Meta',
  'Notas',
  'Pendências',
  'Estoque',
];

export interface NotificationItem {
  id: string;
  category: 'Tarefas' | 'Boletos' | 'Follow-up' | 'Meta' | 'Notas' | 'Pendências';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  targetTab: string;
}

// Origens oficiais dos resultados da Busca Global
export type SearchOrigin =
  | 'Clientes'
  | 'Orçamentos'
  | 'Propostas'
  | 'Tarefas'
  | 'Boletos'
  | 'Notas'
  | 'Pendências'
  | 'Produtos';

export interface GlobalSearchResult {
  id: string;
  origin: SearchOrigin;
  title: string;
  subtitle: string;
  detail?: string;
  targetTab: string;
  clientRecord?: ClientRecord;
  badgeBg: string;
  badgeText: string;
  Icon: React.ComponentType<{ className?: string }>;
  rawItem?: any;
  targetRecordId?: string;
}

// Dados padrão representativos de todo o sistema para a Busca Global
const DEFAULT_PRODUCTS_LIST = [
  { id: 'pr_1', nome: 'Piso Vinílico SPC Click 5mm Carvalho Europeu', categoria: 'PISOS VINÍLICOS', preco: 'R$ 139,90/m²' },
  { id: 'pr_2', nome: 'Piso Vinílico LVT Colado 2mm VinilForte', categoria: 'PISOS VINÍLICOS', preco: 'R$ 79,90/m²' },
  { id: 'pr_3', nome: 'Rodapé Poliestireno Santa Luzia 10cm Branco', categoria: 'RODAPÉS', preco: 'R$ 38,50/barra' },
  { id: 'pr_4', nome: 'Rodapé MDF Ultra Durafloor 8cm – Barra 2,10m', categoria: 'RODAPÉS', preco: 'R$ 36,90/barra' },
  { id: 'pr_5', nome: 'Teto Vinílico Pix Revestimentos 217 x 50 x 8mm', categoria: 'TETO VINÍLICO', preco: 'R$ 89,90/m²' },
  { id: 'pr_6', nome: 'Painel Ripado Poliestireno Freijó – Barra 2,80m', categoria: 'PAINEL RIPADO', preco: 'R$ 69,90/barra' },
  { id: 'pr_7', nome: 'Manta Hospitalar Tarkett 2,0mm – Rolo 40m²', categoria: 'MANTA HOSPITALAR', preco: 'R$ 119,00/m²' },
  { id: 'pr_8', nome: 'Autonivelante FLEXFLOOR Secagem Rápida 12h – 20kg', categoria: 'ARGAMASSAS & COLAS', preco: 'R$ 85,90/saco' },
  { id: 'pr_9', nome: 'Cola para Piso Vinílico FLEXFLOOR 4kg', categoria: 'ARGAMASSAS & COLAS', preco: 'R$ 59,90/un' },
];

const DEFAULT_ORCAMENTOS_LIST = [
  { id: 'orc_1043', numero: '1043', cliente: 'Studio ArqDesign Interiores', valor: 'R$ 15.800,00', produto: 'SPC Click 5mm Carvalho Europeu', status: 'Orçamento Enviado' },
  { id: 'orc_1042', numero: '1042', cliente: 'Construtora Almeida & Silva', valor: 'R$ 48.500,00', produto: 'LVT Colado 2mm VinilForte + Rodapés', status: 'Negociando' },
  { id: 'orc_1041', numero: '1041', cliente: 'Edifício Prime Residencial', valor: 'R$ 32.400,00', produto: 'Teto Vinílico Pix + Rodapé 10cm', status: 'Aguardando Retorno' },
  { id: 'orc_1040', numero: '1040', cliente: 'Roberto Silva Residência', valor: 'R$ 38.000,00', produto: 'Piso Vinílico SPC + Instalação', status: 'Vendido' },
  { id: 'orc_1039', numero: '1039', cliente: 'Carvalho Materiais & Design', valor: 'R$ 42.500,00', produto: 'Lote de Vinílicos e Rodapés', status: 'Vendido' },
];

const DEFAULT_BOLETOS_LIST = [
  { id: 'bol_1', numeroBoleto: 'BOL-2026-884', cliente: 'Construtora Horizonte', valor: 'R$ 14.850,00', vencimento: '07/09/2026', status: 'Aguardando boleto' },
  { id: 'bol_2', numeroBoleto: 'BOL-2026-879', cliente: 'Edifício Prime', valor: 'R$ 32.400,00', vencimento: '12/09/2026', status: 'Boleto recebido' },
  { id: 'bol_3', numeroBoleto: 'BOL-2026-870', cliente: 'Roberto Silva Residência', valor: 'R$ 38.000,00', vencimento: '05/09/2026', status: 'Atendido / Liquidado' },
];

const DEFAULT_TAREFAS_LIST = [
  { id: 'tar_1', titulo: 'Visita técnica no Edifício Splendor', cliente: 'Edifício Splendor', tipo: 'Visita Técnica', status: 'Pendente', data: 'Hoje às 14h' },
  { id: 'tar_2', titulo: 'Envio de amostras LVT para Arq. Camila', cliente: 'Camila Rossi Arquitetura', tipo: 'Amostras', status: 'Pendente', data: 'Hoje às 16h' },
  { id: 'tar_3', titulo: 'Conferência de medidas contrapiso', cliente: 'Carlos Menezes Residencial', tipo: 'Medição', status: 'Concluída', data: '02/09' },
];

const DEFAULT_NOTAS_LIST = [
  { id: 'not_1', titulo: 'Anotações Condomínio Grand Palais', cliente: 'Grand Palais', conteudo: 'Especificação de rodapé branco 10cm resistente à umidade nas áreas comuns.' },
  { id: 'not_2', titulo: 'Cotação de Fornecedores de Vidro Temperado', cliente: 'Fornecedores Fênix', conteudo: 'Comparativo de tabelas com entregas para a 2ª quinzena de setembro.' },
  { id: 'not_3', titulo: 'Alinhamento Semanal da Equipe Comercial', cliente: 'Equipe Fênix', conteudo: 'Revisão das metas da primeira semana e priorização de follow-ups.' },
];

const DEFAULT_PENDENCIAS_LIST = [
  { id: 'pen_1', titulo: 'Pedir preço especial para obra comercial', cliente: 'Construtora Almeida', pedido: '1042', status: 'Pendente' },
  { id: 'pen_2', titulo: 'Confirmar disponibilidade de lote SPC 5mm', cliente: 'Carvalho Natural', pedido: '1039', status: 'Em andamento' },
  { id: 'pen_3', titulo: 'Comprovante de Inscrição Estadual', cliente: 'Construtora Almeida & Silva', pedido: '1042', status: 'Pendente' },
];

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  userName,
  onOpenProfile,
  onSelectTab,
  onSelectClient,
  onSelectSearchResult,
  onLogout,
}) => {
  const [authVersion, setAuthVersion] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleAuthChange = () => setAuthVersion((v) => v + 1);
    window.addEventListener('fenix_auth_updated', handleAuthChange);
    window.addEventListener('fenix_user_profile_updated', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('fenix_auth_updated', handleAuthChange);
      window.removeEventListener('fenix_user_profile_updated', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userDetails = useMemo(() => {
    return getUserDetails(userName);
  }, [userName, authVersion]);

  const displayName = userDetails.name || userName.trim() || 'Vanessa Gomes';
  const firstName = displayName.split(' ')[0] || 'Vanessa';
  const initials = userDetails.initials;
  const userCargo = userDetails.cargo;

  // Status Online / Offline para o usuário atual
  const [userStatus, setUserStatus] = useState<'Online' | 'Offline'>(() => {
    try {
      return (
        (localStorage.getItem(`fenix_user_status_${userName || 'default'}`) as 'Online' | 'Offline') ||
        (localStorage.getItem('fenix_vanessa_status') as 'Online' | 'Offline') ||
        'Online'
      );
    } catch {
      return 'Online';
    }
  });

  const setUserOnlineStatus = (status: 'Online' | 'Offline', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUserStatus(status);
    try {
      localStorage.setItem(`fenix_user_status_${userName || 'default'}`, status);
      localStorage.setItem('fenix_vanessa_status', status);
      sendUserHeartbeat(userName, status);
      window.dispatchEvent(
        new CustomEvent('fenix_user_status_changed', {
          detail: { user: userName, status },
        })
      );
    } catch {}
  };

  // Estados do Chat Interno Fênix World (acessível em todas as abas)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(() => getTotalUnreadChatCount(userName));

  useEffect(() => {
    const cleanup = initChatService(userName);

    const updateChatUnread = () => {
      setChatUnreadCount(getTotalUnreadChatCount(userName));
    };

    const handleChatMessageReceived = (e: Event) => {
      updateChatUnread();
      // Atualiza também as notificações no sino para refletir a mensagem recebida
      setNotifications(getUserNotifications(userName));
      try {
        const customEvent = e as CustomEvent;
        const msg = customEvent.detail;
        const normCurrent = normalizeChatUserName(userName);
        const normSender = msg?.senderName ? normalizeChatUserName(msg.senderName) : '';
        // Só toca o som se a mensagem foi enviada por outra pessoa
        if (normSender && normSender !== normCurrent) {
          const playedKey = msg?.id ? `fenix_sound_played_notif_chat_${msg.id}` : null;
          if (!playedKey || !sessionStorage.getItem(playedKey)) {
            if (playedKey) {
              try {
                sessionStorage.setItem(playedKey, 'true');
              } catch {}
            }
            playUserCustomSoundForCategory(userName, 'chat');

            // Dispara notificação externa para nova mensagem de chat se ativada
            const prefs = getUserNotificationPreferences(userName);
            if (
              prefs.enabled !== false &&
              prefs.externalAlerts?.chat !== false &&
              isWithinNotificationSchedule(prefs)
            ) {
              sendExternalNotification(
                `Mensagem de ${msg?.senderName || 'Chat Fênix'}`,
                {
                  body: msg?.text || 'Nova mensagem no chat corporativo',
                  targetTab: 'Chat',
                  metadata: { conversationId: msg?.conversationId },
                  tag: `fenix_chat_${msg?.id || Date.now()}`,
                }
              );
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao tocar som do chat no Header:', err);
      }
    };

    // Listener para abrir chat se solicitado externamente
    const handleOpenTabForChat = (e: Event) => {
      try {
        const customEvent = e as CustomEvent;
        if (customEvent.detail?.tab === 'Chat') {
          setIsChatOpen(true);
          setIsChatMinimized(false);
          const convId = customEvent.detail?.metadata?.conversationId;
          if (convId) {
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent('fenix_select_chat_conversation', {
                  detail: { conversationId: convId },
                })
              );
            }, 50);
          }
        }
      } catch {}
    };

    updateChatUnread();
    window.addEventListener('fenix_chat_updated', updateChatUnread);
    window.addEventListener('fenix_chat_message_received', handleChatMessageReceived);
    window.addEventListener('fenix_open_tab', handleOpenTabForChat);

    return () => {
      cleanup();
      window.removeEventListener('fenix_chat_updated', updateChatUnread);
      window.removeEventListener('fenix_chat_message_received', handleChatMessageReceived);
      window.removeEventListener('fenix_open_tab', handleOpenTabForChat);
    };
  }, [userName]);

  // Data atual e frase bíblica do dia com atualização automática à meia-noite
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [verseOfTheDay, setVerseOfTheDay] = useState<BibleVerse>(() => getDailyBibleVerse(new Date()));

  useEffect(() => {
    const checkDailyUpdate = () => {
      const now = new Date();
      if (
        now.getDate() !== currentDate.getDate() ||
        now.getMonth() !== currentDate.getMonth() ||
        now.getFullYear() !== currentDate.getFullYear()
      ) {
        setCurrentDate(now);
        setVerseOfTheDay(getDailyBibleVerse(now));
      }
    };

    // Verifica a cada 15 segundos para atualizar automaticamente no primeiro instante da virada do dia
    const interval = setInterval(checkDailyUpdate, 15000);
    return () => clearInterval(interval);
  }, [currentDate]);

  // Data atual formatada em português brasileiro: ex: "22 de setembro de 2026"
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();
  const formattedDate = `${day} de ${month} de ${year}`;

  // ==========================================
  // ESTADO DA BUSCA GLOBAL NO SISTEMA
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados dos dados em tempo real para indexação global
  const [clientsDb, setClientsDb] = useState<ClientRecord[]>([]);
  const [followUpDb, setFollowUpDb] = useState<any[]>([]);
  const [orcamentosDb, setOrcamentosDb] = useState<any[]>([]);
  const [tarefasDb, setTarefasDb] = useState<any[]>([]);
  const [boletosDb, setBoletosDb] = useState<any[]>([]);
  const [notasDb, setNotasDb] = useState<any[]>([]);
  const [pendenciasDb, setPendenciasDb] = useState<any[]>([]);

  // Carregar dados reais do localStorage
  useEffect(() => {
    const loadSystemData = () => {
      try {
        const storedClients = localStorage.getItem('fenix_clients_db');
        if (storedClients) setClientsDb(JSON.parse(storedClients));

        const storedFup = localStorage.getItem('fenix_followup_db');
        if (storedFup) setFollowUpDb(JSON.parse(storedFup));

        const storedOrc = localStorage.getItem('fenix_saved_orcamentos') || localStorage.getItem('fenix_orcamentos_history');
        if (storedOrc) setOrcamentosDb(JSON.parse(storedOrc));

        const storedTar = localStorage.getItem('fenix_tarefas_db');
        if (storedTar) setTarefasDb(JSON.parse(storedTar));

        const storedBol = localStorage.getItem('fenix_boletos_db');
        if (storedBol) setBoletosDb(JSON.parse(storedBol));

        const storedNot = localStorage.getItem('fenix_notes_db') || localStorage.getItem('fenix_notes_v1');
        if (storedNot) setNotasDb(JSON.parse(storedNot));

        const storedPen = localStorage.getItem('fenix_pendencias_v1');
        if (storedPen) setPendenciasDb(JSON.parse(storedPen));
      } catch (e) {
        console.error('Erro ao indexar dados do CRM:', e);
      }
    };

    loadSystemData();
    window.addEventListener('storage', loadSystemData);
    window.addEventListener('fenix_clients_updated', loadSystemData);
    window.addEventListener('fenix_metas_updated', loadSystemData);
    return () => {
      window.removeEventListener('storage', loadSystemData);
      window.removeEventListener('fenix_clients_updated', loadSystemData);
      window.removeEventListener('fenix_metas_updated', loadSystemData);
    };
  }, []);

  // ==========================================
  // ESTADO DO SINO DE NOTIFICAÇÕES
  // ==========================================
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NotifCategory>('Todas');
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    return getUserNotifications(userName);
  });
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Sincronizar notificações em tempo real filtradas pelo usuário autenticado
  useEffect(() => {
    const handleNotificationsUpdated = () => {
      const userNotifs = getUserNotifications(userName);
      setNotifications(userNotifs);

      // Toca som para qualquer notificação recente ainda não tocada nesta sessão
      userNotifs.forEach((notif) => {
        if (!notif.unread) return;
        const notifTime = new Date(notif.createdAt || notif.time).getTime();
        const isRecent = !isNaN(notifTime) && Date.now() - notifTime < 45000;
        if (isRecent) {
          const playedKey = `fenix_sound_played_${notif.id}`;
          if (!sessionStorage.getItem(playedKey)) {
            // Não toca para o próprio autor que disparou a ação (exceto para Pendências)
            const isSelf = notif.authorName && notif.authorName.trim().toLowerCase() === userName.trim().toLowerCase();
            if (isSelf && notif.category !== 'Pendências') {
              return;
            }

            sessionStorage.setItem(playedKey, 'true');
            const categoryKeyMap: Record<string, any> = {
              'Tarefas': 'tarefas',
              'Boletos': 'boletos',
              'Follow-up': 'followup',
              'Meta': 'metas',
              'Notas': 'notas',
              'Pendências': 'pendencias',
              'Pós-Vendas': 'followup',
              'Estoque': 'estoque',
              'Tabela Comercial': 'tabelas',
            };
            const cat = categoryKeyMap[notif.category] || 'pendencias';
            playUserCustomSoundForCategory(userName, cat);
          }
        }
      });
    };

    handleNotificationsUpdated();
    window.addEventListener('fenix_notifications_updated', handleNotificationsUpdated);
    window.addEventListener('storage', handleNotificationsUpdated);
    return () => {
      window.removeEventListener('fenix_notifications_updated', handleNotificationsUpdated);
      window.removeEventListener('storage', handleNotificationsUpdated);
    };
  }, [userName]);

  // Tocar som em tempo real quando uma nova atribuição é recebida para este usuário (sem tocar para antigas)
  useEffect(() => {
    const processIncomingNotification = (notif: SystemNotification) => {
      if (!notif) return;
      if (isNotificationDirectedToUser(notif, userName)) {
        setNotifications(getUserNotifications(userName));

        // Toca o som apenas se a notificação for recente (últimos 30 segundos) e não tiver sido tocada antes
        const notifTime = new Date(notif.createdAt || notif.time).getTime();
        const isRecent = !isNaN(notifTime) && Date.now() - notifTime < 30000;

        if (isRecent) {
          const playedKey = `fenix_sound_played_${notif.id}`;
          try {
            if (sessionStorage.getItem(playedKey)) {
              return; // Já tocou nesta sessão
            }

            // Não toca para o próprio autor que disparou a ação (exceto para Pendências)
            const isSelf = notif.authorName && notif.authorName.trim().toLowerCase() === userName.trim().toLowerCase();
            if (isSelf && notif.category !== 'Pendências') {
              return;
            }

            sessionStorage.setItem(playedKey, 'true');
          } catch {}

          const categoryKeyMap: Record<string, any> = {
            'Tarefas': 'tarefas',
            'Boletos': 'boletos',
            'Follow-up': 'followup',
            'Meta': 'metas',
            'Notas': 'notas',
            'Pendências': 'pendencias',
            'Pós-Vendas': 'followup',
            'Estoque': 'estoque',
            'Tabela Comercial': 'tabelas',
          };
          const cat = categoryKeyMap[notif.category] || 'pendencias';
          playUserCustomSoundForCategory(userName, cat);
        }
      }
    };

    const handleCustomEvent = (e: any) => {
      if (e?.detail) {
        processIncomingNotification(e.detail);
      }
    };

    window.addEventListener('fenix_new_assignment_notification', handleCustomEvent);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('fenix_notifications_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'NEW_NOTIFICATION' && event.data?.notification) {
            processIncomingNotification(event.data.notification);
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('fenix_new_assignment_notification', handleCustomEvent);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [userName]);

  const totalUnreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  // Contadores por categoria para badges nos botões de filtro
  const unreadCountByCategory = useMemo(() => {
    const map: Record<NotifCategory, number> = {
      'Todas': totalUnreadCount,
      'Tarefas': 0,
      'Boletos': 0,
      'Follow-up': 0,
      'Meta': 0,
      'Notas': 0,
      'Pendências': 0,
      'Estoque': 0,
    };
    notifications.forEach((n) => {
      if (n.unread && map[n.category] !== undefined) {
        map[n.category] += 1;
      }
    });
    return map;
  }, [notifications, totalUnreadCount]);

  const [notifViewMode, setNotifViewMode] = useState<'ativas' | 'historico'>('ativas');
  const [panelSelectedIds, setPanelSelectedIds] = useState<string[]>([]);

  // Ref e rolagem das abas de categorias no popup
  const headerCategoriesScrollRef = useRef<HTMLDivElement>(null);
  const scrollHeaderCategories = (direction: 'left' | 'right') => {
    if (headerCategoriesScrollRef.current) {
      const scrollAmount = direction === 'left' ? -140 : 140;
      headerCategoriesScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Notificações filtradas pela categoria selecionada e modo (ativas vs histórico)
  const filteredNotifications = useMemo(() => {
    const list = notifViewMode === 'ativas'
      ? notifications.filter((n) => n.unread)
      : notifications;
    if (selectedCategory === 'Todas') {
      return list;
    }
    return list.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory, notifViewMode]);

  // Marcar todas como lidas do usuário
  const handleMarkAllRead = () => {
    markAllNotificationsAsReadForUser(userName);
    setNotifications(getUserNotifications(userName));
    setPanelSelectedIds([]);
  };

  const handleTogglePanelSelectOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPanelSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePanelBulkMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (panelSelectedIds.length === 0) return;
    markNotificationsAsRead(panelSelectedIds);
    setNotifications(getUserNotifications(userName));
    setPanelSelectedIds([]);
  };

  const handlePanelBulkDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (panelSelectedIds.length === 0) return;
    deleteNotifications(panelSelectedIds);
    setNotifications(getUserNotifications(userName));
    setPanelSelectedIds([]);
  };

  const handleToggleReadSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleNotificationRead(id);
    setNotifications(getUserNotifications(userName));
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
    setNotifications(getUserNotifications(userName));
    setPanelSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  // Clicar em uma notificação individual: marca como lida e navega diretamente
  const handleNotificationClick = (notif: SystemNotification) => {
    markNotificationAsRead(notif.id);
    setNotifications(getUserNotifications(userName));
    setIsNotifOpen(false);

    // Se for notificação de Follow-up, abrir diretamente o card exato daquele Follow-up na aba Follow-up
    if (notif.category === 'Follow-up') {
      const followUpId = notif.metadata?.followUpId;
      const clientName =
        notif.metadata?.clientName ||
        notif.metadata?.cliente ||
        (notif.title.includes(': ') ? notif.title.split(': ')[1]?.trim() : '') ||
        (notif.title.includes(' - ') ? notif.title.split(' - ')[1]?.trim() : '');

      try {
        if (followUpId) sessionStorage.setItem('fenix_target_followup_id', String(followUpId));
        if (clientName) sessionStorage.setItem('fenix_target_followup_client', String(clientName));
      } catch {}

      // Dispara evento para o componente FollowUpScreen focar e abrir o card exato
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('fenix_open_followup_card', {
            detail: { followUpId, clientName },
          })
        );
      }, 50);

      onSelectTab?.('Follow-up');
      return;
    }

    // Se for notificação de Estoque, abrir diretamente a tela de Estoque com foco na movimentação correspondente
    if (notif.category === 'Estoque' || notif.targetTab === 'Estoque') {
      const movimentacaoId = notif.metadata?.movimentacaoId;
      try {
        if (movimentacaoId) sessionStorage.setItem('fenix_target_movimentacao_id', String(movimentacaoId));
        sessionStorage.setItem('fenix_target_estoque_tab', 'movimentacoes');
      } catch {}

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('fenix_open_estoque_movimentacao', {
            detail: { movimentacaoId },
          })
        );
      }, 50);

      onSelectTab?.('Estoque');
      return;
    }

    // Se for notificação de Chat, abrir diretamente o chat e selecionar a conversa
    if ((notif.category as any) === 'Chat' || notif.targetTab === 'Chat') {
      setIsChatOpen(true);
      setIsChatMinimized(false);
      const convId = notif.metadata?.conversationId;
      if (convId) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('fenix_select_chat_conversation', {
              detail: { conversationId: convId },
            })
          );
        }, 50);
      }
      return;
    }

    // Se for notificação de Tarefas, abrir a aba Tarefas e focar no item se houver ID
    if (notif.category === 'Tarefas' || notif.targetTab === 'Tarefas') {
      const taskId = notif.metadata?.taskId;
      if (taskId) {
        try {
          sessionStorage.setItem('fenix_target_task_id', String(taskId));
        } catch {}
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('fenix_open_task_item', {
              detail: { taskId },
            })
          );
        }, 50);
      }
      onSelectTab?.('Tarefas');
      return;
    }

    onSelectTab?.(notif.targetTab);
  };

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // MOTOR DE BUSCA GLOBAL NO SISTEMA
  // ==========================================
  const searchResults = useMemo<GlobalSearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: GlobalSearchResult[] = [];

    // 1. CLIENTES
    const clientsList = clientsDb.length > 0 ? clientsDb : [];
    clientsList.forEach((c) => {
      const match =
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp && c.whatsapp.toLowerCase().includes(q)) ||
        (c.clientType && c.clientType.toLowerCase().includes(q)) ||
        (c.cpfCnpj && c.cpfCnpj.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `cli_${c.id}`,
          origin: 'Clientes',
          title: c.name,
          subtitle: `${c.clientType || 'Cliente'} • ${c.whatsapp || 'Sem telefone'}`,
          detail: c.city ? `${c.city}${c.neighborhood ? ` - ${c.neighborhood}` : ''}` : undefined,
          targetTab: 'Clientes',
          clientRecord: c,
          rawItem: c,
          targetRecordId: String(c.id),
          badgeBg: 'bg-blue-50 border-blue-200 text-[#0052cc]',
          badgeText: 'Clientes',
          Icon: Users,
        });
      }
    });

    // 2. ORÇAMENTOS
    const orcList = orcamentosDb.length > 0 ? orcamentosDb : DEFAULT_ORCAMENTOS_LIST;
    orcList.forEach((orc: any) => {
      const num = String(orc.numero || orc.id || '');
      const cli = String(orc.cliente || '');
      const prod = String(orc.produto || '');
      const val = typeof orc.valor === 'number' ? `R$ ${orc.valor.toFixed(2)}` : String(orc.valor || '');

      if (
        num.toLowerCase().includes(q) ||
        cli.toLowerCase().includes(q) ||
        prod.toLowerCase().includes(q) ||
        val.toLowerCase().includes(q)
      ) {
        results.push({
          id: `orc_${orc.id || num}`,
          origin: 'Orçamentos',
          title: `Orçamento #${num} – ${cli || 'Cliente'}`,
          subtitle: `${val} • ${prod || 'Piso Vinílico e Acessórios'}`,
          detail: orc.status || 'Em elaboração',
          targetTab: 'Orçamentos',
          rawItem: orc,
          targetRecordId: String(orc.id || num),
          badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          badgeText: 'Orçamentos',
          Icon: FileText,
        });
      }
    });

    // 3. PROPOSTAS / FOLLOW-UP
    const fupList = followUpDb.length > 0 ? followUpDb : [];
    fupList.forEach((f: any) => {
      const nomeOrc = String(f.nomeOrcamento || f.pedido || '');
      const cli = String(f.cliente || '');
      const prod = String(f.produto || '');
      const status = String(f.status || '');
      const val = typeof f.valor === 'number' ? `R$ ${f.valor.toFixed(2)}` : String(f.valor || '');

      if (
        nomeOrc.toLowerCase().includes(q) ||
        cli.toLowerCase().includes(q) ||
        prod.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      ) {
        results.push({
          id: `fup_${f.id}`,
          origin: 'Propostas',
          title: `${f.nomeOrcamento || `Proposta #${f.pedido}`} – ${cli}`,
          subtitle: `${status} • ${val}`,
          detail: prod || 'Acompanhamento comercial ativo',
          targetTab: 'Follow-up',
          rawItem: f,
          targetRecordId: String(f.id || f.pedido || cli),
          badgeBg: 'bg-sky-50 border-sky-200 text-sky-700',
          badgeText: 'Follow-up',
          Icon: PhoneCall,
        });
      }
    });

    // 4. TAREFAS
    const tarList = tarefasDb.length > 0 ? tarefasDb : DEFAULT_TAREFAS_LIST;
    tarList.forEach((t: any) => {
      const tit = String(t.title || t.titulo || '');
      const cli = String(t.clientName || t.cliente || '');
      const desc = String(t.description || t.tipo || '');

      if (tit.toLowerCase().includes(q) || cli.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
        results.push({
          id: `tar_${t.id}`,
          origin: 'Tarefas',
          title: tit,
          subtitle: `${cli ? `${cli} • ` : ''}${t.status || 'Pendente'}`,
          detail: t.dueDate || t.data || desc,
          targetTab: 'Tarefas',
          rawItem: t,
          targetRecordId: String(t.id),
          badgeBg: 'bg-purple-50 border-purple-200 text-purple-700',
          badgeText: 'Tarefas',
          Icon: CheckSquare,
        });
      }
    });

    // 5. BOLETOS
    const bolList = boletosDb.length > 0 ? boletosDb : DEFAULT_BOLETOS_LIST;
    bolList.forEach((b: any) => {
      const num = String(b.orderNumber || b.numeroBoleto || b.id || '');
      const cli = String(b.clientName || b.cliente || '');
      const status = String(b.status || '');

      if (num.toLowerCase().includes(q) || cli.toLowerCase().includes(q) || status.toLowerCase().includes(q)) {
        results.push({
          id: `bol_${b.id || num}`,
          origin: 'Boletos',
          title: `Boleto #${num} – ${cli}`,
          subtitle: `${status} • Vencimento: ${b.firstDueDate || b.vencimento || 'A definir'}`,
          detail: b.valor || undefined,
          targetTab: 'Boletos',
          rawItem: b,
          targetRecordId: String(b.id || num),
          badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
          badgeText: 'Boletos',
          Icon: Barcode,
        });
      }
    });

    // 6. NOTAS
    const notList = notasDb.length > 0 ? notasDb : DEFAULT_NOTAS_LIST;
    notList.forEach((n: any) => {
      const tit = String(n.title || n.titulo || '');
      const cont = String(n.content || n.conteudo || '');
      const cli = String(n.cliente || '');

      if (tit.toLowerCase().includes(q) || cont.toLowerCase().includes(q) || cli.toLowerCase().includes(q)) {
        results.push({
          id: `not_${n.id}`,
          origin: 'Notas',
          title: tit,
          subtitle: cli ? `Cliente: ${cli}` : 'Nota interna',
          detail: cont.slice(0, 70) + (cont.length > 70 ? '...' : ''),
          targetTab: 'Notas',
          rawItem: n,
          targetRecordId: String(n.id),
          badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          badgeText: 'Notas',
          Icon: FileEdit,
        });
      }
    });

    // 7. PENDÊNCIAS
    const penList = pendenciasDb.length > 0 ? pendenciasDb : DEFAULT_PENDENCIAS_LIST;
    penList.forEach((p: any) => {
      if (!isPendenciaVisibleToUser(p, userName)) return;
      const tit = String(p.pendencia || p.titulo || '');
      const cli = String(p.cliente || '');
      const ped = String(p.pedido || '');

      if (tit.toLowerCase().includes(q) || cli.toLowerCase().includes(q) || ped.toLowerCase().includes(q)) {
        results.push({
          id: `pen_${p.id}`,
          origin: 'Pendências',
          title: tit,
          subtitle: `${cli ? `${cli} • ` : ''}${p.status || 'Pendente'}`,
          detail: ped ? `Pedido #${ped}` : undefined,
          targetTab: 'Pendências',
          rawItem: p,
          targetRecordId: String(p.id),
          badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
          badgeText: 'Pendências',
          Icon: AlertCircle,
        });
      }
    });

    // 8. PRODUTOS
    DEFAULT_PRODUCTS_LIST.forEach((pr) => {
      if (pr.nome.toLowerCase().includes(q) || pr.categoria.toLowerCase().includes(q)) {
        results.push({
          id: `prd_${pr.id}`,
          origin: 'Produtos',
          title: pr.nome,
          subtitle: `${pr.categoria} • ${pr.preco}`,
          detail: 'Catálogo de Produtos Fênix',
          targetTab: 'Produtos',
          rawItem: pr,
          targetRecordId: String(pr.id || pr.nome),
          badgeBg: 'bg-orange-50 border-orange-200 text-orange-700',
          badgeText: 'Produtos',
          Icon: Package,
        });
      }
    });

    // Limitar para não poluir o dropdown
    return results.slice(0, 16);
  }, [searchQuery, clientsDb, orcamentosDb, followUpDb, tarefasDb, boletosDb, notasDb, pendenciasDb]);

  // Ao clicar em um resultado da busca geral
  const handleSelectSearchResult = (result: GlobalSearchResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');

    // Salvar e emitir evento para navegar e destacar o registro exato
    const recId = result.targetRecordId || result.id;
    try {
      sessionStorage.setItem('fenix_highlight_id', recId);
      sessionStorage.setItem('fenix_highlight_tab', result.targetTab);
      window.dispatchEvent(
        new CustomEvent('fenix_highlight_record', {
          detail: {
            id: recId,
            origin: result.origin,
            targetTab: result.targetTab,
            item: result.rawItem,
          },
        })
      );
    } catch {}

    if (onSelectSearchResult) {
      onSelectSearchResult(result);
    } else if (result.clientRecord && onSelectClient) {
      onSelectClient(result.clientRecord);
    } else {
      onSelectTab?.(result.targetTab);
    }
  };

  return (
    <header className="relative w-full min-h-[128px] sm:min-h-[144px] h-auto overflow-visible bg-[#0a1428] select-none z-30">
      {/* Luxury Corporate Office Background */}
      <img
        src={officeBg}
        alt="Ambiente Corporativo Fênix World"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />

      {/* Dark Ambient Scrim Overlay for high contrast and readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/80 sm:from-black/75 sm:via-black/55 sm:to-black/70 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-14 flex flex-col justify-between py-3 sm:py-3.5 gap-2.5">
        {/* Top Row: Greeting & Action Icons */}
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Left Side: Greeting + Current Date */}
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            {/* Mobile Menu Trigger (STRICTLY lg:hidden - never on desktop!) */}
            <button
              onClick={onOpenMobileMenu}
              className="p-2 -ml-2 text-white/80 hover:text-white rounded-xl lg:hidden hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-6 h-6 stroke-[2]" />
            </button>

            <div className="min-w-0 py-0.5">
              <h1 className="text-lg sm:text-2xl lg:text-[25px] font-bold text-white tracking-tight leading-tight drop-shadow-xs truncate">
                Olá, {firstName}!
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-slate-300 font-normal mt-0.5">
                <span className="hidden sm:inline">Que bom ter você aqui novamente.</span>
                <span className="text-slate-400/80 hidden sm:inline" aria-hidden="true">•</span>
                <span className="text-slate-300/80 text-[11px] sm:text-xs font-normal">
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Chat + Sino de Notificações + BUSCA GLOBAL + Perfil da Usuária */}
          <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 flex-shrink-0">
          {/* ==========================================
              1. ÍCONE DE CHAT INTERNO (ao lado do Sino)
              [ 💬 Chat ] [ 🔔 Notificações ] [ Avatar ]
             ========================================== */}
          <div className="relative">
            <button
              type="button"
              id="header-chat-button"
              onClick={() => {
                if (isChatMinimized) {
                  setIsChatMinimized(false);
                  setIsChatOpen(true);
                } else {
                  setIsChatOpen((prev) => !prev);
                }
              }}
              className="relative w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 hover:border-white/30 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer shadow-sm"
              aria-label="Chat interno"
              title="Chat Fênix World"
            >
              <MessageSquare className="w-4 h-4 stroke-[2]" />
              {/* Contador de mensagens não lidas no Chat (separado do sino de notificações) */}
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#091122] shadow-sm animate-in zoom-in duration-150">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* ==========================================
              2. SINO DE NOTIFICAÇÕES (com abas de categorias)
              Todas | Tarefas | Boletos | Follow-up | Meta | Notas | Pendências
             ========================================== */}
          <div ref={notifContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 hover:border-white/30 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer shadow-sm"
              aria-label="Notificações"
              title="Notificações & Alertas"
            >
              <Bell className="w-4 h-4 stroke-[2]" />
              {/* Mostrar contador de notificações não lidas quando existir */}
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#0052cc] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#091122] shadow-sm animate-in zoom-in duration-150">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            {/* Painel Flutuante do Sino de Notificações */}
            {isNotifOpen && (
              <div className="absolute right-0 top-12 w-[calc(100vw-32px)] sm:w-[440px] max-w-[440px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header do Painel */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#091122]">Notificações</span>
                    <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setNotifViewMode('ativas')}
                        className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          notifViewMode === 'ativas'
                            ? 'bg-white text-[#0052cc] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Ativas ({totalUnreadCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifViewMode('historico')}
                        className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          notifViewMode === 'historico'
                            ? 'bg-white text-[#0052cc] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Histórico
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalUnreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-[#0052cc] hover:underline cursor-pointer"
                      >
                        Marcar todas
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotifOpen(false);
                        onSelectTab?.('Notificações');
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                      title="Abrir tela completa de notificações"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Barra de ações em massa no painel (quando há itens selecionados) */}
                {panelSelectedIds.length > 0 && (
                  <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-[#0052cc]">
                    <span className="font-bold">{panelSelectedIds.length} selecionada{panelSelectedIds.length > 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePanelBulkMarkRead}
                        className="text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 cursor-pointer"
                      >
                        Marcar lidas
                      </button>
                      <button
                        type="button"
                        onClick={handlePanelBulkDelete}
                        className="text-[11px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPanelSelectedIds([]);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* FILTROS DE CATEGORIAS:
                    Todas | Tarefas | Boletos | Follow-up | Meta | Estoque | Notas | Pendências */}
                <div className="relative flex items-center bg-slate-50/70 border-b border-slate-100 px-1 py-1">
                  <button
                    type="button"
                    onClick={() => scrollHeaderCategories('left')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0"
                    title="Navegar abas para a esquerda"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <div
                    ref={headerCategoriesScrollRef}
                    className="flex-1 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x flex items-center gap-1.5 px-1 py-0.5"
                  >
                    {NOTIF_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      const unreadInCat = unreadCountByCategory[cat];
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#0052cc] text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
                          }`}
                        >
                          <span>{cat}</span>
                          {unreadInCat > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                                isSelected
                                  ? 'bg-white text-[#0052cc]'
                                  : 'bg-[#0052cc] text-white'
                              }`}
                            >
                              {unreadInCat}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollHeaderCategories('right')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0"
                    title="Navegar abas para a direita"
                  >
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Lista de Notificações */}
                <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((n, idx) => {
                      const getNotifIcon = () => {
                        switch (n.category) {
                          case 'Tarefas':
                            return CheckSquare;
                          case 'Boletos':
                            return Barcode;
                          case 'Follow-up':
                            return PhoneCall;
                          case 'Meta':
                            return Target;
                          case 'Notas':
                            return FileEdit;
                          case 'Pendências':
                            return AlertCircle;
                          case 'Estoque':
                            return Package;
                          case 'Tabela Comercial':
                            return Table;
                          default:
                            return Bell;
                        }
                      };
                      const Icon = getNotifIcon();
                      const isSelected = panelSelectedIds.includes(n.id);
                      const clientName = n.metadata?.cliente || n.metadata?.clientName;
                      const followUpId = n.metadata?.followUpId;

                      return (
                        <div
                          key={n.id ? `${n.id}_${idx}` : `notif_${idx}`}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5 group relative ${
                            n.unread ? 'bg-blue-50/25' : ''
                          }`}
                        >
                          {/* Bolinha indicadora de não lida */}
                          {n.unread && (
                            <span className="absolute left-1 top-4.5 w-1.5 h-1.5 rounded-full bg-[#0052cc]" />
                          )}

                          {/* Checkbox de seleção para ação em massa */}
                          <div
                            onClick={(e) => handleTogglePanelSelectOne(e, n.id)}
                            className="pt-0.5 text-slate-300 hover:text-[#0052cc] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 text-[#0052cc] rounded border-slate-300 focus:ring-[#0052cc] pointer-events-none"
                            />
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-blue-100 mt-0.5">
                            <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`text-xs truncate ${
                                  n.unread
                                    ? 'font-extrabold text-slate-900 group-hover:text-[#0052cc]'
                                    : 'font-semibold text-slate-700'
                                }`}
                              >
                                {n.title}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                {n.category}
                              </span>
                            </div>

                            {clientName && (
                              <div className="text-[10px] text-[#0052cc] font-semibold mt-0.5 truncate">
                                Cliente: {clientName}
                              </div>
                            )}

                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                              {n.description}
                            </p>

                            {/* Desativar lembretes diretamente pelo sino (conforme requisito) */}
                            {n.category === 'Follow-up' && followUpId && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deactivateFollowUpFromNotification(followUpId);
                                    handleDeleteSingle(e, n.id);
                                  }}
                                  title="Desativar lembretes deste Follow-up"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <BellOff className="w-2.5 h-2.5 text-slate-500" />
                                  <span>Desativar lembretes</span>
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                              <span>{n.time} • Ver em {n.targetTab}</span>

                              {/* Ações rápidas no hover */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleReadSingle(e, n.id)}
                                  title={n.unread ? 'Marcar como lida' : 'Marcar como não lida'}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                                >
                                  {n.unread ? (
                                    <CheckCircle2 className="w-3 h-3 text-[#0052cc]" />
                                  ) : (
                                    <EyeOff className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSingle(e, n.id)}
                                  title="Excluir notificação"
                                  className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma notificação encontrada na categoria "{selectedCategory}".
                    </div>
                  )}
                </div>

                {/* Rodapé do Painel: Abrir tela completa */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Total: {notifications.length} notificações
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(false);
                      onSelectTab?.('Notificações');
                    }}
                    className="text-[11px] font-bold text-[#0052cc] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Central Completa</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==========================================
              2. BUSCA GLOBAL NO SISTEMA
              Placeholder: “Buscar no sistema...”
              Próxima ao nome/perfil da usuária
             ========================================== */}
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center relative w-32 sm:w-56 md:w-64 lg:w-72 xl:w-80">
              <Search className="w-4 h-4 text-slate-300 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsSearchOpen(false);
                }}
                placeholder="Buscar no sistema..."
                className="w-full h-10 pl-10 pr-8 bg-black/40 hover:bg-black/50 focus:bg-black/60 backdrop-blur-md border border-white/20 focus:border-[#0052cc] rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-300 outline-none transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 text-slate-300 hover:text-white p-1 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown com os Resultados da Busca Global */}
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-12 right-0 w-[calc(100vw-32px)] sm:w-[440px] max-w-[440px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header de Resultados */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Resultados para "{searchQuery}"</span>
                  <span className="text-[10px] text-slate-400 font-normal">ESC para fechar</span>
                </div>

                {/* Lista de Resultados Multi-Origem */}
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {searchResults.length > 0 ? (
                    searchResults.map((item, idx) => {
                      const Icon = item.Icon;
                      return (
                        <div
                          key={item.id ? `${item.id}_${idx}` : `search_${idx}`}
                          onClick={() => handleSelectSearchResult(item)}
                          className="flex items-start gap-3 p-3 sm:p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-slate-200/70 mt-0.5 transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-[#0052cc] truncate transition-colors">
                                {item.title}
                              </span>
                              {/* TAG MOSTRANDO DE ONDE VEIO O RESULTADO */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border flex-shrink-0 ${item.badgeBg}`}
                              >
                                {item.badgeText}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.subtitle}
                            </p>

                            {item.detail && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {item.detail}
                              </p>
                            )}
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0052cc] group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhum resultado encontrado para "{searchQuery}" no sistema.
                    </div>
                  )}
                </div>

                {/* Footer do Dropdown */}
                {searchResults.length > 0 && (
                  <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
                    Mostrando {searchResults.length} itens encontrados em clientes, orçamentos, tarefas, boletos, notas e produtos.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ==========================================
              Perfil do Usuário (ao lado da busca)
              Menu do cabeçalho: somente "Perfil" e "Sair"
             ========================================== */}
          <div ref={userMenuRef} className="relative pl-1 sm:pl-2">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              title={`Menu do Usuário: ${displayName} (${userCargo})`}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group outline-none focus:outline-none"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="relative group-hover:scale-105 transition-transform flex-shrink-0">
                  <UserAvatar
                    avatarId={userDetails.avatarId}
                    avatarColor={userDetails.avatarColor}
                    userName={displayName}
                    size="md"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#091122] ${
                      userStatus === 'Online' ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                    title={`${displayName}: ${userStatus}`}
                  />
                </div>
                <span className="sm:hidden text-[9px] text-slate-300 font-medium leading-tight mt-0.5 max-w-[62px] truncate text-center">
                  {userCargo}
                </span>
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate max-w-[120px] lg:max-w-none">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-transform duration-200 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                <span className="text-[11px] text-slate-300 font-normal">
                  {userCargo}
                </span>
              </div>
            </button>

            {/* Menu Dropdown do Cabeçalho */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2.5 w-52 rounded-2xl bg-white shadow-2xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-xs font-bold text-[#071a52] truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{userCargo}</p>
                </div>

                {/* Opção de alternância Online / Offline */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Presença</span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                    <button
                      type="button"
                      onClick={(e) => setUserOnlineStatus('Online', e)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        userStatus === 'Online'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Online</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => setUserOnlineStatus('Offline', e)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        userStatus === 'Offline'
                          ? 'bg-white text-slate-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>Offline</span>
                    </button>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#0057ff] hover:bg-blue-50/80 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <User className="w-4 h-4 text-[#0057ff]" />
                    <span>Perfil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (onLogout) {
                        onLogout();
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50/80 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal de Configuração do Próprio Perfil */}
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentUserName={userName}
            onProfileUpdated={() => setAuthVersion((v) => v + 1)}
          />

          {/* Painel Flutuante do Chat Interno Fênix World (Acessível em qualquer aba) */}
          <ChatPanel
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            currentUserName={userName}
            isMinimized={isChatMinimized}
            onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
          />
        </div>
        </div>

        {/* Lower Row: Frase Bíblica no canto esquerdo mantendo padrão de margem e alinhamento do cabeçalho */}
        <div className="w-full flex items-center justify-start pt-1 pb-1">
          <div
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/45 border border-white/15 backdrop-blur-md text-white select-none shadow-xs"
            title={verseOfTheDay.reference}
          >
            <BookOpen className="w-4 h-4 text-amber-300 shrink-0 self-center" />
            <div className="text-[11px] sm:text-xs font-medium text-slate-100 text-left leading-snug">
              <div className="italic">
                &ldquo;{verseOfTheDay.text}&rdquo;
              </div>
              <div className="font-bold text-amber-300 not-italic text-[10px] sm:text-[11px] mt-0.5">
                {verseOfTheDay.reference}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
