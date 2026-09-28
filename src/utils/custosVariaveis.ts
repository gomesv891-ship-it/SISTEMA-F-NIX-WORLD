import { saveWholeCollectionToSupabase, getSupabaseClient } from './supabaseClient';

export interface CustoVariavel {
  id: string;
  nome: string;
  tipo: 'fixo' | 'porcentagem'; // R$ ou %
  valor: number; // valor monetário (ex: 25.50 para R$ 25,50) ou percentual (ex: 5 para 5%)
  descricao?: string;
  ativo: boolean;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export const STORAGE_CUSTOS_VARIAVEIS_KEY = 'fenix_custos_variaveis_v1';
export const EVENT_CUSTOS_VARIAVEIS_UPDATED = 'fenix_custos_variaveis_updated';

/**
 * Lista padrão: estritamente vazia.
 * Não são criados custos fictícios ou de demonstração.
 * Somente custos reais cadastrados manualmente pela diretoria são válidos.
 */
export const DEFAULT_CUSTOS_VARIAVEIS: CustoVariavel[] = [];

/**
 * Identifica e bloqueia qualquer registro de custo fictício ou de demonstração
 */
export function isFictitiousCusto(item: any): boolean {
  if (!item) return true;
  const id = String(item.id || '').trim();
  if (
    id === 'custo_imposto_padrao' ||
    id === 'custo_comissao_comercial' ||
    id === 'custo_embalagem_logistica' ||
    id.startsWith('mock-') ||
    id.startsWith('demo-') ||
    id.includes('fictic')
  ) {
    return true;
  }
  return false;
}

/**
 * Carrega a lista de custos variáveis persistida (somente custos reais cadastrados)
 */
export function getCustosVariaveis(): CustoVariavel[] {
  try {
    const saved = localStorage.getItem(STORAGE_CUSTOS_VARIAVEIS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter((c: any) => !isFictitiousCusto(c));
        if (clean.length !== parsed.length) {
          localStorage.setItem(STORAGE_CUSTOS_VARIAVEIS_KEY, JSON.stringify(clean));
        }
        return clean;
      }
    }
  } catch (err) {
    console.error('Erro ao ler custos variáveis do localStorage:', err);
  }
  return [];
}

/**
 * Consulta custos variáveis do Supabase e sincroniza no cache local
 */
export async function fetchCustosVariaveisFromDatabase(): Promise<CustoVariavel[]> {
  const supabase = getSupabaseClient();
  let dbCustos: CustoVariavel[] | null = null;

  if (supabase) {
    try {
      const { data: row, error } = await supabase
        .from('fenix_kv_store')
        .select('data')
        .eq('key', 'custos_variaveis')
        .maybeSingle();

      if (!error && row && Array.isArray(row.data)) {
        dbCustos = (row.data as any[]).filter((c) => !isFictitiousCusto(c));
      }
    } catch (err) {
      console.warn('Erro ao consultar custos_variaveis no Supabase:', err);
    }
  }

  if (!dbCustos) {
    dbCustos = getCustosVariaveis();
  } else {
    localStorage.setItem(STORAGE_CUSTOS_VARIAVEIS_KEY, JSON.stringify(dbCustos));
  }

  return dbCustos;
}

/**
 * Salva a lista inteira de custos variáveis no localStorage e sincroniza no banco Supabase
 */
export async function saveCustosVariaveis(custos: CustoVariavel[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_CUSTOS_VARIAVEIS_KEY, JSON.stringify(custos));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_CUSTOS_VARIAVEIS_UPDATED, { detail: custos }));
    }

    // Persistência segura em banco de dados
    const supabase = getSupabaseClient();
    if (supabase) {
      await saveWholeCollectionToSupabase('custos_variaveis', custos);
    }
  } catch (err) {
    console.error('Erro ao salvar custos variáveis:', err);
  }
}

/**
 * Adiciona um novo custo variável
 */
export async function addCustoVariavel(
  data: Omit<CustoVariavel, 'id' | 'criadoEm' | 'atualizadoEm'>
): Promise<CustoVariavel> {
  const current = getCustosVariaveis();
  const now = new Date().toISOString();
  const novo: CustoVariavel = {
    ...data,
    id: `custo_var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    criadoEm: now,
    atualizadoEm: now,
  };
  const updated = [novo, ...current];
  await saveCustosVariaveis(updated);
  return novo;
}

/**
 * Edita um custo variável existente
 */
export async function updateCustoVariavel(
  id: string,
  changes: Partial<Omit<CustoVariavel, 'id' | 'criadoEm'>>
): Promise<void> {
  const current = getCustosVariaveis();
  const now = new Date().toISOString();
  const updated = current.map((c) => (c.id === id ? { ...c, ...changes, atualizadoEm: now } : c));
  await saveCustosVariaveis(updated);
}

/**
 * Remove um custo variável
 */
export async function deleteCustoVariavel(id: string): Promise<void> {
  const current = getCustosVariaveis();
  const updated = current.filter((c) => c.id !== id);
  await saveCustosVariaveis(updated);
}

/**
 * Calcula o impacto dos custos variáveis sobre um determinado subtotal ou valor base
 */
export function calcularCustosVariaveis(
  valorBase: number,
  custos?: CustoVariavel[]
): {
  totalFixos: number;
  totalPercentuais: number;
  totalGeral: number;
  detalhamento: Array<{
    id: string;
    nome: string;
    tipo: 'fixo' | 'porcentagem';
    valorInformado: number;
    valorCalculado: number;
  }>;
} {
  const lista = (custos || getCustosVariaveis()).filter((c) => c.ativo);
  let totalFixos = 0;
  let totalPercentuais = 0;

  const detalhamento = lista.map((c) => {
    let valorCalculado = 0;
    if (c.tipo === 'porcentagem') {
      valorCalculado = Math.round(((valorBase * (c.valor || 0)) / 100) * 100) / 100;
      totalPercentuais += valorCalculado;
    } else {
      valorCalculado = Number(c.valor) || 0;
      totalFixos += valorCalculado;
    }
    return {
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      valorInformado: c.valor,
      valorCalculado,
    };
  });

  const totalGeral = Math.round((totalFixos + totalPercentuais) * 100) / 100;

  return {
    totalFixos,
    totalPercentuais,
    totalGeral,
    detalhamento,
  };
}

/**
 * Calcula o lucro operacional e a margem percentual com base na venda, custo de produtos e custos adicionais
 */
export function calcularLucroEMargem(
  valorVenda: number,
  custoProdutos: number,
  custosAdicionais: number = 0
): { lucro: number; margem: number } {
  const lucro = Math.round((valorVenda - custoProdutos - custosAdicionais) * 100) / 100;
  const margem = valorVenda > 0 ? Math.round(((lucro / valorVenda) * 100) * 10) / 10 : 0;
  return { lucro, margem };
}
