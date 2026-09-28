import React, { useState } from 'react';
import { X, Wrench, Calendar, AlertCircle } from 'lucide-react';
import { EstoqueItem, MovimentacaoEstoque } from '../../types';
import { registrarSaidaFullEstoque } from '../../utils/estoqueService';

interface SaidaFullModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableProducts: EstoqueItem[];
  preselectedProduct?: EstoqueItem | null;
  currentUserName: string;
  onSuccess?: (itemAtualizado?: EstoqueItem, novaMov?: MovimentacaoEstoque) => void;
}

export function SaidaFullModal({
  isOpen,
  onClose,
  availableProducts,
  preselectedProduct,
  currentUserName,
  onSuccess,
}: SaidaFullModalProps) {
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>(() => preselectedProduct?.id || '');
  const [quantidade, setQuantidade] = useState<string>('');
  const [dataSaida, setDataSaida] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentItem = availableProducts.find((p) => p.id === (selectedProdutoId || preselectedProduct?.id));
  const currentStock = currentItem?.estoqueAtual || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetProdId = selectedProdutoId || preselectedProduct?.id;
    if (!targetProdId) {
      setErrorMessage('Selecione o produto para a saída.');
      return;
    }

    const qtdNum = parseFloat(quantidade.replace(',', '.'));
    if (isNaN(qtdNum) || qtdNum <= 0) {
      setErrorMessage('Informe uma quantidade válida e maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registrarSaidaFullEstoque({
        produtoId: targetProdId,
        quantidade: qtdNum,
        data: dataSaida,
        observacao: observacao.trim() || undefined,
        usuario: currentUserName || 'Sistema Fênix',
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao registrar saída Full.');
        return;
      }

      if (onSuccess) {
        onSuccess(res.itemAtualizado, res.novaMovimentacao);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao processar saída.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saída — Full</h2>
              <p className="text-xs text-slate-500">Transferência para Centro de Distribuição / Fulfillment.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Produto *</label>
            <select
              value={selectedProdutoId || preselectedProduct?.id || ''}
              onChange={(e) => setSelectedProdutoId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
            >
              <option value="">Selecione um produto do estoque...</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.produto} (Saldo: {Math.round(p.estoqueAtual)} {p.unidade})
                </option>
              ))}
            </select>
          </div>

          {currentItem && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600">Saldo atual em depósito:</span>
              <span className={`font-bold ${currentStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {Math.round(currentStock)} {currentItem.unidade}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade a transferir ({currentItem?.unidade || 'un'}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="Ex.: 50.00"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data da transferência *</label>
              <div className="relative">
                <input
                  type="date"
                  value={dataSaida}
                  onChange={(e) => setDataSaida(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white pr-10"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observação (opcional)</label>
            <textarea
              rows={2}
              maxLength={200}
              placeholder="Ex.: Remessa para depósito Full Mercado Livre / CD São Paulo..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0B2046] hover:bg-[#081836] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar Saída — Full'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
