import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  FileText,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  Check,
  X,
  User,
  Users,
  AlertCircle,
  ShieldCheck,
  Edit3,
  Trash2,
  Search,
} from 'lucide-react';
import { BoletoItem, BoletoStatus, BoletoParcela, ClientRecord } from '../types';
import { saveItemToSupabase, saveWholeCollectionToSupabase, getSupabaseClient, deleteItemFromSupabase } from '../utils/supabaseClient';
import { sendUserNotification } from '../utils/notifications';
import { getSellerIdForUser, areUsersEqualOrRelated } from '../utils/userDataFilter';
import { getUserIdByName } from '../utils/auth';

/**
 * Remove o símbolo '#' do número do pedido apenas para exibição
 */
export const formatOrderDisplay = (order?: string | number) => {
  if (!order) return '';
  return String(order).replace(/^#+/, '').trim();
};

interface BoletosScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const INITIAL_BOLETOS: BoletoItem[] = [];

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const STATUS_CONFIG: Record<
  BoletoStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  'Aguardando boleto': {
    label: 'Aguardando boleto',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#D97706]',
    border: 'border-amber-200/90',
    icon: Clock,
  },
  'Boleto recebido': {
    label: 'Boleto recebido',
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#2563EB]',
    border: 'border-blue-200/90',
    icon: FileText,
  },
  Atendido: {
    label: 'Atendido',
    bg: 'bg-[#DCFCE7]',
    text: 'text-[#16A34A]',
    border: 'border-emerald-200/90',
    icon: CheckCircle2,
  },
};

