import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Settings,
  Users,
  Bell,
  Shield,
  Search,
  UserPlus,
  KeyRound,
  Pencil,
  Trash2,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  RefreshCw,
  MessageSquare,
  MessageCircle,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  RotateCcw,
  HelpCircle,
  DollarSign,
  Info,
  PhoneCall,
  CheckSquare,
  FileText,
  Table,
  Package,
  Upload,
  Music,
  Square,
  FileAudio,
  Sliders,
  Calculator,
  Smartphone,
  Send,
  Sun,
  Trophy,
  Truck,
} from 'lucide-react';
import { CustosVariaveisConfigView } from './CustosVariaveisConfigView';
import { CustosConfigView } from './custos/CustosConfigView';
import { CustosTarkettTab } from './custos/CustosTarkettTab';
import { UserAvatar } from './UserAvatar';
import { AudioSnippetEditor } from './AudioSnippetEditor';
import {
  adminUpdateUserAccount,
  adminResetUserPassword,
  updateUserPasswordDirectly,
  adminCreateOrUpdateUserAccount,
  adminDeleteUserAccount,
  adminDeleteUserAccountAsync,
  normalizeAuthorizedName,
  AuthorizedUserName,
  isEderPerez,
} from '../utils/auth';
import {
  playNotificationSound,
  NotificationSoundType,
  SOUND_OPTIONS,
} from '../utils/soundAlerts';
import {
  getUserNotificationPreferences,
  saveUserNotificationPreferences,
  UserNotificationPreferences,
  NotificationCategoryType,
  DEFAULT_SOUNDS_PER_TYPE,
  CustomAudioSound,
  getCustomAudioForCategory,
  saveCustomAudioForCategory,
  removeCustomAudioForCategory,
  getAllCustomAudioForUser,
  getCustomAudioGeneral,
  saveCustomAudioGeneral,
  removeCustomAudioGeneral,
  requestNotificationPermission,
  sendExternalNotification,
  validateAudioFile,
  fileToDataUrl,
  playAudioDataUrl,
  playAudioSnippet,
  stopAudioPreview,
  formatAudioTime,
} from '../utils/userNotificationPreferences';
import {
  getOrcamentoMessageTemplate,
  saveOrcamentoMessageTemplate,
  formatOrcamentoMessage,
  formatWhatsAppMessage,
  DEFAULT_ORCAMENTO_MESSAGE,
  getWhatsAppMessageTemplate,
  saveWhatsAppMessageTemplate,
  loadWhatsAppTemplatesFromSupabase,
  loadMetasConfigsFromSupabase,
  WhatsAppCategory,
  WHATSAPP_CATEGORIES,
  DEFAULT_WHATSAPP_TEMPLATES_BY_CATEGORY,
  getDynamicGreeting,
  getMetasParametersConfig,
  saveMetasParametersConfig,
  calculateCurrentMetasDates,
  DEFAULT_METAS_CONFIG,
  MetasParametersConfig,
} from '../utils/configOrcamentoEMetas';

interface ConfiguracoesScreenProps {
  currentUserName?: string;
  onUpdateUserName?: (name: string) => void;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type TabType =
  | 'Gestão de Usuários'
  | 'Custos'
  | 'Custos Variáveis'
  | 'Tarkett'
  | 'Notificações & Alertas'
  | 'Segurança & Acesso'
  | 'Mensagem WhatsApp'
  | 'Mensagem de Orçamento'
  | 'Configurações de Metas';

export interface FenixUser {
  id: string;
  nome: string;
  email: string;
  cargo: 'Consultor Comercial' | 'Consultora Comercial' | 'Marketplace' | 'Marketing' | 'Representante' | 'Diretor' | 'Gerente de Vendas' | 'Financeiro';
  acesso: string;
  status: 'Ativo' | 'Inativo';
  modulos: string[];
  loginSugerido: string;
  avatarIniciais: string;
  avatarBg: string;
}

const ALL_MODULES = [
  'Clientes',
  'Calculadora',
  'Orçamentos',
  'Follow-up',
  'Metas',
  'Estoque',
  'Produtos',
  'Tarefas',
  'Pós Vendas',
  'Boletos',
  'Pendências',
  'Notas',
  'Configurações',
];

const STORAGE_USERS_KEY = 'fenix_usuarios_v2';
const STORAGE_NOTIF_KEY = 'fenix_notificacoes_config_v2';

const INITIAL_USERS: FenixUser[] = [
  {
    id: 'usr-1',
    nome: 'Vanessa Gomes',
    email: 'vanessa@fenixworld.com.br',
    cargo: 'Consultora Comercial',
    acesso: 'CRM Completo',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Estoque', 'Produtos', 'Tarefas', 'Pós Vendas', 'Boletos', 'Pendências', 'Notas', 'Configurações'],
    loginSugerido: 'vanessa.gomes',
    avatarIniciais: 'VG',
    avatarBg: 'bg-[#1D4ED8]',
  },
  {
    id: 'usr-2',
    nome: 'Jhessica Camargo',
    email: 'jhessica@fenixworld.com.br',
    cargo: 'Consultora Comercial',
    acesso: 'CRM Completo',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Estoque', 'Produtos', 'Tarefas', 'Pós Vendas', 'Boletos', 'Pendências', 'Notas', 'Configurações'],
    loginSugerido: 'jhessica.camargo',
    avatarIniciais: 'JC',
    avatarBg: 'bg-[#0B2046]',
  },
  {
    id: 'usr-3',
    nome: 'Eder Perez',
    email: 'eder@fenixworld.com.br',
    cargo: 'Diretor',
    acesso: 'Administrador Geral',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Estoque', 'Produtos', 'Tarefas', 'Pós Vendas', 'Boletos', 'Pendências', 'Notas', 'Configurações'],
    loginSugerido: 'eder.perez',
    avatarIniciais: 'EP',
    avatarBg: 'bg-emerald-700',
  },
  {
    id: 'usr-4',
    nome: 'Jeferson Trolesi',
    email: 'jeferson@fenixworld.com.br',
    cargo: 'Marketplace',
    acesso: 'CRM Completo',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Estoque', 'Produtos', 'Tarefas', 'Pós Vendas', 'Boletos', 'Pendências', 'Notas'],
    loginSugerido: 'jeferson.trolesi',
    avatarIniciais: 'JT',
    avatarBg: 'bg-amber-600',
  },
];

export const ConfiguracoesScreen: React.FC<ConfiguracoesScreenProps> = ({
  currentUserName = 'Vanessa Gomes',
}) => {
  // Verificação estrita de privilégios: Somente Éder Perez pode criar, editar ou gerenciar outros usuários
  const isDirector = isEderPerez(currentUserName);
  const canManageUsers = isDirector;

  // Aba ativa: padrão "Gestão de Usuários"
  const [activeTab, setActiveTab] = useState<TabType>('Gestão de Usuários');

  // Feedback Toast flutuante
  const [toastMessage, setToastMessage] = useState<string>('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ==========================================
  // ESTADO: MENSAGEM WHATSAPP POR CATEGORIA
  // ==========================================
  const [selectedWhatsAppCategory, setSelectedWhatsAppCategory] =
    useState<WhatsAppCategory>('Envio de Orçamento');
  const [categoryTemplates, setCategoryTemplates] = useState<Record<WhatsAppCategory, string>>(() => ({
    'Envio de Orçamento': getWhatsAppMessageTemplate('Envio de Orçamento'),
    'Follow-up de Orçamentos': getWhatsAppMessageTemplate('Follow-up de Orçamentos'),
    'Pós-Vendas': getWhatsAppMessageTemplate('Pós-Vendas'),
    'Follow-up de Prospecção': getWhatsAppMessageTemplate('Follow-up de Prospecção'),
  }));
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const textareaOrcamentoRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSelectWhatsAppCategory = (cat: WhatsAppCategory) => {
    setSelectedWhatsAppCategory(cat);
  };

  const handleTemplateChange = (val: string) => {
    setCategoryTemplates((prev) => ({
      ...prev,
      [selectedWhatsAppCategory]: val,
    }));
  };

  const handleSaveOrcamentoMsg = () => {
    const textToSave = categoryTemplates[selectedWhatsAppCategory] || '';
    saveWhatsAppMessageTemplate(selectedWhatsAppCategory, textToSave);
    showToast(`✓ Mensagem WhatsApp para "${selectedWhatsAppCategory}" salva com sucesso!`);
  };

  const handleConfirmReset = () => {
    const def =
      DEFAULT_WHATSAPP_TEMPLATES_BY_CATEGORY[selectedWhatsAppCategory] ||
      DEFAULT_ORCAMENTO_MESSAGE;
    setCategoryTemplates((prev) => ({
      ...prev,
      [selectedWhatsAppCategory]: def,
    }));
    saveWhatsAppMessageTemplate(selectedWhatsAppCategory, def);
    setShowResetConfirmModal(false);
    showToast(`✓ Mensagem para "${selectedWhatsAppCategory}" restaurada para o padrão!`);
  };

  // Preview dinâmico da mensagem no WhatsApp com {saudacao} e {cliente} resolvidos
  const previewOrcamentoMessage = useMemo(() => {
    const rawTemplate = categoryTemplates[selectedWhatsAppCategory] || '';
    return formatOrcamentoMessage(rawTemplate, {
      clientName: 'Carlos Andrade',
      totalFinal: 38500,
      consultoraName: currentUserName || 'Vanessa Gomes',
      items: [
        { qtd: '25', unidade: 'm²', descricao: 'Mármore Travertino Romano Resinador', total: 25000 },
        { qtd: '15', unidade: 'm²', descricao: 'Granito Preto São Gabriel Polido', total: 13500 },
      ],
      freteAtivo: false,
      freteValor: 0,
      freteEndereco: 'São Paulo - SP',
      numeroOrcamento: 'ORC-2026-084',
      categoria: selectedWhatsAppCategory,
    });
  }, [categoryTemplates, currentUserName, selectedWhatsAppCategory]);

  // ==========================================
  // ESTADO: CONFIGURAÇÕES DE METAS
  // ==========================================
  const [metasConfig, setMetasConfig] = useState<MetasParametersConfig>(() =>
    getMetasParametersConfig()
  );

  // Cálculos reativos considerando sempre a data atual
  const metasCalculated = useMemo(() => {
    return calculateCurrentMetasDates(metasConfig);
  }, [metasConfig]);

  const handleSaveMetasConfig = () => {
    saveMetasParametersConfig(metasConfig);
    showToast('✓ Parâmetros e dias úteis da meta salvos com sucesso!');
  };

  const handleResetMetasConfig = () => {
    setMetasConfig(DEFAULT_METAS_CONFIG);
    saveMetasParametersConfig(DEFAULT_METAS_CONFIG);
    showToast('✓ Configurações de metas restauradas para o cálculo automático oficial!');
  };

  // Sincronização em tempo real de WhatsApp e Metas com o Supabase
  useEffect(() => {
    loadWhatsAppTemplatesFromSupabase().then((loaded) => {
      if (loaded && typeof loaded === 'object') {
        setCategoryTemplates((prev) => {
          const next = { ...prev };
          WHATSAPP_CATEGORIES.forEach((cat) => {
            if (typeof loaded[cat] === 'string' && loaded[cat].trim()) {
              next[cat] = loaded[cat];
            }
          });
          return next;
        });
      }
    });
    loadMetasConfigsFromSupabase().then(() => {
      setMetasConfig(getMetasParametersConfig());
    });

    const handleMsgUpdate = () => {
      setCategoryTemplates((prev) => {
        const next = { ...prev };
        WHATSAPP_CATEGORIES.forEach((cat) => {
          next[cat] = getWhatsAppMessageTemplate(cat);
        });
        return next;
      });
    };
    const handleMetasUpdate = () => {
      setMetasConfig(getMetasParametersConfig());
    };
    window.addEventListener('fenix_orcamento_msg_updated', handleMsgUpdate);
    window.addEventListener('fenix_metas_config_updated', handleMetasUpdate);
    return () => {
      window.removeEventListener('fenix_orcamento_msg_updated', handleMsgUpdate);
      window.removeEventListener('fenix_metas_config_updated', handleMetasUpdate);
    };
  }, []);

  // ==========================================
  // ESTADO: GESTÃO DE USUÁRIOS
  // ==========================================
  const [users, setUsers] = useState<FenixUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        const parsed: FenixUser[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let merged = [...parsed];

          // Garantir que Éder Perez esteja presente
          const hasEder = merged.some(
            (u) => u.nome === 'Eder Perez' || u.cargo === 'Diretor' || u.loginSugerido === 'eder.perez'
          );
          if (!hasEder) {
            const eder = INITIAL_USERS.find((u) => u.nome === 'Eder Perez');
            if (eder) merged.push(eder);
          }

          // Garantir que Jeferson Trolesi esteja presente
          const hasJeferson = merged.some(
            (u) => u.nome === 'Jeferson Trolesi' || u.loginSugerido === 'jeferson.trolesi'
          );
          if (!hasJeferson) {
            const jeferson = INITIAL_USERS.find((u) => u.nome === 'Jeferson Trolesi');
            if (jeferson) merged.push(jeferson);
          }

          // Limpar módulos legados e normalizar abas
          merged = merged.map((u) => {
            let userModulos = Array.isArray(u.modulos) ? u.modulos : [...ALL_MODULES];
            userModulos = userModulos
              .filter((m) => m !== 'Controle de Estoque')
              .map((m) => (m === 'Pós-Vendas' ? 'Pós Vendas' : m));
            return { ...u, modulos: userModulos };
          });

          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Campos do formulário do Drawer
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: 'Consultora Comercial' as FenixUser['cargo'],
    status: 'Ativo' as 'Ativo' | 'Inativo',
    modulos: [...ALL_MODULES],
    loginSugerido: '',
    senhaInicial: '',
  });

  // Modal para Redefinir / Gerar Senha (com poderes administrativos da Diretoria)
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    user: FenixUser | null;
    customPass: string;
    requireChangeOnNextLogin: boolean;
  }>({
    isOpen: false,
    user: null,
    customPass: '',
    requireChangeOnNextLogin: true,
  });

