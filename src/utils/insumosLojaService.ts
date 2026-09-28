import { getSupabaseClient, saveWholeCollectionToSupabase, dispatchCollectionEvents } from './supabaseClient';

export interface InsumoLojaItem {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  unidade: string;
  saldoAtual: number;
  estoqueMinimo: number;
  custoUnitario?: number;
  localizacao?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsumoMovimentacao {
  id: string;
  insumoId: string;
  insumoCodigo: string;
  insumoNome: string;
  tipo: 'ENTRADA' | 'SAIDA_CONSUMO';
  subtipo?: string;
  quantidade: number;
  unidade: string;
  saldoAnterior: number;
  saldoPosterior: number;
  data: string;
  hora: string;
  responsavel: string;
  setorOuDestino?: string;
  observacao?: string;
  custoTotal?: number;
  createdAt: string;
}

export const INSUMOS_STORAGE_KEY = 'fenix_estoque_insumos_v1';
export const INSUMOS_MOVS_STORAGE_KEY = 'fenix_estoque_insumos_movs_v1';

export const INSUMO_CATEGORIAS = [
  'Escritório & Papelaria',
  'Copa & Alimentação',
  'Limpeza & Higiene',
  'Embalagem & Expedição',
  'EPIs & Segurança',
  'Manutenção & Ferramentas',
  'Outros Insumos',
];

export const SETORES_CONSUMO = [
  'Showroom / Vendas',
  'Administrativo / Financeiro',
  'Diretoria',
  'Expedição / Estoque',
  'Copa / Refeitório',
  'Instaladores / Equipe Externa',
  'Limpeza Geral',
  'Recepção',
];

// Iniciar vazio/zerado sem produtos ou dados automáticos fictícios
const INITIAL_INSUMOS_SEED: InsumoLojaItem[] = [];
const INITIAL_MOVS_SEED: InsumoMovimentacao[] = [];

/**
 * Retorna todos os insumos cadastrados (inicia vazio/zerado)
 */
export async function fetchInsumosLoja(): Promise<InsumoLojaItem[]> {
  try {
    const raw = localStorage.getItem(INSUMOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Remove quaisquer sementes fictícias prévias de teste (ins-001 a ins-008)
        const realItems = parsed.filter((it) => !it.id?.startsWith('ins-00'));
        if (realItems.length !== parsed.length) {
          localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(realItems));
        }
        if (realItems.length > 0) {
          return realItems;
        }
      }
    }

    // Tentar carregar do Supabase se já houver dados reais salvos
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client
          .from('fenix_kv_store')
          .select('data')
          .eq('key', INSUMOS_STORAGE_KEY)
          .maybeSingle();

        if (data && Array.isArray(data.data)) {
          const realItems = data.data.filter((it: any) => !it.id?.startsWith('ins-00'));
          localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(realItems));
          return realItems;
        }
      } catch {}
    }

    // Inicia vazio/zerado conforme solicitado pelo usuário
    localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (err) {
    console.error('Erro ao buscar insumos da loja:', err);
    return [];
  }
}

/**
 * Retorna o histórico de movimentações de insumos (inicia vazio/zerado)
 */
export async function fetchInsumosMovimentacoes(): Promise<InsumoMovimentacao[]> {
  try {
    const raw = localStorage.getItem(INSUMOS_MOVS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Remove quaisquer movimentações fictícias prévias de teste (imov-001 a imov-004)
        const realMovs = parsed.filter((m) => !m.id?.startsWith('imov-00'));
        if (realMovs.length !== parsed.length) {
          localStorage.setItem(INSUMOS_MOVS_STORAGE_KEY, JSON.stringify(realMovs));
        }
        if (realMovs.length > 0) {
          return realMovs;
        }
      }
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client
          .from('fenix_kv_store')
          .select('data')
          .eq('key', INSUMOS_MOVS_STORAGE_KEY)
          .maybeSingle();

        if (data && Array.isArray(data.data)) {
          const realMovs = data.data.filter((m: any) => !m.id?.startsWith('imov-00'));
          localStorage.setItem(INSUMOS_MOVS_STORAGE_KEY, JSON.stringify(realMovs));
          return realMovs;
        }
      } catch {}
    }

    // Inicia vazio/zerado sem registros fictícios
    localStorage.setItem(INSUMOS_MOVS_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (err) {
    console.error('Erro ao buscar movimentações de insumos:', err);
    return [];
  }
}

