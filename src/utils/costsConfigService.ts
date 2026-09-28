import { getSupabaseClient, saveWholeCollectionToSupabase } from './supabaseClient';
import { isEderPerez } from './auth';

// Chaves Oficiais de Coleções no Supabase fenix_kv_store
export const KEY_CUSTOS_ESTRUTURA = 'fenix_custos_estrutura_v1';
export const KEY_CUSTOS_RATEIO = 'fenix_custos_rateio_v1';
export const KEY_CUSTOS_PEDIDO_REGRAS = 'fenix_custos_pedido_regras_v1';
export const KEY_CUSTOS_NOTA_FISCAL = 'fenix_custos_nota_fiscal_v1';
export const KEY_CUSTOS_PAGAMENTOS = 'fenix_custos_pagamentos_v1';
export const KEY_CUSTOS_COMISSOES = 'fenix_custos_comissoes_v1';
export const KEY_CUSTOS_MARKETPLACE = 'fenix_custos_marketplace_v1';
export const KEY_TARKETT_SIMULACOES = 'fenix_tarkett_simulacoes_v1';
export const KEY_CUSTOS_TARKETT_ITENS = 'fenix_custos_tarkett_itens_v1';

export const EVENT_CUSTOS_CONFIG_UPDATED = 'fenix_custos_config_updated';

// =========================================================================
// 1. ESTRUTURA (Custos Operacionais Gerais da Fênix World)
// =========================================================================
export type CategoriaEstrutura =
  | 'Aluguel'
  | 'Condomínio'
  | 'IPTU'
  | 'Energia'
  | 'Água'
  | 'Internet'
  | 'Salários'
  | 'Contabilidade'
  | 'Sistemas'
  | 'Marketing'
  | 'Escritório'
  | 'Manutenção'
  | 'Outros';

export type FrequenciaEstrutura =
  | 'mensal'
  | 'trimestral'
  | 'semestral'
  | 'anual'
  | 'eventual';

export interface CustoEstruturaItem {
  id: string;
  nome: string;
  categoria: CategoriaEstrutura;
  valor: number;
  frequencia: FrequenciaEstrutura;
  status: 'Ativo' | 'Inativo';
  observacao?: string;
  criadoPor?: string;
  atualizadoEm?: string;
}

export const CATEGORIAS_ESTRUTURA: CategoriaEstrutura[] = [
  'Aluguel',
  'Condomínio',
  'IPTU',
  'Energia',
  'Água',
  'Internet',
  'Salários',
  'Contabilidade',
  'Sistemas',
  'Marketing',
  'Escritório',
  'Manutenção',
  'Outros',
];

export const FREQUENCIAS_ESTRUTURA: { id: FrequenciaEstrutura; label: string; divisorMensal: number }[] = [
  { id: 'mensal', label: 'Mensal', divisorMensal: 1 },
  { id: 'trimestral', label: 'Trimestral (÷ 3)', divisorMensal: 3 },
  { id: 'semestral', label: 'Semestral (÷ 6)', divisorMensal: 6 },
  { id: 'anual', label: 'Anual (÷ 12)', divisorMensal: 12 },
  { id: 'eventual', label: 'Eventual (÷ 12 est.)', divisorMensal: 12 },
];

/**
 * Calcula a equivalência mensal de um item de estrutura
 */
export function calcularEquivalenteMensal(valor: number, frequencia: FrequenciaEstrutura): number {
  const v = Number(valor) || 0;
  switch (frequencia) {
    case 'mensal':
      return v;
    case 'trimestral':
      return Number((v / 3).toFixed(2));
    case 'semestral':
      return Number((v / 6).toFixed(2));
    case 'anual':
      return Number((v / 12).toFixed(2));
    case 'eventual':
      return Number((v / 12).toFixed(2));
    default:
      return v;
  }
}

export const DEFAULT_ESTRUTURA_ITEMS: CustoEstruturaItem[] = [
  {
    id: 'est-aluguel-galpao',
    nome: 'Aluguel do Galpão / Showroom',
    categoria: 'Aluguel',
    valor: 4500,
    frequencia: 'mensal',
    status: 'Ativo',
    observacao: 'Sede operacional Fênix World',
  },
  {
    id: 'est-energia',
    nome: 'Energia Elétrica (Enel)',
    categoria: 'Energia',
    valor: 480,
    frequencia: 'mensal',
    status: 'Ativo',
  },
  {
    id: 'est-agua',
    nome: 'Água & Saneamento (Sabesp)',
    categoria: 'Água',
    valor: 110,
    frequencia: 'mensal',
    status: 'Ativo',
  },
  {
    id: 'est-internet',
    nome: 'Internet Fibra Óptica Empresarial',
    categoria: 'Internet',
    valor: 220,
    frequencia: 'mensal',
    status: 'Ativo',
  },
  {
    id: 'est-contabilidade',
    nome: 'Assessoria Contábil & Fiscal',
    categoria: 'Contabilidade',
    valor: 850,
    frequencia: 'mensal',
    status: 'Ativo',
  },
  {
    id: 'est-sistemas',
    nome: 'Sistemas Cloud, ERP & Infraestrutura',
    categoria: 'Sistemas',
    valor: 390,
    frequencia: 'mensal',
    status: 'Ativo',
  },
  {
    id: 'est-iptu',
    nome: 'IPTU Anual Imóvel Operacional',
    categoria: 'IPTU',
    valor: 3600,
    frequencia: 'anual',
    status: 'Ativo',
    observacao: 'Parcelado / provisionado anualmente',
  },
];

