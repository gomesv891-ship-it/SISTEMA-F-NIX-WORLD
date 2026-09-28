import React from 'react';
import { AlertCircle, X, FileText, ArrowRight } from 'lucide-react';
import { FollowUpItem } from '../../types';

interface ModalSemOrcamentoVinculadoProps {
  followUp: FollowUpItem;
  onClose: () => void;
  onGoToOrcamentos?: () => void;
}

export const ModalSemOrcamentoVinculado: React.FC<ModalSemOrcamentoVinculadoProps> = ({
  followUp,
  onClose,
  onGoToOrcamentos,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header com ícone de alerta */}
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100/80 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Orçamento Não Vinculado
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Nenhum orçamento encontrado para este card
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo informativo */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">Cliente:</span>
              <span className="font-bold text-slate-800">{followUp.cliente}</span>
            </div>
            {followUp.pedido && (
              <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-1.5">
                <span className="font-semibold text-slate-500">Pedido/Identificador:</span>
                <span className="font-bold text-slate-800 font-mono">#{followUp.pedido}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-1.5">
              <span className="font-semibold text-slate-500">Status no Follow-up:</span>
              <span className="font-bold text-blue-700">{followUp.status}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Não foi localizado um orçamento salvo no <strong>Histórico de Orçamentos</strong> correspondente a este registro.
          </p>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 leading-relaxed">
            <strong>Dica:</strong> Para vincular um orçamento completo com produtos, medidas e valores a este Follow-up, emita ou salve a proposta na aba <strong>Orçamentos</strong> com o mesmo nome de cliente.
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {onGoToOrcamentos && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToOrcamentos();
              }}
              className="px-4 py-2 rounded-xl bg-[#0052cc] hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Ir para Orçamentos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
