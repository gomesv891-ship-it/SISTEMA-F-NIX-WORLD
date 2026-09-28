import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  CheckSquare,
  Square,
  Barcode,
  PhoneCall,
  Target,
  Package,
  FileEdit,
  AlertCircle,
  ExternalLink,
  Clock,
  Calendar,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  MessageCircle,
  Table,
  BellOff,
} from 'lucide-react';
import {
  SystemNotification,
  NotificationCategory,
  getUserNotifications,
  markAllNotificationsAsReadForUser,
  markNotificationAsRead,
  toggleNotificationRead,
  deleteNotification,
  deleteNotifications,
  markNotificationsAsRead,
  clearAllReadNotificationsForUser,
  deactivateFollowUpFromNotification,
} from '../utils/notifications';

interface NotificacoesScreenProps {
  currentUserName: string;
  onNavigateTab: (tab: string, meta?: any) => void;
  onBack?: () => void;
}

const CATEGORIES: Array<'Todas' | NotificationCategory> = [
  'Todas',
  'Tarefas',
  'Boletos',
  'Follow-up',
  'Meta',
  'Estoque',
  'Tabela Comercial',
  'Notas',
  'Pendências',
  'Pós-Vendas',
];

type StatusFilter = 'todas' | 'nao_lidas' | 'lidas';
type PeriodFilter = 'todos' | 'hoje' | 'semana' | 'historico';

