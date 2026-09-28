import React, { useState, useMemo, useEffect } from 'react';
import {
  PhoneCall,
  MessageCircle,
  Search,
  ChevronDown,
  ChevronUp,
  History,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Home,
  User,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  RotateCcw,
  Clock,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  UserCheck,
  DollarSign,
  FileText,
  TrendingUp,
  UserPlus,
  Pencil,
  Bell,
  BellOff,
  Send,
  Hash,
  Sparkles,
} from 'lucide-react';
import {
  FollowUpItem,
  FollowUpStatus,
  FollowUpHistoryEntry,
  ClientRecord,
  PosVendaItem,
  FormaPagamentoItem,
  SavedOrcamento,
  OrcamentoStatus,
} from '../types';
import {
  PaymentSplitManager,
  isPaymentSplitComplete,
  summarizePayments,
  isFormaCartaoCredito,
} from './common/PaymentSplitManager';
import { ProspeccaoView } from './followup/ProspeccaoView';
import { ModalVerOrcamentoFollowUp } from './followup/ModalVerOrcamentoFollowUp';
import { ModalSemOrcamentoVinculado } from './followup/ModalSemOrcamentoVinculado';
import { ModalSelecionarOrcamentoFollowUp } from './followup/ModalSelecionarOrcamentoFollowUp';
import { isRecordOfResponsible, getSellerIdForUser } from '../utils/userDataFilter';
import { getUserIdByName } from '../utils/auth';
import { triggerTwoDayAlert } from '../utils/followupNotifications';
import { ResponsibleFilterTabs } from './ResponsibleFilterTabs';
import {
  saveItemToSupabase,
  saveWholeCollectionToSupabase,
  getSupabaseClient,
  executeWithRetry,
  safeMergeLists,
} from '../utils/supabaseClient';
import {
  getWhatsAppMessageTemplate,
  formatOrcamentoMessage,
} from '../utils/configOrcamentoEMetas';
import { syncFollowUpStatusWithMetasAndVendas } from '../utils/followUpSalesSync';
import { syncSingleMetaSaleToVendas } from '../utils/vendasService';
import { isFollowUpAtrasado, isFollowUpRetornoHoje } from '../utils/followUpCycles';

interface FollowUpScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenOrcamento?: (orc: SavedOrcamento) => void;
}

const STORAGE_KEY = 'fenix_followup_cards_v2';
const CLIENTS_STORAGE_KEY = 'fenix_clients_db';
const POS_VENDAS_STORAGE_KEY = 'fenix_pos_vendas_db';
const METAS_SALES_STORAGE_KEY = 'fenix_metas_sales_db';
const ORCAMENTOS_HISTORY_KEY = 'fenix_orcamentos_history';

// Official Follow-up statuses requested by the user:
// "Status/filtros: Todos, Orçamento Enviado, Aguardando Retorno, Negociando, Vendido e Perdido."
export type OfficialFollowUpStatus =
  | 'Orçamento Enviado'
  | 'Aguardando Retorno'
  | 'Negociando'
  | 'Vendido'
  | 'Perdido';

export const STATUS_LIST: OfficialFollowUpStatus[] = [
  'Orçamento Enviado',
  'Aguardando Retorno',
  'Negociando',
  'Vendido',
  'Perdido',
];

export type FilterTab = 'Todos' | OfficialFollowUpStatus;

// Helper para verificar com precisão se o status representa uma VENDA / FECHAMENTO
export const isSoldStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return (
    s === 'vendido' ||
    s === 'fechado' ||
    s === 'fechados' ||
    s === 'aprovado' ||
    s === 'venda' ||
    s === 'concluido' ||
    s === 'concluído'
  );
};

// Helper para verificar se o status representa um orçamento PERDIDO / RECUSADO
export const isLostStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return (
    s === 'perdido' ||
    s === 'perdidos' ||
    s === 'recusado' ||
    s === 'cancelado'
  );
};

// Helper para verificar se o status está em aberto / pendente
export const isOpenStatus = (status?: string): boolean => {
  return !isSoldStatus(status) && !isLostStatus(status);
};

// Helper universal para converter valores monetários em números reais
export const parseMonetaryValue = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim().replace('R$', '').trim();
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
};

// Normalização segura de status salvos ou importados do histórico
export const normalizeStatus = (statusStr?: string): FollowUpStatus => {
  if (!statusStr) return 'Orçamento Enviado';
  const s = String(statusStr).trim().toLowerCase();
  if (
    s === 'vendido' ||
    s === 'fechado' ||
    s === 'fechados' ||
    s === 'aprovado' ||
    s === 'venda' ||
    s === 'concluido' ||
    s === 'concluído'
  ) {
    return 'Vendido';
  }
  if (
    s === 'perdido' ||
    s === 'perdidos' ||
    s === 'recusado' ||
    s === 'cancelado'
  ) {
    return 'Perdido';
  }
  if (
    s === 'negociando' ||
    s === 'negociação' ||
    s === 'negociacao' ||
    s === 'em negociação' ||
    s === 'em negociacao'
  ) {
    return 'Negociando';
  }
  if (
    s === 'aguardando retorno' ||
    s === 'aguardando resposta' ||
    s === 'em contato' ||
    s === 'aguardando'
  ) {
    return 'Aguardando Retorno';
  }
  return 'Orçamento Enviado';
};

// Client Card Color config by client type requested:
// "Cliente Final azul, Revenda roxo, Construtora verde, Instalador laranja, Arquiteto lilás e Engenheiro azul. NÃO usar cards todos brancos."
const getClientTypeVisual = (type?: string) => {
  switch (type) {
    case 'Cliente Final':
      return {
        cardBorder: 'border-blue-200 hover:border-blue-300',
        cardBg: 'bg-blue-50/70',
        headerHover: 'hover:bg-blue-100/40',
        badgeBg: 'bg-blue-100/80 text-[#0052cc] border border-blue-200',
        iconBg: 'bg-white text-[#0052cc] border border-blue-100 shadow-2xs',
        Icon: User,
        dotColor: 'bg-[#0052cc]',
        colorName: 'azul',
      };
    case 'Revenda':
      return {
        cardBorder: 'border-purple-200 hover:border-purple-300',
        cardBg: 'bg-purple-50/70',
        headerHover: 'hover:bg-purple-100/40',
        badgeBg: 'bg-purple-100/80 text-purple-700 border border-purple-200',
        iconBg: 'bg-white text-purple-600 border border-purple-100 shadow-2xs',
        Icon: Store,
        dotColor: 'bg-purple-600',
        colorName: 'roxo',
      };
    case 'Construtora':
      return {
        cardBorder: 'border-emerald-200 hover:border-emerald-300',
        cardBg: 'bg-emerald-50/70',
        headerHover: 'hover:bg-emerald-100/40',
        badgeBg: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200',
        iconBg: 'bg-white text-emerald-600 border border-emerald-100 shadow-2xs',
        Icon: Building2,
        dotColor: 'bg-emerald-600',
        colorName: 'verde',
      };
    case 'Instalador':
      return {
        cardBorder: 'border-orange-200 hover:border-orange-300',
        cardBg: 'bg-orange-50/70',
        headerHover: 'hover:bg-orange-100/40',
        badgeBg: 'bg-orange-100/80 text-orange-700 border border-orange-200',
        iconBg: 'bg-white text-orange-600 border border-orange-100 shadow-2xs',
        Icon: Wrench,
        dotColor: 'bg-orange-600',
        colorName: 'laranja',
      };
    case 'Arquiteto':
      return {
        cardBorder: 'border-violet-200 hover:border-violet-300',
        cardBg: 'bg-violet-50/70',
        headerHover: 'hover:bg-violet-100/40',
        badgeBg: 'bg-violet-100/80 text-violet-700 border border-violet-200',
        iconBg: 'bg-white text-violet-600 border border-violet-100 shadow-2xs',
        Icon: PenTool,
        dotColor: 'bg-violet-600',
        colorName: 'lilás',
      };
    case 'Engenheiro':
      return {
        cardBorder: 'border-sky-200 hover:border-sky-300',
        cardBg: 'bg-sky-50/70',
        headerHover: 'hover:bg-sky-100/40',
        badgeBg: 'bg-sky-100/80 text-sky-700 border border-sky-200',
        iconBg: 'bg-white text-sky-600 border border-sky-100 shadow-2xs',
        Icon: HardHat,
        dotColor: 'bg-sky-600',
        colorName: 'azul',
      };
    default:
      return {
        cardBorder: 'border-blue-200 hover:border-blue-300',
        cardBg: 'bg-blue-50/70',
        headerHover: 'hover:bg-blue-100/40',
        badgeBg: 'bg-blue-100/80 text-[#0052cc] border border-blue-200',
        iconBg: 'bg-white text-[#0052cc] border border-blue-100 shadow-2xs',
        Icon: User,
        dotColor: 'bg-[#0052cc]',
        colorName: 'azul',
      };
  }
};

