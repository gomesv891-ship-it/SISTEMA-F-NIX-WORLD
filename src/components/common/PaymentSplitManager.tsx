import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Banknote,
  FileText,
  Smartphone,
  Building2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { FormaPagamentoItem } from '../../types';

export const PAYMENT_METHODS_OPTIONS = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto Bancário',
  'Dinheiro',
  'Transferência Bancária',
] as const;

export const PARCELAS_OPTIONS = [
  '1x',
  '2x',
  '3x',
  '4x',
  '5x',
  '6x',
  '7x',
  '8x',
  '9x',
  '10x',
  '11x',
  '12x',
  '13x',
  '14x',
  '15x',
  '16x',
  '17x',
  '18x',
  '19x',
  '20x',
] as const;

export const normalizeParcelas = (val?: string): string => {
  if (!val) return '1x';
  if (val === '1x à vista') return '1x';
  return val;
};

export const isFormaCartaoCredito = (forma: string): boolean => {
  const f = (forma || '').toLowerCase();
  return (
    f.includes('crédito') ||
    f.includes('credito') ||
    ((f.includes('cartão') || f.includes('cartao')) && !f.includes('débito') && !f.includes('debito'))
  );
};

export const formatCurrency = (val: number): string => {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const parseBRLInput = (raw: string): number => {
  if (!raw) return 0;
  const digits = raw.replace(/\D/g, '');
  return digits ? parseFloat(digits) / 100 : 0;
};

export const summarizePayments = (payments: FormaPagamentoItem[]): string => {
  if (!payments || payments.length === 0) return 'Não informado';
  return payments
    .map((p) => {
      const isCard = isFormaCartaoCredito(p.forma);
      const parcStr = isCard && p.parcelas ? ` — ${p.parcelas}${String(p.parcelas).toLowerCase().includes('x') ? '' : 'x'}` : '';
      return `${p.forma}: ${formatCurrency(p.valor)}${parcStr}`;
    })
    .join(' + ');
};

export const isPaymentSplitComplete = (
  payments: FormaPagamentoItem[],
  totalVenda: number
): boolean => {
  if (!payments || payments.length === 0 || totalVenda <= 0) return false;
  const totalPago = payments.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  return Math.abs(totalPago - totalVenda) < 0.01;
};

interface PaymentSplitManagerProps {
  totalVenda: number;
  payments: FormaPagamentoItem[];
  onChange: (payments: FormaPagamentoItem[]) => void;
  compact?: boolean;
}

export const PaymentSplitManager: React.FC<PaymentSplitManagerProps> = ({
  totalVenda,
  payments,
  onChange,
  compact = false,
}) => {
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newForma, setNewForma] = useState<string>('Pix');
  const [newValorStr, setNewValorStr] = useState<string>('');
  const [newParcelas, setNewParcelas] = useState<string>('1x');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForma, setEditForma] = useState<string>('Pix');
  const [editValorStr, setEditValorStr] = useState<string>('');
  const [editParcelas, setEditParcelas] = useState<string>('1x');

  const totalPago = payments.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  const diferenca = totalVenda - totalPago;
  const isComplete = Math.abs(diferenca) < 0.01 && totalVenda > 0 && payments.length > 0;
  const isPending = diferenca > 0.01;
  const isExceeded = diferenca < -0.01;

  const getMethodIcon = (forma: string) => {
    const f = forma.toLowerCase();
    if (f.includes('pix')) return <Smartphone className="w-3.5 h-3.5 text-emerald-600" />;
    if (f.includes('cartão') || f.includes('cartao'))
      return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
    if (f.includes('boleto')) return <FileText className="w-3.5 h-3.5 text-amber-600" />;
    if (f.includes('dinheiro')) return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
    return <Building2 className="w-3.5 h-3.5 text-slate-600" />;
  };

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setNewForma('Pix');
    setNewParcelas('1x');
    // Preenche com o restante se houver diferença positiva
    const restante = Math.max(0, diferenca);
    setNewValorStr(restante > 0 ? formatCurrency(restante) : '');
  };

  const handleConfirmAdd = () => {
    const val = parseBRLInput(newValorStr);
    if (val <= 0) {
      alert('Informe um valor de pagamento maior que zero.');
      return;
    }
    const isCard = isFormaCartaoCredito(newForma);
    const newItem: FormaPagamentoItem = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      forma: newForma,
      valor: val,
      parcelas: isCard ? normalizeParcelas(newParcelas) : undefined,
    };
    onChange([...payments, newItem]);
    setIsAddingNew(false);
    setNewValorStr('');
    setNewParcelas('1x');
  };

  const handleStartEdit = (item: FormaPagamentoItem) => {
    setIsAddingNew(false);
    setEditingId(item.id);
    setEditForma(item.forma);
    setEditValorStr(formatCurrency(item.valor));
    setEditParcelas(normalizeParcelas(item.parcelas));
  };

  const handleConfirmEdit = () => {
    if (!editingId) return;
    const val = parseBRLInput(editValorStr);
    if (val <= 0) {
      alert('Informe um valor de pagamento maior que zero.');
      return;
    }
    const isCard = isFormaCartaoCredito(editForma);
    const updated = payments.map((p) =>
      p.id === editingId
        ? {
            ...p,
            forma: editForma,
            valor: val,
            parcelas: isCard ? editParcelas : undefined,
          }
        : p
    );
    onChange(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = payments.filter((p) => p.id !== id);
    onChange(updated);
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="w-full space-y-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 text-slate-800">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B2046]">
            Formas de Pagamento
          </span>
          <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
            {payments.length} {payments.length === 1 ? 'forma' : 'formas'}
          </span>
        </div>

        {!isAddingNew && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Adicionar forma de pagamento</span>
          </button>
        )}
      </div>

      {/* Lista de formas já adicionadas */}
      <div className="space-y-1.5">
        {payments.length === 0 && !isAddingNew && (
          <div className="text-center py-4 px-3 bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
            <p>Nenhuma forma de pagamento registrada para esta venda.</p>
            <button
              type="button"
              onClick={handleStartAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#0052cc] hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar forma de pagamento</span>
            </button>
          </div>
        )}

        {/* MODO 1: Pagamento Único (Caso mais comum) - Edição Rápida e Direta */}
        {payments.length === 1 && !isAddingNew && editingId !== payments[0].id ? (
          (() => {
            const p = payments[0];
            const isCard = isFormaCartaoCredito(p.forma);
            return (
              <div
                key={p.id}
                className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs animate-in fade-in duration-150"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={p.forma}
                      onChange={(e) => {
                        const newF = e.target.value;
                        const nextIsCard = isFormaCartaoCredito(newF);
                        onChange([
                          {
                            ...p,
                            forma: newF,
                            parcelas: nextIsCard ? normalizeParcelas(p.parcelas) : undefined,
                          },
                        ]);
                      }}
                      className="w-full h-9.5 px-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#0052cc] focus:bg-white cursor-pointer transition-colors"
                    >
                      {PAYMENT_METHODS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Valor
                      </label>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Editar valor
                      </button>
                    </div>
                    <div className="h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-black text-slate-900 text-xs sm:text-sm">
                      <span>{formatCurrency(p.valor)}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                        title="Editar valor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* CAMPO DE PARCELAS: EXIBIDO SOMENTE PARA CARTÃO DE CRÉDITO */}
                {isCard && (
                  <div className="pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                      Quantidade de Parcelas
                    </label>
                    <select
                      value={normalizeParcelas(p.parcelas)}
                      onChange={(e) => {
                        onChange([
                          {
                            ...p,
                            parcelas: e.target.value,
                          },
                        ]);
                      }}
                      className="w-full h-9.5 px-3 bg-blue-50/70 hover:bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-950 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {PARCELAS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* MODO 2: Múltiplas Formas de Pagamento */
          payments.map((p) => {
            const isThisEditing = editingId === p.id;
            const isCard = isFormaCartaoCredito(p.forma);

            if (isThisEditing) {
              return (
                <div
                  key={p.id}
                  className="p-2.5 bg-white border-2 border-blue-400 rounded-xl shadow-xs space-y-2 animate-in fade-in duration-150"
                >
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Editar Forma de Pagamento
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Forma de Pagamento
                      </label>
                      <select
                        value={editForma}
                        onChange={(e) => {
                          const newF = e.target.value;
                          setEditForma(newF);
                          if (!isFormaCartaoCredito(newF)) {
                            setEditParcelas('1x');
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      >
                        {PAYMENT_METHODS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Valor (R$)
                      </label>
                      <input
                        type="text"
                        value={editValorStr}
                        onChange={(e) => {
                          const val = parseBRLInput(e.target.value);
                          setEditValorStr(formatCurrency(val));
                        }}
                        placeholder="R$ 0,00"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* PARCELAS: EXCLUSIVO PARA CARTÃO DE CRÉDITO */}
                  {isFormaCartaoCredito(editForma) && (
                    <div className="pt-1">
                      <label className="block text-[10px] font-bold text-blue-900 mb-0.5">
                        Quantidade de Parcelas
                      </label>
                      <select
                        value={normalizeParcelas(editParcelas)}
                        onChange={(e) => setEditParcelas(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {PARCELAS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmEdit}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#0052cc] hover:bg-blue-700 text-white rounded-md text-xs font-bold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {getMethodIcon(p.forma)}
                  </div>
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 truncate">{p.forma}</span>
                    {isCard && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md whitespace-nowrap">
                        {normalizeParcelas(p.parcelas)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-black text-slate-900 text-xs sm:text-sm">
                    {formatCurrency(p.valor)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(p)}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      title="Editar forma de pagamento"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Excluir forma de pagamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Formulário Inline: Adicionar Nova Forma */}
      {isAddingNew && (
        <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider">
              Nova Forma de Pagamento
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-emerald-950 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={newForma}
                onChange={(e) => {
                  const newF = e.target.value;
                  setNewForma(newF);
                  if (!isFormaCartaoCredito(newF)) {
                    setNewParcelas('1x');
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 focus:border-emerald-600 rounded-lg text-xs font-bold text-slate-800 outline-none"
              >
                {PAYMENT_METHODS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-950 mb-1">
                Valor (R$)
              </label>
              <input
                type="text"
                value={newValorStr}
                onChange={(e) => {
                  const val = parseBRLInput(e.target.value);
                  setNewValorStr(formatCurrency(val));
                }}
                placeholder="R$ 0,00"
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 focus:border-emerald-600 rounded-lg text-xs font-bold text-slate-900 outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* PARCELAS: EXCLUSIVO PARA CARTÃO DE CRÉDITO */}
          {isFormaCartaoCredito(newForma) && (
            <div className="pt-1">
              <label className="block text-[10px] font-bold text-emerald-950 mb-1">
                Quantidade de Parcelas (Cartão de Crédito)
              </label>
              <select
                value={newParcelas}
                onChange={(e) => setNewParcelas(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 focus:border-emerald-600 rounded-lg text-xs font-bold text-emerald-950 outline-none cursor-pointer"
              >
                {PARCELAS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {diferenca > 0.01 && (
              <button
                type="button"
                onClick={() => setNewValorStr(formatCurrency(diferenca))}
                className="text-[10px] font-semibold text-emerald-800 hover:underline cursor-pointer"
              >
                Usar restante ({formatCurrency(diferenca)})
              </button>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bloco de Resumo / Balanço dos Pagamentos */}
      <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Total da Venda
            </span>
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
              {formatCurrency(totalVenda)}
            </span>
          </div>

          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Total Pago
            </span>
            <span className="font-extrabold text-[#0052cc] text-xs sm:text-sm">
              {formatCurrency(totalPago)}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Status do Pagamento
            </span>
            {isComplete ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pagamento completo
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Falta {formatCurrency(diferenca)}
              </span>
            ) : isExceeded ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Excedeu {formatCurrency(Math.abs(diferenca))}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400">Pendente</span>
            )}
          </div>
        </div>

        {/* Mensagem visual explícita de validação */}
        {isComplete ? (
          <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>✓ Pagamento completo. Total confere exatamente com a venda.</span>
          </div>
        ) : isPending ? (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Restam <strong>{formatCurrency(diferenca)}</strong> para completar o valor da venda.
            </span>
          </div>
        ) : isExceeded ? (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>
              O valor pago excede o total da venda em <strong>{formatCurrency(Math.abs(diferenca))}</strong>.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