// =========================================================================
// 2. RATEIO (Gerencial)
// =========================================================================
export interface RateioConfig {
  faturamentoBase: number; // R$ faturamento estimado/meta da empresa
  mesReferencia?: string;
  observacoes?: string;
  atualizadoEm?: string;
}

export const DEFAULT_RATEIO_CONFIG: RateioConfig = {
  faturamentoBase: 120000, // R$ 120.000,00 base mensal
  observacoes: 'Rateio estritamente gerencial. A estrutura não entra automaticamente nos pedidos.',
};

/**
 * Calcula os indicadores de rateio da estrutura sobre o faturamento
 */
export function calcularIndicadoresRateio(
  estrutura: CustoEstruturaItem[],
  faturamentoBase: number
): {
  totalMensalEstrutura: number;
  faturamentoBase: number;
  pesoEstruturaPercent: number;
  custosPorCategoria: { categoria: CategoriaEstrutura; totalMensal: number; percent: number }[];
} {
  const ativos = estrutura.filter((item) => item.status === 'Ativo');
  let totalMensal = 0;
  const porCat: Record<string, number> = {};

  ativos.forEach((item) => {
    const mensal = calcularEquivalenteMensal(item.valor, item.frequencia);
    totalMensal += mensal;
    porCat[item.categoria] = (porCat[item.categoria] || 0) + mensal;
  });

  const fat = Math.max(1, faturamentoBase || 1);
  const peso = Number(((totalMensal / fat) * 100).toFixed(2));

  const custosPorCategoria = Object.entries(porCat).map(([cat, v]) => ({
    categoria: cat as CategoriaEstrutura,
    totalMensal: Number(v.toFixed(2)),
    percent: totalMensal > 0 ? Number(((v / totalMensal) * 100).toFixed(1)) : 0,
  }));

  custosPorCategoria.sort((a, b) => b.totalMensal - a.totalMensal);

  return {
    totalMensalEstrutura: Number(totalMensal.toFixed(2)),
    faturamentoBase: fat,
    pesoEstruturaPercent: peso,
    custosPorCategoria,
  };
}

// =========================================================================
// 3. CUSTOS DO PEDIDO (Regras Gerais de Composição de Pedidos)
// =========================================================================
export type CategoriaCustoPedido =
  | 'Produto'
  | 'NF'
  | 'Taxa de Pagamento'
  | 'Frete'
  | 'Comercial'
  | 'Desconto'
  | 'Operacional'
  | 'Outros';

export type TipoCustoPedido = '%' | 'Fixo' | 'Tabela';
export type AplicacaoCustoPedido = 'Comercial' | 'Marketplace' | 'Ambos';

export interface RegraCustoPedido {
  id: string;
  nome: string;
  categoria: CategoriaCustoPedido;
  tipo: TipoCustoPedido;
  valor: number; // % ou R$
  aplicacao: AplicacaoCustoPedido;
  descricao?: string;
  ativo: boolean;
  obrigatorio?: boolean;
}

export const CATEGORIAS_CUSTO_PEDIDO: CategoriaCustoPedido[] = [
  'Produto',
  'NF',
  'Taxa de Pagamento',
  'Frete',
  'Comercial',
  'Desconto',
  'Operacional',
  'Outros',
];

export const DEFAULT_CUSTOS_PEDIDO_REGRAS: RegraCustoPedido[] = [
  {
    id: 'regra-custo-produto',
    nome: 'Custo de Aquisição do Produto',
    categoria: 'Produto',
    tipo: 'Fixo',
    valor: 0,
    aplicacao: 'Ambos',
    descricao: 'Valor de custo cadastrado do item multiplicado pela quantidade',
    ativo: true,
    obrigatorio: true,
  },
  {
    id: 'regra-nf-padrao',
    nome: 'Impostos s/ Nota Fiscal (NF)',
    categoria: 'NF',
    tipo: '%',
    valor: 6.0,
    aplicacao: 'Ambos',
    descricao: 'Alíquota de imposto sobre faturamento da NF',
    ativo: true,
  },
  {
    id: 'regra-frete-pedido',
    nome: 'Frete de Entrega',
    categoria: 'Frete',
    tipo: 'Fixo',
    valor: 0,
    aplicacao: 'Comercial',
    descricao: 'Frete informado diretamente em cada pedido comercial',
    ativo: true,
  },
];

