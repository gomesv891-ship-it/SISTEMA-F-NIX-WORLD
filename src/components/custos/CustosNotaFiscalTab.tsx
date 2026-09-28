import React, { useState } from 'react';
import {
  FileText,
  Percent,
  Lock,
  Check,
  AlertTriangle,
  Info,
  Building2,
  Store,
  ShieldCheck,
} from 'lucide-react';
import {
  NotaFiscalConfig,
  saveNotaFiscalConfig,
} from '../../utils/costsConfigService';

interface CustosNotaFiscalTabProps {
  nfConfig: NotaFiscalConfig;
  setNfConfig: React.Dispatch<React.SetStateAction<NotaFiscalConfig>>;
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosNotaFiscalTab: React.FC<CustosNotaFiscalTabProps> = ({
  nfConfig,
  setNfConfig,
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [aliquotaPadrao, setAliquotaPadrao] = useState(
    nfConfig.aliquotaPadraoPercent.toString().replace('.', ',')
  );
  const [aliquotaComercial, setAliquotaComercial] = useState(
    nfConfig.aliquotaComercialPercent.toString().replace('.', ',')
  );
  const [aliquotaMarketplace, setAliquotaMarketplace] = useState(
    nfConfig.aliquotaMarketplacePercent.toString().replace('.', ',')
  );
  const [emissaoObrigatoria, setEmissaoObrigatoria] = useState(
    nfConfig.emissaoObrigatoria
  );
  const [observacoes, setObservacoes] = useState(nfConfig.observacoes || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setErrorMsg('Somente o Diretor Geral Éder Perez pode alterar a configuração de Nota Fiscal.');
      return;
    }

    const pPadrao = parseFloat(aliquotaPadrao.replace(/\./g, '').replace(',', '.'));
    const pComercial = parseFloat(aliquotaComercial.replace(/\./g, '').replace(',', '.'));
    const pMkt = parseFloat(aliquotaMarketplace.replace(/\./g, '').replace(',', '.'));

    if (isNaN(pPadrao) || pPadrao < 0 || isNaN(pComercial) || pComercial < 0 || isNaN(pMkt) || pMkt < 0) {
      setErrorMsg('Informe alíquotas percentuais válidas maiores ou iguais a zero.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const novaConfig: NotaFiscalConfig = {
        aliquotaPadraoPercent: Number(pPadrao.toFixed(2)),
        aliquotaComercialPercent: Number(pComercial.toFixed(2)),
        aliquotaMarketplacePercent: Number(pMkt.toFixed(2)),
        emissaoObrigatoria,
        observacoes: observacoes.trim() || undefined,
        atualizadoEm: new Date().toISOString(),
      };

      const res = await saveNotaFiscalConfig(novaConfig, currentUserName);
      if (res.success) {
        setNfConfig(novaConfig);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (showToast) showToast('Configurações de Nota Fiscal salvas no Supabase!', 'success');
      } else {
        setErrorMsg(res.error || 'Erro ao persistir no Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar Nota Fiscal.');
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
              <FileText className="w-5 h-5 text-purple-600" />
              Tributação & Nota Fiscal (NF)
            </h2>
            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold border border-purple-100">
              Alíquota Oficial: {nfConfig.aliquotaPadraoPercent}%
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Define a incidência tributária padrão apurada sobre os pedidos de venda e canais.
          </p>
        </div>

        <div>
          {!isDirector && (
            <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Somente Diretor Éder pode alterar
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Alíquotas de Imposto por Canal</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Os percentuais serão aplicados automaticamente sobre o valor faturado nos novos
              pedidos.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alíquota Geral Padrão (%) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isDirector}
                    value={aliquotaPadrao}
                    onChange={(e) => setAliquotaPadrao(e.target.value)}
                    className="w-full pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Referência geral da empresa</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Canal Comercial (%) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isDirector}
                    value={aliquotaComercial}
                    onChange={(e) => setAliquotaComercial(e.target.value)}
                    className="w-full pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Vendas diretas & consultores</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Marketplace (%) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isDirector}
                    value={aliquotaMarketplace}
                    onChange={(e) => setAliquotaMarketplace(e.target.value)}
                    className="w-full pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Shopee e Mercado Livre</span>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isDirector}
                  checked={emissaoObrigatoria}
                  onChange={(e) => setEmissaoObrigatoria(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer disabled:opacity-60"
                />
                <span>Exigir emissão de Nota Fiscal em 100% dos novos pedidos faturados</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações Fiscais & Instruções
              </label>
              <textarea
                rows={3}
                disabled={!isDirector}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Simples Nacional Anexo II / Comércio..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:opacity-60"
              />
            </div>

            {isDirector && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    'Gravando no Supabase...'
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" /> Salvo com Sucesso!
                    </>
                  ) : (
                    'Salvar Configuração Fiscal'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Card Explicativo Lateral */}
        <div className="space-y-4">
          <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 space-y-3">
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> Regra de Preservação Histórica
            </h4>
            <p className="text-xs text-purple-800 leading-relaxed">
              As alterações nas alíquotas de imposto entrarão em vigor <strong>somente para novos cálculos de pedidos</strong>.
            </p>
            <p className="text-xs text-purple-800 leading-relaxed">
              Pedidos antigos e orçamentos já consolidados mantêm intactos os valores fiscais
              registrados no momento de sua emissão.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs text-slate-600">
            <div className="font-bold text-slate-800">Simulação de Exemplo:</div>
            <div>Venda: <strong>R$ 1.000,00</strong></div>
            <div>Alíquota NF ({aliquotaPadrao}%): <strong className="text-purple-700">R$ {((1000 * (parseFloat(aliquotaPadrao) || 0)) / 100).toFixed(2)}</strong></div>
            <div className="text-[11px] text-slate-400 mt-2">
              Lançado automaticamente como item do pedido na categoria &quot;Nota Fiscal&quot;.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
