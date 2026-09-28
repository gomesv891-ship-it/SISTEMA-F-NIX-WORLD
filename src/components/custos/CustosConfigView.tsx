import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Building2,
  PieChart,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Users,
  Store,
  Calculator,
  ShieldCheck,
  RefreshCw,
  Lock,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  CustoEstruturaItem,
  RateioConfig,
  RegraCustoPedido,
  NotaFiscalConfig,
  TaxasPagamentoConfig,
  ComissaoResponsavelConfig,
  MarketplaceConfig,
  DEFAULT_ESTRUTURA_ITEMS,
  DEFAULT_RATEIO_CONFIG,
  DEFAULT_CUSTOS_PEDIDO_REGRAS,
  DEFAULT_NOTA_FISCAL_CONFIG,
  DEFAULT_TAXAS_PAGAMENTO_CONFIG,
  DEFAULT_COMISSOES_CONFIG,
  DEFAULT_MARKETPLACE_CONFIG,
  getCustosEstrutura,
  getRateioConfig,
  getCustosPedidoRegras,
  getNotaFiscalConfig,
  getTaxasPagamentoConfig,
  getComissoesConfig,
  getMarketplaceConfig,
  EVENT_CUSTOS_CONFIG_UPDATED,
} from '../../utils/costsConfigService';
import { CustosResumoTab } from './CustosResumoTab';
import { CustosEstruturaTab } from './CustosEstruturaTab';
import { CustosRateioTab } from './CustosRateioTab';
import { CustosPedidoTab } from './CustosPedidoTab';
import { CustosNotaFiscalTab } from './CustosNotaFiscalTab';
import { CustosTaxasPagamentoTab } from './CustosTaxasPagamentoTab';
import { CustosComissoesTab } from './CustosComissoesTab';
import { CustosMarketplaceTab } from './CustosMarketplaceTab';
import { CustosTarkettTab } from './CustosTarkettTab';

// 4 Módulos Oficiais exigidos pelo Diretor Éder Perez:
// - Resumo
// - Estrutura
// - Rateio
// - Custos
export type MainModuloCustos = 'Resumo' | 'Estrutura' | 'Rateio' | 'Custos';

export type SubSecaoCustos =
  | 'Custos do Pedido'
  | 'Nota Fiscal'
  | 'Taxas de Pagamento'
  | 'Comissões'
  | 'Marketplace'
  | 'Tarkett';

