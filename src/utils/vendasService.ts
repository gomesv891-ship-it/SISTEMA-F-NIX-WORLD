import { VendaGerencial, VendaItemProduto, VendaHistoricoEntry, TipoCustoVenda, VendaCustoItem, ClientRecord } from "../types";
import { getSupabaseClient, saveWholeCollectionToSupabase, dispatchCollectionEvents } from "./supabaseClient";
import { calcularCustosVariaveis, getCustosVariaveis } from "./custosVariaveis";

export const VENDAS_GERENCIAL_KEY = "fenix_vendas_gerencial";
export const DELETED_VENDAS_KEY = "fenix_deleted_vendas_ids";

export function getDeletedVendasIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_VENDAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export async function addDeletedVendaId(id: string, usuario: string) {
  try {
    const set = getDeletedVendasIds();
    set.add(id);
    const arr = Array.from(set);
    localStorage.setItem(DELETED_VENDAS_KEY, JSON.stringify(arr));
    await saveWholeCollectionToSupabase(DELETED_VENDAS_KEY, arr, usuario);
  } catch {}
}

export function normalizarTipoCliente(tipo?: string): string {
  if (!tipo || !tipo.trim()) return 'Cliente Final';
  return tipo.trim();
}

export function extrairNumeroPuroPedido(raw: string | number): string {
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  const digitsOnly = s.replace(/\D/g, '');
  if (digitsOnly.length > 0) {
    const withoutLeadingZeros = digitsOnly.replace(/^0+/, '');
    return withoutLeadingZeros || digitsOnly;
  }
  return s.replace(/^#+/, '').replace(/^pedido\s*/i, '').trim();
}

export function getTaxasConfiguradasDiretor(): {
  taxaNotaFiscalPercent: number;
  taxaMaquininhaPercent: number;
} {
  const custosVar = getCustosVariaveis();
  let nf = 0;
  let maq = 0;
  custosVar.forEach((c) => {
    if (!c.ativo) return;
    const nomeNorm = c.nome.toLowerCase();
    if (nomeNorm.includes('nota') || nomeNorm.includes('fiscal') || nomeNorm.includes('imposto') || nomeNorm.includes('nf') || nomeNorm.includes('tribut')) {
      if (c.tipo === 'porcentagem' && c.valor > 0) nf = c.valor;
    }
    if (nomeNorm.includes('maquininha') || nomeNorm.includes('cartão') || nomeNorm.includes('cartao') || nomeNorm.includes('taxa de pagamento') || nomeNorm.includes('maquina')) {
      if (c.tipo === 'porcentagem' && c.valor > 0) maq = c.valor;
    }
  });
  return {
    taxaNotaFiscalPercent: nf,
    taxaMaquininhaPercent: maq,
  };
}

export function gerarCustosItensIniciais(
  valorVenda: number,
  custoProdutos: number,
  desconto: number = 0,
  frete: number = 0,
  formaPagamento: string = 'Pix'
): VendaCustoItem[] {
  const { taxaNotaFiscalPercent, taxaMaquininhaPercent } = getTaxasConfiguradasDiretor();
  const itens: VendaCustoItem[] = [];

  // 1. Produto
  itens.push({
    id: `custo-prod-${Date.now()}-1`,
    tipo: 'Produto',
    descricao: 'Custo de Fabricação / Aquisição dos Produtos',
    valor: Number(custoProdutos) || 0,
  });

  // 2. Nota Fiscal (se houver alíquota configurada pela diretoria)
  const valorNF = taxaNotaFiscalPercent > 0 ? Number(((valorVenda * taxaNotaFiscalPercent) / 100).toFixed(2)) : 0;
  if (valorNF > 0) {
    itens.push({
      id: `custo-nf-${Date.now()}-2`,
      tipo: 'Nota Fiscal',
      descricao: `Impostos s/ NF (${taxaNotaFiscalPercent}%)`,
      valor: valorNF,
    });
  }

  // 3. Taxa de Pagamento (se a forma de pagamento for cartão ou houver taxa de maquininha)
  const isCartao = formaPagamento.toLowerCase().includes('cart') || formaPagamento.toLowerCase().includes('crédito') || formaPagamento.toLowerCase().includes('debito');
  const valorMaq = (isCartao && taxaMaquininhaPercent > 0)
    ? Number(((valorVenda * taxaMaquininhaPercent) / 100).toFixed(2))
    : 0;
  if (valorMaq > 0) {
    itens.push({
      id: `custo-pag-${Date.now()}-3`,
      tipo: 'Taxa de Pagamento',
      descricao: `Taxa Maquininha (${taxaMaquininhaPercent}%)`,
      valor: valorMaq,
    });
  }

  // 4. Frete
  if (frete > 0) {
    itens.push({
      id: `custo-frete-${Date.now()}-4`,
      tipo: 'Frete',
      descricao: 'Frete / Logística de Entrega',
      valor: Number(frete),
    });
  }

  // 5. Desconto concedido
  if (desconto > 0) {
    itens.push({
      id: `custo-desc-${Date.now()}-5`,
      tipo: 'Desconto',
      descricao: 'Desconto Comercial Concedido',
      valor: Number(desconto),
    });
  }

  return itens;
}

export function recalcularCustosELucro(valorVenda: number, custosItens: VendaCustoItem[]): {
  custoTotal: number;
  custoProdutos: number;
  custosAdicionais: number;
  lucro: number;
  margem: number;
} {
  const vVenda = Number(valorVenda) || 0;
  let custoProdutos = 0;
  let custosAdicionais = 0;

  custosItens.forEach((c) => {
    const val = Number(c.valor) || 0;
    if (c.tipo === 'Produto') {
      custoProdutos += val;
    } else {
      custosAdicionais += val;
    }
  });

  const custoTotal = Number((custoProdutos + custosAdicionais).toFixed(2));
  const lucro = Number((vVenda - custoTotal).toFixed(2));
  const margem = vVenda > 0 ? Number(((lucro / vVenda) * 100).toFixed(1)) : 0;

  return {
    custoTotal,
    custoProdutos: Number(custoProdutos.toFixed(2)),
    custosAdicionais: Number(custosAdicionais.toFixed(2)),
    lucro,
    margem,
  };
}

export function calcularLucroEMargem(valorVenda: number, custoProdutos: number, custosAdicionais: number): {
  lucro: number;
  margem: number;
} {
  const vVenda = Number(valorVenda) || 0;
  const cProd = Number(custoProdutos) || 0;
  const cAdd = Number(custosAdicionais) || 0;

  const lucro = Number((vVenda - cProd - cAdd).toFixed(2));
  const margem = vVenda > 0 ? Number(((lucro / vVenda) * 100).toFixed(1)) : 0;

  return { lucro, margem };
}

/**
 * Lista inicial de vendas: rigorosamente vazia.
 * Não são criados registros fictícios ou de demonstração.
 * As vendas reais são originadas exclusivamente de Metas, Follow-up ("Vendido") e lançamentos reais do CRM.
 */
export const INITIAL_VENDAS: VendaGerencial[] = [];

/**
 * Identifica e bloqueia qualquer registro fictício, inventado ou de demonstração.
 */
export function isFictitiousVenda(item: any): boolean {
  if (!item) return true;
  const id = String(item.id || "").trim();

  // 1. IDs do mock legado do período visual demonstrativo (vnd-1001 a vnd-1028)
  if (/^vnd-10(0[1-9]|1[0-9]|2[0-8])$/.test(id)) return true;
  if (["v_1", "v_2", "v_3", "v_4", "v_5", "v_6"].includes(id)) return true;
  if (id.startsWith("mock-") || id.startsWith("demo-") || id.includes("fictic")) return true;

  // 2. Nomes de clientes fictícios/demonstrativos conhecidos
  const client = (item.cliente || item.clientName || "").toLowerCase().trim();
  const mockClients = [
    "casa & cia",
    "construtora alfa",
    "joão da silva",
    "residencial jardins",
    "arq. mariana alves",
    "instala mais",
    "bella casa acabamentos",
    "construtora golden",
    "patrícia mendes",
    "residencial boulevard",
    "arq. lucas fernandes",
    "top instalações",
    "pisos & decor matriz",
    "construtora aliança",
    "carla beatriz ribeiro",
    "edifício royal park",
    "studio vitta arq",
    "mega colas & pisos",
    "rede central pisos",
    "construtora vanguarda",
    "silvia helena castro",
    "roberto silva residência",
    "carvalho materiais & design",
    "construtora almeida & silva",
    "marcos vinicius instalações",
    "studio arqdesign interiores",
    "eng. renato prado projetos",
    "carlos eduardo",
    "mariana silva",
    "cliente comercial",
  ];

  if (mockClients.includes(client)) {
    const num = parseInt(String(item.numeroPedido || item.pedido || "").replace(/\D/g, ""), 10);
    if (num >= 1001 && num <= 1028 && !item.followUpId && !item.metaId) {
      return true;
    }
  }

  // 3. Notas conhecidas do mock legado
  const obs = String(item.observacoes || "").toLowerCase();
  if (
    obs.includes("mostruário de revenda") ||
    obs.includes("obra corporativa edifício horizonte") ||
    obs.includes("apartamento residencial 42b") ||
    obs.includes("cronograma da obra") ||
    obs.includes("consultório de psicologia") ||
    obs.includes("reparo salão de festas") ||
    obs.includes("teste de aderência")
  ) {
    const num = parseInt(String(item.numeroPedido || item.pedido || "").replace(/\D/g, ""), 10);
    if (num >= 1001 && num <= 1028) return true;
  }

  return false;
}

// Limpeza imediata no localStorage na inicialização para remover vendas fictícias legadas
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(VENDAS_GERENCIAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((v: any) => !isFictitiousVenda(v));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(cleaned));
        }
      }
    }
  } catch {}
}

