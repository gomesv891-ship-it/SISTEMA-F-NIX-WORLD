import { getSupabaseClient, withTimeout } from './supabaseClient';

export interface RendimentoItem {
  id: string;
  produto: string;
  rendimento: string;
  unidade: string;
  observacao?: string;
  createdAt: string;
  updatedAt: string;
}

export const RENDIMENTOS_STORAGE_KEY = 'fenix_calculadora_rendimentos';
export const RENDIMENTOS_DELETED_IDS_KEY = 'fenix_rendimentos_deleted_ids';
export const RENDIMENTOS_INITIALIZED_KEY = 'fenix_rendimentos_initialized';

export const UNIDADES_PADRAO_RENDIMENTO = [
  'm²/caixa',
  'm²/balde',
  'm²/rolo',
  'm²/unidade',
  'm²/bisnaga',
  'm/barra',
  'm/rolo',
  'kg/m²',
  'unidade',
];

/**
 * Retorna o conjunto de IDs excluídos pelo usuário para evitar ressurreição remota.
 */
function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(RENDIMENTOS_DELETED_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {}
  return new Set();
}

/**
 * Adiciona um ID à lista definitiva de excluídos.
 */
function recordDeletedId(id: string) {
  try {
    const current = getDeletedIds();
    current.add(id);
    localStorage.setItem(RENDIMENTOS_DELETED_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

/**
 * Retorna a lista atual de rendimentos armazenada localmente,
 * garantindo que nenhum item excluído reapareça.
 */
export function getStoredRendimentos(): RendimentoItem[] {
  try {
    const deletedIds = getDeletedIds();
    const raw = localStorage.getItem(RENDIMENTOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (item: any) => item && typeof item === 'object' && item.id && !deletedIds.has(item.id)
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
    return [];
  } catch (err) {
    console.error('Erro ao ler rendimentos do storage:', err);
    return [];
  }
}

/**
 * Sincroniza diretamente o estado exato da lista no Supabase kv_store,
 * sem executar merge cumulativo de itens excluídos.
 */
async function syncExactListToSupabase(list: RendimentoItem[]) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const user =
      localStorage.getItem('fenix_active_user_name') ||
      localStorage.getItem('fenix_saved_username') ||
      'Usuário Fênix';

    await withTimeout(
      client.from('fenix_kv_store').upsert(
        {
          key: RENDIMENTOS_STORAGE_KEY,
          data: list,
          updated_at: new Date().toISOString(),
          updated_by: user,
        },
        { onConflict: 'key' }
      ),
      3500,
      null
    );
  } catch (err) {
    console.warn('Falha não bloqueante ao sincronizar rendimentos no Supabase:', err);
  }
}

/**
 * Carrega os rendimentos da nuvem (Supabase) respeitando estritamente
 * as exclusões feitas pelo usuário.
 */
export async function loadRendimentosFromSupabase(): Promise<RendimentoItem[]> {
  const deletedIds = getDeletedIds();
  const isInitialized = localStorage.getItem(RENDIMENTOS_INITIALIZED_KEY) === 'true';
  const localItems = getStoredRendimentos();

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await withTimeout<any>(
        client
          .from('fenix_kv_store')
          .select('data')
          .eq('key', RENDIMENTOS_STORAGE_KEY)
          .maybeSingle(),
        3000,
        { data: null, error: null }
      );

      if (!error && data && data.data !== undefined) {
        let remoteList = data.data;
        if (typeof remoteList === 'string') {
          try {
            remoteList = JSON.parse(remoteList);
          } catch {}
        }

        if (Array.isArray(remoteList)) {
          // Filtra itens já removidos
          const filteredRemote = remoteList.filter(
            (item: any) => item && typeof item === 'object' && item.id && !deletedIds.has(item.id)
          );

          // Se a tela já foi inicializada, prevalece estritamente a lista local limpa do usuário
          // para que cadastros excluídos NUNCA ressuscite ao recarregar a página ou reabrir a aba.
          if (isInitialized) {
            const localIdSet = new Set(localItems.map((i) => i.id));
            const merged = filteredRemote.filter((i) => localIdSet.has(i.id));
            // Se localItems está vazio, permanece vazio (Total: 0 itens)
            const finalCleanList = localItems.length === 0 ? [] : merged;
            localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(finalCleanList));
            return finalCleanList;
          }

          localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(filteredRemote));
          localStorage.setItem(RENDIMENTOS_INITIALIZED_KEY, 'true');
          return filteredRemote;
        }
      }
    } catch (err) {
      console.warn('Falha não bloqueante ao buscar rendimentos do Supabase:', err);
    }
  }

  return localItems;
}

/**
 * Salva ou atualiza um cadastro de rendimento.
 */
export async function saveRendimento(
  itemData: {
    produto: string;
    rendimento: string;
    unidade: string;
    observacao?: string;
  },
  existingId?: string
): Promise<RendimentoItem> {
  const current = getStoredRendimentos();
  const now = new Date().toISOString();

  let updatedList: RendimentoItem[];
  let savedItem: RendimentoItem;

  if (existingId) {
    savedItem = {
      id: existingId,
      produto: itemData.produto.trim(),
      rendimento: itemData.rendimento.trim(),
      unidade: itemData.unidade.trim(),
      observacao: itemData.observacao?.trim() || '',
      createdAt: current.find((c) => c.id === existingId)?.createdAt || now,
      updatedAt: now,
    };
    updatedList = current.map((c) => (c.id === existingId ? savedItem : c));
  } else {
    savedItem = {
      id: `rend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      produto: itemData.produto.trim(),
      rendimento: itemData.rendimento.trim(),
      unidade: itemData.unidade.trim(),
      observacao: itemData.observacao?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    updatedList = [savedItem, ...current];
  }

  localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(updatedList));
  localStorage.setItem(RENDIMENTOS_INITIALIZED_KEY, 'true');
  window.dispatchEvent(new CustomEvent('fenix_rendimentos_updated', { detail: { items: updatedList } }));

  // Sincroniza lista exata no Supabase
  await syncExactListToSupabase(updatedList);

  return savedItem;
}

/**
 * Exclui definitivamente um cadastro de rendimento da fonte de dados (local e nuvem),
 * assegurando que ele nunca ressuscite ao recarregar a página ou reabrir a aba.
 */
export async function deleteRendimento(id: string): Promise<boolean> {
  if (!id) return false;

  // 1. Marca o ID permanentemente como excluído
  recordDeletedId(id);

  // 2. Remove do localStorage imediatamente
  const current = getStoredRendimentos();
  const filtered = current.filter((c) => c.id !== id);
  localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify(filtered));
  localStorage.setItem(RENDIMENTOS_INITIALIZED_KEY, 'true');

  // 3. Notifica ouvintes locais
  window.dispatchEvent(new CustomEvent('fenix_rendimentos_updated', { detail: { items: filtered } }));

  // 4. Atualiza o registro exato no Supabase (sem merge de volta)
  await syncExactListToSupabase(filtered);

  return true;
}

/**
 * Remove todos os cadastros de rendimento se o usuário desejar limpar a tabela por completo.
 */
export async function clearAllRendimentos(): Promise<boolean> {
  const current = getStoredRendimentos();
  current.forEach((item) => recordDeletedId(item.id));

  localStorage.setItem(RENDIMENTOS_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(RENDIMENTOS_INITIALIZED_KEY, 'true');
  window.dispatchEvent(new CustomEvent('fenix_rendimentos_updated', { detail: { items: [] } }));

  await syncExactListToSupabase([]);
  return true;
}