/**
 * Cadastra novo insumo
 */
export async function cadastrarInsumo(
  payload: Omit<InsumoLojaItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<InsumoLojaItem> {
  const list = await fetchInsumosLoja();
  const now = new Date().toISOString();

  let nextNum = list.length + 1;
  let code = payload.codigo?.trim();
  if (!code) {
    code = `INS-${String(nextNum).padStart(3, '0')}`;
  }

  const newItem: InsumoLojaItem = {
    ...payload,
    id: `ins-${Date.now()}`,
    codigo: code,
    saldoAtual: Number(payload.saldoAtual) || 0,
    estoqueMinimo: Number(payload.estoqueMinimo) || 0,
    custoUnitario: Number(payload.custoUnitario) || 0,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newItem, ...list];
  localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(updated));
  saveWholeCollectionToSupabase(INSUMOS_STORAGE_KEY, updated).catch(() => {});
  dispatchCollectionEvents(INSUMOS_STORAGE_KEY);

  return newItem;
}

/**
 * Atualiza insumo existente
 */
export async function atualizarInsumo(
  id: string,
  updates: Partial<InsumoLojaItem>
): Promise<InsumoLojaItem | null> {
  const list = await fetchInsumosLoja();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return null;

  const updatedItem: InsumoLojaItem = {
    ...list[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  list[idx] = updatedItem;
  localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(list));
  saveWholeCollectionToSupabase(INSUMOS_STORAGE_KEY, list).catch(() => {});
  dispatchCollectionEvents(INSUMOS_STORAGE_KEY);

  return updatedItem;
}

/**
 * Exclui insumo
 */
export async function excluirInsumo(id: string): Promise<boolean> {
  const list = await fetchInsumosLoja();
  const updated = list.filter((x) => x.id !== id);
  localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(updated));
  saveWholeCollectionToSupabase(INSUMOS_STORAGE_KEY, updated).catch(() => {});
  dispatchCollectionEvents(INSUMOS_STORAGE_KEY);
  return true;
}

/**
 * Registra ENTRADA de insumo (compra, reposição ou doação)
 */
export async function registrarEntradaInsumo(params: {
  insumoId: string;
  quantidade: number;
  data: string;
  hora?: string;
  responsavel: string;
  subtipo?: string;
  custoUnitario?: number;
  observacao?: string;
  setorOuDestino?: string;
}): Promise<{ success: boolean; mov?: InsumoMovimentacao; error?: string }> {
  try {
    const list = await fetchInsumosLoja();
    const item = list.find((x) => x.id === params.insumoId);
    if (!item) {
      return { success: false, error: 'Insumo não encontrado no catálogo.' };
    }

    const qtd = Number(params.quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      return { success: false, error: 'Informe uma quantidade válida superior a zero.' };
    }

    const saldoAnterior = item.saldoAtual || 0;
    const saldoPosterior = saldoAnterior + qtd;
    const now = new Date();
    const hora = params.hora || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    item.saldoAtual = saldoPosterior;
    item.updatedAt = now.toISOString();
    if (params.custoUnitario !== undefined && params.custoUnitario > 0) {
      item.custoUnitario = params.custoUnitario;
    }

    const newMov: InsumoMovimentacao = {
      id: `imov-${Date.now()}`,
      insumoId: item.id,
      insumoCodigo: item.codigo,
      insumoNome: item.nome,
      tipo: 'ENTRADA',
      subtipo: params.subtipo || 'Reposição / Compra',
      quantidade: qtd,
      unidade: item.unidade,
      saldoAnterior,
      saldoPosterior,
      data: params.data,
      hora,
      responsavel: params.responsavel,
      setorOuDestino: params.setorOuDestino || 'Almoxarifado',
      observacao: params.observacao?.trim() || '',
      custoTotal: (params.custoUnitario || item.custoUnitario || 0) * qtd,
      createdAt: now.toISOString(),
    };

    // Salva insumos atualizados
    localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(list));
    saveWholeCollectionToSupabase(INSUMOS_STORAGE_KEY, list).catch(() => {});

    // Salva movimentações de insumos
    const movs = await fetchInsumosMovimentacoes();
    const updatedMovs = [newMov, ...movs];
    localStorage.setItem(INSUMOS_MOVS_STORAGE_KEY, JSON.stringify(updatedMovs));
    saveWholeCollectionToSupabase(INSUMOS_MOVS_STORAGE_KEY, updatedMovs).catch(() => {});

    dispatchCollectionEvents(INSUMOS_STORAGE_KEY);
    dispatchCollectionEvents(INSUMOS_MOVS_STORAGE_KEY);

    return { success: true, mov: newMov };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar entrada de insumo.' };
  }
}

