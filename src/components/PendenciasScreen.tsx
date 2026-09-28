import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Pencil,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Calendar,
  User,
  Hash,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { PendenciaItem, PendenciaStatus } from '../types';
import { UserAvatar } from './UserAvatar';
import { sendUserNotification } from '../utils/notifications';
import { playUserCustomSoundForCategory } from '../utils/userNotificationPreferences';
import { getUserIdByName } from '../utils/auth';
import { areUsersEqualOrRelated, isPendenciaVisibleToUser } from '../utils/userDataFilter';
import {
  saveItemToSupabase,
  deleteItemFromSupabase,
  deduplicateListById,
  getSupabaseClient,
} from '../utils/supabaseClient';

interface PendenciasScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const STORAGE_KEY = 'fenix_pendencias_v1';

const INITIAL_PENDENCIAS: PendenciaItem[] = [];

type FilterPill = 'Abertas' | 'Em andamento' | 'Resolvidas' | 'Todas';

export const PendenciasScreen: React.FC<PendenciasScreenProps> = ({
  currentUserName = 'Vanessa Gomes',
  onBackToCadastro,
  onNavigateTab,
}) => {
  const isDirector =
    currentUserName.toLowerCase().includes('eder') ||
    currentUserName.toLowerCase().includes('diretor');

  // Estado de persistência local
  const [pendencias, setPendencias] = useState<PendenciaItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateListById(parsed, 'id');
      }
    } catch {
      // fallback
    }
    return [];
  });

  const isLoadedRef = useRef(false);

  // Initial load from Supabase to guarantee central truth across devices
  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const client = getSupabaseClient();
        if (client) {
          const { data: row } = await client
            .from('fenix_kv_store')
            .select('data')
            .eq('key', STORAGE_KEY)
            .maybeSingle();

          if (row && Array.isArray(row.data)) {
            const dedupedRemote = deduplicateListById(row.data, 'id');
            setPendencias((prev) => {
              const merged = deduplicateListById([...prev, ...dedupedRemote], 'id');
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar pendências:', err);
      } finally {
        isLoadedRef.current = true;
      }
    };
    fetchRemote();
  }, []);

  // Listen to remote changes / Realtime events
  useEffect(() => {
    const reloadPendencias = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const deduped = deduplicateListById(parsed, 'id');
            setPendencias((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(deduped)) return prev;
              return deduped;
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao recarregar pendências:', err);
      }
    };

    window.addEventListener('fenix_pendencias_updated', reloadPendencias);
    window.addEventListener('storage', reloadPendencias);
    return () => {
      window.removeEventListener('fenix_pendencias_updated', reloadPendencias);
      window.removeEventListener('storage', reloadPendencias);
    };
  }, []);

  // Data dinâmica atual no formato YYYY-MM-DD
  const getDynamicTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtro de aba ativo ("Abertas" por padrão)
  const [activeTab, setActiveTab] = useState<FilterPill>('Abertas');

  // Filtro específico do Diretor: 'Todas' | 'Atribuidas' | 'CriadasPorMim' (padrão 'Todas' para visibilidade total)
  const [directorScopeFilter, setDirectorScopeFilter] = useState<'Atribuidas' | 'Todas' | 'CriadasPorMim'>('Todas');

  // Busca em tempo real
  const [searchTerm, setSearchTerm] = useState('');

  // Modal / Drawer de Criar / Editar Pendência
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PendenciaItem | null>(null);

  // Modal de Detalhes
  const [viewingItem, setViewingItem] = useState<PendenciaItem | null>(null);

  // Mensagem toast de feedback
  const [toastMessage, setToastMessage] = useState<string>('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Helper para notificar no sino e tocar som da pendência
  const notifyAssignedUserPendencia = (
    pendenciaDesc: string,
    author: string,
    recipient: string,
    pedido?: string,
    cliente?: string
  ) => {
    try {
      const cleanPed = pedido && pedido !== '-' ? `Pedido #${pedido}` : null;
      const cleanCli = cliente && cliente !== '-' ? `Cliente: ${cliente}` : null;
      const extra = [cleanPed, cleanCli].filter(Boolean).join(' • ');
      const targetUser = (!recipient || recipient === 'Geral') ? 'Todos' : recipient;

      sendUserNotification({
        category: 'Pendências',
        title: `Pendência: ${pendenciaDesc.length > 40 ? pendenciaDesc.slice(0, 40) + '...' : pendenciaDesc}`,
        description: `${pendenciaDesc}${extra ? ` (${extra})` : ''}. Atribuída a ${targetUser} por ${author}.`,
        targetTab: 'Pendências',
        recipientName: targetUser,
        recipientId: targetUser !== 'Todos' ? (getUserIdByName(targetUser) || undefined) : undefined,
        authorName: author,
        authorId: getUserIdByName(author) || undefined,
        metadata: { pedido, cliente, pendencia: pendenciaDesc },
      });

      // Toca o som de notificação de Pendências de forma imediata e garantida
      playUserCustomSoundForCategory(currentUserName, 'pendencias');
    } catch (err) {
      console.error('Erro ao notificar responsável da pendência:', err);
    }
  };

  // Formulário Modal
  const [formData, setFormData] = useState({
    pendencia: '',
    cliente: '',
    pedido: '',
    data: getDynamicTodayDate(),
    status: 'Pendente' as PendenciaStatus,
    observacao: '',
    atribuidoA: 'Eder Perez', // Padrão: facilita Vanessa ou Jhessica atribuírem a ele
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Resetar / Abrir Modal de Criação
  const handleOpenCreateModal = () => {
    const dynamicToday = getDynamicTodayDate();
    setEditingItem(null);
    setFormData({
      pendencia: '',
      cliente: '',
      pedido: '',
      data: dynamicToday,
      status: 'Pendente',
      observacao: '',
      atribuidoA: isDirector ? 'Eder Perez' : 'Eder Perez',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Abrir Modal de Edição
  const handleOpenEditModal = (item: PendenciaItem) => {
    setEditingItem(item);
    setFormData({
      pendencia: item.pendencia || '',
      cliente: item.cliente === '-' ? '' : (item.cliente || ''),
      pedido: item.pedido === '-' ? '' : (item.pedido || ''),
      data: item.data || getDynamicTodayDate(),
      status: item.status || 'Pendente',
      observacao: item.observacao || '',
      atribuidoA: item.atribuidoA || 'Eder Perez',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Salvar Criação ou Edição
  const handleSavePendencia = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.pendencia.trim()) {
      errors.pendencia = 'Informe o que precisa ser resolvido.';
    }
    if (!formData.data) {
      errors.data = 'Informe a data da pendência.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Tratamento do número do pedido: sem "#"
    const cleanPedido = formData.pedido.trim().replace(/#/g, '');
    const isAssignedToDirector = formData.atribuidoA?.toLowerCase().includes('eder');
    const myUserId = getUserIdByName(currentUserName) || undefined;
    const respUserId = getUserIdByName(formData.atribuidoA) || undefined;

    if (editingItem) {
      // Edição
      const updatedItem: PendenciaItem = {
        ...editingItem,
        pendencia: formData.pendencia.trim(),
        cliente: formData.cliente.trim() || '-',
        pedido: cleanPedido || '-',
        data: formData.data,
        status: formData.status,
        observacao: formData.observacao.trim(),
        atribuidoA: formData.atribuidoA,
        responsavel: formData.atribuidoA,
        responsavelId: respUserId || editingItem.responsavelId,
        atribuidoAId: respUserId || (editingItem as any).atribuidoAId,
        criadoPor: editingItem.criadoPor || currentUserName,
        criadoPorId: editingItem.criadoPorId || (editingItem as any).creatorId || myUserId,
        creatorId: (editingItem as any).creatorId || editingItem.criadoPorId || myUserId,
        updatedAt: new Date().toISOString(),
      };

      setPendencias((prev) => {
        const next = deduplicateListById(prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)), 'id');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Salva item individualmente no Supabase com ID fixo
      saveItemToSupabase(STORAGE_KEY, updatedItem, 'id', currentUserName).catch(() => {});

      notifyAssignedUserPendencia(
        formData.pendencia.trim(),
        currentUserName,
        formData.atribuidoA || 'Todos',
        cleanPedido,
        formData.cliente.trim()
      );
      showToast(
        formData.atribuidoA && formData.atribuidoA !== 'Geral'
          ? `✓ Pendência atualizada e notificação direcionada para ${formData.atribuidoA}!`
          : '✓ Pendência atualizada com sucesso!'
      );
    } else {
      // Nova Pendência: gera 1 novo ID único
      const newItem: PendenciaItem = {
        id: `pend_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        pendencia: formData.pendencia.trim(),
        cliente: formData.cliente.trim() || '-',
        pedido: cleanPedido || '-',
        data: formData.data,
        status: formData.status,
        observacao: formData.observacao.trim(),
        criadoPor: currentUserName,
        criadoPorId: myUserId,
        creatorId: myUserId,
        atribuidoA: formData.atribuidoA,
        responsavel: formData.atribuidoA,
        responsavelId: respUserId,
        atribuidoAId: respUserId,
        notificadoDiretor: isAssignedToDirector,
        createdAt: new Date().toISOString(),
      };

      setPendencias((prev) => {
        const next = deduplicateListById([newItem, ...prev], 'id');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Salva item individualmente no Supabase
      saveItemToSupabase(STORAGE_KEY, newItem, 'id', currentUserName).catch(() => {});

      notifyAssignedUserPendencia(
        formData.pendencia.trim(),
        currentUserName,
        formData.atribuidoA || 'Todos',
        cleanPedido,
        formData.cliente.trim()
      );
      showToast(
        formData.atribuidoA && formData.atribuidoA !== 'Geral'
          ? `✓ Pendência cadastrada e notificação direcionada para ${formData.atribuidoA}!`
          : '✓ Nova pendência cadastrada com sucesso!'
      );
    }

    setIsModalOpen(false);
  };

  // Excluir pendência
  const handleDeletePendencia = (id: string) => {
    setPendencias((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    deleteItemFromSupabase(STORAGE_KEY, id, 'id', currentUserName).catch(() => {});
    showToast('Pendência excluída da lista.');
  };

  // Alteração de status DIRETO NA TABELA
  // Regra: "Ao mudar o status (ex: de 'Pendente' para 'Resolvida'), se a aba de filtro 'Abertas' estiver ativa,
  // a pendência deve sair imediatamente dessa visão e ir para a aba correspondente ('Resolvidas')."
  const handleStatusChange = (id: string, newStatus: PendenciaStatus) => {
    let updatedTarget: PendenciaItem | null = null;
    setPendencias((prev) => {
      const next = prev.map((item) => {
        if (item.id === id) {
          updatedTarget = {
            ...item,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
          return updatedTarget;
        }
        return item;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (updatedTarget) {
      saveItemToSupabase(STORAGE_KEY, updatedTarget, 'id', currentUserName).catch(() => {});
      const desc = (updatedTarget as PendenciaItem).pendencia;
      sendUserNotification({
        category: 'Pendências',
        title: `Pendência ${newStatus}: ${desc.length > 35 ? desc.slice(0, 35) + '...' : desc}`,
        description: `O status da pendência "${desc}" foi alterado para "${newStatus}" por ${currentUserName}.`,
        targetTab: 'Pendências',
        recipientName: (updatedTarget as PendenciaItem).atribuidoA || 'Todos',
        authorName: currentUserName,
        metadata: { id, status: newStatus },
      });
      playUserCustomSoundForCategory(currentUserName, 'pendencias');
    }
    showToast(`Status alterado para "${newStatus}"!`);
  };

  // Formatação de data DD/MM/AAAA
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Escopo de visibilidade:
  // REGRA DE VISIBILIDADE ESTRITA:
  // Uma pendência deve aparecer SOMENTE para:
  // 1. Quem criou a pendência;
  // 2. Quem recebeu a pendência / foi atribuído como responsável.
  // Todos os demais usuários do CRM NÃO devem visualizar essa pendência.
  const userScopedPendencias = useMemo(() => {
    return pendencias.filter((item) => {
      // Regra estrita: apenas quem criou ou foi atribuído como responsável visualiza
      const isVisible = isPendenciaVisibleToUser(item, currentUserName);
      if (!isVisible) return false;

      // Se for o Diretor Éder navegando em seus sub-filtros de visão
      if (isDirector) {
        if (directorScopeFilter === 'Atribuidas') {
          return (
            areUsersEqualOrRelated(item.atribuidoA, 'Eder') ||
            areUsersEqualOrRelated(item.responsavel, 'Eder')
          );
        } else if (directorScopeFilter === 'CriadasPorMim') {
          return areUsersEqualOrRelated(item.criadoPor, 'Eder');
        }
      }

      return true;
    });
  }, [pendencias, isDirector, directorScopeFilter, currentUserName]);

  // Contadores para as abas baseados no escopo visível
  const counts = useMemo(() => {
    const abertas = userScopedPendencias.filter((p) => p.status !== 'Resolvida').length;
    const emAndamento = userScopedPendencias.filter((p) => p.status === 'Em andamento').length;
    const resolvidas = userScopedPendencias.filter((p) => p.status === 'Resolvida').length;
    const todas = userScopedPendencias.length;
    return { abertas, emAndamento, resolvidas, todas };
  }, [userScopedPendencias]);

  const countAtribuidasAoDiretor = useMemo(() => {
    return userScopedPendencias.filter(
      (p) =>
        (areUsersEqualOrRelated(p.atribuidoA, 'Eder') ||
          areUsersEqualOrRelated(p.responsavel, 'Eder')) &&
        p.status !== 'Resolvida'
    ).length;
  }, [userScopedPendencias]);

  // Filtragem dos itens baseado na aba ativa, busca e escopo
  const filteredPendencias = useMemo(() => {
    return userScopedPendencias.filter((item) => {
      // Filtro de aba de status
      if (activeTab === 'Abertas') {
        if (item.status === 'Resolvida') return false;
      } else if (activeTab === 'Em andamento') {
        if (item.status !== 'Em andamento') return false;
      } else if (activeTab === 'Resolvidas') {
        if (item.status !== 'Resolvida') return false;
      }

      // Filtro de busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchPendencia = item.pendencia.toLowerCase().includes(query);
        const matchCliente = item.cliente?.toLowerCase().includes(query);
        const matchPedido = item.pedido?.toLowerCase().includes(query);
        const matchObs = item.observacao?.toLowerCase().includes(query);
        const matchAtribuido = item.atribuidoA?.toLowerCase().includes(query);
        const matchCriado = item.criadoPor?.toLowerCase().includes(query);
        const matchData = formatDateBR(item.data).includes(query);
        if (
          !matchPendencia &&
          !matchCliente &&
          !matchPedido &&
          !matchObs &&
          !matchData &&
          !matchAtribuido &&
          !matchCriado
        ) {
          return false;
        }
      }

      return true;
    });
  }, [pendencias, activeTab, searchTerm, isDirector, directorScopeFilter, currentUserName]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 text-slate-800 font-sans">
      {/* Toast flutuante de feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B2046] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm border border-slate-700 animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Card quadrado com borda azul e ícone de prancheta com marcador */}
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/90 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 shadow-xs">
            <ClipboardCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pendências
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Organize tudo o que precisa ser resolvido.
            </p>
          </div>
        </div>

        {/* Botão superior direito: Nova Pendência (azul royal sólido, rounded-xl) */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer flex-shrink-0 self-start sm:self-center"
        >
          <span>Nova Pendência</span>
        </button>
      </div>

      {/* BANNER EXCLUSIVO DO DIRETOR (EDER PEREZ) */}
      {isDirector && (
        <div className="bg-gradient-to-r from-amber-50 via-blue-50 to-indigo-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">Painel do Diretor — Eder Perez</p>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                  Envolvido
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Exibindo apenas pendências criadas por você ou atribuídas sob sua responsabilidade.
              </p>
            </div>
          </div>

          {/* Seletor de Escopo do Diretor */}
          <div className="flex items-center gap-1.5 overflow-x-auto select-none pt-1 md:pt-0">
            <button
              type="button"
              onClick={() => setDirectorScopeFilter('Atribuidas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                directorScopeFilter === 'Atribuidas'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Atribuídas a Mim</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                directorScopeFilter === 'Atribuidas' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {countAtribuidasAoDiretor}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDirectorScopeFilter('Todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                directorScopeFilter === 'Todas'
                  ? 'bg-[#1D4ED8] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Minhas Pendências
            </button>
            <button
              type="button"
              onClick={() => setDirectorScopeFilter('CriadasPorMim')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                directorScopeFilter === 'CriadasPorMim'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Criadas por Mim
            </button>
          </div>
        </div>
      )}

      {/* 2. BARRA DE FILTROS E BUSCA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Pílulas de filtro à esquerda */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar select-none">
          {/* Pílula Abertas (Ativa por padrão com fundo azul royal e texto branco) */}
          <button
            type="button"
            onClick={() => setActiveTab('Abertas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Abertas'
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Abertas</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'Abertas' ? 'bg-blue-600/60 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {counts.abertas}
            </span>
          </button>

          {/* Pílula Em andamento (Fundo branco, borda sutil, texto slate-700) */}
          <button
            type="button"
            onClick={() => setActiveTab('Em andamento')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Em andamento'
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Em andamento</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'Em andamento' ? 'bg-blue-600/60 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {counts.emAndamento}
            </span>
          </button>

          {/* Pílula Resolvidas (Fundo branco, borda sutil, texto slate-700) */}
          <button
            type="button"
            onClick={() => setActiveTab('Resolvidas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Resolvidas'
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Resolvidas</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'Resolvidas' ? 'bg-blue-600/60 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {counts.resolvidas}
            </span>
          </button>

          {/* Pílula Todas (Fundo branco, borda sutil, texto slate-700) */}
          <button
            type="button"
            onClick={() => setActiveTab('Todas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Todas'
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>Todas</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'Todas' ? 'bg-blue-600/60 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {counts.todas}
            </span>
          </button>
        </div>

        {/* Campo de busca à direita: Input com ícone de lupa e placeholder "Buscar na lista..." */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar na lista..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. TABELA DE PENDÊNCIAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6 w-28">Data</th>
                <th className="py-3.5 px-4 sm:px-6">Pendência</th>
                <th className="py-3.5 px-4 sm:px-6 w-44">Atribuído a</th>
                <th className="py-3.5 px-4 sm:px-6">Cliente</th>
                <th className="py-3.5 px-4 sm:px-6 w-28">Pedido</th>
                <th className="py-3.5 px-4 sm:px-6 w-40">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredPendencias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto mb-3 border border-blue-100">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      Nenhuma pendência encontrada
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchTerm
                        ? `Nenhum resultado corresponde ao termo "${searchTerm}".`
                        : `Não há pendências cadastradas na aba "${activeTab}".`}
                    </p>
                    {(searchTerm || activeTab !== 'Abertas') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setActiveTab('Abertas');
                        }}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                      >
                        Ver Pendências Abertas
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPendencias.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. Data: Formato DD/MM/AAAA em tom azul suave */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap font-medium text-[#2563EB]">
                        {formatDateBR(item.data)}
                      </td>

                      {/* 2. Pendência: Descrição clara do que precisa ser resolvido */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {item.pendencia}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.observacao && (
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {item.observacao}
                            </span>
                          )}
                          {item.criadoPor && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              • Por: {item.criadoPor}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Atribuído a: Badge estilizado com Avatar Oficial */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {item.atribuidoA?.toLowerCase().includes('eder') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
                            <UserAvatar userName="Eder Perez" size="xs" />
                            <span>Eder Perez (Diretor)</span>
                          </span>
                        ) : item.atribuidoA && item.atribuidoA !== '-' && item.atribuidoA !== 'Geral' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
                            <UserAvatar userName={item.atribuidoA} size="xs" />
                            <span>{item.atribuidoA}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-normal">
                            <span>🏢</span>
                            <span>Equipe Geral</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Cliente: Nome da empresa ou cliente ou "-" */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium whitespace-nowrap">
                        {item.cliente && item.cliente.trim() !== '-' ? (
                          <span className="text-slate-800">{item.cliente}</span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* 5. Pedido: Apenas o número puro (ex: 1042, 1058) ou "-" sem '#' */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {item.pedido && item.pedido.trim() !== '-' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-mono text-xs font-bold text-slate-700">
                            {item.pedido.replace(/#/g, '')}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono font-medium">-</span>
                        )}
                      </td>

                      {/* 6. Status: Dropdown interativo em badge com ponto indicador */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="relative inline-block w-36">
                          {/* Ponto indicador de status posicionado sobre o badge */}
                          <span
                            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${
                              item.status === 'Pendente'
                                ? 'bg-[#D97706]'
                                : item.status === 'Em andamento'
                                ? 'bg-[#2563EB]'
                                : 'bg-[#16A34A]'
                            }`}
                          />
                          <select
                            value={item.status || 'Pendente'}
                            onChange={(e) =>
                              handleStatusChange(item.id, e.target.value as PendenciaStatus)
                            }
                            className={`w-full appearance-none pl-6 pr-6 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              item.status === 'Pendente'
                                ? 'bg-[#FEF3C7] text-[#D97706] border-amber-200 hover:bg-amber-100'
                                : item.status === 'Em andamento'
                                ? 'bg-[#DBEAFE] text-[#2563EB] border-blue-200 hover:bg-blue-100'
                                : 'bg-[#DCFCE7] text-[#16A34A] border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Resolvida">Resolvida</option>
                          </select>
                          <ChevronDown
                            className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                              item.status === 'Pendente'
                                ? 'text-[#D97706]'
                                : item.status === 'Em andamento'
                                ? 'text-[#2563EB]'
                                : 'text-[#16A34A]'
                            }`}
                          />
                        </div>
                      </td>

                      {/* 6. Ações (alinhadas à direita): Lápis, Olho, Lixeira */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Ícone de lápis (editar) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-[#1D4ED8] hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Editar pendência"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Ícone de olho (detalhes/visualizar) */}
                          <button
                            type="button"
                            onClick={() => setViewingItem(item)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Visualizar detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Ícone de lixeira (excluir) */}
                          <button
                            type="button"
                            onClick={() => handleDeletePendencia(item.id)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Excluir pendência"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Paginação no rodapé */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 select-none bg-white">
          <div>
            Mostrando{' '}
            <strong className="text-slate-800 font-bold">{filteredPendencias.length}</strong> de{' '}
            <strong className="text-slate-800 font-bold">{pendencias.length}</strong> pendências
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              disabled
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 opacity-40 cursor-not-allowed shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-8 h-8 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              1
            </span>
            <button
              type="button"
              disabled
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 opacity-40 cursor-not-allowed shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MODAL / DRAWER "NOVA PENDÊNCIA" / "EDITAR PENDÊNCIA" (CONDICIONAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop escuro com clique para fechar */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-full max-w-sm sm:max-w-[420px] bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
              {/* Topo do Drawer mais compacto */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center border border-blue-100 flex-shrink-0">
                    <ClipboardCheck className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                      {editingItem ? 'Editar Pendência' : 'Nova Pendência'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {editingItem
                        ? 'Atualize os dados da pendência'
                        : 'Registre o que precisa ser resolvido'}
                    </p>
                  </div>
                </div>
                {/* Botão "✕" para fechar */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo do Drawer com formulário compacto */}
              <form
                onSubmit={handleSavePendencia}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar"
              >
                {/* Descrição da Pendência * (Textarea) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descrição da Pendência *
                  </label>
                  <textarea
                    rows={2}
                    value={formData.pendencia || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, pendencia: e.target.value });
                      if (formErrors.pendencia) {
                        setFormErrors({ ...formErrors, pendencia: '' });
                      }
                    }}
                    placeholder="O que precisa ser resolvido..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
                  />
                  {formErrors.pendencia && (
                    <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                      {formErrors.pendencia}
                    </span>
                  )}
                </div>

                {/* Cliente (Input de texto livre) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cliente (opcional)
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.cliente || ''}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      placeholder="Nome do cliente (opcional)"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                {/* Pedido (Input totalmente limpo, sem texto pré-preenchido ou sugestão fixa) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pedido / Orçamento (opcional)
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      autoComplete="off"
                      value={formData.pedido || ''}
                      onChange={(e) => {
                        // Remove caractere '#' automaticamente
                        const val = e.target.value.replace(/#/g, '');
                        setFormData({ ...formData, pedido: val });
                      }}
                      placeholder=""
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Data da Pendência * (Input date, padrão com a data atual) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data da Pendência *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.data || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, data: e.target.value });
                        if (formErrors.data) {
                          setFormErrors({ ...formErrors, data: '' });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  {formErrors.data && (
                    <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                      {formErrors.data}
                    </span>
                  )}
                </div>

                {/* Status Inicial (Select: Pendente [padrão], Em andamento ou Resolvida) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={formData.status || 'Pendente'}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as PendenciaStatus })
                      }
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Resolvida">Resolvida</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Atribuir Pendência a */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Atribuir Pendência a *
                  </label>
                  <div className="relative">
                    <select
                      value={formData.atribuidoA || 'Eder Perez'}
                      onChange={(e) =>
                        setFormData({ ...formData, atribuidoA: e.target.value })
                      }
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer font-medium"
                    >
                      <option value="Eder Perez">👑 Eder Perez (Diretor) — Notificação imediata</option>
                      <option value="Vanessa Gomes">👤 Vanessa Gomes (Consultora)</option>
                      <option value="Jhessica Camargo">👤 Jhessica Camargo (Consultora)</option>
                      <option value="Jeferson Trolesi">👤 Jeferson Trolesi (Marketplace)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {formData.atribuidoA?.toLowerCase().includes('eder') && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2">
                      <span className="text-sm">🔔</span>
                      <p className="leading-snug text-[11px]">
                        <strong>Aviso:</strong> A pendência aparecerá para o <strong>Diretor Eder Perez</strong> com notificação instantânea.
                      </p>
                    </div>
                  )}
                </div>

                {/* Observações adicionais */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observações Adicionais (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.observacao || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, observacao: e.target.value })
                    }
                    placeholder="Detalhes adicionais..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
                  />
                </div>

                {/* Info do Responsável com Avatar Oficial */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 flex items-center gap-2.5 text-xs text-slate-500">
                  <UserAvatar userName={currentUserName} size="xs" />
                  <span>
                    Responsável: <strong className="text-slate-800">{currentUserName}</strong>
                  </span>
                </div>

                {/* Botões de Rodapé: "Cancelar" e "✓ Salvar Pendência" (azul royal) */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>✓ Salvar Pendência</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE VISUALIZAÇÃO DE DETALHES (ao clicar no olho) */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setViewingItem(null)}
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 z-10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center border border-blue-100">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detalhes da Pendência
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cadastrada em {formatDateBR(viewingItem.data)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <span className="text-slate-400 text-xs block font-medium">O que resolver:</span>
                <p className="font-bold text-slate-900 text-sm leading-snug">
                  {viewingItem.pendencia}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs block font-medium">Cliente</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {viewingItem.cliente && viewingItem.cliente !== '-' ? viewingItem.cliente : 'Sem vínculo'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-medium">Pedido</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    {viewingItem.pedido && viewingItem.pedido !== '-' ? viewingItem.pedido : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-medium">Data</span>
                  <span className="font-bold text-[#2563EB] block mt-0.5">
                    {formatDateBR(viewingItem.data)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-medium">Status</span>
                  <span
                    className={`inline-block font-bold text-[11px] px-2.5 py-0.5 rounded-full mt-0.5 border ${
                      viewingItem.status === 'Pendente'
                        ? 'bg-[#FEF3C7] text-[#D97706] border-amber-200'
                        : viewingItem.status === 'Em andamento'
                        ? 'bg-[#DBEAFE] text-[#2563EB] border-blue-200'
                        : 'bg-[#DCFCE7] text-[#16A34A] border-emerald-200'
                    }`}
                  >
                    {viewingItem.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-medium">Atribuído a</span>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar userName={viewingItem.atribuidoA} size="xs" />
                    <span className="font-bold text-slate-800">
                      {viewingItem.atribuidoA?.toLowerCase().includes('eder')
                        ? '👑 Eder Perez (Diretor)'
                        : viewingItem.atribuidoA || 'Equipe Geral'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-medium">Cadastrado por</span>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar userName={viewingItem.criadoPor} size="xs" />
                    <span className="font-medium text-slate-700">
                      {viewingItem.criadoPor || 'Sistema'}
                    </span>
                  </div>
                </div>
              </div>

              {viewingItem.observacao && (
                <div>
                  <span className="text-slate-500 font-semibold text-xs block mb-1">
                    Observações:
                  </span>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-700 leading-relaxed text-xs">
                    {viewingItem.observacao}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleOpenEditModal(viewingItem);
                  setViewingItem(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] font-semibold text-xs border border-blue-200 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
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
