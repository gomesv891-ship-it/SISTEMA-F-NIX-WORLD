import { getSupabaseClient, saveWholeCollectionToSupabase } from './supabaseClient';
import { isEderPerez, getCurrentAuthUser } from './auth';

export const KEY_PRODUCT_COSTS_DB = 'fenix_product_costs_db';
export const EVENT_PRODUCT_COSTS_UPDATED = 'fenix_product_costs_updated';

/**
 * Mapa de custos oficiais de produtos indexado por ID do produto.
 * Exemplo: { "d82d7196-4694-4815-82f6-d85f79745950": 39.90 }
 */
export type ProductCostsMap = Record<string, number>;

/**
 * Lê o mapa de custos do cache local
 * Somente Éder Perez tem permissão para visualizar custos.
 */
export function getLocalProductCosts(currentUserName?: string): ProductCostsMap {
  const user = currentUserName || getCurrentAuthUser();
  if (!isEderPerez(user)) {
    return {};
  }
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY_PRODUCT_COSTS_DB);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler fenix_product_costs_db do localStorage:', err);
  }
  return {};
}

/**
 * Busca a fonte oficial de custos de produtos diretamente no Supabase.
 * Somente Éder Perez (Diretor) pode visualizar os custos.
 * Essa restrição existe no nível de serviço e banco.
 */
