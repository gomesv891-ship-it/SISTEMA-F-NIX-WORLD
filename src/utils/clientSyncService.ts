import { ClientRecord } from '../types';
import { saveItemToSupabase } from './supabaseClient';

export const CLIENTS_STORAGE_KEY = 'fenix_clients_db';
export const ACTIVE_CLIENT_KEY = 'fenix_active_client';

/**
 * Universal Client Data Synchronizer.
 * Whenever any field of a client is updated in the CLIENTS tab:
 * Updates all records linked to this client across all CRM modules:
 * - Follow-up (fenix_followup_cards_v2 & fenix_followup_db)
 * - Orçamentos (fenix_orcamentos_history)
 * - Vendas Gerenciais (fenix_vendas_gerencial)
 * - Metas de Vendas (fenix_metas_sales_db)
 * - Agenda / Tarefas / Compromissos / Visitas / Instalações (fenix_tarefas_db)
 * - Pós-Vendas (fenix_pos_vendas_db)
 * - Boletos (fenix_boletos_db)
 * - Atividades / Histórico (fenix_activities_db)
 */
export function syncUpdatedClientAcrossAllModules(
  updatedClient: ClientRecord,
  previousClient?: ClientRecord | null,
  currentUserName: string = 'Vanessa Gomes'
): { updatedCount: number; modulesAffected: string[] } {
  if (typeof window === 'undefined' || !updatedClient || !updatedClient.id) {
    return { updatedCount: 0, modulesAffected: [] };
  }

  const clientId = updatedClient.id;
  const newName = updatedClient.name.trim();
  const oldName = previousClient?.name?.trim() || '';
  const newPhone = updatedClient.whatsapp || '';
  const newType = updatedClient.clientType || 'Cliente Final';

  let totalUpdated = 0;
  const modulesAffected: string[] = [];

  // Helper safely reading and saving JSON collections
  const updateCollection = <T>(
    key: string,
    updateFn: (item: T) => { updated: boolean; item: T }
  ): boolean => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const list: T[] = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return false;

      let changed = false;
      const changedItems: T[] = [];
      const updatedList = list.map((item) => {
        const res = updateFn(item);
        if (res.updated) {
          changed = true;
          totalUpdated++;
          changedItems.push(res.item);
        }
        return res.item;
      });

      if (changed) {
        localStorage.setItem(key, JSON.stringify(updatedList));
        changedItems.forEach((it) => {
          saveItemToSupabase(key, it as any, 'id', currentUserName).catch(() => {});
        });
        return true;
      }
    } catch (err) {
      console.warn(`Erro ao sincronizar cliente no módulo [${key}]:`, err);
    }
    return false;
  };

  // 1. ACTIVE CLIENT CONTEXT
  try {
    const rawActive = localStorage.getItem(ACTIVE_CLIENT_KEY);
    if (rawActive) {
      const active: ClientRecord = JSON.parse(rawActive);
      if (active.id === clientId || (oldName && active.name === oldName)) {
        localStorage.setItem(ACTIVE_CLIENT_KEY, JSON.stringify(updatedClient));
      }
    }
  } catch {}

  // 2. FOLLOW-UP MODULE (fenix_followup_cards_v2 & fenix_followup_db)
  const isLinkedClient = (itemClientId?: string, itemClientName?: string) => {
    if (itemClientId && itemClientId === clientId) return true;
    if (itemClientName && oldName && itemClientName.trim().toLowerCase() === oldName.toLowerCase()) return true;
    if (itemClientName && itemClientName.trim().toLowerCase() === newName.toLowerCase()) return true;
    return false;
  };

  const updateFollowUpItem = (it: any) => {
    if (isLinkedClient(it.clientId, it.cliente)) {
      return {
        updated: true,
        item: {
          ...it,
          clientId,
          cliente: newName,
          clientPhone: newPhone,
          clienteWhatsapp: newPhone,
          whatsapp: newPhone,
          clientType: newType,
        },
      };
    }
    return { updated: false, item: it };
  };

  const fup1 = updateCollection('fenix_followup_cards_v2', updateFollowUpItem);
  const fup2 = updateCollection('fenix_followup_db', updateFollowUpItem);
  if (fup1 || fup2) {
    modulesAffected.push('Follow-up');
    window.dispatchEvent(new Event('fenix_followup_updated'));
  }

  // 3. ORÇAMENTOS (fenix_orcamentos_history)
  const orcChanged = updateCollection('fenix_orcamentos_history', (orc: any) => {
    if (isLinkedClient(orc.clientId, orc.cliente)) {
      return {
        updated: true,
        item: {
          ...orc,
          clientId,
          cliente: newName,
          clienteWhatsapp: newPhone,
          whatsapp: newPhone,
          tipoCliente: newType,
        },
      };
    }
    return { updated: false, item: orc };
  });
  if (orcChanged) {
    modulesAffected.push('Orçamentos');
    window.dispatchEvent(new Event('fenix_orcamentos_updated'));
  }

  // 4. METAS DE VENDAS (fenix_metas_sales_db)
  const metasChanged = updateCollection('fenix_metas_sales_db', (sale: any) => {
    if (isLinkedClient(sale.clientId || sale.clienteId, sale.cliente)) {
      return {
        updated: true,
        item: {
          ...sale,
          clientId,
          clienteId: clientId,
          cliente: newName,
          whatsapp: newPhone,
          tipoCliente: newType,
        },
      };
    }
    return { updated: false, item: sale };
  });
  if (metasChanged) {
    modulesAffected.push('Metas');
    window.dispatchEvent(new Event('fenix_metas_updated'));
  }

  // 5. VENDAS GERENCIAIS DO DIRETOR (fenix_vendas_gerencial)
  const vendasChanged = updateCollection('fenix_vendas_gerencial', (v: any) => {
    if (isLinkedClient(v.clientId || v.clienteId, v.cliente)) {
      return {
        updated: true,
        item: {
          ...v,
          clientId,
          clienteId: clientId,
          cliente: newName,
          tipoCliente: newType,
        },
      };
    }
    return { updated: false, item: v };
  });
  if (vendasChanged) {
    modulesAffected.push('Vendas');
    window.dispatchEvent(new Event('fenix_vendas_updated'));
  }

  // 6. AGENDA, TAREFAS, VISITAS, INSTALAÇÕES, RETORNOS (fenix_tarefas_db)
  const tarefasChanged = updateCollection('fenix_tarefas_db', (t: any) => {
    if (isLinkedClient(t.clientId, t.cliente || t.clientName)) {
      return {
        updated: true,
        item: {
          ...t,
          clientId,
          cliente: newName,
          clientName: newName,
          telefone: newPhone,
        },
      };
    }
    return { updated: false, item: t };
  });
  if (tarefasChanged) {
    modulesAffected.push('Agenda e Tarefas');
    window.dispatchEvent(new Event('fenix_tarefas_updated'));
  }

  // 7. PÓS-VENDAS (fenix_pos_vendas_db)
  const pvChanged = updateCollection('fenix_pos_vendas_db', (pv: any) => {
    if (isLinkedClient(pv.clientId, pv.clientName)) {
      return {
        updated: true,
        item: {
          ...pv,
          clientId,
          clientName: newName,
          clientPhone: newPhone,
          clientType: newType,
        },
      };
    }
    return { updated: false, item: pv };
  });
  if (pvChanged) {
    modulesAffected.push('Pós-Vendas');
    window.dispatchEvent(new Event('fenix_pos_vendas_updated'));
  }

  // 8. BOLETOS (fenix_boletos_db)
  const bolChanged = updateCollection('fenix_boletos_db', (b: any) => {
    if (isLinkedClient(b.clientId, b.cliente)) {
      return {
        updated: true,
        item: {
          ...b,
          clientId,
          cliente: newName,
          telefone: newPhone,
        },
      };
    }
    return { updated: false, item: b };
  });
  if (bolChanged) {
    modulesAffected.push('Boletos');
    window.dispatchEvent(new Event('fenix_boletos_updated'));
  }

  // Dispara evento global de storage para garantir que qualquer componente ouvindo atualize
  window.dispatchEvent(new Event('fenix_clients_updated'));
  window.dispatchEvent(new Event('storage'));

  return { updatedCount: totalUpdated, modulesAffected };
}
