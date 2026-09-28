import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Search,
  X,
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  User,
  History,
  Edit2,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  Home,
  Building2,
  Store,
  Wrench,
  PenTool,
  HardHat,
  Sparkles,
} from 'lucide-react';
import { ProspectClient, ProspectHistoryEntry, ProspectStatus, ClientType } from '../../types';
import { getClientTypeVisual } from '../../utils/clientTypeVisual';
import {
  saveItemToSupabase,
  deduplicateListById,
  getSupabaseClient,
} from '../../utils/supabaseClient';
import { getUserIdByName } from '../../utils/auth';
import { areUsersEqualOrRelated, getSellerIdForUser } from '../../utils/userDataFilter';
import {
  getWhatsAppMessageTemplate,
  formatWhatsAppMessage,
} from '../../utils/configOrcamentoEMetas';

interface ProspeccaoViewProps {
  currentUserName?: string;
}

const STORAGE_PROSPECTS_KEY = 'fenix_prospeccao_clients_db';

// Tipos de cliente existentes no sistema
export const PROSPECT_CLIENT_TYPES: ClientType[] = [
  'Cliente Final',
  'Revenda',
  'Construtora',
  'Instalador',
  'Arquiteto',
  'Engenheiro',
];

// Status existentes no sistema para Prospecção
export const PROSPECT_STATUSES: ProspectStatus[] = [
  'Novo',
  'Contatado',
  'Aguardando Retorno',
  'Negociando',
  'Vendido',
  'Perdido',
];

// Formatador de WhatsApp
export const formatWhatsAppInput = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

// Formatação de data e hora atual no padrão brasileiro (DD/MM/YYYY HH:mm)
export const getCurrentFormattedDateTime = (dateObj = new Date()) => {
  const dia = String(dateObj.getDate()).padStart(2, '0');
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  const ano = dateObj.getFullYear();
  const hora = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return {
    dataHora: `${dia}/${mes}/${ano} ${hora}:${min}`,
    data: `${dia}/${mes}/${ano}`,
    hora: `${hora}:${min}`,
  };
};

