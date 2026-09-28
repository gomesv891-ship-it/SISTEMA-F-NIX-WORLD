import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  Users,
  Search,
  RotateCcw,
  Star,
  Eye,
  Pencil,
  UserPlus,
  Phone,
  Calendar,
  X,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  User,
  CheckCircle2,
  ChevronDown,
  Check,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { ClientRecord, ClientType } from '../types';
import { ClientePerfilModal } from './ClientePerfilModal';
import { NovoClienteModal, NovoClienteAction } from './NovoClienteModal';
import { addClientActivity } from '../utils/activities';
import { INITIAL_CLIENTS_DATASET } from '../data/initialClientsSeed';
import { filterClientsForUser, isRecordOfResponsible, isClientOwnedByUser } from '../utils/userDataFilter';
import { ResponsibleFilterTabs } from './ResponsibleFilterTabs';
import { saveItemToSupabase, deleteItemFromSupabase, saveWholeCollectionToSupabase } from '../utils/supabaseClient';
import { syncUpdatedClientAcrossAllModules } from '../utils/clientSyncService';

interface ClientesScreenProps {
  currentUserName: string;
  initialClient?: ClientRecord | null;
  onSelectClientAction: (
    action: 'Calculadora' | 'Orçamentos' | 'Tarefas',
    client: ClientRecord,
    options?: { createOrcamento?: boolean; openNewTaskModal?: boolean }
  ) => void;
  onOpenCadastro?: () => void;
}

type CategoryTab =
  | 'todos'
  | 'Cliente Final'
  | 'Revenda'
  | 'Construtora'
  | 'Instalador'
  | 'Arquiteto'
  | 'Engenheiro'
  | 'importantes';

interface ClientTypeItem {
  type: ClientType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const CLIENT_TYPE_ITEMS: ClientTypeItem[] = [
  {
    type: 'Cliente Final',
    label: 'Cliente Final',
    icon: User,
    iconColor: 'text-[#0052cc]',
  },
  {
    type: 'Revenda',
    label: 'Revenda',
    icon: Store,
    iconColor: 'text-purple-600',
  },
  {
    type: 'Construtora',
    label: 'Construtora',
    icon: Building2,
    iconColor: 'text-emerald-600',
  },
  {
    type: 'Instalador',
    label: 'Instalador',
    icon: Wrench,
    iconColor: 'text-orange-600',
  },
  {
    type: 'Arquiteto',
    label: 'Arquiteto',
    icon: PenTool,
    iconColor: 'text-violet-600',
  },
  {
    type: 'Engenheiro',
    label: 'Engenheiro',
    icon: HardHat,
    iconColor: 'text-sky-600',
  },
];

export const ClientesScreen: React.FC<ClientesScreenProps> = ({
  currentUserName,
  initialClient,
  onSelectClientAction,
}) => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<CategoryTab>('todos');