// Status visual helper
const getStatusBadgeStyle = (status: FollowUpStatus) => {
  switch (status) {
    case 'Orçamento Enviado':
      return 'bg-blue-50 text-[#0052cc] border-blue-200';
    case 'Aguardando Retorno':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Negociando':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Vendido':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Perdido':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

// Helper to format currency safely
const formatCurrency = (val?: number | null) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return `R$ ${num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper to format date display (DD/MM/YYYY) - Exibe SOMENTE data (ex: 12/09/2026), sem horário
const formatDateOnly = (dateStr?: string | number) => {
  if (!dateStr) return '—';
  try {
    const str = String(dateStr).trim();
    if (!str) return '—';
    // Se já estiver no padrão com barras (ex: 12/09/2026 14:30 ou 12/09/2026), remove o horário
    if (str.includes('/')) {
      return str.split(' ')[0];
    }
    // Se estiver no formato ISO ou YYYY-MM-DD
    if (str.includes('-')) {
      const onlyDate = str.split('T')[0];
      const parts = onlyDate.split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    return str.split(' ')[0];
  } catch {
    return String(dateStr).split(' ')[0];
  }
};

// Helper to format date & time display (DD/MM/YYYY HH:mm)
const formatDateTime = (dateStr?: string) => {
  return formatDateOnly(dateStr);
};

export const FollowUpScreen: React.FC<FollowUpScreenProps> = ({
  currentUserName = 'Vinicius Gestor',
  onNavigateTab,
  onOpenOrcamento,
}) => {
  // Follow-up budgets list (garante a eliminação de cadastro fantasma)
  const [items, setItems] = useState<FollowUpItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((it: FollowUpItem) => !(it.cliente || '').toLowerCase().includes('roberto silveira'))
            .map((it: FollowUpItem) => ({
              ...it,
              status: normalizeStatus(it.status as string),
            }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Top section toggle: 'orcamentos' | 'prospeccao'
  const [activeSection, setActiveSection] = useState<'orcamentos' | 'prospeccao'>(() => {
    try {
      const saved = localStorage.getItem('fenix_followup_active_subtab');
      if (saved === 'prospeccao' || saved === 'orcamentos') return saved;
    } catch {
      // ignore
    }
    return 'orcamentos';
  });

  useEffect(() => {
    try {
      localStorage.setItem('fenix_followup_active_subtab', activeSection);
    } catch {
      // ignore
    }
  }, [activeSection]);

  // Clients database for accurate clientType lookup
  const [clients, setClients] = useState<ClientRecord[]>([]);

  // Requirement 6: Visualização por Dia e Mês
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [periodMode, setPeriodMode] = useState<'dia' | 'mes' | 'todos'>('mes');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Active status filter: 'Todos' | 'Orçamento Enviado' | 'Aguardando Retorno' | 'Negociando' | 'Vendido' | 'Perdido'
  const [activeTab, setActiveTab] = useState<FilterTab>('Todos');

  // Responsável filter for Diretor Éder Perez / Administradores
  const isDirector = useMemo(() => {
    const norm = (currentUserName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return (
      norm.includes('eder') ||
      norm.includes('diretor') ||
      norm.includes('gestor') ||
      norm.includes('admin') ||
      norm === ''
    );
  }, [currentUserName]);
  const [responsibleTab, setResponsibleTab] = useState<string>('Todos');

  // Search input state (GLOBAL search across all clients and budgets)
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro de Situação (Área separada): 'todos' | 'atrasados' | 'retornos_hoje'
  const [situacaoFilter, setSituacaoFilter] = useState<'todos' | 'atrasados' | 'retornos_hoje'>('todos');

  // Filters: Tipo de Cliente, Faixa de Valor, Ordenação
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('Todos');
  const [valueFilter, setValueFilter] = useState<'todos' | 'ate_5k' | '5k_15k' | 'acima_15k'>('todos');
  const [sortOrder, setSortOrder] = useState<'recentes' | 'antigos' | 'maior_valor' | 'menor_valor' | 'nome_az'>('recentes');

  // Expanded client cards state: { [clientKey]: boolean }
  const [expandedClients, setExpandedClients] = useState<{ [clientKey: string]: boolean }>({});

  // Status transition modal
  const [transitioningBudget, setTransitioningBudget] = useState<FollowUpItem | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<FollowUpStatus>('Orçamento Enviado');
  const [statusComment, setStatusComment] = useState('');
  const [statusError, setStatusError] = useState('');
  const [numeroPedidoInput, setNumeroPedidoInput] = useState('');
  const [pedidoError, setPedidoError] = useState('');
  const [formaPagamentoInput, setFormaPagamentoInput] = useState<'Pix' | 'Boleto' | 'Cartão'>('Pix');
  const [parcelasInput, setParcelasInput] = useState<string>('1x');
  const [statusPayments, setStatusPayments] = useState<FormaPagamentoItem[]>([]);

  // History modal for viewing timeline of a budget
  const [viewingHistoryBudget, setViewingHistoryBudget] = useState<FollowUpItem | null>(null);

  // Card com destaque visual ao ser acionado diretamente via notificação do sino
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);

  // Estados para visualização de Orçamento vinculado
  const [viewingOrcamentoData, setViewingOrcamentoData] = useState<{
    followUp: FollowUpItem;
    clientBudgets: SavedOrcamento[];
    selectedOrcamento: SavedOrcamento;
  } | null>(null);

  const [semOrcamentoFollowUp, setSemOrcamentoFollowUp] = useState<FollowUpItem | null>(null);

  const [selecionarOrcamentoData, setSelecionarOrcamentoData] = useState<{
    followUp: FollowUpItem;
    clientBudgets: SavedOrcamento[];
  } | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isPersistingRef = React.useRef(false);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Handler para abrir diretamente o card exato quando acionado via notificação do sino
  useEffect(() => {
    const handleOpenTargetCard = (targetId?: string, targetClient?: string) => {
      const fupId = targetId || (typeof window !== 'undefined' ? sessionStorage.getItem('fenix_target_followup_id') : null);
      const client = targetClient || (typeof window !== 'undefined' ? sessionStorage.getItem('fenix_target_followup_client') : null);

      if (!fupId && !client) return;
      if (items.length === 0) return; // Aguarda os itens carregarem para não perder as chaves de sessionStorage

      // Garante que o card seja visível independentemente de filtros de vendedor/status/seção
      setResponsibleTab('Todos');
      setActiveSection('orcamentos');
      setPeriodMode('todos');
      setActiveTab('Todos');
      setSearchTerm('');

      // Encontra o card do follow-up por ID, número de orçamento ou cliente
      const matched = items.find(
        (it) =>
          (fupId && String(it.id).trim() === String(fupId).trim()) ||
          (fupId && String(it.numeroOrcamento || '').trim() === String(fupId).trim()) ||
          (client && it.cliente && (
            it.cliente.toLowerCase().trim() === client.toLowerCase().trim() ||
            it.cliente.toLowerCase().trim().includes(client.toLowerCase().trim()) ||
            client.toLowerCase().trim().includes(it.cliente.toLowerCase().trim())
          ))
      );

      if (matched) {
        try {
          sessionStorage.removeItem('fenix_target_followup_id');
          sessionStorage.removeItem('fenix_target_followup_client');
        } catch {}

        const normKey = matched.clientId || matched.cliente.trim().toLowerCase();
        const clientNameLower = matched.cliente.trim().toLowerCase();

        setExpandedClients((prev) => ({
          ...prev,
          [normKey]: true,
          [clientNameLower]: true,
          ...(matched.clientId ? { [matched.clientId]: true } : {}),
        }));
        setHighlightedCardId(matched.id);

        const tryScroll = () => {
          const el = document.getElementById(`fup_card_${matched.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
          }
          const groupEl =
            document.getElementById(`fup_client_${normKey}`) ||
            document.getElementById(`fup_client_${clientNameLower}`);
          if (groupEl) {
            groupEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return false;
        };

        setTimeout(tryScroll, 100);
        setTimeout(tryScroll, 300);
        setTimeout(tryScroll, 600);

        setTimeout(() => {
          setHighlightedCardId((curr) => (curr === matched.id ? null : curr));
        }, 12000);
      }
    };

    // Checa ao montar ou quando items forem atualizados
    handleOpenTargetCard();

    // Ouve evento customizado disparado ao clicar no sino
    const listener = (e: any) => {
      const detail = e.detail || {};
      handleOpenTargetCard(detail.followUpId, detail.clientName);
    };
    window.addEventListener('fenix_open_followup_card', listener);
    return () => {
      window.removeEventListener('fenix_open_followup_card', listener);
    };
  }, [items]);

  // Helper para calcular dias corridos decorridos a partir da data de criação/entrada
  const getElapsedCalendarDays = (dateStr?: string): number => {
    if (!dateStr) return 0;
    try {
      let parsedDate: Date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
        } else {
          parsedDate = new Date(dateStr);
        }
      } else {
        parsedDate = new Date(dateStr);
      }
      if (isNaN(parsedDate.getTime())) return 0;
      const diffMs = Date.now() - parsedDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Sincronização direta com Supabase (Fonte Primária) e fallback/merge seguro com localStorage
  const syncWithSupabaseAndStorage = async () => {
    if (isPersistingRef.current) return;
    try {
      // 1. Carrega clientes locais previamente disponíveis
      const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (storedClients) {
        try {
          setClients(JSON.parse(storedClients));
        } catch {}
      }

      // 2. Consulta dados reais diretamente do Supabase (kv_store)
      const client = getSupabaseClient();
      let remoteFup: FollowUpItem[] = [];
      let remoteOrcs: any[] = [];
      let remoteClients: any[] = [];

      if (client) {
        try {
          const { data: rows, error } = await client
            .from('fenix_kv_store')
            .select('key, data')
            .in('key', [STORAGE_KEY, ORCAMENTOS_HISTORY_KEY, CLIENTS_STORAGE_KEY]);

          if (!error && Array.isArray(rows)) {
            rows.forEach((r) => {
              let rData = r.data;
              if (typeof rData === 'string') {
                try {
                  rData = JSON.parse(rData);
                } catch {}
              }
              if (r.key === STORAGE_KEY && Array.isArray(rData)) remoteFup = rData;
              if (r.key === ORCAMENTOS_HISTORY_KEY && Array.isArray(rData)) remoteOrcs = rData;
              if (r.key === CLIENTS_STORAGE_KEY && Array.isArray(rData)) remoteClients = rData;
            });
          }
        } catch (err) {
          console.warn('Erro ao consultar Supabase direto no Follow-up:', err);
        }
      }

      // 3. Fallback / Merge seguro com localStorage
      const localFupRaw = localStorage.getItem(STORAGE_KEY);
      let localFup: FollowUpItem[] = [];
      if (localFupRaw) {
        try {
          const p = JSON.parse(localFupRaw);
          if (Array.isArray(p)) localFup = p;
        } catch {}
      }

      const localOrcsRaw = localStorage.getItem(ORCAMENTOS_HISTORY_KEY);
      let localOrcs: any[] = [];
      if (localOrcsRaw) {
        try {
          const p = JSON.parse(localOrcsRaw);
          if (Array.isArray(p)) localOrcs = p;
        } catch {}
      }

      if (remoteClients.length > 0) {
        setClients(remoteClients);
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(remoteClients));
      }

      // Merge de coleções preservando registros locais mais novos
      const mergedFup =
        remoteFup.length > 0
          ? localFup.length > 0
            ? safeMergeLists(remoteFup, localFup, 'id')
            : remoteFup
          : localFup;

      const mergedOrcs =
        remoteOrcs.length > 0
          ? localOrcs.length > 0
            ? safeMergeLists(remoteOrcs, localOrcs, 'id')
            : remoteOrcs
          : localOrcs;

      // Mapa de orçamentos vendidos ou fechados para sincronizar status real
      const soldOrcMap = new Map<string, any>();
      mergedOrcs.forEach((o) => {
        if (isSoldStatus(o.status)) {
          soldOrcMap.set(o.id, o);
          if (o.id) soldOrcMap.set(o.id.replace('orc_', ''), o);
        }
      });

      // Constrói lista inicial de follow-up com status normalizado e sincronizado com orçamentos
      let currentItems: FollowUpItem[] = mergedFup
        .filter((it: FollowUpItem) => !(it.cliente || '').toLowerCase().includes('roberto silveira'))
        .map((it) => {
          const matchingSoldOrc =
            soldOrcMap.get(it.orcamentoId || '') ||
            soldOrcMap.get(it.id.replace('fup_', '')) ||
            soldOrcMap.get(it.id);

          const isItemSold = isSoldStatus(it.status) || Boolean(matchingSoldOrc);
          const finalStatus = isItemSold ? 'Vendido' : normalizeStatus(it.status);
          const resolvedVal =
            parseMonetaryValue(it.valor) ||
            parseMonetaryValue(matchingSoldOrc?.totalFinal) ||
            parseMonetaryValue(matchingSoldOrc?.valor) ||
            0;

          return {
            ...it,
            status: finalStatus,
            valor: resolvedVal,
          };
        });

      // 4. Auto-sync orçamentos emitidos que ainda não estão na esteira de Follow-up
      let updated = false;
      mergedOrcs.forEach((orc) => {
        const exists = currentItems.some(
          (it) => it.orcamentoId === orc.id || it.id === `fup_${orc.id}` || it.id === orc.id
        );
        const creationDate =
          orc.savedAt || orc.createdAt || orc.dataCriacao || orc.data || new Date().toISOString();
        const isSold = isSoldStatus(orc.status);
        const isLost = isLostStatus(orc.status);
        const shouldBeInCobranca =
          !isSold &&
          !isLost &&
          isFollowUpAtrasado({
            id: orc.id,
            cliente: orc.clienteNome || 'Cliente',
            valor: orc.totalGeral || 0,
            status: orc.status || 'Orçamento Enviado',
            dataEntradaFollowUp: creationDate,
          } as any);

        const sellerName =
          orc.consultoraName ||
          orc.vendedor ||
          orc.registeredBy ||
          currentUserName ||
          'Consultora Fênix';
        const sellerId =
          orc.vendedorId ||
          orc.consultoraId ||
          getUserIdByName(sellerName) ||
          getSellerIdForUser(sellerName);

        if (!exists) {
          const initialStatus: FollowUpStatus = isSold
            ? 'Vendido'
            : isLost
            ? 'Perdido'
            : shouldBeInCobranca
            ? 'Aguardando Retorno'
            : 'Orçamento Enviado';

          const newItem: FollowUpItem = {
            id: `fup_${orc.id}`,
            pedido:
              orc.id.replace('orc_', '').slice(-4) ||
              String(Math.floor(1000 + Math.random() * 9000)),
            orcamentoId: orc.id,
            clientId: orc.clientId,
            cliente: orc.clientName || orc.cliente || 'Cliente Sem Nome',
            clientType: orc.clientType || 'Cliente Final',
            nomeOrcamento: orc.nomeOrcamento || 'Orçamento de Materiais',
            produto: orc.items?.[0]?.descricao || 'Pisos e Revestimentos Fênix',
            telefone: orc.clientContact || orc.telefone || '',
            valor: Number(orc.totalFinal) || Number(orc.valor) || 0,
            dataCriacao: creationDate.includes('T') ? creationDate.split('T')[0] : creationDate,
            dataEntradaFollowUp: creationDate,
            dataAtualizacao: new Date().toISOString(),
            dataUltimaCobranca: shouldBeInCobranca ? new Date().toISOString() : undefined,
            cobrancaAutomaticaGerada: shouldBeInCobranca,
            status: initialStatus,
            observacao:
              orc.observacoes ||
              (isSold
                ? 'Venda confirmada no orçamento original.'
                : shouldBeInCobranca
                ? 'Orçamento em cobrança de retorno automático (2+ dias).'
                : 'Orçamento gerado e enviado diretamente para a esteira comercial.'),
            vendedor: sellerName,
            vendedorId: sellerId,
            criadoPor: sellerName,
            criadoPorId: sellerId,
            creatorId: sellerId,
            responsavel: sellerName,
            responsavelId: sellerId,
            createdAt: creationDate,
            historico: [
              {
                id: `h_init_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                data: formatDateOnly(creationDate),
                hora: new Date(creationDate).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                statusAnterior: '-',
                novoStatus: initialStatus,
                observacao: isSold
                  ? 'Venda confirmada no orçamento original.'
                  : 'Orçamento gerado e cadastrado no Follow-up comercial.',
                usuario: sellerName,
                timestamp: new Date(creationDate).getTime(),
              },
            ],
          };

          currentItems = [newItem, ...currentItems];
          updated = true;
        } else {
          // Se já existe, mas o orçamento foi vendido no histórico e o item ainda não estava como Vendido
          if (isSold) {
            currentItems = currentItems.map((it) => {
              if (
                (it.orcamentoId === orc.id || it.id === `fup_${orc.id}` || it.id === orc.id) &&
                !isSoldStatus(it.status)
              ) {
                updated = true;
                return {
                  ...it,
                  status: 'Vendido',
                  valor: parseMonetaryValue(it.valor) || parseMonetaryValue(orc.totalFinal) || parseMonetaryValue(orc.valor) || 0,
                  dataAtualizacao: new Date().toISOString(),
                };
              }
              return it;
            });
          }
        }
      });

      // 5. Salva estado sincronizado
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
      localStorage.setItem(ORCAMENTOS_HISTORY_KEY, JSON.stringify(mergedOrcs));
      setItems(currentItems);

      if (updated && client) {
        executeWithRetry(async () => {
          await client.from('fenix_kv_store').upsert({
            key: STORAGE_KEY,
            data: currentItems,
            updated_at: new Date().toISOString(),
            updated_by: currentUserName,
          });
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Erro na sincronização de dados:', err);
    }
  };

  useEffect(() => {
    syncWithSupabaseAndStorage();

    const handleSync = () => {
      syncWithSupabaseAndStorage();
    };

    window.addEventListener('fenix_followup_updated', handleSync);
    window.addEventListener('fenix_orcamentos_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('fenix_followup_updated', handleSync);
      window.removeEventListener('fenix_orcamentos_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Salva no localStorage e central Supabase quando itens atualizam
  const persistItems = (newItems: FollowUpItem[], singleItemToSave?: FollowUpItem) => {
    isPersistingRef.current = true;
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      if (singleItemToSave) {
        saveItemToSupabase(STORAGE_KEY, singleItemToSave, 'id', currentUserName).catch(() => {});

        // Sincroniza bidirecionalmente no histórico de orçamentos se possuir orcamentoId
        if (singleItemToSave.orcamentoId) {
          const orcId = singleItemToSave.orcamentoId;
          const isSold = isSoldStatus(singleItemToSave.status);
          const rawOrcs = localStorage.getItem(ORCAMENTOS_HISTORY_KEY);
          if (rawOrcs) {
            try {
              const orcs: any[] = JSON.parse(rawOrcs);
              if (Array.isArray(orcs)) {
                const updatedOrcs = orcs.map((o) =>
                  o.id === orcId || o.id === orcId.replace('orc_', '')
                    ? {
                        ...o,
                        status: isSold ? 'Vendido' : singleItemToSave.status,
                        updatedAt: new Date().toISOString(),
                      }
                    : o
                );
                localStorage.setItem(ORCAMENTOS_HISTORY_KEY, JSON.stringify(updatedOrcs));
                const targetOrc = updatedOrcs.find(
                  (o) => o.id === orcId || o.id === orcId.replace('orc_', '')
                );
                if (targetOrc) {
                  saveItemToSupabase(ORCAMENTOS_HISTORY_KEY, targetOrc, 'id', currentUserName).catch(
                    () => {}
                  );
                }
              }
            } catch {}
          }
          window.dispatchEvent(new Event('fenix_orcamentos_updated'));
        }
      }
      window.dispatchEvent(new Event('fenix_followup_updated'));
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        isPersistingRef.current = false;
      }, 1200);
    }
  };

  // Helper to resolve client type accurately
  const resolveClientType = (item: FollowUpItem): string => {
    if (item.clientType) return item.clientType;
    const match = clients.find(
      (c) =>
        (item.clientId && c.id === item.clientId) ||
        (c.name && item.cliente && c.name.trim().toLowerCase() === item.cliente.trim().toLowerCase()) ||
        ((c as any).nome && item.cliente && (c as any).nome.trim().toLowerCase() === item.cliente.trim().toLowerCase())
    );
    return match?.clientType || 'Cliente Final';
  };

  // Helper to resolve client phone / whatsapp from budget or registered clients
  const resolveBudgetPhone = (budget?: FollowUpItem | null, clientNameFallback?: string): string => {
    if (budget && budget.telefone && budget.telefone.trim()) return budget.telefone.trim();
    const targetName = (budget?.cliente || clientNameFallback || '').trim().toLowerCase();
    const match = clients.find(
      (c) =>
        (budget?.clientId && c.id === budget.clientId) ||
        (c.name && targetName && c.name.trim().toLowerCase() === targetName) ||
        ((c as any).nome && targetName && (c as any).nome.trim().toLowerCase() === targetName)
    );
    return match?.whatsapp || (match as any)?.telefone || (match as any)?.phone || '';
  };

  const formatPhoneNumberDisplay = (phoneStr?: string): string => {
    if (!phoneStr) return '';
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phoneStr;
  };

  // Requirement 6: Helper para extrair data e mês de cada item de follow-up
  const getItemDateParts = (item: FollowUpItem): { dateStr: string; monthStr: string } => {
    const rawVal =
      item.dataCriacao ||
      (item as any).dataOrcamento ||
      item.dataEntradaFollowUp ||
      item.createdAt ||
      item.dataAtualizacao ||
      (item as any).data ||
      '';
    if (!rawVal) return { dateStr: '', monthStr: '' };
    const raw = String(rawVal).trim();

    // Timestamp numérico (ex: 1789731326428)
    if (!isNaN(Number(raw)) && Number(raw) > 1000000000) {
      try {
        const d = new Date(Number(raw));
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString();
          return { dateStr: iso.slice(0, 10), monthStr: iso.slice(0, 7) };
        }
      } catch {}
    }

    if (raw.includes('-')) {
      const parts = raw.split('T')[0].split(' ')[0].split('-');
      if (parts.length >= 3 && parts[0].length === 4) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return { dateStr: `${y}-${m}-${d}`, monthStr: `${y}-${m}` };
      }
    }
    if (raw.includes('/')) {
      const parts = raw.split('T')[0].split(' ')[0].split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return { dateStr: `${y}-${m}-${d}`, monthStr: `${y}-${m}` };
        } else {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return { dateStr: `${y}-${m}-${d}`, monthStr: `${y}-${m}` };
        }
      }
    }
    const slice10 = raw.slice(0, 10);
    return { dateStr: slice10, monthStr: slice10.slice(0, 7) };
  };

  const matchesPeriod = (item: FollowUpItem): boolean => {
    if (periodMode === 'todos') return true;
    const { dateStr, monthStr } = getItemDateParts(item);
    if (periodMode === 'dia') {
      return dateStr === selectedDate;
    }
    if (periodMode === 'mes') {
      return monthStr === selectedMonth;
    }
    return true;
  };

  // Responsible counts for Director Éder Perez
  const responsibleCounts = useMemo(() => {
    if (!isDirector) return undefined;
    const periodFiltered = items.filter((item) => matchesPeriod(item));
    return {
      todos: periodFiltered.length,
      eder: periodFiltered.filter((i) => isRecordOfResponsible(i, 'Éder')).length,
      vanessa: periodFiltered.filter((i) => isRecordOfResponsible(i, 'Vanessa')).length,
      jhessica: periodFiltered.filter((i) => isRecordOfResponsible(i, 'Jhessica')).length,
      demais: periodFiltered.filter((i) => isRecordOfResponsible(i, 'demais')).length,
    };
  }, [items, isDirector, periodMode, selectedDate, selectedMonth]);

  // Scoped items based on director tab or logged in common user
  // REGRA ESTRITA: Usuário comum consulta exclusivamente seus próprios Follow-ups
  // "Nunca mostrar Follow-ups pertencentes a outro usuário."
  const userItems = useMemo(() => {
    const periodFiltered = items.filter((item) => matchesPeriod(item));
    if (isDirector) {
      if (responsibleTab === 'Todos') return periodFiltered;
      return periodFiltered.filter((item) => isRecordOfResponsible(item, responsibleTab));
    }
    // Usuário comum visualiza somente seus próprios registros no período selecionado
    return periodFiltered.filter((item) => isRecordOfResponsible(item, currentUserName || ''));
  }, [items, isDirector, responsibleTab, currentUserName, periodMode, selectedDate, selectedMonth]);

  // 1. TOTAL PERÍODO: quantidade total de orçamentos, clientes únicos e valor total no período
  const totalPeriodCount = useMemo(() => {
    return userItems.length;
  }, [userItems]);

  const totalPeriodClientsCount = useMemo(() => {
    const clientsSet = new Set<string>();
    userItems.forEach((i) => {
      const k = i.clientId || i.cliente.trim().toLowerCase();
      if (k) clientsSet.add(k);
    });
    return clientsSet.size;
  }, [userItems]);

  const totalPeriodValor = useMemo(() => {
    return userItems.reduce((acc, item) => acc + parseMonetaryValue(item.valor), 0);
  }, [userItems]);

  // 2. TOTAL VENDIDO: quantidade de vendas realizadas, clientes únicos e valor total vendido no período
  const totalVendidoItems = useMemo(() => {
    return userItems.filter((item) => isSoldStatus(item.status));
  }, [userItems]);

  const totalVendidoCount = useMemo(() => {
    return totalVendidoItems.length;
  }, [totalVendidoItems]);

  const totalVendidoClientsCount = useMemo(() => {
    const clientsSet = new Set<string>();
    totalVendidoItems.forEach((i) => {
      const k = i.clientId || i.cliente.trim().toLowerCase();
      if (k) clientsSet.add(k);
    });
    return clientsSet.size;
  }, [totalVendidoItems]);

  const totalVendidoValor = useMemo(() => {
    return totalVendidoItems.reduce((acc, item) => acc + parseMonetaryValue(item.valor), 0);
  }, [totalVendidoItems]);

  // Indicadores de Ação Rápida (Atrasados, Retornos hoje, Em aberto, Vendidos)
  // Regra Oficial: 2 dias úteis sem sábado/domingo/feriado
  const atrasadosCount = useMemo(() => {
    return userItems.filter((i) => isFollowUpAtrasado(i)).length;
  }, [userItems]);

  const retornosHojeCount = useMemo(() => {
    return userItems.filter((i) => isFollowUpRetornoHoje(i)).length;
  }, [userItems]);

  const emAbertoCount = useMemo(() => {
    return userItems.filter((i) => isOpenStatus(i.status)).length;
  }, [userItems]);

  const vendidosCount = useMemo(() => {
    return totalVendidoCount;
  }, [totalVendidoCount]);

  // Group budgets by client: "Manter o Follow-up em CARDS, um único card por cliente. Se houver vários orçamentos do mesmo cliente, NÃO criar outro card. Manter todos no mesmo card."
  interface ClientCardGroup {
    clientKey: string;
    clientName: string;
    clientType: string;
    orcamentos: FollowUpItem[];
    orcamentosCount: number;
    totalValue: number;
  }

  const clientGroups = useMemo<ClientCardGroup[]>(() => {
    const groupsMap = new Map<string, ClientCardGroup>();

    userItems.forEach((item) => {
      const cType = resolveClientType(item);
      const normalizedKey = item.clientId || item.cliente.trim().toLowerCase();

      if (!groupsMap.has(normalizedKey)) {
        groupsMap.set(normalizedKey, {
          clientKey: normalizedKey,
          clientName: item.cliente,
          clientType: cType,
          orcamentos: [],
          orcamentosCount: 0,
          totalValue: 0,
        });
      }

      const group = groupsMap.get(normalizedKey)!;
      group.orcamentos.push(item);
      group.orcamentosCount += 1;
      group.totalValue += parseMonetaryValue(item.valor);
    });

    return Array.from(groupsMap.values());
  }, [userItems, clients]);

  // GLOBAL SEARCH & STATUS & QUICK FILTERS:
  const isGlobalSearching = searchTerm.trim().length > 0;

  const filteredClientGroups = useMemo(() => {
    let result = clientGroups;

    // 1. Filtro de Situação em área separada (Atrasados, Retornos hoje)
    if (situacaoFilter === 'atrasados') {
      result = result
        .map((g) => {
          const matching = g.orcamentos.filter((b) => isFollowUpAtrasado(b));
          if (matching.length === 0) return null;
          return { ...g, orcamentos: matching, orcamentosCount: matching.length };
        })
        .filter((g): g is ClientCardGroup => g !== null);
    } else if (situacaoFilter === 'retornos_hoje') {
      result = result
        .map((g) => {
          const matching = g.orcamentos.filter((b) => isFollowUpRetornoHoje(b));
          if (matching.length === 0) return null;
          return { ...g, orcamentos: matching, orcamentosCount: matching.length };
        })
        .filter((g): g is ClientCardGroup => g !== null);
    }

    // 2. Filtro de Status oficial
    if (activeTab !== 'Todos') {
      result = result
        .map((group) => {
          const matchingBudgets = group.orcamentos.filter((b) => b.status === activeTab);
          if (matchingBudgets.length === 0) return null;
          return {
            ...group,
            orcamentos: matchingBudgets,
            orcamentosCount: matchingBudgets.length,
          };
        })
        .filter((g): g is ClientCardGroup => g !== null);
    }

    // 3. Filtro por Tipo de Cliente
    if (clientTypeFilter !== 'Todos') {
      result = result.filter((g) => g.clientType === clientTypeFilter);
    }

    // 4. Filtro por Faixa de Valor
    if (valueFilter === 'ate_5k') {
      result = result.filter((g) => g.totalValue <= 5000);
    } else if (valueFilter === '5k_15k') {
      result = result.filter((g) => g.totalValue > 5000 && g.totalValue <= 15000);
    } else if (valueFilter === 'acima_15k') {
      result = result.filter((g) => g.totalValue > 15000);
    }

    // 5. Busca Global por nome do cliente, produto, orçamento, telefone ou vendedor
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter((group) => {
        const matchesClientName = group.clientName.toLowerCase().includes(query);
        const matchesBudget = group.orcamentos.some(
          (b) =>
            (b.nomeOrcamento || '').toLowerCase().includes(query) ||
            (b.produto || '').toLowerCase().includes(query) ||
            (b.pedido || '').includes(query) ||
            (b.telefone || '').includes(query) ||
            (b.vendedor || '').toLowerCase().includes(query) ||
            (b.observacao || '').toLowerCase().includes(query)
        );
        return matchesClientName || matchesBudget;
      });
    }

    // 6. Ordenação dos grupos de clientes
    result = [...result].sort((a, b) => {
      if (sortOrder === 'maior_valor') {
        return b.totalValue - a.totalValue;
      }
      if (sortOrder === 'menor_valor') {
        return a.totalValue - b.totalValue;
      }
      if (sortOrder === 'nome_az') {
        return a.clientName.localeCompare(b.clientName, 'pt-BR');
      }
      if (sortOrder === 'antigos') {
        const dateA = a.orcamentos[0]?.dataCriacao || '';
        const dateB = b.orcamentos[0]?.dataCriacao || '';
        return dateA.localeCompare(dateB);
      }
      // 'recentes' (padrão)
      const dateA = a.orcamentos[0]?.dataCriacao || '';
      const dateB = b.orcamentos[0]?.dataCriacao || '';
      return dateB.localeCompare(dateA);
    });

    return result;
  }, [
    clientGroups,
    situacaoFilter,
    activeTab,
    clientTypeFilter,
    valueFilter,
    searchTerm,
    sortOrder,
    todayStr,
  ]);

  // Contadores para o resumo de resultados exibidos
  const totalBudgetsInFiltered = useMemo(() => {
    return filteredClientGroups.reduce((acc, g) => acc + g.orcamentosCount, 0);
  }, [filteredClientGroups]);

  const totalValueInFiltered = useMemo(() => {
    return filteredClientGroups.reduce((acc, g) => acc + g.totalValue, 0);
  }, [filteredClientGroups]);

  // Dynamic counts for status tabs
  const statusCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      Todos: userItems.length,
      'Orçamento Enviado': 0,
      'Aguardando Retorno': 0,
      Negociando: 0,
      Vendido: 0,
      Perdido: 0,
    };

    userItems.forEach((it) => {
      const st = it.status as FilterTab;
      if (counts[st] !== undefined) {
        counts[st] += 1;
      }
    });

    return counts;
  }, [userItems]);

  // Toggle card expansion
  const toggleCard = (clientKey: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientKey]: !prev[clientKey],
    }));
  };

  // Ativar / Desativar lembretes individualmente
  const handleToggleLembretes = (budget: FollowUpItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const novoEstado = budget.lembretesAtivos === false ? true : false;
    const updatedBudget: FollowUpItem = {
      ...budget,
      lembretesAtivos: novoEstado,
    };
    const updatedItems = items.map((it) => (it.id === budget.id ? updatedBudget : it));
    persistItems(updatedItems, updatedBudget);

    if (novoEstado) {
      showToast(`🔔 Lembretes a cada 2 dias ATIVADOS para ${budget.cliente}.`);
    } else {
      try {
        localStorage.removeItem(`fenix_fup_alerted_2dias_${budget.id}`);
      } catch {}
      showToast(`🔕 Lembretes DESATIVADOS para ${budget.cliente}.`);
    }
  };

  // Regra 5: NOVO CICLO
  // "Se o usuário receber a notificação, entrar em contato com o cliente e NÃO marcar como Vendido ou Perdido:
  // - Iniciar novo ciclo de 2 DIAS ÚTEIS.
  // - Durante esse período, permanecer em “Atrasados”.
  // - Não aparecer em “Retornos Hoje”.
  // - Quando os próximos 2 dias úteis forem completados:
  //   → gerar nova notificação às 08:00;
  //   → aparecer novamente em “Retornos Hoje”;
  //   → continuar em “Atrasados”.
  // Repetir esse ciclo de 2 dias úteis até o Follow-up ser resolvido."
  const handleRegistrarContato = (budget: FollowUpItem, meio: string = 'Contato', e?: React.MouseEvent) => {
    e?.stopPropagation();
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    const newHistoryEntry: FollowUpHistoryEntry = {
      id: `h_contato_${Date.now()}`,
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${min}`,
      statusAnterior: budget.status,
      novoStatus: budget.status,
      observacao: `${meio} realizado com o cliente. Novo ciclo de 2 dias úteis iniciado.`,
      usuario: currentUserName,
      timestamp: now.getTime(),
    };

    const updatedBudget: FollowUpItem = {
      ...budget,
      dataUltimoContato: now.toISOString(),
      dataCicloAtual: now.toISOString(),
      dataAtualizacao: now.toISOString(),
      historico: [newHistoryEntry, ...(budget.historico || [])],
    };

    const updatedItems = items.map((it) => (it.id === budget.id ? updatedBudget : it));
    persistItems(updatedItems, updatedBudget);
    showToast(`✓ ${meio} registrado! Novo ciclo de 2 dias úteis iniciado para ${budget.cliente}.`);
  };

  // Open Status Change Modal
  const handleOpenStatusModal = (budget: FollowUpItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTransitioningBudget(budget);
    setSelectedNewStatus(budget.status);
    setStatusComment('');
    setStatusError('');
    setNumeroPedidoInput(budget.pedido ? String(budget.pedido).replace(/^#+/, '') : '');
    setPedidoError('');
    setFormaPagamentoInput(budget.formaPagamento || 'Pix');
    setParcelasInput(budget.parcelas || '1x');

    // Inicializa formas de pagamento (múltiplos pagamentos)
    if (budget.formasPagamento && budget.formasPagamento.length > 0) {
      setStatusPayments(budget.formasPagamento);
    } else {
      const budgetVal = Number(budget.valor) || 0;
      setStatusPayments([
        {
          id: `pay_fup_${Date.now()}`,
          forma: budget.formaPagamento || 'Pix',
          valor: budgetVal,
        },
      ]);
    }
  };

  // Save Status Change
  const handleSaveStatusChange = () => {
    if (!transitioningBudget) return;

    const cleanPedido = numeroPedidoInput.trim().replace(/^#+/, '');
    const budgetVal = Number(transitioningBudget.valor) || 0;

    // Se o status for Vendido, o número do pedido e divisão exata de pagamentos são obrigatórios
    if (selectedNewStatus === 'Vendido') {
      if (!cleanPedido) {
        setPedidoError('Informe o número do pedido para registrar a venda.');
        return;
      }
      if (!isPaymentSplitComplete(statusPayments, budgetVal)) {
        setStatusError('A soma das formas de pagamento deve ser exatamente igual ao valor da venda.');
        return;
      }
    }

    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    const commentText = statusComment.trim();
    const paymentSummary =
      selectedNewStatus === 'Vendido'
        ? summarizePayments(statusPayments)
        : transitioningBudget.formaPagamento || 'Pix';

    const newHistoryEntry: FollowUpHistoryEntry = {
      id: `h_${Date.now()}`,
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${min}`,
      statusAnterior: transitioningBudget.status,
      novoStatus: selectedNewStatus,
      observacao:
        selectedNewStatus === 'Vendido'
          ? `Venda confirmada. Pedido #${cleanPedido} • ${paymentSummary}${commentText ? ` — ${commentText}` : ''}`
          : commentText || `Status alterado para ${selectedNewStatus}`,
      usuario: currentUserName,
      timestamp: now.getTime(),
    };

    const isFinished = selectedNewStatus === 'Vendido' || selectedNewStatus === 'Perdido';

    // Se for Cartão de Crédito, obtém as parcelas do split de pagamento ou do input
    const cardPay = statusPayments.find((p) => isFormaCartaoCredito(p.forma));
    const resolvedParcelas =
      selectedNewStatus === 'Vendido'
        ? cardPay?.parcelas || (formaPagamentoInput === 'Cartão' ? parcelasInput : undefined)
        : transitioningBudget.parcelas;

    const updatedBudget: FollowUpItem = {
      ...transitioningBudget,
      status: selectedNewStatus,
      lembretesAtivos: isFinished ? false : (transitioningBudget.lembretesAtivos ?? true),
      pedido: selectedNewStatus === 'Vendido' ? cleanPedido : transitioningBudget.pedido,
      formaPagamento: selectedNewStatus === 'Vendido' ? paymentSummary : transitioningBudget.formaPagamento,
      formasPagamento: selectedNewStatus === 'Vendido' ? statusPayments : transitioningBudget.formasPagamento,
      parcelas: resolvedParcelas,
      dataUltimoContato: isFinished ? transitioningBudget.dataUltimoContato : now.toISOString(),
      dataCicloAtual: isFinished ? transitioningBudget.dataCicloAtual : now.toISOString(),
      dataAtualizacao: now.toISOString(),
      observacao: commentText || transitioningBudget.observacao,
      historico: [newHistoryEntry, ...(transitioningBudget.historico || [])],
    };

    const updatedItems = items.map((it) =>
      it.id === transitioningBudget.id ? updatedBudget : it
    );
    persistItems(updatedItems, updatedBudget);

    // 1. FOLLOW-UP + META + VENDAS DO DIRETOR ÉDER:
    // Sincronização automática bidirecional com remoção ao desmarcar de Vendido e prevenção de duplicatas
    syncFollowUpStatusWithMetasAndVendas(
      updatedBudget,
      selectedNewStatus,
      currentUserName,
      {
        pedido: cleanPedido,
        formasPagamento: statusPayments,
        formaPagamento: paymentSummary,
        parcelas: resolvedParcelas,
      }
    );

    // VENDIDO ACTIONS:
    if (selectedNewStatus === 'Vendido') {
      const clientPhone = resolveBudgetPhone(transitioningBudget);
      const saleId = `v_orc_${transitioningBudget.id}`;

      // Resgata frete, desconto e produtos originais do orçamento vinculado
      const allOrcs = getAllSavedOrcamentos();
      const linkedOrc = allOrcs.find(
        (o) =>
          (transitioningBudget.orcamentoId && o.id === transitioningBudget.orcamentoId) ||
          o.id === transitioningBudget.id.replace('fup_', '') ||
          o.id === transitioningBudget.id
      );
      const freteNum =
        linkedOrc?.freteAtivo && linkedOrc?.freteValor
          ? Number(linkedOrc.freteValor)
          : Number(transitioningBudget.frete) || 0;
      const descontoNum = linkedOrc?.descontoValor
        ? Number(linkedOrc.descontoValor)
        : Number(transitioningBudget.desconto) || 0;
      const validOrcProdutos = linkedOrc?.items?.map((it: any) => ({
        id: it.id || `p_${Math.random()}`,
        nome: it.descricao || 'Produto',
        detalhe: it.subtitulo,
        unidade: it.unidade || 'un',
        quantidade: parseFloat(it.qtd) || 1,
        valorUnitario: Number(it.precoUnitario) || 0,
        subtotal: Number(it.total) || 0,
      }));

      // 1. Contabilizar o valor da venda em Metas (Evitar duplicidade)
      try {
        const storedMetas = localStorage.getItem(METAS_SALES_STORAGE_KEY);
        let salesList: any[] = [];
        if (storedMetas) {
          salesList = JSON.parse(storedMetas);
        }

        const newSale = {
          id: saleId,
          orcamentoId: transitioningBudget.id,
          followUpId: transitioningBudget.id,
          pedido: cleanPedido,
          valor: Number(transitioningBudget.valor) || 0,
          frete: freteNum > 0 ? freteNum : undefined,
          desconto: descontoNum > 0 ? descontoNum : undefined,
          produtos: validOrcProdutos || transitioningBudget.produtos,
          cliente: transitioningBudget.cliente,
          whatsapp: clientPhone || '',
          tipoCliente: transitioningBudget.clientType || 'Cliente Final',
          formaPagamento: paymentSummary,
          formasPagamento: statusPayments,
          parcelas: resolvedParcelas,
          data: `${ano}-${mes}-${dia}`,
          responsavel: transitioningBudget.responsavel || transitioningBudget.vendedor || currentUserName || 'Vanessa Gomes',
          vendedor: transitioningBudget.responsavel || transitioningBudget.vendedor || currentUserName || 'Vanessa Gomes',
          criadoPor: transitioningBudget.criadoPor || currentUserName,
          registeredBy: currentUserName,
        };

        // Verificar se a venda desse orçamento ou desse pedido já existe para não duplicar
        const existingSaleIndex = salesList.findIndex(
          (s: any) =>
            s.orcamentoId === transitioningBudget.id ||
            s.followUpId === transitioningBudget.id ||
            s.id === saleId ||
            (cleanPedido && s.pedido === cleanPedido && s.cliente?.trim().toLowerCase() === transitioningBudget.cliente.trim().toLowerCase())
        );

        let updatedSales: any[];
        if (existingSaleIndex >= 0) {
          // Atualiza registro existente sem criar duplicatas
          updatedSales = [...salesList];
          updatedSales[existingSaleIndex] = {
            ...updatedSales[existingSaleIndex],
            ...newSale,
            id: salesList[existingSaleIndex].id || saleId,
          };
        } else {
          // Adiciona novo registro de venda
          updatedSales = [newSale, ...salesList];
        }

        localStorage.setItem(METAS_SALES_STORAGE_KEY, JSON.stringify(updatedSales));
        saveWholeCollectionToSupabase(METAS_SALES_STORAGE_KEY, updatedSales, currentUserName).catch(() => {});
        syncSingleMetaSaleToVendas(newSale, currentUserName).catch(() => {});
        window.dispatchEvent(new Event('fenix_metas_updated'));
        window.dispatchEvent(new Event('fenix_vendas_updated'));
      } catch (err) {
        console.error('Erro ao contabilizar em Metas:', err);
      }

      // 2. Enviar esse orçamento/cliente para Pós-Vendas (Evitar duplicidade)
      try {
        const storedPosVendas = localStorage.getItem(POS_VENDAS_STORAGE_KEY);
        let posVendasList: PosVendaItem[] = [];
        if (storedPosVendas) {
          posVendasList = JSON.parse(storedPosVendas);
        }

        const nextFollowUp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextDia = String(nextFollowUp.getDate()).padStart(2, '0');
        const nextMes = String(nextFollowUp.getMonth() + 1).padStart(2, '0');
        const nextAno = nextFollowUp.getFullYear();

        const pvId = `pv_orc_${transitioningBudget.id}`;
        const newPosVenda: PosVendaItem = {
          id: pvId,
          orderNumber: cleanPedido,
          clientId: transitioningBudget.clientId,
          clientName: transitioningBudget.cliente,
          clientPhone: clientPhone || '(11) 98765-4321',
          clientType: (transitioningBudget.clientType as any) || 'Cliente Final',
          valor: Number(transitioningBudget.valor) || 0,
          origem: 'followup',
          orcamentoId: transitioningBudget.id,
          projectDescription:
            transitioningBudget.nomeOrcamento ||
            transitioningBudget.produto ||
            'Orçamento Aprovado',
          installerName: 'A Definir',
          completionDate: `${ano}-${mes}-${dia}`,
          satisfactionRating: 0,
          status: 'Aguardando Contato',
          type: 'Contato de Satisfação',
          feedback: '',
          nextFollowUpDate: `${nextAno}-${nextMes}-${nextDia}`,
          notes: `Venda concluída no Follow-up Comercial. Pedido #${cleanPedido}. Valor: ${formatCurrency(
            transitioningBudget.valor
          )}${commentText ? `. Comentário: ${commentText}` : ''}`,
          createdAt: now.toISOString(),
        };

        const existingPvIndex = posVendasList.findIndex(
          (pv) =>
            pv.id === pvId ||
            (pv.orcamentoId && pv.orcamentoId === transitioningBudget.id) ||
            (cleanPedido && pv.orderNumber === cleanPedido)
        );

        let updatedPosVendas: PosVendaItem[];
        if (existingPvIndex >= 0) {
          updatedPosVendas = [...posVendasList];
          updatedPosVendas[existingPvIndex] = {
            ...updatedPosVendas[existingPvIndex],
            ...newPosVenda,
            id: posVendasList[existingPvIndex].id,
          };
        } else {
          updatedPosVendas = [newPosVenda, ...posVendasList];
        }

        localStorage.setItem(POS_VENDAS_STORAGE_KEY, JSON.stringify(updatedPosVendas));
        window.dispatchEvent(new Event('fenix_pos_vendas_updated'));

        showToast(`✓ Venda confirmada! Pedido #${cleanPedido} enviado para Pós-Vendas e registrado em Metas.`);
      } catch (err) {
        console.error('Erro ao transferir para Pós-Vendas:', err);
        showToast('✓ Status atualizado para Vendido com sucesso.');
      }
    } else {
      showToast(`✓ Status atualizado para "${selectedNewStatus}" com sucesso.`);
    }

    setTransitioningBudget(null);
  };

  // Helper para carregar todos os orçamentos salvos do localStorage de forma segura
  const getAllSavedOrcamentos = (): SavedOrcamento[] => {
    try {
      const map = new Map<string, SavedOrcamento>();
      const raw1 = localStorage.getItem(ORCAMENTOS_HISTORY_KEY);
      if (raw1) {
        const p1 = JSON.parse(raw1);
        if (Array.isArray(p1)) {
          p1.forEach((o) => {
            if (o && o.id) map.set(o.id, o);
          });
        }
      }
      const raw2 = localStorage.getItem('fenix_saved_orcamentos');
      if (raw2) {
        const p2 = JSON.parse(raw2);
        if (Array.isArray(p2)) {
          p2.forEach((o) => {
            if (o && o.id && !map.has(o.id)) map.set(o.id, o);
          });
        }
      }
      return Array.from(map.values());
    } catch (err) {
      console.error('Erro ao ler orçamentos:', err);
      return [];
    }
  };

  // Handler para buscar e abrir o orçamento vinculado diretamente do card individual
  const handleOpenOrcamentoFromFollowUp = (budget: FollowUpItem) => {
    const allOrcamentos = getAllSavedOrcamentos();

    const normalizeStr = (s?: string) =>
      (s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

    const normClient = normalizeStr(budget.cliente);
    const cleanPedido = (budget.pedido || '').replace(/\D/g, '');

    // 1. Busca por vínculo direto exato
    const directMatch = allOrcamentos.find((o) => {
      if (budget.orcamentoId && o.id === budget.orcamentoId) return true;
      if (o.id === budget.id.replace('fup_', '') || o.id === budget.id) return true;
      return false;
    });

    // 2. Busca todos os orçamentos candidatos deste cliente
    const clientBudgetsMap = new Map<string, SavedOrcamento>();

    if (directMatch) {
      clientBudgetsMap.set(directMatch.id, directMatch);
    }

    allOrcamentos.forEach((o) => {
      if (budget.orcamentoId && o.id === budget.orcamentoId) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      if (o.id === budget.id.replace('fup_', '') || o.id === budget.id) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      if (budget.clientId && o.clientId && budget.clientId === o.clientId) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      if (normClient && normalizeStr(o.clientName) === normClient) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      if (normClient && normalizeStr((o as any).cliente) === normClient) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      if (cleanPedido) {
        const oIdTail = o.id.replace('orc_', '').slice(-4);
        const oPed = (o as any).pedido || '';
        if (oIdTail === cleanPedido || oPed === cleanPedido) {
          clientBudgetsMap.set(o.id, o);
          return;
        }
      }
      const oName = normalizeStr(o.clientName || (o as any).cliente);
      if (normClient.length >= 4 && oName.length >= 4) {
        if (normClient.includes(oName) || oName.includes(normClient)) {
          clientBudgetsMap.set(o.id, o);
          return;
        }
      }
    });

    const clientBudgets = Array.from(clientBudgetsMap.values());

    const targetOrcamento = directMatch || clientBudgets[0] || {
      id: budget.orcamentoId || budget.id.replace('fup_', '') || `orc_${Date.now()}`,
      clientId: budget.clientId || 'cli_geral',
      clientName: budget.cliente,
      clientType: budget.clientType || 'Cliente Final',
      clientContact: budget.telefone || '',
      nomeOrcamento: budget.nomeOrcamento || '',
      consultoraName: budget.vendedor || currentUserName || 'Consultora Fênix',
      dataOrcamento: budget.dataCriacao || new Date().toLocaleDateString('pt-BR'),
      observacoes: budget.observacao || '',
      items: [
        {
          id: `item_${Date.now()}`,
          qtd: '1',
          descricao: budget.nomeOrcamento || 'Item do Orçamento',
          unidade: 'un',
          precoUnitario: Number(budget.valor) || 0,
          total: Number(budget.valor) || 0,
        },
      ],
      freteValor: 0,
      freteEndereco: '',
      descontoValor: 0,
      totalFinal: Number(budget.valor) || 0,
      status: 'Em aberto' as OrcamentoStatus,
      savedAt: budget.createdAt || new Date().toISOString(),
    };

    // Garante persistência do vínculo Follow-up <-> Orçamento no banco e local
    if (!budget.orcamentoId || budget.orcamentoId !== targetOrcamento.id) {
      const updatedBudget: FollowUpItem = {
        ...budget,
        orcamentoId: targetOrcamento.id,
      };
      const updatedItems = items.map((it) => (it.id === budget.id ? updatedBudget : it));
      persistItems(updatedItems, updatedBudget);
    }

    setViewingOrcamentoData({
      followUp: budget,
      clientBudgets: clientBudgets.length > 0 ? clientBudgets : [targetOrcamento],
      selectedOrcamento: targetOrcamento,
    });
  };

  // Handler para acionar "VER ORÇAMENTO" diretamente do card do cliente
  const handleOpenOrcamentoForClientGroup = (group: ClientCardGroup) => {
    const allOrcamentos = getAllSavedOrcamentos();

    const normalizeStr = (s?: string) =>
      (s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

    const normClient = normalizeStr(group.clientName);

    // Mapeia todos os orçamentos candidatos deste cliente
    const clientBudgetsMap = new Map<string, SavedOrcamento>();

    // 1. Pelos orçamentos já vinculados nos cards deste grupo
    group.orcamentos.forEach((b) => {
      const match = allOrcamentos.find(
        (o) =>
          (b.orcamentoId && o.id === b.orcamentoId) ||
          o.id === b.id.replace('fup_', '') ||
          o.id === b.id
      );
      if (match) {
        clientBudgetsMap.set(match.id, match);
      }
    });

    // 2. Por clientId ou nome do cliente em allOrcamentos
    allOrcamentos.forEach((o) => {
      if (clientBudgetsMap.has(o.id)) return;
      if (group.orcamentos[0]?.clientId && o.clientId && group.orcamentos[0].clientId === o.clientId) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      if (normClient && normalizeStr(o.clientName) === normClient) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      if (normClient && normalizeStr((o as any).cliente) === normClient) {
        clientBudgetsMap.set(o.id, o);
        return;
      }
      const oName = normalizeStr(o.clientName || (o as any).cliente);
      if (normClient.length >= 4 && oName.length >= 4) {
        if (normClient.includes(oName) || oName.includes(normClient)) {
          clientBudgetsMap.set(o.id, o);
          return;
        }
      }
    });

    // 3. Garante que todos os orçamentos do cliente presentes no grupo estejam representados
    group.orcamentos.forEach((b) => {
      const bKey = b.orcamentoId || b.id;
      if (!clientBudgetsMap.has(bKey) && !Array.from(clientBudgetsMap.values()).some((o) => o.id === b.orcamentoId || o.id === b.id)) {
        clientBudgetsMap.set(bKey, {
          id: b.orcamentoId || b.id.replace('fup_', '') || `orc_${b.id}`,
          clientId: b.clientId || 'cli_geral',
          clientName: b.cliente,
          clientType: b.clientType || 'Cliente Final',
          clientContact: b.telefone || '',
          nomeOrcamento: b.nomeOrcamento || '',
          consultoraName: b.vendedor || currentUserName || 'Consultora Fênix',
          dataOrcamento: b.dataCriacao || new Date().toLocaleDateString('pt-BR'),
          observacoes: b.observacao || '',
          items: [],
          freteValor: 0,
          freteEndereco: '',
          descontoValor: 0,
          totalFinal: parseMonetaryValue(b.valor),
          status: (b.status as any) || 'Em aberto',
          savedAt: b.createdAt || new Date().toISOString(),
        });
      }
    });

    const clientBudgets = Array.from(clientBudgetsMap.values());
    const representativeFollowUp = group.orcamentos[0] || {
      id: `fup_temp_${group.clientKey}`,
      cliente: group.clientName,
      pedido: '',
      valor: group.totalValue,
      status: 'Orçamento Enviado',
      dataAtualizacao: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // REGRA 4 DO FOLLOW-UP:
    // Se o cliente tiver apenas 1 orçamento:
    // → abrir diretamente o orçamento.
    // Se tiver 2 ou mais:
    // → abrir a modal “Selecionar orçamento”.
    if (clientBudgets.length > 1) {
      setSelecionarOrcamentoData({
        followUp: representativeFollowUp,
        clientBudgets,
      });
      return;
    }

    const targetOrcamento = clientBudgets[0] || {
      id: representativeFollowUp.orcamentoId || representativeFollowUp.id.replace('fup_', '') || `orc_${Date.now()}`,
      clientId: representativeFollowUp.clientId || 'cli_geral',
      clientName: representativeFollowUp.cliente,
      clientType: representativeFollowUp.clientType || 'Cliente Final',
      clientContact: representativeFollowUp.telefone || '',
      nomeOrcamento: representativeFollowUp.nomeOrcamento || '',
      consultoraName: representativeFollowUp.vendedor || currentUserName || 'Consultora Fênix',
      dataOrcamento: representativeFollowUp.dataCriacao || new Date().toLocaleDateString('pt-BR'),
      observacoes: representativeFollowUp.observacao || '',
      items: [
        {
          id: `item_${Date.now()}`,
          qtd: '1',
          descricao: representativeFollowUp.nomeOrcamento || 'Item do Orçamento',
          unidade: 'un',
          precoUnitario: Number(representativeFollowUp.valor) || 0,
          total: Number(representativeFollowUp.valor) || 0,
        },
      ],
      freteValor: 0,
      freteEndereco: '',
      descontoValor: 0,
      totalFinal: Number(representativeFollowUp.valor) || 0,
      status: 'Em aberto' as OrcamentoStatus,
      savedAt: representativeFollowUp.createdAt || new Date().toISOString(),
    };

    // Mantém o vínculo persistido
    if (representativeFollowUp.id && !representativeFollowUp.id.startsWith('fup_temp_')) {
      if (!representativeFollowUp.orcamentoId || representativeFollowUp.orcamentoId !== targetOrcamento.id) {
        const updatedBudget: FollowUpItem = {
          ...representativeFollowUp,
          orcamentoId: targetOrcamento.id,
        };
        const updatedItems = items.map((it) => (it.id === representativeFollowUp.id ? updatedBudget : it));
        persistItems(updatedItems, updatedBudget);
      }
    }

    setViewingOrcamentoData({
      followUp: representativeFollowUp,
      clientBudgets: clientBudgets.length > 0 ? clientBudgets : [targetOrcamento],
      selectedOrcamento: targetOrcamento,
    });
  };

  // Handler para troca/seleção de orçamento vinculado
  const handleSelectLinkedOrcamento = (orc: SavedOrcamento, targetFollowUp: FollowUpItem) => {
    if (targetFollowUp.orcamentoId !== orc.id) {
      const updatedBudget: FollowUpItem = {
        ...targetFollowUp,
        orcamentoId: orc.id,
      };
      const updatedItems = items.map((it) => (it.id === targetFollowUp.id ? updatedBudget : it));
      persistItems(updatedItems, updatedBudget);
      targetFollowUp = updatedBudget;
    }

    setViewingOrcamentoData((prev) => {
      const clientBudgets =
        prev?.clientBudgets ||
        selecionarOrcamentoData?.clientBudgets || [orc];
      return {
        followUp: targetFollowUp,
        clientBudgets,
        selectedOrcamento: orc,
      };
    });
    setSelecionarOrcamentoData(null);
  };

  // Navega diretamente para o orçamento original no módulo Orçamentos sem criar ou duplicar nenhum registro
  const handleNavigateToOrcamento = (orc: SavedOrcamento) => {
    try {
      sessionStorage.setItem('fenix_target_orcamento_id', orc.id);
      sessionStorage.setItem('fenix_target_orcamento_client', orc.clientName);
    } catch {
      // ignore
    }
    setViewingOrcamentoData(null);
    if (onNavigateTab) {
      onNavigateTab('Orçamentos');
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6 font-sans">
      {/* Page Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-2xs">
            <PhoneCall className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091122] tracking-tight">
              Follow-up Comercial
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
              {activeSection === 'orcamentos'
                ? 'Acompanhamento de orçamentos por cliente e esteira comercial.'
                : 'Acompanhamento independente de clientes prospectados.'}
            </p>
          </div>
        </div>

        {/* Duas opções no topo: [ ORÇAMENTOS ] [ PROSPECÇÃO ] */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSection('orcamentos')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
              activeSection === 'orcamentos'
                ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Orçamentos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('prospeccao')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
              activeSection === 'prospeccao'
                ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Prospecção</span>
          </button>
        </div>
      </div>

      {activeSection === 'prospeccao' ? (
        <ProspeccaoView currentUserName={currentUserName} />
      ) : (
        <>
          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-4 rounded-2xl bg-white border border-blue-200 text-slate-800 shadow-md flex items-center gap-3.5 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">{toastMessage}</p>
            </div>
          )}

      {/* Visão da Diretoria: Separação por Responsável (Éder | Vanessa | Jhessica | demais usuários) */}
      {isDirector && (
        <ResponsibleFilterTabs
          activeTab={responsibleTab}
          onSelectTab={setResponsibleTab}
          counts={responsibleCounts}
          label="Follow-up por Responsável"
        />
      )}

      {/* REQ 6: SELETOR DE VISUALIZAÇÃO POR DIA E MÊS + INDICADORES TOTAL E PERSONALIZADO */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Alternador de Modo: Dia | Mês | Todos os Períodos */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 self-start">
            <button
              type="button"
              onClick={() => setPeriodMode('dia')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'dia'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Por Dia</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('mes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'mes'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Por Mês</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('todos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'todos'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todos os Períodos</span>
            </button>
          </div>

          {/* Controles de Navegação da Data / Mês */}
          {periodMode === 'dia' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-[#0052cc] outline-none shadow-2xs cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold transition-colors cursor-pointer"
              >
                Hoje
              </button>
            </div>
          )}

          {periodMode === 'mes' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const prevM = m === 1 ? 12 : m - 1;
                  const prevY = m === 1 ? y - 1 : y;
                  setSelectedMonth(`${prevY}-${String(prevM).padStart(2, '0')}`);
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-[#0052cc] outline-none shadow-2xs cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const nextM = m === 12 ? 1 : m + 1;
                  const nextY = m === 12 ? y + 1 : y;
                  setSelectedMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthStr)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold transition-colors cursor-pointer"
              >
                Mês Atual
              </button>
            </div>
          )}
        </div>

        {/* 1. CARDS DE RESUMO (4 CARDS OFICIAIS DO FOLLOW-UP) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-slate-100">
          {/* CARD 1: ORÇAMENTOS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Orçamentos
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {totalPeriodCount}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-xs">
                <span className="font-semibold text-slate-600">
                  {totalPeriodClientsCount} {totalPeriodClientsCount === 1 ? 'cliente único' : 'clientes únicos'}
                </span>
                <span className="font-bold text-[#0052cc]">
                  {formatCurrency(totalPeriodValor)} total
                </span>
              </div>
            </div>
          </div>

          {/* CARD 2: VENDAS FECHADAS */}
          <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-2xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-xs transition-shadow bg-gradient-to-br from-white via-white to-emerald-50/20">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Vendas Fechadas
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight leading-tight">
                {totalVendidoCount}
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100/70 flex flex-col gap-0.5 text-xs">
                <span className="font-semibold text-slate-600">
                  {totalVendidoClientsCount} {totalVendidoClientsCount === 1 ? 'cliente comprou' : 'clientes compraram'}
                </span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(totalVendidoValor)} vendido
                </span>
              </div>
            </div>
          </div>

          {/* CARD 3: TAXA DE FECHAMENTO */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Taxa de Fechamento
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight leading-tight">
                {totalPeriodCount > 0
                  ? `${((totalVendidoCount / totalPeriodCount) * 100).toFixed(1).replace('.', ',')}%`
                  : '0%'}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                conversão de orçamento em venda
              </div>
            </div>
          </div>

          {/* CARD 4: TICKET MÉDIO */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ticket Médio
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {formatCurrency(totalPeriodCount > 0 ? totalPeriodValor / totalPeriodCount : 0)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                Média por orçamento
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE FILTROS: STATUS DO ORÇAMENTO & SITUAÇÃO NA MESMA LINHA */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          {/* GRUPO 1: STATUS DO ORÇAMENTO */}
          <div className="flex flex-col md:flex-row md:items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex-shrink-0 whitespace-nowrap">
              Status do Orçamento:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar select-none">
              {(['Todos', ...STATUS_LIST] as FilterTab[]).map((tab) => {
                const isActive = activeTab === tab;
                const count = statusCounts[tab];

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      if (searchTerm) setSearchTerm('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                        : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10.5px] font-bold ${
                        isActive ? 'bg-[#003d99] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divisória Vertical sutil entre Status e Situação em telas grandes */}
          <div className="hidden xl:block w-[1px] h-7 bg-slate-200 flex-shrink-0" />

          {/* GRUPO 2: SITUAÇÃO (NA MESMA LINHA) */}
          <div className="flex flex-col md:flex-row md:items-center gap-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex-shrink-0 whitespace-nowrap">
                Situação:
              </span>
              {situacaoFilter !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setSituacaoFilter('todos')}
                  className="text-[10px] font-semibold text-slate-400 hover:text-[#0052cc] cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar select-none">
              <button
                type="button"
                onClick={() => setSituacaoFilter(situacaoFilter === 'atrasados' ? 'todos' : 'atrasados')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  situacaoFilter === 'atrasados'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50/80 shadow-2xs'
                }`}
                title="Orçamentos pendentes sem contato há 2 dias ou mais"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Atrasados</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10.5px] font-extrabold ${
                    situacaoFilter === 'atrasados' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {atrasadosCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSituacaoFilter(situacaoFilter === 'retornos_hoje' ? 'todos' : 'retornos_hoje')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  situacaoFilter === 'retornos_hoje'
                    ? 'bg-[#0052cc] text-white shadow-xs'
                    : 'bg-white border border-blue-200 text-[#0052cc] hover:bg-blue-50/80 shadow-2xs'
                }`}
                title="Retornos e orçamentos cadastrados hoje"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Retornos Hoje</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10.5px] font-extrabold ${
                    situacaoFilter === 'retornos_hoje' ? 'bg-[#003d99] text-white' : 'bg-blue-100 text-[#0052cc]'
                  }`}
                >
                  {retornosHojeCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Search Bar (GLOBAL Search) & Secondary Filters */}
      <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do cliente, produto, número de pedido ou telefone..."
              className="w-full h-10.5 pl-10 pr-9 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0052cc] rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end flex-shrink-0">
            <div className="flex items-center gap-2">
              {isGlobalSearching && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0052cc] border border-blue-200">
                  Busca global
                </span>
              )}
              <span>
                Exibindo <strong className="text-slate-900 font-bold">{filteredClientGroups.length}</strong>{' '}
                {filteredClientGroups.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>

            {(searchTerm || activeTab !== 'Todos' || situacaoFilter !== 'todos' || clientTypeFilter !== 'Todos' || valueFilter !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActiveTab('Todos');
                  setSituacaoFilter('todos');
                  setClientTypeFilter('Todos');
                  setValueFilter('todos');
                }}
                className="inline-flex items-center gap-1 font-semibold text-[#0052cc] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Linha de Filtros Secundários: Tipo de Cliente, Faixa de Valor, Ordenação */}
        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-slate-100 text-xs">
          {/* Tipo de Cliente */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Tipo:</span>
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="h-8.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0052cc]"
            >
              <option value="Todos">Todos os tipos</option>
              <option value="Construtora">Construtora</option>
              <option value="Residencial">Residencial</option>
              <option value="Comercial">Comercial</option>
              <option value="Revenda">Revenda</option>
              <option value="Arquiteto">Arquiteto</option>
              <option value="Instalador">Instalador</option>
              <option value="Engenheiro">Engenheiro</option>
              <option value="Cliente Final">Cliente Final</option>
            </select>
          </div>

          {/* Faixa de Valor */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Valor:</span>
            <select
              value={valueFilter}
              onChange={(e) => setValueFilter(e.target.value as any)}
              className="h-8.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0052cc]"
            >
              <option value="todos">Todos os valores</option>
              <option value="ate_5k">Até R$ 5.000</option>
              <option value="5k_15k">R$ 5.000 a R$ 15.000</option>
              <option value="acima_15k">Acima de R$ 15.000</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400 font-medium">Ordenar:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="h-8.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0052cc]"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="maior_valor">Maior valor</option>
              <option value="menor_valor">Menor valor</option>
              <option value="nome_az">Nome (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DO CLIENTE LIST:
          "Manter o Follow-up em CARDS, um único card por cliente.
          Se houver vários orçamentos do mesmo cliente, NÃO criar outro card. Manter todos no mesmo card.
          CARD DO CLIENTE: Mostrar somente:
          - ícone do tipo de cliente;
          - tipo de cliente;
          - nome do cliente;
          - quantidade de orçamentos;
          - valor total dos orçamentos.
          A cor do card deve corresponder ao tipo de cliente:
          Cliente Final azul, Revenda roxo, Construtora verde, Instalador laranja, Arquiteto lilás e Engenheiro azul.
          Não mostrar datas no resumo do cliente." */}
      {filteredClientGroups.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-2xs">
            <PhoneCall className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-[#091122]">Nenhum cliente no Follow-up</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Nenhum cliente ou orçamento corresponde ao termo pesquisado.'
              : 'Nenhum orçamento encontrado nesta categoria de status.'}
          </p>
          {(searchTerm || activeTab !== 'Todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveTab('Todos');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0052cc]" />
              <span>Ver todos os clientes</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClientGroups.map((group) => {
            const isExpanded = !!expandedClients[group.clientKey];
            const visual = getClientTypeVisual(group.clientType);
            const TypeIcon = visual.Icon;

            const hasHighlightedBudget = group.orcamentos.some((b) => b.id === highlightedCardId);

            return (
              <div
                key={group.clientKey}
                id={`fup_client_${group.clientKey}`}
                className={`rounded-[22px] sm:rounded-[26px] border ${visual.cardBorder} ${visual.cardBg} shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all overflow-hidden ${
                  hasHighlightedBudget ? 'ring-2 ring-[#0052cc] shadow-md' : ''
                }`}
              >
                {/* CABEÇALHO DO CARD DO CLIENTE (RESUMO):
                    Mostrar SOMENTE:
                    - ícone do tipo de cliente;
                    - tipo de cliente;
                    - nome do cliente;
                    - quantidade de orçamentos;
                    - valor total dos orçamentos.
                    NÃO mostrar datas no resumo do cliente! */}
                <div
                  onClick={() => toggleCard(group.clientKey)}
                  className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none ${visual.headerHover} transition-colors`}
                >
                  {/* Esquerda: Ícone do tipo + Tipo de cliente + Nome do cliente */}
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${visual.iconBg}`}>
                      <TypeIcon className="w-5 h-5 stroke-[2]" />
                    </div>

                    <div className="min-w-0">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${visual.badgeBg} mb-1`}>
                        {group.clientType}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#091122] tracking-tight truncate">
                        {group.clientName}
                      </h3>
                      {(() => {
                        const firstBudget = group.orcamentos[0];
                        const phone = resolveBudgetPhone(firstBudget, group.clientName);
                        if (!phone) return null;
                        return (
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-500">
                            <PhoneCall className="w-3.5 h-3.5 text-slate-400 stroke-[2] flex-shrink-0" />
                            <span className="truncate">{formatPhoneNumberDisplay(phone)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Direita: Contato rápido + Quantidade de orçamentos + Valor total dos orçamentos + Seta de expansão */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.06] flex-wrap">
                    {/* Botões de Contato Rápido no Header do Cliente */}
                    {(() => {
                      const firstBudget = group.orcamentos[0];
                      const clientPhone = resolveBudgetPhone(firstBudget);
                      const cleanDigits = clientPhone.replace(/\D/g, '');
                      let waLink: string | null = null;
                      if (cleanDigits) {
                        const template = getWhatsAppMessageTemplate('Follow-up de Orçamentos');
                        const msg = formatOrcamentoMessage(template, {
                          clientName: group.clientName,
                          totalFinal: group.totalValor,
                          consultoraName: firstBudget?.vendedor || currentUserName || 'Consultora Fênix',
                          numeroOrcamento: firstBudget?.nomeOrcamento || firstBudget?.pedido,
                        });
                        waLink = `https://wa.me/55${cleanDigits}?text=${encodeURIComponent(msg)}`;
                      }
                      const telLink = cleanDigits ? `tel:${cleanDigits}` : null;

                      if (!cleanDigits) return null;
                      return (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 px-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title={`Conversar no WhatsApp (${clientPhone})`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}
                          {telLink && (
                            <a
                              href={telLink}
                              className="h-8 px-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title={`Fazer Ligação (${clientPhone})`}
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-[#0052cc] stroke-[2.2]" />
                              <span className="hidden sm:inline">Ligação</span>
                            </a>
                          )}
                        </div>
                      );
                    })()}

                    {/* Botão Ver orçamento diretamente no Card do Follow-up */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOrcamentoForClientGroup(group);
                      }}
                      className="h-8.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer flex-shrink-0"
                      title={
                        group.orcamentos.length > 1
                          ? `Visualizar ou selecionar entre os ${group.orcamentos.length} orçamentos deste cliente`
                          : 'Visualizar espelho do orçamento deste follow-up'
                      }
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600 stroke-[2.2]" />
                      <span>Ver orçamento</span>
                    </button>

                    {/* Quantidade de orçamentos */}
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Orçamentos
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {group.orcamentosCount} {group.orcamentosCount === 1 ? 'orçamento' : 'orçamentos'}
                      </span>
                    </div>

                    {/* Valor total dos orçamentos */}
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Valor Total
                      </span>
                      <span className="text-base sm:text-lg font-black text-[#091122]">
                        {formatCurrency(group.totalValue)}
                      </span>
                    </div>

                    {/* Seta de expansão com animação */}
                    <div
                      className={`w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-2xs border border-black/[0.05] ${
                        isExpanded ? 'rotate-180 bg-white text-[#0052cc]' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* ÁREA EXPANDIDA DO CARD:
                    "Ao expandir o card, mostrar cada orçamento separadamente com:
                    - nome dado ao orçamento;
                    - valor;
                    - Cadastro;
                    - Última Atualização;
                    - Status com seta." */}
                {isExpanded && (
                  <div className="border-t border-black/[0.06] bg-white/40 p-4 sm:p-6 space-y-3 animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                      Orçamentos deste Cliente ({group.orcamentos.length})
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {group.orcamentos.map((budget) => {
                        const statusBadgeClass = getStatusBadgeStyle(budget.status);
                        const isAtrasado = isFollowUpAtrasado(budget);
                        const isRetornoHoje = isFollowUpRetornoHoje(budget);

                        return (
                          <div
                            key={budget.id}
                            id={`fup_card_${budget.id}`}
                            className={`bg-white rounded-2xl border p-4 sm:p-4.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                              highlightedCardId === budget.id
                                ? 'border-[#0052cc] ring-4 ring-[#0052cc]/40 bg-blue-50/70 scale-[1.015] shadow-lg'
                                : 'border-slate-200/90 hover:border-slate-300'
                            }`}
                          >
                            {/* 1. Nome dado ao orçamento */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm sm:text-base font-bold text-[#091122] truncate">
                                  {budget.nomeOrcamento || budget.produto || 'Orçamento de Materiais'}
                                </h4>
                                {highlightedCardId === budget.id && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0052cc] text-white text-[10px] font-bold shadow-xs animate-pulse">
                                    ★ Follow-up Selecionado
                                  </span>
                                )}
                                {isAtrasado && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shadow-2xs"
                                    title="Prazo de 2 dias úteis ultrapassado sem resolução — Atrasado"
                                  >
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Atrasado
                                  </span>
                                )}
                                {isRetornoHoje && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#0052cc] text-[10px] font-bold shadow-2xs"
                                    title="Ciclo de 2 dias úteis vence hoje — requer contato hoje"
                                  >
                                    <Calendar className="w-3 h-3 text-[#0052cc]" />
                                    Retorno Hoje
                                  </span>
                                )}
                              </div>
                              {budget.produto && budget.nomeOrcamento && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {budget.produto}
                                </p>
                              )}

                              {/* Follow-up "Vendido": Pedido, Pagamento e Parcelas, mantendo campos editáveis */}
                              {budget.status === 'Vendido' && (
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenStatusModal(budget, e)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 text-emerald-900 text-xs font-bold transition-colors shadow-2xs cursor-pointer group"
                                    title="Clique para editar número do pedido, pagamento ou parcelas"
                                  >
                                    <span>Pedido #{budget.pedido || '—'}</span>
                                    <Pencil className="w-2.5 h-2.5 text-emerald-600 group-hover:text-emerald-800 transition-colors" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenStatusModal(budget, e)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors shadow-2xs cursor-pointer group"
                                    title="Clique para editar forma de pagamento ou parcelas"
                                  >
                                    <span>
                                      {budget.formaPagamento || 'Pix'}
                                      {budget.parcelas && budget.formaPagamento === 'Cartão'
                                        ? ` (${budget.parcelas})`
                                        : ''}
                                    </span>
                                    <Pencil className="w-2.5 h-2.5 text-emerald-600 group-hover:text-emerald-800 transition-colors" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 2. Valor */}
                            <div className="flex-shrink-0 md:text-right min-w-[120px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Valor
                              </span>
                              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                                {formatCurrency(budget.valor)}
                              </span>
                            </div>

                            {/* 3. Cadastro */}
                            <div className="flex-shrink-0 md:text-right min-w-[100px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Cadastro
                              </span>
                              <span className="text-xs font-semibold text-slate-600 flex items-center md:justify-end gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDateOnly(budget.dataCriacao || budget.createdAt)}</span>
                              </span>
                            </div>

                            {/* 4. Última Atualização - Somente data, sem horário */}
                            <div className="flex-shrink-0 md:text-right min-w-[110px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Última Atualização
                              </span>
                              <span className="text-xs font-semibold text-slate-600 flex items-center md:justify-end gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDateOnly(budget.dataAtualizacao)}</span>
                              </span>
                            </div>

                            {/* 5. Ações de Contato: WhatsApp e Ligação */}
                            {(() => {
                              const budgetPhone = resolveBudgetPhone(budget);
                              const cleanDigits = budgetPhone.replace(/\D/g, '');
                              let waUrl: string | null = null;
                              if (cleanDigits) {
                                const template = getWhatsAppMessageTemplate('Follow-up de Orçamentos');
                                const msg = formatOrcamentoMessage(template, {
                                  clientName: budget.cliente,
                                  totalFinal: Number(budget.valor) || 0,
                                  consultoraName: budget.vendedor || currentUserName || 'Consultora Fênix',
                                  numeroOrcamento: budget.nomeOrcamento || budget.pedido,
                                });
                                waUrl = `https://wa.me/55${cleanDigits}?text=${encodeURIComponent(msg)}`;
                              }
                              const telUrl = cleanDigits ? `tel:${cleanDigits}` : null;

                              return (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {waUrl ? (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRegistrarContato(budget, 'WhatsApp');
                                      }}
                                      className="h-8.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                      title={`Conversar no WhatsApp (${budgetPhone}) — inicia novo ciclo de 2 dias úteis`}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
                                      <span>WhatsApp</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showToast('Cliente sem telefone cadastrado.');
                                      }}
                                      className="h-8.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60"
                                      title="Telefone não informado"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>WhatsApp</span>
                                    </button>
                                  )}

                                  {telUrl ? (
                                    <a
                                      href={telUrl}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRegistrarContato(budget, 'Ligação');
                                      }}
                                      className="h-8.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                      title={`Fazer Ligação (${budgetPhone}) — inicia novo ciclo de 2 dias úteis`}
                                    >
                                      <PhoneCall className="w-3.5 h-3.5 text-[#0052cc] stroke-[2.2]" />
                                      <span>Ligação</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showToast('Cliente sem telefone cadastrado.');
                                      }}
                                      className="h-8.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60"
                                      title="Telefone não informado"
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                      <span>Ligação</span>
                                    </button>
                                  )}

                                  {/* Regra 5: Botão direto para registrar contato e iniciar novo ciclo de 2 dias úteis */}
                                  {budget.status !== 'Vendido' && budget.status !== 'Perdido' && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleRegistrarContato(budget, 'Contato', e)}
                                      className="h-8.5 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                      title="Registrar que entrou em contato com o cliente e iniciar novo ciclo de 2 dias úteis"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-slate-500 stroke-[2.2]" />
                                      <span>Novo Ciclo (2d)</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 6. Botão Ver orçamento vinculado diretamente no card */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenOrcamentoFromFollowUp(budget);
                              }}
                              className="h-8.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer flex-shrink-0"
                              title="Visualizar espelho do orçamento oficial"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600 stroke-[2.2]" />
                              <span>Ver orçamento</span>
                            </button>

                            {/* 7. Status com seta (Botão interativo para alterar o status) */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleOpenStatusModal(budget, e)}
                                title="Clique para alterar o status deste orçamento"
                                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer hover:shadow-2xs active:scale-95 ${statusBadgeClass}`}
                              >
                                <span>{budget.status}</span>
                                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>

                              {/* Lembretes a cada 2 dias: Ativar/Desativar individualmente */}
                              {budget.status !== 'Vendido' && budget.status !== 'Perdido' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleLembretes(budget, e)}
                                  title={
                                    budget.lembretesAtivos === false
                                      ? 'Lembretes desativados neste Follow-up. Clique para ativar lembretes no sino a cada 2 dias.'
                                      : 'Lembrete no sino ativo a cada 2 dias. Clique para desativar.'
                                  }
                                  className={`h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    budget.lembretesAtivos === false
                                      ? 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                      : 'border-blue-200 bg-blue-50 text-[#0052cc] hover:bg-blue-100 shadow-2xs'
                                  }`}
                                >
                                  {budget.lembretesAtivos === false ? (
                                    <>
                                      <BellOff className="w-3.5 h-3.5" />
                                      <span className="hidden xl:inline text-[11px]">Sem aviso</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bell className="w-3.5 h-3.5 text-[#0052cc]" />
                                      <span className="hidden xl:inline text-[11px]">2 Dias</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Botão sutil para ver histórico de anotações daquele orçamento */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingHistoryBudget(budget);
                                }}
                                title="Ver histórico deste orçamento"
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ALTERAR STATUS DO ORÇAMENTO:
          "Ao alterar o status, abrir uma caixa pequena para adicionar um comentário.
          O comentário é OPCIONAL: deve ser possível salvar a alteração sem escrever comentário.
          Ao salvar:
          - atualizar o status;
          - atualizar automaticamente a Última Atualização;
          - se houver comentário, salvar;
          - registrar no histórico do orçamento." */}
      {/* MODAL: ALTERAR STATUS DO ORÇAMENTO (DESIGN PROFISSIONAL E MODERNO FÊNIX WORLD) */}
      {transitioningBudget && (() => {
        const linkedOrc = getAllSavedOrcamentos().find(
          (o) =>
            (transitioningBudget.orcamentoId && o.id === transitioningBudget.orcamentoId) ||
            o.id === transitioningBudget.id.replace('fup_', '') ||
            o.id === transitioningBudget.id
        );
        const freteNum = (linkedOrc?.freteAtivo && linkedOrc?.freteValor)
          ? Number(linkedOrc.freteValor)
          : Number(transitioningBudget.frete) || 0;
        const produtosValor = freteNum > 0
          ? Math.max(0, Number(transitioningBudget.valor) - freteNum)
          : Number(transitioningBudget.valor);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden text-slate-800">
              {/* Cabeçalho Fixo Moderno */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50/70">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0B2046] to-[#0052cc] text-white flex items-center justify-center shadow-xs flex-shrink-0 ring-4 ring-blue-500/10">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-[#091122] tracking-tight">Atualizar Status</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {transitioningBudget.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {transitioningBudget.cliente} •{' '}
                      <strong className="text-[#0052cc] font-bold">
                        {formatCurrency(transitioningBudget.valor)}
                      </strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTransitioningBudget(null)}
                  className="w-8.5 h-8.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo com Scroll Interno */}
              <div className="overflow-y-auto px-6 py-5 space-y-4.5 flex-1 overscroll-contain custom-scrollbar">
                {/* 1. Card Resumo do Orçamento & Totais */}
                <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Proposta / Orçamento Vinculado
                      </span>
                      <span className="font-bold text-slate-900 text-sm truncate block mt-0.5">
                        {transitioningBudget.nomeOrcamento || transitioningBudget.produto || 'Orçamento Comercial'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Cliente: <strong className="text-slate-700">{transitioningBudget.cliente}</strong>
                      </span>
                    </div>
                    <div className="sm:text-right flex-shrink-0 bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200/60">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block sm:text-right">
                        Valor Total da Venda
                      </span>
                      <span className="font-black text-[#0052cc] text-lg sm:text-xl block sm:text-right">
                        {formatCurrency(transitioningBudget.valor)}
                      </span>
                      {freteNum > 0 && (
                        <span className="text-[10.5px] text-emerald-700 font-bold block sm:text-right mt-0.5">
                          Produtos: {formatCurrency(produtosValor)} • Frete: {formatCurrency(freteNum)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Seletor dos 5 Status Específicos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      Selecione o Novo Status
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Clique para alterar
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {[
                      { label: 'Enviado', value: 'Orçamento Enviado' as FollowUpStatus, icon: Send, color: 'blue' },
                      { label: 'Aguardando', value: 'Aguardando Retorno' as FollowUpStatus, icon: Clock, color: 'amber' },
                      { label: 'Negociando', value: 'Negociando' as FollowUpStatus, icon: MessageCircle, color: 'purple' },
                      { label: 'Vendido', value: 'Vendido' as FollowUpStatus, icon: CheckCircle2, color: 'emerald', special: true },
                      { label: 'Perdido', value: 'Perdido' as FollowUpStatus, icon: X, color: 'rose' },
                    ].map((st) => {
                      const isSelected = selectedNewStatus === st.value;
                      const IconComp = st.icon;
                      return (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => {
                            setSelectedNewStatus(st.value);
                            if (statusError) setStatusError('');
                          }}
                          className={`p-3 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border text-center ${
                            isSelected
                              ? st.value === 'Vendido'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/25 scale-[1.02]'
                                : st.value === 'Perdido'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/25 scale-[1.02]'
                                : st.value === 'Negociando'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-500/25 scale-[1.02]'
                                : st.value === 'Aguardando Retorno'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/25 scale-[1.02]'
                                : 'bg-[#0052cc] text-white border-[#0052cc] shadow-md ring-2 ring-blue-500/25 scale-[1.02]'
                              : st.value === 'Vendido'
                              ? 'bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 border-emerald-200/80 shadow-2xs'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <IconComp className={`w-4 h-4 ${isSelected ? 'text-white' : ''}`} />
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className="truncate w-full">{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Seção Estruturada de Venda Fechada (VENDIDO) */}
                {selectedNewStatus === 'Vendido' && (
                  <div className="space-y-4 p-4.5 bg-gradient-to-br from-emerald-50/80 via-emerald-50/30 to-white border border-emerald-200/90 rounded-2xl shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-emerald-200/70 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                            Dados de Fechamento da Venda
                          </span>
                          <span className="text-[10px] text-emerald-700">
                            Preencha o pedido e formas de pagamento
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                        Metas & Pós-Vendas
                      </span>
                    </div>

                    {/* Número do Pedido */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-950 mb-1.5">
                        Número do Pedido <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoFocus
                          value={numeroPedidoInput}
                          onChange={(e) => {
                            setNumeroPedidoInput(e.target.value.replace(/^#+/, ''));
                            if (pedidoError) setPedidoError('');
                          }}
                          placeholder="Ex: 1052"
                          className="w-full h-11 pl-10 pr-4 bg-white border border-emerald-300/90 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-sm font-bold text-slate-900 outline-none transition-all shadow-2xs"
                        />
                      </div>
                      <span className="text-[10.5px] text-emerald-800/80 mt-1 block">
                        Apenas os dígitos do pedido (sem caracteres especiais).
                      </span>
                      {pedidoError && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{pedidoError}</span>
                        </p>
                      )}
                    </div>

                    {/* Formas de Pagamento */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-950 mb-1.5 uppercase tracking-wider">
                        Formas e Condições de Pagamento
                      </label>
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200/70 shadow-2xs">
                        <PaymentSplitManager
                          totalVenda={Number(transitioningBudget.valor) || 0}
                          payments={statusPayments}
                          onChange={setStatusPayments}
                          compact={true}
                        />
                      </div>
                    </div>

                    {/* Resumo e Confirmação de Totais */}
                    <div className="text-xs text-emerald-950 bg-white/95 p-3.5 rounded-xl border border-emerald-200/90 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                        <span className="text-slate-600 font-medium">Cliente:</span>
                        <span className="font-bold text-slate-900">{transitioningBudget.cliente}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                        <span className="text-slate-600 font-medium">Valor Total Fechado:</span>
                        <span className="font-black text-emerald-800 text-sm">{formatCurrency(transitioningBudget.valor)}</span>
                      </div>
                      {freteNum > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-emerald-100 pb-1.5">
                          <span>Produtos: {formatCurrency(produtosValor)}</span>
                          <span>Frete: {formatCurrency(freteNum)} (não entra na Meta)</span>
                        </div>
                      )}
                      <p className="text-[11px] text-emerald-700 pt-0.5">
                        ✓ O valor dos produtos será creditado nas Metas do mês e integrado automaticamente na esteira de Pós-Vendas.
                      </p>
                    </div>
                  </div>
                )}

                {/* Alerta de erro */}
                {statusError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-2xs">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
                    <span>{statusError}</span>
                  </div>
                )}

                {/* Comentário da Atualização (Opcional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Comentário / Observação <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={statusComment}
                    onChange={(e) => {
                      setStatusComment(e.target.value);
                      if (statusError) setStatusError('');
                    }}
                    placeholder="Observação rápida sobre este contato ou negociação..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#0052cc] focus:bg-white rounded-xl text-xs text-slate-800 outline-none transition-all shadow-2xs resize-none"
                  />
                </div>
              </div>

              {/* Rodapé Fixo */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setTransitioningBudget(null)}
                  className="h-10 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatusChange}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#0B2046] to-[#0052cc] hover:from-[#081733] hover:to-[#0041a8] text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Atualização</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: HISTÓRICO DO ORÇAMENTO */}
      {viewingHistoryBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#091122]">Histórico do Orçamento</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingHistoryBudget.cliente}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistoryBudget(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Linha do Tempo */}
            <div className="overflow-y-auto flex-1 custom-scrollbar space-y-3 pr-1">
              {!viewingHistoryBudget.historico || viewingHistoryBudget.historico.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhum registro histórico adicional.
                </p>
              ) : (
                viewingHistoryBudget.historico.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-[#0052cc]">{entry.novoStatus}</span>
                      <span>
                        {entry.data} às {entry.hora}
                      </span>
                    </div>
                    {entry.observacao && (
                      <p className="text-slate-700 font-medium">{entry.observacao}</p>
                    )}
                    {entry.usuario && (
                      <p className="text-[10px] text-slate-400">Por: {entry.usuario}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewingHistoryBudget(null)}
                className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Visualizar Orçamento Completo Vinculado */}
      {viewingOrcamentoData && (
        <ModalVerOrcamentoFollowUp
          followUp={viewingOrcamentoData.followUp}
          clientBudgets={viewingOrcamentoData.clientBudgets}
          selectedOrcamento={viewingOrcamentoData.selectedOrcamento}
          onSelectOrcamento={(orc) =>
            handleSelectLinkedOrcamento(orc, viewingOrcamentoData.followUp)
          }
          onNavigateToOrcamento={(orc, mode) => {
            sessionStorage.setItem('fenix_target_orcamento_id', orc.id);
            sessionStorage.setItem('fenix_target_orcamento_action', mode || 'view_espelho');
            setViewingOrcamentoData(null);
            if (mode === 'edit') {
              if (onOpenOrcamento) {
                onOpenOrcamento(orc);
              } else if (onNavigateTab) {
                onNavigateTab('Orçamentos');
              } else {
                window.dispatchEvent(
                  new CustomEvent('fenix_navigate_tab', {
                    detail: { tab: 'Orçamentos', orcamento: orc, mode: 'edit' },
                  })
                );
              }
            } else {
              if (onNavigateTab) {
                onNavigateTab('Orçamentos');
              } else {
                window.dispatchEvent(
                  new CustomEvent('fenix_navigate_tab', {
                    detail: { tab: 'Orçamentos', orcamento: orc, mode: 'view' },
                  })
                );
              }
            }
          }}
          onClose={() => setViewingOrcamentoData(null)}
          showToast={showToast}
        />
      )}

      {/* MODAL 2: Selecionar entre múltiplos orçamentos do cliente */}
      {selecionarOrcamentoData && (
        <ModalSelecionarOrcamentoFollowUp
          followUp={selecionarOrcamentoData.followUp}
          clientBudgets={selecionarOrcamentoData.clientBudgets}
          onSelect={(orc) =>
            handleSelectLinkedOrcamento(orc, selecionarOrcamentoData.followUp)
          }
          onClose={() => setSelecionarOrcamentoData(null)}
        />
      )}

      {/* MODAL 3: Aviso claro quando não houver orçamento vinculado */}
      {semOrcamentoFollowUp && (
        <ModalSemOrcamentoVinculado
          followUp={semOrcamentoFollowUp}
          onClose={() => setSemOrcamentoFollowUp(null)}
          onGoToOrcamentos={onNavigateTab ? () => onNavigateTab('Orçamentos') : undefined}
        />
      )}
        </>
      )}
    </div>
  );
};