export const NotificacoesScreen: React.FC<NotificacoesScreenProps> = ({
  currentUserName,
  onNavigateTab,
  onBack,
}) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>(() =>
    getUserNotifications(currentUserName).filter(
      (n) => (n.category as any) !== 'Chat' && n.targetTab !== 'Chat'
    )
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | NotificationCategory>('Todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  // Ref e rolagem suave das abas de categorias
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const scrollAmount = direction === 'left' ? -180 : 180;
      categoriesScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Recarrega notificações em tempo real
  useEffect(() => {
    const reload = () => {
      setNotifications(getUserNotifications(currentUserName));
    };
    reload();
    window.addEventListener('fenix_notifications_updated', reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener('fenix_notifications_updated', reload);
      window.removeEventListener('storage', reload);
    };
  }, [currentUserName]);

  // Contadores
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const unreadCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    CATEGORIES.forEach((cat) => {
      if (cat === 'Todas') {
        map[cat] = unreadCount;
      } else {
        map[cat] = notifications.filter((n) => n.unread && n.category === cat).length;
      }
    });
    return map;
  }, [notifications, unreadCount]);

  // Helper de data
  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isWithinLastDays = (dateStr?: string, days: number = 7) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
  };

  // Filtragem
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Categoria
      if (selectedCategory !== 'Todas' && n.category !== selectedCategory) {
        return false;
      }

      // 2. Status de Leitura
      if (statusFilter === 'nao_lidas' && !n.unread) return false;
      if (statusFilter === 'lidas' && n.unread) return false;

      // 3. Período
      const dt = n.createdAt || n.time;
      if (periodFilter === 'hoje' && !isToday(dt)) return false;
      if (periodFilter === 'semana' && !isWithinLastDays(dt, 7)) return false;
      if (periodFilter === 'historico' && isWithinLastDays(dt, 7)) return false;

      // 4. Busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchDesc = n.description?.toLowerCase().includes(q);
        const matchCat = n.category?.toLowerCase().includes(q);
        const matchCli = n.metadata?.cliente?.toLowerCase().includes(q) || n.metadata?.clientName?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat && !matchCli) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, selectedCategory, statusFilter, periodFilter, searchQuery]);

  // Ações de seleção múltipla
  const allFilteredSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.includes(n.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Ações em massa
  const handleBulkMarkRead = () => {
    if (selectedIds.length === 0) return;
    markNotificationsAsRead(selectedIds);
    setSelectedIds([]);
    showToast(`${selectedIds.length} notificações marcadas como lidas.`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    deleteNotifications(selectedIds);
    setSelectedIds([]);
    showToast(`${selectedIds.length} notificações excluídas.`);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsReadForUser(currentUserName);
    showToast('Todas as notificações foram marcadas como lidas.');
  };

  const handleClearRead = () => {
    clearAllReadNotificationsForUser(currentUserName);
    showToast('Notificações lidas foram removidas do histórico.');
  };

  // Clicar em notificação individual
  const handleNotificationClick = (n: SystemNotification) => {
    // Marca como lida
    if (n.unread) {
      markNotificationAsRead(n.id);
    }
    // Navega para o módulo
    if (n.targetTab) {
      if (n.targetTab === 'Follow-up' && (n.metadata?.followUpId || n.metadata?.cliente)) {
        try {
          sessionStorage.setItem('fenix_fup_highlight_id', n.metadata?.followUpId || '');
          sessionStorage.setItem('fenix_fup_highlight_client', n.metadata?.cliente || '');
        } catch {}
      }
      if (n.targetTab === 'Chat' || (n.category as string) === 'Chat') {
        const convId = n.metadata?.conversationId;
        if (convId) {
          window.dispatchEvent(
            new CustomEvent('fenix_select_chat_conversation', { detail: { conversationId: convId } })
          );
        }
      }
      onNavigateTab(n.targetTab, n.metadata);
    }
  };

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'Tarefas':
        return CheckSquare;
      case 'Boletos':
        return Barcode;
      case 'Follow-up':
        return PhoneCall;
      case 'Meta':
        return Target;
      case 'Estoque':
        return Package;
      case 'Tabela Comercial':
        return Table;
      case 'Notas':
        return FileEdit;
      case 'Pendências':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getCategoryColor = (cat: NotificationCategory) => {
    switch (cat) {
      case 'Tarefas':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Boletos':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Follow-up':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Meta':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'Estoque':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Tabela Comercial':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Notas':
        return 'text-sky-600 bg-sky-50 border-sky-200';
      case 'Pendências':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#091122] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#0052cc] flex items-center justify-center shadow-2xs relative">
            <Bell className="w-6 h-6 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#0052cc] text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#091122] tracking-tight flex items-center gap-2.5">
              <span>Central de Notificações</span>
              {unreadCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0052cc] font-bold">
                  {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Avisos em tempo real de tarefas, boletos, follow-ups e metas da Fênix World.
            </p>
          </div>
        </div>

        {/* Ações globais do Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0052cc] border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Marcar Todas como Lidas</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearRead}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Remover do histórico as notificações já lidas"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Limpar Lidas</span>
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              Voltar
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Linha 1: Campo de Busca e Filtros Rápidos */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Input de Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, cliente, assunto ou texto..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro de Status: Todas | Não Lidas | Lidas */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('todas')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'todas'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('nao_lidas')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'nao_lidas'
                  ? 'bg-[#0052cc] text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Não Lidas</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-white text-[#0052cc] rounded-full font-black">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('lidas')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'lidas'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Lidas ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center gap-1 text-xs">
            {(['todos', 'hoje', 'semana', 'historico'] as PeriodFilter[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setPeriodFilter(period)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer capitalize ${
                  periodFilter === period
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {period === 'todos' ? 'Todo Período' : period}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: Categorias */}
        <div className="relative flex items-center border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 mr-1.5 border border-slate-200/80 bg-slate-50/50"
            title="Navegar abas para a esquerda"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div
            ref={categoriesScrollRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth touch-pan-x"
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const unread = unreadCountByCategory[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none shrink-0 ${
                    isSelected
                      ? 'bg-[#0052cc] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  {unread > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                        isSelected ? 'bg-white text-[#0052cc]' : 'bg-[#0052cc] text-white'
                      }`}
                    >
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-1.5 border border-slate-200/80 bg-slate-50/50"
            title="Navegar abas para a direita"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Barra de Ações em Massa (quando há itens selecionados) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0052cc]">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkMarkRead}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100 text-[#0052cc] border border-blue-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Marcar como Lidas
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 cursor-pointer font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Notificações */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cabeçalho da Lista com Selecionar Todos */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 text-[#0052cc] rounded border-slate-300 focus:ring-[#0052cc]"
            />
            <span>Selecionar todas ({filteredNotifications.length})</span>
          </label>
          <span className="text-slate-400 text-[11px]">
            Mostrando {filteredNotifications.length} registro{filteredNotifications.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Itens */}
        <div className="divide-y divide-slate-100">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const isSelected = selectedIds.includes(notif.id);
              const Icon = getCategoryIcon(notif.category);
              const colorClass = getCategoryColor(notif.category);
              const clientName = notif.metadata?.cliente || notif.metadata?.clientName;

              return (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 group relative ${
                    notif.unread ? 'bg-blue-50/25' : ''
                  }`}
                >
                  {/* Indicador de não lida */}
                  {notif.unread && (
                    <span className="absolute left-1.5 top-6 w-2 h-2 rounded-full bg-[#0052cc]" />
                  )}

                  {/* Checkbox de seleção */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(notif.id)}
                      className="w-4 h-4 text-[#0052cc] rounded border-slate-300 focus:ring-[#0052cc] cursor-pointer"
                    />
                  </div>

                  {/* Ícone temático da categoria */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5 ${colorClass}`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>

                  {/* Conteúdo Principal */}
                  <div
                    onClick={() => handleNotificationClick(notif)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-bold truncate ${
                            notif.unread ? 'text-slate-900 font-extrabold' : 'text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </span>

                        {/* Badge da Categoria */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {notif.category}
                        </span>

                        {/* Cliente / Assunto em destaque */}
                        {clientName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#0052cc] border border-blue-200">
                            Cliente: {clientName}
                          </span>
                        )}
                      </div>

                      {/* Horário */}
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{notif.time}</span>
                      </span>
                    </div>

                    {/* Descrição */}
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {notif.description}
                    </p>

                    {/* Desativar lembretes diretamente pelo sino */}
                    {notif.category === 'Follow-up' && notif.metadata?.followUpId && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deactivateFollowUpFromNotification(notif.metadata!.followUpId);
                            deleteNotification(notif.id);
                            showToast('Lembretes do Follow-up desativados com sucesso.');
                          }}
                          title="Desativar lembretes deste Follow-up"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <BellOff className="w-3 h-3 text-slate-500" />
                          <span>Desativar lembretes</span>
                        </button>
                      </div>
                    )}

                    {/* Rodapé do Card */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      {notif.targetTab && (
                        <span className="font-semibold text-[#0052cc] hover:underline flex items-center gap-1">
                          <span>Abrir em {notif.targetTab}</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                      {notif.authorName && (
                        <span>Enviado por: {notif.authorName}</span>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas à Direita */}
                  <div className="flex items-center gap-1 pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Alternar Leitura */}
                    <button
                      type="button"
                      onClick={() => toggleNotificationRead(notif.id)}
                      title={notif.unread ? 'Marcar como lida' : 'Marcar como não lida'}
                      className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      {notif.unread ? (
                        <CheckCircle2 className="w-4 h-4 text-[#0052cc]" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    {/* Excluir */}
                    <button
                      type="button"
                      onClick={() => {
                        deleteNotification(notif.id);
                        showToast('Notificação excluída.');
                      }}
                      title="Excluir notificação"
                      className="w-7 h-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                Nenhuma notificação encontrada
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `Nenhum resultado para a busca "${searchQuery}". Tente outros termos ou remova os filtros.`
                  : `Tudo limpo na categoria ${selectedCategory}! Você está em dia com seus compromissos.`}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Limpar Busca
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
