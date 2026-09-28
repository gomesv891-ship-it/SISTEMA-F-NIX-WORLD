import React, { useState } from 'react';
import {
  PieChart,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  Check,
  Sliders,
  Percent,
  Layers,
  Info,
} from 'lucide-react';
import {
  CustoEstruturaItem,
  RateioConfig,
  calcularIndicadoresRateio,
  saveRateioConfig,
} from '../../utils/costsConfigService';

interface CustosRateioTabProps {
  estrutura: CustoEstruturaItem[];
  rateioConfig: RateioConfig;
  setRateioConfig: React.Dispatch<React.SetStateAction<RateioConfig>>;
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosRateioTab: React.FC<CustosRateioTabProps> = ({
  estrutura,
  rateioConfig,
  setRateioConfig,
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [faturamentoInput, setFaturamentoInput] = useState(
    rateioConfig.faturamentoBase.toFixed(2).replace('.', ',')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [simuladorFat, setSimuladorFat] = useState(rateioConfig.faturamentoBase);

  const formatBRL = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const { totalMensalEstrutura, faturamentoBase, pesoEstruturaPercent, custosPorCategoria } =
    calcularIndicadoresRateio(estrutura, rateioConfig.faturamentoBase);

  // Cenário do simulador dinâmico
  const pesoSimulado =
    simuladorFat > 0 ? Number(((totalMensalEstrutura / simuladorFat) * 100).toFixed(2)) : 0;

  const handleSalvarFaturamentoBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode alterar o faturamento-base.', 'error');
      return;
    }

    const valNum = parseFloat(faturamentoInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) {
      if (showToast) showToast('Informe um faturamento-base válido maior que zero.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const novaConfig: RateioConfig = {
        ...rateioConfig,
        faturamentoBase: Number(valNum.toFixed(2)),
        atualizadoEm: new Date().toISOString(),
      };

      const res = await saveRateioConfig(novaConfig, currentUserName);
      if (res.success) {
        setRateioConfig(novaConfig);
        setSimuladorFat(novaConfig.faturamentoBase);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (showToast) showToast('Faturamento-base de rateio atualizado no Supabase!', 'success');
      } else {
        if (showToast) showToast(res.error || 'Erro ao salvar rateio.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Erro ao persistir rateio.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Aviso de Governança */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Rateio Gerencial da Estrutura
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-100">
              Uso Estritamente Gerencial
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Cálculo do peso relativo dos custos operacionais fixos sobre o faturamento mensal da
            empresa.
          </p>
        </div>

        <div className="text-xs bg-amber-50 text-amber-800 px-3.5 py-2 rounded-xl font-medium flex items-center gap-2 border border-amber-200">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>O rateio não entra na formação direta dos pedidos de venda.</span>
        </div>
      </div>

      {/* Grid com a Fórmula e Indicadores Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bloco 1: Custo Mensal da Estrutura */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Custo Mensal da Estrutura
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {formatBRL(totalMensalEstrutura)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Somatório de todos os custos operacionais ativos convertidos em base mensal.
          </p>
        </div>

        {/* Bloco 2: Faturamento-Base Oficial */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Faturamento-Base Referência
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-700 mt-2">
            {formatBRL(faturamentoBase)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Meta ou faturamento médio mensal adotado pela diretoria para rateio.
          </p>
        </div>

        {/* Bloco 3: Peso da Estrutura (%) */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-2xl p-5 shadow-md">
          <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
            Peso da Estrutura
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white mt-1">
            {pesoEstruturaPercent}%
          </div>
          <div className="text-xs text-blue-200 mt-2 font-mono">
            Peso = (Custo Mensal ÷ Faturamento-Base) × 100
          </div>
        </div>
      </div>

      {/* Seção 2: Configuração do Faturamento-Base (Exclusivo Éder) & Simulação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel Esquerdo: Ajuste do Faturamento-Base Oficial */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Configurar Faturamento-Base Oficial
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina o valor base de faturamento mensal utilizado para cálculo oficial do peso da
              estrutura.
            </p>
          </div>

          <form onSubmit={handleSalvarFaturamentoBase} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Faturamento-Base Mensal (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  disabled={!isDirector}
                  value={faturamentoInput}
                  onChange={(e) => setFaturamentoInput(e.target.value)}
                  placeholder="120.000,00"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {isDirector ? (
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  'Salvando no Supabase...'
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" /> Salvo com Sucesso!
                  </>
                ) : (
                  'Salvar Novo Faturamento-Base'
                )}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-slate-100 text-slate-500 text-xs text-center font-medium">
                Somente o Diretor Geral Éder Perez pode alterar o faturamento-base oficial.
              </div>
            )}
          </form>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <div className="text-xs font-bold text-slate-700">Interpretação Gerencial:</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para cada <strong>R$ 100,00</strong> faturados pela Fênix World, aproximadamente{' '}
              <strong className="text-blue-700 font-bold">R$ {pesoEstruturaPercent.toFixed(2)}</strong>{' '}
              são absorvidos para cobrir as despesas operacionais da empresa (aluguel, salários,
              energia, sistemas, etc.).
            </p>
          </div>
        </div>

        {/* Painel Direito: Simulador de Cenários de Faturamento */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              Simulador de Sensibilidade de Faturamento
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simule como o peso percentual da estrutura varia em diferentes níveis de receita.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Faturamento Simulado:</span>
              <span className="text-sm text-purple-700">{formatBRL(simuladorFat)}</span>
            </div>

            <input
              type="range"
              min={30000}
              max={300000}
              step={5000}
              value={simuladorFat}
              onChange={(e) => setSimuladorFat(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>R$ 30k</span>
              <span>R$ 100k</span>
              <span>R$ 200k</span>
              <span>R$ 300k</span>
            </div>

            {/* Resultado do Cenário Simulado */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-800 font-medium">Peso Estimado no Cenário</div>
                <div className="text-2xl font-black text-purple-900 mt-0.5">{pesoSimulado}%</div>
              </div>
              <div className="text-right text-xs text-purple-700">
                <div>Custo Fixo: {formatBRL(totalMensalEstrutura)}</div>
                <div className="font-semibold">
                  {pesoSimulado > 25
                    ? '⚠️ Atenção: Peso Elevado'
                    : pesoSimulado > 15
                    ? '🟡 Peso Moderado'
                    : '🟢 Peso Saudável'}
                </div>
              </div>
            </div>
          </div>

          {/* Decomposição por Categorias */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-700">
              Participação das Maiores Despesas no Custo:
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {custosPorCategoria.slice(0, 5).map((cat) => (
                <div
                  key={cat.categoria}
                  className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg"
                >
                  <span className="font-medium text-slate-700">{cat.categoria}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{formatBRL(cat.totalMensal)}</span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                      {cat.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