  // Modal para confirmação de exclusão
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    user: FenixUser | null;
  }>({
    isOpen: false,
    user: null,
  });

  // Salvar lista de usuários no localStorage
  const saveUsersList = (updatedUsers: FenixUser[]) => {
    setUsers(updatedUsers);
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
      window.dispatchEvent(new Event('fenix_users_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  };

  // Gerar senha aleatória forte
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Fnx#';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Abrir Drawer para cadastrar novo usuário
  const handleOpenNewUser = () => {
    setEditingUserId(null);
    const initialPass = generateRandomPassword();
    setFormData({
      nome: '',
      email: '',
      cargo: 'Consultora Comercial',
      status: 'Ativo',
      modulos: [...ALL_MODULES],
      loginSugerido: '',
      senhaInicial: initialPass,
    });
    setIsDrawerOpen(true);
  };

  // Abrir Drawer para editar usuário existente
  const handleOpenEditUser = (user: FenixUser) => {
    if (!isDirector) {
      showToast('Apenas o Diretor Éder Perez possui permissão para editar permissões de usuários.');
      return;
    }
    setEditingUserId(user.id);
    const cleanedModulos = (user.modulos && user.modulos.length > 0 ? user.modulos : [...ALL_MODULES])
      .filter((m) => m !== 'Controle de Estoque')
      .map((m) => (m === 'Pós-Vendas' ? 'Pós Vendas' : m));
    setFormData({
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      status: user.status,
      modulos: cleanedModulos,
      loginSugerido: user.loginSugerido || user.email.split('@')[0],
      senhaInicial: '',
    });
    setIsDrawerOpen(true);
  };

  // Sugerir login baseado no nome/email
  const handleNameChange = (nome: string) => {
    const cleaned = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '.');

    setFormData((prev) => ({
      ...prev,
      nome,
      loginSugerido: prev.loginSugerido ? prev.loginSugerido : cleaned,
    }));
  };

  // Salvar dados do Drawer
  const handleSaveUserFromDrawer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDirector) {
      showToast('Apenas o Diretor Éder Perez possui permissão para gerenciar usuários.');
      return;
    }

    if (!formData.nome.trim()) {
      showToast('Por favor, informe o Nome Completo.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      showToast('Por favor, informe um E-mail Corporativo válido.');
      return;
    }

    const nameParts = formData.nome.trim().split(' ');
    const initials =
      nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : formData.nome.slice(0, 2).toUpperCase();

    const determineAccess = (cargo: string) => {
      if (cargo === 'Diretor') return 'Administrador Geral';
      if (cargo === 'Gerente de Vendas') return 'Gerência Comercial';
      if (cargo === 'Financeiro') return 'Módulo Financeiro & Boletos';
      return 'CRM Completo';
    };

    if (editingUserId) {
      // Atualizar existente
      const updated = users.map((u) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            nome: formData.nome.trim(),
            email: formData.email.trim(),
            cargo: formData.cargo,
            status: formData.status,
            modulos: formData.modulos,
            acesso: determineAccess(formData.cargo),
            loginSugerido: formData.loginSugerido || u.loginSugerido,
            avatarIniciais: initials,
          };
        }
        return u;
      });
      saveUsersList(updated);

      // Sincronizar credenciais no módulo central de autenticação
      adminCreateOrUpdateUserAccount({
        name: formData.nome.trim(),
        id: editingUserId,
        email: formData.email.trim(),
        cargo: formData.cargo,
        status: formData.status,
        active: formData.status === 'Ativo',
        modulos: formData.modulos,
        loginSugerido: formData.loginSugerido,
        avatarInitials: initials,
        password: formData.senhaInicial && formData.senhaInicial.trim().length >= 4 ? formData.senhaInicial.trim() : undefined,
      });

      showToast(`✓ Login e dados de "${formData.nome.trim()}" atualizados com sucesso!`);
    } else {
      // Criar novo
      const newUser: FenixUser = {
        id: `usr-${Date.now()}`,
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        cargo: formData.cargo,
        status: formData.status,
        modulos: formData.modulos,
        acesso: determineAccess(formData.cargo),
        loginSugerido: formData.loginSugerido || formData.email.split('@')[0],
        avatarIniciais: initials,
        avatarBg: 'bg-[#1D4ED8]',
      };
      saveUsersList([newUser, ...users]);

      // Cadastrar no sistema de autenticação (aparece automaticamente no login)
      adminCreateOrUpdateUserAccount({
        name: formData.nome.trim(),
        id: newUser.id,
        email: formData.email.trim(),
        cargo: formData.cargo,
        status: formData.status,
        active: formData.status === 'Ativo',
        modulos: formData.modulos,
        loginSugerido: newUser.loginSugerido,
        avatarInitials: initials,
        password: formData.senhaInicial && formData.senhaInicial.trim().length >= 4 ? formData.senhaInicial.trim() : '1234',
        mustChangePassword: true,
      });

      showToast(`✓ Usuário "${formData.nome.trim()}" cadastrado com sucesso!`);
    }

    setIsDrawerOpen(false);
  };

  // 7. REMOÇÃO DE USUÁRIO — DIRETOR ÉDER PEREZ:
  // Exclusão definitiva de usuário: remove completamente do sistema, Supabase e autenticação
  const handleExecuteDeleteUser = async () => {
    if (!isDirector) {
      showToast('Apenas o Diretor Éder Perez possui permissão para excluir usuários.');
      return;
    }
    if (!deleteConfirmModal.user) return;
    const target = deleteConfirmModal.user;

    // 1. Remove da lista de usuários completamente (não deve permanecer como inativo)
    const filtered = users.filter((u) => u.id !== target.id && u.nome !== target.nome);
    saveUsersList(filtered);
    setUsers(filtered);

    // 2. Exclusão definitiva da conta de autenticação (Supabase e local)
    try {
      await adminDeleteUserAccountAsync(target.nome);
    } catch {
      // fallback
    }
    adminDeleteUserAccount(target.nome);

    showToast(`✓ Usuário "${target.nome}" foi excluído permanentemente do sistema.`);
    setDeleteConfirmModal({ isOpen: false, user: null });
  };

  // Abrir modal de redefinição de senha
  const handleOpenResetPassword = (user: FenixUser) => {
    const newPass = generateRandomPassword();
    setResetPasswordModal({
      isOpen: true,
      user,
      customPass: newPass,
      requireChangeOnNextLogin: true,
    });
  };

  // Confirmar e aplicar a redefinição de senha do funcionário
  const handleConfirmResetPassword = () => {
    if (!isDirector) {
      showToast('Apenas o Diretor Éder Perez possui permissão para redefinir senhas de usuários.');
      return;
    }
    if (!resetPasswordModal.user) return;
    const targetUser = resetPasswordModal.user;
    const pass = resetPasswordModal.customPass.trim();

    if (!pass || pass.length < 4) {
      showToast('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    const canonicalName = normalizeAuthorizedName(targetUser.nome);
    if (canonicalName) {
      adminResetUserPassword(
        canonicalName,
        pass,
        resetPasswordModal.requireChangeOnNextLogin
      );
    }

    try {
      navigator.clipboard.writeText(pass);
    } catch {
      // ignore
    }

    showToast(`✓ Senha do login de "${targetUser.nome}" atualizada com sucesso!`);
    setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true });
  };

  // Filtragem da tabela de usuários
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.cargo.toLowerCase().includes(q) ||
      u.acesso.toLowerCase().includes(q)
    );
  });

  // ==========================================
  // ESTADO: NOTIFICAÇÕES & ALERTAS (POR USUÁRIO)
  // ==========================================
  // Usuário autenticado para visualização/configuração individual de notificações (estritamente a própria conta)
  const notifTargetUser = currentUserName || 'Vanessa Gomes';

  // Preferências de notificação do usuário atual
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences>(() =>
    getUserNotificationPreferences(notifTargetUser)
  );

  useEffect(() => {
    setNotifPrefs(getUserNotificationPreferences(notifTargetUser));
  }, [notifTargetUser]);

  // Estado da permissão do navegador para notificações externas
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  useEffect(() => {
    const updatePerm = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const current = Notification.permission;
        setNotificationPermission(current);
        if (current === 'denied') {
          setNotifPrefs((prev) => {
            if (prev.enabled) {
              const updated = { ...prev, enabled: false };
              saveUserNotificationPreferences(notifTargetUser, updated);
              return updated;
            }
            return prev;
          });
        }
      } else {
        setNotificationPermission('unsupported');
      }
    };

    updatePerm();
    window.addEventListener('focus', updatePerm);

    // Monitorar alterações dinâmicas de permissão via Permissions API se disponível
    let permStatus: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
          permStatus = status;
          permStatus.onchange = () => {
            updatePerm();
          };
        }).catch(() => {});
      } catch {}
    }

    return () => {
      window.removeEventListener('focus', updatePerm);
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, [notifTargetUser]);

  // Notificação externa só é considerada ATIVA se habilitada E se a permissão do navegador estiver concedida
  const isDeviceNotifActive = Boolean(notifPrefs.enabled && notificationPermission === 'granted');

  // Estado de áudios personalizados por categoria DO USUÁRIO LOGADO (isolamento estrito)
  const [customAudioMap, setCustomAudioMap] = useState<Partial<Record<NotificationCategoryType, CustomAudioSound>>>(() =>
    getAllCustomAudioForUser(notifTargetUser)
  );

  // Áudio personalizado padrão do dispositivo (geral)
  const [customGeneralAudio, setCustomGeneralAudio] = useState<CustomAudioSound | null>(() =>
    getCustomAudioGeneral(notifTargetUser)
  );

  // Categoria atualmente aberta para edição de trecho (novo upload ou edição de existente)
  interface ActiveSnippetState {
    category: NotificationCategoryType | 'general';
    fileName: string;
    fileSize?: number;
    fileType?: string;
    dataUrl: string;
    initialStartTime: number;
    initialDuration: number;
    initialDurationTotal: number;
  }
  const [activeSnippetCategory, setActiveSnippetCategory] = useState<ActiveSnippetState | null>(null);

  // Categoria de áudio que está atualmente tocando em prévia
  const [playingPreviewCategory, setPlayingPreviewCategory] = useState<string | null>(null);
  const activeSnippetStopRef = useRef<(() => void) | null>(null);

  // Sincronizar áudios quando o usuário mudar ou evento ocorrer
  useEffect(() => {
    const syncAudio = () => {
      setCustomAudioMap(getAllCustomAudioForUser(notifTargetUser));
      setCustomGeneralAudio(getCustomAudioGeneral(notifTargetUser));
    };
    syncAudio();
    window.addEventListener('fenix_custom_audio_updated', syncAudio);
    return () => {
      window.removeEventListener('fenix_custom_audio_updated', syncAudio);
      stopAudioPreview();
      if (activeSnippetStopRef.current) {
        try {
          activeSnippetStopRef.current();
        } catch {}
        activeSnippetStopRef.current = null;
      }
      setPlayingPreviewCategory(null);
    };
  }, [notifTargetUser]);

  // Interrompe reprodução ao desmontar ou trocar de aba
  useEffect(() => {
    return () => {
      stopAudioPreview();
      if (activeSnippetStopRef.current) {
        try {
          activeSnippetStopRef.current();
        } catch {}
        activeSnippetStopRef.current = null;
      }
      setPlayingPreviewCategory(null);
    };
  }, []);

  const handlePlayAudioPreview = (
    catId: string,
    dataUrl: string,
    startTime: number = 0,
    duration: number = 5,
    customVolume?: number
  ) => {
    if (playingPreviewCategory === catId) {
      stopAudioPreview();
      if (activeSnippetStopRef.current) {
        activeSnippetStopRef.current();
        activeSnippetStopRef.current = null;
      }
      setPlayingPreviewCategory(null);
      return;
    }

    stopAudioPreview();
    if (activeSnippetStopRef.current) {
      activeSnippetStopRef.current();
      activeSnippetStopRef.current = null;
    }

    setPlayingPreviewCategory(catId);
    const vol = typeof customVolume === 'number' ? customVolume : notifPrefs.volumePercent;

    const result = playAudioSnippet(
      dataUrl,
      startTime,
      duration,
      vol,
      () => {
        setPlayingPreviewCategory(null);
        activeSnippetStopRef.current = null;
      }
    );

    if (result) {
      activeSnippetStopRef.current = result.stop;
    } else {
      setPlayingPreviewCategory(null);
    }
  };

  const handleStopAudioPreview = () => {
    stopAudioPreview();
    if (activeSnippetStopRef.current) {
      activeSnippetStopRef.current();
      activeSnippetStopRef.current = null;
    }
    setPlayingPreviewCategory(null);
  };

  const handleFileSelect = async (
    category: NotificationCategoryType | 'general',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if desired
    e.target.value = '';

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      showToast(`⚠️ ${validation.error}`);
      return;
    }

    try {
      handleStopAudioPreview();

      const dataUrl = await fileToDataUrl(file);

      // Abre imediatamente o editor de trecho da linha do tempo para esta categoria/geral
      setActiveSnippetCategory({
        category,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'audio/mpeg',
        dataUrl,
        initialStartTime: 0,
        initialDuration: 5,
        initialDurationTotal: 30,
      });

      const label =
        category === 'general'
          ? 'Som Padrão do Dispositivo'
          : notifSoundCategories.find((c) => c.id === category)?.label || category;
      showToast(`✓ Arquivo "${file.name}" carregado para ${label}. Selecione o trecho na linha do tempo.`);
    } catch (err: any) {
      showToast(`Erro ao carregar áudio: ${err?.message || 'Arquivo corrompido'}`);
    }
  };

  const handleEditExistingSnippet = (category: NotificationCategoryType | 'general') => {
    const existing = category === 'general' ? customGeneralAudio : customAudioMap[category];
    if (!existing?.dataUrl) return;

    handleStopAudioPreview();

    setActiveSnippetCategory({
      category,
      fileName: existing.fileName,
      fileSize: existing.fileSize,
      fileType: existing.fileType,
      dataUrl: existing.dataUrl,
      initialStartTime: existing.startTime || 0,
      initialDuration: existing.duration || 5,
      initialDurationTotal: existing.durationTotal || 30,
    });
  };

  const handleSaveSnippet = (
    category: NotificationCategoryType | 'general',
    snippet: { startTime: number; duration: number; durationTotal: number }
  ) => {
    if (!activeSnippetCategory) return;
    handleStopAudioPreview();

    const customAudio: CustomAudioSound = {
      fileName: activeSnippetCategory.fileName,
      dataUrl: activeSnippetCategory.dataUrl,
      fileSize: activeSnippetCategory.fileSize,
      fileType: activeSnippetCategory.fileType,
      startTime: snippet.startTime,
      duration: snippet.duration,
      durationTotal: snippet.durationTotal,
      uploadedAt: new Date().toISOString(),
    };

    if (category === 'general') {
      saveCustomAudioGeneral(notifTargetUser, customAudio);
      setCustomGeneralAudio(customAudio);
      setActiveSnippetCategory(null);
      showToast(
        `✓ Áudio padrão do dispositivo salvo para ${notifTargetUser} (${snippet.duration}s a partir de ${formatAudioTime(
          snippet.startTime
        )})!`
      );
    } else {
      saveCustomAudioForCategory(notifTargetUser, category, customAudio);
      setCustomAudioMap((prev) => ({
        ...prev,
        [category]: customAudio,
      }));
      setActiveSnippetCategory(null);
      const label = notifSoundCategories.find((c) => c.id === category)?.label || category;
      showToast(
        `✓ Som de ${label} salvo para ${notifTargetUser} (${snippet.duration}s a partir de ${formatAudioTime(
          snippet.startTime
        )})!`
      );
    }
  };

  const handleCancelSnippet = () => {
    handleStopAudioPreview();
    setActiveSnippetCategory(null);
  };

  const handleRemoveCustomAudio = (category: NotificationCategoryType) => {
    handleStopAudioPreview();
    if (activeSnippetCategory?.category === category) {
      setActiveSnippetCategory(null);
    }

    removeCustomAudioForCategory(notifTargetUser, category);
    setCustomAudioMap((prev) => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });
    const label = notifSoundCategories.find((c) => c.id === category)?.label || category;
    showToast(`✓ Som personalizado de ${label} para ${notifTargetUser} removido. Restaurado som padrão.`);
  };

  const handleRemoveGeneralAudio = () => {
    handleStopAudioPreview();
    if (activeSnippetCategory?.category === 'general') {
      setActiveSnippetCategory(null);
    }
    removeCustomAudioGeneral(notifTargetUser);
    setCustomGeneralAudio(null);
    showToast(`✓ Áudio personalizado padrão de ${notifTargetUser} removido. Restaurado som padrão.`);
  };

  // Salvar configurações de notificação
  const handleSaveNotifConfig = async () => {
    try {
      await saveUserNotificationPreferences(notifTargetUser, notifPrefs);
      showToast(`✓ Preferências de Notificação salvas para ${notifTargetUser}!`);
      if (notifPrefs.enabled !== false && notifPrefs.volumePercent > 0) {
        if (customGeneralAudio?.dataUrl) {
          playAudioSnippet(
            customGeneralAudio.dataUrl,
            customGeneralAudio.startTime || 0,
            customGeneralAudio.duration || 5,
            notifPrefs.volumePercent
          );
        } else {
          playNotificationSound(notifPrefs.soundType, notifPrefs.volumePercent);
        }
      }
    } catch {
      showToast('✓ Preferências de Notificação salvas!');
    }
  };

  // Demonstração sonora do som padrão geral
  const handlePlaySoundDemo = () => {
    if (customGeneralAudio?.dataUrl) {
      handlePlayAudioPreview(
        'general',
        customGeneralAudio.dataUrl,
        customGeneralAudio.startTime || 0,
        customGeneralAudio.duration || 5,
        notifPrefs.volumePercent
      );
    } else {
      playNotificationSound(notifPrefs.soundType, notifPrefs.volumePercent);
      showToast(`Tocando: ${notifPrefs.soundType}`);
    }
  };

  // Demonstração sonora por categoria específica (respeita áudio do PC ou som selecionado)
  const handlePlayCategorySound = (catId: NotificationCategoryType) => {
    const customAudio = customAudioMap[catId];
    const catVol = notifPrefs.volumesPerType?.[catId] ?? notifPrefs.volumePercent;
    const vol = typeof catVol === 'number' ? catVol : 85;

    if (customAudio?.dataUrl) {
      handlePlayAudioPreview(
        catId,
        customAudio.dataUrl,
        customAudio.startTime || 0,
        customAudio.duration || 5,
        vol
      );
    } else {
      const sound =
        notifPrefs.soundsPerType?.[catId] ||
        DEFAULT_SOUNDS_PER_TYPE[catId] ||
        notifPrefs.soundType;
      playNotificationSound(sound, vol);
      showToast(`Tocando som de ${catId}: ${sound} (${vol}%)`);
    }
  };

  // Ativação e verificação de permissão para Notificações no Dispositivo
  const handleToggleDeviceNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('⚠️ Este navegador ou dispositivo não possui suporte para notificações nativas.');
      setNotificationPermission('unsupported');
      return;
    }

    const currentPerm = Notification.permission;
    const isCurrentlyActive = Boolean(notifPrefs.enabled && currentPerm === 'granted');

    if (isCurrentlyActive) {
      // Desativar
      const updated: UserNotificationPreferences = { ...notifPrefs, enabled: false };
      setNotifPrefs(updated);
      await saveUserNotificationPreferences(notifTargetUser, updated);
      showToast('Notificações no dispositivo desativadas.');
      return;
    }

    // Ativar:
    // 1. Se a permissão estiver bloqueada no navegador, alertar claramente e não ativar
    if (currentPerm === 'denied') {
      setNotificationPermission('denied');
      const updated: UserNotificationPreferences = { ...notifPrefs, enabled: false };
      setNotifPrefs(updated);
      await saveUserNotificationPreferences(notifTargetUser, updated);
      showToast('⚠️ Permissão bloqueada no navegador! Não é possível ativar. Habilite as notificações nas permissões do site.');
      return;
    }

    // 2. Se a permissão não estiver concedida, solicitar a permissão ao usuário
    let resolvedPerm: NotificationPermission = currentPerm;
    if (currentPerm !== 'granted') {
      resolvedPerm = await requestNotificationPermission();
      setNotificationPermission(resolvedPerm);
    }

    // 3. Não considerar a notificação externa como ATIVA enquanto a permissão estiver bloqueada
    if (resolvedPerm === 'granted') {
      const updated: UserNotificationPreferences = { ...notifPrefs, enabled: true };
      setNotifPrefs(updated);
      await saveUserNotificationPreferences(notifTargetUser, updated);
      showToast('✓ Permissão concedida! Notificações no dispositivo ativadas com sucesso.');
    } else {
      setNotificationPermission(resolvedPerm);
      const updated: UserNotificationPreferences = { ...notifPrefs, enabled: false };
      setNotifPrefs(updated);
      await saveUserNotificationPreferences(notifTargetUser, updated);
      if (resolvedPerm === 'denied') {
        showToast('⚠️ Permissão bloqueada! As notificações no dispositivo permanecem desativadas.');
      } else {
        showToast('⚠️ Permissão não concedida. As notificações no dispositivo permanecem desativadas.');
      }
    }
  };

  // Disparo de notificação de teste no dispositivo
  const handleSendTestNotification = async () => {
    // 1. O teste de som DEVE CONTINUAR FUNCIONANDO INDEPENDENTEMENTE DA PERMISSÃO DE NOTIFICAÇÃO
    try {
      const vol = notifPrefs.volumePercent > 0 ? notifPrefs.volumePercent : 80;
      if (customGeneralAudio?.dataUrl) {
        handlePlayAudioPreview(
          'general',
          customGeneralAudio.dataUrl,
          customGeneralAudio.startTime || 0,
          customGeneralAudio.duration || 5,
          vol
        );
      } else {
        playNotificationSound(notifPrefs.soundType || 'Sino Suave (Padrão)', vol);
      }
    } catch (soundErr) {
      console.warn('Erro ao tocar som de teste:', soundErr);
    }

    // 2. Testar a notificação externa real no dispositivo
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('⚠️ Este dispositivo não suporta notificações nativas. Som de teste reproduzido!');
      setNotificationPermission('unsupported');
      return;
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await requestNotificationPermission();
      setNotificationPermission(permission);
    }

    if (permission === 'granted') {
      const sent = await sendExternalNotification('🔔 Fênix World — Notificação de Teste', {
        body: 'Notificação externa real funcionando no seu dispositivo! Som de alerta reproduzido com sucesso.',
        targetTab: 'Configurações',
        tag: `test_notif_${Date.now()}`,
      });
      if (sent) {
        showToast('🔔 Notificação externa real enviada para o dispositivo e som reproduzido!');
      } else {
        showToast('✓ Som de teste reproduzido! Verifique a central de notificações do sistema operacional.');
      }
    } else if (permission === 'denied') {
      showToast('⚠️ Permissão bloqueada no navegador: Notificação externa não pôde ser enviada. Som de teste reproduzido com sucesso!');
    } else {
      showToast('✓ Som de teste reproduzido! Permissão de notificação externa pendente.');
    }
  };

  const notifSoundCategories: {
    id: NotificationCategoryType;
    label: string;
    shortDesc: string;
    description: string;
    icon: any;
    iconBg: string;
    iconColor: string;
  }[] = [
    {
      id: 'tarefas',
      label: 'Tarefas',
      shortDesc: 'Tarefas diárias e prazos',
      description: 'Avisos de tarefas do dia, agendamentos e prazos expirados',
      icon: CheckSquare,
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#1D4ED8]',
    },
    {
      id: 'boletos',
      label: 'Boletos',
      shortDesc: 'Envio, emissão e vencimentos',
      description: 'Avisos de boletos gerados, aguardando envio ou em vencimento',
      icon: DollarSign,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
    },
    {
      id: 'followup',
      label: 'Follow-up',
      shortDesc: 'Retornos de orçamentos e clientes',
      description: 'Lembrete de orçamentos pendentes de retorno e follow-up',
      icon: PhoneCall,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-700',
    },
    {
      id: 'metas',
      label: 'Meta',
      shortDesc: 'Atingimento e marcos de vendas',
      description: 'Alerta comemorativo ao atingir marcos de metas comerciais',
      icon: Target,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
    },
    {
      id: 'estoque',
      label: 'Estoque',
      shortDesc: 'Entradas, saídas e movimentações',
      description: 'Avisos de novas entradas, saídas e movimentações de mercadorias',
      icon: Package,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-700',
    },
    {
      id: 'tabelas',
      label: 'Tabela Comercial',
      shortDesc: 'Preços, revenda e atualizações',
      description: 'Toque para criação, edição, sincronização de preços e tabela',
      icon: Table,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-700',
    },
    {
      id: 'notas',
      label: 'Notas',
      shortDesc: 'Lembretes e notas de clientes',
      description: 'Avisos de notas, anotações de clientes e lembretes rápidos',
      icon: FileText,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-700',
    },
    {
      id: 'pendencias',
      label: 'Pendências',
      shortDesc: 'Novas pendências e atribuições',
      description: 'Toque para novas pendências criadas, atribuídas ou atualizadas',
      icon: AlertCircle,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-700',
    },
    {
      id: 'posvendas',
      label: 'Pós-Vendas',
      shortDesc: 'Recebimento, entrega e retirada',
      description: 'Avisos de logística, previsão e confirmação de recebimento',
      icon: Truck,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700',
    },
    {
      id: 'chat',
      label: 'Chat / Mensagens',
      shortDesc: 'Mensagens diretas e em grupos',
      description: 'Toque para novas mensagens privadas e em grupo no chat',
      icon: MessageCircle,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-700',
    },
  ];

  // ==========================================
  // ESTADO: SEGURANÇA & ACESSO
  // ==========================================
  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: '',
  });
  const [showPassword, setShowPassword] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!passwordData.senhaAtual.trim()) {
      setPasswordMessage({ type: 'error', text: 'Informe sua senha atual.' });
      return;
    }
    if (!passwordData.novaSenha.trim()) {
      setPasswordMessage({ type: 'error', text: 'Informe a nova senha.' });
      return;
    }
    if (passwordData.novaSenha.length < 6) {
      setPasswordMessage({
        type: 'error',
        text: 'A nova senha deve ter no mínimo 6 caracteres.',
      });
      return;
    }
    if (passwordData.novaSenha !== passwordData.confirmarNovaSenha) {
      setPasswordMessage({
        type: 'error',
        text: 'A confirmação de senha não confere com a nova senha.',
      });
      return;
    }

    const canonical = normalizeAuthorizedName(currentUserName);
    if (canonical) {
      const res = updateUserPasswordDirectly(canonical, passwordData.novaSenha);
      if (!res.success) {
        setPasswordMessage({
          type: 'error',
          text: res.error || 'Erro ao atualizar senha no banco de dados.',
        });
        return;
      }
    }

    setPasswordMessage({
      type: 'success',
      text: '✓ Senha corporativa atualizada com sucesso!',
    });
    setPasswordData({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
    showToast('✓ Senha atualizada com sucesso!');
  };

  // Efeito para fechar o Drawer com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (resetPasswordModal.isOpen) setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true });
        if (deleteConfirmModal.isOpen) setDeleteConfirmModal({ isOpen: false, user: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, resetPasswordModal.isOpen, deleteConfirmModal.isOpen]);

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
          {/* Card quadrado com borda azul e ícone de engrenagem */}
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/90 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 shadow-xs">
            <Settings className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Configurações
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Gerencie usuários, notificações, alertas sonoros e segurança do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO ENTRE ABAS INTERNAS (PÍLULAS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-xs flex items-center gap-1.5 overflow-x-auto select-none custom-scrollbar">
        {(
          [
            { id: 'Gestão de Usuários', label: 'Gestão de Usuários', icon: Users },
            ...(isDirector
              ? [
                  {
                    id: 'Custos' as TabType,
                    label: 'Custos',
                    icon: DollarSign,
                    isExclusiveDirector: true,
                  },
                ]
              : [
                  {
                    id: 'Tarkett' as TabType,
                    label: 'Simulador Tarkett',
                    icon: Calculator,
                  },
                ]),
            { id: 'Notificações & Alertas', label: 'Notificações & Alertas', icon: Bell },
            { id: 'Segurança & Acesso', label: 'Segurança & Acesso', icon: Shield },
            { id: 'Mensagem WhatsApp', label: 'Mensagem WhatsApp', icon: MessageSquare },
            { id: 'Configurações de Metas', label: 'Configurações de Metas', icon: Target },
          ] as { id: TabType; label: string; icon: React.FC<{ className?: string }>; isExclusiveDirector?: boolean }[]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-[#1D4ED8] text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.isExclusiveDirector && (
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Diretor
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. CONTEÚDO DA ABA 1: GESTÃO DE USUÁRIOS */}
      {activeTab === 'Gestão de Usuários' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* BANNER EXCLUSIVO DA DIRETORIA (EDER PEREZ) */}
          {isDirector ? (
            <div className="bg-gradient-to-r from-amber-50 via-blue-50 to-indigo-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">Painel de Gestão da Diretoria — Eder Perez</p>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                      Gestão Central de Logins
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Como Diretor Geral, você pode <strong>mexer no login, redefinir senhas, ativar/inativar e configurar permissões</strong> de cada funcionário da equipe.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-amber-900 bg-amber-100/90 border border-amber-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>🔒</span>
                  <span>Modo Administrador Ativo</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                Visualização do quadro de colaboradores. A alteração de acessos, senhas e logins de outros colaboradores é restrita ao <strong>Diretor Eder Perez</strong>.
              </span>
            </div>
          )}

          {/* Barra superior com campo de busca e botão "+ Novo Usuário" */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, e-mail ou cargo..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Limpar
                </button>
              )}
            </div>

            {canManageUsers && (
              <button
                type="button"
                onClick={handleOpenNewUser}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer flex-shrink-0"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Novo Usuário</span>
              </button>
            )}
          </div>

          {/* Tabela em Card Branco */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                    <th className="py-3.5 px-4">Cargo / Função</th>
                    <th className="py-3.5 px-4">Acesso ao Sistema</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                        Nenhum usuário encontrado para a busca realizada.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isTargetDirector = user.cargo === 'Diretor' || user.nome.toLowerCase().includes('eder');
                      const canManageThisUser = isDirector;

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Usuário (Avatar Oficial + Nome e E-mail) */}
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                userName={user.nome}
                                avatarColor={(user as any).avatarColor}
                                size="sm"
                                className="shadow-xs"
                              />
                              <div>
                                <div className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                                  <span>{user.nome}</span>
                                  {isTargetDirector && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                      👑 Diretor
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-normal">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cargo / Função */}
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {user.cargo}
                          </td>

                          {/* Acesso ao Sistema */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#1D4ED8] border border-blue-200/80">
                              {user.acesso}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                user.status === 'Ativo'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {user.status}
                            </span>
                          </td>

                          {/* Ações na linha */}
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManageThisUser ? (
                                <>
                                  {/* Gerar/Redefinir Senha do Funcionário */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenResetPassword(user)}
                                    title={`Gerar/Alterar Senha de ${user.nome}`}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-[#1D4ED8] transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-xs"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    {isDirector && <span className="hidden xl:inline text-[11px] font-semibold">Senha</span>}
                                  </button>

                                  {/* Editar Login e Permissões */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(user)}
                                    title={`Editar Login e Acessos de ${user.nome}`}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {isDirector && <span className="hidden xl:inline text-[11px] font-semibold">Editar</span>}
                                  </button>

                                  {/* Excluir / Desativar (Apenas Diretor Eder Perez e não para si mesmo) */}
                                  {isDirector && !isTargetDirector && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteConfirmModal({ isOpen: true, user })
                                      }
                                      title={`Desativar/Excluir ${user.nome}`}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span
                                  title="Apenas o Diretor Eder Perez pode alterar este login"
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center gap-1 text-[11px]"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span className="hidden sm:inline">Bloqueado</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé da tabela com contagem */}
            <div className="bg-slate-50/50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong className="text-slate-700">{filteredUsers.length}</strong> de{' '}
                <strong className="text-slate-700">{users.length}</strong> usuários cadastrados
              </span>
              <span className="text-[11px] text-slate-400">
                Acessos e senhas controlados pela administração Fênix World
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DA ABA 2: NOTIFICAÇÕES & ALERTAS */}
      {activeTab === 'Notificações & Alertas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-7 animate-in fade-in duration-200 max-w-5xl">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Notificações & Alertas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-[#0057ff] border border-blue-200">
                {notifTargetUser}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Configurações sonoras, notificações no dispositivo, alertas externos por categoria e marcos de metas.
            </p>
          </div>

          {/* 1. NOTIFICAÇÕES NO DISPOSITIVO */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isDeviceNotifActive
                      ? 'bg-blue-100/80 text-[#1D4ED8]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Smartphone className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">
                      Notificações no Dispositivo
                    </h3>
                    {notificationPermission === 'granted' ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>Permissão concedida</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                        <span>Permissão bloqueada</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {notificationPermission === 'granted'
                      ? 'Permissão concedida pelo navegador. Alertas externos e avisos sonoros sincronizados com o aparelho.'
                      : 'Permissão bloqueada no navegador. Habilite as notificações nas permissões do site para poder ativar.'}
                  </p>
                </div>
              </div>

              {/* Botão de teste e Switch ON/OFF Geral */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#1D4ED8] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Testar som e notificação externa no seu dispositivo"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar notificação de teste</span>
                </button>

                {/* ON/OFF Geral */}
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                    {isDeviceNotifActive ? 'Ligado' : 'Desligado'}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleDeviceNotifications}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isDeviceNotifActive ? 'bg-[#1D4ED8]' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={isDeviceNotifActive}
                    title={
                      notificationPermission !== 'granted'
                        ? 'Permissão bloqueada no navegador'
                        : 'ON/OFF geral para alertas no dispositivo'
                    }
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isDeviceNotifActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Painel de Controles do Dispositivo */}
            <div className="pt-3.5 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Escolher som padrão + Ouvir som + Áudio salvo no PC */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Som Padrão
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={notifPrefs.soundType}
                    disabled={notifPrefs.enabled === false}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({
                        ...prev,
                        soundType: e.target.value as NotificationSoundType,
                      }))
                    }
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] disabled:opacity-50 disabled:bg-slate-100 shadow-2xs cursor-pointer"
                  >
                    {SOUND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.durationLabel})
                      </option>
                    ))}
                  </select>

                  {/* Ouvir som padrão */}
                  <button
                    type="button"
                    onClick={handlePlaySoundDemo}
                    disabled={notifPrefs.enabled === false}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#1D4ED8] text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
                    title="Ouvir som padrão selecionado"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Ouvir</span>
                  </button>
                </div>

                {/* Escolher áudio salvo no computador */}
                <div className="pt-1">
                  <input
                    id="audio-upload-general"
                    type="file"
                    accept=".mp3,.wav,.m4a,.ogg,audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/x-m4a,audio/aac"
                    onChange={(e) => handleFileSelect('general', e)}
                    className="hidden"
                  />
                  {customGeneralAudio ? (
                    <div className="flex items-center justify-between gap-1.5 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0" title={customGeneralAudio.fileName}>
                        <FileAudio className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate font-semibold text-emerald-950 text-[11px]">
                          {customGeneralAudio.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditExistingSnippet('general')}
                          className="px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-800 text-[10px] font-semibold hover:bg-emerald-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveGeneralAudio}
                          className="p-1 text-rose-500 hover:text-rose-700"
                          title="Remover áudio geral"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={notifPrefs.enabled === false}
                      onClick={() => {
                        const input = document.getElementById('audio-upload-general') as HTMLInputElement;
                        if (input) input.click();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-[#1D4ED8] bg-white hover:bg-blue-50/50 text-slate-700 hover:text-[#1D4ED8] text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3 text-slate-400" />
                      <span>Áudio do computador (MP3, WAV, M4A, OGG)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Slider de Volume Master */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Volume Geral
                  </label>
                  <span className="text-xs font-bold text-[#1D4ED8]">
                    {notifPrefs.volumePercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2.5 pt-2">
                  <VolumeX className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={notifPrefs.enabled === false}
                    value={notifPrefs.volumePercent}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({
                        ...prev,
                        volumePercent: Number(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1D4ED8] disabled:opacity-50"
                  />
                  <Volume2 className="w-4 h-4 text-[#1D4ED8] flex-shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Volume mestre das notificações. 0% silencia os toques sonoros.
                </p>
              </div>

              {/* Horário das notificações */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Horário das Notificações</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={Boolean(notifPrefs.scheduleEnabled)}
                      disabled={notifPrefs.enabled === false}
                      onChange={(e) =>
                        setNotifPrefs((prev) => ({
                          ...prev,
                          scheduleEnabled: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8] w-3.5 h-3.5"
                    />
                    <span>Restringir</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block mb-0.5">De</span>
                    <input
                      type="time"
                      value={notifPrefs.scheduleStartTime || '08:00'}
                      disabled={!notifPrefs.scheduleEnabled || notifPrefs.enabled === false}
                      onChange={(e) =>
                        setNotifPrefs((prev) => ({
                          ...prev,
                          scheduleStartTime: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] disabled:opacity-50 disabled:bg-slate-100 shadow-2xs"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Até</span>
                    <input
                      type="time"
                      value={notifPrefs.scheduleEndTime || '19:00'}
                      disabled={!notifPrefs.scheduleEnabled || notifPrefs.enabled === false}
                      onChange={(e) =>
                        setNotifPrefs((prev) => ({
                          ...prev,
                          scheduleEndTime: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] disabled:opacity-50 disabled:bg-slate-100 shadow-2xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  {notifPrefs.scheduleEnabled
                    ? `Toques ativos apenas das ${notifPrefs.scheduleStartTime || '08:00'} às ${notifPrefs.scheduleEndTime || '19:00'}`
                    : 'Alertas ativos 24 horas'}
                </p>
              </div>
            </div>

            {/* Editor de Trecho para o Som Geral se ativo */}
            {activeSnippetCategory?.category === 'general' && (
              <div className="pt-3 border-t border-slate-200">
                <AudioSnippetEditor
                  categoryKey="general"
                  categoryLabel="Som Padrão do Dispositivo"
                  userName={notifTargetUser}
                  fileName={activeSnippetCategory.fileName}
                  dataUrl={activeSnippetCategory.dataUrl}
                  fileSize={activeSnippetCategory.fileSize}
                  initialStartTime={activeSnippetCategory.initialStartTime}
                  initialDuration={activeSnippetCategory.initialDuration}
                  initialDurationTotal={activeSnippetCategory.initialDurationTotal}
                  volumePercent={notifPrefs.volumePercent}
                  onSave={(snippet) => handleSaveSnippet('general', snippet)}
                  onCancel={handleCancelSnippet}
                />
              </div>
            )}
          </div>

          {/* 2. NOTIFICAÇÕES POR CATEGORIA (CONFIGURAÇÃO PRINCIPAL) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Notificações por Categoria
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cada categoria com seu próprio som, volume individual e permissão de notificação externa no computador ou celular/PWA.
              </p>
            </div>

            {/* Cabeçalho da tabela de categorias (Desktop) */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100/90 rounded-xl border border-slate-200/70">
              <div className="col-span-3">Categoria</div>
              <div className="col-span-3">Toque Sonoro & Ouvir</div>
              <div className="col-span-2">Áudio do Computador</div>
              <div className="col-span-2">Volume Individual</div>
              <div className="col-span-2 text-center">Notificação Externa</div>
            </div>

            {/* Linhas das 10 Categorias */}
            <div className="space-y-2">
              {notifSoundCategories.map((cat) => {
                const currentCategorySound: NotificationSoundType =
                  notifPrefs.soundsPerType?.[cat.id] ||
                  DEFAULT_SOUNDS_PER_TYPE[cat.id] ||
                  notifPrefs.soundType;
                const IconComp = cat.icon;
                const customAudio = customAudioMap[cat.id];
                const isEditingThisSnippet = activeSnippetCategory?.category === cat.id;
                const isExternalOn = notifPrefs.externalAlerts?.[cat.id] !== false;
                const categoryVolume =
                  typeof notifPrefs.volumesPerType?.[cat.id] === 'number'
                    ? notifPrefs.volumesPerType[cat.id]!
                    : notifPrefs.volumePercent;

                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs space-y-3"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-3">
                      {/* 1. Categoria: Ícone + Nome */}
                      <div className="lg:col-span-3 flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.iconBg} ${cat.iconColor}`}
                        >
                          <IconComp className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {cat.shortDesc}
                          </span>
                        </div>
                      </div>

                      {/* 2. Som selecionável + [Ouvir] */}
                      <div className="lg:col-span-3 flex items-center gap-1.5">
                        <select
                          value={currentCategorySound}
                          onChange={(e) => {
                            const newSound = e.target.value as NotificationSoundType;
                            setNotifPrefs((prev) => ({
                              ...prev,
                              soundsPerType: {
                                ...(prev.soundsPerType || DEFAULT_SOUNDS_PER_TYPE),
                                [cat.id]: newSound,
                              },
                            }));
                          }}
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:outline-none focus:border-[#1D4ED8] focus:bg-white cursor-pointer shadow-2xs"
                        >
                          {SOUND_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        {/* Botão [Ouvir] */}
                        <button
                          type="button"
                          onClick={() => handlePlayCategorySound(cat.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#1D4ED8] text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                          title="Ouvir som desta categoria"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Ouvir</span>
                        </button>
                      </div>

                      {/* 3. Escolher áudio do computador */}
                      <div className="lg:col-span-2">
                        <input
                          id={`audio-upload-${cat.id}`}
                          type="file"
                          accept=".mp3,.wav,.m4a,.ogg,audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/x-m4a,audio/aac"
                          onChange={(e) => handleFileSelect(cat.id, e)}
                          className="hidden"
                        />
                        {customAudio ? (
                          <div className="flex items-center justify-between gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                            <div className="flex items-center gap-1 min-w-0" title={customAudio.fileName}>
                              <Music className="w-3 h-3 text-emerald-700 shrink-0" />
                              <span className="truncate text-[11px] font-semibold">
                                {customAudio.fileName}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditExistingSnippet(cat.id)}
                                className="p-1 hover:bg-emerald-100 rounded text-emerald-700"
                                title="Editar trecho na linha do tempo"
                              >
                                <Sliders className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomAudio(cat.id)}
                                className="p-1 hover:bg-rose-100 rounded text-rose-600"
                                title="Remover áudio customizado"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(
                                `audio-upload-${cat.id}`
                              ) as HTMLInputElement;
                              if (input) input.click();
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-[#1D4ED8] bg-slate-50/50 hover:bg-blue-50/40 text-slate-600 hover:text-[#1D4ED8] text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate"
                            title="Escolher áudio salvo no computador (MP3, WAV, M4A, OGG)"
                          >
                            <Upload className="w-3 h-3 shrink-0" />
                            <span className="truncate">Áudio do PC</span>
                          </button>
                        )}
                      </div>

                      {/* 4. Volume individual */}
                      <div className="lg:col-span-2 flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={categoryVolume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNotifPrefs((prev) => ({
                              ...prev,
                              volumesPerType: {
                                ...(prev.volumesPerType || {}),
                                [cat.id]: val,
                              },
                            }));
                          }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1D4ED8]"
                        />
                        <span className="text-[11px] font-bold text-slate-600 w-8 text-right shrink-0">
                          {categoryVolume}%
                        </span>
                      </div>

                      {/* 5. ON/OFF para notificação externa */}
                      <div className="lg:col-span-2 flex items-center justify-between lg:justify-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 lg:hidden">
                          Notificação Externa:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              const nextVal = !isExternalOn;
                              if (nextVal) {
                                await requestNotificationPermission();
                              }
                              setNotifPrefs((prev) => ({
                                ...prev,
                                externalAlerts: {
                                  ...(prev.externalAlerts || {}),
                                  [cat.id]: nextVal,
                                },
                              }));
                            }}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isExternalOn ? 'bg-[#1D4ED8]' : 'bg-slate-300'
                            }`}
                            role="switch"
                            aria-checked={isExternalOn}
                            title={
                              isExternalOn
                                ? 'Notificação externa ativada (PC e Celular/PWA)'
                                : 'Notificação externa desativada'
                            }
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                isExternalOn ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-bold ${
                              isExternalOn ? 'text-[#1D4ED8]' : 'text-slate-400'
                            }`}
                          >
                            {isExternalOn ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Editor de Trecho na linha do tempo se ativo para esta categoria */}
                    {isEditingThisSnippet && activeSnippetCategory && (
                      <div className="pt-2 border-t border-slate-100">
                        <AudioSnippetEditor
                          categoryKey={cat.id}
                          categoryLabel={cat.label}
                          userName={notifTargetUser}
                          fileName={activeSnippetCategory.fileName}
                          dataUrl={activeSnippetCategory.dataUrl}
                          fileSize={activeSnippetCategory.fileSize}
                          initialStartTime={activeSnippetCategory.initialStartTime}
                          initialDuration={activeSnippetCategory.initialDuration}
                          initialDurationTotal={activeSnippetCategory.initialDurationTotal}
                          volumePercent={categoryVolume}
                          onSave={(snippet) => handleSaveSnippet(cat.id, snippet)}
                          onCancel={handleCancelSnippet}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. MARCOS DE META (BONITO E COMPACTO) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                <Target className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Marcos de Meta
                </h3>
                <p className="text-xs text-slate-500">
                  Avisos sonoros e visuais nos percentuais de atingimento comercial por período.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* Meta Diária */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50/70 to-orange-50/30 rounded-xl border border-amber-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Sun className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold text-amber-950">Meta Diária</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                    Dia
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { key: 'pct50', label: '50% Atingido', badge: '50%' },
                    { key: 'pct75', label: '75% Atingido', badge: '75%' },
                    { key: 'pct100', label: '100% Meta Batida', badge: '100% 🎉' },
                  ].map((m) => {
                    const isChecked = notifPrefs.metaAlerts.diaria[m.key as 'pct50' | 'pct75' | 'pct100'];
                    return (
                      <label
                        key={m.key}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-100/80 border-amber-300 text-amber-950'
                            : 'bg-white/80 border-amber-100 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setNotifPrefs((prev) => ({
                                ...prev,
                                metaAlerts: {
                                  ...prev.metaAlerts,
                                  diaria: {
                                    ...prev.metaAlerts.diaria,
                                    [m.key]: e.target.checked,
                                  },
                                },
                              }))
                            }
                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                          />
                          <span>{m.label}</span>
                        </div>
                        <span className="text-[10px] font-bold opacity-80">{m.badge}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Meta Semanal */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-indigo-50/30 rounded-xl border border-blue-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold text-blue-950">Meta Semanal</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                    Semana
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { key: 'pct50', label: '50% Atingido', badge: '50%' },
                    { key: 'pct75', label: '75% Atingido', badge: '75%' },
                    { key: 'pct100', label: '100% Meta Batida', badge: '100% 🚀' },
                  ].map((m) => {
                    const isChecked = notifPrefs.metaAlerts.semanal[m.key as 'pct50' | 'pct75' | 'pct100'];
                    return (
                      <label
                        key={m.key}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-100/80 border-blue-300 text-blue-950'
                            : 'bg-white/80 border-blue-100 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setNotifPrefs((prev) => ({
                                ...prev,
                                metaAlerts: {
                                  ...prev.metaAlerts,
                                  semanal: {
                                    ...prev.metaAlerts.semanal,
                                    [m.key]: e.target.checked,
                                  },
                                },
                              }))
                            }
                            className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span>{m.label}</span>
                        </div>
                        <span className="text-[10px] font-bold opacity-80">{m.badge}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Meta Mensal */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 rounded-xl border border-emerald-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold text-emerald-950">Meta Mensal</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    Mês
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { key: 'pct50', label: '50% Atingido', badge: '50%' },
                    { key: 'pct75', label: '75% Atingido', badge: '75%' },
                    { key: 'pct100', label: '100% Meta Batida', badge: '100% 🏆' },
                  ].map((m) => {
                    const isChecked = notifPrefs.metaAlerts.mensal[m.key as 'pct50' | 'pct75' | 'pct100'];
                    return (
                      <label
                        key={m.key}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
                            : 'bg-white/80 border-emerald-100 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setNotifPrefs((prev) => ({
                                ...prev,
                                metaAlerts: {
                                  ...prev.metaAlerts,
                                  mensal: {
                                    ...prev.metaAlerts.mensal,
                                    [m.key]: e.target.checked,
                                  },
                                },
                              }))
                            }
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                          <span>{m.label}</span>
                        </div>
                        <span className="text-[10px] font-bold opacity-80">{m.badge}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Rodapé: Salvar Preferências de Notificação */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotifConfig}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Preferências de Notificação</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. CONTEÚDO DA ABA 3: SEGURANÇA & ACESSO */}
      {activeTab === 'Segurança & Acesso' && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl">
          {/* Card: Formulário de alteração de senha */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Segurança e Credenciais de Acesso
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Atualize sua senha de acesso corporativa para garantir a proteção dos dados.
              </p>
            </div>

            {passwordMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Senha Atual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Senha Atual *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword.atual ? 'text' : 'password'}
                    value={passwordData.senhaAtual}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, senhaAtual: e.target.value })
                    }
                    placeholder="Digite sua senha atual"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword({ ...showPassword, atual: !showPassword.atual })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.atual ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nova Senha *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword.nova ? 'text' : 'password'}
                    value={passwordData.novaSenha}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, novaSenha: e.target.value })
                    }
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword({ ...showPassword, nova: !showPassword.nova })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.nova ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword.confirmar ? 'text' : 'password'}
                    value={passwordData.confirmarNovaSenha}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmarNovaSenha: e.target.value,
                      })
                    }
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword({
                        ...showPassword,
                        confirmar: !showPassword.confirmar,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.confirmar ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botão: "Atualizar Senha" (azul royal) */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Atualizar Senha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* 6. CONTEÚDO DA ABA 4: MENSAGEM WHATSAPP */}
      {(activeTab === 'Mensagem WhatsApp' || activeTab === 'Mensagem de Orçamento') && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card Principal: Editor do Modelo de Mensagem */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 border border-blue-200">
                  <MessageSquare className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Mensagem WhatsApp
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Saudação Dinâmica: {getDynamicGreeting()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personalize os textos automáticos para envio via WhatsApp por categoria de cliente com saudação automática pelo horário.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Restaurar mensagem padrão desta categoria"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Restaurar Padrão</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrcamentoMsg}
                  className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Mensagem</span>
                </button>
              </div>
            </div>

            {/* SELETOR DE CATEGORIA */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200/90">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Escolha a Categoria:</span>
                <span className="text-[11px] font-normal text-slate-500">Cada categoria possui sua mensagem personalizada</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {WHATSAPP_CATEGORIES.map((cat) => {
                  const isSelected = selectedWhatsAppCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectWhatsAppCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#1D4ED8] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo de Texto da Mensagem */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Texto da Mensagem para <strong>{selectedWhatsAppCategory}</strong>:</span>
                  <span className="text-[11px] font-normal text-slate-400">(Suporta formatação padrão do WhatsApp: *negrito*, _itálico_)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {(categoryTemplates[selectedWhatsAppCategory] || '').length} caracteres
                </span>
              </div>
              <textarea
                ref={textareaOrcamentoRef}
                rows={10}
                value={categoryTemplates[selectedWhatsAppCategory] || ''}
                onChange={(e) => handleTemplateChange(e.target.value)}
                placeholder="Ex: {saudacao}, {cliente}!&#10;&#10;Segue o seu Orçamento Oficial Fênix World."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-mono leading-relaxed focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Pré-visualização em Tempo Real estilo WhatsApp */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pré-visualização no WhatsApp ({selectedWhatsAppCategory})
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Saudação ativa: "{getDynamicGreeting()}"
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#ECE5DD] border border-slate-300/80 shadow-inner">
                <div className="max-w-xl bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-emerald-100 text-xs text-slate-800 space-y-2 whitespace-pre-wrap leading-relaxed relative">
                  <div className="text-[11px] font-bold text-[#1D4ED8] pb-1 border-b border-slate-100 flex items-center justify-between">
                    <span>Fênix World Distribuidora</span>
                    <span className="text-slate-400 text-[10px]">Hoje</span>
                  </div>
                  <div>{previewOrcamentoMessage}</div>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                    <span>10:30</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                * Utilize as variáveis <strong>{'{saudacao}'}</strong> para a saudação automática pelo horário e <strong>{'{cliente}'}</strong> para o nome real do cliente.
              </p>
            </div>
          </div>

          {/* Modal de Confirmação: Restaurar Padrão */}
          {showResetConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 text-amber-600">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="w-5 h-5 text-amber-600 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Restaurar Mensagem Padrão</h3>
                    <p className="text-xs text-slate-500">Confirmação necessária</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Deseja restaurar a mensagem padrão da categoria <strong className="text-slate-900">"{selectedWhatsAppCategory}"</strong>? A mensagem personalizada atual será substituída pelo modelo original do sistema.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Sim, Restaurar Padrão</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. CONTEÚDO DA ABA 5: CONFIGURAÇÕES DE METAS */}
      {activeTab === 'Configurações de Metas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner: Status Dinâmico da Data Atual */}
          <div className="bg-gradient-to-r from-[#07162e] via-[#0b2146] to-[#07162e] text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    Cálculo Inteligente Baseado na Data Atual
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Período Comercial: {metasCalculated.monthYearLabel}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                  Hoje: {metasCalculated.currentDateFormatted} ({metasCalculated.dayOfWeekName})
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl font-normal">
              A aba <strong>Metas</strong> sincroniza em tempo real com a <strong>data atual</strong>. Os cálculos de <strong>dias decorridos</strong>, <strong>dias restantes</strong>, <strong>dias úteis restantes</strong> e <strong>ritmo diário necessário</strong> são recalculados dinamicamente conforme os dias passam, garantindo que o ritmo comercial nunca fique desatualizado.
            </p>
          </div>

          {/* Cards Resumo dos Cálculos da Data Atual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Dias Decorridos */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dias Decorridos
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {metasCalculated.diasDecorridos} <span className="text-xs font-normal text-slate-400">dias</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Do dia 1 até hoje ({metasCalculated.currentDay} de {metasCalculated.monthName})
              </p>
            </div>

            {/* 2. Dias Restantes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dias Restantes
                </span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#1D4ED8] mt-2">
                {metasCalculated.diasRestantes} <span className="text-xs font-normal text-slate-400">dias</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Até o fim do mês ({metasCalculated.totalDaysInMonth} dias no total)
              </p>
            </div>

            {/* 3. Dias Úteis no Mês */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dias Úteis no Mês
                </span>
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-900 mt-2">
                {metasCalculated.totalWorkingDays} <span className="text-xs font-normal text-slate-400">úteis</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Segunda a Sexta-feira
              </p>
            </div>

            {/* 4. Dias Úteis Restantes */}
            <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Dias Úteis Restantes
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
                {metasCalculated.remainingWorkingDays} <span className="text-xs font-normal text-emerald-600">úteis</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                Base para o ritmo diário da meta
              </p>
            </div>
          </div>

          {/* Configurações dos Parâmetros da Meta */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Parâmetros de Cálculo da Meta
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina como os dias úteis e o valor padrão devem ser calculados pela aba Metas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetMetasConfig}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Restaurar padrão automático"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Restaurar Padrão</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveMetasConfig}
                  className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </div>

            {/* Modo de Cálculo: Automático vs Manual */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Modo de Determinação dos Dias Úteis *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção 1: Automático */}
                <div
                  onClick={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: true }))}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    metasConfig.usarCalculoAutomatico
                      ? 'border-[#1D4ED8] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="modo_dias_uteis"
                    checked={metasConfig.usarCalculoAutomatico}
                    onChange={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: true }))}
                    className="mt-0.5 text-[#1D4ED8] focus:ring-blue-500"
                  />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Cálculo Automático por Data Atual</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Calcula diariamente com precisão matemática os dias úteis (Segunda a Sexta) a partir da data de hoje ({metasCalculated.currentDateFormatted}) até o final do mês.
                    </p>
                  </div>
                </div>

                {/* Opção 2: Manual */}
                <div
                  onClick={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: false }))}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    !metasConfig.usarCalculoAutomatico
                      ? 'border-[#1D4ED8] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="modo_dias_uteis"
                    checked={!metasConfig.usarCalculoAutomatico}
                    onChange={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: false }))}
                    className="mt-0.5 text-[#1D4ED8] focus:ring-blue-500"
                  />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">
                      Definição Manual dos Dias Úteis
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Permite estipular manualmente os dias úteis do período comercial (ideal para compensar feriados prolongados ou calendários especiais).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campos de ajuste manual quando ativo */}
            {!metasConfig.usarCalculoAutomatico && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/90 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Ajuste Manual dos Dias Úteis do Período</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Total de Dias Úteis do Período
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={metasConfig.diasUteisTotaisManual ?? metasCalculated.totalWorkingDays ?? 22}
                      onChange={(e) =>
                        setMetasConfig((prev) => ({
                          ...prev,
                          diasUteisTotaisManual: Math.max(1, parseInt(e.target.value) || 22),
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Total de dias úteis comerciais considerados no mês completo.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Dias Úteis Restantes do Período
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={metasConfig.diasUteisRestantesManual ?? metasCalculated.remainingWorkingDays ?? 1}
                      onChange={(e) =>
                        setMetasConfig((prev) => ({
                          ...prev,
                          diasUteisRestantesManual: Math.max(1, parseInt(e.target.value) || 1),
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Dias restantes a partir de hoje para dividir o valor faltante.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Parâmetros Globais: Valor da Meta e Semanas Comerciais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Valor Padrão da Meta Mensal (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={metasConfig.metaValor ?? 400000}
                    onChange={(e) =>
                      setMetasConfig((prev) => ({
                        ...prev,
                        metaValor: Math.max(1000, parseFloat(e.target.value) || 400000),
                      }))
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-bold focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Valor utilizado como objetivo da equipe comercial na aba Metas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Semanas Comerciais no Mês *
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={metasConfig.semanasComerciais ?? 4}
                  onChange={(e) =>
                    setMetasConfig((prev) => ({
                      ...prev,
                      semanasComerciais: Math.max(1, parseInt(e.target.value) || 4),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Divisor utilizado no Card de Ritmo Semanal (padrão: 4 semanas).
                </span>
              </div>
            </div>

            {/* Simulação em Tempo Real do Ritmo com estes parâmetros */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Info className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Simulação do Ritmo Diário com os Parâmetros Atuais:</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Considerando uma meta de <strong>R$ {metasConfig.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> com <strong>{metasCalculated.remainingWorkingDays} dias úteis restantes</strong>, o ritmo médio necessário para atingir o objetivo é de aproximadamente:
              </p>
              <div className="flex items-center gap-4 pt-1 flex-wrap">
                <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ritmo Diário / Dia Útil</span>
                  <span className="text-base font-black text-[#1D4ED8]">
                    R$ {(metasConfig.metaValor / metasCalculated.remainingWorkingDays).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ritmo Semanal / Semana</span>
                  <span className="text-base font-black text-purple-700">
                    R$ {(metasConfig.metaValor / (metasConfig.semanasComerciais || 4)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CONTEÚDO DA ABA 6: CUSTOS & PARÂMETROS GERAIS          */}
      {/* ======================================================== */}
      {isDirector && (activeTab === 'Custos' || activeTab === 'Custos Variáveis') && (
        <CustosConfigView
          currentUserName={currentUserName}
          isDirector={isDirector}
          showToast={showToast}
        />
      )}

      {/* ======================================================== */}
      {/* 7. SIMULAÇÃO TARKETT P/ DEMAIS USUÁRIOS (SEM ÁREA CUSTOS) */}
      {/* ======================================================== */}
      {!isDirector && activeTab === 'Tarkett' && (
        <CustosTarkettTab
          currentUserName={currentUserName}
          isDirector={false}
          showToast={showToast}
        />
      )}

      {/* ======================================================== */}
      {/* DRAWER LATERAL: "Cadastrar / Editar Usuário"             */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop escurecido suave */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer painel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header do Drawer */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUserId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure as credenciais e permissões de acesso ao CRM.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário do Drawer */}
            <form
              id="user-drawer-form"
              onSubmit={handleSaveUserFromDrawer}
              className="p-6 space-y-5 flex-1"
            >
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Carlos Albuquerque"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>

              {/* E-mail Corporativo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  E-mail Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="exemplo@fenixworld.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>

              {/* Cargo / Função e Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Cargo / Função *
                  </label>
                  <select
                    value={formData.cargo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cargo: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8] cursor-pointer"
                  >
                    <option value="Consultor Comercial">Consultor Comercial</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Representante">Representante</option>
                    <option value="Diretor">Diretor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Status da Conta
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8] cursor-pointer"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Módulos com Permissão (Checkboxes) */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Módulos com Permissão de Acesso
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {ALL_MODULES.map((modulo) => {
                    const normMod = modulo.toLowerCase().replace(/[-_\s]/g, '');
                    const isChecked = formData.modulos.some(
                      (m) => m.toLowerCase().replace(/[-_\s]/g, '') === normMod
                    );
                    return (
                      <label
                        key={modulo}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none p-1 rounded hover:bg-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormData((prev) => {
                              const exists = prev.modulos.some(
                                (m) => m.toLowerCase().replace(/[-_\s]/g, '') === normMod
                              );
                              const updated = exists
                                ? prev.modulos.filter((m) => m.toLowerCase().replace(/[-_\s]/g, '') !== normMod)
                                : [...prev.modulos, modulo];
                              return { ...prev, modulos: updated };
                            });
                          }}
                          className="rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8] w-4 h-4"
                        />
                        <span>{modulo}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Bloco: Gerador automático de login e senha inicial */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    <span>Acesso & Senha Inicial</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newPass = generateRandomPassword();
                      setFormData((prev) => ({ ...prev, senhaInicial: newPass }));
                      showToast('Nova senha aleatória gerada!');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar senha aleatória</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Login Sugerido
                    </span>
                    <input
                      type="text"
                      value={formData.loginSugerido}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          loginSugerido: e.target.value,
                        }))
                      }
                      placeholder="usuario"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Senha Inicial
                    </span>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.senhaInicial}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            senhaInicial: e.target.value,
                          }))
                        }
                        placeholder={editingUserId ? '(Manter atual)' : 'Senha'}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-white focus:outline-none"
                      />
                      {formData.senhaInicial && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(formData.senhaInicial);
                            showToast('Senha copiada para a área de transferência!');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          title="Copiar senha"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  O usuário poderá alterar a senha ao realizar o primeiro login no sistema.
                </p>
              </div>
            </form>

            {/* Botões no rodapé do Drawer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="user-drawer-form"
                className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>✓ Salvar Usuário</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REDEFINIR / GERAR SENHA                           */}
      {/* ======================================================== */}
      {resetPasswordModal.isOpen && resetPasswordModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() =>
              setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true })
            }
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Definir Senha do Colaborador
                  </h3>
                  {isDirector && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                      👑 Gestão do Diretor
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {resetPasswordModal.user.nome} &bull; <span className="font-mono text-slate-700">{resetPasswordModal.user.email}</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 block">
                  Nova senha para o login:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const pass = generateRandomPassword();
                    setResetPasswordModal((prev) => ({ ...prev, customPass: pass }));
                  }}
                  className="text-[11px] font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Gerar aleatória</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={resetPasswordModal.customPass}
                  onChange={(e) =>
                    setResetPasswordModal((prev) => ({
                      ...prev,
                      customPass: e.target.value,
                    }))
                  }
                  placeholder="Digite a nova senha ou use a gerada"
                  className="flex-1 p-2.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordModal.customPass);
                    showToast('Senha copiada com sucesso!');
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                  title="Copiar para a área de transferência"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Opção de exigir redefinição no próximo acesso */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetPasswordModal.requireChangeOnNextLogin}
                  onChange={(e) =>
                    setResetPasswordModal((prev) => ({
                      ...prev,
                      requireChangeOnNextLogin: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded text-[#1D4ED8] focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 font-normal leading-tight">
                  Exigir que o colaborador crie uma nova senha pessoal no próximo acesso (fluxo de primeiro acesso).
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true })
                }
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
              >
                ✓ Aplicar Senha ao Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE USUÁRIO                     */}
      {/* ======================================================== */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteConfirmModal({ isOpen: false, user: null })}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Usuário Permanentemente?
                </h3>
                <p className="text-xs text-slate-500">
                  Remoção definitiva no Supabase e revogação imediata de acesso.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir o usuário{' '}
              <strong className="text-slate-900">{deleteConfirmModal.user.nome}</strong>{' '}
              ({deleteConfirmModal.user.email})? O usuário será removido completamente do sistema e não poderá mais fazer login.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, user: null })}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