/**
 * Consulta a tabela de produtos cadastrados para obter custos reais.
 */
function getCadastradoProductCost(productName: string): number | null {
  try {
    const raw = localStorage.getItem("fenix_product_items_data");
    if (!raw) return null;
    const products: any[] = JSON.parse(raw);
    if (!Array.isArray(products)) return null;

    const clean = productName.toLowerCase().trim();
    const match = products.find(
      (p) =>
        p.name &&
        (p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase()))
    );
    if (match && typeof match.custo === "number" && match.custo > 0) {
      return match.custo;
    }
  } catch {}
  return null;
}

export interface MatchingVendaQuery {
  id?: string;
  pedido?: string | number;
  numeroPedido?: string | number;
  cliente?: string;
  data?: string;
  responsavel?: string;
  vendedor?: string;
  valor?: number;
  valorVenda?: number;
  metaId?: string;
  followUpId?: string;
  orcamentoId?: string;
}

/**
 * Avalia se dois registros correspondem exatamente à MESMA VENDA FÍSICA/FISCAL.
 * Usado para reconhecer uma venda existente independente do caminho de entrada
 * (Metas, Follow-up ou Vendas), garantindo: UMA VENDA = UM ÚNICO REGISTRO.
 * 
 * Critérios:
 * → Pedido/ID
 * → Cliente
 * → Data
 * → Responsável
 * → Valor
 * → ID do Follow-up, quando existir.
 */
export function isSameVenda(v: VendaGerencial, query: MatchingVendaQuery): boolean {
  if (!v || !query) return false;

  // 1. Identificadores explícitos de vínculo (Follow-up ID, Meta ID, Orçamento ID, ID)
  if (query.followUpId) {
    if (v.followUpId === query.followUpId || v.id === query.followUpId || v.id === `vnd-fup-${query.followUpId}` || v.id === `v_orc_${query.followUpId}`) {
      return true;
    }
  }
  if (query.metaId) {
    if (v.metaId === query.metaId || v.id === query.metaId || v.id === `vnd-meta-${query.metaId}` || v.id === `v_${query.metaId}` || v.id === `v_venda_${query.metaId}`) {
      return true;
    }
  }
  if (query.orcamentoId) {
    if (v.orcamentoId === query.orcamentoId || v.id === query.orcamentoId || v.id === `v_orc_${query.orcamentoId}`) {
      return true;
    }
  }

  if (query.id) {
    if (v.id === query.id || v.metaId === query.id || v.followUpId === query.id || v.orcamentoId === query.id) return true;
    if (v.id === `vnd-fup-${query.id}` || v.id === `vnd-meta-${query.id}` || v.id === `v_orc_${query.id}` || v.id === `v_${query.id}` || v.id === `v_venda_${query.id}`) return true;
    if (v.followUpId && (query.id === `vnd-fup-${v.followUpId}` || query.id === `v_orc_${v.followUpId}` || query.id === v.followUpId)) return true;
    if (v.metaId && (query.id === `vnd-meta-${v.metaId}` || query.id === `v_${v.metaId}` || query.id === `v_venda_${v.metaId}` || query.id === v.metaId)) return true;
  }

  // 2. Pedido puro (número oficial do pedido sem prefixos e sem zeros à esquerda)
  const qPuro = extrairNumeroPuroPedido(query.numeroPedido || query.pedido || query.id);
  const vPuro = extrairNumeroPuroPedido(v.numeroPedido);
  if (qPuro && vPuro && qPuro === vPuro) return true;

  // 3. Multi-critérios: Cliente + Data + Responsável + Valor
  const normClientQ = (query.cliente || '').trim().toLowerCase();
  const normClientV = (v.cliente || '').trim().toLowerCase();
  const isClientValid = normClientQ.length >= 3 && normClientV.length >= 3 && normClientQ !== 'cliente' && normClientV !== 'cliente';
  const clientMatches = isClientValid && (normClientQ === normClientV || normClientQ.includes(normClientV) || normClientV.includes(normClientQ));

  const valQ = Number(query.valor || query.valorVenda || 0);
  const valV = Number(v.valorVenda || 0);
  const valMatches = valQ > 0 && valV > 0 && Math.abs(valQ - valV) <= 0.05;

  const dateQ = (query.data || '').split('T')[0];
  const dateV = (v.data || '').split('T')[0];
  const dateMatches = Boolean(dateQ && dateV && dateQ === dateV);

  const sellerQ = normalizeSellerName(query.responsavel || query.vendedor);
  const sellerV = normalizeSellerName(v.vendedor || v.criadoPor);
  const sellerMatches = Boolean(sellerQ && sellerV && sellerQ === sellerV);

  // Se tem mesmo cliente, mesmo valor e mesma data -> mesma venda física
  if (clientMatches && valMatches && dateMatches) return true;

  // Se tem mesmo cliente, mesmo valor e mesmo vendedor -> mesma venda física
  if (clientMatches && valMatches && sellerMatches) return true;

  // Se tem mesmo cliente e mesmo número de pedido (mesmo que com formatação variada)
  if (clientMatches && qPuro && vPuro && (qPuro === vPuro || qPuro.endsWith(vPuro) || vPuro.endsWith(qPuro))) return true;

  return false;
}

/**
 * Localiza o índice de uma venda correspondente na lista,
 * identificando por Pedido/ID, Cliente, Data, Responsável, Valor e ID do Follow-up.
 */
export function findMatchingVendaIndex(
  list: VendaGerencial[],
  query: MatchingVendaQuery
): number {
  return list.findIndex((v) => isSameVenda(v, query));
}

/**
 * Deduplica uma lista de vendas garantindo rigorosamente que:
 * UMA VENDA = UM ÚNICO REGISTRO.
 * Não duplica vendas entre Metas, Follow-up e Vendas, reconhecendo a venda existente
 * e apenas vinculando/atualizando seus campos.
 */
export function deduplicateVendasList(vendas: VendaGerencial[]): VendaGerencial[] {
  const result: VendaGerencial[] = [];

  for (const v of vendas) {
    if (isFictitiousVenda(v)) continue;

    const existingIndex = result.findIndex((existing) =>
      isSameVenda(existing, {
        id: v.id,
        pedido: v.numeroPedido,
        numeroPedido: v.numeroPedido,
        cliente: v.cliente,
        data: v.data,
        responsavel: v.vendedor,
        vendedor: v.vendedor,
        valor: v.valorVenda,
        valorVenda: v.valorVenda,
        metaId: v.metaId,
        followUpId: v.followUpId,
        orcamentoId: v.orcamentoId,
      })
    );

    if (existingIndex < 0) {
      result.push({ ...v });
    } else {
      const existing = result[existingIndex];
      const existingHasCustomCosts = Boolean(existing.custosItens && existing.custosItens.length > 0);
      const vHasCustomCosts = Boolean(v.custosItens && v.custosItens.length > 0);

      // Escolhe o melhor número de pedido (o que for número real/não-genérico)
      const cleanNum = (existing.numeroPedido && !existing.numeroPedido.startsWith('vnd-'))
        ? existing.numeroPedido
        : (v.numeroPedido || existing.numeroPedido);

      const merged: VendaGerencial = {
        ...existing,
        numeroPedido: cleanNum,
        cliente: (!existing.cliente || existing.cliente === 'Cliente') && v.cliente ? v.cliente : existing.cliente,
        vendedor: (!existing.vendedor || existing.vendedor === 'Vanessa Gomes') && v.vendedor ? v.vendedor : existing.vendedor,
        tipoCliente: v.tipoCliente && v.tipoCliente !== 'Cliente Final' ? v.tipoCliente : existing.tipoCliente,
        data: existing.data || v.data,
        canalMarketplace: existing.canalMarketplace || v.canalMarketplace,
        metaId: existing.metaId || v.metaId,
        followUpId: existing.followUpId || v.followUpId,
        orcamentoId: existing.orcamentoId || v.orcamentoId,
        valorVenda: existing.valorVenda > 0 ? existing.valorVenda : v.valorVenda,
        formaPagamento: existing.formaPagamento || v.formaPagamento,
        formasPagamento: existing.formasPagamento || v.formasPagamento,
        parcelas: existing.parcelas || v.parcelas,
        custoProdutos: existingHasCustomCosts
          ? existing.custoProdutos
          : vHasCustomCosts
          ? v.custoProdutos
          : (existing.custoProdutos || v.custoProdutos),
        custosAdicionais: existingHasCustomCosts
          ? existing.custosAdicionais
          : vHasCustomCosts
          ? v.custosAdicionais
          : (existing.custosAdicionais || v.custosAdicionais),
        custosItens: existingHasCustomCosts ? existing.custosItens : (vHasCustomCosts ? v.custosItens : undefined),
        lucro: existingHasCustomCosts ? existing.lucro : (vHasCustomCosts ? v.lucro : (existing.lucro || v.lucro)),
        margem: existingHasCustomCosts ? existing.margem : (vHasCustomCosts ? v.margem : (existing.margem || v.margem)),
        produtos: (existing.produtos && existing.produtos.length > 0) ? existing.produtos : v.produtos,
        itensResumo: existing.itensResumo || v.itensResumo,
        observacoes: existing.observacoes || v.observacoes,
        statusPedido: existing.statusPedido === 'Cancelada' ? 'Cancelada' : (v.statusPedido || existing.statusPedido || 'Concluída'),
        historico: [...(existing.historico || []), ...(v.historico || [])].filter(
          (h, i, arr) => arr.findIndex((x) => x.id === h.id || x.timestamp === h.timestamp) === i
        ),
      };

      result[existingIndex] = merged;
    }
  }

  return result;
}

