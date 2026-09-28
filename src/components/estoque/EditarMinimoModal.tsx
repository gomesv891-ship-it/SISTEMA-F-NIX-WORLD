import React, { useState } from 'react';
import { X, Sliders, AlertCircle } from 'lucide-react';
import { EstoqueItem } from '../../types';
import { atualizarEstoqueMinimo } from '../../utils/estoqueService';

interface EditarMinimoModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EstoqueItem | null;
  currentUserName: string;
  onSuccess: () => void;
}

export function EditarMinimoModal({
  isOpen,
  onClose,
  item,
  currentUserName,
  onSuccess,
}: EditarMinimoModalProps) {
  const [minimo, setMinimo] = useState<string>(() => (item ? String(item.estoqueMinimo || 10) : '10'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (item) {
      setMinimo(String(item.estoqueMinimo || 10));
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(minimo.replace(',', '.'));
    if (isNaN(num) || num < 0) {
      setError('Informe um valor de estoque mínimo válido maior ou igual a zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await atualizarEstoqueMinimo(item.id, num, currentUserName || 'Sistema Fênix');
      if (!res.success) {
        setError(res.error || 'Erro ao atualizar estoque mínimo.');
        return;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar estoque mínimo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-6">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ajustar Estoque Mínimo</h2>
              <p className="text-xs text-slate-500">Defina o limite para alertas automáticos de reposição.</p>
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

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{item.produto}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {item.codigo}
              </span>
              <span>•</span>
              <span>{item.marca}</span>
              <span>•</span>
              <span>Estoque atual: {Math.round(item.estoqueAtual)} {item.unidade}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estoque Mínimo de Alerta ({item.unidade}) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white text-right"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Quando o saldo atingir ou ficar abaixo deste valor, o status mudará para "Atenção" ou "Estoque baixo".
            </p>
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
              {isSubmitting ? 'Salvando...' : 'Salvar Alteração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