  // Modals state
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<ClientRecord | null>(initialClient || null);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);

  useEffect(() => {
    if (initialClient) {
      setViewingClient(initialClient);
    }
  }, [initialClient]);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    name: string;
    whatsapp: string;
    clientType: ClientType;
    isImportant: boolean;
    notes: string;
  }>({
    name: '',
    whatsapp: '',
    clientType: 'Cliente Final',
    isImportant: false,
    notes: '',
  });
  const [isEditTypeDropdownOpen, setIsEditTypeDropdownOpen] = useState(false);
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({});
  const [clientToDelete, setClientToDelete] = useState<ClientRecord | null>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load clients from persistent localStorage
  const loadClientsFromStorage = () => {
    try {
      const stored = localStorage.getItem('fenix_clients_db');
      if (stored) {
        const parsed: ClientRecord[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClients(parsed);
          return;
        }
      }
      setClients(INITIAL_CLIENTS_DATASET);
    } catch {
      setClients(INITIAL_CLIENTS_DATASET);
    }
  };

  useEffect(() => {
    loadClientsFromStorage();

    const handleSync = () => {
      loadClientsFromStorage();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('fenix_clients_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('fenix_clients_updated', handleSync);
    };
  }, []);

  // Close edit dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target as Node)) {
        setIsEditTypeDropdownOpen(false);
      }
    };
    if (isEditTypeDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isEditTypeDropdownOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Toggle Important Star (Blue Star)
  const handleToggleImportant = (client: ClientRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newImportant = !client.isImportant;
    const updatedClient = { ...client, isImportant: newImportant };
    const updatedList = clients.map((c) => {
      if (c.id === client.id) {
        return updatedClient;
      }
      return c;
    });

    setClients(updatedList);
    try {
      localStorage.setItem('fenix_clients_db', JSON.stringify(updatedList));
      saveItemToSupabase('fenix_clients_db', updatedClient, 'id', currentUserName).catch(() => {});
      window.dispatchEvent(new Event('fenix_clients_updated'));

      const active = localStorage.getItem('fenix_active_client');
      if (active) {
        const activeParsed: ClientRecord = JSON.parse(active);
        if (activeParsed.id === client.id) {
          localStorage.setItem(
            'fenix_active_client',
            JSON.stringify({ ...activeParsed, isImportant: newImportant })
          );
        }
      }

      addClientActivity({
        clientId: client.id,
        type: 'status_alterado',
        title: newImportant ? 'Cliente Importante' : 'Removido de Importante',
        description: newImportant
          ? 'Marcado como Cliente Importante.'
          : 'Removida marcação de Cliente Importante.',
        date: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        userName: currentUserName,
      });
    } catch {
      // ignore
    }

    showToast(
      newImportant
        ? `Cliente "${client.name}" marcado como Importante.`
        : `Marcação de Importante removida de "${client.name}".`
    );
  };

  // Handle new client saved from NovoClienteModal
  const handleNewClientSuccess = (
    savedClient: ClientRecord,
    action: NovoClienteAction
  ) => {
    loadClientsFromStorage();
    setIsNewClientModalOpen(false);

    if (action === 'save_only') {
      showToast(`Cliente "${savedClient.name}" cadastrado com sucesso.`);
    } else if (action === 'go_calculadora') {
      onSelectClientAction('Calculadora', savedClient);
    } else if (action === 'go_orcamento') {
      onSelectClientAction('Orçamentos', savedClient, { createOrcamento: true });
    } else if (action === 'go_tarefa') {
      onSelectClientAction('Tarefas', savedClient, { openNewTaskModal: true });
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (client: ClientRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingClient(client);
    setEditForm({
      name: client.name || '',
      whatsapp: client.whatsapp || '',
      clientType: (client.clientType as ClientType) || 'Cliente Final',
      isImportant: !!client.isImportant,
      notes: client.notes || '',
    });
    setEditErrors({});
    setIsEditTypeDropdownOpen(false);
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = '';
    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length <= 2) {
      formatted = `(${digits}`;
    } else if (digits.length <= 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    setEditForm((prev) => ({ ...prev, whatsapp: formatted }));
    if (editErrors.whatsapp) {
      setEditErrors((prev) => ({ ...prev, whatsapp: '' }));
    }
  };

  // Save edits
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const errors: { [key: string]: string } = {};
    if (!editForm.name.trim()) errors.name = 'Informe o Nome ou Razão Social';
    const digits = editForm.whatsapp.replace(/\D/g, '');
    if (!editForm.whatsapp.trim() || digits.length < 10) {
      errors.whatsapp = 'Informe um WhatsApp válido';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    const updatedClient: ClientRecord = {
      ...editingClient,
      name: editForm.name.trim(),
      whatsapp: editForm.whatsapp,
      clientType: editForm.clientType,
      isImportant: editForm.isImportant,
      notes: editForm.notes.trim() || undefined,
    };

    const updatedList = clients.map((c) =>
      c.id === updatedClient.id ? updatedClient : c
    );

    setClients(updatedList);
    try {
      localStorage.setItem('fenix_clients_db', JSON.stringify(updatedList));
      saveItemToSupabase('fenix_clients_db', updatedClient, 'id', currentUserName).catch(() => {});
      window.dispatchEvent(new Event('fenix_clients_updated'));
      const active = localStorage.getItem('fenix_active_client');
      if (active) {
        const activeParsed: ClientRecord = JSON.parse(active);
        if (activeParsed.id === updatedClient.id) {
          localStorage.setItem('fenix_active_client', JSON.stringify(updatedClient));
        }
      }

      // SINCRONIZAÇÃO GLOBAL DO CLIENTE:
      // Atualiza automaticamente Follow-up, Orçamentos, Vendas, Metas, Agenda, Obras, etc.
      const syncResult = syncUpdatedClientAcrossAllModules(
        updatedClient,
        editingClient,
        currentUserName
      );

      addClientActivity({
        clientId: updatedClient.id,
        type: 'cadastro_atualizado',
        title: 'Cadastro Atualizado',
        description: `Dados cadastrais atualizados (${updatedClient.clientType})${
          syncResult.modulesAffected.length > 0
            ? ` e sincronizados em: ${syncResult.modulesAffected.join(', ')}`
            : ''
        }.`,
        date: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        userName: currentUserName,
      });
    } catch {
      // ignore
    }

    setEditingClient(null);
    showToast(`Cliente "${updatedClient.name}" atualizado e sincronizado em todos os módulos.`);
  };

  // Confirm delete client (somente clientes cadastrados pelo próprio usuário)
  const handleConfirmDeleteClient = () => {
    if (!clientToDelete) return;
    if (!isClientOwnedByUser(clientToDelete, currentUserName)) {
      showToast('Você só pode excluir clientes cadastrados por você.');
      setClientToDelete(null);
      return;
    }

    const updatedList = clients.filter((c) => c.id !== clientToDelete.id);
    setClients(updatedList);
    try {
      localStorage.setItem('fenix_clients_db', JSON.stringify(updatedList));
      deleteItemFromSupabase('fenix_clients_db', clientToDelete.id, 'id', currentUserName).catch(() => {});
      window.dispatchEvent(new Event('fenix_clients_updated'));

      const active = localStorage.getItem('fenix_active_client');
      if (active) {
        try {
          const activeParsed: ClientRecord = JSON.parse(active);
          if (activeParsed.id === clientToDelete.id) {
            localStorage.removeItem('fenix_active_client');
          }
        } catch {}
      }
    } catch {
      // ignore
    }

    showToast(`Cliente "${clientToDelete.name}" excluído com sucesso.`);
    setClientToDelete(null);
  };

  // Client Type Icon and Styling Helper
  // Cliente Final: silhueta de pessoa (User)
  // Revenda: loja (Store)
  // Construtora: prédio (Building2)
  // Instalador: chave inglesa (Wrench)
  // Arquiteto: esquadro/régua (PenTool)
  // Engenheiro: capacete (HardHat)
  const getClientTypeIconInfo = (type?: string) => {
    switch (type) {
      case 'Cliente Final':
        return {
          Icon: User,
          bgClass: 'bg-blue-50 text-[#0052cc] border border-blue-100/90 shadow-2xs',
        };
      case 'Revenda':
        return {
          Icon: Store,
          bgClass: 'bg-purple-50 text-purple-600 border border-purple-100/90 shadow-2xs',
        };
      case 'Construtora':
        return {
          Icon: Building2,
          bgClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100/90 shadow-2xs',
        };
      case 'Instalador':
        return {
          Icon: Wrench,
          bgClass: 'bg-orange-50 text-orange-600 border border-orange-100/90 shadow-2xs',
        };
      case 'Arquiteto':
        return {
          Icon: PenTool,
          bgClass: 'bg-violet-50 text-violet-600 border border-violet-100/90 shadow-2xs',
        };
      case 'Engenheiro':
        return {
          Icon: HardHat,
          bgClass: 'bg-sky-50 text-sky-700 border border-sky-100/90 shadow-2xs',
        };
      default:
        return {
          Icon: User,
          bgClass: 'bg-blue-50 text-[#0052cc] border border-blue-100/90 shadow-2xs',
        };
    }
  };

  // Dynamic Counters Math (Restrito à usuária logada)
  const userClients = useMemo(() => {
    return filterClientsForUser(clients, currentUserName);
  }, [clients, currentUserName]);

  const dynamicCounts = useMemo(() => {
    return {
      todos: userClients.length,
      'Cliente Final': userClients.filter((c) => c.clientType === 'Cliente Final').length,
      Revenda: userClients.filter((c) => c.clientType === 'Revenda').length,
      Construtora: userClients.filter((c) => c.clientType === 'Construtora').length,
      Instalador: userClients.filter((c) => c.clientType === 'Instalador').length,
      Arquiteto: userClients.filter((c) => c.clientType === 'Arquiteto').length,
      Engenheiro: userClients.filter((c) => c.clientType === 'Engenheiro').length,
      importantes: userClients.filter((c) => !!c.isImportant).length,
    };
  }, [userClients]);

  // Tab List Structure on the exact same line as requested:
  // • Todos
  // • Cliente Final
  // • Revenda
  // • Construtora
  // • Instalador
  // • Arquiteto
  // • Engenheiro
  // • Importantes
  const categoryTabs = [
    {
      key: 'todos' as CategoryTab,
      label: 'Todos',
      count: dynamicCounts.todos,
      icon: Users,
      iconColor: 'text-[#0052cc]',
    },
    {
      key: 'Cliente Final' as CategoryTab,
      label: 'Cliente Final',
      count: dynamicCounts['Cliente Final'],
      icon: User,
      iconColor: 'text-blue-600',
    },
    {
      key: 'Revenda' as CategoryTab,
      label: 'Revenda',
      count: dynamicCounts.Revenda,
      icon: Store,
      iconColor: 'text-purple-600',
    },
    {
      key: 'Construtora' as CategoryTab,
      label: 'Construtora',
      count: dynamicCounts.Construtora,
      icon: Building2,
      iconColor: 'text-emerald-600',
    },
    {
      key: 'Instalador' as CategoryTab,
      label: 'Instalador',
      count: dynamicCounts.Instalador,
      icon: Wrench,
      iconColor: 'text-orange-600',
    },
    {
      key: 'Arquiteto' as CategoryTab,
      label: 'Arquiteto',
      count: dynamicCounts.Arquiteto,
      icon: PenTool,
      iconColor: 'text-violet-600',
    },
    {
      key: 'Engenheiro' as CategoryTab,
      label: 'Engenheiro',
      count: dynamicCounts.Engenheiro,
      icon: HardHat,
      iconColor: 'text-sky-600',
    },
    {
      key: 'importantes' as CategoryTab,
      label: 'Importantes',
      count: dynamicCounts.importantes,
      icon: Star,
      iconColor: 'text-[#0052cc]',
      isStar: true,
    },
  ];

  // GLOBAL SEARCH LOGIC:
  // A busca principal deve ser GLOBAL.
  // Ela deve pesquisar em TODOS os clientes da base, independentemente da aba atualmente selecionada.
  // Se houver busca, ela pesquisa em todos. Se não houver, aplica o filtro da aba.
  const isGlobalSearching = searchTerm.trim().length > 0;

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      const cleanDigits = query.replace(/\D/g, '');
      return userClients.filter((client) => {
        const matchName = client.name.toLowerCase().includes(query);
        const matchPhone =
          (cleanDigits && client.whatsapp.replace(/\D/g, '').includes(cleanDigits)) ||
          client.whatsapp.toLowerCase().includes(query);
        const matchNotes = (client.notes || '').toLowerCase().includes(query);
        return matchName || matchPhone || matchNotes;
      });
    }

    return userClients.filter((client) => {
      if (activeCategoryTab === 'todos') {
        return true;
      }
      if (activeCategoryTab === 'importantes') {
        return !!client.isImportant;
      }
      return client.clientType === activeCategoryTab;
    });
  }, [userClients, activeCategoryTab, searchTerm]);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const currentEditTypeItem =
    CLIENT_TYPE_ITEMS.find((item) => item.type === editForm.clientType) ||
    CLIENT_TYPE_ITEMS[0];
  const CurrentEditTypeIcon = currentEditTypeItem.icon;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-14 py-6 sm:py-8 space-y-6 flex-1 flex flex-col">
      {/* Breadcrumb row */}
      <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
        <Home className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400">›</span>
        <span className="text-slate-900 font-semibold">Clientes</span>
      </nav>

      {/* Page Title Row: Heading "Clientes" (não maiúsculo) + botão "+ Novo Cliente" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-blue-100/80 shadow-2xs">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091122] tracking-tight">
              Clientes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
              Gestão ágil da carteira de clientes, categorias e relacionamento comercial.
            </p>
          </div>
        </div>

        {/* Primary + Novo Cliente Button */}
        <button
          type="button"
          onClick={() => setIsNewClientModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052cc] hover:bg-[#0047b3] text-white text-sm font-semibold shadow-sm shadow-blue-600/25 transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 stroke-[2.2]" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-white border border-blue-200 text-slate-800 shadow-md flex items-center gap-3.5 animate-in fade-in duration-200">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <p className="text-sm font-semibold text-slate-900">{toastMessage}</p>
        </div>
      )}

      {/* ABAS DE CATEGORIAS NA MESMA LINHA: Todos, Cliente Final, Revenda, Construtora, Instalador, Arquiteto, Engenheiro, Importantes */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar select-none">
        {categoryTabs.map((tab) => {
          const isActive = activeCategoryTab === tab.key;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveCategoryTab(tab.key);
                if (searchTerm) setSearchTerm('');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                  : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
              }`}
            >
              <TabIcon
                className={`w-4 h-4 ${
                  isActive
                    ? tab.isStar
                      ? 'fill-white text-white'
                      : 'text-white'
                    : tab.isStar
                    ? 'fill-[#0052cc] text-[#0052cc]'
                    : tab.iconColor
                }`}
              />
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                  isActive
                    ? 'bg-[#003d99] text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Instant Quick Filters Bar (BUSCA GLOBAL) */}
      <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Field (Global) */}
        <div className="relative w-full sm:max-w-md lg:max-w-lg xl:max-w-xl flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, WhatsApp ou observações..."
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

        {/* Counter Summary & Global Indicator */}
        <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            {isGlobalSearching && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0052cc] border border-blue-200">
                Busca global em todos os clientes
              </span>
            )}
            <span>
              Exibindo <strong className="text-slate-900 font-bold">{filteredClients.length}</strong>{' '}
              {filteredClients.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>

          {(searchTerm || activeCategoryTab !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveCategoryTab('todos');
              }}
              className="inline-flex items-center gap-1 font-semibold text-[#0052cc] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container: Colunas (Cliente, WhatsApp, Cadastro, Importante, Ações) */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] overflow-hidden flex-1 flex flex-col min-h-[500px]">
        {clients.length === 0 ? (
          /* Empty Database State */
          <div className="py-16 px-6 text-center my-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-2xs">
              <Users className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="text-lg font-bold text-[#091122]">
              Nenhum cliente cadastrado ainda
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
              Adicione seu primeiro cliente para iniciar orçamentos, simulações na calculadora e agendar tarefas no CRM.
            </p>
            <button
              type="button"
              onClick={() => setIsNewClientModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052cc] hover:bg-[#0047b3] text-white text-sm font-semibold shadow-sm shadow-blue-600/25 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.2]" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          </div>
        ) : filteredClients.length === 0 ? (
          /* Zero results */
          <div className="py-14 px-6 text-center my-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-bold text-[#091122]">
              Nenhum cliente encontrado
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-4">
              Nenhum registro corresponde aos critérios pesquisados.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveCategoryTab('todos');
              }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0052cc]" />
              <span>Ver todos os clientes</span>
            </button>
          </div>
        ) : (
          /* Clean Modern Corporate Table */
          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5 sm:px-6">Cliente</th>
                  <th className="py-3.5 px-4 w-44 sm:w-52 whitespace-nowrap">WhatsApp</th>
                  <th className="py-3.5 px-4 w-36 sm:w-44 whitespace-nowrap">Cadastro</th>
                  <th className="py-3.5 px-4 text-center w-28 whitespace-nowrap">Importante</th>
                  <th className="py-3.5 px-5 sm:px-6 text-right w-28 sm:w-32 whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredClients.map((client) => {
                  const { Icon: TypeIcon, bgClass } = getClientTypeIconInfo(client.clientType);

                  return (
                    <tr
                      key={client.id}
                      onClick={() => setViewingClient(client)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* 1. Cliente: Nome com ícone do tipo à esquerda (sem iniciais dentro de círculos) */}
                      <td className="py-4 px-5 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${bgClass}`}
                            title={client.clientType || 'Cliente'}
                          >
                            <TypeIcon className="w-4.5 h-4.5 stroke-[2]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#091122] group-hover:text-[#0052cc] transition-colors truncate">
                                {client.name}
                              </span>
                            </div>
                            {client.notes && (
                              <p className="text-[11px] text-slate-400 truncate max-w-md lg:max-w-2xl xl:max-w-4xl mt-0.5">
                                {client.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. WhatsApp */}
                      <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.whatsapp}</span>
                        </div>
                      </td>

                      {/* 3. Cadastro */}
                      <td className="py-4 px-4 text-slate-500 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(client.registeredAt)}</span>
                        </div>
                      </td>

                      {/* 4. Importante (Estrela Azul clicável na lista: vazia = normal, azul preenchida = importante) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleImportant(client, e)}
                          title={
                            client.isImportant
                              ? 'Cliente Importante (clique para remover marcação)'
                              : 'Marcar como Cliente Importante'
                          }
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-all active:scale-90 cursor-pointer inline-flex items-center justify-center"
                        >
                          {client.isImportant ? (
                            <Star className="w-5 h-5 fill-[#0052cc] text-[#0052cc] stroke-[1.5]" />
                          ) : (
                            <Star className="w-5 h-5 text-slate-300 hover:text-[#0052cc] fill-transparent stroke-[1.8]" />
                          )}
                        </button>
                      </td>

                      {/* 5. Ações: Visualizar, Editar e Excluir (somente clientes cadastrados pelo próprio usuário) */}
                      <td className="py-4 px-5 sm:px-6 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Visualizar */}
                          <button
                            type="button"
                            onClick={() => setViewingClient(client)}
                            title="Visualizar perfil do cliente"
                            className="w-8 h-8 rounded-lg text-slate-500 hover:text-[#0052cc] hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 stroke-[2]" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(client, e)}
                            title="Editar informações do cliente"
                            className="w-8 h-8 rounded-lg text-slate-500 hover:text-[#0052cc] hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4 stroke-[2]" />
                          </button>

                          {/* Excluir (somente clientes cadastrados pelo próprio usuário) */}
                          {isClientOwnedByUser(client, currentUserName) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setClientToDelete(client);
                              }}
                              title="Excluir cliente"
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: PERFIL DO CLIENTE */}
      {viewingClient && (
        <ClientePerfilModal
          client={viewingClient}
          currentUserName={currentUserName}
          onClose={() => setViewingClient(null)}
          onEdit={(client) => {
            setViewingClient(null);
            handleOpenEdit(client);
          }}
          onSelectAction={(action, client) => {
            setViewingClient(null);
            onSelectClientAction(action, client);
          }}
          onToggleImportant={(client) => {
            handleToggleImportant(client);
            setViewingClient((prev) =>
              prev && prev.id === client.id
                ? { ...prev, isImportant: !prev.isImportant }
                : prev
            );
          }}
        />
      )}

      {/* MODAL: EDITAR CLIENTE */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#091122]">Editar Cliente</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atualize as informações cadastrais de {editingClient.name}
                </p>
              </div>
              <button
                onClick={() => setEditingClient(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
                  Nome / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value });
                    if (editErrors.name) setEditErrors({ ...editErrors, name: '' });
                  }}
                  className={`w-full h-10.5 px-3.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all ${
                    editErrors.name
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200 focus:border-[#0052cc] focus:bg-white'
                  }`}
                />
                {editErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {editErrors.name}
                  </p>
                )}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
                  WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.whatsapp || ''}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full h-10.5 px-3.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all ${
                    editErrors.whatsapp
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200 focus:border-[#0052cc] focus:bg-white'
                  }`}
                />
                {editErrors.whatsapp && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {editErrors.whatsapp}
                  </p>
                )}
              </div>

              {/* Tipo de Cliente (Dropdown com seta e ícones) */}
              <div ref={editDropdownRef} className="relative">
                <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
                  Tipo de Cliente <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditTypeDropdownOpen((prev) => !prev)}
                  className={`w-full h-10.5 px-3.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border rounded-xl text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${
                    isEditTypeDropdownOpen
                      ? 'border-[#0052cc] ring-2 ring-blue-100 bg-white'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0">
                      <CurrentEditTypeIcon className={`w-3.5 h-3.5 ${currentEditTypeItem.iconColor}`} />
                    </div>
                    <span className="font-semibold text-slate-800">{currentEditTypeItem.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isEditTypeDropdownOpen ? 'rotate-180 text-[#0052cc]' : ''
                    }`}
                  />
                </button>

                {isEditTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden animate-in fade-in duration-100">
                    {CLIENT_TYPE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = editForm.clientType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setEditForm({ ...editForm, clientType: item.type });
                            setIsEditTypeDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-[#0052cc] font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${item.iconColor}`} />
                            <span>{item.label}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#0052cc] stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Marcar como Cliente Importante (Estrela Azul + Toggle) */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Star
                    className={`w-5 h-5 ${
                      editForm.isImportant
                        ? 'fill-[#0052cc] text-[#0052cc]'
                        : 'text-[#0052cc] fill-transparent stroke-[1.8]'
                    }`}
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      Marcar como Cliente Importante
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Exibe a estrela azul e lista na aba Importantes.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.isImportant}
                  onClick={() =>
                    setEditForm({ ...editForm, isImportant: !editForm.isImportant })
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editForm.isImportant ? 'bg-[#0052cc]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editForm.isImportant ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  placeholder="Anotações internas..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#0052cc] focus:bg-white rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO CLIENTE */}
      <NovoClienteModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        currentUserName={currentUserName}
        onSaveSuccess={handleNewClientSuccess}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CLIENTE */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#091122]">Excluir Cliente</h3>
                <p className="text-xs text-slate-500">Confirmação de exclusão</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir o cliente <strong className="text-slate-900 font-semibold">{clientToDelete.name}</strong>? Esta ação removerá o cliente da sua lista e do banco de dados local.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClient}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
