import React from 'react';
import {
  X,
  FileText,
  Calendar,
  User,
  Tag,
  CreditCard,
  Truck,
  TrendingUp,
  Percent,
  CheckCircle2,
  Package,
  Clock,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { VendaGerencial, ClientRecord } from '../../types';
import { extrairNumeroPuroPedido } from '../../utils/vendasService';
import { resolveClientType } from '../../utils/clientTypes';

interface ModalDetalhesPedidoProps {
  venda: VendaGerencial | null;
  clientes?: ClientRecord[];
  isOpen: boolean;
  onClose: () => void;
  onOpenMargemModal?: (venda: VendaGerencial) => void;
  onOpenCustosModal?: (venda: VendaGerencial) => void;
  isDirector?: boolean;
}

export const ModalDetalhesPedido: React.FC<ModalDetalhesPedidoProps> = ({
  venda,
  clientes = [],
  isOpen,
  onClose,
  onOpenMargemModal,
  onOpenCustosModal,
  isDirector = false,
}) => {
  if (!isOpen || !venda) return null;

  const numPedido = extrairNumeroPuroPedido(venda.numeroPedido);
  const clientTypeInfo = resolveClientType(
    venda.cliente,
    venda.clienteId,
    clientes,
    venda.tipoCliente
  );
  const ClientIcon = clientTypeInfo.Icon;

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

  const custoTotal =
    venda.custoTotal !== undefined
      ? Number(venda.custoTotal)
      : (Number(venda.custoProdutos) || 0) + (Number(venda.custosAdicionais) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Top Header */}
        <div className="bg-[#0B2046] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Pedido {numPedido}</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Concluído
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Data do pedido: {formatDateBR(venda.data)} • Responsável: {venda.vendedor || 'Consultor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Dados do Cliente e Canal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Cliente
              </span>
              <p className="text-base font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                {venda.cliente}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${clientTypeInfo.badgeClass}`}
                  title={`Tipo: ${clientTypeInfo.name}`}
                >
                  <ClientIcon className={`w-3 h-3 mr-0.5 ${clientTypeInfo.iconColor}`} />
                  {clientTypeInfo.name}
                </span>
                {venda.canalMarketplace && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {venda.canalMarketplace}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Pagamento & Entrega
              </span>
              {venda.formasPagamento && Array.isArray(venda.formasPagamento) && venda.formasPagamento.length > 1 ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Formas de Pagamento ({venda.formasPagamento.length}):</span>
                  </div>
                  <div className="pl-6 space-y-0.5 text-xs text-slate-600">
                    {venda.formasPagamento.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                        <span>{p.forma}:</span>
                        <strong className="text-slate-900">{formatBRL(p.valor)}</strong>
                        {p.parcelas && (
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold text-[10px]">
                            {p.parcelas}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  Forma: {venda.formaPagamento || 'À Vista / Pix'}
                  {venda.parcelas && (
                    <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold text-[11px]">
                      {venda.parcelas}
                    </span>
                  )}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                Frete: {formatBRL(venda.frete)}
              </p>
              {Number(venda.desconto) > 0 && (
                <p className="text-xs text-amber-700 font-medium mt-1">
                  Desconto aplicado: {formatBRL(venda.desconto)}
                </p>
              )}
            </div>
          </div>

          {/* Cards de Métricas Financeiras */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Faturamento
              </span>
              <span className="text-lg font-black text-slate-900">
                {formatBRL(venda.valorVenda)}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                Lucro Total
              </span>
              <span className="text-lg font-black text-emerald-700">
                {formatBRL(venda.lucro)}
              </span>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-center">
              <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block mb-1">
                Margem Líquida
              </span>
              <span className="text-lg font-black text-purple-700">
                {Number(venda.margem).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Detalhamento de Custos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Composição de Custos do Pedido
              </h4>
              <span className="text-xs font-bold text-slate-600">
                Total: {formatBRL(custoTotal)}
              </span>
            </div>

            {Array.isArray(venda.custosItens) && venda.custosItens.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {venda.custosItens.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700">{item.tipo}</span>
                      {item.descricao && (
                        <span className="text-slate-400 ml-2">({item.descricao})</span>
                      )}
                    </div>
                    <span className="font-bold text-slate-800">{formatBRL(item.valor)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between py-1">
                  <span>Custo dos Produtos:</span>
                  <span className="font-semibold text-slate-800">
                    {formatBRL(venda.custoProdutos)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Custos Adicionais (Impostos, Taxas e Frete):</span>
                  <span className="font-semibold text-slate-800">
                    {formatBRL(venda.custosAdicionais)}
                  </span>
                </div>
              </div>
            )}

            {isDirector && onOpenCustosModal && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenCustosModal(venda)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  Editar custos deste pedido (Diretor Éder Perez)
                </button>
              </div>
            )}
          </div>

          {/* Produtos se cadastrados */}
          {Array.isArray(venda.produtos) && venda.produtos.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Produtos do Pedido
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-center">Qtd</th>
                    <th className="px-3 py-2 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venda.produtos.map((p, idx) => (
                    <tr key={p.id || idx}>
                      <td className="px-3 py-2 font-medium text-slate-800">{p.produto}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{p.quantidade}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">
                        {formatBRL(p.valorTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Observações */}
          {venda.observacoes && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600">
              <span className="font-bold text-slate-700 block mb-1">Observações:</span>
              <p className="leading-relaxed">{venda.observacoes}</p>
            </div>
          )}

          {/* Histórico */}
          {Array.isArray(venda.historico) && venda.historico.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Histórico do Pedido
              </span>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {venda.historico.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-start"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{h.acao}</span>
                      <span className="text-slate-400 ml-1">por {h.usuario}</span>
                      {h.detalhes && <p className="text-slate-600 mt-0.5">{h.detalhes}</p>}
                    </div>
                    <span className="text-slate-400 whitespace-nowrap ml-2">
                      {h.data} {h.hora}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {onOpenMargemModal ? (
            <button
              type="button"
              onClick={() => onOpenMargemModal(venda)}
              className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition flex items-center gap-1.5"
            >
              <Percent className="w-3.5 h-3.5" />
              Ver Cálculo da Margem
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