// =========================================================================
// 4. NOTA FISCAL (Alíquotas e Regras de Impostos)
// =========================================================================
export interface NotaFiscalConfig {
  aliquotaPadraoPercent: number; // ex: 6.0%
  aliquotaComercialPercent: number; // ex: 6.0%
  aliquotaMarketplacePercent: number; // ex: 6.0%
  emissaoObrigatoria: boolean;
  observacoes?: string;
  atualizadoEm?: string;
}

export const DEFAULT_NOTA_FISCAL_CONFIG: NotaFiscalConfig = {
  aliquotaPadraoPercent: 6.0,
  aliquotaComercialPercent: 6.0,
  aliquotaMarketplacePercent: 6.0,
  emissaoObrigatoria: true,
  observacoes: 'Alíquota de imposto apurada sobre o valor bruto faturado.',
};

// =========================================================================
// 5. TAXAS DE PAGAMENTO (Meios de Pagamento e Parcelas)
// =========================================================================
export interface TaxasPagamentoConfig {
  pixPercent: number; // % (ex: 0%)
  pixFixo: number; // R$
  boletoFixo: number; // R$ taxa de emissão/liquidação
  debitoPercent: number; // %
  cartaoParcelas: Record<number, number>; // Parcela (1 a 12) -> taxa %
  observacoes?: string;
  atualizadoEm?: string;
}

export const DEFAULT_TAXAS_PAGAMENTO_CONFIG: TaxasPagamentoConfig = {
  pixPercent: 0.0,
  pixFixo: 0.0,
  boletoFixo: 2.5,
  debitoPercent: 1.49,
  cartaoParcelas: {
    1: 2.99,
    2: 3.49,
    3: 3.99,
    4: 4.49,
    5: 4.99,
    6: 5.49,
    7: 5.99,
    8: 6.49,
    9: 6.99,
    10: 7.49,
    11: 7.99,
    12: 8.49,
  },
  observacoes: 'Taxas aplicadas automaticamente conforme forma de pagamento do pedido.',
};

// =========================================================================
// 6. COMISSÕES (Configuração Individual por Responsável)
// =========================================================================
export interface ComissaoResponsavelConfig {
  id: string;
  nome: string;
  cargo: string;
  comissaoPadraoPercent: number; // % sobre valor líquido/bruto
  tipoBase: 'Bruto' | 'Líquido';
  reduzirPorDesconto: boolean;
  ativo: boolean;
  observacao?: string;
}

export const DEFAULT_COMISSOES_CONFIG: ComissaoResponsavelConfig[] = [
  {
    id: 'com-eder-perez',
    nome: 'Éder Perez',
    cargo: 'Diretor Geral',
    comissaoPadraoPercent: 0,
    tipoBase: 'Bruto',
    reduzirPorDesconto: false,
    ativo: true,
    observacao: 'Diretoria Executiva',
  },
  {
    id: 'com-vanessa-gomes',
    nome: 'Vanessa Gomes',
    cargo: 'Consultora Comercial',
    comissaoPadraoPercent: 1.0,
    tipoBase: 'Bruto',
    reduzirPorDesconto: true,
    ativo: true,
    observacao: 'Consultoria de Vendas Diretas',
  },
  {
    id: 'com-jhessica-camargo',
    nome: 'Jhessica Camargo',
    cargo: 'Consultora Comercial',
    comissaoPadraoPercent: 1.0,
    tipoBase: 'Bruto',
    reduzirPorDesconto: true,
    ativo: true,
    observacao: 'Consultoria de Vendas Diretas',
  },
  {
    id: 'com-jeferson-trolesi',
    nome: 'Jeferson Trolesi',
    cargo: 'Marketplace & E-commerce',
    comissaoPadraoPercent: 0,
    tipoBase: 'Bruto',
    reduzirPorDesconto: false,
    ativo: true,
    observacao: 'Operação Shopee & Mercado Livre',
  },
];

// =========================================================================
// 7. MARKETPLACE (Shopee & Mercado Livre)
// =========================================================================
export interface MarketplaceCanalConfig {
  canal: 'Shopee' | 'Mercado Livre';
  responsavel: string; // Fixo: Jeferson Trolesi
  comissaoPercent: number; // % comissão do canal
  freteEnvioValor: number; // R$ frete padrão de envio
  subsidioFrete: number; // R$ subsídio oferecido pelo seller
  adsPercent: number; // % gasto estimado com publicidade/Ads
  taxaFixaPorVenda: number; // R$ taxa fixa por item/venda
  ativo: boolean;
  observacoes?: string;
}

export interface MarketplaceConfig {
  shopee: MarketplaceCanalConfig;
  mercadoLivre: MarketplaceCanalConfig;
  atualizadoEm?: string;
}

