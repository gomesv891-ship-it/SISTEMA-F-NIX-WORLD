import React, { useState } from 'react';
import {
  Store,
  Percent,
  DollarSign,
  Lock,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  Truck,
  Megaphone,
} from 'lucide-react';
import {
  MarketplaceConfig,
  MarketplaceCanalConfig,
  saveMarketplaceConfig,
} from '../../utils/costsConfigService';

interface CustosMarketplaceTabProps {
  marketplace: MarketplaceConfig;
  setMarketplace: React.Dispatch<React.SetStateAction<MarketplaceConfig>>;
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosMarketplaceTab: React.FC<CustosMarketplaceTabProps> = ({
  marketplace,
  setMarketplace,
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [shopeeComissao, setShopeeComissao] = useState(
    marketplace.shopee.comissaoPercent.toString().replace('.', ',')
  );
  const [shopeeFrete, setShopeeFrete] = useState(
    marketplace.shopee.freteEnvioValor.toFixed(2).replace('.', ',')
  );
  const [shopeeSubsidio, setShopeeSubsidio] = useState(
    marketplace.shopee.subsidioFrete.toFixed(2).replace('.', ',')
  );
  const [shopeeAds, setShopeeAds] = useState(
    marketplace.shopee.adsPercent.toString().replace('.', ',')
  );
  const [shopeeTaxaFixa, setShopeeTaxaFixa] = useState(
    marketplace.shopee.taxaFixaPorVenda.toFixed(2).replace('.', ',')
  );

  const [mlComissao, setMlComissao] = useState(
    marketplace.mercadoLivre.comissaoPercent.toString().replace('.', ',')
  );
  const [mlFrete, setMlFrete] = useState(
    marketplace.mercadoLivre.freteEnvioValor.toFixed(2).replace('.', ',')
  );
  const [mlSubsidio, setMlSubsidio] = useState(
    marketplace.mercadoLivre.subsidioFrete.toFixed(2).replace('.', ',')
  );
  const [mlAds, setMlAds] = useState(
    marketplace.mercadoLivre.adsPercent.toString().replace('.', ',')
  );
  const [mlTaxaFixa, setMlTaxaFixa] = useState(
    marketplace.mercadoLivre.taxaFixaPorVenda.toFixed(2).replace('.', ',')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const parseVal = (str: string) =>
    parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setErrorMsg('Somente o Diretor Geral Éder Perez pode alterar os parâmetros de Marketplace.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const novaConfig: MarketplaceConfig = {
        shopee: {
          ...marketplace.shopee,
          responsavel: 'Jeferson Trolesi',
          comissaoPercent: Number(parseVal(shopeeComissao).toFixed(2)),
          freteEnvioValor: Number(parseVal(shopeeFrete).toFixed(2)),
          subsidioFrete: Number(parseVal(shopeeSubsidio).toFixed(2)),
          adsPercent: Number(parseVal(shopeeAds).toFixed(2)),
          taxaFixaPorVenda: Number(parseVal(shopeeTaxaFixa).toFixed(2)),
        },
        mercadoLivre: {
          ...marketplace.mercadoLivre,
          responsavel: 'Jeferson Trolesi',
          comissaoPercent: Number(parseVal(mlComissao).toFixed(2)),
          freteEnvioValor: Number(parseVal(mlFrete).toFixed(2)),
          subsidioFrete: Number(parseVal(mlSubsidio).toFixed(2)),
          adsPercent: Number(parseVal(mlAds).toFixed(2)),
          taxaFixaPorVenda: Number(parseVal(mlTaxaFixa).toFixed(2)),
        },
        atualizadoEm: new Date().toISOString(),
      };

      const res = await saveMarketplaceConfig(novaConfig, currentUserName);
      if (res.success) {
        setMarketplace(novaConfig);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (showToast) showToast('Parâmetros de Marketplace atualizados no Supabase!', 'success');
      } else {
        setErrorMsg(res.error || 'Erro ao persistir no Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao salvar parâmetros de marketplace.');
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
              <Store className="w-5 h-5 text-orange-600" />
              Canais de Marketplace (Shopee & Mercado Livre)
            </h2>
            <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full font-bold border border-orange-100">
              Responsável: Jeferson Trolesi
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Deduções automáticas de comissões de canal, fretes, subsídios e despesas de publicidade (Ads).
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

      {/* Alerta da Regra Específica */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold">Regra Operacional Obrigatória:</div>
          <p>
            Vendas originadas pelos canais de Marketplace (Shopee e Mercado Livre) possuem retenção
            direta pelas plataformas e <strong>não devem receber aplicação automática de taxas de maquininha de cartão</strong>.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Shopee */}
          <div className="bg-white rounded-2xl p-6 border border-orange-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-orange-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm border border-orange-200">
                  SH
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Shopee Brasil</h3>
                  <div className="text-xs text-slate-500">Operador: Jeferson Trolesi</div>
                </div>
              </div>
              <span className="text-xs bg-orange-100 text-orange-800 font-bold px-2.5 py-0.5 rounded-full">
                Canal Ativo
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Comissão do Canal (%) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isDirector}
                    value={shopeeComissao}
                    onChange={(e) => setShopeeComissao(e.target.value)}
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ads Estimado (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={shopeeAds}
                      onChange={(e) => setShopeeAds(e.target.value)}
                      className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taxa Fixa / Item (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={shopeeTaxaFixa}
                      onChange={(e) => setShopeeTaxaFixa(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Frete Envio Médio (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={shopeeFrete}
                      onChange={(e) => setShopeeFrete(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subsídio de Frete (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={shopeeSubsidio}
                      onChange={(e) => setShopeeSubsidio(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Mercado Livre */}
          <div className="bg-white rounded-2xl p-6 border border-amber-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm border border-amber-200">
                  ML
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Mercado Livre</h3>
                  <div className="text-xs text-slate-500">Operador: Jeferson Trolesi</div>
                </div>
              </div>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                Canal Ativo
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Comissão do Canal (%) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isDirector}
                    value={mlComissao}
                    onChange={(e) => setMlComissao(e.target.value)}
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ads Estimado (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={mlAds}
                      onChange={(e) => setMlAds(e.target.value)}
                      className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taxa Fixa / Item (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={mlTaxaFixa}
                      onChange={(e) => setMlTaxaFixa(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Frete Envio Médio (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={mlFrete}
                      onChange={(e) => setMlFrete(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subsídio de Frete (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={mlSubsidio}
                      onChange={(e) => setMlSubsidio(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isDirector && (
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Valores oficiais atualizados diretamente no banco de dados Supabase da Fênix.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                'Salvando...'
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> Salvo com Sucesso!
                </>
              ) : (
                'Salvar Configurações de Marketplace'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
