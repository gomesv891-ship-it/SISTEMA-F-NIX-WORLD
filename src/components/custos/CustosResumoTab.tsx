import React from 'react';
import {
  DollarSign,
  Building2,
  PieChart,
  FileText,
  CreditCard,
  Users,
  Store,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import {
  CustoEstruturaItem,
  RateioConfig,
  RegraCustoPedido,
  NotaFiscalConfig,
  TaxasPagamentoConfig,
  ComissaoResponsavelConfig,
  MarketplaceConfig,
  calcularIndicadoresRateio,
} from '../../utils/costsConfigService';

interface CustosResumoTabProps {
  estrutura: CustoEstruturaItem[];
  rateioConfig: RateioConfig;
  regrasPedido: RegraCustoPedido[];
  nfConfig: NotaFiscalConfig;
  taxasPagamento: TaxasPagamentoConfig;
  comissoes: ComissaoResponsavelConfig[];
  marketplace: MarketplaceConfig;
  onNavigateTab: (tab: string) => void;
  isDirector: boolean;
}

export const CustosResumoTab: React.FC<CustosResumoTabProps> = ({
  estrutura,
  rateioConfig,
  regrasPedido,
  nfConfig,
  taxasPagamento,
  comissoes,
  marketplace,
  onNavigateTab,
  isDirector,
}) => {
  const formatBRL = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const { totalMensalEstrutura, faturamentoBase, pesoEstruturaPercent } =
    calcularIndicadoresRateio(estrutura, rateioConfig.faturamentoBase);

  const totalEstruturaItens = estrutura.length;
  const ativosEstrutura = estrutura.filter((e) => e.status === 'Ativo').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner de Visão Geral com Identidade Fênix */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Painel Central de Custos
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {isDirector ? 'Conexão Ativa' : 'Supabase Conectado'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Gestão Financeira & Parâmetros de Custos Fênix
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Configurações oficiais de estrutura operacional, rateio gerencial, composição de
              pedidos, impostos fiscais, taxas financeiras, comissões de equipe, canais de
              marketplace e formação de preço Tarkett.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/10">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-left">
              <div className="text-xs text-slate-300 font-medium">Controle de Segurança</div>
              <div className="text-sm font-bold text-white">
                {isDirector ? 'Éder Perez (Diretoria)' : 'Modo Leitura'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estrutura Operacional */}
        <div
          onClick={() => onNavigateTab('Estrutura')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Estrutura Mensal
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatBRL(totalMensalEstrutura)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{ativosEstrutura} itens ativos</span>
              <span className="text-blue-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Peso do Rateio */}
        <div
          onClick={() => onNavigateTab('Rateio')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Peso da Estrutura
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-700">{pesoEstruturaPercent}%</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Fat. Base: {formatBRL(faturamentoBase)}</span>
              <span className="text-blue-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Simular <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Nota Fiscal & Meios Pagamento */}
        <div
          onClick={() => onNavigateTab('Nota Fiscal')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Imposto NF Padrão
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-700">
              {nfConfig.aliquotaPadraoPercent}%
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{nfConfig.emissaoObrigatoria ? 'Obrigatória' : 'Opcional'}</span>
              <span className="text-blue-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Ajustar <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Tarkett Formação de Preço */}
        <div
          onClick={() => onNavigateTab('Tarkett')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tarkett Preços
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">Simulador</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Cliente Final, Rev. & Const.</span>
              <span className="text-blue-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Acessar <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Resumo Rápido em Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel Esquerdo: Resumo de Composição & Meios de Pagamento */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm">Taxas de Pagamento Ativas</h3>
            </div>
            <button
              onClick={() => onNavigateTab('Taxas de Pagamento')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Gerenciar taxas <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-medium">PIX</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {taxasPagamento.pixPercent}%
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-medium">Boleto</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {formatBRL(taxasPagamento.boletoFixo)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-medium">Débito</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {taxasPagamento.debitoPercent}%
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-medium">Crédito 1x</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {taxasPagamento.cartaoParcelas[1] || 2.99}%
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            Parcelamento de 2x a 12x configurado com taxas progressivas de{' '}
            <strong className="text-slate-700">{taxasPagamento.cartaoParcelas[2] || 3.49}%</strong> a{' '}
            <strong className="text-slate-700">{taxasPagamento.cartaoParcelas[12] || 8.49}%</strong>.
            Aplicadas automaticamente nos novos pedidos.
          </div>
        </div>

        {/* Painel Direito: Marketplace & Comissões */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-slate-800 text-sm">Marketplace (Jeferson Trolesi)</h3>
            </div>
            <button
              onClick={() => onNavigateTab('Marketplace')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Configurar canais <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-orange-700">Shopee</span>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md font-bold">
                  {marketplace.shopee.comissaoPercent}%
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-2 space-y-1">
                <div>Ads: {marketplace.shopee.adsPercent}%</div>
                <div>Taxa Fixa: {formatBRL(marketplace.shopee.taxaFixaPorVenda)}</div>
              </div>
            </div>

            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-700">Mercado Livre</span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                  {marketplace.mercadoLivre.comissaoPercent}%
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-2 space-y-1">
                <div>Ads: {marketplace.mercadoLivre.adsPercent}%</div>
                <div>Taxa Fixa: {formatBRL(marketplace.mercadoLivre.taxaFixaPorVenda)}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>
              <strong>Regra estrita:</strong> Vendas de Marketplace não recebem aplicação automática
              de taxa de maquininha de cartão.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
