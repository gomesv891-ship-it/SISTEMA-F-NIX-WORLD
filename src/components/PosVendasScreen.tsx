import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  HeartHandshake,
  Search,
  Calendar,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  MoreVertical,
  X,
  Check,
  ClipboardList,
  Wrench,
  ThumbsUp,
  User,
  ShieldCheck,
  Edit3,
  PhoneCall,
  Store,
  Building2,
  PenTool,
  HardHat,
  LayoutGrid,
  List,
  DollarSign,
  Tag,
  Trash2,
  Truck,
  Package,
  History,
  TrendingUp,
  HelpCircle,
  Send,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  PosVendaItem,
  PosVendaStatus,
  PosVendaTipo,
  ClientRecord,
  PosVendaHistoricoItem,
} from '../types';
import { syncPosVendasDatabase } from '../utils/syncPosVendas';
import { isRecordOfResponsible, getSellerIdForUser } from '../utils/userDataFilter';
import { getUserIdByName } from '../utils/auth';
import { ResponsibleFilterTabs } from './ResponsibleFilterTabs';
import {
  saveItemToSupabase,
  deleteItemFromSupabase,
  saveWholeCollectionToSupabase,
} from '../utils/supabaseClient';
import {
  getWhatsAppMessageTemplate,
  formatWhatsAppMessage,
} from '../utils/configOrcamentoEMetas';

// Cores e Ícones específicos por Tipo de Cliente (Idêntico ao Follow-up)
export const getClientTypeVisual = (type?: string) => {
  switch (type) {
    case 'Cliente Final':
    case 'Consumidor Final':
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

export const formatCurrencyBRL = (val?: number) => {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return '';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDateBR = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {}
  return dateStr;
};

export const formatDateTimeBR = (isoStr?: string) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return isoStr;
  }
};

interface PosVendasScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

// 8 STATUS OFICIAIS EXIGIDOS
export const OFFICIAL_STATUS_CONFIG: Record<
  PosVendaStatus | string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dotBg: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  'Aguardando Entrega': {
    label: 'Aguardando Entrega',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dotBg: 'bg-amber-500',
    icon: Truck,
  },
  'Aguardando Confirmação': {
    label: 'Aguardando Confirmação',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dotBg: 'bg-sky-500',
    icon: Clock,
  },
  'Aguardando Contato': {
    label: 'Aguardando Contato',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dotBg: 'bg-yellow-500',
    icon: PhoneCall,
  },
  'Aguardando Retorno': {
    label: 'Aguardando Retorno',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dotBg: 'bg-purple-500',
    icon: Clock,
  },
  'Instalador Indicado': {
    label: 'Instalador Indicado',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dotBg: 'bg-blue-500',
    icon: Wrench,
  },
  'Aguardando Pós-Instalação': {
    label: 'Aguardando Pós-Instalação',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    dotBg: 'bg-indigo-500',
    icon: ShieldCheck,
  },
  'Pronto para Finalizar': {
    label: 'Pronto para Finalizar',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dotBg: 'bg-teal-500',
    icon: CheckCircle2,
  },
  'Finalizado': {
    label: 'Finalizado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dotBg: 'bg-emerald-600',
    icon: CheckCircle2,
  },
  // Legados mapeados
  'Vendido': {
    label: 'Aguardando Entrega',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dotBg: 'bg-amber-500',
    icon: Truck,
  },
  'Instalação Pendente': {
    label: 'Instalador Indicado',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dotBg: 'bg-blue-500',
    icon: Wrench,
  },
  'Vistoria Agendada': {
    label: 'Aguardando Confirmação',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dotBg: 'bg-sky-500',
    icon: Clock,
  },
  'Assistência Aberta': {
    label: 'Aguardando Retorno',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dotBg: 'bg-rose-500',
    icon: AlertTriangle,
  },
  'Finalizado / Satisfeito': {
    label: 'Finalizado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dotBg: 'bg-emerald-600',
    icon: CheckCircle2,
  },
};

export const OFFICIAL_STATUS_LIST: PosVendaStatus[] = [
  'Aguardando Entrega',
  'Aguardando Confirmação',
  'Aguardando Contato',
  'Aguardando Retorno',
  'Instalador Indicado',
  'Aguardando Pós-Instalação',
  'Pronto para Finalizar',
  'Finalizado',
];

export type FilterPill =
  | 'Todos'
  | 'Recebimentos Pendentes'
  | 'Aguardando Entrega'
  | 'Aguardando Retorno'
  | 'Instalador Indicado'
  | 'Pronto para Finalizar'
  | 'Finalizados';

export const STATUS_RECEBIMENTO_LIST = [
  'Aguardando',
  'Realizado',
  'Realizado com divergência',
  'Material faltante',
  'Material danificado',
  'Cliente ainda não retirou / recebeu',
] as const;

export const isRecordFinalized = (item: PosVendaItem): boolean => {
  return item.status === 'Finalizado' || item.status === 'Finalizado / Satisfeito';
};

/**
 * Normaliza e consolida dados de recebimento do pedido (Entrega ou Retirada)
 */