export const DEFAULT_MARKETPLACE_CONFIG: MarketplaceConfig = {
  shopee: {
    canal: 'Shopee',
    responsavel: 'Jeferson Trolesi',
    comissaoPercent: 14.0,
    freteEnvioValor: 0,
    subsidioFrete: 0,
    adsPercent: 3.0,
    taxaFixaPorVenda: 3.0,
    ativo: true,
    observacoes: 'Taxa padrão de marketplace Shopee + Ads.',
  },
  mercadoLivre: {
    canal: 'Mercado Livre',
    responsavel: 'Jeferson Trolesi',
    comissaoPercent: 16.0,
    freteEnvioValor: 0,
    subsidioFrete: 0,
    adsPercent: 4.5,
    taxaFixaPorVenda: 5.0,
    ativo: true,
    observacoes: 'Taxa clássico/premium Mercado Livre.',
  },
};

// =========================================================================
// 8. TARKETT (Formação de Preço Exclusiva)
// =========================================================================
export interface TarkettProdutoReferencia {
  id: string;
  codigo: string;
  nome: string;
  linha: string;
  unidade: string;
  quantidadeM2?: number; // Quantidade em m² (ex: metragem por caixa/embalagem ou estoque)
  precoTabelaFabrica: number; // Preço de lista do site/catálogo
  descontoIndividualPercent?: number; // Porcentagem de desconto individual para cada produto
  descricao?: string;
  createdAt?: string;
}

export const TARKETT_PRODUTOS_REFERENCIA: TarkettProdutoReferencia[] = [
  {
    id: 'tar-essence-30',
    codigo: 'TK-ESS-01',
    nome: 'Piso Vinílico Tarkett Linha Essence 30 (Barra / m²)',
    linha: 'Essence 30',
    unidade: 'm²',
    quantidadeM2: 3.34,
    precoTabelaFabrica: 89.9,
    descontoIndividualPercent: 10,
    descricao: 'Uso residencial pesado e comercial moderado',
  },
  {
    id: 'tar-injoy',
    codigo: 'TK-INJ-02',
    nome: 'Piso Vinílico Tarkett Linha Injoy (m²)',
    linha: 'Injoy',
    unidade: 'm²',
    quantidadeM2: 4.18,
    precoTabelaFabrica: 64.9,
    descontoIndividualPercent: 12,
    descricao: 'Linha residencial prática e rápida instalação',
  },
  {
    id: 'tar-square-acustico',
    codigo: 'TK-SQR-03',
    nome: 'Piso Vinílico Tarkett Linha Square Acústico (Placas)',
    linha: 'Square',
    unidade: 'm²',
    quantidadeM2: 2.5,
    precoTabelaFabrica: 139.0,
    descontoIndividualPercent: 8,
    descricao: 'Elevada absorção acústica e conforto térmico',
  },
  {
    id: 'tar-ambienta-studio',
    codigo: 'TK-AMB-04',
    nome: 'Piso Vinílico Tarkett Linha Ambienta Studio LVT',
    linha: 'Ambienta Studio',
    unidade: 'm²',
    quantidadeM2: 3.34,
    precoTabelaFabrica: 119.5,
    descontoIndividualPercent: 10,
    descricao: 'Design premium acetinado e alta resistência',
  },
  {
    id: 'tar-cola-globalfix',
    codigo: 'TK-GLB-05',
    nome: 'Adesivo Acrílico Tarkett Globalfix 4kg',
    linha: 'Acessórios & Colas',
    unidade: 'balde',
    quantidadeM2: 15.0,
    precoTabelaFabrica: 125.0,
    descontoIndividualPercent: 15,
    descricao: 'Adesivo especial para fixação de pisos vinílicos',
  },
];

export const TARKETT_PRODUTOS_STORAGE_KEY = 'fenix_tarkett_produtos_catalogo';

export function getTarkettProdutosCatalogo(): TarkettProdutoReferencia[] {
  try {
    const raw = localStorage.getItem(TARKETT_PRODUTOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => ({
          ...p,
          quantidadeM2: typeof p.quantidadeM2 === 'number' ? p.quantidadeM2 : 1,
          descontoIndividualPercent: p.descontoIndividualPercent ?? 10,
        }));
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar catálogo Tarkett:', e);
  }
  return TARKETT_PRODUTOS_REFERENCIA.map((p) => ({
    ...p,
    quantidadeM2: p.quantidadeM2 ?? 1,
    descontoIndividualPercent: p.descontoIndividualPercent ?? 10,
  }));
}

export async function saveTarkettProdutosCatalogo(
  produtos: TarkettProdutoReferencia[],
  user?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    localStorage.setItem(TARKETT_PRODUTOS_STORAGE_KEY, JSON.stringify(produtos));
    window.dispatchEvent(new Event('fenix_tarkett_produtos_updated'));
    await saveWholeCollectionToSupabase(TARKETT_PRODUTOS_STORAGE_KEY, produtos, user);
    return { success: true };
  } catch (e: any) {
    console.error('Erro ao salvar produtos Tarkett:', e);
    return { success: false, error: e?.message };
  }
}

/**
 * Exclui permanentemente um produto Tarkett do banco Supabase e do LocalStorage
 */