/**
 * Registra SAÍDA / CONSUMO de insumo pela loja
 */
export async function registrarSaidaConsumoInsumo(params: {
  insumoId: string;
  quantidade: number;
  data: string;
  hora?: string;
  responsavel: string;
  setorOuDestino: string;
  subtipo?: string;
  observacao?: string;
}): Promise<{ success: boolean; mov?: InsumoMovimentacao; error?: string }> {
  try {
    const list = await fetchInsumosLoja();
    const item = list.find((x) => x.id === params.insumoId);
    if (!item) {
      return { success: false, error: 'Insumo não encontrado no catálogo.' };
    }

    const qtd = Number(params.quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      return { success: false, error: 'Informe uma quantidade válida superior a zero.' };
    }

    const saldoAnterior = item.saldoAtual || 0;
    if (qtd > saldoAnterior) {
      return {
        success: false,
        error: `Saldo insuficiente! Disponível: ${saldoAnterior} ${item.unidade}, solicitada: ${qtd} ${item.unidade}.`,
      };
    }

    const saldoPosterior = Math.max(0, saldoAnterior - qtd);
    const now = new Date();
    const hora = params.hora || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    item.saldoAtual = saldoPosterior;
    item.updatedAt = now.toISOString();

    const newMov: InsumoMovimentacao = {
      id: `imov-${Date.now()}`,
      insumoId: item.id,
      insumoCodigo: item.codigo,
      insumoNome: item.nome,
      tipo: 'SAIDA_CONSUMO',
      subtipo: params.subtipo || 'Consumo Interno da Loja',
      quantidade: qtd,
      unidade: item.unidade,
      saldoAnterior,
      saldoPosterior,
      data: params.data,
      hora,
      responsavel: params.responsavel,
      setorOuDestino: params.setorOuDestino || 'Uso Interno',
      observacao: params.observacao?.trim() || '',
      createdAt: now.toISOString(),
    };

    localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(list));
    saveWholeCollectionToSupabase(INSUMOS_STORAGE_KEY, list).catch(() => {});

    const movs = await fetchInsumosMovimentacoes();
    const updatedMovs = [newMov, ...movs];
    localStorage.setItem(INSUMOS_MOVS_STORAGE_KEY, JSON.stringify(updatedMovs));
    saveWholeCollectionToSupabase(INSUMOS_MOVS_STORAGE_KEY, updatedMovs).catch(() => {});

    dispatchCollectionEvents(INSUMOS_STORAGE_KEY);
    dispatchCollectionEvents(INSUMOS_MOVS_STORAGE_KEY);

    return { success: true, mov: newMov };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar saída de insumo.' };
  }
}
