import { getSupabaseClient, withTimeout } from './supabaseClient';

export type AuthorizedUserName = string;

export interface UserAccount {
  name: string;
  id: string;
  email: string;
  cargo: string;
  password: string; // Initially '1234'
  mustChangePassword: boolean; // Initially true (prompts for new password on first login)
  lastLogin?: string;
  avatarInitials: string;
  active: boolean;
  modulos?: string[];
  status?: 'Ativo' | 'Inativo';
  loginSugerido?: string;
  avatarId?: string;
  avatarColor?: string;
  displayName?: string;
}

const STORAGE_KEY = 'fenix_auth_users_v2';
const ACTIVE_USER_KEY = 'fenix_active_user_name';
const AUTH_STATUS_KEY = 'fenix_auth_active';
const FENIX_USUARIOS_KEY = 'fenix_usuarios_v2';

const DEFAULT_MODULES = [
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

const INITIAL_ACCOUNTS: Record<string, UserAccount> = {
  'Vanessa Gomes': {
    name: 'Vanessa Gomes',
    id: '5ebedc87-ef20-4abc-9613-7e8503c75c54',
    email: 'comercialfenix2620@gmail.com',
    cargo: 'Consultora Comercial',
    password: '1234',
    mustChangePassword: true,
    avatarInitials: 'VG',
    avatarColor: '#0066FF',
    avatarId: 'oficial',
    active: true,
    status: 'Ativo',
    modulos: [...DEFAULT_MODULES],
  },
  'Jhessica Camargo': {
    name: 'Jhessica Camargo',
    id: '9d86d050-72fb-49ed-8994-5b2681f559ff',
    email: 'comercialfenix2620@gmail.com',
    cargo: 'Consultora Comercial',
    password: '1234',
    mustChangePassword: true,
    avatarInitials: 'JC',
    avatarColor: '#8B5CF6',
    avatarId: 'oficial',
    active: true,
    status: 'Ativo',
    modulos: [...DEFAULT_MODULES],
  },
  'Eder Perez': {
    name: 'Eder Perez',
    id: 'c8f7d6a5-1234-4567-89ab-cdef01234567',
    email: 'eder@fenixworld.com.br',
    cargo: 'Diretor',
    password: '1234',
    mustChangePassword: true,
    avatarInitials: 'EP',
    avatarColor: '#10B981',
    avatarId: 'oficial',
    active: true,
    status: 'Ativo',
    modulos: [...DEFAULT_MODULES, 'Vendas'],
  },
  'Jeferson Trolesi': {
    name: 'Jeferson Trolesi',
    id: 'd19c3b8a-4421-482a-a924-d92e8c201732',
    email: 'jeferson@fenixworld.com.br',
    cargo: 'Marketplace',
    password: '1234',
    mustChangePassword: true,
    avatarInitials: 'JT',
    avatarColor: '#F97316',
    avatarId: 'oficial',
    active: true,
    status: 'Ativo',
    modulos: [...DEFAULT_MODULES.filter(m => m !== 'Configurações')],
    loginSugerido: 'jeferson.trolesi',
  },
};

export function getStoredAccounts(): Record<string, UserAccount> {
  if (typeof window === 'undefined') return INITIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let accounts: Record<string, UserAccount> = {};
    if (raw) {
      try {
        accounts = JSON.parse(raw) || {};
      } catch {
        accounts = {};
      }
    }

    // Se houver chave legada ou prefixada 'Diretor Eder Perez', migra para 'Eder Perez'
    if (accounts['Diretor Eder Perez'] && !accounts['Eder Perez']) {
      accounts['Eder Perez'] = {
        ...accounts['Diretor Eder Perez'],
        name: 'Eder Perez',
        cargo: 'Diretor',
        active: true,
      };
    }

    // Sincronizar com fenix_usuarios_v2 (painel de Gestão de Usuários)
    // GARANTIA: Gestão de Usuários e Login compartilham rigorosamente a MESMA fonte da verdade
    try {
      const fenixUsersRaw = localStorage.getItem(FENIX_USUARIOS_KEY);
      if (fenixUsersRaw) {
        const fenixUsers = JSON.parse(fenixUsersRaw);
        if (Array.isArray(fenixUsers)) {
          fenixUsers.forEach((fu: any) => {
            if (!fu.nome) return;
            const existing = accounts[fu.nome];
            const isAct = fu.status === 'Ativo';
            if (!existing) {
              accounts[fu.nome] = {
                name: fu.nome,
                id: fu.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                email: fu.email || '',
                cargo: fu.cargo || 'Consultora Comercial',
                password: fu.password || '1234',
                mustChangePassword: fu.mustChangePassword ?? true,
                avatarInitials: fu.avatarIniciais || fu.nome.slice(0, 2).toUpperCase(),
                active: isAct,
                status: fu.status || (isAct ? 'Ativo' : 'Inativo'),
                modulos: Array.isArray(fu.modulos) && fu.modulos.length > 0
                  ? fu.modulos
                      .filter((m: string) => m !== 'Controle de Estoque')
                      .map((m: string) => (m === 'Pós-Vendas' ? 'Pós Vendas' : m))
                  : [...DEFAULT_MODULES],
                loginSugerido: fu.loginSugerido,
              };
            } else {
              existing.cargo = fu.cargo || existing.cargo;
              existing.email = fu.email || existing.email;
              existing.active = isAct;
              existing.status = fu.status || (isAct ? 'Ativo' : 'Inativo');
              if (Array.isArray(fu.modulos) && fu.modulos.length > 0) {
                existing.modulos = fu.modulos
                  .filter((m: string) => m !== 'Controle de Estoque' && m !== 'Documentos')
                  .map((m: string) => (m === 'Pós-Vendas' ? 'Pós Vendas' : m));
              }
              if (fu.loginSugerido) {
                existing.loginSugerido = fu.loginSugerido;
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // Garantir que as 4 contas base existam e estejam com dados corretos
    Object.keys(INITIAL_ACCOUNTS).forEach((userName) => {
      if (!accounts[userName]) {
        accounts[userName] = { ...INITIAL_ACCOUNTS[userName] };
      } else {
        accounts[userName].name = userName;
      }
    });

    // Normalização das contas oficiais do sistema
    Object.keys(accounts).forEach((key) => {
      const acc = accounts[key];
      const normName = (acc.name || key).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (normName === 'eder perez') {
        acc.cargo = 'Diretor';
        acc.avatarInitials = 'EP';
        if (!acc.modulos || !Array.isArray(acc.modulos)) {
          acc.modulos = [...DEFAULT_MODULES, 'Vendas'];
        } else if (!acc.modulos.includes('Vendas')) {
          acc.modulos.push('Vendas');
        }
      } else {
        // Garantir que a aba Vendas seja exclusiva do Diretor Éder Perez
        if (Array.isArray(acc.modulos)) {
          acc.modulos = acc.modulos.filter((m) => m !== 'Vendas');
        }
        if (normName === 'vanessa gomes') {
          acc.cargo = 'Consultora Comercial';
          acc.avatarInitials = 'VG';
        } else if (normName === 'jhessica camargo') {
          acc.cargo = 'Consultora Comercial';
          acc.avatarInitials = 'JC';
        } else if (normName === 'jeferson trolesi') {
          acc.cargo = 'Marketplace';
          acc.avatarInitials = 'JT';
        }
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return accounts;
  } catch {
    return { ...INITIAL_ACCOUNTS };
  }
}

/**
 * Retorna os detalhes de identificação (nome, cargo e iniciais) do usuário logado
 * buscando diretamente da conta correspondente em getStoredAccounts().
 */
export function getUserDetails(userName: string): {
  name: string;
  cargo: string;
  initials: string;
  avatarId?: string;
  avatarColor?: string;
  displayName?: string;
} {
  const accounts = getStoredAccounts();
  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const cleanTarget = norm(userName);

  for (const acc of Object.values(accounts)) {
    if (norm(acc.name) === cleanTarget || norm(acc.id) === cleanTarget) {
      const resolvedColor =
        acc.avatarColor ||
        (cleanTarget.includes('eder')
          ? '#10B981'
          : cleanTarget.includes('jhessica')
          ? '#8B5CF6'
          : cleanTarget.includes('jeferson')
          ? '#F97316'
          : '#0066FF');

      return {
        name: acc.displayName || acc.name,
        cargo: acc.cargo,
        initials: acc.avatarInitials || (acc.name ? acc.name.slice(0, 2).toUpperCase() : 'US'),
        avatarId: 'oficial',
        avatarColor: resolvedColor,
        displayName: acc.displayName,
      };
    }
  }

  // Fallbacks estritos por correspondência de nome se não houver match direto
  if (cleanTarget.includes('eder')) {
    return { name: 'Éder Perez', cargo: 'Diretor', initials: 'EP', avatarId: 'oficial', avatarColor: '#10B981' };
  }
  if (cleanTarget.includes('jeferson')) {
    return { name: 'Jeferson Trolesi', cargo: 'Marketplace', initials: 'JT', avatarId: 'oficial', avatarColor: '#F97316' };
  }
  if (cleanTarget.includes('jhessica')) {
    return { name: 'Jhessica Camargo', cargo: 'Consultora Comercial', initials: 'JC', avatarId: 'oficial', avatarColor: '#8B5CF6' };
  }
  if (cleanTarget.includes('vanessa')) {
    return { name: 'Vanessa Gomes', cargo: 'Consultora Comercial', initials: 'VG', avatarId: 'oficial', avatarColor: '#0066FF' };
  }

  return {
    name: userName || 'Usuário',
    cargo: 'Consultora Comercial',
    initials: userName ? userName.slice(0, 2).toUpperCase() : 'US',
    avatarId: 'oficial',
    avatarColor: '#0066FF',
  };
}

/**
 * 3. USUÁRIO MARKETPLACE:
 * Verifica se o usuário tem a função/cargo Marketplace (ex: Jeferson Trolesi ou qualquer usuário criado com função Marketplace).
 */
export function isMarketplaceUser(userName?: string | null): boolean {
  if (!userName) return false;
  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  const cleanTarget = norm(userName);

  if (cleanTarget.includes('jeferson')) return true;

  const details = getUserDetails(userName);
  if (details.cargo && norm(details.cargo).includes('marketplace')) return true;

  const accounts = getStoredAccounts();
  for (const acc of Object.values(accounts)) {
    if (
      norm(acc.name) === cleanTarget ||
      norm(acc.id) === cleanTarget ||
      norm(acc.displayName || '') === cleanTarget
    ) {
      if (acc.cargo && norm(acc.cargo).includes('marketplace')) return true;
    }
  }

  try {
    const rawFenix = localStorage.getItem('fenix_usuarios_v2');
    if (rawFenix) {
      const users: any[] = JSON.parse(rawFenix);
      if (Array.isArray(users)) {
        const found = users.find(
          (u) =>
            norm(u.nome) === cleanTarget ||
            norm(u.id) === cleanTarget ||
            norm(u.loginSugerido || '') === cleanTarget
        );
        if (
          found &&
          (norm(found.cargo || '').includes('marketplace') ||
            norm(found.funcao || '').includes('marketplace'))
        ) {
          return true;
        }
      }
    }
  } catch {}

  return false;
}

/**
 * Retorna todos os usuários ativos do sistema para compartilhamento, filtros e listas
 */
export function getActiveTeamUsers(): { id: string; name: string; initials: string; cargo: string }[] {
  const accounts = getStoredAccounts();
  const list: { id: string; name: string; initials: string; cargo: string }[] = [];
  const seen = new Set<string>();

  Object.values(accounts).forEach((acc) => {
    if (!acc.name) return;
    const norm = acc.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (seen.has(norm)) return;
    seen.add(norm);

    // Filtrar apenas ativos
    if (acc.active !== false && acc.status !== 'Inativo') {
      list.push({
        id: acc.id,
        name: acc.name,
        initials: acc.avatarInitials || acc.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        cargo: acc.cargo,
      });
    }
  });

  return list;
}

/**
 * Retorna uma conta de usuário pelo seu ID único
 */
export function getUserById(id: string): UserAccount | null {
  if (!id) return null;
  const accounts = getStoredAccounts();
  const found = Object.values(accounts).find((u) => u.id === id);
  if (found) return found;
  if (id === '622d2e97-914d-4dc0-9327-a4a56b045744' || id === 'c8f7d6a5-1234-4567-89ab-cdef01234567') {
    return Object.values(accounts).find((u) => u.name.toLowerCase().includes('eder')) || null;
  }
  return null;
}

/**
 * Resolve o ID real do usuário a partir do seu nome ou identificador
 */
export function getUserIdByName(name: string): string | null {
  if (!name) return null;
  const accounts = getStoredAccounts();
  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const target = norm(name);

  for (const acc of Object.values(accounts)) {
    if (norm(acc.name) === target || norm(acc.id) === target) {
      return acc.id;
    }
  }

  for (const acc of Object.values(accounts)) {
    const n = norm(acc.name);
    if (target && (n.includes(target) || target.includes(n))) {
      return acc.id;
    }
  }

  if (target.includes('eder')) return 'c8f7d6a5-1234-4567-89ab-cdef01234567';
  if (target.includes('jhessica') || target.includes('jessica')) return '9d86d050-72fb-49ed-8994-5b2681f559ff';
  if (target.includes('vanessa')) return '5ebedc87-ef20-4abc-9613-7e8503c75c54';
  if (target.includes('jeferson')) return 'd19c3b8a-4421-482a-a924-d92e8c201732';

  return null;
}

export async function fetchAccountsFromSupabase(): Promise<Record<string, UserAccount>> {
  const client = getSupabaseClient();
  if (!client) return getStoredAccounts();

  try {
    const fetchPromise = client
      .from('fenix_kv_store')
      .select('data')
      .eq('key', STORAGE_KEY)
      .maybeSingle();

    const rowRes = await withTimeout(fetchPromise, 2200, null);

    if (rowRes && !rowRes.error && rowRes.data && rowRes.data.data && typeof rowRes.data.data === 'object' && Object.keys(rowRes.data.data).length > 0) {
      const remoteAccounts = rowRes.data.data as Record<string, UserAccount>;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteAccounts));
      window.dispatchEvent(new Event('fenix_auth_updated'));
      return remoteAccounts;
    }
  } catch (err) {
    console.warn('Erro não-bloqueante ao carregar contas do Supabase:', err);
  }
  return getStoredAccounts();
}

export async function saveStoredAccountsToSupabase(
  accounts: Record<string, UserAccount>,
  currentUser?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.' };
  }

  const user = currentUser || localStorage.getItem(ACTIVE_USER_KEY) || 'CRM Fênix';

  try {
    // 1. Save auth accounts
    const { error } = await client
      .from('fenix_kv_store')
      .upsert(
        {
          key: STORAGE_KEY,
          data: accounts,
          updated_at: new Date().toISOString(),
          updated_by: user,
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Erro ao salvar contas no Supabase:', error);
      return { success: false, error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.' };
    }

    // 2. Also keep fenix_usuarios_v2 in sync
    try {
      const fenixUsersList = Object.values(accounts).map((acc) => {
        const normName = (acc.name || '').toLowerCase();
        const defColor = normName.includes('eder')
          ? '#10B981'
          : normName.includes('jhessica')
          ? '#8B5CF6'
          : normName.includes('jeferson')
          ? '#F97316'
          : '#0066FF';

        return {
          id: acc.id,
          nome: acc.name,
          email: acc.email,
          cargo: acc.cargo,
          status: acc.active ? 'Ativo' : 'Inativo',
          modulos: acc.modulos,
          avatarIniciais: acc.avatarInitials,
          avatarColor: acc.avatarColor || defColor,
          avatarId: 'oficial',
          loginSugerido: acc.loginSugerido,
          password: acc.password,
          mustChangePassword: acc.mustChangePassword,
        };
      });

      await client
        .from('fenix_kv_store')
        .upsert(
          {
            key: FENIX_USUARIOS_KEY,
            data: fenixUsersList,
            updated_at: new Date().toISOString(),
            updated_by: user,
          },
          { onConflict: 'key' }
        );

      localStorage.setItem(FENIX_USUARIOS_KEY, JSON.stringify(fenixUsersList));
      window.dispatchEvent(new Event('fenix_users_updated'));
    } catch (uErr) {
      console.warn('Erro ao sincronizar fenix_usuarios_v2:', uErr);
    }

    // Supabase confirmed success -> update local cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new Event('fenix_auth_updated'));
    window.dispatchEvent(new Event('storage'));

    return { success: true };
  } catch (err: any) {
    console.error('Exceção ao salvar contas no Supabase:', err);
    return { success: false, error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.' };
  }
}

export function saveStoredAccounts(accounts: Record<string, UserAccount>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    // Persiste imediatamente no Supabase em segundo plano
    saveStoredAccountsToSupabase(accounts).catch((err) => {
      console.error('Erro ao persistir contas no Supabase:', err);
    });
  } catch (err) {
    console.error('Erro ao salvar contas de usuário:', err);
  }
}

export function getActiveAuthorizedUsers(): UserAccount[] {
  const accounts = getStoredAccounts();
  return Object.values(accounts).filter((user) => {
    if (user.name === 'Eder Perez' || user.cargo === 'Diretor') return true; // O Diretor sempre deve estar disponível na tela de login
    const isActive =
      user.active === true ||
      (user.active as any) === 'true' ||
      (user.active as any) === 'Ativo' ||
      (user.active as any) === 'ativo' ||
      (user.active as any) === 1 ||
      (user.active as any) === '1' ||
      (user as any).status === 'Ativo';
    return isActive && (user as any).status !== 'Inativo';
  });
}

/**
 * Strict exact match - matches predefined names or dynamic accounts
 */
export function normalizeAuthorizedName(input: string): string | null {
  const clean = (input || '').trim();
  if (!clean) return null;
  const cleanLower = clean.toLowerCase();

  if (
    clean === 'Vanessa Gomes' ||
    cleanLower === 'vanessa' ||
    cleanLower === 'vanessa gomes' ||
    cleanLower === 'vanessa.gomes'
  ) {
    return 'Vanessa Gomes';
  }
  if (
    clean === 'Jhessica Camargo' ||
    cleanLower === 'jhessica' ||
    cleanLower === 'jhessica camargo' ||
    cleanLower === 'jhessica.camargo'
  ) {
    return 'Jhessica Camargo';
  }
  if (
    clean === 'Eder Perez' ||
    clean === 'Diretor Eder Perez' ||
    cleanLower === 'eder' ||
    cleanLower === 'eder perez' ||
    cleanLower === 'diretor eder' ||
    cleanLower === 'diretor eder perez' ||
    cleanLower === 'eder.perez'
  ) {
    return 'Eder Perez';
  }

  // Check dynamic accounts
  const accounts = getStoredAccounts();
  if (accounts[clean]) return accounts[clean].name;

  const foundKey = Object.keys(accounts).find(
    (k) =>
      k.toLowerCase() === cleanLower ||
      accounts[k]?.email?.toLowerCase() === cleanLower ||
      accounts[k]?.loginSugerido?.toLowerCase() === cleanLower
  );
  if (foundKey) return accounts[foundKey].name;

  return null;
}

export interface AuthValidationResult {
  success: boolean;
  user?: UserAccount;
  requiresPasswordChange?: boolean;
  error?: string;
}

export function validateLoginAttempt(nameInput: string, passwordInput: string): AuthValidationResult {
  const GENERIC_ERROR = 'Usuário e/ou senha incorretos.';

  if (!nameInput || !passwordInput) {
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  // Exact registered name required
  const canonicalName = normalizeAuthorizedName(nameInput);
  if (!canonicalName) {
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  const accounts = getStoredAccounts();
  const user = accounts[canonicalName];
  if (!user || user.active === false || user.status === 'Inativo') {
    return {
      success: false,
      error: user && (user.active === false || user.status === 'Inativo')
        ? 'Usuário inativo. Entre em contato com a administração para reativar seu acesso.'
        : GENERIC_ERROR,
    };
  }

  // First access check with default 1234 password
  if (user.mustChangePassword && (user.password === '1234' || !user.password)) {
    if (passwordInput === '1234') {
      return {
        success: true,
        user,
        requiresPasswordChange: true,
      };
    }
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  // Regular password check
  if (passwordInput !== user.password) {
    if (user.mustChangePassword && passwordInput === '1234') {
      return {
        success: true,
        user,
        requiresPasswordChange: true,
      };
    }
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  return {
    success: true,
    user,
    requiresPasswordChange: !!(user.mustChangePassword && passwordInput === '1234'),
  };
}

export async function validateLoginAttemptAsync(
  nameInput: string,
  passwordInput: string
): Promise<AuthValidationResult> {
  const GENERIC_ERROR = 'Usuário e/ou senha incorretos.';

  if (!nameInput || !passwordInput) {
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  // Busca contas com timeout seguro de 2.2s e fallback imediato para as contas locais (nunca bloqueia ou trava o login)
  const accounts = await withTimeout(fetchAccountsFromSupabase(), 2200, getStoredAccounts());

  // Exact registered name required
  const canonicalName = normalizeAuthorizedName(nameInput);
  if (!canonicalName) {
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  const user = accounts[canonicalName];
  if (!user || user.active === false || user.status === 'Inativo') {
    return {
      success: false,
      error: user && (user.active === false || user.status === 'Inativo')
        ? 'Usuário inativo. Entre em contato com a administração para reativar seu acesso.'
        : GENERIC_ERROR,
    };
  }

  // First access check with default 1234 password
  if (user.mustChangePassword && (user.password === '1234' || !user.password)) {
    if (passwordInput === '1234') {
      return {
        success: true,
        user,
        requiresPasswordChange: true,
      };
    }
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  // Regular password check
  if (passwordInput !== user.password) {
    if (user.mustChangePassword && passwordInput === '1234') {
      return {
        success: true,
        user,
        requiresPasswordChange: true,
      };
    }
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  return {
    success: true,
    user,
    requiresPasswordChange: !!(user.mustChangePassword && passwordInput === '1234'),
  };
}

export function completeFirstLoginPasswordChange(
  canonicalName: AuthorizedUserName,
  newPassword: string
): { success: boolean; error?: string } {
  if (!newPassword || newPassword.trim() === '') {
    return { success: false, error: 'Digite uma nova senha válida.' };
  }
  if (newPassword.trim() === '1234') {
    return { success: false, error: 'A nova senha deve ser diferente da senha provisória inicial 1234.' };
  }
  if (newPassword.trim().length < 4) {
    return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
  }

  const accounts = getStoredAccounts();
  if (!accounts[canonicalName]) {
    return { success: false, error: 'Usuário inválido.' };
  }

  accounts[canonicalName] = {
    ...accounts[canonicalName],
    password: newPassword.trim(),
    mustChangePassword: false,
    lastLogin: new Date().toISOString(),
  };

  saveStoredAccounts(accounts);
  setCurrentAuthSession(canonicalName);
  return { success: true };
}

export async function completeFirstLoginPasswordChangeAsync(
  canonicalName: AuthorizedUserName,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.trim() === '') {
    return { success: false, error: 'Digite uma nova senha válida.' };
  }
  if (newPassword.trim() === '1234') {
    return { success: false, error: 'A nova senha deve ser diferente da senha provisória inicial 1234.' };
  }
  if (newPassword.trim().length < 4) {
    return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
  }

  const accounts = await fetchAccountsFromSupabase();
  if (!accounts[canonicalName]) {
    return { success: false, error: 'Usuário inválido.' };
  }

  const updatedAccounts = {
    ...accounts,
    [canonicalName]: {
      ...accounts[canonicalName],
      password: newPassword.trim(),
      mustChangePassword: false,
      lastLogin: new Date().toISOString(),
    },
  };

  const res = await saveStoredAccountsToSupabase(updatedAccounts, canonicalName);
  if (!res.success) {
    return res;
  }

  setCurrentAuthSession(canonicalName);
  return { success: true };
}

export async function updateUserPasswordDirectlyAsync(
  canonicalName: AuthorizedUserName,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'A senha deve conter no mínimo 4 dígitos.' };
  }
  const accounts = await fetchAccountsFromSupabase();
  if (!accounts[canonicalName]) {
    return { success: false, error: 'Usuário não encontrado.' };
  }
  const updatedAccounts = {
    ...accounts,
    [canonicalName]: {
      ...accounts[canonicalName],
      password: newPassword.trim(),
      mustChangePassword: false,
    },
  };
  return await saveStoredAccountsToSupabase(updatedAccounts, canonicalName);
}

export function updateUserPasswordDirectly(
  canonicalName: AuthorizedUserName,
  newPassword: string
): { success: boolean; error?: string } {
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'A senha deve conter no mínimo 4 dígitos.' };
  }
  const accounts = getStoredAccounts();
  if (!accounts[canonicalName]) {
    return { success: false, error: 'Usuário não encontrado.' };
  }
  accounts[canonicalName] = {
    ...accounts[canonicalName],
    password: newPassword.trim(),
    mustChangePassword: false,
  };
  saveStoredAccounts(accounts);
  return { success: true };
}

export function isEderPerez(userName?: string): boolean {
  const target = userName || getCurrentAuthUser();
  const norm = (target || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return norm.includes('eder');
}

export async function updateSelfProfile(updates: {
  displayName?: string;
  cargo?: string;
  avatarId?: string;
  avatarColor?: string;
}): Promise<{ success: boolean; error?: string; updatedUser?: UserAccount }> {
  const currentName = getCurrentAuthUser();
  const accounts = getStoredAccounts();
  const currentAccount = accounts[currentName];

  if (!currentAccount) {
    return { success: false, error: 'Usuário atual não encontrado.' };
  }

  const updatedAccount: UserAccount = {
    ...currentAccount,
    displayName: updates.displayName !== undefined ? updates.displayName : currentAccount.displayName,
    cargo: updates.cargo !== undefined ? updates.cargo : currentAccount.cargo,
    avatarId: updates.avatarId !== undefined ? updates.avatarId : currentAccount.avatarId,
    avatarColor: updates.avatarColor !== undefined ? updates.avatarColor : currentAccount.avatarColor,
  };

  accounts[currentName] = updatedAccount;
  saveStoredAccounts(accounts);

  // Sincronizar com fenix_usuarios_v2
  try {
    const rawFenix = localStorage.getItem(FENIX_USUARIOS_KEY);
    if (rawFenix) {
      let fenixList: any[] = JSON.parse(rawFenix);
      if (Array.isArray(fenixList)) {
        fenixList = fenixList.map((u) =>
          u.nome === currentName || u.id === currentAccount.id
            ? {
                ...u,
                nome: updates.displayName || u.nome,
                cargo: updates.cargo || u.cargo,
                avatarId: updates.avatarId || u.avatarId,
                avatarColor: updates.avatarColor || u.avatarColor,
              }
            : u
        );
        localStorage.setItem(FENIX_USUARIOS_KEY, JSON.stringify(fenixList));
      }
    }
  } catch {}

  // Sincronizar com Supabase
  try {
    await saveStoredAccountsToSupabase(accounts, currentName);
  } catch {}

  window.dispatchEvent(new CustomEvent('fenix_user_profile_updated', { detail: updatedAccount }));
  window.dispatchEvent(new Event('fenix_auth_updated'));
  window.dispatchEvent(new Event('storage'));

  return { success: true, updatedUser: updatedAccount };
}

export function adminUpdateUserAccount(
  userName: AuthorizedUserName,
  updates: Partial<UserAccount>
): { success: boolean; error?: string } {
  if (!isEderPerez()) {
    return { success: false, error: 'Somente o Diretor Éder Perez possui permissão para editar outros usuários.' };
  }
  const accounts = getStoredAccounts();
  if (!accounts[userName]) {
    return { success: false, error: 'Usuário não encontrado.' };
  }
  accounts[userName] = {
    ...accounts[userName],
    ...updates,
  };
  saveStoredAccounts(accounts);
  window.dispatchEvent(new Event('fenix_auth_updated'));
  return { success: true };
}

export async function adminResetUserPasswordAsync(
  userName: AuthorizedUserName,
  newPassword: string,
  requireChangeOnNextLogin: boolean = true
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez()) {
    return { success: false, error: 'Somente o Diretor Éder Perez possui permissão para alterar senhas de outros usuários.' };
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'A senha deve conter no mínimo 4 caracteres.' };
  }
  const accounts = await fetchAccountsFromSupabase();
  if (!accounts[userName]) {
    return { success: false, error: 'Usuário não encontrado.' };
  }
  const updatedAccounts = {
    ...accounts,
    [userName]: {
      ...accounts[userName],
      password: newPassword.trim(),
      mustChangePassword: requireChangeOnNextLogin,
    },
  };
  return await saveStoredAccountsToSupabase(updatedAccounts, userName);
}

export function adminResetUserPassword(
  userName: AuthorizedUserName,
  newPassword: string,
  requireChangeOnNextLogin: boolean = true
): { success: boolean; error?: string } {
  if (!isEderPerez()) {
    return { success: false, error: 'Somente o Diretor Éder Perez possui permissão para alterar senhas de outros usuários.' };
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'A senha deve conter no mínimo 4 caracteres.' };
  }
  const accounts = getStoredAccounts();
  if (!accounts[userName]) {
    return { success: false, error: 'Usuário não encontrado.' };
  }
  accounts[userName] = {
    ...accounts[userName],
    password: newPassword.trim(),
    mustChangePassword: requireChangeOnNextLogin,
  };
  saveStoredAccounts(accounts);
  window.dispatchEvent(new Event('fenix_auth_updated'));
  return { success: true };
}

export async function adminCreateOrUpdateUserAccountAsync(
  account: Partial<UserAccount> & { name: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez()) {
    return { success: false, error: 'Somente o Diretor Éder Perez possui permissão para criar ou gerenciar usuários.' };
  }
  const accounts = await fetchAccountsFromSupabase();
  const userName = account.name.trim();
  if (!userName) {
    return { success: false, error: 'O nome do usuário é obrigatório.' };
  }
  const existing = accounts[userName] as UserAccount | undefined;
  const isAct = account.active ?? (account.status ? account.status === 'Ativo' : true);
  const statusStr = account.status || (isAct ? 'Ativo' : 'Inativo');

  const updatedAccounts = {
    ...accounts,
    [userName]: {
      name: userName,
      id: account.id || existing?.id || `usr-${Date.now()}`,
      email: account.email || existing?.email || '',
      cargo: account.cargo || existing?.cargo || 'Consultor Comercial',
      password: account.password || existing?.password || '1234',
      mustChangePassword: account.mustChangePassword ?? existing?.mustChangePassword ?? true,
      avatarInitials: account.avatarInitials || existing?.avatarInitials || userName.slice(0, 2).toUpperCase(),
      active: isAct,
      status: statusStr,
      modulos: account.modulos || existing?.modulos || [...DEFAULT_MODULES],
      loginSugerido: account.loginSugerido || existing?.loginSugerido,
    },
  };

  return await saveStoredAccountsToSupabase(updatedAccounts, userName);
}

export function adminCreateOrUpdateUserAccount(
  account: Partial<UserAccount> & { name: string }
): { success: boolean; error?: string } {
  if (!isEderPerez()) {
    return { success: false, error: 'Somente o Diretor Éder Perez possui permissão para criar ou gerenciar usuários.' };
  }
  const accounts = getStoredAccounts();
  const userName = account.name.trim();
  if (!userName) {
    return { success: false, error: 'O nome do usuário é obrigatório.' };
  }
  const existing = accounts[userName] as UserAccount | undefined;
  const isAct = account.active ?? (account.status ? account.status === 'Ativo' : true);
  const statusStr = account.status || (isAct ? 'Ativo' : 'Inativo');

  accounts[userName] = {
    name: userName,
    id: account.id || existing?.id || `usr-${Date.now()}`,
    email: account.email || existing?.email || '',
    cargo: account.cargo || existing?.cargo || 'Consultor Comercial',
    password: account.password || existing?.password || '1234',
    mustChangePassword: account.mustChangePassword ?? existing?.mustChangePassword ?? true,
    avatarInitials: account.avatarInitials || existing?.avatarInitials || userName.slice(0, 2).toUpperCase(),
    active: isAct,
    status: statusStr,
    modulos: account.modulos || existing?.modulos || [...DEFAULT_MODULES],
    loginSugerido: account.loginSugerido || existing?.loginSugerido,
  };
  saveStoredAccounts(accounts);
  return { success: true };
}

export async function adminDeleteUserAccountAsync(userName: string): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez()) {
    return { success: false, error: 'Somente o Diretor Éder Perez possui permissão para excluir usuários.' };
  }
  if (userName === 'Eder Perez' || userName.toLowerCase().includes('eder')) {
    return { success: false, error: 'Não é possível excluir a conta da Diretoria (Éder Perez).' };
  }
  const accounts = await fetchAccountsFromSupabase();
  const canonicalName = normalizeAuthorizedName(userName) || userName;

  // 7. REMOÇÃO DEFINITIVA: Exclui a chave da conta para revogar completamente o acesso e autenticação
  const updatedAccounts = { ...accounts };
  delete updatedAccounts[userName];
  if (canonicalName && updatedAccounts[canonicalName]) {
    delete updatedAccounts[canonicalName];
  }

  // Persiste no Supabase e no cache local sem o usuário
  const saveRes = await saveStoredAccountsToSupabase(updatedAccounts, userName);
  saveStoredAccounts(updatedAccounts);

  // Remove completamente do cadastro de fenix_usuarios_v2
  try {
    const rawFenix = localStorage.getItem(FENIX_USUARIOS_KEY);
    if (rawFenix) {
      let fenixList: any[] = JSON.parse(rawFenix);
      if (Array.isArray(fenixList)) {
        fenixList = fenixList.filter(
          (u) => u.nome !== userName && u.nome !== canonicalName && u.id !== userName
        );
        localStorage.setItem(FENIX_USUARIOS_KEY, JSON.stringify(fenixList));
      }
    }
  } catch {
    // ignore
  }

  window.dispatchEvent(new Event('fenix_auth_updated'));
  window.dispatchEvent(new Event('storage'));
  return saveRes;
}

export function adminDeleteUserAccount(userName: string): { success: boolean; error?: string } {
  if (!isEderPerez()) {
    return { success: false, error: 'Somente o Diretor Éder Perez possui permissão para excluir usuários.' };
  }
  if (userName === 'Eder Perez' || userName.toLowerCase().includes('eder')) {
    return { success: false, error: 'Não é possível excluir a conta da Diretoria (Éder Perez).' };
  }
  const accounts = getStoredAccounts();
  const canonicalName = normalizeAuthorizedName(userName) || userName;

  // Exclusão definitiva
  delete accounts[userName];
  if (canonicalName && accounts[canonicalName]) {
    delete accounts[canonicalName];
  }
  saveStoredAccounts(accounts);

  // Sincronizar remoção definitiva no fenix_usuarios_v2
  try {
    const rawFenix = localStorage.getItem(FENIX_USUARIOS_KEY);
    if (rawFenix) {
      let fenixList: any[] = JSON.parse(rawFenix);
      if (Array.isArray(fenixList)) {
        fenixList = fenixList.filter(
          (u) => u.nome !== userName && u.nome !== canonicalName && u.id !== userName
        );
        localStorage.setItem(FENIX_USUARIOS_KEY, JSON.stringify(fenixList));
      }
    }
  } catch {
    // ignore
  }

  window.dispatchEvent(new Event('fenix_auth_updated'));
  window.dispatchEvent(new Event('storage'));
  return { success: true };
}

export function setCurrentAuthSession(name: AuthorizedUserName): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_STATUS_KEY, 'true');
    localStorage.setItem(ACTIVE_USER_KEY, name);
    // sync with legacy keys
    localStorage.setItem('fenix_active_user', name);
    window.dispatchEvent(new Event('fenix_auth_updated'));
  } catch (err) {
    console.error('Erro ao salvar sessão ativa:', err);
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STATUS_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    window.dispatchEvent(new Event('fenix_auth_updated'));
  } catch {
    // ignore
  }
}

export function getCurrentAuthUser(): AuthorizedUserName {
  if (typeof window === 'undefined') return 'Vanessa Gomes';
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem('fenix_active_user');
    if (raw) {
      const normalized = normalizeAuthorizedName(raw);
      if (normalized) return normalized;
    }
  } catch {
    // ignore
  }
  return 'Vanessa Gomes';
}

export function getSellerIdForUser(userName: string): string | null {
  if (!userName) return null;
  const clean = userName.trim();
  if (clean === 'Vanessa Gomes') {
    return '5ebedc87-ef20-4abc-9613-7e8503c75c54';
  }
  if (clean === 'Jhessica Camargo') {
    return '9d86d050-72fb-49ed-8994-5b2681f559ff';
  }
  if (clean.toLowerCase().includes('eder')) {
    return '622d2e97-914d-4dc0-9327-a4a56b045744';
  }
  if (clean.toLowerCase().includes('jeferson')) {
    return 'd19c3b8a-4421-482a-a924-d92e8c201732';
  }
  return `seller-${clean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}