export const BoletosScreen: React.FC<BoletosScreenProps> = ({
  currentUserName = 'Vanessa Gomes',
  onBackToCadastro,
}) => {
  const isDirector =
    currentUserName.toLowerCase().includes('eder') ||
    currentUserName.toLowerCase().includes('diretor');

  // Deduplicador defensivo para garantir unicidade absoluta de IDs em Boletos
  const deduplicateBoletos = (list: BoletoItem[]): BoletoItem[] => {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const result: BoletoItem[] = [];
    for (const item of list) {
      if (!item) continue;
      const id = String(item.id || '').trim();
      if (id) {
        if (!seen.has(id)) {
          seen.add(id);
          result.push(item);
        }
      } else {
        result.push(item);
      }
    }
    return result;
  };

  // Temporal state (defaults to September 2026)
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(8); // 8 = Setembro

  // Boletos list with local persistence and automatic deduplication
  const [boletos, setBoletos] = useState<BoletoItem[]>(() => {
    try {
      const stored = localStorage.getItem('fenix_boletos_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deduped = deduplicateBoletos(parsed);
          if (deduped.length !== parsed.length) {
            try {
              localStorage.setItem('fenix_boletos_db', JSON.stringify(deduped));
            } catch {}
          }
          return deduped;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      const deduped = deduplicateBoletos(boletos);
      localStorage.setItem('fenix_boletos_db', JSON.stringify(deduped));
    } catch {
      // ignore
    }
  }, [boletos]);

  // Purga e sincronização imediata no carregamento caso o banco possua cópias duplicadas
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fenix_boletos_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const deduped = deduplicateBoletos(parsed);
          if (deduped.length !== parsed.length) {
            localStorage.setItem('fenix_boletos_db', JSON.stringify(deduped));
            setBoletos(deduped);
            saveWholeCollectionToSupabase('fenix_boletos_db', deduped, currentUserName).catch(() => {});
          }
        }
      }
    } catch {}
  }, []);

  // Remote updates listener
  useEffect(() => {
    const handleBoletosUpdate = () => {
      try {
        const stored = localStorage.getItem('fenix_boletos_db');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setBoletos(deduplicateBoletos(parsed));
          }
        }
      } catch {}
    };
    window.addEventListener('fenix_boletos_updated', handleBoletosUpdate);
    window.addEventListener('storage', handleBoletosUpdate);
    return () => {
      window.removeEventListener('fenix_boletos_updated', handleBoletosUpdate);
      window.removeEventListener('storage', handleBoletosUpdate);
    };
  }, []);

  // Clients suggestions from database for the modal
  const [registeredClients, setRegisteredClients] = useState<ClientRecord[]>([]);
  useEffect(() => {
    try {
      const storedCli = localStorage.getItem('fenix_clients_db');
      if (storedCli) setRegisteredClients(JSON.parse(storedCli));
    } catch {
      // ignore
    }
  }, []);

  // Filter by status on KPI click
  const [activeFilter, setActiveFilter] = useState<'Todos' | BoletoStatus>('Todos');

  // Search input term
  const [searchTerm, setSearchTerm] = useState('');

  // Popover state for status dropdown in the row
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-status-wrapper]')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Data dinâmica atual no formato YYYY-MM-DD
  const getDynamicTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Soma dias corridos a uma data no formato YYYY-MM-DD
  const addDaysToDateStr = (dateStr: string, days: number = 28): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      date.setDate(date.getDate() + days);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  // Modal: Novo / Editar Boleto state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoleto, setEditingBoleto] = useState<BoletoItem | null>(null);
  const [deletingBoleto, setDeletingBoleto] = useState<BoletoItem | null>(null);
  const [formPedido, setFormPedido] = useState('');
  const [formCliente, setFormCliente] = useState('');
  const [formDataCadastro, setFormDataCadastro] = useState<string>(getDynamicTodayDate);
  const [formPrimeiraParcela, setFormPrimeiraParcela] = useState<string>(() => addDaysToDateStr(getDynamicTodayDate(), 28));
  const [formStatusInicial, setFormStatusInicial] = useState<BoletoStatus>('Aguardando boleto');
  const [formCriadoPor, setFormCriadoPor] = useState(isDirector ? 'Eder Perez' : currentUserName);
  const [formDestinadoA, setFormDestinadoA] = useState<string>('Geral');
  const [formValorTotal, setFormValorTotal] = useState<string>('');
  const [formQtdParcelas, setFormQtdParcelas] = useState<number>(1);
  const [formIntervaloDias, setFormIntervaloDias] = useState<number>(30);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSavingModal, setIsSavingModal] = useState(false);

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleResetToToday = () => {
    setSelectedYear(2026);
    setSelectedMonth(8);
  };

  // REGRA OFICIAL SOLICITADA:
  // "Em Boletos, quero que quando eu cadastre fique no mês que eu cadastrei mesmo que a data da primeira parcela seja pro mês seguinte"
  // O filtro do mês agora avalia b.dataCadastro (ou b.createdAt), garantindo que o boleto permaneça no mês do cadastro.
  const currentMonthBoletos = useMemo(() => {
    return boletos.filter((b) => {
      const refDate = b.dataCadastro || b.createdAt || b.firstDueDate;
      if (!refDate) return false;
      const datePart = refDate.includes('T') ? refDate.split('T')[0] : refDate;
      const parts = datePart.split('-');
      if (parts.length < 2) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed: 8 = Setembro
      return year === selectedYear && month === selectedMonth;
    });
  }, [boletos, selectedYear, selectedMonth]);

  // Aplicar regra de visibilidade de usuário:
  // REGRA OFICIAL:
  // O usuário (inclusive o Diretor Éder Perez) consulta exclusivamente os boletos cadastrados por ele ou vinculados/atribuídos a ele.
  const userScopedBoletos = useMemo(() => {
    return currentMonthBoletos.filter((b) => {
      const isCreator = areUsersEqualOrRelated(b.criadoPor, currentUserName);
      const isResponsible =
        areUsersEqualOrRelated(b.destinadoA, currentUserName) ||
        areUsersEqualOrRelated(b.responsavel, currentUserName);
      return isCreator || isResponsible;
    });
  }, [currentMonthBoletos, currentUserName]);

  // Helper para verificar se o boleto já foi atendido ou recebido (finalizado)
  const isBoletoAtendidoOuRecebido = (status?: string): boolean => {
    if (!status) return false;
    const s = status.toLowerCase().trim();
    return s === 'atendido' || s === 'boleto recebido' || s.includes('atendid') || s.includes('recebid');
  };

  // Recalculated dynamic KPI counters baseados nos boletos com escopo do usuário
  const metrics = useMemo(() => {
    let totalMes = 0;
    let aguardando = 0;
    let recebido = 0;
    let atendidos = 0;

    userScopedBoletos.forEach((item) => {
      const isConcluido = isBoletoAtendidoOuRecebido(item.status);
      if (!isConcluido) {
        totalMes++;
      }

      if (item.status === 'Aguardando boleto') {
        aguardando++;
      } else if (item.status === 'Boleto recebido') {
        recebido++;
      } else if (item.status === 'Atendido') {
        atendidos++;
      }
    });

    return { totalMes, aguardando, recebido, atendidos };
  }, [userScopedBoletos]);

  // Filtered rows por status e busca (garantindo unicidade estrita)
  const displayedBoletos = useMemo(() => {
    let list = activeFilter === 'Todos'
      ? userScopedBoletos.filter((item) => !isBoletoAtendidoOuRecebido(item.status))
      : userScopedBoletos.filter((item) => item.status === activeFilter);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const cleanQ = q.replace(/^#+/, '');
      list = list.filter((b) => {
        const orderClean = formatOrderDisplay(b.orderNumber).toLowerCase();
        const client = (b.clientName || '').toLowerCase();
        const criadoPor = (b.criadoPor || '').toLowerCase();
        const responsavel = (b.responsavel || b.destinadoA || '').toLowerCase();
        return (
          orderClean.includes(cleanQ) ||
          client.includes(q) ||
          criadoPor.includes(q) ||
          responsavel.includes(q)
        );
      });
    }

    const deduped = deduplicateBoletos(list);
    // REGRA OFICIAL: Exibir primeiro os boletos com status "Aguardando Boleto"
    return [...deduped].sort((a, b) => {
      const isWaitA = (a.status || '').toLowerCase().includes('aguardando') ? 0 : 1;
      const isWaitB = (b.status || '').toLowerCase().includes('aguardando') ? 0 : 1;
      return isWaitA - isWaitB;
    });
  }, [userScopedBoletos, activeFilter, searchTerm]);

  // Date formatter (DD/MM/AAAA)
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper para notificar o usuário atribuído ao boleto
  const notifyAssignedUserBoleto = (order: string, client: string, author: string, dueDate: string, recipient: string) => {
    if (!recipient || recipient === 'Geral') return;
    try {
      sendUserNotification({
        category: 'Boletos',
        title: `Boleto Pedido ${formatOrderDisplay(order)}`,
        description: `Boleto de ${client} registrado por ${author}. 1ª Parcela: ${formatDateBR(dueDate)}. Atribuído a você.`,
        targetTab: 'Boletos',
        recipientName: recipient,
        recipientId: getUserIdByName(recipient) || undefined,
        authorName: author,
        authorId: getUserIdByName(author) || undefined,
        metadata: { orderNumber: order, clientName: client, dueDate },
      });
    } catch (e) {
      console.error('Erro ao notificar usuário do boleto:', e);
    }
  };

  // STATUS CHANGE DIRECT IN ROW: updates row and syncs with Supabase
  const handleStatusChange = async (id: string, newStatus: BoletoStatus) => {
    const target = boletos.find((b) => b.id === id);
    if (!target) return;
    const updatedTarget = { ...target, status: newStatus };

    const res = await saveItemToSupabase<BoletoItem>(
      'fenix_boletos_db',
      updatedTarget,
      'id',
      currentUserName
    );

    if (!res.success) {
      showToast('Não foi possível salvar. Verifique sua conexão e tente novamente.');
      return;
    }

    setBoletos((prev) =>
      prev.map((b) => (b.id === id ? updatedTarget : b))
    );
    setOpenDropdownId(null);
    showToast(`Status do boleto alterado para "${newStatus}"!`);
  };

  // Modal open for creation
  const handleOpenModal = () => {
    const today = getDynamicTodayDate();
    const parcela28 = addDaysToDateStr(today, 28);
    setEditingBoleto(null);
    setFormPedido('');
    setFormCliente('');
    // Data de cadastro padrão é a data atual do dia
    setFormDataCadastro(today);
    // 1ª parcela padrão com 28 dias corridos após o cadastro
    setFormPrimeiraParcela(parcela28);
    setFormValorTotal('');
    setFormQtdParcelas(1);
    setFormIntervaloDias(30);
    setFormStatusInicial('Aguardando boleto');
    setFormCriadoPor(isDirector ? 'Eder Perez' : currentUserName);
    setFormDestinadoA('Geral');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Modal open for editing
  const handleEditBoleto = (item: BoletoItem) => {
    setEditingBoleto(item);
    setFormPedido(item.orderNumber);
    setFormCliente(item.clientName);
    setFormDataCadastro(item.dataCadastro || (item.createdAt ? item.createdAt.slice(0, 10) : getDynamicTodayDate()));
    setFormPrimeiraParcela(item.firstDueDate);
    setFormValorTotal(item.valorTotal ? item.valorTotal.toFixed(2).replace('.', ',') : '');
    setFormQtdParcelas(item.qtdParcelas || item.parcelas?.length || 1);
    setFormIntervaloDias(item.intervaloDias || 30);
    setFormStatusInicial(item.status);
    setFormCriadoPor(item.criadoPor || (isDirector ? 'Eder Perez' : currentUserName));
    setFormDestinadoA(item.destinadoA || 'Geral');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Delete initiation
  const handleDeleteBoletoClick = (item: BoletoItem) => {
    setDeletingBoleto(item);
  };

  // Confirm delete (updates state and Supabase)
  const handleConfirmDelete = async () => {
    if (!deletingBoleto) return;
    const targetId = deletingBoleto.id;
    const targetNum = deletingBoleto.orderNumber;

    const res = await deleteItemFromSupabase('fenix_boletos_db', targetId, 'id', currentUserName);
    if (!res.success) {
      showToast('Não foi possível excluir. Verifique sua conexão e tente novamente.');
      return;
    }

    setBoletos((prev) => prev.filter((b) => b.id !== targetId));
    showToast(`✓ Boleto #${targetNum} excluído com sucesso!`);
    setDeletingBoleto(null);
  };

  // Modal save (Create or Edit)
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingModal) return;

    const errors: { [key: string]: string } = {};

    if (!formPedido.trim()) {
      errors.pedido = 'Informe o número do pedido';
    }
    if (!formCliente.trim()) {
      errors.cliente = 'Informe o cliente ou empresa';
    }
    if (!formDataCadastro) {
      errors.dataCadastro = 'Informe a data de cadastro do boleto';
    }
    if (!formPrimeiraParcela) {
      errors.primeiraParcela = 'Informe a data da primeira parcela';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const cleanPedido = formPedido.trim().replace(/#/g, '');
    const author = editingBoleto
      ? (editingBoleto.criadoPor || (isDirector ? formCriadoPor : currentUserName))
      : (isDirector ? formCriadoPor : currentUserName);
    const respId = getSellerIdForUser(formDestinadoA);
    const numValorTotal = parseFloat(formValorTotal.replace(/\./g, '').replace(',', '.')) || 0;

    setIsSavingModal(true);
    try {
      if (editingBoleto) {
        const updatedBoleto: BoletoItem = {
          ...editingBoleto,
          orderNumber: cleanPedido,
          clientName: formCliente.trim(),
          dataCadastro: formDataCadastro,
          firstDueDate: formPrimeiraParcela,
          status: formStatusInicial,
          criadoPor: author,
          destinadoA: formDestinadoA,
          responsavel: formDestinadoA,
          responsavelId: respId,
          valorTotal: numValorTotal > 0 ? numValorTotal : undefined,
          qtdParcelas: Number(formQtdParcelas) || 1,
        };

        const res = await saveItemToSupabase<BoletoItem>(
          'fenix_boletos_db',
          updatedBoleto,
          'id',
          currentUserName
        );

        if (!res.success) {
          showToast('Não foi possível salvar. Verifique sua conexão e tente novamente.');
          setIsSavingModal(false);
          return;
        }

        setBoletos((prev) =>
          deduplicateBoletos(prev.map((b) => (b.id === editingBoleto.id ? updatedBoleto : b)))
        );

        if (formDestinadoA && formDestinadoA !== 'Geral') {
          notifyAssignedUserBoleto(cleanPedido, formCliente.trim(), author, formPrimeiraParcela, formDestinadoA);
          showToast(`✓ Boleto #${cleanPedido} atualizado e notificação enviada para ${formDestinadoA}!`);
        } else {
          showToast('Salvo com sucesso.');
        }
      } else {
        const newBoleto: BoletoItem = {
          id: `bol_${Date.now()}`,
          orderNumber: cleanPedido,
          clientName: formCliente.trim(),
          dataCadastro: formDataCadastro,
          firstDueDate: formPrimeiraParcela,
          status: formStatusInicial,
          criadoPor: author,
          destinadoA: formDestinadoA,
          responsavel: formDestinadoA,
          responsavelId: respId,
          createdAt: new Date().toISOString(),
          valorTotal: numValorTotal > 0 ? numValorTotal : undefined,
          qtdParcelas: Number(formQtdParcelas) || 1,
        };

        const res = await saveItemToSupabase<BoletoItem>(
          'fenix_boletos_db',
          newBoleto,
          'id',
          currentUserName
        );

        if (!res.success) {
          showToast('Não foi possível salvar. Verifique sua conexão e tente novamente.');
          setIsSavingModal(false);
          return;
        }

        setBoletos((prev) => deduplicateBoletos([newBoleto, ...prev.filter((b) => b.id !== newBoleto.id)]));

        if (formDestinadoA && formDestinadoA !== 'Geral') {
          notifyAssignedUserBoleto(cleanPedido, formCliente.trim(), author, formPrimeiraParcela, formDestinadoA);
          showToast(`✓ Boleto cadastrado e notificação direcionada para ${formDestinadoA}!`);
        } else {
          showToast('Salvo com sucesso.');
        }
      }

      setIsModalOpen(false);
      setEditingBoleto(null);
    } catch {
      showToast('Não foi possível salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSavingModal(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
      {/* Toast de Feedback */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#071a52] text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-400/30 flex items-center gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. CABEÇALHO */}
      <div className="space-y-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs sm:text-sm font-normal text-slate-500">
          <Home className="w-4 h-4 text-[#0052CC]" />
          <span
            onClick={onBackToCadastro}
            className="text-[#0052CC] font-medium cursor-pointer hover:underline"
          >
            Início
          </span>
          <span className="text-slate-400 font-normal">›</span>
          <span className="text-slate-800 font-medium">Boletos</span>
        </nav>

        {/* Título, Subtítulo e Botão "+ Novo Boleto" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center flex-shrink-0 border border-blue-200/80 shadow-xs">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#071a52] tracking-tight">
                  Boletos
                </h1>
                {isDirector ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-[#0052cc] border border-blue-200">
                    Visão Geral da Diretoria
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {currentUserName}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Controle de boletos por mês de cadastro com vencimento programado.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="h-10 px-5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm transition-all cursor-pointer self-start sm:self-center active:scale-95"
          >
            <span>Novo Boleto</span>
          </button>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO DE MÊS & BARRA DE SUPERVISÃO DO DIRETOR */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão anterior < */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-10 w-10 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 flex items-center justify-center shadow-2xs transition-all cursor-pointer hover:border-slate-300 active:scale-95"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Indicador central: Card branco com ícone de calendário exibindo o mês atual */}
            <div className="h-10 px-4 rounded-xl bg-white border border-slate-200/90 text-slate-800 flex items-center gap-2.5 shadow-2xs font-bold text-xs sm:text-sm select-none">
              <Calendar className="w-4 h-4 text-[#0052CC]" />
              <span>{`${MONTH_NAMES[selectedMonth]} ${selectedYear}`}</span>
            </div>

            {/* Botão próximo > */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-10 w-10 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 flex items-center justify-center shadow-2xs transition-all cursor-pointer hover:border-slate-300 active:scale-95"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Botão de atalho: Hoje */}
            <button
              type="button"
              onClick={handleResetToToday}
              className={`h-10 px-4 rounded-xl border flex items-center justify-center shadow-2xs transition-all font-semibold text-xs sm:text-sm cursor-pointer ${
                selectedYear === 2026 && selectedMonth === 8
                  ? 'bg-blue-50 border-blue-200 text-[#0052CC]'
                  : 'bg-white border-slate-200/90 text-[#0052CC] hover:bg-blue-50/50'
              }`}
            >
              Hoje
            </button>

            {/* Badge Informativo da Regra do Mês */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-3 py-2 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Competência: {MONTH_NAMES[selectedMonth]}/{selectedYear}</span>
            </div>

            {/* Filtro ativo reset badge se diferente de todos */}
            {activeFilter !== 'Todos' && (
              <button
                type="button"
                onClick={() => setActiveFilter('Todos')}
                className="h-8 px-3 rounded-full bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-300 cursor-pointer"
              >
                <span>Filtro: {activeFilter}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Campo de Busca (Pesquisa de Boletos) */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, pedido..."
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. CARDS DE KPI (CONTADORES DO MÊS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total do mês (soma total) */}
        <div
          onClick={() => setActiveFilter('Todos')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Todos'
              ? 'border-[#0052CC] ring-2 ring-blue-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Ver todos os boletos do mês"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total cadastrado no mês
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#071a52] mt-0.5 block">
              {metrics.totalMes}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center flex-shrink-0 border border-blue-100/80">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 2: Aguardando boleto (amarelo) */}
        <div
          onClick={() => setActiveFilter('Aguardando boleto')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Aguardando boleto'
              ? 'border-amber-500 ring-2 ring-amber-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar por Aguardando boleto"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Aguardando boleto
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#D97706] mt-0.5 block">
              {metrics.aguardando}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100/80">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 3: Boleto recebido (azul) */}
        <div
          onClick={() => setActiveFilter('Boleto recebido')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Boleto recebido'
              ? 'border-blue-500 ring-2 ring-blue-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar por Boleto recebido"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Boleto recebido
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#2563EB] mt-0.5 block">
              {metrics.recebido}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100/80">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 4: Atendidos (verde) */}
        <div
          onClick={() => setActiveFilter('Atendido')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Atendido'
              ? 'border-emerald-500 ring-2 ring-emerald-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar por Atendidos"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Atendidos
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#16A34A] mt-0.5 block">
              {metrics.atendidos}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100/80">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 4. TABELA ENXUTA (CARD BRANCO ARREDONDADO) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
                <th className="py-4 px-5 w-28">PEDIDO</th>
                <th className="py-4 px-5">CLIENTE</th>
                <th className="py-4 px-5 w-36">CADASTRADO EM</th>
                <th className="py-4 px-5 w-28 text-center">PARCELAS</th>
                <th className="py-4 px-5 w-36">VENCIMENTO</th>
                <th className="py-4 px-5 w-44 text-right sm:text-left">STATUS</th>
                <th className="py-4 px-5 w-44">RESPONSÁVEL</th>
                <th className="py-4 px-5 w-28 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {displayedBoletos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center mx-auto border border-blue-100">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Nenhum boleto encontrado
                      </p>
                      <p className="text-xs text-slate-400">
                        Não há boletos cadastrados para {MONTH_NAMES[selectedMonth]} de {selectedYear}.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenModal}
                        className="mt-2 px-3.5 py-1.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cadastrar Boleto</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedBoletos.map((item, idx) => {
                  const currentStatusCfg = STATUS_CONFIG[item.status];
                  const StatusIcon = currentStatusCfg.icon;
                  const isOpen = openDropdownId === item.id;
                  const qtdParc = item.qtdParcelas || (item.parcelas && item.parcelas.length) || 1;

                  return (
                    <tr
                      key={item.id ? `${item.id}_${idx}` : `bol_row_${idx}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Coluna 1: PEDIDO */}
                      <td className="py-4 px-5 font-bold text-[#071a52] text-sm">
                        {formatOrderDisplay(item.orderNumber)}
                      </td>

                      {/* Coluna 2: CLIENTE */}
                      <td className="py-4 px-5 font-medium text-slate-800">
                        <span className="block font-semibold">{item.clientName}</span>
                      </td>

                      {/* Coluna 3: CADASTRADO EM */}
                      <td className="py-4 px-5 text-slate-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span>{formatDateBR(item.dataCadastro || item.createdAt)}</span>
                        </div>
                      </td>

                      {/* Coluna 4: PARCELAS */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-[#0052CC] border border-blue-200/60">
                          {qtdParc} {qtdParc === 1 ? 'parcela' : 'parcelas'}
                        </span>
                      </td>

                      {/* Coluna 5: VENCIMENTO */}
                      <td className="py-4 px-5 text-slate-700 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold">{formatDateBR(item.firstDueDate || item.dataVencimento)}</span>
                        </div>
                      </td>

                      {/* Coluna 6: STATUS */}
                      <td className="py-4 px-6 text-right sm:text-left">
                        <div
                          data-status-wrapper="true"
                          className="relative inline-block"
                        >
                          {/* Badge Button Trigger */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdownId(isOpen ? null : item.id)
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${currentStatusCfg.bg} ${currentStatusCfg.text} border ${currentStatusCfg.border} shadow-2xs hover:brightness-95 transition-all cursor-pointer select-none active:scale-95`}
                            title="Clique para alterar o status"
                          >
                            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{currentStatusCfg.label}</span>
                            <ChevronDown
                              className={`w-3 h-3 ml-0.5 opacity-70 transition-transform duration-150 ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {/* Dropdown Menu com as 3 opções */}
                          {isOpen && (
                            <div className="absolute right-0 sm:left-0 top-10 z-30 w-48 bg-white rounded-xl border border-slate-200 shadow-xl p-1 space-y-1 animate-in fade-in duration-100">
                              {(
                                [
                                  'Aguardando boleto',
                                  'Boleto recebido',
                                  'Atendido',
                                ] as BoletoStatus[]
                              ).map((opt) => {
                                const cfg = STATUS_CONFIG[opt];
                                const OptIcon = cfg.icon;
                                const isSelected = item.status === opt;

                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleStatusChange(item.id, opt)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                      isSelected
                                        ? `${cfg.bg} ${cfg.text}`
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <OptIcon className="w-3.5 h-3.5" />
                                      <span>{cfg.label}</span>
                                    </div>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Coluna 6: RESPONSÁVEL */}
                      <td className="py-4 px-6 text-slate-700 text-xs">
                        {(() => {
                          const resp = item.destinadoA || item.responsavel || 'Geral';
                          const isRespEder = resp.toLowerCase().includes('eder');
                          const isRespVanessa = resp.toLowerCase().includes('vanessa');
                          const isRespJhessica = resp.toLowerCase().includes('jhessica');

                          if (isRespEder) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-[#0052cc] font-bold text-xs">
                                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Éder Perez</span>
                              </span>
                            );
                          }
                          if (isRespVanessa) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                                <User className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span>Vanessa Gomes</span>
                              </span>
                            );
                          }
                          if (isRespJhessica) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-xs">
                                <User className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                <span>Jhessica Camargo</span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
                              <Users className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span>{resp}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Coluna 7: AÇÕES (Editar e Excluir) */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditBoleto(item)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-600 hover:text-[#0052CC] transition-colors shadow-2xs cursor-pointer"
                            title="Editar Boleto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBoletoClick(item)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
                            title="Excluir Boleto"
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

        {/* Rodapé da tabela com resumo */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Total: <span className="font-bold text-slate-700">{displayedBoletos.length}</span>{' '}
            {displayedBoletos.length === 1 ? 'registro' : 'registros'} cadastrados na competência de{' '}
            <span className="font-semibold text-slate-700">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Clique no status de qualquer boleto para alterá-lo rapidamente
          </div>
        </div>
      </div>

      {/* 5. MODAL "NOVO BOLETO" COM REGRA DE MÊS DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center border border-blue-100">
                  {editingBoleto ? <Edit3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingBoleto ? 'Editar Boleto' : 'Novo Boleto'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingBoleto
                      ? `Alterando dados do pedido ${formatOrderDisplay(editingBoleto.orderNumber)}`
                      : 'O boleto fica registrado no mês de cadastro'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBoleto(null);
                }}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4 text-xs sm:text-sm max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Campo: Destinado / Atribuído a */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Destinado / Atribuído a:</span>
                  <span className="text-[11px] font-normal text-slate-500">Define o direcionamento do boleto</span>
                </label>
                <select
                  value={formDestinadoA}
                  onChange={(e) => setFormDestinadoA(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0052CC] font-semibold text-xs cursor-pointer"
                >
                  <option value="Geral">Geral (Equipe Comercial)</option>
                  <option value="Eder Perez">Eder Perez (Diretor)</option>
                  <option value="Vanessa Gomes">Vanessa Gomes (Consultora)</option>
                  <option value="Jhessica Camargo">Jhessica Camargo (Consultora)</option>
                </select>
                {formDestinadoA === 'Eder Perez' && (
                  <p className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200/80 rounded-lg p-2">
                    🔔 Este boleto será destinado ao Diretor Eder Perez e enviará notificação direta a ele.
                  </p>
                )}
              </div>

              {/* Campo 1: Pedido */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Pedido <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formPedido || ''}
                  onChange={(e) => {
                    setFormPedido(e.target.value);
                    if (formErrors.pedido) {
                      setFormErrors((prev) => ({ ...prev, pedido: '' }));
                    }
                  }}
                  placeholder="Ex: 1042"
                  className={`w-full h-10 px-3.5 rounded-xl border bg-white text-slate-800 outline-none transition-all ${
                    formErrors.pedido
                      ? 'border-rose-300 ring-2 ring-rose-500/10'
                      : 'border-slate-200 focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10'
                  }`}
                />
                {formErrors.pedido && (
                  <span className="text-[11px] text-rose-500 font-semibold block">
                    {formErrors.pedido}
                  </span>
                )}
              </div>

              {/* Campo 2: Cliente */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Cliente <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCliente || ''}
                  onChange={(e) => {
                    setFormCliente(e.target.value);
                    if (formErrors.cliente) {
                      setFormErrors((prev) => ({ ...prev, cliente: '' }));
                    }
                  }}
                  placeholder="Nome do cliente ou empresa (ex: Construtora Almeida)"
                  className={`w-full h-10 px-3.5 rounded-xl border bg-white text-slate-800 outline-none transition-all ${
                    formErrors.cliente
                      ? 'border-rose-300 ring-2 ring-rose-500/10'
                      : 'border-slate-200 focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10'
                  }`}
                />
                {formErrors.cliente && (
                  <span className="text-[11px] text-rose-500 font-semibold block">
                    {formErrors.cliente}
                  </span>
                )}

                {/* Sugestões rápidas se houver clientes cadastrados */}
                {registeredClients.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] text-slate-400">Sugeridos:</span>
                    {registeredClients.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormCliente(c.name)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-[#0052CC] text-slate-600 transition-colors cursor-pointer"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Campo 3: Data de Cadastro (determina o mês de competência) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Data de Cadastro <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#0052cc] bg-blue-50 px-2 py-0.5 rounded">
                    Fixa o mês de exibição
                  </span>
                </div>
                <input
                  type="date"
                  value={formDataCadastro || ''}
                  onChange={(e) => {
                    const newCadDate = e.target.value;
                    setFormDataCadastro(newCadDate);
                    // Se a data de cadastro for alterada, recalcula a 1ª parcela para 28 dias corridos depois
                    if (newCadDate) {
                      setFormPrimeiraParcela(addDaysToDateStr(newCadDate, 28));
                    }
                    if (formErrors.dataCadastro) {
                      setFormErrors((prev) => ({ ...prev, dataCadastro: '', primeiraParcela: '' }));
                    }
                  }}
                  className={`w-full h-10 px-3.5 rounded-xl border bg-white text-slate-800 outline-none transition-all ${
                    formErrors.dataCadastro
                      ? 'border-rose-300 ring-2 ring-rose-500/10'
                      : 'border-slate-200 focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10'
                  }`}
                />
                <p className="text-[11px] text-slate-500 leading-tight">
                  Este boleto ficará registrado no mês selecionado aqui, mesmo que a 1ª parcela seja pro mês seguinte.
                </p>
                {formErrors.dataCadastro && (
                  <span className="text-[11px] text-rose-500 font-semibold block">
                    {formErrors.dataCadastro}
                  </span>
                )}
              </div>

              {/* Campo 4: Data de Vencimento */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Data de Vencimento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formPrimeiraParcela || ''}
                  onChange={(e) => {
                    setFormPrimeiraParcela(e.target.value);
                    if (formErrors.primeiraParcela) {
                      setFormErrors((prev) => ({ ...prev, primeiraParcela: '' }));
                    }
                  }}
                  className={`w-full h-10 px-3.5 rounded-xl border bg-white text-slate-800 outline-none transition-all ${
                    formErrors.primeiraParcela
                      ? 'border-rose-300 ring-2 ring-rose-500/10'
                      : 'border-slate-200 focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10'
                  }`}
                />
                {formErrors.primeiraParcela && (
                  <span className="text-[11px] text-rose-500 font-semibold block">
                    {formErrors.primeiraParcela}
                  </span>
                )}
              </div>

              {/* Campo Simples: Quantidade de parcelas (preenchimento manual pelo usuário) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Quantidade de parcelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={formQtdParcelas}
                  onChange={(e) => setFormQtdParcelas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="Ex: 3"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                />
              </div>

              {/* Campo 5: Status Inicial */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Status Inicial</label>
                <select
                  value={formStatusInicial}
                  onChange={(e) => setFormStatusInicial(e.target.value as BoletoStatus)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0052CC] transition-all cursor-pointer font-medium"
                >
                  <option value="Aguardando boleto">Aguardando boleto</option>
                  <option value="Boleto recebido">Boleto recebido</option>
                  <option value="Atendido">Atendido</option>
                </select>
              </div>

              {/* Botões do Rodapé: "Cancelar" e "Salvar Boleto" / "Atualizar Boleto" */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBoleto(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingModal}
                  className="px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  {isSavingModal ? 'Salvando...' : (editingBoleto ? 'Atualizar Boleto' : 'Salvar Boleto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingBoleto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-slate-900 text-base">
                Excluir Boleto {formatOrderDisplay(deletingBoleto.orderNumber)}?
              </h3>
              <p className="text-xs text-slate-500">
                Esta ação removerá o boleto do cliente <strong>{deletingBoleto.clientName}</strong> do CRM.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBoleto(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
