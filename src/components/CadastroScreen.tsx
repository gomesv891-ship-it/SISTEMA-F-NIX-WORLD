import React, { useState, useEffect } from 'react';
import {
  Home,
  UserPlus,
  User,
  Phone,
  ChevronDown,
  Info,
  Star,
  FileText,
  Save,
  CheckCircle2,
  Loader2,
  Calculator,
  CheckSquare,
  Users,
} from 'lucide-react';
import { ClientFormData, ClientRecord, ClientType } from '../types';
import { addClientActivity } from '../utils/activities';
import { filterClientsForUser, getSellerIdForUser } from '../utils/userDataFilter';
import { saveItemToSupabase } from '../utils/supabaseClient';

interface CadastroScreenProps {
  currentUserName: string;
  selectedClient?: ClientRecord | null;
  onQuickAction?: (
    action: 'Calculadora' | 'Orçamentos' | 'Tarefas',
    client: ClientRecord,
    options?: { createOrcamento?: boolean; openNewTaskModal?: boolean }
  ) => void;
  onClientSaved?: (client: ClientRecord) => void;
}

const CLIENT_TYPES: ClientType[] = [
  'Arquiteto',
  'Cliente Final',
  'Construtora',
  'Engenheiro',
  'Instalador',
  'Revenda',
];