export async function deleteTarkettProdutoCatalogo(
  produtoId: string,
  user?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = getTarkettProdutosCatalogo();
    const updated = current.filter((p) => p.id !== produtoId);
    return await saveTarkettProdutosCatalogo(updated, user);
  } catch (e: any) {
    console.error('Erro ao excluir produto Tarkett:', e);
    return { success: false, error: e?.message };
  }
}

/**
 * Salva ou atualiza um produto Tarkett existente ou novo no banco
 */
export async function saveOrUpdateTarkettProduto(
  produto: TarkettProdutoReferencia,
  user?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = getTarkettProdutosCatalogo();
    const index = current.findIndex((p) => p.id === produto.id);
    let updated: TarkettProdutoReferencia[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = produto;
    } else {
      updated = [produto, ...current];
    }
    return await saveTarkettProdutosCatalogo(updated, user);
  } catch (e: any) {
    console.error('Erro ao cadastrar/atualizar produto Tarkett:', e);
    return { success: false, error: e?.message };
  }
}

export interface TarkettSimulacaoItem {
  id: string;
  data: string;
  operador: string;
  produtoNome: string;
  linha: string;
  unidade: string;
  quantidadeDesejadaM2?: number; // Quantidade desejada em m² para o cálculo
  // Parâmetros de Entrada
  precoSiteFabrica: number;
  descontoFabricaPercent: number;
  freteValor: number;
  outrosCustosPercent: number;
  // Custo Calculado
  custoLiquidoCalculado: number;
  custoLiquidoTotal?: number;
  // Formação de Preço para 3 Perfis
  margemClienteFinalPercent: number;
  precoClienteFinal: number;
  precoTotalClienteFinal?: number;
  lucroClienteFinal: number;
  lucroTotalClienteFinal?: number;

  margemRevendaPercent: number;
  precoRevenda: number;
  precoTotalRevenda?: number;
  lucroRevenda: number;
  lucroTotalRevenda?: number;

  margemConstrutoraPercent: number;
  precoConstrutora: number;
  precoTotalConstrutora?: number;
  lucroConstrutora: number;
  lucroTotalConstrutora?: number;

  observacao?: string;
}

/**
 * Realiza os cálculos do simulador Tarkett considerando o custo unitário e o total pela Quantidade desejada em m²,
 * incorporando automaticamente os Custos Tarkett Ativos configurados com exclusividade pelo Diretor Éder Perez.
 */
export function calcularSimuladorTarkett(params: {
  precoSiteFabrica: number;
  descontoFabricaPercent: number;
  freteValor: number;
  outrosCustosPercent: number;
  margemClienteFinalPercent: number;
  margemRevendaPercent: number;
  margemConstrutoraPercent: number;
  quantidadeDesejadaM2?: number;
  custosTarkettAtivos?: CustoTarkettItem[];
}): {
  quantidadeM2: number;
  custoLiquido: number;
  custoLiquidoTotal: number;
  totalCustosTarkettM2: number;
  totalCustosTarkettTotal: number;
  custosTarkettDetalhes: {
    id: string;
    nome: string;
    tipo: 'R$' | '%';
    valor: number;
    impactoUnitarioM2: number;
  }[];
  clienteFinal: {
    precoVenda: number;
    precoVendaTotal: number;
    lucro: number;
    lucroTotal: number;
    margemEfetiva: number;
  };
  revenda: {
    precoVenda: number;
    precoVendaTotal: number;
    lucro: number;
    lucroTotal: number;
    margemEfetiva: number;
  };
  construtora: {
    precoVenda: number;
    precoVendaTotal: number;
    lucro: number;
    lucroTotal: number;
    margemEfetiva: number;
  };
} {
  const precoBase = Math.max(0, params.precoSiteFabrica || 0);
  const descFabrica = (precoBase * Math.max(0, params.descontoFabricaPercent || 0)) / 100;
  const precoComDesconto = Math.max(0, precoBase - descFabrica);
  const outrosCustos = (precoComDesconto * Math.max(0, params.outrosCustosPercent || 0)) / 100;
  const frete = Math.max(0, params.freteValor || 0);

  // Calcula o impacto de todos os Custos Ativos da Tarkett definidos pelo Diretor Éder Perez
  const ativos = (params.custosTarkettAtivos || []).filter((c) => c.status === 'Ativo');
  let totalCustosTarkettM2 = 0;
  const custosTarkettDetalhes = ativos.map((c) => {
    let impactoUnitarioM2 = 0;
    if (c.tipo === '%') {
      impactoUnitarioM2 = Number(((precoComDesconto * Math.max(0, c.valor || 0)) / 100).toFixed(2));
    } else {
      const qtdDiluicao = c.quantidadeM2 && c.quantidadeM2 > 0 ? c.quantidadeM2 : 1;
      impactoUnitarioM2 = c.custoPorM2Diluido > 0 ? c.custoPorM2Diluido : Number((c.valor / qtdDiluicao).toFixed(2));
    }
    totalCustosTarkettM2 += impactoUnitarioM2;
    return {
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      valor: c.valor,
      impactoUnitarioM2,
    };
  });

  totalCustosTarkettM2 = Number(totalCustosTarkettM2.toFixed(2));

  // Custo unitário líquido com todos os custos ativos da Tarkett incorporados
  const custoLiquido = Number((precoComDesconto + outrosCustos + frete + totalCustosTarkettM2).toFixed(2));
  const qtdM2 = Math.max(0.01, params.quantidadeDesejadaM2 ?? 1);
  const custoLiquidoTotal = Number((custoLiquido * qtdM2).toFixed(2));
  const totalCustosTarkettTotal = Number((totalCustosTarkettM2 * qtdM2).toFixed(2));

  const calcPerfil = (margemPercent: number) => {
    const m = Math.min(99, Math.max(0, margemPercent));
    // Preço de venda unitário = Custo Líquido / (1 - Margem/100)
    const divisor = 1 - m / 100;
    const precoVenda = divisor > 0 ? Number((custoLiquido / divisor).toFixed(2)) : custoLiquido;
    const lucro = Number((precoVenda - custoLiquido).toFixed(2));
    const margemEfetiva = precoVenda > 0 ? Number(((lucro / precoVenda) * 100).toFixed(2)) : 0;
    const precoVendaTotal = Number((precoVenda * qtdM2).toFixed(2));
    const lucroTotal = Number((lucro * qtdM2).toFixed(2));
    return { precoVenda, precoVendaTotal, lucro, lucroTotal, margemEfetiva };
  };

  return {
    quantidadeM2: qtdM2,
    custoLiquido,
    custoLiquidoTotal,
    totalCustosTarkettM2,
    totalCustosTarkettTotal,
    custosTarkettDetalhes,
    clienteFinal: calcPerfil(params.margemClienteFinalPercent),
    revenda: calcPerfil(params.margemRevendaPercent),
    construtora: calcPerfil(params.margemConstrutoraPercent),
  };
}

