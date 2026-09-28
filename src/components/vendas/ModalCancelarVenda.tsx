import React, { useState } from 'react';
import {
  X,
  AlertOctagon,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { VendaGerencial } from '../../types';
import {
  extrairNumeroPuroPedido,
  cancelarVendaGerencial,
} from '../../utils/vendasService';

interface ModalCancelarVendaProps {
  venda: VendaGerencial | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onSuccess: () => void;
}

export const ModalCancelarVenda: React.FC<ModalCancelarVendaProps> = ({
  venda,
  isOpen,
  onClose,
  currentUserName,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !venda) return null;

  const numPedido = extrairNumeroPuroPedido(venda.numeroPedido);

  const handleCancelar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Por favor, informe o motivo do cancelamento.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const res = await cancelarVendaGerencial(venda.id, motivo.trim(), currentUserName);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Erro ao registrar cancelamento.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao conectar ao Supabase.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col my-8">
        {/* Header em Vermelho (exclusivo para cancelamento) */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Cancelar Venda</h3>
              <p className="text-xs text-rose-100">Pedido {numPedido}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleCancelar} className="p-6 space-y-4">
          <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-800 space-y-1">
            <p className="font-bold">Atenção sobre a regra de exclusão:</p>
            <p>
              Por diretriz corporativa, não é permitida a exclusão direta de pedidos. O pedido será
              marcado como <strong>Cancelado</strong> no histórico e mantido no banco de dados para
              auditoria.
            </p>
          </div>

          <div>
            <span className="text-xs text-slate-500 block mb-1">Cliente / Valor:</span>
            <p className="text-sm font-bold text-slate-900">
              {venda.cliente} • R${' '}
              {Number(venda.valorVenda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Motivo do Cancelamento *
            </label>
            <textarea
              rows={3}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo (ex: cliente desistiu da obra, erro no lançamento, etc.)..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Voltar
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isProcessing ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
