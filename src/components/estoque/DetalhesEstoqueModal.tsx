import React, { useState } from 'react';
import { X, Package, Sliders, AlertCircle, CheckCircle2, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { EstoqueItem, MovimentacaoEstoque } from '../../types';
import { atualizarEstoqueMinimo } from '../../utils/estoqueService';

interface DetalhesEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EstoqueItem | null;
  movimentacoes: MovimentacaoEstoque[];
  currentUserName: string;
  onSuccess: (itemAtualizado?: EstoqueItem) => void;
}

export function DetalhesEstoqueModal({
  isOpen,
  onClose,
  item,
  movimentacoes,
  currentUserName,
  onSuccess,
}: DetalhesEstoqueModalProps) {
  const [novoMinimo, setNovoMinimo] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (item) {
      setNovoMinimo(String(item.estoqueMinimo || 10));
      setMsg(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const itemMovs = movimentacoes.filter((m) => m.estoqueItemId === item.id).slice(0, 10);

  const handleUpdateMinimo = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(novoMinimo.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      setMsg('Informe um valor válido maior ou igual a zero.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await atualizarEstoqueMinimo(item.id, val, currentUserName);
      if (res.success) {
        setMsg('Estoque mínimo atualizado com sucesso!');
        onSuccess(res.itemAtualizado);
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg(res.error || 'Erro ao atualizar.');
      }
    } catch {
      setMsg('Falha ao atualizar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{item.produto}</h3>
              <p className="text-[11px] font-mono text-slate-500">
                Código: {item.codigo} • Categoria: {item.categoria} • Marca: {item.marca}
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

        <div className="p-6 space-y-5">
          {/* Métricas do Estoque */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block">Estoque Atual</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">
                {Math.round(item.estoqueAtual)} {item.unidade}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block">Estoque Mínimo</span>
              <span className="text-lg font-bold text-slate-700 mt-1 block">
                {Math.round(item.estoqueMinimo)} {item.unidade}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block">Status</span>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {item.status}
              </span>
            </div>
          </div>

          {/* Ajuste de Estoque Mínimo */}
          <form onSubmit={handleUpdateMinimo} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800 block mb-2">Ajustar Estoque Mínimo</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0"
                value={novoMinimo}
                onChange={(e) => setNovoMinimo(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 font-semibold"
                placeholder="Novo mínimo"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            </div>
            {msg && <span className="text-[11px] text-emerald-700 mt-1.5 block font-medium">{msg}</span>}
          </form>

          {/* Histórico Recente do Produto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Últimas Movimentações do Produto</span>
              </span>
              <span className="text-[10px] text-slate-400">{itemMovs.length} registros</span>
            </div>

            {itemMovs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                Nenhuma movimentação registrada para este produto.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {itemMovs.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {m.tipo === 'ENTRADA' ? (
                        <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <ArrowDownLeft className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                          <ArrowUpRight className="w-3 h-3" />
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-800">
                          {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} ({m.subtipo || 'Geral'})
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {m.data} {m.hora ? `às ${m.hora}` : ''} • Por {m.usuario || 'Sistema'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-bold ${
                        m.tipo === 'ENTRADA' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {m.tipo === 'ENTRADA' ? '+' : '-'}
                      {m.quantidade} {m.unidade || item.unidade}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
