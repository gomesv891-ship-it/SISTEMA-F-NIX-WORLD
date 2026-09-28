import React, { useState, useEffect } from 'react';
import { X, Pencil, Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { MovimentacaoEstoque } from '../../types';
import { editarMovimentacaoEstoque } from '../../utils/estoqueService';

interface EditarMovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimentacao: MovimentacaoEstoque | null;
  currentUserName: string;
  onSuccess: () => void;
}

export function EditarMovimentacaoModal({
  isOpen,
  onClose,
  movimentacao,
  currentUserName,
  onSuccess,
}: EditarMovimentacaoModalProps) {
  const [quantidade, setQuantidade] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [hora, setHora] = useState<string>('');
  const [responsavel, setResponsavel] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [subtipo, setSubtipo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && movimentacao) {
      setQuantidade(String(movimentacao.quantidade || ''));
      setData(movimentacao.data || new Date().toISOString().split('T')[0]);
      setHora(movimentacao.hora || '12:00');
      setResponsavel(movimentacao.usuario || currentUserName || 'Sistema Fênix');
      setObservacao(movimentacao.observacao || '');
      setSubtipo(movimentacao.subtipo || '');
      setError(null);
    }
  }, [isOpen, movimentacao, currentUserName]);

  if (!isOpen || !movimentacao) return null;

  const isEntrada = movimentacao.tipo === 'ENTRADA';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qtdNum = parseFloat(quantidade.replace(',', '.'));
    if (isNaN(qtdNum) || qtdNum <= 0) {
      setError('Informe uma quantidade válida e maior que zero.');
      return;
    }

    if (!data) {
      setError('Informe a data da movimentação.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await editarMovimentacaoEstoque(
        movimentacao.id,
        {
          quantidade: qtdNum,
          data,
          hora: hora || undefined,
          observacao: observacao.trim() || undefined,
          usuario: responsavel.trim() || currentUserName || 'Sistema Fênix',
          subtipo: subtipo.trim() || undefined,
        },
        currentUserName || 'Sistema Fênix'
      );

      if (!res.success) {
        setError(res.error || 'Erro ao atualizar movimentação.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar edição da movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Editar Movimentação</h3>
              <p className="text-[11px] text-slate-500">
                O estoque do produto será ajustado proporcionalmente à alteração.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info do Produto */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Produto:</span>
              <span className="font-bold text-slate-900">{movimentacao.produtoNome}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Código:</span>
              <span className="font-mono text-slate-600">{movimentacao.codigoProduto}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tipo de Movimentação:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                  isEntrada
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {isEntrada ? '↑ Entrada' : '↓ Saída'} ({movimentacao.subtipo || 'Geral'})
              </span>
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantidade ({movimentacao.unidade || 'un'}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white text-right"
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data *</label>
              <div className="relative">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white pr-9"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora</label>
              <div className="relative">
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white pr-9"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Responsável *</label>
            <div className="relative">
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white pl-9"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observação</label>
            <textarea
              rows={2}
              maxLength={250}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
              placeholder="Motivo da movimentação, notas ou referências..."
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
