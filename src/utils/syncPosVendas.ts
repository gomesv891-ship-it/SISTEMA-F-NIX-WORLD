import { PosVendaItem, ClientRecord, ClientType } from '../types';
import { getSellerIdForUser } from './userDataFilter';

export const POS_VENDAS_STORAGE_KEY = 'fenix_pos_vendas_db';
export const METAS_SALES_STORAGE_KEY = 'fenix_metas_sales_db';
export const FOLLOWUP_CARDS_STORAGE_KEY = 'fenix_followup_cards_v2';
export const FOLLOWUP_LEGACY_KEY = 'fenix_followup_db';
export const CLIENTS_STORAGE_KEY = 'fenix_clients_db';

/**
 * Normaliza o número do pedido removendo hashes e espaços
 */
export const cleanOrderNumber = (pedido?: string | number): string => {
  if (!pedido) return '';
  return String(pedido).replace(/#/g, '').trim();
};

/**
 * Normaliza nomes para comparação sem case-sensitivity e sem acentos excessivos
 */
const normalizeText = (text?: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Sincroniza automaticamente a base do Pós-Vendas com:
 * 1. Todos os registros marcados como "Vendido" no Follow-up Comercial
 * 2. Todas as vendas cadastradas em Metas de Vendas
 * 
 * Regra: Evitar qualquer duplicação quando a mesma venda já estiver registrada no Pós-Vendas,
 * mantendo o status, feedback e avaliações já efetuadas no Pós-Vendas.
 */
export function syncPosVendasDatabase(): PosVendaItem[] {
  try {
    // 1. Carregar registros atuais de Pós-Vendas
    let currentPosVendas: PosVendaItem[] = [];
    const storedPv = localStorage.getItem(POS_VENDAS_STORAGE_KEY);
    if (storedPv) {
      try {
        const parsed = JSON.parse(storedPv);
        if (Array.isArray(parsed)) {
          currentPosVendas = parsed.map((item) => ({
            ...item,
            orderNumber: cleanOrderNumber(item.orderNumber),
          }));
        }
      } catch {
        currentPosVendas = [];
      }
    }

    // 2. Carregar clientes cadastrados para enriquecer telefones e tipo de cliente
    let clients: ClientRecord[] = [];
    const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (storedClients) {
      try {
        const parsed = JSON.parse(storedClients);
        if (Array.isArray(parsed)) clients = parsed;
      } catch {
        clients = [];
      }
    }

    const findClientMatch = (name: string, phone?: string): ClientRecord | undefined => {
      const normName = normalizeText(name);
      if (!normName) return undefined;
      return (
        clients.find((c) => normalizeText(c.name) === normName) ||
        (phone ? clients.find((c) => c.whatsapp?.replace(/\D/g, '') === phone.replace(/\D/g, '')) : undefined)
      );
    };

    // Helper para verificar se um pedido/venda já está em currentPosVendas
    const isAlreadyInPosVendas = (
      orderNum: string,
      clientName: string,
      orcId?: string,
      metaId?: string
    ): number => {
      const cleanNum = cleanOrderNumber(orderNum);
      const normClient = normalizeText(clientName);

      return currentPosVendas.findIndex((pv) => {
        const pvClean = cleanOrderNumber(pv.orderNumber);
        const pvNormClient = normalizeText(pv.clientName);

        if (orcId && (pv.id === `pv_orc_${orcId}` || pv.orcamentoId === orcId)) return true;
        if (metaId && pv.id === `pv_meta_${metaId}`) return true;

        // Se tiver o mesmo número de pedido preenchido
        if (cleanNum && pvClean && cleanNum === pvClean) {
          return true;
        }

        // Se tiver o mesmo cliente e mesmo número de pedido
        if (cleanNum && pvClean && cleanNum === pvClean && normClient === pvNormClient) {
          return true;
        }

        return false;
      });
    };

    let hasChanges = false;
    const now = new Date();
    const defaultDateStr = now.toISOString().split('T')[0];

    // 3. Sincronizar FOLLOW-UP (VENDIDO)
    // Tenta carregar fenix_followup_cards_v2 ou fenix_followup_db
    let followupItems: any[] = [];
    const storedFollowUp =
      localStorage.getItem(FOLLOWUP_CARDS_STORAGE_KEY) ||
      localStorage.getItem(FOLLOWUP_LEGACY_KEY);
    if (storedFollowUp) {
      try {
        const parsed = JSON.parse(storedFollowUp);
        if (Array.isArray(parsed)) followupItems = parsed;
      } catch {}
    }

    followupItems.forEach((fup) => {
      if (fup.status !== 'Vendido') return;

      const orderNum = cleanOrderNumber(fup.pedido || fup.id);
      const clientName = fup.cliente || 'Cliente';
      const existingIdx = isAlreadyInPosVendas(orderNum, clientName, fup.id);

      const clientMatch = findClientMatch(clientName, fup.whatsapp || fup.telefone);
      const clientPhone =
        fup.whatsapp ||
        fup.telefone ||
        clientMatch?.whatsapp ||
        '(11) 98765-4321';
      const clientType =
        fup.clientType ||
        clientMatch?.clientType ||
        'Cliente Final';
      const valor = Number(fup.valor) || 0;
      const vendedorNome = fup.vendedor || fup.consultoraName || fup.registeredBy || fup.criadoPor || 'Eder Perez';
      const vendedorId = fup.vendedorId || fup.responsavelId || getSellerIdForUser(vendedorNome);

      if (existingIdx === -1) {
        // Criar novo registro
        const newRecord: PosVendaItem = {
          id: `pv_orc_${fup.id}`,
          orderNumber: orderNum || `ORC-${fup.id}`,
          clientId: fup.clientId || clientMatch?.id,
          clientName: clientName,
          clientPhone: clientPhone,
          clientType: clientType as ClientType,
          projectDescription:
            fup.nomeOrcamento || fup.produto || 'Orçamento Aprovado',
          installerName: 'A Definir',
          completionDate:
            (fup.dataAtualizacao || fup.dataCadastro || defaultDateStr).split('T')[0],
          satisfactionRating: 0,
          status: 'Aguardando Entrega',
          formaRecebimento: 'Entrega',
          statusEntrega: 'Aguardando',
          precisaInstalador: 'Não',
          type: 'Contato de Satisfação',
          feedback: '',
          notes: `Origem: Follow-up Comercial (Vendido). Pedido #${orderNum || fup.id}.`,
          valor: valor,
          origem: 'followup',
          orcamentoId: fup.id,
          vendedor: vendedorNome,
          vendedorId: vendedorId,
          responsavel: vendedorNome,
          responsavelId: vendedorId,
          criadoPor: vendedorNome,
          criadoPorId: vendedorId,
          creatorId: vendedorId,
          createdAt: fup.dataCadastro || now.toISOString(),
          historico: [
            {
              id: `hist_${Date.now()}_1`,
              dataHora: now.toISOString(),
              usuario: vendedorNome,
              acao: 'Venda Importada',
              detalhes: 'Início do acompanhamento pós-venda (Aguardando Entrega).',
            },
          ],
        };
        currentPosVendas.unshift(newRecord);
        hasChanges = true;
      } else {
        // Atualiza campos de suporte se estiverem vazios, sem sobrescrever status/feedback
        const existing = currentPosVendas[existingIdx];
        let itemUpdated = false;
        if (!existing.clientType && clientType) {
          existing.clientType = clientType as ClientType;
          itemUpdated = true;
        }
        if ((!existing.valor || existing.valor === 0) && valor > 0) {
          existing.valor = valor;
          itemUpdated = true;
        }
        if (!existing.orcamentoId) {
          existing.orcamentoId = fup.id;
          itemUpdated = true;
        }
        if (!existing.vendedor && vendedorNome) {
          existing.vendedor = vendedorNome;
          itemUpdated = true;
        }
        if (!existing.vendedorId && vendedorId) {
          existing.vendedorId = vendedorId;
          existing.responsavelId = vendedorId;
          existing.criadoPorId = vendedorId;
          existing.creatorId = vendedorId;
          itemUpdated = true;
        }
        if (itemUpdated) hasChanges = true;
      }
    });

    // 4. Sincronizar METAS (VENDAS)
    let metasSales: any[] = [];
    const storedMetas = localStorage.getItem(METAS_SALES_STORAGE_KEY);
    if (storedMetas) {
      try {
        const parsed = JSON.parse(storedMetas);
        if (Array.isArray(parsed)) metasSales = parsed;
      } catch {}
    }

    metasSales.forEach((sale) => {
      const orderNum = cleanOrderNumber(sale.pedido);
      const clientName = sale.cliente || 'Cliente';
      const existingIdx = isAlreadyInPosVendas(orderNum, clientName, sale.orcamentoId, sale.id);

      const clientMatch = findClientMatch(clientName, sale.whatsapp);
      const clientPhone =
        sale.whatsapp ||
        clientMatch?.whatsapp ||
        '(11) 98765-4321';
      const clientType =
        sale.tipoCliente ||
        clientMatch?.clientType ||
        'Cliente Final';
      const valor = Number(sale.valor) || 0;
      const vendedorNome = sale.vendedor || sale.consultoraName || sale.registeredBy || 'Eder Perez';
      const vendedorId = sale.vendedorId || getSellerIdForUser(vendedorNome);

      if (existingIdx === -1) {
        // Criar novo registro
        const newRecord: PosVendaItem = {
          id: `pv_meta_${sale.id}`,
          orderNumber: orderNum || `PED-${sale.id}`,
          clientName: clientName,
          clientPhone: clientPhone,
          clientType: clientType as ClientType,
          projectDescription: `Venda Faturada - Pedido #${orderNum || sale.id}`,
          installerName: 'A Definir',
          completionDate: sale.data ? sale.data.split('T')[0] : defaultDateStr,
          satisfactionRating: 0,
          status: 'Aguardando Entrega',
          formaRecebimento: 'Entrega',
          statusEntrega: 'Aguardando',
          precisaInstalador: 'Não',
          type: 'Contato de Satisfação',
          feedback: '',
          notes: `Origem: Metas de Vendas. Pedido #${orderNum || sale.id}.`,
          valor: valor,
          origem: 'metas',
          orcamentoId: sale.orcamentoId,
          vendedor: vendedorNome,
          vendedorId: vendedorId,
          responsavel: vendedorNome,
          responsavelId: vendedorId,
          criadoPor: vendedorNome,
          criadoPorId: vendedorId,
          creatorId: vendedorId,
          createdAt: sale.data || now.toISOString(),
          historico: [
            {
              id: `hist_${Date.now()}_2`,
              dataHora: now.toISOString(),
              usuario: vendedorNome,
              acao: 'Venda Importada',
              detalhes: 'Início do acompanhamento pós-venda (Aguardando Entrega).',
            },
          ],
        };
        currentPosVendas.unshift(newRecord);
        hasChanges = true;
      } else {
        // Enriquecer dados se ausentes
        const existing = currentPosVendas[existingIdx];
        let itemUpdated = false;
        if (!existing.clientType && clientType) {
          existing.clientType = clientType as ClientType;
          itemUpdated = true;
        }
        if ((!existing.valor || existing.valor === 0) && valor > 0) {
          existing.valor = valor;
          itemUpdated = true;
        }
        if (!existing.clientPhone && clientPhone) {
          existing.clientPhone = clientPhone;
          itemUpdated = true;
        }
        if (!existing.vendedor && vendedorNome) {
          existing.vendedor = vendedorNome;
          itemUpdated = true;
        }
        if (!existing.vendedorId && vendedorId) {
          existing.vendedorId = vendedorId;
          existing.responsavelId = vendedorId;
          existing.criadoPorId = vendedorId;
          existing.creatorId = vendedorId;
          itemUpdated = true;
        }
        if (itemUpdated) hasChanges = true;
      }
    });

    // 5. Salvar de volta se houve adições ou enriquecimentos
    if (hasChanges) {
      localStorage.setItem(POS_VENDAS_STORAGE_KEY, JSON.stringify(currentPosVendas));
      window.dispatchEvent(new Event('fenix_pos_vendas_updated'));
    }

    return currentPosVendas;
  } catch (err) {
    console.error('Erro na sincronização do Pós-Vendas:', err);
    return [];
  }
}

/**
 * Adiciona ou atualiza uma venda diretamente no Pós-Vendas e dispara evento de atualização
 */
export function addOrUpdateSaleInPosVendas(sale: {
  id?: string;
  pedido: string;
  cliente: string;
  whatsapp?: string;
  valor?: number;
  tipoCliente?: string;
  data?: string;
  orcamentoId?: string;
  origem?: 'followup' | 'metas' | 'manual';
}) {
  try {
    const cleanNum = cleanOrderNumber(sale.pedido);
    let currentPosVendas: PosVendaItem[] = [];
    const stored = localStorage.getItem(POS_VENDAS_STORAGE_KEY);
    if (stored) {
      try {
        currentPosVendas = JSON.parse(stored);
      } catch {}
    }

    const normClient = normalizeText(sale.cliente);
    const existingIdx = currentPosVendas.findIndex((pv) => {
      const pvClean = cleanOrderNumber(pv.orderNumber);
      if (sale.orcamentoId && (pv.orcamentoId === sale.orcamentoId || pv.id === `pv_orc_${sale.orcamentoId}`)) {
        return true;
      }
      if (sale.id && pv.id === `pv_meta_${sale.id}`) {
        return true;
      }
      if (cleanNum && pvClean && cleanNum === pvClean) {
        return true;
      }
      return false;
    });

    const now = new Date();
    const dateStr = sale.data ? sale.data.split('T')[0] : now.toISOString().split('T')[0];

    if (existingIdx >= 0) {
      // Atualiza mantendo status e avaliações já feitas
      const existing = currentPosVendas[existingIdx];
      currentPosVendas[existingIdx] = {
        ...existing,
        orderNumber: cleanNum || existing.orderNumber,
        clientName: sale.cliente || existing.clientName,
        clientPhone: sale.whatsapp || existing.clientPhone,
        clientType: (sale.tipoCliente as ClientType) || existing.clientType,
        valor: sale.valor !== undefined ? sale.valor : existing.valor,
        orcamentoId: sale.orcamentoId || existing.orcamentoId,
        updatedAt: now.toISOString(),
      };
    } else {
      // Cria novo registro
      const newPv: PosVendaItem = {
        id: sale.orcamentoId ? `pv_orc_${sale.orcamentoId}` : `pv_meta_${sale.id || Date.now()}`,
        orderNumber: cleanNum || `PED-${Date.now()}`,
        clientName: sale.cliente.trim(),
        clientPhone: sale.whatsapp?.trim() || '(11) 98765-4321',
        clientType: (sale.tipoCliente as ClientType) || 'Cliente Final',
        projectDescription: `Venda Faturada - Pedido #${cleanNum}`,
        installerName: 'A Definir',
        completionDate: dateStr,
        satisfactionRating: 0,
        status: 'Aguardando Contato',
        type: 'Contato de Satisfação',
        feedback: '',
        valor: sale.valor || 0,
        origem: sale.origem || 'metas',
        orcamentoId: sale.orcamentoId,
        notes: `Cadastrado automaticamente via ${sale.origem === 'followup' ? 'Follow-up (Vendido)' : 'Metas (Venda)'}. Pedido #${cleanNum}.`,
        createdAt: now.toISOString(),
      };
      currentPosVendas.unshift(newPv);
    }

    localStorage.setItem(POS_VENDAS_STORAGE_KEY, JSON.stringify(currentPosVendas));
    window.dispatchEvent(new Event('fenix_pos_vendas_updated'));
  } catch (err) {
    console.error('Erro ao adicionar venda no Pós-Vendas:', err);
  }
}
