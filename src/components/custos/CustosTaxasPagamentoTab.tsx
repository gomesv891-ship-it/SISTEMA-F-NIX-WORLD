import React, { useState } from 'react';
import {
  CreditCard,
  Percent,
  DollarSign,
  Lock,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  TaxasPagamentoConfig,
  saveTaxasPagamentoConfig,
} from '../../utils/costsConfigService';

interface CustosTaxasPagamentoTabProps {
  taxasConfig: TaxasPagamentoConfig;
  setTaxasConfig: React.Dispatch<React.SetStateAction<TaxasPagamentoConfig>>;
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosTaxasPagamentoTab: React.FC<CustosTaxasPagamentoTabProps> = ({
  taxasConfig,
  setTaxasConfig,
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [pixPercent, setPixPercent] = useState(
    taxasConfig.pixPercent.toString().replace('.', ',')
  );
  const [pixFixo, setPixFixo] = useState(
    taxasConfig.pixFixo.toFixed(2).replace('.', ',')
  );
  const [boletoFixo, setBoletoFixo] = useState(
    taxasConfig.boletoFixo.toFixed(2).replace('.', ',')
  );
  const [debitoPercent, setDebitoPercent] = useState(
    taxasConfig.debitoPercent.toString().replace('.', ',')
  );

  // Parcelas 1x a 12x
  const [cartaoParcelas, setCartaoParcelas] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (let i = 1; i <= 12; i++) {
      const val = taxasConfig.cartaoParcelas[i] !== undefined ? taxasConfig.cartaoParcelas[i] : 2.99 + (i - 1) * 0.5;
      map[i] = val.toString().replace('.', ',');
    }
    return map;
  });

  const [observacoes, setObservacoes] = useState(taxasConfig.observacoes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleParcelaChange = (parcela: number, value: string) => {
    setCartaoParcelas((prev) => ({ ...prev, [parcela]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setErrorMsg('Somente o Diretor Geral Éder Perez pode alterar as taxas de pagamento.');
      return;
    }

    const pPix = parseFloat(pixPercent.replace(/\./g, '').replace(',', '.'));
    const fPix = parseFloat(pixFixo.replace(/\./g, '').replace(',', '.'));
    const fBoleto = parseFloat(boletoFixo.replace(/\./g, '').replace(',', '.'));
    const pDeb = parseFloat(debitoPercent.replace(/\./g, '').replace(',', '.'));

    const parsedParcelas: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      const raw = cartaoParcelas[i] || '0';
      const parsed = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        setErrorMsg(`Informe uma taxa válida para ${i}x no cartão.`);
        return;
      }
      parsedParcelas[i] = Number(parsed.toFixed(2));
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const novaConfig: TaxasPagamentoConfig = {
        pixPercent: isNaN(pPix) ? 0 : Number(pPix.toFixed(2)),
        pixFixo: isNaN(fPix) ? 0 : Number(fPix.toFixed(2)),
        boletoFixo: isNaN(fBoleto) ? 0 : Number(fBoleto.toFixed(2)),
        debitoPercent: isNaN(pDeb) ? 0 : Number(pDeb.toFixed(2)),
        cartaoParcelas: parsedParcelas,
        observacoes: observacoes.trim() || undefined,
        atualizadoEm: new Date().toISOString(),
      };

      const res = await saveTaxasPagamentoConfig(novaConfig, currentUserName);
      if (res.success) {
        setTaxasConfig(novaConfig);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (showToast) showToast('Taxas de pagamento salvas no Supabase!', 'success');
      } else {
        setErrorMsg(res.error || 'Erro ao persistir taxas no Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao salvar taxas de pagamento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Taxas Financeiras & Meios de Pagamento
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-100">
              PIX, Boleto, Débito & Crédito 1x a 12x
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Define as deduções financeiras aplicadas automaticamente aos novos pedidos conforme
            a forma de pagamento escolhida.
          </p>
        </div>

        <div>
          {!isDirector && (
            <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Somente Diretor Éder pode editar
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Bloco 1: Meios à Vista & Diretos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">
            Pagamentos Diretos (PIX, Boleto & Cartão de Débito)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* PIX % */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIX Taxa Percentual (%)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isDirector}
                  value={pixPercent}
                  onChange={(e) => setPixPercent(e.target.value)}
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
                <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* PIX Fixo R$ */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PIX Custo Fixo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  disabled={!isDirector}
                  value={pixFixo}
                  onChange={(e) => setPixFixo(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Boleto Bancário R$ */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Boleto Bancário Fixo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  disabled={!isDirector}
                  value={boletoFixo}
                  onChange={(e) => setBoletoFixo(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Débito % */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cartão de Débito (%)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isDirector}
                  value={debitoPercent}
                  onChange={(e) => setDebitoPercent(e.target.value)}
                  className="w-full pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
                <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Cartão de Crédito por Parcela (1x a 12x) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Cartão de Crédito — Taxa por Parcela (1x a 12x)
              </h3>
              <p className="text-xs text-slate-500">
                Configuração individual da taxa de intermediação/antecipação para cada número de parcelas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((parcela) => (
              <div
                key={parcela}
                className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{parcela}x</span>
                  <span className="text-[10px] text-slate-400">
                    {parcela === 1 ? 'À vista' : 'Parcelado'}
                  </span>
                </span>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isDirector}
                    value={cartaoParcelas[parcela] || ''}
                    onChange={(e) => handleParcelaChange(parcela, e.target.value)}
                    className="w-full pr-7 pl-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 text-center"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão de Salvar */}
        {isDirector && (
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Valores valem para novos pedidos. Pedidos e simulações antigos preservam taxas originais.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                'Salvando taxas...'
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> Salvo com Sucesso!
                </>
              ) : (
                'Salvar Taxas de Pagamento'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