// =========================================================================
// SERVIÇOS DE PERSISTÊNCIA OFICIAIS NO SUPABASE
// =========================================================================

/**
 * Carrega a coleção do Supabase (com cache local transparente)
 */
async function loadCollectionFromSupabase<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: row, error } = await supabase
        .from('fenix_kv_store')
        .select('data')
        .eq('key', key)
        .maybeSingle();

      if (!error && row && row.data !== undefined) {
        try {
          localStorage.setItem(key, JSON.stringify(row.data));
        } catch {}
        return row.data as T;
      }
    } catch (err) {
      console.warn(`Erro ao carregar chave ${key} do Supabase:`, err);
    }
  }

  // Fallback cache local
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {}
  }

  return defaultValue;
}

/**
 * Salva com validação rigorosa de permissão do Diretor Éder Perez
 */
async function saveCollectionToSupabaseEderOnly<T>(
  key: string,
  data: T,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Ação bloqueada: Somente o Diretor Geral Éder Perez pode alterar as configurações de Custos.',
    };
  }

  const res = await saveWholeCollectionToSupabase(key, data, currentUserName);
  if (res.success && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_CUSTOS_CONFIG_UPDATED));
  }
  return res;
}

// 1. Estrutura
export async function getCustosEstrutura(): Promise<CustoEstruturaItem[]> {
  return loadCollectionFromSupabase(KEY_CUSTOS_ESTRUTURA, DEFAULT_ESTRUTURA_ITEMS);
}

export async function saveCustosEstrutura(
  items: CustoEstruturaItem[],
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  return saveCollectionToSupabaseEderOnly(KEY_CUSTOS_ESTRUTURA, items, currentUserName);
}

// 2. Rateio
export async function getRateioConfig(): Promise<RateioConfig> {
  return loadCollectionFromSupabase(KEY_CUSTOS_RATEIO, DEFAULT_RATEIO_CONFIG);
}

export async function saveRateioConfig(
  config: RateioConfig,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  return saveCollectionToSupabaseEderOnly(KEY_CUSTOS_RATEIO, config, currentUserName);
}

// 3. Custos do Pedido
export async function getCustosPedidoRegras(): Promise<RegraCustoPedido[]> {
  return loadCollectionFromSupabase(KEY_CUSTOS_PEDIDO_REGRAS, DEFAULT_CUSTOS_PEDIDO_REGRAS);
}

export async function saveCustosPedidoRegras(
  regras: RegraCustoPedido[],
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  return saveCollectionToSupabaseEderOnly(KEY_CUSTOS_PEDIDO_REGRAS, regras, currentUserName);
}

// 4. Nota Fiscal
export async function getNotaFiscalConfig(): Promise<NotaFiscalConfig> {
  return loadCollectionFromSupabase(KEY_CUSTOS_NOTA_FISCAL, DEFAULT_NOTA_FISCAL_CONFIG);
}

