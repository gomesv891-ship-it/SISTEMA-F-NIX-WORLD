import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Phone,
  Calendar,
  User,
  Clock,
  ExternalLink,
  Calculator,
  FileText,
  CheckSquare,
  Pencil,
  CheckCircle2,
  AlertCircle,
  StickyNote,
  MessageSquare,
  ShoppingBag,
  ShieldCheck,
  Send,
  PhoneCall,
  UserPlus,
  History,
  Plus,
  CornerDownRight,
  Receipt,
  Home,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  Users,
} from 'lucide-react';
import { ClientRecord, ClientActivity, ActivityType } from '../types';
import { getClientActivities, addClientActivity } from '../utils/activities';

interface ClientePerfilModalProps {
  client: ClientRecord;
  currentUserName: string;
  onClose: () => void;
  onEdit: (client: ClientRecord) => void;
  onSelectAction: (
    action: 'Calculadora' | 'Orçamentos' | 'Tarefas',
    client: ClientRecord
  ) => void;
  onToggleImportant: (client: ClientRecord) => void;
}

// Subtle badge colors
const getBadgeStyles = (type: string) => {
  switch (type) {
    case 'Arquiteto':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    case 'Cliente Final':
      return 'bg-blue-50 text-[#0057ff] border-blue-200/80';
    case 'Construtora':
      return 'bg-amber-50 text-amber-800 border-amber-200/80';
    case 'Engenheiro':
      return 'bg-cyan-50 text-cyan-800 border-cyan-200/80';
    case 'Instalador':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    case 'Revenda':
      return 'bg-purple-50 text-purple-800 border-purple-200/80';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

// Activity type visual configuration
const getActivityConfig = (type: ActivityType) => {
  switch (type) {
    case 'orcamento_criado':
    case 'orcamento_atualizado':
      return {
        icon: <FileText className="w-4 h-4 text-[#0057ff]" />,
        bg: 'bg-blue-50 text-[#0057ff] border-blue-200',
        badge: 'Orçamento',
      };
    case 'orcamento_enviado':
      return {
        icon: <Send className="w-4 h-4 text-sky-600" />,
        bg: 'bg-sky-50 text-sky-700 border-sky-200',
        badge: 'Orçamento Enviado',
      };
    case 'followup_realizado':
      return {
        icon: <PhoneCall className="w-4 h-4 text-amber-600" />,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badge: 'Follow-up',
      };
    case 'tarefa_criada':
      return {
        icon: <CheckSquare className="w-4 h-4 text-indigo-600" />,
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        badge: 'Tarefa',
      };
    case 'tarefa_concluida':
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Tarefa Concluída',
      };
    case 'venda_realizada':
      return {
        icon: <ShoppingBag className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Venda Realizada',
      };
    case 'pos_venda_criado':
    case 'pos_venda_atualizado':
      return {
        icon: <ShieldCheck className="w-4 h-4 text-teal-600" />,
        bg: 'bg-teal-50 text-teal-700 border-teal-200',
        badge: 'Pós-Venda',
      };
    case 'nota_adicionada':
      return {
        icon: <StickyNote className="w-4 h-4 text-amber-600" />,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badge: 'Nota',
      };
    case 'pendencia_criada':
      return {
        icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        badge: 'Pendência',
      };
    case 'pendencia_resolvida':
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Resolvida',
      };
    case 'calculo_realizado':
      return {
        icon: <Calculator className="w-4 h-4 text-[#0057ff]" />,
        bg: 'bg-blue-50 text-[#0057ff] border-blue-200',
        badge: 'Cálculo',
      };
    case 'contato_registrado':
      return {
        icon: <MessageSquare className="w-4 h-4 text-cyan-600" />,
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        badge: 'Contato',
      };
    case 'cadastro_atualizado':
      return {
        icon: <Pencil className="w-4 h-4 text-slate-600" />,
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        badge: 'Atualização',
      };
    case 'status_alterado':
      return {
        icon: <Clock className="w-4 h-4 text-purple-600" />,
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        badge: 'Status',
      };
    case 'boleto_cadastrado':
      return {
        icon: <Receipt className="w-4 h-4 text-blue-600" />,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        badge: 'Boleto',
      };
    case 'boleto_enviado':
      return {
        icon: <Send className="w-4 h-4 text-cyan-600" />,
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        badge: 'Envio',
      };
    case 'boleto_atendido':
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Atendido',
      };
    case 'cadastro':
    default:
      return {
        icon: <UserPlus className="w-4 h-4 text-[#0057ff]" />,
        bg: 'bg-blue-50 text-[#0057ff] border-blue-200',
        badge: 'Cadastro',
      };
  }
};

