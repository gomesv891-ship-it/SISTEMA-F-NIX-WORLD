import React from 'react';
import { Layers, X, Calendar, Eye } from 'lucide-react';
import { FollowUpItem, SavedOrcamento } from '../../types';

interface ModalSelecionarOrcamentoFollowUpProps {
  followUp: FollowUpItem;
  clientBudgets: SavedOrcamento[];
  onSelect: (orc: SavedOrcamento) => void;
  onClose: () => void;
}

export const ModalSelecionarOrcamentoFollowUp: React.FC<ModalSelecionarOrcamentoFollowUpProps> = ({
  followUp,
  clientBudgets,
  onSelect,
  onClose,
}) => {
  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getStatusBadgeStyle = (status?: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'vendido' || s === 'fechado' || s === 'fechados') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s === 'perdido' || s === 'perdidos') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (s === 'negociando') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (s === 'aguardando retorno') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white border-b border-blue-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0052cc] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Selecionar orçamento
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                Cliente: <strong className="text-slate-800 font-bold">{followUp.cliente}</strong> ({clientBudgets.length} {clientBudgets.length === 1 ? 'orçamento' : 'orçamentos'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Orçamentos do Cliente */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          <div className="space-y-2.5">
            {clientBudgets.map((orc, idx) => (
              <div
                key={orc.id || idx}
                className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                {/* Informações: Data, Nome do orçamento, Status */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 break-words">
                      {orc.nomeOrcamento || 'Orçamento sem nome'}
                    </h4>
                    {orc.status && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${getStatusBadgeStyle(orc.status)}`}>
                        {orc.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{orc.dataOrcamento || 'Data não informada'}</span>
                    </span>
                  </div>
                </div>

                {/* Valor total e Botão Ver orçamento */}
                <div className="flex items-center sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Valor total
                    </span>
                    <span className="text-sm sm:text-base font-black text-[#071a52]">
                      {formatCurrency(orc.totalFinal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelect(orc)}
                    className="h-8.5 px-3.5 rounded-xl bg-[#0052cc] hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer flex-shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver orçamento</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