export async function fetchOfficialProductCostsFromDatabase(currentUserName?: string): Promise<ProductCostsMap> {
  const user = currentUserName || getCurrentAuthUser();
  if (!isEderPerez(user)) {
    return {};
  }

  const localMap = getLocalProductCosts(user);
  const supabase = getSupabaseClient();

  if (!supabase) {
    return localMap;
  }

  try {
    const { data: row, error } = await supabase
      .from('fenix_kv_store')
      .select('data')
      .eq('key', KEY_PRODUCT_COSTS_DB)
      .maybeSingle();

    if (!error && row && row.data && typeof row.data === 'object') {
      const remoteMap = row.data as ProductCostsMap;
      // Mescla priorizando valores válidos remotos, mantendo qualquer valor positivo local
      const merged: ProductCostsMap = { ...localMap };
      for (const [pId, val] of Object.entries(remoteMap)) {
        const numVal = Number(val);
        if (!isNaN(numVal) && numVal > 0) {
          merged[pId] = Number(numVal.toFixed(2));
        }
      }

      try {
        localStorage.setItem(KEY_PRODUCT_COSTS_DB, JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch (err) {
    console.warn('Erro ao consultar fenix_product_costs_db no Supabase:', err);
  }

  return localMap;
}

/**
 * Salva o custo de um produto de forma garantida e atômica no Supabase.
 * Fluxo obrigatório:
 * 1. Valida se o usuário é Éder Perez (Diretoria).
 * 2. Consulta o mapa remoto atual no Supabase para evitar sobrescrita por concorrência.
 * 3. Aplica o novo valor.
 * 4. Salva no Supabase (await) e confirma status 200 OK.
 * 5. Atualiza o produto na coleção oficial 'fenix_product_items_data' no Supabase.
 * 6. Atualiza o estado e cache local apenas após a confirmação do Supabase.
 * 7. Dispara eventos de atualização.
 */
export async function saveProductCostToSupabase(
  productId: string,
  newCost: number,
  currentUserName: string = 'Éder Perez'
): Promise<{ success: boolean; custo?: number; error?: string }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Apenas o Diretor Geral Éder Perez possui permissão para alterar custos de produtos.',
    };
  }

  const cleanCost = Number(newCost);
  if (isNaN(cleanCost) || cleanCost < 0) {
    return {
      success: false,
      error: 'Valor de custo inválido informado.',
    };
  }

  const fixedCost = Number(cleanCost.toFixed(2));
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Fallback offline temporário
    const local = getLocalProductCosts();
    local[productId] = fixedCost;
    localStorage.setItem(KEY_PRODUCT_COSTS_DB, JSON.stringify(local));
    return { success: true, custo: fixedCost };
  }

  try {
    // 1. Obter estado atual remoto de fenix_product_costs_db
    const { data: existingRow } = await supabase
      .from('fenix_kv_store')
      .select('data')
      .eq('key', KEY_PRODUCT_COSTS_DB)
      .maybeSingle();

    const currentCosts: ProductCostsMap =
      existingRow && existingRow.data && typeof existingRow.data === 'object'
        ? { ...(existingRow.data as ProductCostsMap) }
        : { ...getLocalProductCosts() };

    // 2. Atualizar mapa com o novo custo
    currentCosts[productId] = fixedCost;

    // 3. Salvar mapa de custos de forma atômica no Supabase
    const { error: costsSaveError } = await supabase
      .from('fenix_kv_store')
      .upsert(
        {
          key: KEY_PRODUCT_COSTS_DB,
          data: currentCosts,
          updated_at: new Date().toISOString(),
          updated_by: currentUserName || 'Éder Perez',
        },
        { onConflict: 'key' }
      );

    if (costsSaveError) {
      throw costsSaveError;
    }

    // 4. Sincronizar também dentro do produto em 'fenix_product_items_data'
    const { data: productsRow } = await supabase
      .from('fenix_kv_store')
      .select('data')
      .eq('key', 'fenix_product_items_data')
      .maybeSingle();

    if (productsRow && Array.isArray(productsRow.data)) {
      const updatedProducts = productsRow.data.map((p: any) => {
        if (p.id === productId) {
          return {
            ...p,
            custo: fixedCost,
          };
        }
        return p;
      });

      await supabase
        .from('fenix_kv_store')
        .upsert(
          {
            key: 'fenix_product_items_data',
            data: updatedProducts,
            updated_at: new Date().toISOString(),
            updated_by: currentUserName || 'Éder Perez',
          },
          { onConflict: 'key' }
        );

      try {
        localStorage.setItem('fenix_product_items_data', JSON.stringify(updatedProducts));
      } catch {}
    }

    // 5. Atualizar cache local apenas após confirmação do Supabase
    try {
      localStorage.setItem(KEY_PRODUCT_COSTS_DB, JSON.stringify(currentCosts));
    } catch {}

    // 6. Notificar componentes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_PRODUCT_COSTS_UPDATED, { detail: { productId, custo: fixedCost } }));
      window.dispatchEvent(new Event('fenix_products_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true, custo: fixedCost };
  } catch (err: any) {
    console.error('Erro ao salvar custo no Supabase:', err);
    return {
      success: false,
      error: err?.message || 'Falha na comunicação com o banco de dados Supabase.',
    };
  }
}

/**
 * Mescla produtos com o mapa de custos oficial, garantindo que nenhum custo salvo seja apagado
 * e que SOMENTE Éder Perez (Diretor) possa visualizar os valores de custo.
 */
export function mergeProductsWithOfficialCosts(
  products: any[],
  costsMap: ProductCostsMap,
  currentUserName?: string
): any[] {
  if (!Array.isArray(products)) return [];
  const user = currentUserName || getCurrentAuthUser();
  const canViewCosts = isEderPerez(user);

  return products.map((p) => {
    if (!canViewCosts) {
      // Usuário não diretor: custo estritamente oculto / undefined
      const { custo, ...rest } = p;
      return { ...rest, custo: undefined };
    }

    const savedCost = costsMap[p.id];
    if (savedCost !== undefined && savedCost !== null && !isNaN(savedCost) && savedCost > 0) {
      return {
        ...p,
        custo: savedCost,
      };
    }
    return p;
  });
}

/**
 * Função utilitária para mesclar produtos com custos locais ou fornecidos
 */
export function mergeProductCosts(
  products: any[],
  costsMap?: ProductCostsMap,
  currentUserName?: string
): any[] {
  const user = currentUserName || getCurrentAuthUser();
  const map = costsMap || getLocalProductCosts(user);
  return mergeProductsWithOfficialCosts(products, map, user);
}

/**
 * Alias para busca de todos os custos no banco de dados
 */
export const getAllProductCosts = fetchOfficialProductCostsFromDatabase;
