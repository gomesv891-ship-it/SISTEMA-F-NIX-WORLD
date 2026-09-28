import { FollowUpItem, FollowUpStatus, VendaGerencial } from '../types';
import { saveItemToSupabase, deleteItemFromSupabase, saveWholeCollectionToSupabase } from './supabaseClient';
import { calcularCustosVariaveis, calcularLucroEMargem } from './custosVariaveis';
import { findMatchingVendaIndex, deduplicateVendasList, syncSingleMetaSaleToVendas } from './vendasService';

export const METAS_SALES_STORAGE_KEY = 'fenix_metas_sales_db';
export const VENDAS_GERENCIAL_STORAGE_KEY = 'fenix_vendas_gerencial';
export const FOLLOWUP_STORAGE_KEY_V2 = 'fenix_followup_cards_v2';
export const FOLLOWUP_STORAGE_KEY_LEGACY = 'fenix_followup_db';

/**
 * Normaliza número do pedido removendo caracteres especiais
 */
export function extractCleanPedido(raw?: string | number): string {
  if (!raw) return '';
  return String(raw).trim().replace(/^#+/, '').replace(/\D/g, '') || String(raw).trim().replace(/^#+/, '');
}

/**
 * 1. FOLLOW-UP + META + VENDAS
 * Sincroniza a transição de status do Follow-up com a META do responsável e VENDAS do Diretor Éder.
 * - Se VENDIDO: Adiciona ou atualiza na META do responsável e em VENDAS do Diretor Éder.
 * - Se mudar de VENDIDO para qualquer outro status: remove automaticamente da META e das Vendas do Diretor.
 * - Impede duplicações usando o ID único do Follow-up / Orçamento / Pedido.
 */
export function syncFollowUpStatusWithMetasAndVendas(
  budget: FollowUpItem,
  newStatus: FollowUpStatus,
  currentUserName: string,
  extraData?: {
    pedido?: string;
    formasPagamento?: any[];
    formaPagamento?: string;
    parcelas?: string;
  }
): void {
  if (typeof window === 'undefined' || !budget || !budget.id) return;

  const cleanPedido = extractCleanPedido(extraData?.pedido || budget.pedido);
  const saleId = `v_orc_${budget.id}`;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const responsibleUser = (
    budget.responsavel ||
    budget.vendedor ||
    budget.criadoPor ||
    currentUserName ||
    'Vanessa Gomes'
  ).trim();

  const saleValue = Number(budget.valor) || 0;
  const clientName = (budget.cliente || 'Cliente').trim();
  const clientPhone = budget.telefone || (budget as any).clienteWhatsapp || (budget as any).clientPhone || (budget as any).whatsapp || '';
  const clientType = budget.clientType || 'Cliente Final';

  // Resgata frete, desconto e produtos vinculados ao orçamento original
  let freteVal = Number(budget.frete) || 0;
  let descontoVal = Number(budget.desconto) || 0;
  let orcProdutos: any[] | undefined = budget.produtos;
  try {
    if (!freteVal || !orcProdutos) {
      const rawOrcs = localStorage.getItem('fenix_orcamentos_history') || localStorage.getItem('fenix_saved_orcamentos');
      if (rawOrcs) {
        const list = JSON.parse(rawOrcs);
        if (Array.isArray(list)) {
          const match = list.find((o: any) => o && (o.id === budget.orcamentoId || o.id === budget.id || o.id === budget.id.replace('fup_', '')));
          if (match) {
            if (!freteVal && match.freteAtivo && match.freteValor) {
              freteVal = Number(match.freteValor) || 0;
            }
            if (!descontoVal && match.descontoValor) {
              descontoVal = Number(match.descontoValor) || 0;
            }
            if (!orcProdutos && Array.isArray(match.items)) {
              orcProdutos = match.items.map((it: any) => ({
                id: it.id || `p_${Math.random()}`,
                nome: it.descricao || 'Produto',
                detalhe: it.subtitulo,
                unidade: it.unidade || 'un',
                quantidade: parseFloat(it.qtd) || 1,
                valorUnitario: Number(it.precoUnitario) || 0,
                subtotal: Number(it.total) || 0,
              }));
            }
          }
        }
      }
    }
  } catch {}

  // ----------------------------------------------------
  // CASO 1: MARCADO COMO VENDIDO -> ADICIONAR / ATUALIZAR
  // ----------------------------------------------------
  if (newStatus === 'Vendido') {
    // 1.1 Atualizar META DO RESPONSÁVEL
    try {
      const rawMetas = localStorage.getItem(METAS_SALES_STORAGE_KEY);
      let metasSales: any[] = rawMetas ? JSON.parse(rawMetas) : [];
      if (!Array.isArray(metasSales)) metasSales = [];

      const metaSaleRecord = {
        id: saleId,
        orcamentoId: budget.id,
        followUpId: budget.id,
        pedido: cleanPedido,
        valor: saleValue,
        frete: freteVal > 0 ? freteVal : undefined,
        desconto: descontoVal > 0 ? descontoVal : undefined,
        produtos: orcProdutos,
        cliente: clientName,
        clienteId: budget.clientId,
        whatsapp: clientPhone,
        tipoCliente: clientType,
        formaPagamento: extraData?.formaPagamento || budget.formaPagamento || 'Pix',
        formasPagamento: extraData?.formasPagamento || budget.formasPagamento || [],
        parcelas: extraData?.parcelas || budget.parcelas,
        data: dateStr,
        responsavel: responsibleUser,
        vendedor: responsibleUser,
        criadoPor: budget.criadoPor || currentUserName,
        registeredBy: currentUserName,
      };

      const existingIndex = metasSales.findIndex(
        (s: any) =>
          s.orcamentoId === budget.id ||
          s.followUpId === budget.id ||
          s.id === saleId ||
          (cleanPedido && s.pedido === cleanPedido && s.cliente?.trim().toLowerCase() === clientName.toLowerCase())
      );

      let updatedMetas: any[];
      if (existingIndex >= 0) {
        updatedMetas = [...metasSales];
        updatedMetas[existingIndex] = {
          ...updatedMetas[existingIndex],
          ...metaSaleRecord,
          id: metasSales[existingIndex].id || saleId,
        };
      } else {
        updatedMetas = [metaSaleRecord, ...metasSales];
      }

      localStorage.setItem(METAS_SALES_STORAGE_KEY, JSON.stringify(updatedMetas));
      saveWholeCollectionToSupabase(METAS_SALES_STORAGE_KEY, updatedMetas, currentUserName).catch(() => {});
      syncSingleMetaSaleToVendas(metaSaleRecord, currentUserName).catch(() => {});
      window.dispatchEvent(new Event('fenix_metas_updated'));
    } catch (err) {
      console.error('Erro ao sincronizar venda na Meta:', err);
    }

    // 1.2 Atualizar VENDAS DO DIRETOR ÉDER
    try {
      const rawVendas = localStorage.getItem(VENDAS_GERENCIAL_STORAGE_KEY);
      let gerencialSales: VendaGerencial[] = rawVendas ? JSON.parse(rawVendas) : [];
      if (!Array.isArray(gerencialSales)) gerencialSales = [];

      const custoProdutos = Number((saleValue * 0.6).toFixed(2));
      const { totalGeral: custosAdic } = calcularCustosVariaveis(saleValue);
      const { lucro, margem } = calcularLucroEMargem(saleValue, custoProdutos, custosAdic);

      const vendaGerencialRecord: VendaGerencial = {
        id: `vnd-fup-${budget.id}`,
        numeroPedido: cleanPedido || String(budget.id).replace(/\D/g, '').slice(-4),
        data: dateStr,
        cliente: clientName,
        clienteId: budget.clientId,
        tipoCliente: clientType,
        vendedor: responsibleUser,
        valorVenda: saleValue,
        frete: freteVal > 0 ? freteVal : undefined,
        desconto: descontoVal > 0 ? descontoVal : undefined,
        custoProdutos,
        custosAdicionais: custosAdic,
        lucro,
        margem,
        statusPedido: 'Concluída',
        observacoes: `Venda confirmada no Follow-up Comercial por ${responsibleUser}.`,
        itensResumo: budget.produto || budget.nomeOrcamento || 'Piso Vinílico e Acessórios Fênix',
        metaId: saleId,
        followUpId: budget.id,
        orcamentoId: budget.id,
        createdAt: now.toISOString(),
        criadoPor: currentUserName,
      };

      const existingIndex = findMatchingVendaIndex(gerencialSales, {
        id: `vnd-fup-${budget.id}`,
        followUpId: budget.id,
        orcamentoId: budget.id,
        pedido: cleanPedido,
        numeroPedido: cleanPedido,
        cliente: clientName,
        data: dateStr,
        responsavel: responsibleUser,
        vendedor: responsibleUser,
        valor: saleValue,
        valorVenda: saleValue,
        metaId: saleId,
      });

      let updatedVendas: VendaGerencial[];
      if (existingIndex >= 0) {
        updatedVendas = [...gerencialSales];
        updatedVendas[existingIndex] = {
          ...updatedVendas[existingIndex],
          ...vendaGerencialRecord,
          id: gerencialSales[existingIndex].id || vendaGerencialRecord.id,
          metaId: gerencialSales[existingIndex].metaId || saleId,
          followUpId: budget.id,
          orcamentoId: gerencialSales[existingIndex].orcamentoId || budget.id,
        };
      } else {
        updatedVendas = [vendaGerencialRecord, ...gerencialSales];
      }
      updatedVendas = deduplicateVendasList(updatedVendas);

      localStorage.setItem(VENDAS_GERENCIAL_STORAGE_KEY, JSON.stringify(updatedVendas));
      saveWholeCollectionToSupabase(VENDAS_GERENCIAL_STORAGE_KEY, updatedVendas, currentUserName).catch(() => {});
      window.dispatchEvent(new Event('fenix_vendas_gerencial_updated'));
      window.dispatchEvent(new Event('fenix_vendas_updated'));
    } catch (err) {
      console.error('Erro ao sincronizar Vendas do Diretor:', err);
    }
  } else {
    // ---------------------------------------------------------------------------------
    // CASO 2: STATUS MUDOU DE VENDIDO PARA OUTRO -> REMOVER DA META E DE VENDAS DO DIRETOR
    // ---------------------------------------------------------------------------------
    // 2.1 Remover da META
    try {
      const rawMetas = localStorage.getItem(METAS_SALES_STORAGE_KEY);
      if (rawMetas) {
        const metasSales: any[] = JSON.parse(rawMetas);
        if (Array.isArray(metasSales)) {
          const filtered = metasSales.filter(
            (s: any) =>
              s.orcamentoId !== budget.id &&
              s.followUpId !== budget.id &&
              s.id !== saleId &&
              !(cleanPedido && s.pedido === cleanPedido && s.cliente?.trim().toLowerCase() === clientName.toLowerCase())
          );
          const removedSale = metasSales.find(
            (s: any) =>
              s.orcamentoId === budget.id ||
              s.followUpId === budget.id ||
              s.id === saleId ||
              (cleanPedido && s.pedido === cleanPedido && s.cliente?.trim().toLowerCase() === clientName.toLowerCase())
          );
          if (filtered.length !== metasSales.length) {
            localStorage.setItem(METAS_SALES_STORAGE_KEY, JSON.stringify(filtered));
            if (removedSale?.id) {
              deleteItemFromSupabase(METAS_SALES_STORAGE_KEY, removedSale.id, 'id', currentUserName).catch(() => {});
            }
            window.dispatchEvent(new Event('fenix_metas_updated'));
          }
        }
      }
    } catch (err) {
      console.error('Erro ao remover da Meta:', err);
    }

    // 2.2 Remover das VENDAS DO DIRETOR ÉDER
    try {
      const rawVendas = localStorage.getItem(VENDAS_GERENCIAL_STORAGE_KEY);
      if (rawVendas) {
        const gerencialSales: VendaGerencial[] = JSON.parse(rawVendas);
        if (Array.isArray(gerencialSales)) {
          const removedVenda = gerencialSales.find(
            (v) =>
              v.orcamentoId === budget.id ||
              (v as any).followUpId === budget.id ||
              v.metaId === saleId ||
              v.id === `vnd-fup-${budget.id}` ||
              (cleanPedido && v.numeroPedido === cleanPedido && v.cliente?.trim().toLowerCase() === clientName.toLowerCase())
          );
          const filtered = gerencialSales.filter(
            (v) =>
              v.orcamentoId !== budget.id &&
              (v as any).followUpId !== budget.id &&
              v.metaId !== saleId &&
              v.id !== `vnd-fup-${budget.id}` &&
              !(cleanPedido && v.numeroPedido === cleanPedido && v.cliente?.trim().toLowerCase() === clientName.toLowerCase())
          );
          if (filtered.length !== gerencialSales.length) {
            localStorage.setItem(VENDAS_GERENCIAL_STORAGE_KEY, JSON.stringify(filtered));
            if (removedVenda?.id) {
              deleteItemFromSupabase(VENDAS_GERENCIAL_STORAGE_KEY, removedVenda.id, 'id', currentUserName).catch(() => {});
            }
            window.dispatchEvent(new Event('fenix_vendas_updated'));
          }
        }
      }
    } catch (err) {
      console.error('Erro ao remover das Vendas do Diretor:', err);
    }
  }

  // Se VENDIDO ou PERDIDO, limpa alertas periódicos
  if (newStatus === 'Vendido' || newStatus === 'Perdido') {
    try {
      localStorage.removeItem(`fenix_fup_alerted_2dias_${budget.id}`);
    } catch {}
  }
}

/**
 * 1.3 Se uma venda for excluída da META:
 * - Follow-up correspondente vira PERDIDO automaticamente.
 * - Também é removido das Vendas do Diretor Éder.
 */
export function onMetaSaleDeleted(
  deletedSale: {
    id: string;
    orcamentoId?: string;
    followUpId?: string;
    pedido?: string;
    cliente?: string;
  },
  currentUserName: string = 'Vanessa Gomes'
): { followUpUpdated: boolean; vendasUpdated: boolean } {
  if (typeof window === 'undefined' || !deletedSale) {
    return { followUpUpdated: false, vendasUpdated: false };
  }

  let followUpUpdated = false;
  let vendasUpdated = false;

  const targetId = deletedSale.orcamentoId || deletedSale.followUpId || deletedSale.id;
  const targetPedido = extractCleanPedido(deletedSale.pedido);
  const targetClient = (deletedSale.cliente || '').trim().toLowerCase();

  // 1. ATUALIZAR FOLLOW-UP PARA 'PERDIDO'
  const updateFollowUpToPerdido = (key: string): boolean => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const list: FollowUpItem[] = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return false;

      let changed = false;
      const now = new Date();
      const dia = String(now.getDate()).padStart(2, '0');
      const mes = String(now.getMonth() + 1).padStart(2, '0');
      const ano = now.getFullYear();
      const hora = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      const updatedList = list.map((item) => {
        const itemCleanPed = extractCleanPedido(item.pedido);
        const itemClient = (item.cliente || '').trim().toLowerCase();

        const isMatch =
          item.id === targetId ||
          item.id === deletedSale.orcamentoId ||
          item.id === deletedSale.followUpId ||
          (targetPedido && itemCleanPed && itemCleanPed === targetPedido && (!targetClient || itemClient === targetClient));

        if (isMatch) {
          changed = true;
          // Adiciona histórico de alteração para Perdido
          const newEntry = {
            id: `h_del_${Date.now()}`,
            data: `${dia}/${mes}/${ano}`,
            hora: `${hora}:${min}`,
            statusAnterior: item.status,
            novoStatus: 'Perdido' as FollowUpStatus,
            observacao: `Venda #${item.pedido || targetPedido} excluída da Meta por ${currentUserName}. Status do Follow-up alterado automaticamente para Perdido.`,
            usuario: currentUserName,
            timestamp: now.getTime(),
          };

          return {
            ...item,
            status: 'Perdido' as FollowUpStatus,
            lembretesAtivos: false,
            dataAtualizacao: now.toISOString(),
            historico: [newEntry, ...(item.historico || [])],
          };
        }
        return item;
      });

      if (changed) {
        localStorage.setItem(key, JSON.stringify(updatedList));
        const targetPerdidoItem = updatedList.find(it => it.id === targetId || (targetPedido && extractCleanPedido(it.pedido) === targetPedido));
        if (targetPerdidoItem) {
          saveItemToSupabase(key, targetPerdidoItem, 'id', currentUserName).catch(() => {});
        }
        return true;
      }
    } catch (err) {
      console.warn(`Erro ao atualizar Follow-up para Perdido [${key}]:`, err);
    }
    return false;
  };

  const fupV2 = updateFollowUpToPerdido(FOLLOWUP_STORAGE_KEY_V2);
  const fupLeg = updateFollowUpToPerdido(FOLLOWUP_STORAGE_KEY_LEGACY);
  if (fupV2 || fupLeg) {
    followUpUpdated = true;
    window.dispatchEvent(new Event('fenix_followup_updated'));
  }

  // 2. REMOVER DAS VENDAS DO DIRETOR ÉDER
  try {
    const rawVendas = localStorage.getItem(VENDAS_GERENCIAL_STORAGE_KEY);
    if (rawVendas) {
      const gerencialSales: VendaGerencial[] = JSON.parse(rawVendas);
      if (Array.isArray(gerencialSales)) {
        const filtered = gerencialSales.filter((v) => {
          const vCleanPed = extractCleanPedido(v.numeroPedido);
          const vClient = (v.cliente || '').trim().toLowerCase();

          const isMatch =
            v.metaId === deletedSale.id ||
            v.id === `vnd-meta-${deletedSale.id}` ||
            v.id === `vnd-fup-${targetId}` ||
            v.orcamentoId === targetId ||
            (targetPedido && vCleanPed && vCleanPed === targetPedido && (!targetClient || vClient === targetClient));

          return !isMatch;
        });

        if (filtered.length !== gerencialSales.length) {
          localStorage.setItem(VENDAS_GERENCIAL_STORAGE_KEY, JSON.stringify(filtered));
          const removedItem = gerencialSales.find(v => {
            const vCleanPed = extractCleanPedido(v.numeroPedido);
            const vClient = (v.cliente || '').trim().toLowerCase();
            return (
              v.metaId === deletedSale.id ||
              v.id === `vnd-meta-${deletedSale.id}` ||
              v.id === `vnd-fup-${targetId}` ||
              v.orcamentoId === targetId ||
              (targetPedido && vCleanPed && vCleanPed === targetPedido && (!targetClient || vClient === targetClient))
            );
          });
          if (removedItem?.id) {
            deleteItemFromSupabase(VENDAS_GERENCIAL_STORAGE_KEY, removedItem.id, 'id', currentUserName).catch(() => {});
          }
          vendasUpdated = true;
          window.dispatchEvent(new Event('fenix_vendas_updated'));
        }
      }
    }
  } catch (err) {
    console.error('Erro ao remover das Vendas do Diretor:', err);
  }

  return { followUpUpdated, vendasUpdated };
}
