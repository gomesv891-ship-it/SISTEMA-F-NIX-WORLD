import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { MovimentacaoEstoque } from '../../types';
import { excluirMovimentacaoEstoque } from '../../utils/estoqueService';

interface ExcluirMovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimentacao: MovimentacaoEstoque | null;
  currentUserName: string;
  onSuccess: () => void;
}

export function ExcluirMovimentacaoModal({
  isOpen,
  onClose,
  movimentacao,
  currentUserName,
  onSuccess,
}: ExcluirMovimentacaoModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !movimentacao) return null;

  const isEntrada = movimentacao.tipo === 'ENTRADA';

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await excluirMovimentacaoEstoque(
        movimentacao.id,
        currentUserName || 'Sistema Fênix'
      );
      if (!res.success) {
        setError(res.error || 'Erro ao excluir movimentação.');
        return;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-slate-900 text-center">Excluir Movimentação?</h3>
          <p className="text-xs text-slate-500 text-center mt-1">
            Esta ação não pode ser desfeita e o estoque do produto será recalculado imediatamente.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Produto:</span>
              <span className="font-bold text-slate-900">{movimentacao.produtoNome}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tipo:</span>
              <span
                className={`font-bold ${isEntrada ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {isEntrada ? 'Entrada' : 'Saída'} ({movimentacao.subtipo || 'Geral'})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Quantidade:</span>
              <span className="font-bold text-slate-900">
                {movimentacao.quantidade} {movimentacao.unidade || 'un'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Data / Hora:</span>
              <span className="text-slate-700">
                {movimentacao.data} {movimentacao.hora ? `às ${movimentacao.hora}` : ''}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {isEntrada
                ? `O estoque do produto diminuirá em ${movimentacao.quantidade} ${movimentacao.unidade || 'un'}.`
                : `O estoque do produto aumentará em ${movimentacao.quantidade} ${movimentacao.unidade || 'un'}.`}
            </span>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Excluindo...' : 'Excluir Movimentação'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
