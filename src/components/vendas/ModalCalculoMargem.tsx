import React from 'react';
import {
  X,
  Percent,
  Calculator,
  ArrowRight,
  ShieldAlert,
  Info,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VendaGerencial } from '../../types';
import { extrairNumeroPuroPedido } from '../../utils/vendasService';

interface ModalCalculoMargemProps {
  venda: VendaGerencial | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ModalCalculoMargem: React.FC<ModalCalculoMargemProps> = ({
  venda,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !venda) return null;

  const numPedido = extrairNumeroPuroPedido(venda.numeroPedido);
  const valorVenda = Number(venda.valorVenda) || 0;
  const custoProdutos = Number(venda.custoProdutos) || 0;
  const custosAdicionais = Number(venda.custosAdicionais) || 0;
  const custoTotal =
    venda.custoTotal !== undefined
      ? Number(venda.custoTotal)
      : custoProdutos + custosAdicionais;
  const lucro = Number(venda.lucro) || (valorVenda - custoTotal);
  const margem =
    valorVenda > 0 ? Number(((lucro / valorVenda) * 100).toFixed(1)) : 0;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-[#0B2046] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Calculator className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Memória de Cálculo da Margem
              </h3>
              <p className="text-xs text-purple-200">
                Pedido {numPedido} • Cliente: {venda.cliente}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-purple-300 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Fórmula Destaque */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-2">
              Fórmula Gerencial Fênix World
            </span>
            <div className="flex flex-wrap items-center justify-between gap-2 text-center">
              <div className="bg-white px-3 py-2 rounded-xl border border-purple-200 flex-1 min-w-[100px]">
                <span className="text-[10px] text-slate-500 block">Faturamento</span>
                <span className="text-sm font-black text-slate-900">{formatBRL(valorVenda)}</span>
              </div>
              <span className="text-lg font-bold text-purple-700">−</span>
              <div className="bg-white px-3 py-2 rounded-xl border border-purple-200 flex-1 min-w-[100px]">
                <span className="text-[10px] text-slate-500 block">Custo Total</span>
                <span className="text-sm font-black text-rose-600">{formatBRL(custoTotal)}</span>
              </div>
              <span className="text-lg font-bold text-purple-700">=</span>
              <div className="bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-300 flex-1 min-w-[100px]">
                <span className="text-[10px] text-emerald-700 font-bold block">Lucro Líquido</span>
                <span className="text-sm font-black text-emerald-700">{formatBRL(lucro)}</span>
              </div>
            </div>
          </div>

          {/* Margem Percentual */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Margem Percentual</span>
              <span className="text-xs text-purple-300">
                (Lucro Líquido ÷ Faturamento) × 100
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white font-black text-2xl rounded-xl">
              <Percent className="w-5 h-5 stroke-[2.5]" />
              {margem.toFixed(1)}%
            </div>
          </div>

          {/* Detalhamento dos Custos que compõem o Custo Total */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              Composição Detalhada do Custo Total
            </h4>

            <div className="space-y-2 text-xs">
              {Array.isArray(venda.custosItens) && venda.custosItens.length > 0 ? (
                venda.custosItens.map((c) => {
                  const part = valorVenda > 0 ? ((Number(c.valor) / valorVenda) * 100).toFixed(1) : '0.0';
                  return (
                    <div
                      key={c.id}
                      className="p-2 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{c.tipo}</span>
                        {c.descricao && (
                          <span className="text-slate-500 ml-1.5">({c.descricao})</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatBRL(Number(c.valor) || 0)}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({part}%)</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="p-2 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                    <span className="font-semibold text-slate-700">Custo dos Produtos (Mercadoria/Pisos)</span>
                    <span className="font-bold text-slate-900">{formatBRL(custoProdutos)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                    <span className="font-semibold text-slate-700">Custos Adicionais (NF, Cartão, Frete)</span>
                    <span className="font-bold text-slate-900">{formatBRL(custosAdicionais)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Soma de Todos os Custos:</span>
              <span className="text-rose-600">{formatBRL(custoTotal)}</span>
            </div>
          </div>

          {/* Nota de Política Gerencial */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Regra de Custos:</strong> Somente o Diretor Éder Perez possui autorização para
              alterar ou redefinir custos de pedidos. Custos de estrutura (aluguel, salários, sistemas)
              ficam registrados em Configurações e não entram automaticamente no custo do pedido.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