export function normalizeSellerName(seller?: string): string {
  if (!seller) return 'Vanessa Gomes';
  const s = seller.trim().toLowerCase();
  if (s.includes('eder') || s.includes('éder')) return 'Éder Perez';
  if (s.includes('jhes') || s.includes('jess')) return 'Jhessica Camargo';
  if (s.includes('jef')) return 'Jeferson Trolesi';
  if (s.includes('vanessa')) return 'Vanessa Gomes';
  return seller.trim();
}

export function convertMetaProdutosToVendaProdutos(
  produtosRaw: any,
  valorVenda: number
): { produtosList: VendaItemProduto[]; custoProdutos: number; itensResumo: string } {
  const prods: VendaItemProduto[] = [];
  let custoProdutos = 0;

  if (Array.isArray(produtosRaw) && produtosRaw.length > 0) {
    produtosRaw.forEach((p: any, idx: number) => {
      const nome = (p.nome || p.produto || p.descricao || 'Piso Vinílico e Acessórios Fênix').trim();
      const qtd = Number(p.quantidade) || 1;
      const preco = Number(p.valorUnitario) || (qtd > 0 ? (Number(p.subtotal) || 0) / qtd : valorVenda);
      const total = Number(p.subtotal) || (qtd * preco);
      const regCost = getCadastradoProductCost(nome);
      const unitCost = regCost !== null ? regCost : Number((preco * 0.6).toFixed(2));
      const totalCost = Number((unitCost * qtd).toFixed(2));
      custoProdutos += totalCost;

      prods.push({
        id: p.id || `item-${idx}`,
        produto: nome,
        quantidade: `${qtd} ${p.unidade || 'un'}`,
        unidade: p.unidade || 'un',
        valorUnitario: preco,
        valorTotal: total,
        custoUnitario: unitCost,
        custoTotal: totalCost,
      });
    });
  }

  if (prods.length === 0) {
    custoProdutos = Number((valorVenda * 0.6).toFixed(2));
    prods.push({
      id: 'prod-1',
      produto: 'Piso Vinílico e Acessórios Fênix',
      quantidade: '1 un',
      unidade: 'un',
      valorUnitario: valorVenda,
      valorTotal: valorVenda,
      custoUnitario: custoProdutos,
      custoTotal: custoProdutos,
    });
  }

  const itensResumo = prods.map((p) => p.produto).join(', ');

  return {
    produtosList: prods,
    custoProdutos: Number(custoProdutos.toFixed(2)),
    itensResumo,
  };
}

/**
 * Sincroniza dinamicamente as vendas reais cadastradas pelos usuários na aba Metas
 * (Vanessa Gomes, Jhessica Camargo, Jeferson Trolesi e Éder Perez).
 * Exibe: Pedido, Data, Cliente, Tipo de Cliente, Forma de Pagamento, Produtos, Custos, Faturamento, Lucro, Margem e Status CONCLUÍDO.
 * Evita duplicações usando o número do pedido e preserva custos editados pelo Diretor Éder Perez.
 */
export function syncRealSalesFromMetas(
  currentVendas: VendaGerencial[],
  metasSalesParam?: any[]
): {
  mergedVendas: VendaGerencial[];
  hasChanges: boolean;
} {
  let metasSales: any[] = [];
  if (Array.isArray(metasSalesParam) && metasSalesParam.length > 0) {
    metasSales = metasSalesParam;
  } else {
    try {
      const raw = localStorage.getItem("fenix_metas_sales_db");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) metasSales = parsed;
      }
    } catch {}
  }

  if (metasSales.length === 0) {
    return { mergedVendas: currentVendas, hasChanges: false };
  }

  const merged = [...currentVendas];
  let hasChanges = false;
  const deletedSet = getDeletedVendasIds();

  metasSales.forEach((sale) => {
    if (isFictitiousVenda(sale)) return;

    const numPedido = String(sale.pedido || sale.id || "")
      .replace(/^[#A-Za-z_-]+/, "")
      .trim();
    const numPuro = extrairNumeroPuroPedido(numPedido);
    if (sale.id && (deletedSet.has(sale.id) || deletedSet.has(`v_${sale.id}`) || deletedSet.has(`vnd-meta-${sale.id}`))) return;
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return;

    const clientName = (sale.cliente || "Cliente").trim();
    const seller = normalizeSellerName(sale.vendedor || sale.responsavel || sale.criadoPor || sale.registeredBy);
    const clientType = normalizarTipoCliente(sale.tipoCliente);
    const saleValue = Number(sale.valor) || 0;
    const desconto = Number(sale.desconto) || 0;
    const frete = Number(sale.frete) || 0;

    if (saleValue <= 0 && !clientName) return;

    // Resumo de forma de pagamento
    let formaPagamento = 'Pix';
    if (typeof sale.formaPagamento === 'string' && sale.formaPagamento.trim()) {
      formaPagamento = sale.formaPagamento.trim();
    } else if (Array.isArray(sale.formasPagamento) && sale.formasPagamento.length > 0) {
      formaPagamento = sale.formasPagamento.map((p: any) => p.forma || 'Pix').join(' + ');
    }

    const { produtosList, custoProdutos: calcCustoProdutos, itensResumo } =
      convertMetaProdutosToVendaProdutos(sale.produtos, saleValue);

    const { totalGeral: custosAdic } = calcularCustosVariaveis(saleValue);
    const { lucro, margem } = calcularLucroEMargem(saleValue, calcCustoProdutos, custosAdic);

    // Localiza pelo número do pedido, IDs ou dados da venda
    const existingIndex = findMatchingVendaIndex(merged, {
      id: sale.id,
      pedido: numPedido,
      numeroPedido: numPedido,
      cliente: clientName,
      data: sale.data,
      responsavel: seller,
      vendedor: seller,
      valor: saleValue,
      valorVenda: saleValue,
      metaId: sale.id,
      orcamentoId: sale.orcamentoId,
    });

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      const hasCustomCosts = Boolean(existing.custosItens && existing.custosItens.length > 0);

      const needsUpdate =
        existing.cliente !== clientName ||
        existing.valorVenda !== saleValue ||
        existing.vendedor !== seller ||
        existing.tipoCliente !== clientType ||
        existing.formaPagamento !== formaPagamento ||
        existing.data !== (sale.data || existing.data) ||
        !existing.metaId ||
        existing.desconto !== desconto ||
        existing.frete !== frete ||
        (!existing.produtos && produtosList.length > 0);

      if (needsUpdate) {
        merged[existingIndex] = {
          ...existing,
          cliente: clientName,
          vendedor: seller,
          tipoCliente: clientType,
          metaId: existing.metaId || sale.id,
          orcamentoId: existing.orcamentoId || sale.orcamentoId,
          valorVenda: saleValue,
          desconto: desconto > 0 ? desconto : existing.desconto,
          frete: frete > 0 ? frete : existing.frete,
          formaPagamento: formaPagamento || existing.formaPagamento,
          formasPagamento: sale.formasPagamento || existing.formasPagamento,
          data: sale.data || existing.data,
          statusPedido: existing.statusPedido === 'Cancelada' ? 'Cancelada' : 'Concluída',
          produtos: (produtosList.length > 0 && (!existing.produtos || existing.produtos.length === 0))
            ? produtosList
            : existing.produtos || produtosList,
          itensResumo: itensResumo || existing.itensResumo,
          custoProdutos: hasCustomCosts ? existing.custoProdutos : calcCustoProdutos,
          custosAdicionais: hasCustomCosts ? existing.custosAdicionais : custosAdic,
          custoTotal: hasCustomCosts ? existing.custoTotal : Number((calcCustoProdutos + custosAdic).toFixed(2)),
          lucro: hasCustomCosts ? existing.lucro : lucro,
          margem: hasCustomCosts ? existing.margem : margem,
        };
        hasChanges = true;
      }
    } else {
      const newVenda: VendaGerencial = {
        id: `vnd-meta-${sale.id || Date.now()}`,
        numeroPedido: numPedido || String(Math.floor(1000 + Math.random() * 9000)),
        data: sale.data || new Date().toISOString().split("T")[0],
        cliente: clientName,
        tipoCliente: clientType,
        vendedor: seller,
        valorVenda: saleValue,
        desconto: desconto > 0 ? desconto : undefined,
        frete: frete > 0 ? frete : undefined,
        formaPagamento,
        formasPagamento: sale.formasPagamento || undefined,
        custoProdutos: calcCustoProdutos,
        custosAdicionais: custosAdic,
        custoTotal: Number((calcCustoProdutos + custosAdic).toFixed(2)),
        lucro,
        margem,
        statusPedido: "Concluída",
        observacoes: `Venda concluída registrada em Metas por ${seller}.`,
        itensResumo,
        produtos: produtosList,
        metaId: sale.id,
        orcamentoId: sale.orcamentoId,
        createdAt: sale.data ? new Date(sale.data).toISOString() : new Date().toISOString(),
        criadoPor: sale.criadoPor || seller,
      };

      merged.unshift(newVenda);
      hasChanges = true;
    }
  });

  return { mergedVendas: merged, hasChanges };
}