export const CadastroScreen: React.FC<CadastroScreenProps> = ({
  currentUserName,
  selectedClient = null,
  onQuickAction,
  onClientSaved,
}) => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: selectedClient?.name || '',
    whatsapp: selectedClient?.whatsapp || '',
    clientType: selectedClient?.clientType || '',
    isImportant: selectedClient?.isImportant || false,
    notes: selectedClient?.notes || '',
  });

  const [activeClient, setActiveClient] = useState<ClientRecord | null>(selectedClient || null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastSavedName, setLastSavedName] = useState('');
  const [savedClientsList, setSavedClientsList] = useState<ClientRecord[]>([]);

  // Load existing clients from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fenix_clients_db');
      if (stored) {
        setSavedClientsList(filterClientsForUser(JSON.parse(stored), currentUserName));
      }
    } catch {
      // ignore
    }
  }, [currentUserName]);

  // Sync if selectedClient prop changes externally
  useEffect(() => {
    if (selectedClient) {
      setActiveClient(selectedClient);
      setFormData({
        name: selectedClient.name || '',
        whatsapp: selectedClient.whatsapp || '',
        clientType: selectedClient.clientType || '',
        isImportant: !!selectedClient.isImportant,
        notes: selectedClient.notes || '',
      });
    }
  }, [selectedClient]);

  // Auto-mask WhatsApp: (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = '';
    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length <= 2) {
      formatted = `(${digits}`;
    } else if (digits.length <= 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }

    setFormData((prev) => ({ ...prev, whatsapp: formatted }));
    if (errors.whatsapp) {
      setErrors((prev) => ({ ...prev, whatsapp: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Informe o Nome ou Razão Social';
    }

    const digits = formData.whatsapp.replace(/\D/g, '');
    if (!formData.whatsapp.trim() || digits.length < 10) {
      newErrors.whatsapp = 'Informe um WhatsApp válido com DDD';
    }

    if (!formData.clientType) {
      newErrors.clientType = 'Selecione o Tipo de Cliente';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);

    setTimeout(() => {
      const newClient: ClientRecord = {
        ...formData,
        id: activeClient?.id || `cli_${Date.now()}`,
        registeredAt: activeClient?.registeredAt || new Date().toISOString(),
        registeredBy: currentUserName || 'Vanessa Gomes',
        vendedorId: getSellerIdForUser(currentUserName || 'Vanessa Gomes'),
      };

      try {
        const stored = localStorage.getItem('fenix_clients_db');
        const list: ClientRecord[] = stored ? JSON.parse(stored) : [];
        const existingIdx = list.findIndex((c) => c.id === newClient.id);
        if (existingIdx >= 0) {
          list[existingIdx] = newClient;
          addClientActivity({
            clientId: newClient.id,
            type: 'cadastro_atualizado',
            title: 'Cadastro atualizado',
            description: `Cadastro atualizado no sistema como ${newClient.clientType}.`,
            date: new Date().toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
            userName: currentUserName,
            relevantInfo: newClient.notes ? `Obs: ${newClient.notes}` : undefined,
          });
        } else {
          list.push(newClient);
          addClientActivity({
            clientId: newClient.id,
            type: 'cadastro',
            title: 'Cliente cadastrado no sistema',
            description: `Cliente cadastrado com sucesso como ${newClient.clientType}.`,
            date: new Date().toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
            userName: currentUserName,
            relevantInfo: newClient.notes ? `Obs: ${newClient.notes}` : undefined,
          });
        }
        localStorage.setItem('fenix_clients_db', JSON.stringify(list));
        saveItemToSupabase('fenix_clients_db', newClient, 'id', currentUserName).catch(() => {});
        localStorage.setItem('fenix_active_client', JSON.stringify(newClient));
        window.dispatchEvent(new Event('fenix_clients_updated'));
        setSavedClientsList(list);
      } catch {
        // storage fallback
      }

      setLastSavedName(formData.name.trim());
      setActiveClient(newClient);
      setIsSaving(false);
      setShowSuccessToast(true);
      onClientSaved?.(newClient);

      setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
    }, 600);
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      whatsapp: '',
      clientType: '',
      isImportant: false,
      notes: '',
    });
    setActiveClient(null);
    setErrors({});
  };

  const handleSelectExistingClient = (clientId: string) => {
    const client = savedClientsList.find((c) => c.id === clientId);
    if (client) {
      setActiveClient(client);
      setFormData({
        name: client.name,
        whatsapp: client.whatsapp,
        clientType: client.clientType,
        isImportant: client.isImportant,
        notes: client.notes,
      });
      setErrors({});
    }
  };

  const handleGoToQuickAction = (
    action: 'Calculadora' | 'Orçamentos' | 'Tarefas',
    options?: { createOrcamento?: boolean; openNewTaskModal?: boolean }
  ) => {
    const clientToUse: ClientRecord = activeClient || {
      id: `cli_${Date.now()}`,
      name: formData.name.trim() || 'Cliente em Cadastro',
      whatsapp: formData.whatsapp,
      clientType: formData.clientType || 'Cliente Final',
      isImportant: formData.isImportant,
      notes: formData.notes,
      registeredAt: new Date().toISOString(),
      registeredBy: currentUserName || 'Vanessa Gomes',
      vendedorId: getSellerIdForUser(currentUserName || 'Vanessa Gomes'),
    };

    if (formData.name.trim() && !activeClient) {
      try {
        const stored = localStorage.getItem('fenix_clients_db');
        const list: ClientRecord[] = stored ? JSON.parse(stored) : [];
        list.push(clientToUse);
        localStorage.setItem('fenix_clients_db', JSON.stringify(list));
        saveItemToSupabase('fenix_clients_db', clientToUse, 'id', currentUserName).catch(() => {});
      } catch {
        // ignore
      }
    }

    localStorage.setItem('fenix_active_client', JSON.stringify(clientToUse));
    setActiveClient(clientToUse);
    onClientSaved?.(clientToUse);
    onQuickAction?.(action, clientToUse, options);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb row: Home > Cadastro > Novo Cliente */}
      <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
        <Home className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400">›</span>
        <span className="hover:text-slate-700 cursor-pointer">Cadastro</span>
        <span className="text-slate-400">›</span>
        <span className="text-slate-900 font-semibold">Novo Cliente</span>
      </nav>

      {/* Page Title Row: Large blue outline UserPlus icon + Heading */}
      <div className="flex items-start gap-4 pb-1">
        <div className="text-[#0057ff] flex-shrink-0 pt-0.5">
          <UserPlus className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2]" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091122] tracking-tight">
            Cadastro de Cliente
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Preencha as informações abaixo para cadastrar um novo cliente.
          </p>
        </div>
      </div>

      {/* Opções Imediatas Após Salvar Cliente: Ir para Calculadora Novo Orçamento ou Nova Tarefa */}
      {showSuccessToast && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-[#0057ff]/40 text-slate-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 animate-in fade-in slide-in-from-top-4 duration-250">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base sm:text-lg font-black text-slate-900">
                  Cliente &ldquo;{lastSavedName}&rdquo; salvo com sucesso!
                </p>
                {activeClient && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0057ff] font-bold border border-blue-100">
                    {activeClient.clientType}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                O que você deseja fazer agora com este cliente?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => handleGoToQuickAction('Orçamentos', { createOrcamento: true })}
              className="flex-1 sm:flex-initial h-11 px-4.5 rounded-xl bg-[#0057ff] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer group active:scale-[0.98]"
              title="Criar novo orçamento comercial oficial"
            >
              <FileText className="w-4.5 h-4.5 stroke-[2.2] transition-transform group-hover:scale-110" />
              <span>Novo Orçamento</span>
            </button>

            <button
              type="button"
              onClick={() => handleGoToQuickAction('Calculadora')}
              className="flex-1 sm:flex-initial h-11 px-4 rounded-xl bg-[#091122] hover:bg-black text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-900/20 transition-all cursor-pointer group active:scale-[0.98]"
              title="Calcular materiais, m², réguas e caixas"
            >
              <Calculator className="w-4.5 h-4.5 stroke-[2.2] transition-transform group-hover:scale-110" />
              <span>Ir para Calculadora</span>
            </button>

            <button
              type="button"
              onClick={() => handleGoToQuickAction('Tarefas', { openNewTaskModal: true })}
              className="flex-1 sm:flex-initial h-11 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer group active:scale-[0.98]"
              title="Agendar tarefa ou follow-up"
            >
              <CheckSquare className="w-4.5 h-4.5 stroke-[2.2] text-slate-700 transition-transform group-hover:scale-110" />
              <span>Nova Tarefa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSuccessToast(false);
                handleCancel();
              }}
              className="h-11 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              title="Cadastrar outro cliente"
            >
              Novo Cadastro
            </button>
          </div>
        </div>
      )}

      {/* Main Single Composition Form Card: Wider & Balanced across the available space */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-6 sm:p-9">
        {/* Section Heading inside Card */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#091122] tracking-tight">
            Informações do Cliente
          </h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Campo: Nome / Razão Social * */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2 tracking-tight">
              Nome / Razão Social <span className="text-[#0057ff]">*</span>
            </label>
            <div
              className={`h-12 sm:h-13 rounded-xl border transition-all flex items-center px-4 ${
                errors.name
                  ? 'border-rose-300 bg-rose-50/20 ring-3 ring-rose-200/60'
                  : 'border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10'
              }`}
            >
              <User className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0 stroke-[1.8]" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="Digite o nome ou razão social do cliente"
                className="w-full bg-transparent text-slate-800 text-sm placeholder:text-slate-400 outline-none font-medium"
              />
            </div>
            {errors.name && (
              <p className="text-xs text-rose-500 mt-1.5 ml-1 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Row: WhatsApp * & Tipo de Cliente * */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Campo: WhatsApp * */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2 tracking-tight">
                WhatsApp <span className="text-[#0057ff]">*</span>
              </label>
              <div
                className={`h-12 sm:h-13 rounded-xl border transition-all flex items-center px-4 ${
                  errors.whatsapp
                    ? 'border-rose-300 bg-rose-50/20 ring-3 ring-rose-200/60'
                    : 'border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10'
                }`}
              >
                <Phone className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0 stroke-[1.8]" />
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-transparent text-slate-800 text-sm placeholder:text-slate-400 outline-none font-medium"
                />
              </div>
              {errors.whatsapp && (
                <p className="text-xs text-rose-500 mt-1.5 ml-1 font-medium">
                  {errors.whatsapp}
                </p>
              )}
            </div>

            {/* Campo: Tipo de Cliente * */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2 tracking-tight">
                Tipo de Cliente <span className="text-[#0057ff]">*</span>
              </label>
              <div
                className={`relative h-12 sm:h-13 rounded-xl border transition-all flex items-center px-4 ${
                  errors.clientType
                    ? 'border-rose-300 bg-rose-50/20 ring-3 ring-rose-200/60'
                    : 'border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10'
                }`}
              >
                <select
                  value={formData.clientType}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      clientType: e.target.value as ClientType,
                    });
                    if (errors.clientType) setErrors({ ...errors, clientType: '' });
                  }}
                  className={`w-full bg-transparent text-sm outline-none cursor-pointer appearance-none font-medium ${
                    formData.clientType ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  <option value="" disabled>
                    Selecione o tipo
                  </option>
                  {CLIENT_TYPES.map((type) => (
                    <option key={type} value={type} className="text-slate-800">
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 stroke-[2]" />
              </div>
              {errors.clientType && (
                <p className="text-xs text-rose-500 mt-1.5 ml-1 font-medium">
                  {errors.clientType}
                </p>
              )}
            </div>
          </div>

          {/* Campo: Cliente Importante */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                Cliente Importante
              </label>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-3">
              {/* Botão Sim */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isImportant: true })}
                className={`h-10 sm:h-11 px-5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer select-none ${
                  formData.isImportant
                    ? 'border-[#0057ff] bg-blue-50/80 text-[#0057ff] shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <Star
                  className={`w-4 h-4 ${
                    formData.isImportant
                      ? 'fill-[#0057ff] text-[#0057ff]'
                      : 'fill-none text-[#0057ff]'
                  }`}
                />
                <span>Sim</span>
              </button>

              {/* Botão Não */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isImportant: false })}
                className={`h-10 sm:h-11 px-5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer select-none ${
                  !formData.isImportant
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <Star className="w-4 h-4 fill-none text-[#0057ff]" />
                <span>Não</span>
              </button>
            </div>
          </div>

          {/* Campo: Observações */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2 tracking-tight">
              Observações
            </label>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10 transition-all">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0 stroke-[1.8]" />
                <textarea
                  rows={4}
                  maxLength={500}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Adicione observações sobre o cliente..."
                  className="w-full bg-transparent text-slate-800 text-sm placeholder:text-slate-400 outline-none resize-none font-medium leading-relaxed"
                />
              </div>
              <div className="text-right pt-2 text-xs text-slate-400">
                {(formData.notes || '').length}/500
              </div>
            </div>
          </div>

          {/* Bottom Actions: Cancelar & Salvar Cliente */}
          <div className="pt-4 flex flex-col items-end gap-3 border-t border-slate-100">
            <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="h-11 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="h-11 px-7 rounded-xl bg-[#0057ff] hover:bg-[#0047db] active:scale-[0.99] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-80"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 stroke-[2.2]" />
                    <span>Salvar Cliente</span>
                  </>
                )}
              </button>
            </div>

            {/* Três botões de acesso rápido premium logo abaixo do botão Salvar Cliente */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap pt-0.5">
              <button
                type="button"
                onClick={() => handleGoToQuickAction('Calculadora')}
                className="flex-1 sm:flex-initial h-10 sm:h-10.5 px-3.5 sm:px-4.5 rounded-xl border border-slate-200 bg-white hover:border-[#0057ff]/70 hover:bg-blue-50/30 active:scale-[0.98] text-[#091122] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-[0_2px_8px_-2px_rgba(9,17,34,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(0,87,255,0.08)] group"
              >
                <Calculator className="w-4 h-4 text-[#0057ff] stroke-[2] flex-shrink-0 transition-transform group-hover:scale-105" />
                <span className="whitespace-nowrap">Calculadora</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoToQuickAction('Orçamentos')}
                className="flex-1 sm:flex-initial h-10 sm:h-10.5 px-3.5 sm:px-4.5 rounded-xl border border-slate-200 bg-white hover:border-[#0057ff]/70 hover:bg-blue-50/30 active:scale-[0.98] text-[#091122] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-[0_2px_8px_-2px_rgba(9,17,34,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(0,87,255,0.08)] group"
              >
                <FileText className="w-4 h-4 text-[#0057ff] stroke-[2] flex-shrink-0 transition-transform group-hover:scale-105" />
                <span className="whitespace-nowrap">Orçamento</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoToQuickAction('Tarefas')}
                className="flex-1 sm:flex-initial h-10 sm:h-10.5 px-3.5 sm:px-4.5 rounded-xl border border-slate-200 bg-white hover:border-[#0057ff]/70 hover:bg-blue-50/30 active:scale-[0.98] text-[#091122] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-[0_2px_8px_-2px_rgba(9,17,34,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(0,87,255,0.08)] group"
              >
                <CheckSquare className="w-4 h-4 text-[#0057ff] stroke-[2] flex-shrink-0 transition-transform group-hover:scale-105" />
                <span className="whitespace-nowrap">Tarefa</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