export const ClientePerfilModal: React.FC<ClientePerfilModalProps> = ({
  client,
  currentUserName,
  onClose,
  onEdit,
  onSelectAction,
  onToggleImportant,
}) => {
  const [activities, setActivities] = useState<ClientActivity[]>([]);

  // Fast custom activity logging state
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<ActivityType>('contato_registrado');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDetails, setEventDetails] = useState('');

  // Load activities strictly for this client
  const refreshActivities = () => {
    const list = getClientActivities(client.id, client);
    setActivities(list);
  };

  useEffect(() => {
    refreshActivities();

    const handleActivitiesUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ clientId?: string }>;
      if (!customEvent.detail || customEvent.detail.clientId === client.id) {
        refreshActivities();
      }
    };

    window.addEventListener('fenix_activities_updated', handleActivitiesUpdate);
    return () => {
      window.removeEventListener('fenix_activities_updated', handleActivitiesUpdate);
    };
  }, [client.id]);

  // Format real date from database
  const formatDbDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Add a real event to history
  const handleSaveCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDesc.trim()) return;

    const defaultTitles: Record<ActivityType, string> = {
      contato_registrado: 'Contato registrado',
      followup_realizado: 'Follow-up realizado',
      nota_adicionada: 'Nota adicionada',
      orcamento_enviado: 'Orçamento enviado',
      venda_realizada: 'Venda realizada',
      pos_venda_criado: 'Pós-venda criado',
      pos_venda_atualizado: 'Pós-venda atualizado',
      pendencia_criada: 'Pendência criada',
      pendencia_resolvida: 'Pendência resolvida',
      orcamento_criado: 'Orçamento criado',
      orcamento_atualizado: 'Orçamento atualizado',
      tarefa_criada: 'Tarefa criada',
      tarefa_concluida: 'Tarefa concluída',
      calculo_realizado: 'Cálculo realizado',
      cadastro: 'Cliente cadastrado no sistema',
      cadastro_atualizado: 'Cadastro atualizado',
      status_alterado: 'Status alterado',
      boleto_cadastrado: 'Boleto cadastrado',
      boleto_enviado: 'Boleto enviado',
      boleto_atendido: 'Boleto atendido',
    };

    const newAct = addClientActivity({
      clientId: client.id,
      type: selectedEventType,
      title: defaultTitles[selectedEventType] || 'Acontecimento registrado',
      description: eventDesc.trim(),
      date: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      userName: currentUserName || 'Vanessa Gomes',
      relevantInfo: eventDetails.trim() || undefined,
    });

    setActivities((prev) => [newAct, ...prev]);
    setIsAddingEvent(false);
    setEventDesc('');
    setEventDetails('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative"
      >
        {/* =======================================================
            CABEÇALHO DO PERFIL
            - Nome / Razão Social
            - Tipo de Cliente
            - WhatsApp
            - Indicador de Cliente Importante (Estrela Azul)
           ======================================================= */}
        <div className="px-6 py-5 sm:px-7 sm:py-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Ícone por Tipo de Cliente (Sem Avatar de Letras) */}
            {(() => {
              const isInactive = client.status === 'inativo';
              let IconComp = Users;
              let bg = 'bg-blue-50 text-[#0052cc] border-blue-100';

              if (isInactive) {
                IconComp = User;
                bg = 'bg-slate-100 text-slate-400 border-slate-200';
              } else {
                switch (client.clientType) {
                  case 'Cliente Final':
                    IconComp = User;
                    bg = 'bg-blue-50 text-[#0052cc] border-blue-100';
                    break;
                  case 'Revenda':
                    IconComp = Store;
                    bg = 'bg-purple-50 text-purple-600 border-purple-100';
                    break;
                  case 'Construtora':
                    IconComp = Building2;
                    bg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    break;
                  case 'Instalador':
                    IconComp = Wrench;
                    bg = 'bg-orange-50 text-orange-600 border-orange-100';
                    break;
                  case 'Arquiteto':
                    IconComp = PenTool;
                    bg = 'bg-violet-50 text-violet-600 border-violet-100';
                    break;
                  case 'Engenheiro':
                    IconComp = HardHat;
                    bg = 'bg-sky-50 text-sky-700 border-sky-100';
                    break;
                  default:
                    IconComp = User;
                    bg = 'bg-blue-50 text-[#0052cc] border-blue-100';
                }
              }

              return (
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 select-none shadow-xs border ${bg}`}
                >
                  <IconComp className="w-6 h-6 stroke-[2]" />
                </div>
              );
            })()}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-[#091122] tracking-tight">
                  {client.name}
                </h2>

                {/* Indicador de Cliente Importante (Estrela Azul) */}
                <button
                  type="button"
                  onClick={() => onToggleImportant(client)}
                  title={
                    client.isImportant
                      ? 'Cliente Importante (clique para alternar)'
                      : 'Marcar como Cliente Importante'
                  }
                  className="p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-1.5 group"
                >
                  {client.isImportant ? (
                    <Star className="w-5 h-5 text-[#0052cc] fill-[#0052cc] stroke-[1.5]" />
                  ) : (
                    <Star className="w-5 h-5 text-slate-300 hover:text-[#0052cc] fill-transparent stroke-[1.8] group-hover:scale-110 transition-transform" />
                  )}
                  {client.isImportant && (
                    <span className="text-[11px] font-bold text-[#0052cc] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
                      Cliente Importante
                    </span>
                  )}
                </button>
              </div>

              {/* Badges & WhatsApp */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {/* Tipo de Cliente */}
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getBadgeStyles(
                    client.clientType
                  )}`}
                >
                  {client.clientType || 'Não definido'}
                </span>

                {/* Status Ativo/Inativo */}
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    client.status === 'inativo'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  }`}
                >
                  {client.status === 'inativo' ? 'Inativo' : 'Ativo'}
                </span>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/55${client.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0057ff] hover:text-[#0047db] bg-blue-50/60 hover:bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 transition-colors"
                  title="Conversar no WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{client.whatsapp}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="self-start sm:self-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* =======================================================
            SCROLLABLE CONTENT
           ======================================================= */}
        <div className="overflow-y-auto p-6 sm:p-7 space-y-6 flex-1 text-slate-800">
          {/* =======================================================
              INFORMAÇÕES DO CLIENTE (Dados Reais do Banco)
             ======================================================= */}
          <section className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/70 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0057ff]" />
                <span>Informações do Cliente</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                ID: {client.id.slice(0, 8)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs sm:text-sm">
              {/* Nome / Razão Social */}
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Nome / Razão Social
                </span>
                <span className="font-bold text-[#091122]">{client.name}</span>
              </div>

              {/* WhatsApp */}
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  WhatsApp
                </span>
                <span className="font-bold text-slate-800">{client.whatsapp}</span>
              </div>

              {/* Tipo de Cliente */}
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Tipo de Cliente
                </span>
                <span className="font-bold text-slate-800">
                  {client.clientType || 'Não definido'}
                </span>
              </div>

              {/* Cliente Importante */}
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Cliente Importante
                </span>
                <div className="flex items-center gap-1.5 font-bold">
                  {client.isImportant ? (
                    <>
                      <Star className="w-4 h-4 text-[#0057ff] fill-[#0057ff]" />
                      <span className="text-[#0057ff]">Sim (Destaque Comercial)</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 text-[#0057ff] fill-transparent stroke-[1.8]" />
                      <span className="text-slate-600">Não</span>
                    </>
                  )}
                </div>
              </div>

              {/* Data de Cadastro */}
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Data de Cadastro
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDbDate(client.registeredAt)}</span>
                </div>
              </div>

              {/* Status */}
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Status no CRM
                </span>
                <span
                  className={`inline-block font-bold ${
                    client.status === 'inativo' ? 'text-slate-600' : 'text-emerald-700'
                  }`}
                >
                  {client.status === 'inativo' ? 'Inativo' : 'Ativo'}
                </span>
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-100">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Observações
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {client.notes?.trim() || (
                  <span className="text-slate-400 italic">
                    Nenhuma observação cadastrada no momento.
                  </span>
                )}
              </p>
            </div>
          </section>

          {/* =======================================================
              AÇÕES RÁPIDAS
              - Calculadora (vinculada ao cliente)
              - Orçamento (vinculado ao cliente)
              - Tarefa (vinculada ao cliente)
             ======================================================= */}
          <section className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ações Rápidas com {client.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inicia a ferramenta selecionada com este cliente já vinculado automaticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Calculadora */}
              <button
                type="button"
                onClick={() => onSelectAction('Calculadora', client)}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0057ff] hover:bg-blue-50/40 text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calculator className="w-4 h-4 stroke-[2]" />
                  </div>
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0057ff] transition-colors" />
                </div>
                <div>
                  <span className="block font-bold text-xs sm:text-sm text-[#091122] group-hover:text-[#0057ff] transition-colors">
                    Calculadora
                  </span>
                  <span className="text-[11px] text-slate-400">Calcular películas</span>
                </div>
              </button>

              {/* Orçamento */}
              <button
                type="button"
                onClick={() => onSelectAction('Orçamentos', client)}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0057ff] hover:bg-blue-50/40 text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4 stroke-[2]" />
                  </div>
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0057ff] transition-colors" />
                </div>
                <div>
                  <span className="block font-bold text-xs sm:text-sm text-[#091122] group-hover:text-[#0057ff] transition-colors">
                    Orçamento
                  </span>
                  <span className="text-[11px] text-slate-400">Novo orçamento comercial</span>
                </div>
              </button>

              {/* Tarefa */}
              <button
                type="button"
                onClick={() => onSelectAction('Tarefas', client)}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0057ff] hover:bg-blue-50/40 text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckSquare className="w-4 h-4 stroke-[2]" />
                  </div>
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0057ff] transition-colors" />
                </div>
                <div>
                  <span className="block font-bold text-xs sm:text-sm text-[#091122] group-hover:text-[#0057ff] transition-colors">
                    Tarefa
                  </span>
                  <span className="text-[11px] text-slate-400">Agendar follow-up / tarefa</span>
                </div>
              </button>
            </div>
          </section>

          {/* =======================================================
              HISTÓRICO DO CLIENTE
              - Linha do tempo individual
              - Do mais recente para o mais antigo
              - Ícone, descrição, data, horário, info relevante
              - Somente dados reais existentes no banco
             ======================================================= */}
          <section className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#0057ff]" />
                  <h3 className="text-sm font-bold text-[#091122]">
                    HISTÓRICO
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {activities.length} {activities.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Linha do tempo do relacionamento com este cliente (do mais recente ao mais antigo).
                </p>
              </div>

              {/* Botão para registrar novo acontecimento real */}
              <button
                type="button"
                onClick={() => setIsAddingEvent(!isAddingEvent)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#0057ff]" />
                <span>Registrar Acontecimento</span>
              </button>
            </div>

            {/* Formulário Retrátil para Registrar Acontecimento */}
            {isAddingEvent && (
              <form
                onSubmit={handleSaveCustomEvent}
                className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0057ff] uppercase tracking-wider">
                    Novo Acontecimento para {client.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingEvent(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tipo de Acontecimento
                    </label>
                    <select
                      value={selectedEventType}
                      onChange={(e) => setSelectedEventType(e.target.value as ActivityType)}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-[#0057ff]"
                    >
                      <option value="contato_registrado">Contato registrado</option>
                      <option value="followup_realizado">Follow-up realizado</option>
                      <option value="nota_adicionada">Nota adicionada</option>
                      <option value="orcamento_enviado">Orçamento enviado</option>
                      <option value="venda_realizada">Venda realizada</option>
                      <option value="pos_venda_criado">Pós-venda criado</option>
                      <option value="pendencia_criada">Pendência criada</option>
                      <option value="pendencia_resolvida">Pendência resolvida</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Descrição do Acontecimento *
                    </label>
                    <input
                      type="text"
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      placeholder="Ex: Contato via WhatsApp para confirmação de medidas da fachada..."
                      required
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-[#0057ff]"
                    >
                    </input>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Informações Relevantes (opcional)
                  </label>
                  <input
                    type="text"
                    value={eventDetails}
                    onChange={(e) => setEventDetails(e.target.value)}
                    placeholder="Ex: Cliente prefere película Platinum 20% com garantia estendida."
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-[#0057ff]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingEvent(false)}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="h-8 px-4 rounded-lg bg-[#0057ff] hover:bg-[#0047db] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Salvar no Histórico
                  </button>
                </div>
              </form>
            )}

            {/* Linha do Tempo (Timeline) */}
            {activities.length === 0 ? (
              <div className="py-10 text-center bg-slate-50/60 rounded-2xl border border-slate-100">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  Nenhum histórico registrado para este cliente ainda
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Acontecimentos reais (orçamentos, cálculos, tarefas e contatos) serão listados aqui cronologicamente.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-200">
                {activities.map((act) => {
                  const cfg = getActivityConfig(act.type);
                  return (
                    <div key={act.id} className="relative group">
                      {/* Timeline Dot with Icon */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-0.5 w-6 sm:w-8 h-6 sm:h-8 rounded-full border flex items-center justify-center shadow-2xs z-10 bg-white ${cfg.bg}`}
                        title={cfg.badge}
                      >
                        {cfg.icon}
                      </div>

                      {/* Event Card */}
                      <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-2xl p-4 transition-colors">
                        {/* Event Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-[#091122]">
                              {act.title}
                            </h4>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg}`}
                            >
                              {cfg.badge}
                            </span>
                          </div>

                          {/* Data e Horário */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{act.date}</span>
                            {act.time && (
                              <>
                                <span>•</span>
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{act.time}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-slate-700 mt-1.5 leading-relaxed">
                          {act.description}
                        </p>

                        {/* Informações Relevantes */}
                        {act.relevantInfo && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-600">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              Informações Relevantes:
                            </span>
                            <span>{act.relevantInfo}</span>
                          </div>
                        )}

                        {/* Usuário Responsável */}
                        {act.userName && (
                          <span className="text-[11px] text-slate-400 block mt-2">
                            Registrado por: <strong className="text-slate-600 font-medium">{act.userName}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* =======================================================
            RODAPÉ DO MODAL
           ======================================================= */}
        <div className="px-6 py-4 sm:px-7 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onEdit(client)}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-[#0057ff]" />
            <span>Editar Cadastro</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-[#0057ff] hover:bg-[#0047db] text-white font-bold text-xs tracking-wide transition-colors cursor-pointer shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
