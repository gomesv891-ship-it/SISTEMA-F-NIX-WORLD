import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingCart,
  MoreVertical,
  Eye,
  Calculator,
  Pencil,
  ShieldCheck,
  Printer,
  XCircle,
  Tag,
  CheckCircle2,
  Calendar,
  CreditCard,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { VendaGerencial, ClientRecord } from '../../types';
import { extrairNumeroPuroPedido } from '../../utils/vendasService';
import { resolveClientType } from '../../utils/clientTypes';

interface VendasComercialViewProps {
  vendas: VendaGerencial[];
  clientes?: ClientRecord[];
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

export const VendasComercialView: React.FC<VendasComercialViewProps> = ({
  vendas,
  clientes = [],
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fecha o dropdown de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatações
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

  // Cálculos dos 4 Cards Comerciais
  // Considera apenas vendas que não foram canceladas para o faturamento real
  const vendasValidas = vendas.filter((v) => v.statusPedido !== 'Cancelada');
  const totalFaturamento = vendasValidas.reduce((acc, v) => acc + (Number(v.valorVenda) || 0), 0);
  const totalLucro = vendasValidas.reduce((acc, v) => acc + (Number(v.lucro) || 0), 0);
  const totalPedidos = vendasValidas.length;
  const margemMedia =
    totalFaturamento > 0 ? Number(((totalLucro / totalFaturamento) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* 4 Cards de Métricas Comerciais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento (Azul Fênix/Navy) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faturamento
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#0B2046] tracking-tight">
              {formatBRL(totalFaturamento)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              Volume comercial bruto
            </p>
          </div>
          <div className="absolute top-0 right-0 w-2 h-full bg-[#0B2046]"></div>
        </div>

        {/* Card 2: Lucro Total (Verde) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lucro Total
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatBRL(totalLucro)}
            </h3>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              Lucro líquido apurado
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
              Eficiência operacional média
            </p>
          </div>
          <div className="absolute top-0 right-0 w-2 h-full bg-purple-600"></div>
        </div>

        {/* Card 4: Total de Pedidos (Azul Fênix/Navy) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Pedidos
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {totalPedidos}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalPedidos === 1 ? 'Venda concluída' : 'Vendas concluídas'}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-2 h-full bg-[#0B2046]/40"></div>
        </div>
      </div>

      {/* Tabela Comercial */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                <th className="py-3.5 px-4 whitespace-nowrap">PEDIDO</th>
                <th className="py-3.5 px-3 whitespace-nowrap">DATA</th>
                <th className="py-3.5 px-4 whitespace-nowrap">CLIENTE</th>
                <th className="py-3.5 px-3 whitespace-nowrap">TIPO DE CLIENTE</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">VALOR</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">DESCONTO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">FRETE</th>
                <th className="py-3.5 px-3 whitespace-nowrap">PAGAMENTO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">CUSTO TOTAL</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">LUCRO</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">MARGEM</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">STATUS</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    Nenhuma venda concluída encontrada para o período e responsável selecionados.
                  </td>
                </tr>
              ) : (
                vendas.map((venda) => {
                  const numPedido = extrairNumeroPuroPedido(venda.numeroPedido);
                  const clientTypeInfo = resolveClientType(
                    venda.cliente,
                    venda.clienteId,
                    clientes,
                    venda.tipoCliente
                  );
                  const ClientIcon = clientTypeInfo.Icon;
                  const isCancelada = venda.statusPedido === 'Cancelada';
                  const custoTotal =
                    venda.custoTotal !== undefined
                      ? Number(venda.custoTotal)
                      : (Number(venda.custoProdutos) || 0) + (Number(venda.custosAdicionais) || 0);

                  return (
                    <tr
                      key={venda.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCancelada ? 'bg-rose-50/20 opacity-75' : ''
                      }`}
                    >
                      {/* PEDIDO: somente o número, sem 'Pedido' */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {numPedido}
                        </span>
                      </td>

                      {/* DATA */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateBR(venda.data)}
                      </td>

                      {/* CLIENTE */}
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap max-w-[200px] truncate">
                        {venda.cliente}
                      </td>

                      {/* TIPO DE CLIENTE: puxado diretamente de CLIENTES -> TIPO DE CLIENTE */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${clientTypeInfo.badgeClass}`}
                          title={`Tipo de Cliente: ${clientTypeInfo.name}`}
                        >
                          <ClientIcon className={`w-3.5 h-3.5 shrink-0 ${clientTypeInfo.iconColor}`} />
                          <span>{clientTypeInfo.name}</span>
                        </span>
                      </td>

                      {/* VALOR */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatBRL(venda.valorVenda)}
                      </td>

                      {/* DESCONTO */}
                      <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                        {Number(venda.desconto) > 0 ? (
                          <span className="text-amber-700 font-medium">
                            {formatBRL(venda.desconto)}
                          </span>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* FRETE */}
                      <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                        {Number(venda.frete) > 0 ? (
                          <span className="text-slate-700">{formatBRL(venda.frete)}</span>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* PAGAMENTO */}
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        <span className="text-xs text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60">
                          {venda.formaPagamento || 'Pix'}
                        </span>
                      </td>

                      {/* CUSTO TOTAL */}
                      <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatBRL(custoTotal)}
                      </td>

                      {/* LUCRO */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {formatBRL(venda.lucro)}
                      </td>

                      {/* MARGEM */}
                      <td className="py-3 px-3 text-right font-bold text-purple-700 whitespace-nowrap">
                        {Number(venda.margem).toFixed(1)}%
                      </td>

                      {/* STATUS: Verde para Concluído, Vermelho apenas para Cancelamento */}
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

                        {/* Dropdown de Ações */}
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

                            {/* Somente Éder Perez pode editar custos */}
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