/**
 * Sincroniza imediatamente uma venda única de Metas para a coleção de Vendas do Diretor.
 */
export async function syncSingleMetaSaleToVendas(sale: any, usuario: string): Promise<void> {
  if (!sale || isFictitiousVenda(sale)) return;
  try {
    const raw = localStorage.getItem(VENDAS_GERENCIAL_KEY);
    let currentVendas: VendaGerencial[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(currentVendas)) currentVendas = [];

    const { mergedVendas, hasChanges } = syncRealSalesFromMetas(currentVendas, [sale]);
    if (hasChanges) {
      const deduplicated = deduplicateVendasList(mergedVendas);
      localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(deduplicated));
      await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, deduplicated, usuario);
      window.dispatchEvent(new Event('fenix_vendas_gerencial_updated'));
      window.dispatchEvent(new Event('fenix_vendas_updated'));
    }
  } catch (err) {
    console.error('Erro ao sincronizar venda individual de Metas para Vendas:', err);
  }
}

/**
 * Remove imediatamente uma venda de Metas da coleção de Vendas do Diretor.
 */
export async function removeMetaSaleFromVendas(saleId: string, pedido: string, usuario: string): Promise<void> {
  try {
    const numPuro = extrairNumeroPuroPedido(pedido);
    if (saleId) await addDeletedVendaId(saleId, usuario);
    if (numPuro) await addDeletedVendaId(numPuro, usuario);

    const raw = localStorage.getItem(VENDAS_GERENCIAL_KEY);
    if (!raw) return;
    const currentVendas: VendaGerencial[] = JSON.parse(raw);
    if (!Array.isArray(currentVendas)) return;

    const filtered = currentVendas.filter((v) => {
      if (v.metaId === saleId || v.id === `vnd-meta-${saleId}` || v.id === saleId || v.id === `v_${saleId}`) return false;
      const vPuro = extrairNumeroPuroPedido(v.numeroPedido);
      if (numPuro && vPuro && numPuro === vPuro) return false;
      return true;
    });

    if (filtered.length !== currentVendas.length) {
      localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(filtered));
      await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, filtered, usuario);
      window.dispatchEvent(new Event('fenix_vendas_gerencial_updated'));
      window.dispatchEvent(new Event('fenix_vendas_updated'));
    }
  } catch (err) {
    console.error('Erro ao remover venda de Metas das Vendas:', err);
  }
}

/**
 * Sincroniza dinamicamente as vendas reais a partir dos registros do Follow-up com status "Vendido"
 * (Vanessa, Jhessica e Éder).
 * Usa o número do Pedido para identificar e atualizar o registro existente, sem duplicar.
 */
