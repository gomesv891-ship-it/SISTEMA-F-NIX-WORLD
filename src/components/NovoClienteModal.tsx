import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  Star,
  Calculator,
  FileText,
  CheckSquare,
  AlertCircle,
  Loader2,
  Check,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { ClientRecord, ClientType } from '../types';
import { addClientActivity } from '../utils/activities';
import { getSellerIdForUser } from '../utils/userDataFilter';
import { saveItemToSupabase } from '../utils/supabaseClient';

export type NovoClienteAction =
  | 'save_only'
  | 'go_calculadora'
  | 'go_orcamento'
  | 'go_tarefa';

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onSaveSuccess: (savedClient: ClientRecord, action: NovoClienteAction) => void;
}

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

export const NovoClienteModal: React.FC<NovoClienteModalProps> = ({
  isOpen,
  onClose,
  currentUserName,
  onSaveSuccess,
}) => {
  const [name, setName] = useState('');
  const [clientType, setClientType] = useState<ClientType>('Cliente Final');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<NovoClienteAction | null>(null);
  const [savedSuccessClient, setSavedSuccessClient] = useState<ClientRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    if (isTypeDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isTypeDropdownOpen]);

  // Reset fields when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setClientType('Cliente Final');
      setWhatsapp('');
      setNotes('');
      setIsImportant(false);
      setErrors({});
      setIsTypeDropdownOpen(false);
      setSavedSuccessClient(null);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Mask WhatsApp: (00) 00000-0000 or (00) 0000-0000
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
    setWhatsapp(formatted);
    if (errors.whatsapp) {
      setErrors((prev) => ({ ...prev, whatsapp: '' }));
    }
  };

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) {
      errs.name = 'Nome ou Razão Social é obrigatório.';
    }
    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (!cleanPhone) {
      errs.whatsapp = 'WhatsApp é obrigatório.';
    } else if (cleanPhone.length < 10) {
      errs.whatsapp = 'Informe um telefone válido com DDD (mínimo 10 dígitos).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (action: NovoClienteAction) => {
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmittingAction(action);
    setSubmitError(null);

    try {
      const newClientId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newClientRecord: ClientRecord = {
        id: newClientId,
        name: name.trim(),
        clientType,
        whatsapp: whatsapp.trim(),
        isImportant,
        notes: notes.trim() || undefined,
        registeredAt: new Date().toISOString(),
        registeredBy: currentUserName,
        vendedorId: getSellerIdForUser(currentUserName),
        status: 'ativo',
      };

      // Gravação no Supabase primeiro com confirmação obrigatória
      const res = await saveItemToSupabase<ClientRecord>(
        'fenix_clients_db',
        newClientRecord,
        currentUserName
      );

      if (!res.success) {
        setSubmitError(res.error || 'Não foi possível salvar. Verifique sua conexão e tente novamente.');
        setIsSubmitting(false);
        setSubmittingAction(null);
        return;
      }

      // Supabase confirmou sucesso -> Definir cliente ativo e registrar atividade
      localStorage.setItem('fenix_active_client', JSON.stringify(newClientRecord));

      // Register activity
      addClientActivity({
        clientId: newClientId,
        type: 'cadastro',
        title: 'Cliente cadastrado',
        description: `Cliente cadastrado como ${clientType} por ${currentUserName}.`,
        date: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        userName: currentUserName,
      });

      // Dispatch event to sync other views
      window.dispatchEvent(new Event('fenix_clients_updated'));

      // Brief tactile animation delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (action === 'save_only') {
        setSavedSuccessClient(newClientRecord);
      } else {
        onSaveSuccess(newClientRecord, action);
      }
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err);
      setSubmitError('Não foi possível salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const currentTypeItem =
    CLIENT_TYPE_ITEMS.find((item) => item.type === clientType) || CLIENT_TYPE_ITEMS[0];
  const CurrentTypeIcon = currentTypeItem.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          if (savedSuccessClient) {
            onSaveSuccess(savedSuccessClient, 'save_only');
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-xl w-full flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-2xs">
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#091122] tracking-tight">
                {savedSuccessClient ? 'Cliente Cadastrado' : 'Novo Cliente'}
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                {savedSuccessClient
                  ? 'Registro salvo com sucesso. Escolha o próximo passo:'
                  : 'Preencha os dados para iniciar o relacionamento comercial.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (savedSuccessClient) {
                onSaveSuccess(savedSuccessClient, 'save_only');
              } else {
                onClose();
              }
            }}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedSuccessClient ? (
          /* TELA APÓS SALVAR: Opção direta de Ir para Calculadora Novo Orçamento ou Nova Tarefa */
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-9 h-9 stroke-[2.4]" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0052cc] text-xs font-bold border border-blue-100 mb-1">
                <CurrentTypeIcon className="w-3.5 h-3.5" />
                <span>{savedSuccessClient.clientType}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#091122] tracking-tight">
                &ldquo;{savedSuccessClient.name}&rdquo; salvo com sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">
                O que você deseja fazer agora com este cliente?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-1">
              {/* Opção 1: Novo Orçamento */}
              <button
                type="button"
                onClick={() => {
                  onSaveSuccess(savedSuccessClient, 'go_orcamento');
                }}
                className="p-4 rounded-2xl bg-[#0052cc] hover:bg-[#0047b3] text-white flex flex-col items-center justify-center text-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-white stroke-[2.2]" />
                </div>
                <span className="text-sm font-bold">Novo Orçamento</span>
                <span className="text-[11px] text-blue-100 font-medium leading-tight">
                  Proposta comercial com tabela de {savedSuccessClient.clientType}
                </span>
              </button>

              {/* Opção 2: Ir para Calculadora */}
              <button
                type="button"
                onClick={() => {
                  onSaveSuccess(savedSuccessClient, 'go_calculadora');
                }}
                className="p-4 rounded-2xl bg-[#091122] hover:bg-black text-white flex flex-col items-center justify-center text-center gap-2 shadow-lg shadow-slate-900/20 transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calculator className="w-6 h-6 text-white stroke-[2.2]" />
                </div>
                <span className="text-sm font-bold">Ir para Calculadora</span>
                <span className="text-[11px] text-slate-300 font-medium leading-tight">
                  Cálculo técnico de pisos, m², caixas e cola
                </span>
              </button>

              {/* Opção 3: Nova Tarefa */}
              <button
                type="button"
                onClick={() => {
                  onSaveSuccess(savedSuccessClient, 'go_tarefa');
                }}
                className="p-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 flex flex-col items-center justify-center text-center gap-2 shadow-sm transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckSquare className="w-6 h-6 text-slate-700 stroke-[2.2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">Nova Tarefa</span>
                <span className="text-[11px] text-slate-500 font-medium leading-tight">
                  Agendar pendência, follow-up ou contato
                </span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  onSaveSuccess(savedSuccessClient, 'save_only');
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Permanecer na Lista de Clientes
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {/* 1. Nome / Razão Social * */}
          <div>
            <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
              Nome / Razão Social <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={name}
                autoFocus
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Ex: Construtora Horizonte ou Mariana Drummond"
                className={`w-full h-11 pl-10 pr-4 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                  errors.name
                    ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100'
                    : 'border-slate-200 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-100'
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          {/* 2. WhatsApp * */}
          <div>
            <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
              WhatsApp <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(00) 00000-0000"
                className={`w-full h-11 pl-10 pr-4 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                  errors.whatsapp
                    ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100'
                    : 'border-slate-200 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-100'
                }`}
              />
            </div>
            {errors.whatsapp && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.whatsapp}
              </p>
            )}
          </div>

          {/* 3. Tipo de Cliente * (Dropdown com seta e ícones) */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
              Tipo de Cliente <span className="text-rose-500">*</span>
            </label>

            {/* Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
              className={`w-full h-11 px-3.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border rounded-xl text-sm flex items-center justify-between transition-all cursor-pointer ${
                isTypeDropdownOpen
                  ? 'border-[#0052cc] ring-2 ring-blue-100 bg-white'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-blue-100/70">
                  <CurrentTypeIcon className={`w-4 h-4 ${currentTypeItem.iconColor}`} />
                </div>
                <span className="font-semibold text-slate-800">{currentTypeItem.label}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isTypeDropdownOpen ? 'rotate-180 text-[#0052cc]' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Options */}
            {isTypeDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {CLIENT_TYPE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = clientType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setClientType(item.type);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 text-[#0052cc] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-white shadow-2xs text-[#0052cc]'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${item.iconColor}`} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#0052cc] stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Marcar como Cliente Importante (com estrelinha azul e toggle simples) */}
          <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-blue-200/80">
                <Star
                  className={`w-5 h-5 ${
                    isImportant
                      ? 'fill-[#0052cc] text-[#0052cc]'
                      : 'text-[#0052cc] fill-transparent stroke-[1.8]'
                  }`}
                />
              </div>
              <div>
                <span className="block text-xs sm:text-sm font-bold text-slate-900">
                  Marcar como Cliente Importante
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Destaca o cliente na carteira com estrela azul e inclusão na aba Importantes.
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isImportant}
              onClick={() => setIsImportant(!isImportant)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isImportant ? 'bg-[#0052cc]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isImportant ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 5. Observações */}
          <div>
            <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
              Observações
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações internas sobre o cliente, histórico da conversa, preferências..."
              className="w-full p-3.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-100 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none"
            />
          </div>

          {/* Error Banner if Supabase save fails */}
          {submitError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="font-medium">{submitError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-3 flex-shrink-0">
          {/* Linha 1: "Cancelar" e "✓ Salvar Cliente" em Azul Fênix */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 bg-white text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSave('save_only')}
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#0052cc] hover:bg-[#0047b3] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-75"
            >
              {isSubmitting && submittingAction === 'save_only' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{isSubmitting && submittingAction === 'save_only' ? 'Salvando...' : 'Salvar Cliente'}</span>
            </button>
          </div>

          {/* Linha 2 (Ações Adicionais secundárias e discretas): [+ Ir para Calculadora] [+ Gerar Orçamento] [+ Agendar Tarefa] */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => handleSave('go_calculadora')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200/90 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSubmitting && submittingAction === 'go_calculadora' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <Calculator className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
              )}
              <span>{isSubmitting && submittingAction === 'go_calculadora' ? 'Salvando...' : 'Ir para Calculadora'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('go_orcamento')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200/90 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSubmitting && submittingAction === 'go_orcamento' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
              )}
              <span>{isSubmitting && submittingAction === 'go_orcamento' ? 'Salvando...' : 'Gerar Orçamento'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('go_tarefa')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200/90 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSubmitting && submittingAction === 'go_tarefa' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
              )}
              <span>{isSubmitting && submittingAction === 'go_tarefa' ? 'Salvando...' : 'Agendar Tarefa'}</span>
            </button>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
