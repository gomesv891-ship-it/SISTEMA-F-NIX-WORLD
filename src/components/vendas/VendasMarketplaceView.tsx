import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingCart,
  Store,
  MoreVertical,
  Eye,
  Calculator,
  Pencil,
  ShieldCheck,
  Printer,
  XCircle,
  Truck,
  Megaphone,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { VendaGerencial } from '../../types';
import { extrairNumeroPuroPedido } from '../../utils/vendasService';

interface VendasMarketplaceViewProps {
  vendas: VendaGerencial[];
  isDirector: boolean;
  currentUserName: string;
  onVerDetalhes: (venda: VendaGerencial) => void;
  onVerMargem: (venda: VendaGerencial) => void;
  onEditarPedido: (venda: VendaGerencial) => void;
  onEditarCustos: (venda: VendaGerencial) => void;
  onImprimir: (venda: VendaGerencial) => void;
  onCancelarVenda: (venda: VendaGerencial) => void;
  onExcluirVenda?: (venda: VendaGerencial) => void;
}

export const VendasMarketplaceView: React.FC<VendasMarketplaceViewProps> = ({
  vendas,
  isDirector,
  currentUserName,
  onVerDetalhes,
  onVerMargem,
  onEditarPedido,
  onEditarCustos,
  onImprimir,
  onCancelarVenda,
  onExcluirVenda,
}) => {
  // Filtro de canal: Todos | Shopee | Mercado Livre
  const [filtroCanal, setFiltroCanal] = useState<'Todos' | 'Shopee' | 'Mercado Livre'>('Todos');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatBRL = (val?: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Filtragem por canal
  const vendasFiltradas = vendas.filter((v) => {
    if (filtroCanal === 'Todos') return true;
    const canal = (v.canalMarketplace || '').toLowerCase();
    if (filtroCanal === 'Shopee') return canal.includes('shopee');
    if (filtroCanal === 'Mercado Livre') return canal.includes('mercado') || canal.includes('ml');
    return true;
  });

  // Métricas específicas de Marketplace
  const vendasValidas = vendasFiltradas.filter((v) => v.statusPedido !== 'Cancelada');
  const faturamentoBruto = vendasValidas.reduce((acc, v) => acc + (Number(v.valorVenda) || 0), 0);
  const lucroLiquido = vendasValidas.reduce((acc, v) => acc + (Number(v.lucro) || 0), 0);
  const totalPedidos = vendasValidas.length;
  const margemMedia =
    faturamentoBruto > 0 ? Number(((lucroLiquido / faturamentoBruto) * 100).toFixed(1)) : 0;

  // Totalizadores de taxas e custos do canal
  const totalComissoesTaxas = vendasValidas.reduce(
    (acc, v) => acc + (Number(v.comissaoCanal) || Number(v.taxaPlataforma) || 0),
    0
  );
  const totalAds = vendasValidas.reduce((acc, v) => acc + (Number(v.custoAds) || 0), 0);
  const totalFreteSubsidio = vendasValidas.reduce(
    (acc, v) => acc + (Number(v.freteSubsidio) || Number(v.frete) || 0),
    0
  );

  const renderBadgeCanal = (canal?: string) => {
    const c = (canal || 'Mercado Livre').toLowerCase();
    if (c.includes('shopee')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
          Shopee
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
        Mercado Livre
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-header de Marketplace: Filtros de canais Shopee / Mercado Livre */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Canais de Marketplace</h4>
            <p className="text-xs text-slate-500">Gestão e apuração de taxas e comissões dos canais</p>
          </div>
        </div>

        {/* Botões do Filtro: Todos | Shopee | Mercado Livre */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          {(['Todos', 'Shopee', 'Mercado Livre'] as const).map((canal) => {
            const isActive = filtroCanal === canal;
            return (
              <button
                key={canal}
                type="button"
                onClick={() => setFiltroCanal(canal)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {canal}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards de Métricas de Marketplace */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Bruto (Laranja/Navy) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faturamento Bruto
            </span>
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-orange-600 tracking-tight">
              {formatBRL(faturamentoBruto)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-orange-500" />
              Volume total nos canais
            </p>
          </div>
          <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
        </div>

        {/* Card 2: Lucro Líquido (Verde) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lucro Líquido
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatBRL(lucroLiquido)}
            </h3>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              Após taxas, frete e comissões
            </p>
          </div>
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
        </div>

        {/* Card 3: Margem Média (Roxo) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Margem Média
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-purple-700 tracking-tight">
              {margemMedia.toFixed(1)}%
            </h3>
            <p className="text-[11px] text-purple-700 mt-1 font-medium">
              Margem real do canal
            </p>
          </div>
          <div className="absolute top-0 right-0 w-2 h-full bg-purple-600"></div>
        </div>

        {/* Card 4: Total de Pedidos (Laranja) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Pedidos
            </span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {totalPedidos}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Pedidos processados em marketplace
            </p>
          </div>
          <div className="absolute top-0 right-0 w-2 h-full bg-orange-400"></div>
        </div>
      </div>

      {/* Sub-faixa de custos operacionais do canal */}
      {(totalComissoesTaxas > 0 || totalAds > 0 || totalFreteSubsidio > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Taxas & Comissões dos Canais:</span>
            <span className="text-xs font-bold text-slate-900">{formatBRL(totalComissoesTaxas)}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Investimento em Ads / Tráfego:</span>
            <span className="text-xs font-bold text-slate-900">{formatBRL(totalAds)}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Frete & Subsídios de Entrega:</span>
            <span className="text-xs font-bold text-slate-900">{formatBRL(totalFreteSubsidio)}</span>
          </div>
        </div>
      )}

      {/* Tabela de Marketplace */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                <th className="py-3.5 px-4 whitespace-nowrap">PEDIDO</th>
                <th className="py-3.5 px-3 whitespace-nowrap">CANAL</th>
                <th className="py-3.5 px-3 whitespace-nowrap">DATA</th>
                <th className="py-3.5 px-4 whitespace-nowrap">CLIENTE / COMPRADOR</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">VALOR BRUTO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">TAXAS & COMISSÃO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">FRETE & SUBSÍDIO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">ADS / MARKETING</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">CUSTO PRODUTO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">OUTROS CUSTOS</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">LUCRO LÍQUIDO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">MARGEM</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">STATUS</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    Nenhuma venda de Marketplace encontrada para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map((venda) => {
                  const numPedido = extrairNumeroPuroPedido(venda.numeroPedido);
                  const isCancelada = venda.statusPedido === 'Cancelada';
                  const taxasComissao =
                    (Number(venda.comissaoCanal) || 0) + (Number(venda.taxaPlataforma) || 0);
                  const freteSub = Number(venda.freteSubsidio) || Number(venda.frete) || 0;
                  const ads = Number(venda.custoAds) || 0;
                  const custoProd = Number(venda.custoProdutos) || 0;
                  const outrosCustos =
                    Number(venda.outrosCustosMarketplace) ||
                    Math.max(
                      0,
                      (Number(venda.custosAdicionais) || 0) - (taxasComissao + freteSub + ads)
                    );

                  return (
                    <tr
                      key={venda.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCancelada ? 'bg-rose-50/20 opacity-75' : ''
                      }`}
                    >
                      {/* PEDIDO: somente o número */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {numPedido}
                        </span>
                      </td>

                      {/* CANAL */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderBadgeCanal(venda.canalMarketplace)}
                      </td>

                      {/* DATA */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateBR(venda.data)}
                      </td>

                      {/* CLIENTE / COMPRADOR */}
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap max-w-[180px] truncate">
                        {venda.cliente}
                      </td>

                      {/* VALOR BRUTO */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatBRL(venda.valorVenda)}
                      </td>

                      {/* TAXAS & COMISSÃO */}
                      <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                        {taxasComissao > 0 ? (
                          formatBRL(taxasComissao)
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* FRETE & SUBSÍDIO */}
                      <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                        {freteSub > 0 ? (
                          formatBRL(freteSub)
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* ADS / MARKETING */}
                      <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                        {ads > 0 ? (
                          formatBRL(ads)
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* CUSTO PRODUTO */}
                      <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap">
                        {formatBRL(custoProd)}
                      </td>

                      {/* OUTROS CUSTOS */}
                      <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                        {outrosCustos > 0 ? (
                          formatBRL(outrosCustos)
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* LUCRO LÍQUIDO */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {formatBRL(venda.lucro)}
                      </td>

                      {/* MARGEM */}
                      <td className="py-3 px-3 text-right font-bold text-purple-700 whitespace-nowrap">
                        {Number(venda.margem).toFixed(1)}%
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isCancelada ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Concluído
                          </span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="py-3 px-3 text-center relative whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(openMenuId === venda.id ? null : venda.id)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0B2046] bg-slate-100 hover:bg-[#0B2046] hover:text-white border border-slate-200 hover:border-[#0B2046] transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Ações do pedido"
                        >
                          <span>Ações</span>
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {openMenuId === venda.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-2 top-8 z-30 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-left text-xs animate-fadeIn"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onVerDetalhes(venda);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              Ver detalhes do pedido
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onVerMargem(venda);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Calculator className="w-3.5 h-3.5 text-purple-600" />
                              Ver cálculo da margem
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onEditarPedido(venda);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-600" />
                              Editar pedido
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onEditarCustos(venda);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Editar custos do pedido
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onImprimir(venda);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              Imprimir / Exportar
                            </button>

                            <div className="my-1 border-t border-slate-100"></div>

                            {/* Cancelar venda */}
                            {!isCancelada ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onCancelarVenda(venda);
                                }}
                                className="w-full px-3 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                Cancelar venda
                              </button>
                            ) : (
                              <span className="w-full px-3 py-1.5 text-slate-400 flex items-center gap-2 text-[11px] italic">
                                Venda já cancelada
                              </span>
                            )}

                            {/* EXCLUSÃO DE VENDAS: Somente Éder Perez (Diretor) */}
                            {isDirector && onExcluirVenda && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onExcluirVenda(venda);
                                }}
                                className="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                Excluir venda
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