// Formata data ISO para DD/MM/YYYY
export const formatIsoToDateBr = (isoStr?: string) => {
  if (!isoStr) return '';
  if (isoStr.includes('-')) {
    const parts = isoStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
};

// Formata para mostrar SOMENTE a data (DD/MM/YYYY), sem horas ou minutos
export const formatDateOnlyNoTime = (val?: string): string => {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str) return '—';
  if (str.includes('/')) {
    return str.split(' ')[0];
  }
  if (str.includes('-')) {
    const onlyDate = str.split('T')[0];
    const parts = onlyDate.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return str.split(' ')[0];
};

// Classes de cor para tipo de cliente
export const getClientTypeBadge = (type?: string) => {
  switch (type) {
    case 'Cliente Final':
      return 'bg-blue-50 text-[#0052cc] border-blue-200';
    case 'Revenda':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Construtora':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Instalador':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Arquiteto':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Engenheiro':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

// Classes de cor para status
export const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'Novo':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Contatado':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Aguardando Retorno':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Negociando':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Vendido':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Perdido':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

// Ícone visual padronizado do tipo de cliente (idêntico ao layout de Orçamentos)
export const renderProspectClientTypeIcon = (type?: string) => {
  if (type === 'Construtora') {
    return (
      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4" />
      </div>
    );
  }
  if (type === 'Residencial' || type === 'Cliente Final') {
    return (
      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center flex-shrink-0">
        <Home className="w-4 h-4" />
      </div>
    );
  }
  if (type === 'Comercial' || type === 'Revenda') {
    return (
      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
        <Store className="w-4 h-4" />
      </div>
    );
  }
  if (type === 'Instalador') {
    return (
      <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center flex-shrink-0">
        <Wrench className="w-4 h-4" />
      </div>
    );
  }
  if (type === 'Arquiteto') {
    return (
      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center flex-shrink-0">
        <PenTool className="w-4 h-4" />
      </div>
    );
  }
  if (type === 'Engenheiro') {
    return (
      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
        <HardHat className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center flex-shrink-0">
      <Home className="w-4 h-4" />
    </div>
  );
};

// Badges de Tipo de Cliente (seguindo padrão Fênix / Orçamentos)
export const renderProspectClientTypeBadge = (type?: string) => {
  switch (type) {
    case 'Construtora':
      return (
        <span className="bg-[#e0f2fe] text-[#0284c7] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Construtora
        </span>
      );
    case 'Residencial':
    case 'Cliente Final':
      return (
        <span className="bg-[#f3e8ff] text-[#9333ea] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          {type}
        </span>
      );
    case 'Comercial':
    case 'Revenda':
      return (
        <span className="bg-[#ecfdf5] text-[#059669] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          {type}
        </span>
      );
    case 'Instalador':
      return (
        <span className="bg-[#fff7ed] text-[#ea580c] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Instalador
        </span>
      );
    case 'Arquiteto':
      return (
        <span className="bg-[#faf5ff] text-[#7e22ce] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Arquiteto
        </span>
      );
    case 'Engenheiro':
      return (
        <span className="bg-[#eff6ff] text-[#1d4ed8] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Engenheiro
        </span>
      );
    default:
      return (
        <span className="bg-slate-100 text-slate-700 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          {type || 'Geral'}
        </span>
      );
  }
};

// Badges de Status (seguindo padrão Fênix / Orçamentos)
export const renderProspectStatusBadge = (status?: string) => {
  switch (status) {
    case 'Novo':
      return (
        <span className="bg-blue-50 text-[#0052cc] border border-blue-200 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Novo
        </span>
      );
    case 'Contatado':
      return (
        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Contatado
        </span>
      );
    case 'Aguardando Retorno':
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Aguardando Retorno
        </span>
      );
    case 'Negociando':
      return (
        <span className="bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Negociando
        </span>
      );
    case 'Vendido':
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Vendido
        </span>
      );
    case 'Perdido':
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          Perdido
        </span>
      );
    default:
      return (
        <span className="bg-slate-100 text-slate-700 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
          {status || 'Em Aberto'}
        </span>
      );
  }
};

// Sem seeds fantasmas
const INITIAL_PROSPECTS_SEED: ProspectClient[] = [];

export const ProspeccaoView: React.FC<ProspeccaoViewProps> = ({
  currentUserName = 'Vanessa Gomes',
}) => {
  // Lista de clientes prospectados (expurga cadastro fantasma)
  const [prospects, setProspects] = useState<ProspectClient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROSPECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p) =>
              !p.nome?.toLowerCase().includes('roberto silveira') &&
              p.id !== 'prosp_seed_1'
          );
        }
      }
    } catch (e) {
      console.error('Erro ao carregar prospecções:', e);
    }
    return [];
  });

  // Purga definitiva de qualquer resquício do cadastro fantasma do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROSPECTS_KEY);
      if (saved && saved.toLowerCase().includes('roberto silveira')) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (p) =>
              !p.nome?.toLowerCase().includes('roberto silveira') &&
              p.id !== 'prosp_seed_1'
          );
          localStorage.setItem(STORAGE_PROSPECTS_KEY, JSON.stringify(cleaned));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Carregamento remoto inicial do Supabase
  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const client = getSupabaseClient();
        if (!client) return;
        const { data: row } = await client
          .from('fenix_kv_store')
          .select('data')
          .eq('key', STORAGE_PROSPECTS_KEY)
          .maybeSingle();

        if (row && Array.isArray(row.data)) {
          const valid = row.data.filter(
            (p: any) =>
              !p.nome?.toLowerCase().includes('roberto silveira') &&
              p.id !== 'prosp_seed_1'
          );
          setProspects((prev) => {
            const merged = deduplicateListById([...prev, ...valid], 'id');
            try {
              localStorage.setItem(STORAGE_PROSPECTS_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Erro ao carregar prospecções do Supabase:', err);
      }
    };
    fetchRemote();
  }, []);

  // Escuta atualizações do Supabase Realtime e storage
  useEffect(() => {
    const reload = () => {
      try {
        const saved = localStorage.getItem(STORAGE_PROSPECTS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (p: any) =>
                !p.nome?.toLowerCase().includes('roberto silveira') &&
                p.id !== 'prosp_seed_1'
            );
            setProspects((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(cleaned)) return prev;
              return cleaned;
            });
          }
        }
      } catch {}
    };

    window.addEventListener('storage', reload);
    window.addEventListener('fenix_prospeccao_updated', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('fenix_prospeccao_updated', reload);
    };
  }, []);

  // Salvar no localStorage sempre que houver modificações
  useEffect(() => {
    try {
      // Garante que o cadastro fantasma nunca seja persistido
      const cleanProspects = prospects.filter(
        (p) =>
          !p.nome?.toLowerCase().includes('roberto silveira') &&
          p.id !== 'prosp_seed_1'
      );
      localStorage.setItem(STORAGE_PROSPECTS_KEY, JSON.stringify(cleanProspects));
    } catch (e) {
      console.error('Erro ao salvar prospecções no storage:', e);
    }
  }, [prospects]);

  // Escopo de visibilidade por usuário:
  // "Cada usuário deve ver exclusivamente os registros que ELE cadastrou ou que foram atribuídos a ele.
  // Vanessa Gomes não pode ver os registros da Jéssica Camargo.
  // Jéssica Camargo não pode ver os registros da Vanessa Gomes.
  // O Diretor (Éder Perez) continua tendo visão completa de todos os registros de prospecção."
  const isDirector =
    (currentUserName || '').toLowerCase().includes('eder') ||
    (currentUserName || '').toLowerCase().includes('diretor');
  const myUserId = getUserIdByName(currentUserName);
  const mySellerId = getSellerIdForUser(currentUserName);

  const userScopedProspects = useMemo(() => {
    return prospects.filter((p) => {
      if (isDirector) return true;

      const creatorId = p.creatorId || p.criadoPorId;
      const respId = p.responsavelId;
      const vendId = p.vendedorId;

      // 1. Verificação primária por ID único do usuário
      if (myUserId && creatorId && creatorId === myUserId) return true;
      if (myUserId && respId && respId === myUserId) return true;
      if (mySellerId && vendId && vendId === mySellerId) return true;

      // 2. Verificação por nome do responsável ou criador
      const isCreatorByName = areUsersEqualOrRelated(p.criadoPor, currentUserName);
      const isRespByName = areUsersEqualOrRelated(p.responsavel, currentUserName);

      return isCreatorByName || isRespByName;
    });
  }, [prospects, isDirector, myUserId, mySellerId, currentUserName]);

  // Busca rápida
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro por status
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modais de Controle
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ProspectClient | null>(null);
  const [statusModalClient, setStatusModalClient] = useState<ProspectClient | null>(null);
  const [historyModalClient, setHistoryModalClient] = useState<ProspectClient | null>(null);

  // Estados do Formulário de Inclusão
  const [formNome, setFormNome] = useState('');
  const [formWhatsApp, setFormWhatsApp] = useState('');
  const [formTipoCliente, setFormTipoCliente] = useState<ClientType>('Cliente Final');
  const [formObservacao, setFormObservacao] = useState('');
  const [formErrors, setFormErrors] = useState<{ nome?: string; whatsapp?: string }>({});

  // Estados do Modal de Edição Básica
  const [editNome, setEditNome] = useState('');
  const [editWhatsApp, setEditWhatsApp] = useState('');
  const [editTipoCliente, setEditTipoCliente] = useState<ClientType>('Cliente Final');

  // Estados do Modal de Alteração de Status
  const [modalNovoStatus, setModalNovoStatus] = useState<ProspectStatus>('Contatado');
  const [modalObservacao, setModalObservacao] = useState('');
  const [modalProximoContato, setModalProximoContato] = useState('');
  const [modalStatusError, setModalStatusError] = useState('');

  // Estados de Nova Interação no Modal de Histórico/Detalhes
  const [newInteractionText, setNewInteractionText] = useState('');
  const [newInteractionNextContact, setNewInteractionNextContact] = useState('');
  const [interactionError, setInteractionError] = useState('');

  // Filtragem da lista
  const filteredProspects = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return userScopedProspects.filter((p) => {
      if (statusFilter !== 'Todos' && p.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const nomeMatch = p.nome.toLowerCase().includes(q);
      const whatsMatch = p.whatsapp.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
      const tipoMatch = (p.tipoCliente || '').toLowerCase().includes(q);
      const respMatch = (p.responsavel || '').toLowerCase().includes(q);
      return nomeMatch || whatsMatch || tipoMatch || respMatch;
    });
  }, [userScopedProspects, searchTerm, statusFilter]);

  // Contagens por status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: userScopedProspects.length };
    PROSPECT_STATUSES.forEach((st) => {
      counts[st] = userScopedProspects.filter((p) => p.status === st).length;
    });
    return counts;
  }, [userScopedProspects]);

  // Paginação idêntica ao layout da tela de Orçamentos
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(filteredProspects.length / itemsPerPage));
  const paginatedProspects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProspects.slice(start, start + itemsPerPage);
  }, [filteredProspects, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Controle de Cards Expandidos (Layout idêntico a Follow-up - Orçamentos)
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandAll = () => {
    const all: Record<string, boolean> = {};
    paginatedProspects.forEach((p) => {
      all[p.id] = true;
    });
    setExpandedClients(all);
  };

  const handleCollapseAll = () => {
    setExpandedClients({});
  };

  // ==========================================
  // 1. INCLUIR CLIENTE
  // ==========================================
  const handleOpenNewModal = () => {
    setFormNome('');
    setFormWhatsApp('');
    setFormTipoCliente('Cliente Final');
    setFormObservacao('');
    setFormErrors({});
    setIsNewModalOpen(true);
  };

  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { nome?: string; whatsapp?: string } = {};

    if (!formNome.trim()) {
      errors.nome = 'Nome / Razão Social é obrigatório.';
    }

    const cleanWhats = formWhatsApp.replace(/\D/g, '');
    if (!cleanWhats || cleanWhats.length < 8) {
      errors.whatsapp = 'WhatsApp válido é obrigatório.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const { dataHora, data, hora } = getCurrentFormattedDateTime();
    const newId = `prosp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const myId = getUserIdByName(currentUserName) || undefined;
    const mySeller = getSellerIdForUser(currentUserName) || undefined;

    const initialHistoryEntry: ProspectHistoryEntry = {
      id: `h_${Date.now()}_init`,
      dataHora,
      data,
      hora,
      usuario: currentUserName,
      statusAnterior: '—',
      novoStatus: 'Novo',
      observacao: formObservacao.trim() || 'Cliente cadastrado na esteira de prospecção.',
      timestamp: Date.now(),
    };

    const newProspect: ProspectClient = {
      id: newId,
      nome: formNome.trim(),
      whatsapp: formatWhatsAppInput(formWhatsApp),
      tipoCliente: formTipoCliente,
      status: 'Novo', // Inicia automaticamente como "Novo"
      dataCadastro: dataHora,
      ultimaAtividade: dataHora,
      responsavel: currentUserName,
      responsavelId: myId,
      criadoPor: currentUserName,
      criadoPorId: myId,
      creatorId: myId,
      vendedorId: mySeller,
      observacaoInicial: formObservacao.trim(),
      historico: [initialHistoryEntry],
    };

    setProspects((prev) => [newProspect, ...prev]);
    saveItemToSupabase(STORAGE_PROSPECTS_KEY, newProspect, 'id', currentUserName).catch(() => {});
    setIsNewModalOpen(false);
    showToast(`✓ Cliente "${newProspect.nome}" incluído na prospecção com sucesso!`);
  };

  // ==========================================
  // 2. EDITAR CLIENTE (BÁSICO)
  // ==========================================
  const handleOpenEdit = (client: ProspectClient) => {
    setEditingClient(client);
    setEditNome(client.nome);
    setEditWhatsApp(client.whatsapp);
    setEditTipoCliente((client.tipoCliente as ClientType) || 'Cliente Final');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (!editNome.trim()) {
      alert('Nome / Razão Social é obrigatório.');
      return;
    }

    let updatedTarget: ProspectClient | null = null;
    const updatedList = prospects.map((p) => {
      if (p.id === editingClient.id) {
        const item: ProspectClient = {
          ...p,
          nome: editNome.trim(),
          whatsapp: formatWhatsAppInput(editWhatsApp),
          tipoCliente: editTipoCliente,
        };
        updatedTarget = item;
        return item;
      }
      return p;
    });

    setProspects(updatedList);
    if (updatedTarget) {
      saveItemToSupabase(STORAGE_PROSPECTS_KEY, updatedTarget, 'id', currentUserName).catch(() => {});
    }
    setEditingClient(null);
    showToast('✓ Dados do cliente atualizados com sucesso!');
  };

  // ==========================================
  // 4. ALTERAÇÃO DE STATUS
  // ==========================================
  const handleOpenStatusModal = (client: ProspectClient) => {
    setStatusModalClient(client);
    // Sugere o próximo status comum ou o primeiro diferente
    const available = PROSPECT_STATUSES.find((s) => s !== client.status) || 'Contatado';
    setModalNovoStatus(available);
    setModalObservacao('');
    setModalProximoContato('');
    setModalStatusError('');
  };

  const handleConfirmStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalClient) return;

    if (!modalObservacao.trim()) {
      setModalStatusError('Por favor, informe uma observação sobre esta movimentação.');
      return;
    }

    const { dataHora, data, hora } = getCurrentFormattedDateTime();
    const formattedProximoContato = modalProximoContato ? formatIsoToDateBr(modalProximoContato) : undefined;

    const newHistoryItem: ProspectHistoryEntry = {
      id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      dataHora,
      data,
      hora,
      usuario: currentUserName,
      statusAnterior: statusModalClient.status,
      novoStatus: modalNovoStatus,
      observacao: modalObservacao.trim(),
      proximoContato: formattedProximoContato,
      timestamp: Date.now(),
    };

    let updatedTarget: ProspectClient | null = null;
    const updatedList = prospects.map((p) => {
      if (p.id === statusModalClient.id) {
        const item: ProspectClient = {
          ...p,
          status: modalNovoStatus,
          ultimaAtividade: dataHora,
          historico: [newHistoryItem, ...(p.historico || [])],
        };
        updatedTarget = item;
        return item;
      }
      return p;
    });

    setProspects(updatedList);
    if (updatedTarget) {
      saveItemToSupabase(STORAGE_PROSPECTS_KEY, updatedTarget, 'id', currentUserName).catch(() => {});
    }

    // Se o modal de histórico estiver aberto no mesmo cliente, atualiza ele também
    if (historyModalClient && historyModalClient.id === statusModalClient.id) {
      setHistoryModalClient({
        ...historyModalClient,
        status: modalNovoStatus,
        ultimaAtividade: dataHora,
        historico: [newHistoryItem, ...(historyModalClient.historico || [])],
      });
    }

    setStatusModalClient(null);
    showToast(`✓ Status alterado para "${modalNovoStatus}" com sucesso!`);
  };

  // ==========================================
  // 5 & 6. HISTÓRICO E DETALHES DO CLIENTE
  // ==========================================
  const handleOpenHistory = (client: ProspectClient) => {
    setHistoryModalClient(client);
    setNewInteractionText('');
    setNewInteractionNextContact('');
    setInteractionError('');
  };

  // Adicionar nova movimentação/observação dentro da tela de detalhes
  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyModalClient) return;

    if (!newInteractionText.trim()) {
      setInteractionError('Escreva a observação ou resumo da interação.');
      return;
    }

    const { dataHora, data, hora } = getCurrentFormattedDateTime();
    const formattedProximo = newInteractionNextContact ? formatIsoToDateBr(newInteractionNextContact) : undefined;

    const newEntry: ProspectHistoryEntry = {
      id: `h_${Date.now()}_int`,
      dataHora,
      data,
      hora,
      usuario: currentUserName,
      statusAnterior: historyModalClient.status,
      novoStatus: historyModalClient.status,
      observacao: newInteractionText.trim(),
      proximoContato: formattedProximo,
      timestamp: Date.now(),
    };

    const updatedClient: ProspectClient = {
      ...historyModalClient,
      ultimaAtividade: dataHora,
      historico: [newEntry, ...(historyModalClient.historico || [])],
    };

    setProspects((prev) => prev.map((p) => (p.id === updatedClient.id ? updatedClient : p)));
    setHistoryModalClient(updatedClient);
    saveItemToSupabase(STORAGE_PROSPECTS_KEY, updatedClient, 'id', currentUserName).catch(() => {});
    setNewInteractionText('');
    setNewInteractionNextContact('');
    setInteractionError('');
    showToast('✓ Nova movimentação registrada no histórico!');
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-slate-800 shadow-md flex items-center gap-3 animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-900">{toastMessage}</p>
        </div>
      )}

      {/* 1. Header Section: Title & Actions (Layout idêntico a Orçamentos) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Icon Badge & Title */}
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1c3d] flex items-center justify-center flex-shrink-0 shadow-sm">
            <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0c1e3c] tracking-tight">
              Prospecção de Clientes
            </h1>
            <p className="text-xs sm:text-sm text-[#4b6b94] mt-0.5 font-normal">
              Cadastre novos contatos, acompanhe o histórico e impulsione as negociações.
            </p>
          </div>
        </div>

        {/* Right: Incluir Cliente Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="h-10 px-4 sm:px-5 rounded-xl bg-[#0066ff] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <span>Incluir Cliente</span>
          </button>
        </div>
      </div>

      {/* 2. Filtros Rápidos de Status (Idêntico a Follow-up - Orçamentos) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar select-none">
        {['Todos', ...PROSPECT_STATUSES].map((st) => {
          const isActive = statusFilter === st;
          const count = statusCounts[st] || 0;
          return (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                if (searchTerm) setSearchTerm('');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                  : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
              }`}
            >
              <span>{st}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-[#003d99] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Barra de Busca e Controle de Expansão (Idêntico a Follow-up - Orçamentos) */}
      <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, whatsapp ou tipo..."
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

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span>
              Exibindo <strong className="text-slate-900 font-bold">{filteredProspects.length}</strong>{' '}
              {filteredProspects.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Expandir todos
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Recolher todos
            </button>
          </div>

          {(searchTerm || statusFilter !== 'Todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('Todos');
              }}
              className="inline-flex items-center gap-1 font-semibold text-[#0052cc] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Lista de Cards por Cliente (Layout idêntico a Follow-up - Orçamentos) */}
      {paginatedProspects.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <UserPlus className="w-7 h-7" />
          </div>
          <p className="font-bold text-slate-800 text-base">
            Nenhum cliente encontrado na prospecção.
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'Todos'
              ? 'Tente alterar os termos de busca ou remover o filtro de status selecionado.'
              : 'Cadastre novos contatos comerciais para iniciar o acompanhamento e negociação.'}
          </p>
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0052cc] hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Incluir Cliente
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedProspects.map((client) => {
            const isExpanded = !!expandedClients[client.id];
            const visual = getClientTypeVisual(client.tipoCliente);
            const TypeIcon = visual.Icon;
            const cleanWhats = client.whatsapp.replace(/\D/g, '');
            const template = getWhatsAppMessageTemplate('Follow-up de Prospecção');
            const message = formatWhatsAppMessage(template, client.nome);
            const waUrl = cleanWhats ? `https://wa.me/55${cleanWhats}?text=${encodeURIComponent(message)}` : null;
            const telUrl = cleanWhats ? `tel:${cleanWhats}` : null;

            return (
              <div
                key={client.id}
                className={`rounded-[22px] sm:rounded-[26px] border ${visual.cardBorder} ${visual.cardBg} shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all overflow-hidden`}
              >
                {/* CABEÇALHO DO CARD DO CLIENTE (RESUMO): */}
                <div
                  onClick={() => toggleCard(client.id)}
                  className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none ${visual.headerHover} transition-colors`}
                >
                  {/* Esquerda: Ícone do tipo + Tipo de cliente + Nome do cliente + Responsável */}
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${visual.iconBg}`}>
                      <TypeIcon className="w-5 h-5 stroke-[2]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${visual.badgeBg}`}>
                          {client.tipoCliente || 'Cliente Final'}
                        </span>
                        {renderProspectStatusBadge(client.status)}
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#091122] tracking-tight truncate">
                        {client.nome}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Responsável: <strong className="text-slate-700">{client.responsavel}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Direita: WhatsApp + Ligação + Última Atividade + Seta de Expansão */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.06]">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8.5 px-2.5 sm:px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Conversar no WhatsApp"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden md:inline font-mono">{client.whatsapp}</span>
                        <span className="md:hidden">WhatsApp</span>
                      </a>
                    )}

                    {telUrl && (
                      <a
                        href={telUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8.5 px-2.5 sm:px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        title={`Fazer Ligação (${client.whatsapp})`}
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-[#0052cc]" />
                        <span>Ligação</span>
                      </a>
                    )}

                    <div className="text-left sm:text-right min-w-[90px]">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Última Atividade
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {formatDateOnlyNoTime(client.ultimaAtividade || client.dataCadastro)}
                      </span>
                    </div>

                    <div
                      className={`w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-2xs border border-black/[0.05] ${
                        isExpanded ? 'rotate-180 bg-white text-[#0052cc]' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* ÁREA EXPANDIDA DO CARD (DETALHES E AÇÕES): */}
                {isExpanded && (
                  <div className="border-t border-black/[0.06] bg-white/40 p-4 sm:p-6 space-y-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
                      {/* Grid de Informações de Contato */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Contato / WhatsApp
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                            {client.whatsapp || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                            E-mail
                          </span>
                          <span className="font-medium text-slate-700 mt-0.5 block truncate">
                            {client.email || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Data de Cadastro
                          </span>
                          <span className="font-medium text-slate-700 mt-0.5 block">
                            {client.dataCadastro}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Total de Interações
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 block">
                            {client.historico?.length || 0} registro(s)
                          </span>
                        </div>
                      </div>

                      {/* Observações / Anotações */}
                      {client.observacoes && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Anotações / Observações:
                          </span>
                          <p className="whitespace-pre-line leading-relaxed">{client.observacoes}</p>
                        </div>
                      )}

                      {/* Barra de Ações Rápidas */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(client)}
                            className="h-9 px-3.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-[#0052cc] text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#0052cc]" />
                            <span>Alterar Status ({client.status})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenHistory(client)}
                            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5 text-slate-600" />
                            <span>Histórico & Movimentações</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(client)}
                            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Editar</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Conversar no WhatsApp</span>
                            </a>
                          )}

                          {telUrl && (
                            <a
                              href={telUrl}
                              className="h-9 px-4 rounded-xl bg-[#0052cc] hover:bg-[#0042a3] text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                              title={`Fazer Ligação (${client.whatsapp})`}
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Ligação</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Rodapé com Paginação */}
      {filteredProspects.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500 font-medium">
            Exibindo{' '}
            <strong className="text-slate-800 font-bold">
              {(currentPage - 1) * itemsPerPage + 1}
              -
              {Math.min(currentPage * itemsPerPage, filteredProspects.length)}
            </strong>{' '}
            de{' '}
            <strong className="text-slate-800 font-bold">
              {filteredProspects.length}
            </strong>{' '}
            clientes prospectados
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
                  currentPage === pageNum
                    ? 'bg-[#0052cc] text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 1: INCLUIR CLIENTE
      ========================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center border border-blue-100">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Incluir Cliente em Prospecção</h3>
                  <p className="text-xs text-slate-500">Cadastre um novo cliente prospectado na esteira</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveNewClient} className="p-6 space-y-4">
              {/* Nome / Razão Social */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => {
                    setFormNome(e.target.value);
                    if (formErrors.nome) setFormErrors({ ...formErrors, nome: undefined });
                  }}
                  placeholder="Ex: Construtora Almeida Silva Ltda"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0052cc] transition-all"
                />
                {formErrors.nome && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{formErrors.nome}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formWhatsApp}
                  onChange={(e) => {
                    setFormWhatsApp(formatWhatsAppInput(e.target.value));
                    if (formErrors.whatsapp) setFormErrors({ ...formErrors, whatsapp: undefined });
                  }}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-[#0052cc] transition-all"
                />
                {formErrors.whatsapp && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{formErrors.whatsapp}</p>
                )}
              </div>

              {/* Grid: Tipo de Cliente & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Tipo de Cliente */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Cliente <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTipoCliente}
                    onChange={(e) => setFormTipoCliente(e.target.value as ClientType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-[#0052cc] transition-all cursor-pointer"
                  >
                    {PROSPECT_CLIENT_TYPES.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status — Inicia automaticamente como "Novo" */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Inicial
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/70 text-sm font-bold text-[#0052cc] flex items-center justify-between">
                    <span>Novo</span>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-full">
                      Automático
                    </span>
                  </div>
                </div>
              </div>

              {/* Observação Inicial — opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observação Inicial <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  placeholder="Ex: Como conheceu a empresa, primeiro contato ou notas de prospecção..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0052cc] transition-all resize-none"
                />
              </div>

              {/* Rodapé */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0052cc] hover:bg-[#0043a8] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: EDITAR DADOS BÁSICOS
      ========================================== */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-base font-bold text-slate-900">Editar Prospecção</h3>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome / Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0052cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={editWhatsApp}
                  onChange={(e) => setEditWhatsApp(formatWhatsAppInput(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-[#0052cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Cliente
                </label>
                <select
                  value={editTipoCliente}
                  onChange={(e) => setEditTipoCliente(e.target.value as ClientType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-[#0052cc] cursor-pointer"
                >
                  {PROSPECT_CLIENT_TYPES.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0052cc] hover:bg-[#0043a8] text-white text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: ALTERAR STATUS
          (Janela simples contendo: Status atual, Novo status, Observação, Próximo contato)
      ========================================== */}
      {statusModalClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Alterar Status</h3>
                  <p className="text-xs text-slate-500">{statusModalClient.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="p-6 space-y-4">
              {/* Status Atual */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Status Atual
                </label>
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 flex items-center justify-between">
                  <span>{statusModalClient.status}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-lg border ${getStatusBadge(statusModalClient.status)}`}>
                    Atual
                  </span>
                </div>
              </div>

              {/* Novo Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Novo Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalNovoStatus}
                  onChange={(e) => setModalNovoStatus(e.target.value as ProspectStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0052cc] cursor-pointer"
                >
                  {PROSPECT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observação (registrada junto com a alteração) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observação da Movimentação <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={modalObservacao}
                  onChange={(e) => {
                    setModalObservacao(e.target.value);
                    if (modalStatusError) setModalStatusError('');
                  }}
                  placeholder="Ex: Realizei a ligação. Cliente demonstrou interesse e pediu o catálogo."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0052cc] resize-none"
                />
                {modalStatusError && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{modalStatusError}</p>
                )}
              </div>

              {/* Próximo Contato (opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Próximo Contato <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={modalProximoContato}
                  onChange={(e) => setModalProximoContato(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0052cc]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Se ainda não souber quando contatar novamente, pode deixar em branco.
                </p>
              </div>

              {/* Rodapé */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusModalClient(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0052cc] hover:bg-[#0043a8] text-white text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Salvar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: DETALHES DO CLIENTE E HISTÓRICO COMPLETO
          (Nome, WhatsApp, Tipo, Status atual, Data de cadastro, Última atividade, Responsável, Seção HISTÓRICO cronológico)
      ========================================== */}
      {historyModalClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center border border-blue-100 flex-shrink-0">
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {historyModalClient.nome}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(historyModalClient.status)}`}>
                      {historyModalClient.status}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getClientTypeBadge(historyModalClient.tipoCliente)}`}>
                      {historyModalClient.tipoCliente}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHistoryModalClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              {/* Painel de Informações Rápidas do Cliente */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">WhatsApp</span>
                  {historyModalClient.whatsapp ? (() => {
                    const template = getWhatsAppMessageTemplate('Follow-up de Prospecção');
                    const message = formatWhatsAppMessage(template, historyModalClient.nome);
                    const modalWaUrl = `https://wa.me/55${historyModalClient.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                    return (
                      <a
                        href={modalWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#0052cc] hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>{historyModalClient.whatsapp}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    );
                  })() : (
                    <span className="font-semibold text-slate-700 mt-0.5 block">—</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Data de Cadastro</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDateOnlyNoTime(historyModalClient.dataCadastro)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Última Atividade</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDateOnlyNoTime(historyModalClient.ultimaAtividade || historyModalClient.dataCadastro)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Responsável</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {historyModalClient.responsavel || 'Vanessa Gomes'}
                  </span>
                </div>
              </div>

              {/* Formulário Rápido de Nova Interação / Observação */}
              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0052cc]">
                    <MessageSquare className="w-4 h-4" />
                    <span>Registrar Nova Interação / Observação</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal(historyModalClient)}
                    className="text-xs font-bold text-[#0052cc] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Alterar Status</span>
                  </button>
                </div>

                <form onSubmit={handleAddInteraction} className="space-y-2.5">
                  <textarea
                    rows={2}
                    value={newInteractionText}
                    onChange={(e) => {
                      setNewInteractionText(e.target.value);
                      if (interactionError) setInteractionError('');
                    }}
                    placeholder="Escreva a nova observação, ligação, mensagem de WhatsApp ou avanço..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0052cc] resize-none"
                  />
                  {interactionError && (
                    <p className="text-xs text-rose-500 font-medium">{interactionError}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 whitespace-nowrap">Próximo contato (opcional):</span>
                      <input
                        type="date"
                        value={newInteractionNextContact}
                        onChange={(e) => setNewInteractionNextContact(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0052cc]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#0052cc] hover:bg-[#0043a8] text-white text-xs font-bold transition-colors cursor-pointer self-end sm:self-auto"
                    >
                      Salvar Interação
                    </button>
                  </div>
                </form>
              </div>

              {/* Seção HISTÓRICO (Em ordem cronológica: da mais recente para a mais antiga) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>HISTÓRICO</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    {historyModalClient.historico?.length || 0} {historyModalClient.historico?.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>

                {(!historyModalClient.historico || historyModalClient.historico.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhum histórico registrado.</p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {historyModalClient.historico.map((entry, index) => {
                      const hasStatusChange = entry.statusAnterior && entry.statusAnterior !== '—' && entry.statusAnterior !== entry.novoStatus;

                      return (
                        <div key={entry.id || index} className="relative pl-8 text-xs">
                          {/* Dot na linha do tempo */}
                          <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#0052cc] -translate-x-1/2" />

                          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-1.5">
                            {/* Data e hora — Usuário responsável */}
                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-800">
                                {entry.dataHora || entry.data} — <span className="text-[#0052cc]">{entry.usuario}</span>
                              </span>
                              {entry.hora && !entry.dataHora?.includes(':') && (
                                <span>{entry.hora}</span>
                              )}
                            </div>

                            {/* Status anterior -> Novo status */}
                            {hasStatusChange ? (
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <span className="text-slate-500">{entry.statusAnterior}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[#0052cc]">{entry.novoStatus}</span>
                              </div>
                            ) : (
                              <div className="font-bold text-xs text-slate-700">
                                Status: <span className="text-[#0052cc]">{entry.novoStatus}</span>
                              </div>
                            )}

                            {/* Observação */}
                            {entry.observacao && (
                              <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                "{entry.observacao}"
                              </p>
                            )}

                            {/* Próximo contato quando informado */}
                            {entry.proximoContato && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold pt-0.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                <span>Próximo contato: <strong>{entry.proximoContato}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalClient(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
