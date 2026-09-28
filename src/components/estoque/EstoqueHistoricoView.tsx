import React, { useState } from 'react';
import { History, Clock, User, ArrowRight, ShieldCheck, Search } from 'lucide-react';
import { MovimentacaoEstoque } from '../../types';

interface EstoqueHistoricoViewProps {
  movimentacoes: MovimentacaoEstoque[];
}

export function EstoqueHistoricoView({ movimentacoes }: EstoqueHistoricoViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = movimentacoes.filter((m) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      m.produtoNome.toLowerCase().includes(q) ||
      m.codigoProduto.toLowerCase().includes(q) ||
      (m.usuario || '').toLowerCase().includes(q) ||
      (m.observacao || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Histórico de Auditoria do Estoque</h3>
            <p className="text-xs text-slate-500">
              Registro cronológico detalhado de todas as operações de entrada, saída e ajuste.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Filtrar por produto ou usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400">
          Nenhum registro de auditoria encontrado.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 pl-6 py-2">
          {filtered.map((m) => (
            <div key={m.id} className="relative group">
              <span
                className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  m.tipo === 'ENTRADA'
                    ? 'bg-emerald-500'
                    : m.tipo === 'SAIDA_VENDA'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />

              <div className="p-4 bg-slate-50/70 group-hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{m.produtoNome}</span>
                    <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
                      {m.codigoProduto}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {m.data} {m.hora ? `às ${m.hora}` : ''}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-2">{m.observacao || 'Sem observações adicionais.'}</p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1 font-medium text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Realizado por: {m.usuario}</span>
                  </div>
                  <div>
                    <span>Variação de saldo: </span>
                    <span className="font-mono text-slate-600">{Math.round(m.saldoAnterior)}</span>
                    <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400" />
                    <span className="font-mono font-bold text-slate-900">{Math.round(m.saldoPosterior)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