export const getRecebimentoInfo = (item: PosVendaItem) => {
  const forma: 'Entrega' | 'Retirada' =
    item.formaRecebimento === 'Retirada' ? 'Retirada' : 'Entrega';
  const isRetirada = forma === 'Retirada';

  const dataPrevista = isRetirada
    ? item.dataPrevisaoRetirada || item.dataPrevisaoEntrega || item.completionDate
    : item.dataPrevisaoEntrega || item.completionDate;

  const dataRealizada = isRetirada
    ? item.dataRetirada || item.dataRecebimento
    : item.dataEntrega || item.dataRecebimento;

  const statusRaw =
    (isRetirada
      ? item.statusRetirada || item.statusEntrega
      : item.statusEntrega || item.statusRetirada) || 'Aguardando';

  const observacao = isRetirada
    ? item.observacaoRetirada || item.observacaoEntrega
    : item.observacaoEntrega || item.observacaoRetirada;

  // Formatação amigável e contextual conforme exemplos do usuário:
  // "RECEBIMENTO: Retirada / Status: Aguardando Retirada" OU "RECEBIMENTO: Entrega / Status: Recebido"
  let displayStatus = statusRaw;
  if (statusRaw === 'Aguardando') {
    displayStatus = isRetirada ? 'Aguardando Retirada' : 'Aguardando Entrega';
  } else if (statusRaw === 'Realizado') {
    displayStatus = isRetirada ? 'Retirado' : 'Recebido';
  } else if (statusRaw === 'Entregue') {
    displayStatus = 'Recebido';
  } else if (statusRaw === 'Pendente') {
    displayStatus = isRetirada ? 'Aguardando Retirada' : 'Aguardando Entrega';
  } else if (statusRaw === 'Cliente ainda não retirou / recebeu') {
    displayStatus = isRetirada ? 'Cliente ainda não retirou' : 'Cliente ainda não recebeu';
  }

  let badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  if (
    statusRaw === 'Realizado' ||
    statusRaw === 'Entregue' ||
    displayStatus === 'Recebido' ||
    displayStatus === 'Retirado'
  ) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (
    statusRaw === 'Realizado com divergência' ||
    statusRaw === 'Material faltante' ||
    statusRaw === 'Material danificado'
  ) {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (
    statusRaw === 'Cliente ainda não retirou / recebeu' ||
    statusRaw === 'Atrasada'
  ) {
    badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
  }

  return {
    forma,
    isRetirada,
    dataPrevista,
    dataRealizada,
    statusRaw,
    displayStatus,
    observacao,
    badgeColor,
  };
};

/**
 * Verifica se o pós-venda possui recebimento pendente (considera tanto ENTREGA quanto RETIRADA)
 */
export const isRecebimentoPendente = (item: PosVendaItem): boolean => {
  if (isRecordFinalized(item)) return false;

  const { statusRaw, dataRealizada, isRetirada } = getRecebimentoInfo(item);

  // Se já foi realizado / entregue / retirado com data confirmada ou cliente confirmou material
  if (
    (statusRaw === 'Realizado' || statusRaw === 'Entregue') &&
    (dataRealizada || item.clienteRecebeuMaterial === 'Sim')
  ) {
    return false;
  }

  if (
    statusRaw === 'Aguardando' ||
    statusRaw === 'Pendente' ||
    statusRaw === 'Em Trânsito' ||
    statusRaw === 'Atrasada' ||
    statusRaw === 'Cliente ainda não retirou / recebeu' ||
    statusRaw === 'Material faltante' ||
    statusRaw === 'Material danificado' ||
    item.status === 'Aguardando Entrega' ||
    item.clienteRecebeuMaterial === 'Não' ||
    (!dataRealizada && item.clienteRecebeuMaterial !== 'Sim')
  ) {
    return true;
  }

  return false;
};

export const PosVendasScreen: React.FC<PosVendasScreenProps> = ({
  currentUserName = 'Vinicius Gestor',
  onBackToCadastro,
  onNavigateTab,
}) => {
  // State: list of records
  const [records, setRecords] = useState<PosVendaItem[]>(() => {
    try {
      const stored = localStorage.getItem('fenix_pos_vendas_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: PosVendaItem) => ({
            ...item,
            orderNumber: (item.orderNumber || '').replace(/#/g, ''),
          }));
        }
      }
    } catch {}
    return [];
  });

  // Clients from CRM for dropdown
  const [registeredClients, setRegisteredClients] = useState<ClientRecord[]>([]);

  // Search & Filter pills
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterPill>('Todos');

  // Responsável filter for Diretor Éder Perez
  const isDirector = (currentUserName || '').toLowerCase().includes('eder');
  const [responsibleTab, setResponsibleTab] = useState<string>('Todos');

  // Modo de Visualização: 'cards' ou 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Interactive inline status dropdown
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Actions menu dropdown (•••)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Pagination (7 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Modals
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<PosVendaItem | null>(null);
  const [finalizingRecord, setFinalizingRecord] = useState<PosVendaItem | null>(null);
  const [finalizacaoObs, setFinalizacaoObs] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<PosVendaItem | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // Form State for "+ Novo Registro"
  const [formPedido, setFormPedido] = useState('');
  const [formCliente, setFormCliente] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formProjeto, setFormProjeto] = useState('');
  const [formFormaRecebimento, setFormFormaRecebimento] = useState<'Entrega' | 'Retirada'>('Entrega');
  const [formDataPrevista, setFormDataPrevista] = useState('');
  const [formStatusRecebimento, setFormStatusRecebimento] = useState<string>('Aguardando');
  const [formPrecisaInstalador, setFormPrecisaInstalador] = useState<'Sim' | 'Não' | 'Já possui instalador'>('Não');
  const [formNomeInstalador, setFormNomeInstalador] = useState('');
  const [formDataIndicacao, setFormDataIndicacao] = useState('');
  const [formStatusInicial, setFormStatusInicial] = useState<PosVendaStatus>('Aguardando Entrega');
  const [formObservacao, setFormObservacao] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save to localStorage whenever records change
  useEffect(() => {
    try {
      localStorage.setItem('fenix_pos_vendas_db', JSON.stringify(records));
    } catch {}
  }, [records]);

  // Load clients from CRM and listen to pos-vendas updates from Follow-up and Metas
  useEffect(() => {
    const loadStoredRecords = () => {
      if (isInternalUpdateRef.current) return;

      try {
        const stored = localStorage.getItem('fenix_pos_vendas_db');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecords((prev) => {
              if (JSON.stringify(prev) === stored) return prev;
              return parsed;
            });
            return;
          }
        }
        const synced = syncPosVendasDatabase();
        if (synced && synced.length > 0) {
          setRecords((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(synced)) return prev;
            return synced;
          });
        }
      } catch {}
    };

    loadStoredRecords();

    window.addEventListener('fenix_pos_vendas_updated', loadStoredRecords);
    window.addEventListener('fenix_metas_updated', loadStoredRecords);
    window.addEventListener('fenix_followup_updated', loadStoredRecords);
    window.addEventListener('storage', loadStoredRecords);

    try {
      const storedClients = localStorage.getItem('fenix_clients_db');
      if (storedClients) {
        setRegisteredClients(JSON.parse(storedClients));
      }
    } catch {}

    return () => {
      window.removeEventListener('fenix_pos_vendas_updated', loadStoredRecords);
      window.removeEventListener('fenix_metas_updated', loadStoredRecords);
      window.removeEventListener('fenix_followup_updated', loadStoredRecords);
      window.removeEventListener('storage', loadStoredRecords);
    };
  }, []);

  // Close open dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-posvenda-dropdown="true"]')) {
        setOpenStatusDropdownId(null);
      }
      if (!target.closest('[data-posvenda-action-menu="true"]')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null), 3500;
    }, 3500);
  };

  // Helper to persist single record update in local and remote
  const persistRecordUpdate = async (
    updatedItem: PosVendaItem,
    historyAction?: string,
    historyDetails?: string
  ) => {
    isInternalUpdateRef.current = true;
    const now = new Date().toISOString();

    let fullItem: PosVendaItem = {
      ...updatedItem,
      updatedAt: now,
    };

    if (historyAction) {
      const histItem: PosVendaHistoricoItem = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        dataHora: now,
        usuario: currentUserName || 'Usuário Fênix',
        acao: historyAction,
        detalhes: historyDetails,
      };
      fullItem.historico = [histItem, ...(fullItem.historico || [])];
    }

    setRecords((prev) => {
      const nextList = prev.map((item) => (item.id === fullItem.id ? fullItem : item));
      localStorage.setItem('fenix_pos_vendas_db', JSON.stringify(nextList));
      return nextList;
    });

    if (viewingRecord && viewingRecord.id === fullItem.id) {
      setViewingRecord(fullItem);
    }

    try {
      await saveItemToSupabase('fenix_pos_vendas_db', fullItem, 'id', currentUserName);
    } catch (err) {
      console.warn('Falha silenciosa ao salvar pós-venda no Supabase:', err);
    }

    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 250);

    return fullItem;
  };

  // Status Change Handler
  const handleStatusChange = async (item: PosVendaItem, newStatus: PosVendaStatus) => {
    setOpenStatusDropdownId(null);
    if (item.status === newStatus) return;

    if (newStatus === 'Finalizado') {
      setFinalizingRecord(item);
      setFinalizacaoObs('');
      return;
    }

    await persistRecordUpdate(
      { ...item, status: newStatus },
      `Status alterado para "${newStatus}"`
    );
    showToast(`✓ Status alterado para "${newStatus}".`);
  };

  // Finalização oficial de Pós-Venda
  // REGRA PRINCIPAL: Assim que for finalizado, o Pós-Venda deve SUMIR IMEDIATAMENTE DA LISTA PRINCIPAL ('Todos').
  const handleConfirmFinalizacao = async () => {
    if (!finalizingRecord) return;
    const target = finalizingRecord;
    const now = new Date().toISOString();

    const finalizedItem: PosVendaItem = {
      ...target,
      status: 'Finalizado',
      finalizadoEm: now,
      finalizadoPor: currentUserName || 'Usuário Fênix',
      observacaoFinal: finalizacaoObs.trim() || 'Acompanhamento encerrado e finalizado com sucesso.',
    };

    await persistRecordUpdate(
      finalizedItem,
      'Finalizar Pós-Venda',
      finalizacaoObs.trim() || 'Acompanhamento pós-venda concluído e arquivado.'
    );

    setFinalizingRecord(null);
    setFinalizacaoObs('');

    // Se estiver no modal Detalhes, fecha ou atualiza
    if (viewingRecord && viewingRecord.id === target.id) {
      setViewingRecord(null);
    }

    showToast('✓ Pós-Venda finalizado com sucesso! O registro foi arquivado em "Finalizados".');
  };

  // Delete Record
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      setIsDeletingRecord(true);
      isInternalUpdateRef.current = true;

      setRecords((prev) => {
        const nextList = prev.filter((r) => r.id !== recordToDelete.id);
        localStorage.setItem('fenix_pos_vendas_db', JSON.stringify(nextList));
        return nextList;
      });

      await deleteItemFromSupabase(
        'fenix_pos_vendas_db',
        recordToDelete.id,
        'id',
        currentUserName
      );

      setRecordToDelete(null);
      showToast('✓ Acompanhamento excluído com sucesso.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir registro.');
    } finally {
      setIsDeletingRecord(false);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 250);
    }
  };

  // Filtered by Director / User
  const userRecords = useMemo(() => {
    if (isDirector) {
      return records.filter((r) => {
        const isEder =
          isRecordOfResponsible(r, 'Éder') ||
          isRecordOfResponsible(r, currentUserName || 'Éder Perez');
        if (!isEder) return false;
        return r.origem === 'followup' || r.origem === 'metas' || !r.origem;
      });
    }
    return records.filter((r) => isRecordOfResponsible(r, currentUserName || ''));
  }, [records, isDirector, currentUserName]);

  // 1. INDICADORES (KPIs): Registros finalizados NÃO entram nesses números!
  const activeUserRecords = useMemo(() => {
    return userRecords.filter((r) => !isRecordFinalized(r));
  }, [userRecords]);

  const metrics = useMemo(() => {
    const totalEmAcompanhamento = activeUserRecords.length;

    // RECEBIMENTOS PENDENTES: engloba tanto pedidos aguardando entrega quanto pedidos aguardando retirada
    const recebimentosPendentes = activeUserRecords.filter(isRecebimentoPendente).length;

    // Retornos Pendentes: status Aguardando Retorno ou Aguardando Contato ou Aguardando Confirmação
    const retornosPendentes = activeUserRecords.filter(
      (r) =>
        r.status === 'Aguardando Retorno' ||
        r.status === 'Aguardando Contato' ||
        r.status === 'Aguardando Confirmação'
    ).length;

    // Prontos para Finalizar: status Pronto para Finalizar
    const prontosParaFinalizar = activeUserRecords.filter(
      (r) => r.status === 'Pronto para Finalizar'
    ).length;

    return {
      totalEmAcompanhamento,
      recebimentosPendentes,
      entregasPendentes: recebimentosPendentes, // compatibilidade
      retornosPendentes,
      prontosParaFinalizar,
    };
  }, [activeUserRecords]);

  // 2. FILTRO ATIVO DA LISTA:
  // REGRA PRINCIPAL:
  // Assim que for finalizado, o Pós-Venda deve SUMIR IMEDIATAMENTE DA LISTA PRINCIPAL.
  // O registro só poderá ser encontrado pelo filtro “Finalizados”.
  // Ao selecionar “Todos”, mostrar somente os Pós-Vendas ativos.
  const filteredRecords = useMemo(() => {
    let list = userRecords;

    if (activeFilter === 'Finalizados') {
      list = list.filter((r) => isRecordFinalized(r));
    } else if (activeFilter === 'Todos') {
      list = list.filter((r) => !isRecordFinalized(r));
    } else if (
      activeFilter === 'Recebimentos Pendentes' ||
      activeFilter === 'Aguardando Entrega'
    ) {
      list = list.filter(
        (r) => !isRecordFinalized(r) && isRecebimentoPendente(r)
      );
    } else if (activeFilter === 'Aguardando Retorno') {
      list = list.filter(
        (r) =>
          !isRecordFinalized(r) &&
          (r.status === 'Aguardando Retorno' ||
            r.status === 'Aguardando Contato' ||
            r.status === 'Aguardando Confirmação')
      );
    } else if (activeFilter === 'Instalador Indicado') {
      list = list.filter(
        (r) => !isRecordFinalized(r) && r.status === 'Instalador Indicado'
      );
    } else if (activeFilter === 'Pronto para Finalizar') {
      list = list.filter(
        (r) => !isRecordFinalized(r) && r.status === 'Pronto para Finalizar'
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.clientName.toLowerCase().includes(term) ||
          r.orderNumber.toLowerCase().includes(term) ||
          (r.nomeInstaladorManual &&
            r.nomeInstaladorManual.toLowerCase().includes(term)) ||
          (r.installerName && r.installerName.toLowerCase().includes(term)) ||
          (r.projectDescription && r.projectDescription.toLowerCase().includes(term)) ||
          (r.formaRecebimento && r.formaRecebimento.toLowerCase().includes(term)) ||
          (r.statusEntrega && r.statusEntrega.toLowerCase().includes(term)) ||
          (r.statusRetirada && r.statusRetirada.toLowerCase().includes(term)) ||
          (r.observacaoEntrega && r.observacaoEntrega.toLowerCase().includes(term)) ||
          (r.observacaoRetirada && r.observacaoRetirada.toLowerCase().includes(term))
      );
    }

    return list;
  }, [userRecords, activeFilter, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  // Handle Save New Record Form
  const handleOpenNewModal = () => {
    setFormPedido('');
    setFormCliente('');
    setFormTelefone('');
    setFormProjeto('');
    setFormFormaRecebimento('Entrega');
    setFormDataPrevista('');
    setFormStatusRecebimento('Aguardando');
    setFormPrecisaInstalador('Não');
    setFormNomeInstalador('');
    setFormDataIndicacao('');
    setFormStatusInicial('Aguardando Entrega');
    setFormObservacao('');
    setFormErrors({});
    setIsNewRecordModalOpen(true);
  };

  const handleSaveNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    const cleanOrderNumber = formPedido.trim().replace(/#/g, '');
    if (!cleanOrderNumber) {
      errors.pedido = 'Informe o número do pedido';
    }
    if (!formCliente.trim()) {
      errors.cliente = 'Digite o nome do cliente';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const userSellerId = getSellerIdForUser(currentUserName || '');
    const userId = getUserIdByName(currentUserName || '') || userSellerId;
    const now = new Date().toISOString();

    const isRetirada = formFormaRecebimento === 'Retirada';

    const newRecord: PosVendaItem = {
      id: `pv_${Date.now()}`,
      orderNumber: cleanOrderNumber,
      clientName: formCliente.trim(),
      clientPhone: formTelefone.trim() || '(11) 98765-4321',
      projectDescription: formProjeto.trim() || 'Piso Vinílico SPC e Acessórios',
      completionDate: formDataPrevista || now.split('T')[0],
      status: formStatusInicial,
      // Logística / Recebimento: Entrega ou Retirada
      formaRecebimento: formFormaRecebimento,
      // Se Entrega:
      dataPrevisaoEntrega: !isRetirada ? (formDataPrevista || undefined) : undefined,
      statusEntrega: !isRetirada ? formStatusRecebimento : undefined,
      observacaoEntrega: !isRetirada ? (formObservacao.trim() || undefined) : undefined,
      // Se Retirada:
      dataPrevisaoRetirada: isRetirada ? (formDataPrevista || undefined) : undefined,
      statusRetirada: isRetirada ? formStatusRecebimento : undefined,
      observacaoRetirada: isRetirada ? (formObservacao.trim() || undefined) : undefined,
      // Instalador
      precisaInstalador: formPrecisaInstalador,
      nomeInstaladorManual:
        formPrecisaInstalador === 'Sim' ? formNomeInstalador.trim() : undefined,
      dataIndicacaoInstalador:
        formPrecisaInstalador === 'Sim' ? formDataIndicacao || undefined : undefined,
      clienteContatouInstalador:
        formPrecisaInstalador === 'Sim' ? 'Aguardando' : undefined,
      // Acompanhamento
      clienteRecebeuMaterial: 'Não',
      jaInstalou: 'Não',
      deuTudoCerto: undefined,
      comentarioCliente: '',
      // Auditoria
      vendedor: currentUserName,
      vendedorId: userSellerId,
      responsavel: currentUserName,
      responsavelId: userId,
      criadoPor: currentUserName,
      criadoPorId: userId,
      creatorId: userId,
      createdAt: now,
      origem: 'manual',
      historico: [
        {
          id: `h_${Date.now()}_init`,
          dataHora: now,
          usuario: currentUserName || 'Usuário',
          acao: 'Cadastro Criado',
          detalhes: `Acompanhamento iniciado (${formFormaRecebimento}) com status "${formStatusInicial}".`,
        },
      ],
    };

    isInternalUpdateRef.current = true;
    setRecords((prev) => [newRecord, ...prev]);
    setIsNewRecordModalOpen(false);

    try {
      await saveItemToSupabase('fenix_pos_vendas_db', newRecord, 'id', currentUserName);
    } catch {}

    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 250);

    showToast('✓ Novo registro de pós-venda cadastrado com sucesso!');
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 pb-12 text-slate-800">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-60 bg-[#071a52] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-blue-500/30 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="space-y-3">
        {/* Breadcrumb: Início > Pós-Vendas */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 select-none">
          <button
            type="button"
            onClick={() =>
              onNavigateTab ? onNavigateTab('Início') : onBackToCadastro?.()
            }
            className="flex items-center gap-1 hover:text-[#1D4ED8] transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </button>
          <span className="text-slate-400 font-normal">›</span>
          <span className="text-slate-800 font-semibold">Pós-Vendas</span>
        </nav>

        {/* Título, Subtítulo e Botão superior direito "+ Novo Registro" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 border border-blue-200/80 shadow-xs">
              <HeartHandshake className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#071a52] tracking-tight">
                Pós-Vendas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Distribuidora de Pisos Vinílicos • Acompanhamento de entregas, recebimentos, instaladores e encerramento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Alternador de visualização: Cards / Tabela */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs select-none">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#1D4ED8] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#1D4ED8] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="h-10 px-5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span>+ Novo Registro</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CARDS DE RESUMO / INDICADORES OFICIAIS (Registros finalizados NÃO entram) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Indicador 1: Total em Acompanhamento */}
        <div
          onClick={() => setActiveFilter('Todos')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Todos'
              ? 'border-[#1D4ED8] ring-2 ring-blue-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Ver todos os ativos em acompanhamento"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total em Acompanhamento
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#071a52] mt-0.5 block">
              {metrics.totalEmAcompanhamento}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Ativos no pós-venda</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 border border-blue-100/80">
            <ClipboardList className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Indicador 2: RECEBIMENTOS PENDENTES */}
        <div
          onClick={() => setActiveFilter('Recebimentos Pendentes')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Recebimentos Pendentes' || activeFilter === 'Aguardando Entrega'
              ? 'border-amber-500 ring-2 ring-amber-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar recebimentos pendentes (entregas e retiradas)"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recebimentos Pendentes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-0.5 block">
              {metrics.recebimentosPendentes}
            </span>
            <span className="text-[10px] text-amber-600/80 font-medium">Aguardando entrega ou retirada</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100/80">
            <Truck className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Indicador 3: Retornos Pendentes */}
        <div
          onClick={() => setActiveFilter('Aguardando Retorno')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Aguardando Retorno'
              ? 'border-purple-500 ring-2 ring-purple-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar retornos e contatos pendentes"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Retornos Pendentes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-600 mt-0.5 block">
              {metrics.retornosPendentes}
            </span>
            <span className="text-[10px] text-purple-600/80 font-medium">Contatos e confirmações</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100/80">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Indicador 4: Prontos para Finalizar */}
        <div
          onClick={() => setActiveFilter('Pronto para Finalizar')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Pronto para Finalizar'
              ? 'border-teal-500 ring-2 ring-teal-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar prontos para finalizar"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Prontos para Finalizar
            </span>
            <span className="text-2xl sm:text-3xl font-black text-teal-600 mt-0.5 block">
              {metrics.prontosParaFinalizar}
            </span>
            <span className="text-[10px] text-teal-600/80 font-medium">Prontos para encerramento</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 border border-teal-100/80">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS RÁPIDOS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, pedido, instalador ou entrega..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15 transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pílulas de filtro de status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar select-none">
          {(
            [
              'Todos',
              'Recebimentos Pendentes',
              'Aguardando Retorno',
              'Instalador Indicado',
              'Pronto para Finalizar',
              'Finalizados',
            ] as FilterPill[]
          ).map((pill) => {
            const isActive =
              activeFilter === pill ||
              (pill === 'Recebimentos Pendentes' && activeFilter === 'Aguardando Entrega');
            const isFinalizedPill = pill === 'Finalizados';
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setActiveFilter(pill)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs border ${
                  isActive
                    ? isFinalizedPill
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-slate-900 text-white border-slate-900'
                    : isFinalizedPill
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. CONTEÚDO PRINCIPAL: CARDS OU TABELA */}
      {viewMode === 'cards' ? (
        /* ================= CARDS VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedRecords.length === 0 ? (
            <div className="col-span-full py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-700">
                  {activeFilter === 'Finalizados'
                    ? 'Nenhum pós-venda finalizado encontrado'
                    : 'Nenhum pós-venda ativo encontrado'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchTerm
                    ? `Nenhum resultado para "${searchTerm}".`
                    : activeFilter === 'Finalizados'
                    ? 'Quando um pós-venda for finalizado, ele será arquivado aqui permanentemente.'
                    : 'Novas vendas aprovadas no Follow-up ou cadastradas em Metas aparecem automaticamente aqui.'}
                </p>
              </div>
              {activeFilter !== 'Finalizados' && (
                <button
                  type="button"
                  onClick={handleOpenNewModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D4ED8] text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <span>+ Cadastrar Acompanhamento</span>
                </button>
              )}
            </div>
          ) : (
            paginatedRecords.map((item) => {
              const visual = getClientTypeVisual(item.clientType);
              const ClientIcon = visual.Icon;
              const statusCfg =
                OFFICIAL_STATUS_CONFIG[item.status] ||
                OFFICIAL_STATUS_CONFIG['Aguardando Entrega'];
              const StatusIcon = statusCfg.icon;
              const cleanPhone = (item.clientPhone || '').replace(/\D/g, '');
              const isStatusOpen = openStatusDropdownId === item.id;
              const isActionOpen = openActionMenuId === item.id;
              const isDone = isRecordFinalized(item);
              const recInfo = getRecebimentoInfo(item);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border ${visual.cardBorder} ${visual.cardBg} p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between relative group hover:shadow-md`}
                >
                  <div>
                    {/* Linha Superior: Tipo de Cliente & Pedido & Menu de Opções */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl ${visual.iconBg} flex items-center justify-center flex-shrink-0`}
                        >
                          <ClientIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visual.badgeBg}`}
                            >
                              {item.clientType || 'Cliente Final'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200/80">
                              Ped. #{item.orderNumber}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-[#091122] truncate mt-1">
                            {item.clientName}
                          </h3>
                        </div>
                      </div>

                      {/* Menu de opções (•••) */}
                      <div
                        data-posvenda-action-menu="true"
                        className="relative inline-block flex-shrink-0"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionMenuId(isActionOpen ? null : item.id)
                          }
                          className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                          title="Opções do acompanhamento"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isActionOpen && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setViewingRecord(item);
                                setOpenActionMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>Ver Detalhes do Pedido</span>
                            </button>

                            {!isDone && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFinalizingRecord(item);
                                  setFinalizacaoObs('');
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-bold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Finalizar Pós-Venda</span>
                              </button>
                            )}

                            <div className="h-px bg-slate-100 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setRecordToDelete(item);
                                setOpenActionMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Excluir registro</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botões Rápidos de Contato: WhatsApp e Ligação */}
                    <div className="grid grid-cols-2 gap-2 my-3">
                      {cleanPhone ? (() => {
                        const template = getWhatsAppMessageTemplate('Pós-Vendas');
                        const message = formatWhatsAppMessage(template, item.clientName);
                        const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
                        return (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-3 rounded-xl border border-emerald-300 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                            title={`Conversar com ${item.clientName} no WhatsApp (${item.clientPhone})`}
                          >
                            <MessageCircle className="w-4 h-4 fill-white text-emerald-500" />
                            <span>WhatsApp</span>
                          </a>
                        );
                      })() : (
                        <div className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <MessageCircle className="w-4 h-4 text-slate-400" />
                          <span>Sem Tel.</span>
                        </div>
                      )}

                      {cleanPhone ? (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="h-9 px-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#0052cc] text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                          title={`Ligar para ${item.clientName} (${item.clientPhone})`}
                        >
                          <PhoneCall className="w-4 h-4 text-[#0052cc] stroke-[2.2]" />
                          <span>Ligação</span>
                        </a>
                      ) : (
                        <div className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>Sem Tel.</span>
                        </div>
                      )}
                    </div>

                    {/* Grade de Informações Operacionais da Distribuidora */}
                    <div className="bg-white/90 rounded-xl border border-slate-200/80 p-3 space-y-2.5 text-xs shadow-2xs">
                      {/* Material / Projeto */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Material / Projeto
                        </span>
                        <span className="font-bold text-slate-800 line-clamp-1 leading-snug">
                          {item.projectDescription}
                        </span>
                      </div>

                      {/* Bloco de Recebimento (Entrega ou Retirada) */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {recInfo.isRetirada ? (
                              <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            ) : (
                              <Truck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            )}
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                              RECEBIMENTO:{' '}
                              <strong className="text-slate-800 font-black">
                                {recInfo.forma}
                              </strong>
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${recInfo.badgeColor}`}
                          >
                            Status: {recInfo.displayStatus}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pl-5">
                          <span>
                            Prev: <strong className="text-slate-700">{formatDateBR(recInfo.dataPrevista)}</strong>
                          </span>
                          {recInfo.dataRealizada ? (
                            <span className="text-emerald-700 font-semibold">
                              {recInfo.isRetirada ? 'Retirado em' : 'Recebido em'}:{' '}
                              <strong>{formatDateBR(recInfo.dataRealizada)}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">
                              {recInfo.isRetirada ? 'Aguardando retirada' : 'Aguardando entrega'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bloco de Instalador */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[11px] font-medium truncate">
                            Instalador:{' '}
                            <strong className="text-slate-800">
                              {item.nomeInstaladorManual || item.installerName || (item.precisaInstalador === 'Não' ? 'Não necessita' : 'A Definir')}
                            </strong>
                          </span>
                        </div>
                        {item.precisaInstalador === 'Sim' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-700 flex-shrink-0">
                            Indicado
                          </span>
                        )}
                      </div>

                      {/* Bloco de Acompanhamento */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          Material:{' '}
                          <strong
                            className={
                              item.clienteRecebeuMaterial === 'Sim'
                                ? 'text-emerald-700'
                                : 'text-slate-700'
                            }
                          >
                            {item.clienteRecebeuMaterial || 'Pendente'}
                          </strong>
                        </span>
                        <span>
                          Instalou:{' '}
                          <strong
                            className={
                              item.jaInstalou === 'Sim'
                                ? 'text-emerald-700'
                                : 'text-slate-700'
                            }
                          >
                            {item.jaInstalou || 'Não'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Se finalizado, badge de encerramento */}
                    {isDone && (
                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Finalizado em {formatDateTimeBR(item.finalizadoEm)}</span>
                        </div>
                        {item.observacaoFinal && (
                          <p className="text-[11px] italic text-emerald-900 line-clamp-2">
                            "{item.observacaoFinal}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card: Dropdown de Status e Botão Detalhes */}
                  <div className="pt-3 mt-3 border-t border-slate-200/50 flex items-center justify-between gap-2">
                    {/* Dropdown de Status */}
                    <div data-posvenda-dropdown="true" className="relative flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenStatusDropdownId(isStatusOpen ? null : item.id)
                        }
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} hover:brightness-95`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dotBg}`} />
                          <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{statusCfg.label}</span>
                        </div>
                        <ChevronDown
                          className={`w-3 h-3 ml-0.5 opacity-70 transition-transform duration-150 flex-shrink-0 ${
                            isStatusOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isStatusOpen && (
                        <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            Alterar Status
                          </div>
                          {OFFICIAL_STATUS_LIST.map((statusOption) => {
                            const optCfg = OFFICIAL_STATUS_CONFIG[statusOption];
                            const isCurrent = item.status === statusOption;
                            return (
                              <button
                                key={statusOption}
                                type="button"
                                onClick={() => handleStatusChange(item, statusOption)}
                                className={`w-full px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'bg-blue-50 font-bold text-[#1D4ED8]'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${optCfg.dotBg}`} />
                                  <span>{optCfg.label}</span>
                                </div>
                                {isCurrent && <Check className="w-3.5 h-3.5 text-[#1D4ED8]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Botão Detalhes */}
                    <button
                      type="button"
                      onClick={() => setViewingRecord(item)}
                      className="h-8 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer flex-shrink-0"
                      title="Ver ficha completa do pós-venda"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Detalhes</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Pedido / Cliente</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4">Recebimento</th>
                  <th className="py-3 px-4">Instalador</th>
                  <th className="py-3 px-4">Acompanhamento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((item) => {
                    const statusCfg =
                      OFFICIAL_STATUS_CONFIG[item.status] ||
                      OFFICIAL_STATUS_CONFIG['Aguardando Entrega'];
                    const cleanPhone = (item.clientPhone || '').replace(/\D/g, '');
                    const isDone = isRecordFinalized(item);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Pedido / Cliente */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {item.clientName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-[#1D4ED8]">
                              #{item.orderNumber}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">
                              {item.projectDescription}
                            </span>
                          </div>
                        </td>

                        {/* Contato */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {cleanPhone && (() => {
                              const template = getWhatsAppMessageTemplate('Pós-Vendas');
                              const message = formatWhatsAppMessage(template, item.clientName);
                              const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
                              return (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="Abrir WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4 fill-emerald-500 text-white" />
                                </a>
                              );
                            })()}
                            <span className="font-medium text-slate-700">
                              {item.clientPhone || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Recebimento (Entrega ou Retirada) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {(() => {
                            const rec = getRecebimentoInfo(item);
                            return (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  {rec.isRetirada ? (
                                    <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                  ) : (
                                    <Truck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                  )}
                                  <span className="font-extrabold text-slate-800 text-xs">
                                    {rec.forma}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${rec.badgeColor}`}
                                  >
                                    {rec.displayStatus}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 pl-5">
                                  {rec.dataRealizada
                                    ? `${rec.isRetirada ? 'Retirado' : 'Recebido'}: ${formatDateBR(rec.dataRealizada)}`
                                    : `Prev: ${formatDateBR(rec.dataPrevista)}`}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Instalador */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 truncate max-w-[160px]">
                            {item.nomeInstaladorManual || item.installerName || (item.precisaInstalador === 'Não' ? 'Não necessita' : 'A Definir')}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.precisaInstalador === 'Sim' ? 'Indicação Fênix' : 'Instalação própria'}
                          </div>
                        </td>

                        {/* Acompanhamento */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-[11px]">
                            Mat: <strong className="text-slate-800">{item.clienteRecebeuMaterial || '—'}</strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Inst: <strong className="text-slate-800">{item.jaInstalou || '—'}</strong>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                            <span>{statusCfg.label}</span>
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingRecord(item)}
                              className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Ver ficha completa"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Detalhes</span>
                            </button>

                            {!isDone && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFinalizingRecord(item);
                                  setFinalizacaoObs('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                title="Finalizar Acompanhamento"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Finalizar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setRecordToDelete(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação Comum no Rodapé */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Mostrando{' '}
          <span className="font-semibold text-slate-700">
            {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </span>{' '}
          a{' '}
          <span className="font-semibold text-slate-700">
            {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
          </span>{' '}
          de{' '}
          <span className="font-semibold text-slate-700">
            {filteredRecords.length}
          </span>{' '}
          registros
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 select-none">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL: DETALHES DO PÓS-VENDA (ORGANIZADO NAS 8 SEÇÕES)  */}
      {/* ========================================================= */}
      {viewingRecord && (
        <ModalDetalhesPosVenda
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onSave={async (updated, action, details) => {
            await persistRecordUpdate(updated, action, details);
            showToast('✓ Informações salvas com sucesso!');
          }}
          onOpenFinalizar={() => {
            setFinalizingRecord(viewingRecord);
            setFinalizacaoObs('');
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: FINALIZAR PÓS-VENDA                             */}
      {/* ========================================================= */}
      {finalizingRecord && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Finalizar Pós-Venda
                </h3>
                <p className="text-xs text-slate-500">
                  {finalizingRecord.clientName} • Pedido #{finalizingRecord.orderNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 leading-relaxed">
              <strong>Regra de Encerramento:</strong> Ao finalizar, este registro <strong>sumirá imediatamente da lista principal</strong> e será arquivado no filtro <strong>“Finalizados”</strong> com histórico permanente no banco de dados.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Data e Hora do Encerramento
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>{new Date().toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Usuário Responsável
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{currentUserName || 'Usuário Fênix'}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Observação Final de Encerramento *
                </label>
                <textarea
                  rows={3}
                  value={finalizacaoObs}
                  onChange={(e) => setFinalizacaoObs(e.target.value)}
                  placeholder="Ex: Material entregue no prazo, cliente confirmou recebimento e instalação concluída sem pendências."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFinalizingRecord(null)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalizacao}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Finalizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL: NOVO REGISTRO DE PÓS-VENDA                      */}
      {/* ========================================================= */}
      {isNewRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center border border-blue-200/80 shadow-2xs">
                  <HeartHandshake className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#071a52]">
                    Novo Registro de Pós-Venda
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cadastre o acompanhamento pós-venda para entrega e instalador.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewRecordModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRecord} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pedido */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Pedido / Orçamento *
                  </label>
                  <input
                    type="text"
                    value={formPedido}
                    onChange={(e) => {
                      setFormPedido(e.target.value.replace(/#/g, ''));
                      if (formErrors.pedido) setFormErrors((p) => ({ ...p, pedido: '' }));
                    }}
                    placeholder="Ex: 1046"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 ${
                      formErrors.pedido
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-300 focus:border-[#1D4ED8]'
                    }`}
                  />
                  {formErrors.pedido && (
                    <span className="text-[11px] text-rose-500 mt-1 block font-medium">
                      {formErrors.pedido}
                    </span>
                  )}
                </div>

                {/* Cliente */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    value={formCliente}
                    onChange={(e) => {
                      setFormCliente(e.target.value);
                      if (formErrors.cliente) setFormErrors((p) => ({ ...p, cliente: '' }));
                    }}
                    placeholder="Digite o nome do cliente..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 ${
                      formErrors.cliente
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-300 focus:border-[#1D4ED8]'
                    }`}
                  />
                  {formErrors.cliente && (
                    <span className="text-[11px] text-rose-500 mt-1 block font-medium">
                      {formErrors.cliente}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Telefone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                {/* Material / Projeto */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    Material / Descrição do Piso
                  </label>
                  <input
                    type="text"
                    value={formProjeto}
                    onChange={(e) => setFormProjeto(e.target.value)}
                    placeholder="Ex: Piso Vinílico SPC Carvalho 45m² + Manta + Rodapés 10cm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              {/* Seção de Logística: Forma de Recebimento (Entrega ou Retirada) */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
                <label className="block font-bold text-[#071a52] text-xs">
                  FORMA DE RECEBIMENTO:
                </label>
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="formaRecebimentoNew"
                      value="Entrega"
                      checked={formFormaRecebimento === 'Entrega'}
                      onChange={() => setFormFormaRecebimento('Entrega')}
                      className="text-[#1D4ED8] focus:ring-blue-500"
                    />
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Entrega</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="formaRecebimentoNew"
                      value="Retirada"
                      checked={formFormaRecebimento === 'Retirada'}
                      onChange={() => setFormFormaRecebimento('Retirada')}
                      className="text-[#1D4ED8] focus:ring-blue-500"
                    />
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>Retirada</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {formFormaRecebimento === 'Retirada'
                        ? 'Data Prevista para Retirada'
                        : 'Data Prevista de Entrega'}
                    </label>
                    <input
                      type="date"
                      value={formDataPrevista}
                      onChange={(e) => setFormDataPrevista(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-[#1D4ED8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Status do Recebimento
                    </label>
                    <select
                      value={formStatusRecebimento}
                      onChange={(e) => setFormStatusRecebimento(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-[#1D4ED8] font-medium"
                    >
                      {STATUS_RECEBIMENTO_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Instalador Pergunta */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                <label className="block font-bold text-[#071a52] text-xs">
                  Cliente precisa de indicação de instalador?
                </label>
                <div className="flex items-center gap-3">
                  {(['Sim', 'Não', 'Já possui instalador'] as const).map((opt) => (
                    <label
                      key={opt}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium"
                    >
                      <input
                        type="radio"
                        name="precisaInstaladorNew"
                        value={opt}
                        checked={formPrecisaInstalador === opt}
                        onChange={() => setFormPrecisaInstalador(opt)}
                        className="text-[#1D4ED8] focus:ring-blue-500"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>

                {formPrecisaInstalador === 'Sim' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nome do Instalador Indicado (Texto livre)
                      </label>
                      <input
                        type="text"
                        value={formNomeInstalador}
                        onChange={(e) => setFormNomeInstalador(e.target.value)}
                        placeholder="Digite o nome do instalador..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Data da Indicação
                      </label>
                      <input
                        type="date"
                        value={formDataIndicacao}
                        onChange={(e) => setFormDataIndicacao(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Observação Inicial */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  Observações Iniciais
                </label>
                <textarea
                  rows={2}
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  placeholder="Instruções de entrega, detalhes de acesso ao local ou observações..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-[#1D4ED8] resize-none text-xs"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewRecordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer text-xs"
                >
                  Cadastrar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. MODAL: EXCLUIR REGISTRO                                */}
      {/* ========================================================= */}
      {recordToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Excluir Acompanhamento?
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Tem certeza de que deseja excluir o acompanhamento do cliente{' '}
              <strong className="text-slate-900">{recordToDelete.clientName}</strong> (Pedido #{recordToDelete.orderNumber})? Esta alteração será salva no sistema e não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingRecord ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUBCOMPONENTE MODAL DETALHES COM AS 8 SEÇÕES ESTRUTURADAS E REQUISITO 8
// =========================================================================
interface ModalDetalhesProps {
  record: PosVendaItem;
  onClose: () => void;
  onSave: (updated: PosVendaItem, action?: string, details?: string) => Promise<void>;
  onOpenFinalizar: () => void;
}

const ModalDetalhesPosVenda: React.FC<ModalDetalhesProps> = ({
  record,
  onClose,
  onSave,
  onOpenFinalizar,
}) => {
  // Tabs:
  const tabs = [
    'Recebimento',
    'Instalador',
    'Acompanhamento',
    'Nova Oportunidade',
    'Cliente & Pedido',
    'Histórico',
  ] as const;
  type TabType = (typeof tabs)[number];
  const [activeTab, setActiveTab] = useState<TabType>('Recebimento');

  // Local Form state: Forma de Recebimento
  const [formaRecebimento, setFormaRecebimento] = useState<'Entrega' | 'Retirada'>(
    record.formaRecebimento === 'Retirada' ? 'Retirada' : 'Entrega'
  );

  // Campos Entrega:
  const [dataPrevisaoEntrega, setDataPrevisaoEntrega] = useState(
    record.dataPrevisaoEntrega || record.completionDate || ''
  );
  const [dataEntrega, setDataEntrega] = useState(
    record.dataEntrega || record.dataRecebimento || ''
  );
  const [statusEntrega, setStatusEntrega] = useState(
    record.statusEntrega || 'Aguardando'
  );
  const [obsEntrega, setObsEntrega] = useState(
    record.observacaoEntrega || ''
  );

  // Campos Retirada:
  const [dataPrevisaoRetirada, setDataPrevisaoRetirada] = useState(
    record.dataPrevisaoRetirada || record.completionDate || ''
  );
  const [dataRetirada, setDataRetirada] = useState(
    record.dataRetirada || record.dataRecebimento || ''
  );
  const [statusRetirada, setStatusRetirada] = useState(
    record.statusRetirada || 'Aguardando'
  );
  const [obsRetirada, setObsRetirada] = useState(
    record.observacaoRetirada || ''
  );

  const [precisaInstalador, setPrecisaInstalador] = useState<
    'Sim' | 'Não' | 'Já possui instalador'
  >(record.precisaInstalador || 'Não');
  const [nomeInstalador, setNomeInstalador] = useState(
    record.nomeInstaladorManual || record.installerName || ''
  );
  const [dataIndicacao, setDataIndicacao] = useState(record.dataIndicacaoInstalador || '');
  const [contatouInstalador, setContatouInstalador] = useState<
    'Sim' | 'Não' | 'Aguardando'
  >(record.clienteContatouInstalador || 'Aguardando');

  const [recebeuMaterial, setRecebeuMaterial] = useState<
    'Sim' | 'Não' | 'Parcialmente'
  >(record.clienteRecebeuMaterial || 'Não');
  const [jaInstalou, setJaInstalou] = useState<'Sim' | 'Não' | 'Em andamento'>(
    record.jaInstalou || 'Não'
  );
  const [deuTudoCerto, setDeuTudoCerto] = useState<'Sim' | 'Não' | 'Com ressalvas'>(
    record.deuTudoCerto || 'Sim'
  );
  const [comentarioCliente, setComentarioCliente] = useState(
    record.comentarioCliente || record.feedback || ''
  );

  const [interesseNovaCompra, setInteresseNovaCompra] = useState<
    'Sim' | 'Não' | 'Futuramente'
  >(record.interesseNovaCompra || 'Não');
  const [tipoOportunidade, setTipoOportunidade] = useState(
    record.tipoOportunidadeNovaCompra || ''
  );

  const [statusGeral, setStatusGeral] = useState<PosVendaStatus>(record.status);
  const [isSaving, setIsSaving] = useState(false);

  const isDone = isRecordFinalized(record);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const isRetirada = formaRecebimento === 'Retirada';

      const updated: PosVendaItem = {
        ...record,
        status: statusGeral,
        formaRecebimento,
        // Se Entrega:
        dataPrevisaoEntrega: !isRetirada ? (dataPrevisaoEntrega || undefined) : record.dataPrevisaoEntrega,
        dataEntrega: !isRetirada ? (dataEntrega || undefined) : record.dataEntrega,
        dataRecebimento: !isRetirada ? (dataEntrega || undefined) : (dataRetirada || undefined),
        statusEntrega: !isRetirada ? statusEntrega : record.statusEntrega,
        observacaoEntrega: !isRetirada ? (obsEntrega.trim() || undefined) : record.observacaoEntrega,
        // Se Retirada:
        dataPrevisaoRetirada: isRetirada ? (dataPrevisaoRetirada || undefined) : record.dataPrevisaoRetirada,
        dataRetirada: isRetirada ? (dataRetirada || undefined) : record.dataRetirada,
        statusRetirada: isRetirada ? statusRetirada : record.statusRetirada,
        observacaoRetirada: isRetirada ? (obsRetirada.trim() || undefined) : record.observacaoRetirada,
        // Instalador
        precisaInstalador,
        nomeInstaladorManual:
          precisaInstalador === 'Sim' ? nomeInstalador.trim() : undefined,
        dataIndicacaoInstalador:
          precisaInstalador === 'Sim' ? dataIndicacao || undefined : undefined,
        clienteContatouInstalador:
          precisaInstalador === 'Sim' ? contatouInstalador : undefined,
        clienteRecebeuMaterial: recebeuMaterial,
        jaInstalou,
        deuTudoCerto,
        comentarioCliente: comentarioCliente.trim() || undefined,
        feedback: comentarioCliente.trim() || undefined,
        interesseNovaCompra,
        tipoOportunidadeNovaCompra: tipoOportunidade.trim() || undefined,
      };

      await onSave(updated, 'Atualização de Informações', `Logística e dados do pós-venda (${formaRecebimento}) atualizados.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-slate-800 animate-in zoom-in-95 duration-150 my-auto">
        {/* Cabeçalho do Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 border border-blue-200/80 shadow-2xs">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#071a52]">
                  {record.clientName}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1D4ED8]">
                  Ped. #{record.orderNumber}
                </span>
                {isDone && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Finalizado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Acompanhamento pós-venda Fênix World Distribuidora
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Abas Superiores das seções */}
        <div className="flex items-center gap-1 px-5 sm:px-6 pt-2 border-b border-slate-100 bg-white overflow-x-auto custom-scrollbar flex-shrink-0 select-none">
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab ||
              (tab === 'Recebimento' && (activeTab as string) === 'Entrega');
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#1D4ED8] text-[#1D4ED8]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-4 text-xs">
          {/* ================= SEÇÃO: LOGÍSTICA / RECEBIMENTO ================= */}
          {(activeTab === 'Recebimento' || (activeTab as string) === 'Entrega') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {formaRecebimento === 'Retirada' ? (
                    <Package className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Truck className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    3. Logística e Recebimento
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Distribuidora Fênix</span>
              </div>

              {/* FORMA DE RECEBIMENTO: Entrega ou Retirada */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <label className="block font-black text-[#071a52] text-xs">
                  FORMA DE RECEBIMENTO:
                </label>
                <div className="flex items-center gap-6 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="formaRecebimentoTab"
                      value="Entrega"
                      checked={formaRecebimento === 'Entrega'}
                      onChange={() => setFormaRecebimento('Entrega')}
                      className="text-[#1D4ED8] focus:ring-blue-500"
                    />
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Entrega</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="formaRecebimentoTab"
                      value="Retirada"
                      checked={formaRecebimento === 'Retirada'}
                      onChange={() => setFormaRecebimento('Retirada')}
                      className="text-[#1D4ED8] focus:ring-blue-500"
                    />
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>Retirada</span>
                  </label>
                </div>
              </div>

              {/* Se for ENTREGA */}
              {formaRecebimento === 'Entrega' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Data Prevista de Entrega
                      </label>
                      <input
                        type="date"
                        value={dataPrevisaoEntrega}
                        onChange={(e) => setDataPrevisaoEntrega(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Data de Entrega (Realizada)
                      </label>
                      <input
                        type="date"
                        value={dataEntrega}
                        onChange={(e) => setDataEntrega(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Status da Entrega
                    </label>
                    <select
                      value={statusEntrega}
                      onChange={(e) => setStatusEntrega(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none font-medium"
                    >
                      {STATUS_RECEBIMENTO_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Observações da Entrega
                    </label>
                    <textarea
                      rows={3}
                      value={obsEntrega}
                      onChange={(e) => setObsEntrega(e.target.value)}
                      placeholder="Instruções de entrega, transportadora, canhoto de entrega ou observações..."
                      className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Se for RETIRADA */}
              {formaRecebimento === 'Retirada' && (
                <div className="space-y-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Data Prevista para Retirada
                      </label>
                      <input
                        type="date"
                        value={dataPrevisaoRetirada}
                        onChange={(e) => setDataPrevisaoRetirada(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Data da Retirada (Realizada)
                      </label>
                      <input
                        type="date"
                        value={dataRetirada}
                        onChange={(e) => setDataRetirada(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Status da Retirada
                    </label>
                    <select
                      value={statusRetirada}
                      onChange={(e) => setStatusRetirada(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none font-medium"
                    >
                      {STATUS_RECEBIMENTO_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Observações da Retirada
                    </label>
                    <textarea
                      rows={3}
                      value={obsRetirada}
                      onChange={(e) => setObsRetirada(e.target.value)}
                      placeholder="Pessoa autorizada a retirar, placa do veículo, conferência de material..."
                      className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= SEÇÃO: INSTALADOR ================= */}
          {activeTab === 'Instalador' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    4. Indicação de Instalador
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Sem dropdown / Digitação livre</span>
              </div>

              {/* Pergunta oficial */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <label className="block font-black text-[#071a52] text-xs">
                  Cliente precisa de indicação de instalador?
                </label>
                <div className="flex items-center gap-4 pt-1">
                  {(['Sim', 'Não', 'Já possui instalador'] as const).map((opt) => (
                    <label
                      key={opt}
                      className="inline-flex items-center gap-2 text-xs text-slate-800 font-semibold cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="precisaInstaladorTab"
                        value={opt}
                        checked={precisaInstalador === opt}
                        onChange={() => setPrecisaInstalador(opt)}
                        className="text-[#1D4ED8] focus:ring-blue-500"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {precisaInstalador === 'Sim' ? (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nome do Instalador (CAMPO DE TEXTO LIVRE, digitado manualmente) *
                    </label>
                    <input
                      type="text"
                      value={nomeInstalador}
                      onChange={(e) => setNomeInstalador(e.target.value)}
                      placeholder="Ex: Carlos Roberto (Instalador Parceiro Jundiaí)..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-[#1D4ED8]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Data da Indicação
                      </label>
                      <input
                        type="date"
                        value={dataIndicacao}
                        onChange={(e) => setDataIndicacao(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-[#1D4ED8]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Cliente entrou em contato?
                      </label>
                      <select
                        value={contatouInstalador}
                        onChange={(e) =>
                          setContatouInstalador(e.target.value as any)
                        }
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-[#1D4ED8]"
                      >
                        <option value="Aguardando">Aguardando Contato</option>
                        <option value="Sim">Sim, Já Fechou / Combinou</option>
                        <option value="Não">Não Entrou em Contato</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 text-slate-500 text-xs border border-dashed border-slate-200">
                  {precisaInstalador === 'Já possui instalador'
                    ? 'O cliente já possui instalador contratado por conta própria.'
                    : 'Nenhuma indicação de instalador solicitada pelo cliente.'}
                </div>
              )}
            </div>
          )}

          {/* ================= SEÇÃO: ACOMPANHAMENTO ================= */}
          {activeTab === 'Acompanhamento' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    5. Acompanhamento Pós-Entrega
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Sem estrelas / Sem vistoria</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Cliente recebeu o material? */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 text-[11px]">
                    Cliente recebeu o material?
                  </label>
                  <select
                    value={recebeuMaterial}
                    onChange={(e) => setRecebeuMaterial(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                    <option value="Parcialmente">Parcialmente</option>
                  </select>
                </div>

                {/* 2. Já instalou? */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 text-[11px]">
                    Já instalou?
                  </label>
                  <select
                    value={jaInstalou}
                    onChange={(e) => setJaInstalou(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="Sim">Sim, Instalado</option>
                    <option value="Não">Não Instalou Ainda</option>
                    <option value="Em andamento">Em Andamento</option>
                  </select>
                </div>

                {/* 3. Deu tudo certo? */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 text-[11px]">
                    Deu tudo certo?
                  </label>
                  <select
                    value={deuTudoCerto}
                    onChange={(e) => setDeuTudoCerto(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="Sim">Sim, Perfeito</option>
                    <option value="Não">Não (Pendência)</option>
                    <option value="Com ressalvas">Com Ressalvas</option>
                  </select>
                </div>
              </div>

              {/* Comentário do cliente */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Comentário do Cliente
                </label>
                <textarea
                  rows={3}
                  value={comentarioCliente}
                  onChange={(e) => setComentarioCliente(e.target.value)}
                  placeholder="Relato do cliente sobre o produto recebido, tom do piso vinílico, acabamento de rodapés..."
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#1D4ED8] outline-none resize-none"
                />
              </div>

              {/* Seletor de Status Geral */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="block font-bold text-slate-800 text-xs">
                    Status do Acompanhamento:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Defina em qual fase o cliente se encontra
                  </span>
                </div>
                <select
                  value={statusGeral}
                  onChange={(e) => setStatusGeral(e.target.value as PosVendaStatus)}
                  className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#071a52]"
                >
                  {OFFICIAL_STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ================= SEÇÃO: NOVA OPORTUNIDADE ================= */}
          {activeTab === 'Nova Oportunidade' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    6. Nova Venda / Recompra
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Expansão de Oportunidades</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <label className="block font-black text-emerald-950 text-xs">
                  Cliente demonstrou interesse em comprar novamente?
                </label>
                <div className="flex items-center gap-4">
                  {(['Sim', 'Não', 'Futuramente'] as const).map((opt) => (
                    <label
                      key={opt}
                      className="inline-flex items-center gap-2 text-xs text-slate-800 font-semibold cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="interesseNovaCompraTab"
                        value={opt}
                        checked={interesseNovaCompra === opt}
                        onChange={() => setInteresseNovaCompra(opt)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(interesseNovaCompra === 'Sim' || interesseNovaCompra === 'Futuramente') && (
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block font-bold text-slate-700">
                    Tipo de Oportunidade (quando aplicável)
                  </label>
                  <input
                    type="text"
                    value={tipoOportunidade}
                    onChange={(e) => setTipoOportunidade(e.target.value)}
                    placeholder="Ex: Reforma futura no andar superior, indicação para amigos, obra comercial..."
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* ================= SEÇÃO: CLIENTE & PEDIDO ================= */}
          {activeTab === 'Cliente & Pedido' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Cliente</span>
                  <div className="font-extrabold text-slate-900 text-sm">{record.clientName}</div>
                  <div className="text-slate-600 text-xs">{record.clientPhone || 'Sem telefone'}</div>
                  <div className="text-slate-500 text-[11px] pt-1">
                    Tipo: <strong>{record.clientType || 'Cliente Final'}</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Pedido & Venda</span>
                  <div className="font-extrabold text-[#1D4ED8] text-sm">#{record.orderNumber}</div>
                  <div className="text-slate-700 font-medium text-xs">{record.projectDescription}</div>
                  <div className="text-slate-500 text-[11px] pt-1">
                    Valor: <strong className="text-emerald-700">{formatCurrencyBRL(record.valor) || '—'}</strong>
                    {record.vendedor && ` • Consultor: ${record.vendedor}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= SEÇÃO: HISTÓRICO ================= */}
          {activeTab === 'Histórico' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <History className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Linha do Tempo de Atividades
                </span>
              </div>

              {!record.historico || record.historico.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum registro no histórico até o momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {record.historico.map((h, idx) => (
                    <div
                      key={h.id || idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{h.acao}</span>
                        <span className="text-slate-400">{formatDateTimeBR(h.dataHora)}</span>
                      </div>
                      <div className="text-slate-600 text-xs">
                        {h.detalhes || 'Ação registrada'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Registrado por: <strong>{h.usuario}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            {!isDone && (
              <button
                type="button"
                onClick={onOpenFinalizar}
                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                title="Finalizar Pós-Venda e arquivar"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar Pós-Venda</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="h-9 px-5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