export function syncRealSalesFromFollowUp(currentVendas: VendaGerencial[]): {
  mergedVendas: VendaGerencial[];
  hasChanges: boolean;
} {
  let followupItems: any[] = [];
  try {
    const raw1 = localStorage.getItem("fenix_followup_cards_v2");
    const raw2 = localStorage.getItem("fenix_followup_db");
    if (raw1) {
      const p1 = JSON.parse(raw1);
      if (Array.isArray(p1)) followupItems.push(...p1);
    }
    if (raw2) {
      const p2 = JSON.parse(raw2);
      if (Array.isArray(p2)) followupItems.push(...p2);
    }
  } catch {}

  if (followupItems.length === 0) {
    return { mergedVendas: currentVendas, hasChanges: false };
  }

  let orcamentosHistory: any[] = [];
  try {
    const rawOrc = localStorage.getItem("fenix_orcamentos_history") || localStorage.getItem("fenix_saved_orcamentos");
    if (rawOrc) {
      const p = JSON.parse(rawOrc);
      if (Array.isArray(p)) orcamentosHistory = p;
    }
  } catch {}

  const merged = [...currentVendas];
  let hasChanges = false;

  followupItems.forEach((fup) => {
    const st = (fup.status || "").trim().toLowerCase();
    if (st !== "vendido") return;
    if (isFictitiousVenda(fup)) return;

    const numPedido = String(fup.pedido || fup.numero || fup.id || "")
      .replace(/^[#A-Za-z_-]+/, "")
      .trim();
    if (!numPedido) return;

    const numPuro = extrairNumeroPuroPedido(numPedido);
    const deletedSet = getDeletedVendasIds();
    if (fup.id && (deletedSet.has(fup.id) || deletedSet.has(`vnd-fup-${fup.id}`) || deletedSet.has(`v_orc_${fup.id}`))) return;
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return;

    const clientName = (fup.cliente || fup.clientName || "Cliente").trim();
    const seller = (fup.vendedor || fup.consultoraName || fup.responsavel || fup.registeredBy || "Vanessa Gomes").trim();
    const clientType = fup.clientType || fup.tipoCliente || "Cliente Final";
    const saleValue = Number(fup.valor || fup.totalFinal || 0);

    // REGRA PRINCIPAL: Buscar venda existente por pedido, IDs, cliente, data, vendedor e valor
    const existingIndex = findMatchingVendaIndex(merged, {
      id: fup.id,
      pedido: numPedido,
      numeroPedido: numPedido,
      cliente: clientName,
      data: fup.dataCadastro || fup.dataAtualizacao,
      responsavel: seller,
      vendedor: seller,
      valor: saleValue,
      valorVenda: saleValue,
      followUpId: fup.id,
      orcamentoId: fup.orcamentoId,
    });

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      const needsUpdate =
        (!existing.cliente || existing.cliente === 'Cliente') ||
        (!existing.followUpId && fup.id) ||
        (!existing.orcamentoId && fup.orcamentoId) ||
        (!existing.produtos && fup.orcamentoId);

      if (needsUpdate) {
        merged[existingIndex] = {
          ...existing,
          cliente: (!existing.cliente || existing.cliente === 'Cliente') ? clientName : existing.cliente,
          vendedor: existing.vendedor || seller,
          tipoCliente: existing.tipoCliente || clientType,
          followUpId: existing.followUpId || fup.id,
          orcamentoId: existing.orcamentoId || fup.orcamentoId,
        };
        hasChanges = true;
      }
    } else {
      const matchedOrc = orcamentosHistory.find(
        (o) => o.id === fup.orcamentoId || o.id === fup.id || String(o.id).includes(numPedido)
      );

      let calcCustoProdutos = 0;
      let produtosList: VendaItemProduto[] = [];

      if (matchedOrc && Array.isArray(matchedOrc.items) && matchedOrc.items.length > 0) {
        matchedOrc.items.forEach((item: any, idx: number) => {
          const qtd = Number(item.qtd) || 1;
          const precoUnit = Number(item.precoUnitario) || 0;
          const totalItem = Number(item.total) || (qtd * precoUnit);
          const desc = item.descricao || "Item de Piso/Revestimento";

          const registeredCost = getCadastradoProductCost(desc);
          const unitCost = registeredCost !== null ? registeredCost : Number((precoUnit * 0.6).toFixed(2));
          const totalCost = Number((unitCost * qtd).toFixed(2));

          calcCustoProdutos += totalCost;
          produtosList.push({
            id: item.id || `item-${idx}`,
            produto: desc,
            quantidade: `${qtd} ${item.unidade || "un"}`,
            unidade: item.unidade || "un",
            valorUnitario: precoUnit,
            valorTotal: totalItem,
            custoUnitario: unitCost,
            custoTotal: totalCost,
          });
        });
      } else {
        calcCustoProdutos = Number((saleValue * 0.6).toFixed(2));
        produtosList = [
          {
            id: "item-1",
            produto: fup.produto || fup.nomeOrcamento || "Piso Vinílico e Acessórios Fênix",
            quantidade: "1 un",
            unidade: "un",
            valorUnitario: saleValue,
            valorTotal: saleValue,
            custoUnitario: calcCustoProdutos,
            custoTotal: calcCustoProdutos,
          },
        ];
      }

      const { totalGeral: custosAdic } = calcularCustosVariaveis(saleValue);
      const { lucro, margem } = calcularLucroEMargem(saleValue, calcCustoProdutos, custosAdic);

      const newVenda: VendaGerencial = {
        id: `vnd-fup-${fup.id}`,
        numeroPedido: numPedido,
        data: (fup.dataCadastro || fup.dataAtualizacao || new Date().toISOString()).split("T")[0],
        cliente: clientName,
        tipoCliente: clientType,
        vendedor: seller,
        valorVenda: saleValue,
        custoProdutos: calcCustoProdutos,
        custosAdicionais: custosAdic,
        lucro,
        margem,
        statusPedido: "Concluída",
        observacoes: fup.observacao || "Venda confirmada via Follow-up Comercial.",
        itensResumo: fup.produto || fup.nomeOrcamento || "Piso Vinílico e Acessórios Fênix",
        produtos: produtosList,
        orcamentoId: fup.orcamentoId,
        followUpId: fup.id,
        createdAt: fup.dataCadastro || new Date().toISOString(),
        criadoPor: seller,
      };

      merged.unshift(newVenda);
      hasChanges = true;
    }
  });

  return { mergedVendas: merged, hasChanges };
}

/**
 * Sincroniza vendas concluídas de Marketplace cadastradas por Jeferson Trolesi.
 * Evita duplicações e assegura visibilidade completa na aba Vendas do Diretor Éder Perez.
 */
/**
 * Sincroniza vendas registradas por Jeferson Trolesi na aba Metas / Marketplace
 * para a coleção de Vendas do Diretor Éder Perez.
 */
export function syncRealSalesFromMarketplace(currentVendas: VendaGerencial[]): {
  mergedVendas: VendaGerencial[];
  hasChanges: boolean;
} {
  let mktSales: any[] = [];
  try {
    const rawDb = localStorage.getItem("fenix_marketplace_sales_db");
    const rawV2 = localStorage.getItem("fenix_marketplace_sales_jeferson_v2");
    if (rawDb) {
      const parsed = JSON.parse(rawDb);
      if (Array.isArray(parsed)) mktSales.push(...parsed);
    }
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (!mktSales.some((m) => m.id === item.id || (m.pedido && m.pedido === item.pedido))) {
            mktSales.push(item);
          }
        });
      }
    }
  } catch {}

  if (mktSales.length === 0) {
    return { mergedVendas: currentVendas, hasChanges: false };
  }

  const merged = [...currentVendas];
  let hasChanges = false;
  const deletedSet = getDeletedVendasIds();

  mktSales.forEach((sale) => {
    if (isFictitiousVenda(sale)) return;

    const numPedido = String(sale.pedido || sale.id || "").replace(/^#+/, "").trim();
    const numPuro = extrairNumeroPuroPedido(numPedido);
    if (sale.id && (deletedSet.has(sale.id) || deletedSet.has(`vnd-mkt-${sale.id}`))) return;
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return;

    const saleValue = Number(sale.valor) || 0;
    if (saleValue <= 0) return;

    const canal = sale.canal || 'Shopee';
    const clientName = (sale.cliente || canal).trim();
    const seller = 'Jeferson Trolesi';
    const clientType = normalizarTipoCliente(sale.tipoCliente || 'Cliente Final');
    const formaPgto = (sale.formaPagamento || canal).trim();

    const calcCustoProdutos = Number((saleValue * 0.6).toFixed(2));
    const { totalGeral: custosAdic } = calcularCustosVariaveis(saleValue);
    const { lucro, margem } = calcularLucroEMargem(saleValue, calcCustoProdutos, custosAdic);

    const qtd = Number(sale.quantidadePedidos) || 1;
    const prodName = sale.produto || (canal ? `Produtos Marketplace ${canal}` : 'Produtos Marketplace');
    const unitVal = Number((saleValue / qtd).toFixed(2));
    const unitCost = Number((calcCustoProdutos / qtd).toFixed(2));

    const produtosList: VendaItemProduto[] = [
      {
        id: `prod-${sale.id || numPedido}-1`,
        produto: prodName,
        quantidade: `${qtd} un`,
        unidade: 'un',
        valorUnitario: unitVal,
        valorTotal: saleValue,
        custoUnitario: unitCost,
        custoTotal: calcCustoProdutos,
      },
    ];

    const existingIndex = findMatchingVendaIndex(merged, {
      id: sale.id,
      pedido: numPedido,
      numeroPedido: numPedido,
    });

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      const hasCustomCosts = Boolean(existing.custosItens && existing.custosItens.length > 0);

      const needsUpdate =
        existing.valorVenda !== saleValue ||
        existing.statusPedido !== 'Concluída' ||
        existing.vendedor !== seller ||
        existing.cliente !== clientName ||
        existing.tipoCliente !== clientType ||
        existing.formaPagamento !== formaPgto ||
        (!existing.produtos || existing.produtos.length === 0);

      if (needsUpdate) {
        merged[existingIndex] = {
          ...existing,
          cliente: clientName,
          tipoCliente: clientType,
          vendedor: seller,
          canalMarketplace: canal,
          isMarketplace: true,
          valorVenda: saleValue,
          formaPagamento: formaPgto,
          formasPagamento: [{ forma: formaPgto, valor: saleValue }],
          statusPedido: 'Concluída',
          produtos: (existing.produtos && existing.produtos.length > 0) ? existing.produtos : produtosList,
          itensResumo: existing.itensResumo || prodName,
          custoProdutos: hasCustomCosts ? existing.custoProdutos : calcCustoProdutos,
          custosAdicionais: hasCustomCosts ? existing.custosAdicionais : custosAdic,
          custoTotal: hasCustomCosts ? existing.custoTotal : Number((calcCustoProdutos + custosAdic).toFixed(2)),
          lucro: hasCustomCosts ? existing.lucro : lucro,
          margem: hasCustomCosts ? existing.margem : margem,
        };
        hasChanges = true;
      }
    } else {
      const newVenda: VendaGerencial = {
        id: `vnd-mkt-${sale.id || numPedido}`,
        numeroPedido: numPedido,
        data: sale.data || new Date().toISOString().split("T")[0],
        cliente: clientName,
        tipoCliente: clientType,
        canalMarketplace: canal,
        isMarketplace: true,
        vendedor: seller,
        valorVenda: saleValue,
        formaPagamento: formaPgto,
        formasPagamento: [{ forma: formaPgto, valor: saleValue }],
        custoProdutos: calcCustoProdutos,
        custosAdicionais: custosAdic,
        custoTotal: Number((calcCustoProdutos + custosAdic).toFixed(2)),
        lucro,
        margem,
        statusPedido: "Concluída",
        observacoes: sale.observacao || `Venda Marketplace via ${canal} - Pedido #${numPedido} (Responsável: Jeferson Trolesi).`,
        itensResumo: prodName,
        produtos: produtosList,
        metaId: sale.id,
        createdAt: sale.createdAt || (sale.data ? new Date(sale.data).toISOString() : new Date().toISOString()),
        criadoPor: seller,
      };

      merged.unshift(newVenda);
      hasChanges = true;
    }
  });

  return { mergedVendas: merged, hasChanges };
}

/**
 * Consulta todas as vendas diretamente do Supabase e localStorage,
 * consolidando as vendas reais de Metas, Follow-up ("Vendido") e CRM,
 * e garantindo a remoção completa de qualquer dado fictício ou de demonstração.
 */