export async function saveNotaFiscalConfig(
  config: NotaFiscalConfig,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  return saveCollectionToSupabaseEderOnly(KEY_CUSTOS_NOTA_FISCAL, config, currentUserName);
}

// 5. Taxas de Pagamento
export async function getTaxasPagamentoConfig(): Promise<TaxasPagamentoConfig> {
  return loadCollectionFromSupabase(KEY_CUSTOS_PAGAMENTOS, DEFAULT_TAXAS_PAGAMENTO_CONFIG);
}

export async function saveTaxasPagamentoConfig(
  config: TaxasPagamentoConfig,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  return saveCollectionToSupabaseEderOnly(KEY_CUSTOS_PAGAMENTOS, config, currentUserName);
}

// 6. Comissões
export async function getComissoesConfig(): Promise<ComissaoResponsavelConfig[]> {
  const list = await loadCollectionFromSupabase(KEY_CUSTOS_COMISSOES, DEFAULT_COMISSOES_CONFIG);
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_COMISSOES_CONFIG;
  }

  // 6. COMISSÃO PADRÃO POR USUÁRIO:
  // Garantir Vanessa: 1%, Jhessica: 1%, Éder: 0%, Jeferson: 0%
  let changed = false;
  const updated = list.map((c) => {
    const nomeLower = (c.nome || '').toLowerCase();
    if (nomeLower.includes('eder') && c.comissaoPadraoPercent !== 0) {
      changed = true;
      return { ...c, comissaoPadraoPercent: 0 };
    }
    if (nomeLower.includes('vanessa') && (c.comissaoPadraoPercent === 2.5 || c.comissaoPadraoPercent === undefined)) {
      changed = true;
      return { ...c, comissaoPadraoPercent: 1.0 };
    }
    if (nomeLower.includes('jhessica') && (c.comissaoPadraoPercent === 2.5 || c.comissaoPadraoPercent === undefined)) {
      changed = true;
      return { ...c, comissaoPadraoPercent: 1.0 };
    }
    if (nomeLower.includes('jeferson') && (c.comissaoPadraoPercent === 1.5 || c.comissaoPadraoPercent === undefined)) {
      changed = true;
      return { ...c, comissaoPadraoPercent: 0 };
    }
    return c;
  });

  if (changed) {
    saveCollectionToSupabaseEderOnly(KEY_CUSTOS_COMISSOES, updated, 'Sistema');
  }

  return updated;
}

export async function saveComissoesConfig(
  comissoes: ComissaoResponsavelConfig[],
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  return saveCollectionToSupabaseEderOnly(KEY_CUSTOS_COMISSOES, comissoes, currentUserName);
}

// 7. Marketplace
export async function getMarketplaceConfig(): Promise<MarketplaceConfig> {
  return loadCollectionFromSupabase(KEY_CUSTOS_MARKETPLACE, DEFAULT_MARKETPLACE_CONFIG);
}

export async function saveMarketplaceConfig(
  config: MarketplaceConfig,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  return saveCollectionToSupabaseEderOnly(KEY_CUSTOS_MARKETPLACE, config, currentUserName);
}

// 8. Tarkett Simulações
export async function getTarkettSimulacoes(): Promise<TarkettSimulacaoItem[]> {
  return loadCollectionFromSupabase(KEY_TARKETT_SIMULACOES, []);
}

export async function saveNovaTarkettSimulacao(
  simulacao: TarkettSimulacaoItem,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Apenas o Diretor Éder Perez possui autorização para gravar simulações oficiais Tarkett.',
    };
  }

  const historico = await getTarkettSimulacoes();
  const novoHistorico = [simulacao, ...historico];
  return saveWholeCollectionToSupabase(KEY_TARKETT_SIMULACOES, novoHistorico, currentUserName);
}

export async function deleteTarkettSimulacao(
  id: string,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Apenas o Diretor Éder Perez pode excluir simulações do histórico.',
    };
  }
  const historico = await getTarkettSimulacoes();
  const novoHistorico = historico.filter((s) => s.id !== id);
  return saveWholeCollectionToSupabase(KEY_TARKETT_SIMULACOES, novoHistorico, currentUserName);
}

// 9. Custos Tarkett (Configurações -> Custos -> Tarkett)
// Gerenciado exclusivamente pelo Diretor Éder Perez com diluição por m²
export interface CustoTarkettItem {
  id: string;
  nome: string;
  tipo: 'R$' | '%';
  valor: number;
  quantidadeM2: number; // CAMPO OBRIGATÓRIO: "Quantidade de m²" para diluição do custo
  custoPorM2Diluido: number; // Valor diluído por m²
  status: 'Ativo' | 'Inativo';
  observacao?: string;
  criadoPor?: string;
  atualizadoEm?: string;
}

