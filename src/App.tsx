import { useState, useEffect, useMemo, useCallback } from 'react';
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CadastroScreen } from './components/CadastroScreen';
import { ClientesScreen } from './components/ClientesScreen';
import { CalculadoraScreen } from './components/CalculadoraScreen';
import { OrcamentoScreen } from './components/OrcamentoScreen';
import { OrcamentosListScreen } from './components/OrcamentosListScreen';
import { TarefaScreen } from './components/TarefaScreen';
import { ProdutosScreen } from './components/ProdutosScreen';
import { BoletosScreen } from './components/BoletosScreen';
import { NotasScreen } from './components/NotasScreen';
import { PosVendasScreen } from './components/PosVendasScreen';
import { MetasScreen } from './components/MetasScreen';
import { FollowUpScreen } from './components/FollowUpScreen';
import { PendenciasScreen } from './components/PendenciasScreen';
import { ConfiguracoesScreen } from './components/ConfiguracoesScreen';
import { ControleEstoqueScreen } from './components/ControleEstoqueScreen';
import { VendasScreen } from './components/VendasScreen';
import { NotificacoesScreen } from './components/NotificacoesScreen';
import { ClientRecord, SavedOrcamento } from './types';
import { getStoredAccounts, isEderPerez } from './utils/auth';
import { pullDataFromSupabase, initSupabaseRealtimeSubscription, syncModuleData } from './utils/supabaseClient';
import { startGlobalNotificationScheduler } from './utils/notificationScheduler';
import { setupGlobalSearchHighlighter } from './utils/searchHighlighter';
import { FenixLogo } from './components/FenixLogo';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import officeBg from './assets/images/fenix_office_bg_1788695593982.jpg';
import mobileBg from './assets/images/fenix_mobile_bg_1788695610738.jpg';
import {
  INITIAL_PRODUCT_CATEGORIES,
  INITIAL_PRODUCT_GROUPS,
  INITIAL_PRODUCT_ITEMS,
} from './data/initialProductsSeed';
import { INITIAL_CLIENTS_DATASET } from './data/initialClientsSeed';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Ao acessar o link publicado/deploy, sempre abrir primeiro a tela inicial de login do SISTEMA FÊNIX WORLD
    // Nunca abrir diretamente uma tela interna ou painel sem sessão ativa explícita
    const sessionAuth = sessionStorage.getItem('fenix_session_active');
    const sessionUser = sessionStorage.getItem('fenix_session_user');
    return Boolean(sessionAuth === 'true' && sessionUser);
  });

  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const sessionAuth = sessionStorage.getItem('fenix_session_active');
    const sessionUser = sessionStorage.getItem('fenix_session_user');
    return sessionAuth === 'true' && sessionUser ? sessionUser : '';
  });

  const [permissionsVersion, setPermissionsVersion] = useState(0);

  useEffect(() => {
    document.title = 'SISTEMA FÊNIX WORLD';
  }, []);

  useEffect(() => {
    const handlePermissionsRefresh = () => {
      setPermissionsVersion((v) => v + 1);
    };
    const handleNavigateTab = (e: any) => {
      const tab = e.detail?.tab;
      const orc = e.detail?.orcamento;
      const mode = e.detail?.mode;
      if (tab) {
        setCurrentTab(tab);
        localStorage.setItem('fenix_last_active_tab', tab);
        if (tab === 'Orçamentos') {
          if (mode === 'edit' && orc) {
            setSelectedOrcamento(orc);
            setOrcamentoViewMode('edit');
          } else {
            setOrcamentoViewMode('list');
          }
        }
      }
    };
    window.addEventListener('fenix_navigate_tab', handleNavigateTab);
    window.addEventListener('fenix_users_updated', handlePermissionsRefresh);
    window.addEventListener('fenix_auth_updated', handlePermissionsRefresh);
    window.addEventListener('storage', handlePermissionsRefresh);
    return () => {
      window.removeEventListener('fenix_navigate_tab', handleNavigateTab);
      window.removeEventListener('fenix_users_updated', handlePermissionsRefresh);
      window.removeEventListener('fenix_auth_updated', handlePermissionsRefresh);
      window.removeEventListener('storage', handlePermissionsRefresh);
    };
  }, []);

  const [activeClient, setActiveClient] = useState<ClientRecord | null>(null);

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => {
    const saved = localStorage.getItem('fenix_last_active_tab');
    if (saved === 'Documentos') return 'Clientes';
    return saved || 'Clientes';
  });
  const [orcamentoViewMode, setOrcamentoViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedOrcamento, setSelectedOrcamento] = useState<SavedOrcamento | null>(null);
  const [isOrcamentoInProgress, setIsOrcamentoInProgress] = useState(false);
  const [initialOpenTaskModal, setInitialOpenTaskModal] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSupabaseData = useCallback(async (tabName?: string) => {
    setLoadError(null);
    try {
      const targetTab = tabName || currentTab;
      await syncModuleData(targetTab);
    } catch (err) {
      console.warn('Sincronização não-bloqueante em background:', err);
    }
  }, [currentTab]);

  // Inicialização segura do sistema (SEM NUNCA apagar dados salvos pelo usuário)
  useEffect(() => {
    const ensureCollectionExists = (key: string) => {
      try {
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, JSON.stringify([]));
        }
      } catch (err) {
        console.error('Erro ao verificar inicialização de chave:', key, err);
      }
    };

    [
      'fenix_clients_db',
      'fenix_orcamentos_history',
      'fenix_saved_orcamentos',
      'fenix_followup_cards_v2',
      'fenix_followup_db',
      'fenix_tarefas_db',
      'fenix_pos_vendas_db',
      'fenix_boletos_db',
      'fenix_notes_db',
      'fenix_notes_v1',
      'fenix_pendencias_v1',
    ].forEach(ensureCollectionExists);

    // Carregamento resiliente sob demanda apenas do módulo ativo inicial
    loadSupabaseData(currentTab);

    // Sincronização periódica resiliente em background a cada 5 minutos do módulo ativo
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        syncModuleData(currentTab).catch(() => {});
      }
    }, 300000);

    // Sincronização resiliente ao focar na janela ou mudar aba do navegador (apenas módulo ativo)
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        syncModuleData(currentTab).catch(() => {});
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // Inscrição em tempo real via Realtime Supabase
    const unsubRealtime = initSupabaseRealtimeSubscription();

    // Verificador global de lembretes automáticos e alarmes de tarefas
    const stopNotificationScheduler = startGlobalNotificationScheduler();

    // Listener para abrir aba diretamente ao clicar em notificações externas ou atalhos
    const handleOpenTabEvent = (e: Event) => {
      try {
        const customEvent = e as CustomEvent;
        const target = customEvent.detail?.tab;
        if (target && target !== 'Chat') {
          setCurrentTab(target);
        }
      } catch {}
    };
    window.addEventListener('fenix_open_tab', handleOpenTabEvent);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('fenix_open_tab', handleOpenTabEvent);
      if (unsubRealtime) unsubRealtime();
      if (stopNotificationScheduler) stopNotificationScheduler();
    };
  }, [loadSupabaseData, currentTab, isAuthenticated]);

  useEffect(() => {
    try {
      localStorage.setItem('fenix_last_active_tab', currentTab);
    } catch {
      // ignore
    }
    // Carrega em background apenas os dados necessários da aba acessada (on-demand)
    if (isAuthenticated) {
      syncModuleData(currentTab).catch(() => {});
    }
  }, [currentTab, isAuthenticated]);

  useEffect(() => {
    try {
      localStorage.setItem('fenix_auth_active', isAuthenticated ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = (name: string) => {
    const user = name.trim();
    if (!user) return;
    setCurrentUserName(user);
    setIsAuthenticated(true);
    setIsInitialLoading(false);
    try {
      sessionStorage.setItem('fenix_session_active', 'true');
      sessionStorage.setItem('fenix_session_user', user);
      localStorage.setItem('fenix_auth_active', 'true');
      localStorage.setItem('fenix_saved_username', user);
      localStorage.setItem('fenix_active_user_name', user);
      localStorage.setItem('fenix_active_user', user);
    } catch {
      // ignore
    }
    // Abre o sistema imediatamente e sincroniza em background apenas o módulo ativo
    syncModuleData(currentTab).catch(() => {});
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserName('');
    setIsMobileMenuOpen(false);
    try {
      sessionStorage.removeItem('fenix_session_active');
      sessionStorage.removeItem('fenix_session_user');
      localStorage.setItem('fenix_auth_active', 'false');
      localStorage.removeItem('fenix_active_user_name');
    } catch {
      // ignore
    }
    window.location.hash = '';
  };

  const handleQuickAction = (
    action: 'Calculadora' | 'Orçamentos' | 'Tarefas',
    client: ClientRecord,
    options?: { createOrcamento?: boolean; openNewTaskModal?: boolean; openOrcamento?: SavedOrcamento }
  ) => {
    setActiveClient(client);
    try {
      localStorage.setItem('fenix_active_client', JSON.stringify(client));
    } catch {
      // ignore
    }

    if (action === 'Calculadora') {
      setCurrentTab('Calculadora');
      return;
    }

    if (action === 'Orçamentos') {
      if (options?.openOrcamento) {
        setSelectedOrcamento(options.openOrcamento);
        setOrcamentoViewMode('edit');
      } else if (options?.createOrcamento) {
        try {
          const userKey = `fenix_orcamento_in_progress_draft_${currentUserName || 'default'}`;
          localStorage.removeItem(userKey);
          localStorage.removeItem('fenix_orcamento_in_progress_draft');
        } catch {}
        setOrcamentoViewMode('create');
        setSelectedOrcamento(null);
      } else {
        setOrcamentoViewMode('list');
        setSelectedOrcamento(null);
      }
      setCurrentTab('Orçamentos');
      return;
    }

    if (action === 'Tarefas') {
      setInitialOpenTaskModal(!!options?.openNewTaskModal);
      setCurrentTab('Tarefas');
      return;
    }

    setCurrentTab(action);
  };

  // Privilégios do Diretor Éder Perez vs Usuários Comuns (com normalização estrita de acentos)
  const isDirector = isEderPerez(currentUserName);

  // Inicializar o destacador e rolagem automática para resultados da busca global
  useEffect(() => {
    return setupGlobalSearchHighlighter();
  }, []);

  // Sincronização de Rota / URL Hash com Bloqueio Estrito de Segurança
  useEffect(() => {
    const handleRouteSync = () => {
      const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
      if (!hash) return;

      // REQUISITO CRÍTICO DE SEGURANÇA: Bloquear acesso direto pela URL ou rota para Vendas
      if (hash === 'vendas' || hash === 'venda') {
        if (isDirector) {
          setCurrentTab('Vendas');
        } else {
          // Bloqueia e redireciona imediatamente para clientes
          window.location.hash = 'clientes';
          setCurrentTab('Clientes');
        }
        return;
      }

      if (hash === 'estoque' || hash === 'controle-de-estoque' || hash === 'controle de estoque') {
        setCurrentTab('Estoque');
        return;
      }

      const map: Record<string, string> = {
        clientes: 'Clientes',
        calculadora: 'Calculadora',
        orcamentos: 'Orçamentos',
        agenda: 'Agenda',
        obras: 'Obras',
        materiais: 'Materiais',
        'follow-up': 'Follow-up',
        followup: 'Follow-up',
        metas: 'Metas',
        produtos: 'Produtos',
        tarefas: 'Tarefas',
        'pos-vendas': 'Pós Vendas',
        posvendas: 'Pós Vendas',
        'pos vendas': 'Pós Vendas',
        'pós vendas': 'Pós Vendas',
        'pós-vendas': 'Pós Vendas',
        boletos: 'Boletos',
        pendencias: 'Pendências',
        notas: 'Notas',
        configuracoes: 'Configurações',
      };

      if (map[hash]) {
        setCurrentTab(map[hash]);
      }
    };

    handleRouteSync();
    window.addEventListener('hashchange', handleRouteSync);
    return () => window.removeEventListener('hashchange', handleRouteSync);
  }, [currentUserName, isDirector]);

  // Atualizar hash e storage sempre que a aba mudar
  useEffect(() => {
    localStorage.setItem('fenix_last_active_tab', currentTab);
    const hashNormalized = currentTab.toLowerCase().replace(/\s+/g, '-');
    if (window.location.hash.replace('#', '').toLowerCase() !== hashNormalized) {
      window.location.hash = hashNormalized;
    }
  }, [currentTab]);

  // Abas autorizadas para o usuário logado
  const allowedTabs = useMemo(() => {
    // Éder Perez (Diretor) sempre tem acesso total e irrestrito a todas as 15 abas, incluindo a aba exclusiva Vendas
    if (isDirector) {
      return [
        'Clientes',
        'Calculadora',
        'Orçamentos',
        'Vendas',
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
        'Notificações',
      ];
    }

    if (!currentUserName) return [];

    const accounts = getStoredAccounts();
    const userAccount =
      accounts[currentUserName] ||
      Object.values(accounts).find(
        (u) =>
          u.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() ===
          currentUserName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      );

    if (userAccount && Array.isArray(userAccount.modulos)) {
      // Filtrar 'Controle de Estoque' e garantir que 'Vendas' seja exclusivo do Diretor Éder Perez
      const clean = userAccount.modulos
        .filter((m) => m !== 'Controle de Estoque' && m !== 'Documentos' && (isDirector ? true : m !== 'Vendas'))
        .map((m) => (m === 'Pós-Vendas' ? 'Pós Vendas' : m));
      // Suporte interno para abrir modal de Notificações
      if (!clean.includes('Notificações')) {
        clean.push('Notificações');
      }
      return clean;
    }

    return [
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
      'Notificações',
    ];
  }, [currentUserName, isDirector, permissionsVersion]);

  // Se o usuário tentar acessar uma aba não permitida pelo Éder, redireciona para a primeira permitida
  useEffect(() => {
    if (!isAuthenticated || !currentUserName) return;
    if (isDirector) return;
    if (allowedTabs.length === 0) return;

    // Normalização para comparar nome da aba
    const normCurrentTab = currentTab
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_\s]/g, '');

    const isCurrentAllowed = allowedTabs.some((t) => {
      const norm = t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_\s]/g, '');
      return norm === normCurrentTab;
    });

    if (!isCurrentAllowed) {
      const firstAllowed = allowedTabs.find((t) => t !== 'Notificações') || 'Clientes';
      setCurrentTab(firstAllowed);
      window.location.hash = firstAllowed.toLowerCase().replace(/\s+/g, '-');
    }
  }, [currentTab, allowedTabs, isDirector, isAuthenticated, currentUserName]);

  // REQUISITO DE LOGIN: Ao acessar o link publicado/deploy, sempre abrir primeiro a tela inicial de login
  // Sem sessão válida, nunca abrir diretamente uma tela interna ou painel
  if (!isAuthenticated || !currentUserName) {
    return (
      <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0d14]">
        {/* Desktop Luxury Office Background */}
        <div className="absolute inset-0 hidden sm:block">
          <img
            src={officeBg}
            alt="Ambiente Corporativo Fênix World"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/35 pointer-events-none" />
        </div>

        {/* Mobile Luxury Office Background */}
        <div className="absolute inset-0 sm:hidden">
          <img
            src={mobileBg}
            alt="Ambiente Corporativo Fênix World Mobile"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60 pointer-events-none" />
        </div>

        {/* Main Content Layout Container */}
        <div className="relative z-10 w-full min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12">
          {/* Center/Main Area */}
          <div className="w-full max-w-7xl mx-auto my-auto flex flex-col lg:flex-row items-center justify-end lg:pr-10 xl:pr-16">
            <div className="w-full sm:w-auto flex justify-center lg:justify-end">
              <LoginForm
                onOpenForgotPassword={() => setIsForgotModalOpen(true)}
                onLoginSuccess={handleLoginSuccess}
              />
            </div>
          </div>

          {/* Bottom copyright / environment indicator */}
          <footer className="w-full max-w-7xl mx-auto py-2 flex items-center justify-between text-[11px] sm:text-xs text-white/50 px-2 select-none">
            <span>SISTEMA FÊNIX WORLD &copy; {new Date().getFullYear()}</span>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block">Ambiente Corporativo Seguro</span>
            </div>
          </footer>
        </div>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
        />
      </main>
    );
  }

  // Render the official CRM layout
  return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex font-sans antialiased">
        {/* Dark Sophisticated Sidebar (Visible on desktop, drawer on mobile) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'Calculadora') {
              setActiveClient(null);
            }
            setCurrentTab(tab);
            setInitialOpenTaskModal(false);
            if (tab === 'Orçamentos') {
              setActiveClient(null);
              setOrcamentoViewMode('list');
              setSelectedOrcamento(null);
            }
          }}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onLogout={handleLogout}
          currentUserName={currentUserName}
          allowedTabs={allowedTabs}
        />

        {/* Main Content Area (Offset by sidebar width on desktop) */}
        <div className="flex-1 lg:pl-60 xl:pl-64 flex flex-col min-h-screen w-full min-w-0 overflow-x-hidden">
          {/* Top Banner Header with Luxury Office Background, Greeting, Search, and Avatar */}
          <Header
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            userName={currentUserName}
            onOpenProfile={() => setCurrentTab('Configurações')}
            onLogout={handleLogout}
            onSelectTab={(tab) => {
              if (tab === 'Calculadora') {
                setActiveClient(null);
              }
              setCurrentTab(tab);
              setInitialOpenTaskModal(false);
              if (tab === 'Orçamentos') {
                setActiveClient(null);
                setOrcamentoViewMode('list');
                setSelectedOrcamento(null);
              }
            }}
            onSelectClient={(client) => {
              setActiveClient(client);
              setCurrentTab('Clientes');
            }}
            onSelectSearchResult={(result) => {
              if (result.origin === 'Clientes' && result.clientRecord) {
                setActiveClient(result.clientRecord);
                setCurrentTab('Clientes');
              } else if (result.origin === 'Orçamentos' && result.rawItem) {
                setSelectedOrcamento(result.rawItem);
                setOrcamentoViewMode('edit');
                setCurrentTab('Orçamentos');
              } else {
                setCurrentTab(result.targetTab as any);
              }
            }}
          />

          {/* Main Content according to active tab */}
          <main className="flex-1 pb-10 w-full min-w-0 flex flex-col">
            {currentTab === 'Clientes' ? (
              <ClientesScreen
                currentUserName={currentUserName}
                initialClient={activeClient}
                onSelectClientAction={handleQuickAction}
              />
            ) : currentTab === 'Calculadora' ? (
              <CalculadoraScreen
                client={activeClient}
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onGoToOrcamento={() => {
                  setCurrentTab('Orçamentos');
                  setOrcamentoViewMode('create');
                  setSelectedOrcamento(null);
                }}
                onSelectClient={(c) => setActiveClient(c)}
              />
            ) : currentTab === 'Orçamentos' ? (
              orcamentoViewMode === 'list' ? (
                <OrcamentosListScreen
                  currentUserName={currentUserName}
                  onNavigateTab={(tab) => setCurrentTab(tab as any)}
                  onNewOrcamento={() => {
                    setActiveClient(null);
                    setSelectedOrcamento(null);
                    setOrcamentoViewMode('create');
                  }}
                  onOpenOrcamento={(orc) => {
                    setSelectedOrcamento(orc);
                    setOrcamentoViewMode('edit');
                  }}
                />
              ) : (
                <OrcamentoScreen
                  client={activeClient}
                  initialOrcamento={selectedOrcamento}
                  onStatusChangeInProgress={(inProgress) => setIsOrcamentoInProgress(inProgress)}
                  onBackToList={() => {
                    setIsOrcamentoInProgress(false);
                    setActiveClient(null);
                    setSelectedOrcamento(null);
                    setOrcamentoViewMode('list');
                  }}
                  onBackToCadastro={() => {
                    setIsOrcamentoInProgress(false);
                    setCurrentTab('Cadastro');
                  }}
                  onSaveSuccess={() => {
                    setIsOrcamentoInProgress(false);
                    setActiveClient(null);
                    setSelectedOrcamento(null);
                    setOrcamentoViewMode('list');
                  }}
                  currentUserName={currentUserName}
                  onSelectClient={(c) => setActiveClient(c)}
                />
              )
            ) : currentTab === 'Agenda' || currentTab === 'Tarefas' ? (
              <TarefaScreen
                client={activeClient}
                initialOpenCreateTask={initialOpenTaskModal}
                onBackToCadastro={() => setCurrentTab('Clientes')}
                currentUserName={currentUserName}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Follow-up' || currentTab === 'FollowUp' ? (
              <FollowUpScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
                onOpenOrcamento={(orc) => {
                  setSelectedOrcamento(orc);
                  setOrcamentoViewMode('edit');
                  setCurrentTab('Orçamentos');
                }}
              />
            ) : currentTab === 'Obras' || currentTab === 'Pós-Vendas' || currentTab === 'Pós Vendas' || currentTab === 'PosVendas' ? (
              <PosVendasScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Boletos' ? (
              <BoletosScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Pendências' || currentTab === 'Pendencias' ? (
              <PendenciasScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Notas' ? (
              <NotasScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Metas' || currentTab === 'Meta' ? (
              <MetasScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Configurações' || currentTab === 'Configuracoes' || currentTab === 'Settings' ? (
              <ConfiguracoesScreen
                currentUserName={currentUserName}
                onUpdateUserName={(name) => {
                  setCurrentUserName(name);
                  localStorage.setItem('fenix_saved_username', name);
                }}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Materiais' || currentTab === 'Controle de Estoque' || currentTab === 'Estoque' ? (
              <ControleEstoqueScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Vendas' && isDirector ? (
              <VendasScreen
                currentUserName={currentUserName}
                onBackToCadastro={() => setCurrentTab('Cadastro')}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : currentTab === 'Notificações' || currentTab === 'Notificacoes' ? (
              <NotificacoesScreen
                currentUserName={currentUserName}
                onNavigateTab={(tab) => {
                  if (tab === 'Calculadora') {
                    setActiveClient(null);
                  }
                  setCurrentTab(tab);
                  if (tab === 'Orçamentos') {
                    setActiveClient(null);
                    setOrcamentoViewMode('list');
                    setSelectedOrcamento(null);
                  }
                }}
                onBack={() => setCurrentTab('Clientes')}
              />
            ) : currentTab === 'Produtos' ? (
              <ProdutosScreen currentUserName={currentUserName} />
            ) : (
              <CadastroScreen
                currentUserName={currentUserName}
                selectedClient={activeClient}
                onQuickAction={handleQuickAction}
                onClientSaved={(saved) => setActiveClient(saved)}
              />
            )}
          </main>
        </div>
      </div>
    );
}