export async function fetchVendasFromDatabase(): Promise<VendaGerencial[]> {
  const client = getSupabaseClient();
  let baseVendas: VendaGerencial[] = [];
  let metasSalesFromDb: any[] = [];
  let mktSalesFromDb: any[] = [];

  if (client) {
    try {
      const [vendasRes, metasRes, mktRes1, mktRes2] = await Promise.all([
        client
          .from("fenix_kv_store")
          .select("data")
          .eq("key", VENDAS_GERENCIAL_KEY)
          .maybeSingle(),
        client
          .from("fenix_kv_store")
          .select("data")
          .eq("key", "fenix_metas_sales_db")
          .maybeSingle(),
        client
          .from("fenix_kv_store")
          .select("data")
          .eq("key", "fenix_marketplace_sales_db")
          .maybeSingle(),
        client
          .from("fenix_kv_store")
          .select("data")
          .eq("key", "fenix_marketplace_sales_jeferson_v2")
          .maybeSingle(),
      ]);

      if (!vendasRes.error && vendasRes.data && Array.isArray(vendasRes.data.data) && vendasRes.data.data.length > 0) {
        baseVendas = vendasRes.data.data as VendaGerencial[];
      }
      if (!metasRes.error && metasRes.data && Array.isArray(metasRes.data.data)) {
        metasSalesFromDb = metasRes.data.data;
      }
      const combinedMkt: any[] = [];
      if (!mktRes1.error && mktRes1.data && Array.isArray(mktRes1.data.data)) {
        combinedMkt.push(...mktRes1.data.data);
      }
      if (!mktRes2.error && mktRes2.data && Array.isArray(mktRes2.data.data)) {
        mktRes2.data.data.forEach((p: any) => {
          if (!combinedMkt.some((c) => c.id === p.id || (c.pedido && c.pedido === p.pedido))) {
            combinedMkt.push(p);
          }
        });
      }
      mktSalesFromDb = combinedMkt;
    } catch (err) {
      console.warn("Erro ao consultar fenix_kv_store no Supabase:", err);
    }
  }

  if (baseVendas.length === 0) {
    const raw = localStorage.getItem(VENDAS_GERENCIAL_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseVendas = parsed;
        }
      } catch {}
    }
  }

  // Consolidar vendas de Metas do Supabase com as locais
  let localMetasSales: any[] = [];
  try {
    const rawM = localStorage.getItem("fenix_metas_sales_db");
    if (rawM) {
      const parsedM = JSON.parse(rawM);
      if (Array.isArray(parsedM)) localMetasSales = parsedM;
    }
  } catch {}

  const mergedMetasMap = new Map<string, any>();
  [...metasSalesFromDb, ...localMetasSales].forEach((s) => {
    if (!s || isFictitiousVenda(s)) return;
    const numPed = extrairNumeroPuroPedido(s.pedido || s.id || "");
    const key = numPed || s.id || String(Math.random());
    mergedMetasMap.set(key, s);
  });
  const allMetasSales = Array.from(mergedMetasMap.values());
  if (allMetasSales.length > 0) {
    try {
      localStorage.setItem("fenix_metas_sales_db", JSON.stringify(allMetasSales));
    } catch {}
  }

  // Consolidar vendas de Marketplace do Supabase com as locais
  if (mktSalesFromDb.length > 0) {
    try {
      let localMkt: any[] = [];
      const rawDb = localStorage.getItem("fenix_marketplace_sales_db");
      const rawV2 = localStorage.getItem("fenix_marketplace_sales_jeferson_v2");
      if (rawDb) {
        try {
          const parsed = JSON.parse(rawDb);
          if (Array.isArray(parsed)) localMkt.push(...parsed);
        } catch {}
      }
      if (rawV2) {
        try {
          const parsed = JSON.parse(rawV2);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (!localMkt.some((c) => c.id === item.id || (c.pedido && c.pedido === item.pedido))) {
                localMkt.push(item);
              }
            });
          }
        } catch {}
      }
      const mergedMktMap = new Map<string, any>();
      [...mktSalesFromDb, ...localMkt].forEach((m) => {
        if (!m || isFictitiousVenda(m)) return;
        const key = m.id || m.pedido || String(Math.random());
        mergedMktMap.set(key, m);
      });
      const allMkt = Array.from(mergedMktMap.values());
      localStorage.setItem("fenix_marketplace_sales_db", JSON.stringify(allMkt));
      localStorage.setItem("fenix_marketplace_sales_jeferson_v2", JSON.stringify(allMkt));
    } catch {}
  }

  // 1. Filtrar rigorosamente qualquer venda fictícia / demonstração ou excluída
  const deletedSet = getDeletedVendasIds();
  const cleanedBase = baseVendas.filter((v) => {
    if (isFictitiousVenda(v)) return false;
    if (v.id && deletedSet.has(v.id)) return false;
    const numPuro = extrairNumeroPuroPedido(v.numeroPedido || "");
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return false;
    return true;
  });
  const hadFictitious = cleanedBase.length !== baseVendas.length;

  // 2. Sincroniza com as vendas reais cadastradas pelos usuários em Metas
  const { mergedVendas: withMetas, hasChanges: metasChanged } = syncRealSalesFromMetas(cleanedBase, allMetasSales);

  // 3. Sincroniza com os registros reais do Follow-up com status "Vendido"
  const { mergedVendas: withFollowUp, hasChanges: fupChanged } = syncRealSalesFromFollowUp(withMetas);

  // 4. Sincroniza vendas concluídas de Marketplace (Jeferson Trolesi)
  const { mergedVendas: withMarketplace, hasChanges: mktChanged } = syncRealSalesFromMarketplace(withFollowUp);

  // 5. REGRA PRINCIPAL: Deduplicação unificada por número do Pedido
  // Garante que a mesma venda apareça UMA ÚNICA VEZ, mesmo registrada em Metas + Follow-up + Vendas
  const deduplicated = deduplicateVendasList(withMarketplace);

  // 6. Verificação final de pureza: apenas vendas reais não excluídas
  const finalRealVendas = deduplicated.filter((v) => {
    if (isFictitiousVenda(v)) return false;
    if (v.id && deletedSet.has(v.id)) return false;
    const numPuro = extrairNumeroPuroPedido(v.numeroPedido || "");
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return false;
    return true;
  });

  // Persiste a lista limpa no localStorage
  localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(finalRealVendas));

  // Atualização silenciosa no Supabase apenas se houver necessidade real de persistir itens deduplicados ou novos, SEM disparar eventos que possam gerar loop
  if (client && (hadFictitious || finalRealVendas.length !== baseVendas.length)) {
    Promise.resolve(
      client
        .from("fenix_kv_store")
        .upsert(
          {
            key: VENDAS_GERENCIAL_KEY,
            data: finalRealVendas,
            updated_at: new Date().toISOString(),
            updated_by: "Éder Perez",
          },
          { onConflict: "key" }
        )
    ).catch(() => {});
  }

  return finalRealVendas;
}

/**
 * Consulta a lista oficial de Clientes diretamente do Supabase e sincroniza com o cache local.
 * Permite puxar instantaneamente o tipo de cliente (ex: Instalador, Construtora, Revenda, etc.),
 * ícone e cor cadastrados no módulo CLIENTES.
 */
export async function fetchClientsFromDatabase(): Promise<ClientRecord[]> {
  const client = getSupabaseClient();
  let clients: ClientRecord[] = [];

  if (client) {
    try {
      const { data: row, error } = await client
        .from("fenix_kv_store")
        .select("data")
        .eq("key", "fenix_clients_db")
        .maybeSingle();

      if (!error && row && Array.isArray(row.data) && row.data.length > 0) {
        clients = row.data as ClientRecord[];
      }
    } catch (err) {
      console.warn("Erro ao consultar fenix_clients_db no Supabase:", err);
    }
  }

  if (clients.length === 0) {
    try {
      const raw = localStorage.getItem("fenix_clients_db");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          clients = parsed;
        }
      }
    } catch {}
  }

  return clients;
}

/**
 * Salva ou atualiza uma venda gerencial no Supabase e localStorage
 */