export const DEFAULT_CUSTOS_TARKETT_ITENS: CustoTarkettItem[] = [
  {
    id: 'tar-custo-frete-fabrica',
    nome: 'Frete de Carga da Fábrica (Lote)',
    tipo: 'R$',
    valor: 1200,
    quantidadeM2: 300,
    custoPorM2Diluido: 4.0,
    status: 'Ativo',
    observacao: 'Custo diluído pelo lote de 300 m²',
  },
  {
    id: 'tar-custo-descarga-palete',
    nome: 'Descarga e Movimentação em Galpão',
    tipo: 'R$',
    valor: 350,
    quantidadeM2: 250,
    custoPorM2Diluido: 1.4,
    status: 'Ativo',
    observacao: 'Manuseio e armazenagem por m²',
  },
  {
    id: 'tar-custo-perda-corte',
    nome: 'Margem Técnica de Quebra/Perda',
    tipo: '%',
    valor: 3.0,
    quantidadeM2: 100,
    custoPorM2Diluido: 3.0,
    status: 'Ativo',
    observacao: 'Reserva percentual de corte',
  },
];

export const EVENT_CUSTOS_TARKETT_UPDATED = 'fenix_custos_tarkett_updated';

export async function getCustosTarkettItens(): Promise<CustoTarkettItem[]> {
  return loadCollectionFromSupabase(KEY_CUSTOS_TARKETT_ITENS, DEFAULT_CUSTOS_TARKETT_ITENS);
}

export async function saveCustosTarkettItens(
  items: CustoTarkettItem[],
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Ação bloqueada no banco de dados: Somente o Diretor Geral Éder Perez possui permissão para gerenciar os Custos Tarkett.',
    };
  }

  const res = await saveCollectionToSupabaseEderOnly(KEY_CUSTOS_TARKETT_ITENS, items, currentUserName);
  if (res.success && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_CUSTOS_TARKETT_UPDATED));
    window.dispatchEvent(new Event(EVENT_CUSTOS_CONFIG_UPDATED));
  }
  return res;
}

export async function addCustoTarkett(
  item: Omit<CustoTarkettItem, 'id'>,
  currentUserName: string
): Promise<{ success: boolean; error?: string; newItem?: CustoTarkettItem }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Ação bloqueada: Somente o Diretor Geral Éder Perez pode cadastrar novos custos Tarkett.',
    };
  }

  const current = await getCustosTarkettItens();
  const qtdDiluicao = item.quantidadeM2 && item.quantidadeM2 > 0 ? item.quantidadeM2 : 1;
  const diluido = item.tipo === 'R$'
    ? Number((item.valor / qtdDiluicao).toFixed(2))
    : item.valor;

  const newItem: CustoTarkettItem = {
    ...item,
    id: `tar-custo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    custoPorM2Diluido: diluido,
    criadoPor: currentUserName,
    atualizadoEm: new Date().toISOString(),
  };

  const updated = [...current, newItem];
  const saveRes = await saveCustosTarkettItens(updated, currentUserName);
  if (!saveRes.success) return saveRes;

  return { success: true, newItem };
}

export async function updateCustoTarkett(
  item: CustoTarkettItem,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Ação bloqueada: Somente o Diretor Geral Éder Perez pode editar custos Tarkett.',
    };
  }

  const current = await getCustosTarkettItens();
  const qtdDiluicao = item.quantidadeM2 && item.quantidadeM2 > 0 ? item.quantidadeM2 : 1;
  const diluido = item.tipo === 'R$'
    ? Number((item.valor / qtdDiluicao).toFixed(2))
    : item.valor;

  const updatedItem: CustoTarkettItem = {
    ...item,
    custoPorM2Diluido: diluido,
    atualizadoEm: new Date().toISOString(),
  };

  const updatedList = current.map((c) => (c.id === item.id ? updatedItem : c));
  return saveCustosTarkettItens(updatedList, currentUserName);
}

export async function deleteCustoTarkett(
  id: string,
  currentUserName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Ação bloqueada: Somente o Diretor Geral Éder Perez pode excluir custos Tarkett.',
    };
  }

  const current = await getCustosTarkettItens();
  const updatedList = current.filter((c) => c.id !== id);
  return saveCustosTarkettItens(updatedList, currentUserName);
}

export async function toggleStatusCustoTarkett(
  id: string,
  currentUserName: string
): Promise<{ success: boolean; error?: string; novoStatus?: 'Ativo' | 'Inativo' }> {
  if (!isEderPerez(currentUserName)) {
    return {
      success: false,
      error: 'Ação bloqueada: Somente o Diretor Geral Éder Perez pode alterar o status de custos Tarkett.',
    };
  }

  const current = await getCustosTarkettItens();
  let novoStatus: 'Ativo' | 'Inativo' = 'Ativo';
  const updatedList = current.map((c) => {
    if (c.id === id) {
      novoStatus = c.status === 'Ativo' ? 'Inativo' : 'Ativo';
      return {
        ...c,
        status: novoStatus,
        atualizadoEm: new Date().toISOString(),
      };
    }
    return c;
  });

  const res = await saveCustosTarkettItens(updatedList, currentUserName);
  if (!res.success) return res;

  return { success: true, novoStatus };
}