interface CustosConfigViewProps {
  currentUserName?: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosConfigView: React.FC<CustosConfigViewProps> = ({
  currentUserName = 'Éder Perez',
  isDirector,
  showToast,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainModuloCustos>('Resumo');
  const [activeCustosSubTab, setActiveCustosSubTab] = useState<SubSecaoCustos>('Custos do Pedido');
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Estados Oficiais das Áreas de Custos
  const [estrutura, setEstrutura] = useState<CustoEstruturaItem[]>(DEFAULT_ESTRUTURA_ITEMS);
  const [rateioConfig, setRateioConfig] = useState<RateioConfig>(DEFAULT_RATEIO_CONFIG);
  const [regrasPedido, setRegrasPedido] = useState<RegraCustoPedido[]>(DEFAULT_CUSTOS_PEDIDO_REGRAS);
  const [nfConfig, setNfConfig] = useState<NotaFiscalConfig>(DEFAULT_NOTA_FISCAL_CONFIG);
  const [taxasPagamento, setTaxasPagamento] = useState<TaxasPagamentoConfig>(DEFAULT_TAXAS_PAGAMENTO_CONFIG);
  const [comissoes, setComissoes] = useState<ComissaoResponsavelConfig[]>(DEFAULT_COMISSOES_CONFIG);
  const [marketplace, setMarketplace] = useState<MarketplaceConfig>(DEFAULT_MARKETPLACE_CONFIG);

  // Carregar todos os dados oficiais do Supabase
  const loadAllCustosFromSupabase = async () => {
    setIsLoading(true);
    try {
      const [est, rat, ped, nf, pag, com, mkt] = await Promise.all([
        getCustosEstrutura(),
        getRateioConfig(),
        getCustosPedidoRegras(),
        getNotaFiscalConfig(),
        getTaxasPagamentoConfig(),
        getComissoesConfig(),
        getMarketplaceConfig(),
      ]);

      setEstrutura(est);
      setRateioConfig(rat);
      setRegrasPedido(ped);
      setNfConfig(nf);
      setTaxasPagamento(pag);
      setComissoes(com);
      setMarketplace(mkt);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Erro ao sincronizar configurações de custos do Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllCustosFromSupabase();

    const handleUpdated = () => {
      loadAllCustosFromSupabase();
    };

    window.addEventListener(EVENT_CUSTOS_CONFIG_UPDATED, handleUpdated);
    window.addEventListener('fenix_custos_updated', handleUpdated);

    return () => {
      window.removeEventListener(EVENT_CUSTOS_CONFIG_UPDATED, handleUpdated);
      window.removeEventListener('fenix_custos_updated', handleUpdated);
    };
  }, []);

  // Navegação direta a partir do Resumo
  const handleNavigateFromResumo = (target: string) => {
    if (target === 'Resumo' || target === 'Estrutura' || target === 'Rateio') {
      setActiveMainTab(target as MainModuloCustos);
    } else {
      setActiveMainTab('Custos');
      if (
        target === 'Custos do Pedido' ||
        target === 'Nota Fiscal' ||
        target === 'Taxas de Pagamento' ||
        target === 'Comissões' ||
        target === 'Marketplace' ||
        target === 'Tarkett'
      ) {
        setActiveCustosSubTab(target as SubSecaoCustos);
      }
    }
  };

  // Os 4 Módulos Oficiais
  const MAIN_MODULOS: { id: MainModuloCustos; label: string; icon: React.ElementType }[] = [
    { id: 'Resumo', label: 'Resumo', icon: DollarSign },
    { id: 'Estrutura', label: 'Estrutura', icon: Building2 },
    { id: 'Rateio', label: 'Rateio', icon: PieChart },
    { id: 'Custos', label: 'Custos', icon: Sliders },
  ];

  // Sub-seções internas do Módulo Custos
  const SUB_CUSTOS: { id: SubSecaoCustos; label: string; icon: React.ElementType }[] = [
    { id: 'Custos do Pedido', label: 'Custos do Pedido', icon: FileSpreadsheet },
    { id: 'Nota Fiscal', label: 'Nota Fiscal', icon: FileText },
    { id: 'Taxas de Pagamento', label: 'Taxas de Pagamento', icon: CreditCard },
    { id: 'Comissões', label: 'Comissões', icon: Users },
    { id: 'Marketplace', label: 'Marketplace', icon: Store },
    { id: 'Tarkett', label: 'Tarkett', icon: Calculator },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Status & Governança */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Gestão Oficial de Custos & Parâmetros Fênix
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Supabase Conectado
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isDirector
                ? 'Gerenciado exclusivamente pelo Diretor Geral Éder Perez. Parâmetros oficiais sincronizados em nuvem.'
                : 'Gerenciado exclusivamente pelo Diretor Geral Éder Perez. Visualização protegida.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={loadAllCustosFromSupabase}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
            title="Sincronizar dados com Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>
              {isDirector ? (
                <strong className="text-slate-800">Diretoria (Éder Perez)</strong>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Somente Leitura
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de Modo Somente Leitura se não for Éder */}
      {!isDirector && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Modo de Visualização Protegido</div>
            <p className="mt-0.5 leading-relaxed">
              Somente o <strong>Diretor Geral Éder Perez</strong> possui autorização para alterar ou
              salvar configurações na aba de Custos da Fênix World.
            </p>
          </div>
        </div>
      )}

      {/* 4. CONFIGURAÇÕES → CUSTOS — ÉDER PEREZ: */}
      {/* Barra Principal dos 4 Módulos: Resumo, Estrutura, Rateio, Custos */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MAIN_MODULOS.map((modulo) => {
            const Icon = modulo.icon;
            const isActive = activeMainTab === modulo.id;
            return (
              <button
                key={modulo.id}
                type="button"
                onClick={() => setActiveMainTab(modulo.id)}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1D4ED8] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 bg-slate-50/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{modulo.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Se o módulo selecionado for "Custos", exibe a barra de sub-seções */}
      {activeMainTab === 'Custos' && (
        <div className="bg-slate-50/80 rounded-2xl p-2 border border-slate-200 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {SUB_CUSTOS.map((sub) => {
              const Icon = sub.icon;
              const isActive = activeCustosSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveCustosSubTab(sub.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Conteúdo do Módulo Ativo */}
      <div className="transition-all duration-200">
        {activeMainTab === 'Resumo' && (
          <CustosResumoTab
            estrutura={estrutura}
            rateioConfig={rateioConfig}
            regrasPedido={regrasPedido}
            nfConfig={nfConfig}
            taxasPagamento={taxasPagamento}
            comissoes={comissoes}
            marketplace={marketplace}
            onNavigateTab={handleNavigateFromResumo}
            isDirector={isDirector}
          />
        )}

        {activeMainTab === 'Estrutura' && (
          <CustosEstruturaTab
            estrutura={estrutura}
            setEstrutura={setEstrutura}
            currentUserName={currentUserName}
            isDirector={isDirector}
            showToast={showToast}
          />
        )}

        {activeMainTab === 'Rateio' && (
          <CustosRateioTab
            estrutura={estrutura}
            rateioConfig={rateioConfig}
            setRateioConfig={setRateioConfig}
            currentUserName={currentUserName}
            isDirector={isDirector}
            showToast={showToast}
          />
        )}

        {activeMainTab === 'Custos' && (
          <div>
            {activeCustosSubTab === 'Custos do Pedido' && (
              <CustosPedidoTab
                regras={regrasPedido}
                setRegras={setRegrasPedido}
                currentUserName={currentUserName}
                isDirector={isDirector}
                showToast={showToast}
              />
            )}

            {activeCustosSubTab === 'Nota Fiscal' && (
              <CustosNotaFiscalTab
                nfConfig={nfConfig}
                setNfConfig={setNfConfig}
                currentUserName={currentUserName}
                isDirector={isDirector}
                showToast={showToast}
              />
            )}

            {activeCustosSubTab === 'Taxas de Pagamento' && (
              <CustosTaxasPagamentoTab
                taxasConfig={taxasPagamento}
                setTaxasConfig={setTaxasPagamento}
                currentUserName={currentUserName}
                isDirector={isDirector}
                showToast={showToast}
              />
            )}

            {activeCustosSubTab === 'Comissões' && (
              <CustosComissoesTab
                comissoes={comissoes}
                setComissoes={setComissoes}
                currentUserName={currentUserName}
                isDirector={isDirector}
                showToast={showToast}
              />
            )}

            {activeCustosSubTab === 'Marketplace' && (
              <CustosMarketplaceTab
                marketplace={marketplace}
                setMarketplace={setMarketplace}
                currentUserName={currentUserName}
                isDirector={isDirector}
                showToast={showToast}
              />
            )}

            {activeCustosSubTab === 'Tarkett' && (
              <CustosTarkettTab
                currentUserName={currentUserName}
                isDirector={isDirector}
                showToast={showToast}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