export async function salvarVendaGerencial(
  vendaData: Partial<VendaGerencial>,
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  if (!vendaData.numeroPedido || !vendaData.numeroPedido.trim()) {
    return { success: false, error: "O número do pedido é obrigatório." };
  }
  if (!vendaData.cliente || !vendaData.cliente.trim()) {
    return { success: false, error: "O nome do cliente é obrigatório." };
  }
  if (!vendaData.vendedor || !vendaData.vendedor.trim()) {
    return { success: false, error: "O vendedor responsável é obrigatório." };
  }
  if (vendaData.valorVenda === undefined || vendaData.valorVenda < 0) {
    return { success: false, error: "Informe um valor de venda válido." };
  }

  try {
    const vendas = await fetchVendasFromDatabase();
    const valorVendaNum = Number(vendaData.valorVenda) || 0;
    const custoProdutosNum = Number(vendaData.custoProdutos) || 0;
    let custosAdicionaisNum =
      vendaData.custosAdicionais !== undefined &&
      vendaData.custosAdicionais !== null &&
      !isNaN(Number(vendaData.custosAdicionais))
        ? Number(vendaData.custosAdicionais)
        : calcularCustosVariaveis(valorVendaNum).totalGeral;

    const { lucro, margem } = calcularLucroEMargem(valorVendaNum, custoProdutosNum, custosAdicionaisNum);

    const now = new Date().toISOString();
    const cleanPedido = vendaData.numeroPedido.trim().replace(/^#+/, "");
    const cleanPuro = extrairNumeroPuroPedido(cleanPedido);

    // REGRA PRINCIPAL: identificar venda existente usando prioritariamente o número do pedido ou dados da venda
    const existingIndex = findMatchingVendaIndex(vendas, {
      id: vendaData.id,
      numeroPedido: cleanPedido,
      pedido: cleanPedido,
      cliente: vendaData.cliente,
      data: vendaData.data,
      responsavel: vendaData.vendedor,
      vendedor: vendaData.vendedor,
      valor: valorVendaNum,
      valorVenda: valorVendaNum,
      followUpId: vendaData.followUpId,
      orcamentoId: vendaData.orcamentoId,
      metaId: vendaData.metaId,
    });
    const prevVenda = existingIndex >= 0 ? vendas[existingIndex] : undefined;
    const id = prevVenda?.id || vendaData.id || `vnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const historicoList: VendaHistoricoEntry[] = [...(prevVenda?.historico || [])];

    if (prevVenda) {
      const cProdChanged = prevVenda.custoProdutos !== custoProdutosNum;
      const cAddChanged = prevVenda.custosAdicionais !== custosAdicionaisNum;
      if (cProdChanged || cAddChanged) {
        historicoList.unshift({
          id: `hist-${Date.now()}`,
          data: new Date().toLocaleDateString("pt-BR"),
          hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          usuario,
          acao: "Custos atualizados",
          detalhes: `Custo produtos: R$ ${custoProdutosNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Custos adicionais: R$ ${custosAdicionaisNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Novo Lucro: R$ ${lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${margem}%)`,
          timestamp: Date.now(),
        });
      }
    } else {
      historicoList.push({
        id: `hist-${Date.now()}`,
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        usuario,
        acao: "Venda cadastrada",
        detalhes: `Venda #${cleanPedido} cadastrada por ${usuario}.`,
        timestamp: Date.now(),
      });
    }

    const fullVenda: VendaGerencial = {
      id,
      numeroPedido: cleanPedido,
      data: vendaData.data || now.split("T")[0],
      cliente: vendaData.cliente.trim(),
      clienteId: vendaData.clienteId || prevVenda?.clienteId,
      tipoCliente: vendaData.tipoCliente || prevVenda?.tipoCliente || "Cliente Final",
      vendedor: vendaData.vendedor.trim(),
      vendedorId: vendaData.vendedorId || prevVenda?.vendedorId,
      valorVenda: valorVendaNum,
      custoProdutos: custoProdutosNum,
      custosAdicionais: custosAdicionaisNum,
      lucro,
      margem,
      desconto: vendaData.desconto !== undefined ? vendaData.desconto : prevVenda?.desconto,
      frete: vendaData.frete !== undefined ? vendaData.frete : prevVenda?.frete,
      formaPagamento: vendaData.formaPagamento || prevVenda?.formaPagamento || undefined,
      formasPagamento: vendaData.formasPagamento || prevVenda?.formasPagamento || undefined,
      parcelas: vendaData.parcelas || prevVenda?.parcelas || undefined,
      observacoes: vendaData.observacoes?.trim() || prevVenda?.observacoes || undefined,
      detalhesCustosAdicionais: vendaData.detalhesCustosAdicionais?.trim() || prevVenda?.detalhesCustosAdicionais || undefined,
      itensResumo: vendaData.itensResumo?.trim() || prevVenda?.itensResumo || undefined,
      produtos: vendaData.produtos || prevVenda?.produtos || undefined,
      statusPedido: vendaData.statusPedido || prevVenda?.statusPedido || "Concluída",
      orcamentoId: vendaData.orcamentoId || prevVenda?.orcamentoId,
      followUpId: vendaData.followUpId || prevVenda?.followUpId,
      historico: historicoList,
      createdAt: vendaData.createdAt || prevVenda?.createdAt || now,
      updatedAt: now,
      criadoPor: vendaData.criadoPor || prevVenda?.criadoPor || usuario,
    };

    let updatedList: VendaGerencial[];
    if (existingIndex >= 0) {
      updatedList = vendas.map((v, i) => (i === existingIndex ? fullVenda : v));
    } else {
      updatedList = [fullVenda, ...vendas];
    }
    updatedList = deduplicateVendasList(updatedList);

    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));
    const saveRes = await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    if (!saveRes.success) {
      console.warn("Salvo localmente, erro ao persistir no Supabase:", saveRes.error);
    }

    // Sincroniza com fenix_metas_sales_db: atualiza se já existir ou cadastra se for nova venda
    try {
      const metasRaw = localStorage.getItem('fenix_metas_sales_db');
      let metasSales: any[] = metasRaw ? JSON.parse(metasRaw) : [];
      if (!Array.isArray(metasSales)) metasSales = [];

      const mIdx = metasSales.findIndex((m: any) => {
        const mPuro = extrairNumeroPuroPedido(m.pedido || m.id);
        if (cleanPuro && mPuro && cleanPuro === mPuro) return true;
        if (fullVenda.metaId && (m.id === fullVenda.metaId || m.metaId === fullVenda.metaId)) return true;
        if (fullVenda.followUpId && (m.followUpId === fullVenda.followUpId || m.orcamentoId === fullVenda.followUpId)) return true;
        const c1 = (m.cliente || '').trim().toLowerCase();
        const c2 = fullVenda.cliente.trim().toLowerCase();
        const v1 = Number(m.valor) || 0;
        const v2 = fullVenda.valorVenda;
        if (c1 && c2 && c1 === c2 && Math.abs(v1 - v2) <= 0.05) return true;
        return false;
      });

      const metaSaleRecord = {
        id: fullVenda.metaId || (mIdx >= 0 ? metasSales[mIdx].id : `v_venda_${fullVenda.id}`),
        pedido: cleanPedido,
        cliente: fullVenda.cliente,
        valor: fullVenda.valorVenda,
        data: fullVenda.data,
        vendedor: fullVenda.vendedor,
        responsavel: fullVenda.vendedor,
        formaPagamento: fullVenda.formaPagamento || 'Pix',
        formasPagamento: fullVenda.formasPagamento,
        parcelas: fullVenda.parcelas,
        tipoCliente: fullVenda.tipoCliente,
        desconto: fullVenda.desconto,
        frete: fullVenda.frete,
        orcamentoId: fullVenda.orcamentoId,
        followUpId: fullVenda.followUpId,
        criadoPor: fullVenda.criadoPor || usuario,
        registeredBy: usuario,
      };

      let updatedMetas: any[];
      if (mIdx >= 0) {
        updatedMetas = [...metasSales];
        updatedMetas[mIdx] = {
          ...updatedMetas[mIdx],
          ...metaSaleRecord,
        };
      } else {
        updatedMetas = [metaSaleRecord, ...metasSales];
      }

      localStorage.setItem('fenix_metas_sales_db', JSON.stringify(updatedMetas));
      window.dispatchEvent(new Event('fenix_metas_updated'));
      saveWholeCollectionToSupabase('fenix_metas_sales_db', updatedMetas, usuario).catch(() => {});
    } catch {}

    dispatchCollectionEvents("fenix_vendas_gerencial");
    return { success: true, venda: fullVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar venda." };
  }
}

/**
 * Atualização exclusiva de Custos (Custo dos Produtos e Custos Adicionais)
 * permitida SOMENTE para Éder Perez (Diretor).
 */
export async function atualizarCustosVenda(
  vendaId: string,
  novoCustoProdutos: number,
  novosCustosAdicionais: number,
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  try {
    const vendas = await fetchVendasFromDatabase();
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) {
      return { success: false, error: "Venda não encontrada." };
    }

    const cProd = Number(novoCustoProdutos) || 0;
    const cAdd = Number(novosCustosAdicionais) || 0;
    const { lucro, margem } = calcularLucroEMargem(venda.valorVenda, cProd, cAdd);

    const now = new Date();
    const newEntry: VendaHistoricoEntry = {
      id: `hist-${Date.now()}`,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      usuario,
      acao: "Edição de custos (Diretor)",
      detalhes: `Custo produtos alterado de R$ ${venda.custoProdutos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para R$ ${cProd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Custos adicionais de R$ ${venda.custosAdicionais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para R$ ${cAdd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Novo Lucro: R$ ${lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${margem}%).`,
      timestamp: now.getTime(),
    };

    const updatedVenda: VendaGerencial = {
      ...venda,
      custoProdutos: cProd,
      custosAdicionais: cAdd,
      lucro,
      margem,
      updatedAt: now.toISOString(),
      historico: [newEntry, ...(venda.historico || [])],
    };

    const updatedList = vendas.map((v) => (v.id === vendaId ? updatedVenda : v));
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));

    await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    dispatchCollectionEvents("fenix_vendas_gerencial");

    return { success: true, venda: updatedVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar custos." };
  }
}

/**
 * Atualização completa e dinâmica de Custos por Tipo:
 * Produto, Nota Fiscal, Taxa de Pagamento, Frete, Comercial, Desconto, Operacional e Outros.
 * Permite adicionar, editar e remover itens de custo.
 * Recalcula imediatamente: Custo Total → Lucro → Margem.
 * Restrito exclusivamente ao Diretor Éder Perez.
 */
export async function atualizarCustosCompletosVenda(
  vendaId: string,
  novosCustosItens: VendaCustoItem[],
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  try {
    const vendas = await fetchVendasFromDatabase();
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) {
      return { success: false, error: "Venda não encontrada no banco de dados." };
    }

    const { custoTotal, custoProdutos, custosAdicionais, lucro, margem } = recalcularCustosELucro(
      venda.valorVenda,
      novosCustosItens
    );

    const now = new Date();
    const newEntry: VendaHistoricoEntry = {
      id: `hist-${Date.now()}`,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      usuario,
      acao: "Edição de custos do pedido (Éder Perez)",
      detalhes: `Custos redefinidos por ${usuario}. Custo Total: R$ ${custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Lucro: R$ ${lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${margem}%). Itens de custo: ${novosCustosItens.length}`,
      timestamp: now.getTime(),
    };

    const updatedVenda: VendaGerencial = {
      ...venda,
      custosItens: novosCustosItens,
      custoTotal,
      custoProdutos,
      custosAdicionais,
      lucro,
      margem,
      updatedAt: now.toISOString(),
      historico: [newEntry, ...(venda.historico || [])],
    };

    const updatedList = vendas.map((v) => (v.id === vendaId ? updatedVenda : v));
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));

    await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    dispatchCollectionEvents("fenix_vendas_gerencial");

    return { success: true, venda: updatedVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar custos do pedido." };
  }
}

/**
 * Cancelamento formal de venda gerencial (sem exclusão física do registro).
 * Mantém o histórico com motivo e data de cancelamento.
 */
export async function cancelarVendaGerencial(
  vendaId: string,
  motivo: string,
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  try {
    const vendas = await fetchVendasFromDatabase();
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) {
      return { success: false, error: "Venda não encontrada para cancelamento." };
    }

    const now = new Date();
    const cleanMotivo = motivo.trim() || "Venda cancelada a pedido da administração.";
    const newEntry: VendaHistoricoEntry = {
      id: `hist-${Date.now()}`,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      usuario,
      acao: "Venda Cancelada",
      detalhes: `Cancelada por ${usuario}. Motivo: ${cleanMotivo}`,
      timestamp: now.getTime(),
    };

    const updatedVenda: VendaGerencial = {
      ...venda,
      statusPedido: "Cancelada",
      motivoCancelamento: cleanMotivo,
      dataCancelamento: now.toISOString(),
      updatedAt: now.toISOString(),
      historico: [newEntry, ...(venda.historico || [])],
    };

    const updatedList = vendas.map((v) => (v.id === vendaId ? updatedVenda : v));
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));

    await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    dispatchCollectionEvents("fenix_vendas_gerencial");

    return { success: true, venda: updatedVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao cancelar venda." };
  }
}

/**
 * Exclui uma venda permanentemente do Supabase e localStorage.
 * Registra o ID nos excluídos e atualiza as coleções vinculadas.
 */
export async function excluirVendaGerencial(
  vendaId: string,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = String(vendaId);
    const vendas = await fetchVendasFromDatabase();
    const vendaToDelete = vendas.find((v) => v.id === targetId);

    await addDeletedVendaId(targetId, usuario);
    if (vendaToDelete?.numeroPedido) {
      await addDeletedVendaId(extrairNumeroPuroPedido(vendaToDelete.numeroPedido), usuario);
      await addDeletedVendaId(vendaToDelete.numeroPedido, usuario);
    }
    if (vendaToDelete?.metaId) {
      await addDeletedVendaId(vendaToDelete.metaId, usuario);
    }
    if (vendaToDelete?.followUpId) {
      await addDeletedVendaId(vendaToDelete.followUpId, usuario);
    }

    const updated = vendas.filter((v) => v.id !== targetId);
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updated));

    const saveRes = await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updated, usuario);
    if (!saveRes.success) {
      console.warn("Erro ao excluir venda no Supabase:", saveRes.error);
    }

    // Também remove de fenix_metas_sales_db e fenix_metas_db se existente
    try {
      const numPuro = vendaToDelete ? extrairNumeroPuroPedido(vendaToDelete.numeroPedido) : "";
      ['fenix_metas_sales_db', 'fenix_metas_db'].forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((m: any) => {
                if (m.id === targetId || m.id === `v_${targetId}` || `v_${m.id}` === targetId) return false;
                if (numPuro && extrairNumeroPuroPedido(m.pedido || "") === numPuro) return false;
                return true;
              });
              if (filtered.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(filtered));
                saveWholeCollectionToSupabase(key, filtered, usuario).catch(() => {});
              }
            }
          } catch {}
        }
      });
    } catch {}

    dispatchCollectionEvents("fenix_vendas_gerencial");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir venda." };
  }
}

/**
 * Procura orçamentos fechados nos orçamentos salvos e histórico para puxar para Vendas
 */
export function buscarOrcamentosFechadosParaImportar(): Array<{
  id: string;
  numero: string;
  cliente: string;
  tipoCliente: string;
  vendedor: string;
  valor: number;
  data: string;
  itens: string;
  produtos: VendaItemProduto[];
}> {
  const list: Array<{
    id: string;
    numero: string;
    cliente: string;
    tipoCliente: string;
    vendedor: string;
    valor: number;
    data: string;
    itens: string;
    produtos: VendaItemProduto[];
  }> = [];

  const rawSaved = localStorage.getItem("fenix_saved_orcamentos");
  const rawHistory = localStorage.getItem("fenix_orcamentos_history");

  const allOrcs: any[] = [];
  if (rawSaved) {
    try {
      const p = JSON.parse(rawSaved);
      if (Array.isArray(p)) allOrcs.push(...p);
    } catch {}
  }
  if (rawHistory) {
    try {
      const p = JSON.parse(rawHistory);
      if (Array.isArray(p)) allOrcs.push(...p);
    } catch {}
  }

  allOrcs.forEach((orc) => {
    const st = (orc.status || orc.situacao || "").toLowerCase();
    const isClosed = st.includes("fech") || st.includes("aprov") || st.includes("vend") || st.includes("ganh");
    if (isClosed && (orc.valorTotal || orc.totalFinal || orc.totalGeral || orc.valor)) {
      const val = Number(orc.valorTotal || orc.totalFinal || orc.totalGeral || orc.valor) || 0;
      const num = String(orc.numero || orc.codigo || orc.id || "").replace(/\D/g, "").slice(-4) || "ORC";

      const prods: VendaItemProduto[] = [];
      if (Array.isArray(orc.items)) {
        orc.items.forEach((it: any, idx: number) => {
          const qtd = Number(it.qtd) || 1;
          const preco = Number(it.precoUnitario) || 0;
          const cost = getCadastradoProductCost(it.descricao || "") || Number((preco * 0.6).toFixed(2));
          prods.push({
            id: it.id || `it-${idx}`,
            produto: it.descricao || "Produto Fênix",
            quantidade: `${qtd} ${it.unidade || "un"}`,
            unidade: it.unidade || "un",
            valorUnitario: preco,
            valorTotal: Number(it.total) || (qtd * preco),
            custoUnitario: cost,
            custoTotal: Number((cost * qtd).toFixed(2)),
          });
        });
      }

      list.push({
        id: orc.id || `imp-${Math.random().toString(36)}`,
        numero: num,
        cliente: orc.clientName || orc.clienteNome || orc.cliente || orc.nomeCliente || "Cliente Fênix",
        tipoCliente: orc.clientType || "Cliente Final",
        vendedor: orc.consultoraName || orc.vendedor || orc.consultor || "Vanessa Gomes",
        valor: val,
        data: orc.dataCriacao || orc.savedAt || orc.data || new Date().toISOString().split("T")[0],
        itens: orc.items?.[0]?.descricao || orc.produtoNome || orc.descricao || "Piso Vinílico e Acessórios Fênix",
        produtos: prods,
      });
    }
  });

  return list;
}
