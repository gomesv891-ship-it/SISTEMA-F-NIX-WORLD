import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  Package,
  User,
  Pencil,
  Trash2,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
} from 'lucide-react';
import { MovimentacaoEstoque, EstoqueItem } from '../../types';
import { ProductCategory } from '../../data/initialProductsSeed';
import { EditarMovimentacaoModal } from './EditarMovimentacaoModal';
import { ExcluirMovimentacaoModal } from './ExcluirMovimentacaoModal';

interface EstoqueMovimentacoesViewProps {
  movimentacoes: MovimentacaoEstoque[];
  items?: EstoqueItem[];
  categories?: ProductCategory[];
  currentUserName: string;
  targetMovimentacaoId?: string | null;
  onRefresh: () => void;
}

export function EstoqueMovimentacoesView({
  movimentacoes,
  items = [],
  categories = [],
  currentUserName,
  targetMovimentacaoId,
  onRefresh,
}: EstoqueMovimentacoesViewProps) {
  // Filtros
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroProduto, setFiltroProduto] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('todos');

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(8);

  // Modais de Ação
  const [movToEdit, setMovToEdit] = useState<MovimentacaoEstoque | null>(null);
  const [movToDelete, setMovToDelete] = useState<MovimentacaoEstoque | null>(null);

  // Destaque de movimentação selecionada via notificação
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Efeito para focar na movimentação alvo
  useEffect(() => {
    const checkTarget = (targetId?: string) => {
      const id =
        targetId ||
        targetMovimentacaoId ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('fenix_target_movimentacao_id') : null);

      if (!id || movimentacoes.length === 0) return;

      try {
        sessionStorage.removeItem('fenix_target_movimentacao_id');
      } catch {}

      // Reseta filtros para garantir que o registro fique visível
      setDataInicio('');
      setDataFim('');
      setFiltroTipo('todos');
      setFiltroProduto('todos');
      setFiltroCategoria('todas');
      setFiltroResponsavel('todos');

      const idx = movimentacoes.findIndex((m) => String(m.id).trim() === String(id).trim());
      if (idx !== -1) {
        const page = Math.floor(idx / itemsPerPage) + 1;
        setCurrentPage(page);
        setHighlightedId(id);

        setTimeout(() => {
          const el = document.getElementById(`mov_row_${id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 250);

        setTimeout(() => {
          setHighlightedId((curr) => (curr === id ? null : curr));
        }, 8000);
      }
    };

    checkTarget();

    const handleEvent = (e: any) => {
      const id = e?.detail?.movimentacaoId;
      checkTarget(id);
    };

    window.addEventListener('fenix_open_estoque_movimentacao', handleEvent);
    return () => {
      window.removeEventListener('fenix_open_estoque_movimentacao', handleEvent);
    };
  }, [movimentacoes, targetMovimentacaoId, itemsPerPage]);

  // Lista única de responsáveis
  const responsaveisUnicos = useMemo(() => {
    const list = Array.from(new Set(movimentacoes.map((m) => m.usuario).filter(Boolean)));
    return list.sort();
  }, [movimentacoes]);

  // Limpar filtros
  const handleLimparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroTipo('todos');
    setFiltroProduto('todos');
    setFiltroCategoria('todas');
    setFiltroResponsavel('todos');
    setCurrentPage(1);
  };

  // Filtragem
  const filtered = useMemo(() => {
    return movimentacoes.filter((m) => {
      // Filtro Período (De / Até)
      if (dataInicio && m.data < dataInicio) return false;
      if (dataFim && m.data > dataFim) return false;

      // Filtro Tipo
      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'ENTRADA' && m.tipo !== 'ENTRADA') return false;
        if (filtroTipo === 'SAIDA_VENDA' && m.tipo !== 'SAIDA_VENDA') return false;
        if (filtroTipo === 'SAIDA_FULL' && m.tipo !== 'SAIDA_FULL') return false;
        if (filtroTipo === 'SAIDA_OUTRO' && m.tipo !== 'SAIDA_OUTRO') return false;
      }

      // Filtro Produto
      if (filtroProduto !== 'todos' && m.estoqueItemId !== filtroProduto && m.produtoNome !== filtroProduto) {
        return false;
      }

      // Filtro Categoria (cruza com items)
      if (filtroCategoria !== 'todas') {
        const prod = items.find((it) => it.id === m.estoqueItemId);
        if (prod && prod.categoria !== filtroCategoria) return false;
      }

      // Filtro Responsável
      if (filtroResponsavel !== 'todos' && m.usuario !== filtroResponsavel) {
        return false;
      }

      return true;
    });
  }, [movimentacoes, dataInicio, dataFim, filtroTipo, filtroProduto, filtroCategoria, filtroResponsavel, items]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderBadge = (m: MovimentacaoEstoque) => {
    if (m.tipo === 'ENTRADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowDownLeft className="w-3 h-3" />
          <span>↑ Entrada</span>
        </span>
      );
    }
    if (m.tipo === 'SAIDA_VENDA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <ArrowUpRight className="w-3 h-3" />
          <span>↓ Saída — Venda</span>
        </span>
      );
    }
    if (m.tipo === 'SAIDA_FULL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <ArrowUpRight className="w-3 h-3" />
          <span>↓ Saída — Full</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <ArrowUpRight className="w-3 h-3" />
        <span>↓ Saída — {m.subtipo || 'Outro'}</span>
      </span>
    );
  };

  const formatDataHora = (dataStr?: string, horaStr?: string) => {
    if (!dataStr) return '-';
    let dFormatted = dataStr;
    if (dataStr.includes('-')) {
      const parts = dataStr.split('-');
      if (parts.length === 3) {
        dFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return `${dFormatted} ${horaStr || ''}`.trim();
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Top Banner: Título à esquerda e Card Informativo Azul à direita (espelho da Imagem 1) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Movimentações de Estoque</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Registre manualmente todas as entradas e saídas de produtos. O estoque é atualizado automaticamente.
          </p>
        </div>

        {/* Card Informativo Azul com ícone Info */}
        <div className="flex items-start gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl max-w-md">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900">
            <p className="font-bold">Todas as movimentações são manuais.</p>
            <p className="text-blue-700 text-[11px] mt-0.5 leading-relaxed">
              Não são geradas automaticamente por Pedidos, Orçamentos, Vendas, Instalações ou outros módulos do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros (Período, Tipo, Produto, Categoria, Responsável, Filtrar, Limpar) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Período: De / Até */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Período: De</label>
              <div className="relative">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Até</label>
              <div className="relative">
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tipo */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA_VENDA">Saída — Venda</option>
              <option value="SAIDA_FULL">Saída — Full</option>
              <option value="SAIDA_OUTRO">Saída — Outro</option>
            </select>
          </div>

          {/* Produto */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Produto</label>
            <select
              value={filtroProduto}
              onChange={(e) => {
                setFiltroProduto(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500 truncate"
            >
              <option value="todos">Buscar produto... (Todos)</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.produto} ({it.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Categoria</label>
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="todas">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Responsável */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Responsável</label>
            <select
              value={filtroResponsavel}
              onChange={(e) => {
                setFiltroResponsavel(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="todos">Todos</option>
              {responsaveisUnicos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botões de Ação de Filtro */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLimparFiltros}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar</span>
          </button>
        </div>
      </div>

      {/* Tabela de Movimentações */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {movimentacoes.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma movimentação registrada</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Utilize os botões de ação superiores para registrar a primeira entrada ou saída no estoque.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma movimentação encontrada</p>
            <p className="text-xs text-slate-400 mt-1">Nenhum resultado corresponde aos filtros selecionados.</p>
            <button
              type="button"
              onClick={handleLimparFiltros}
              className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">DATA E HORA ⇅</th>
                  <th className="py-3 px-4">TIPO</th>
                  <th className="py-3 px-4">PRODUTO</th>
                  <th className="py-3 px-4 text-right">QUANTIDADE</th>
                  <th className="py-3 px-4">RESPONSÁVEL</th>
                  <th className="py-3 px-4">OBSERVAÇÃO</th>
                  <th className="py-3 px-4 text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((m) => {
                  const isHighlighted = highlightedId === m.id;
                  return (
                    <tr
                      key={m.id}
                      id={`mov_row_${m.id}`}
                      className={`transition-all duration-300 ${
                        isHighlighted
                          ? 'bg-blue-50/90 ring-2 ring-blue-500 shadow-md scale-[1.002]'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Data e Hora */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {isHighlighted && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-xs animate-pulse">
                              ★ Foco
                            </span>
                          )}
                          <span>{formatDataHora(m.data, m.hora)}</span>
                        </div>
                      </td>

                    {/* Tipo */}
                    <td className="py-3 px-4 whitespace-nowrap">{renderBadge(m)}</td>

                    {/* Produto */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 leading-tight">{m.produtoNome}</p>
                      {m.codigoProduto && (
                        <span className="text-[10px] font-mono text-slate-400">{m.codigoProduto}</span>
                      )}
                    </td>

                    {/* Quantidade */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          m.tipo === 'ENTRADA' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {m.tipo === 'ENTRADA' ? '+' : '-'} {Math.round(m.quantidade)} {m.unidade || 'un'}
                      </span>
                    </td>

                    {/* Responsável */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.usuario || 'Sistema Fênix'}</span>
                      </div>
                    </td>

                    {/* Observação */}
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      {m.vendaOrcamentoRelacionado && (
                        <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1">
                          {m.vendaOrcamentoRelacionado}
                        </span>
                      )}
                      {m.observacao ? (
                        <span className="text-slate-600 text-[11px]" title={m.observacao}>
                          {m.observacao}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Ações (Editar e Excluir) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMovToEdit(m)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200/60 shadow-2xs"
                          title="Editar movimentação"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovToDelete(m)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200/60 shadow-2xs"
                          title="Excluir movimentação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação (Mostrando 1 a 8 de 32 movimentações) */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500">
              Mostrando {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} movimentações
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                    currentPage === p
                      ? 'bg-[#0B2046] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200"
              >
                &gt;
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value={8}>8 por página</option>
                <option value={16}>16 por página</option>
                <option value={32}>32 por página</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edição de Movimentação */}
      {movToEdit && (
        <EditarMovimentacaoModal
          isOpen={!!movToEdit}
          onClose={() => setMovToEdit(null)}
          movimentacao={movToEdit}
          currentUserName={currentUserName}
          onSuccess={() => {
            onRefresh();
            setMovToEdit(null);
          }}
        />
      )}

      {/* Modal de Exclusão de Movimentação */}
      {movToDelete && (
        <ExcluirMovimentacaoModal
          isOpen={!!movToDelete}
          onClose={() => setMovToDelete(null)}
          movimentacao={movToDelete}
          currentUserName={currentUserName}
          onSuccess={() => {
            onRefresh();
            setMovToDelete(null);
          }}
        />
      )}
    </div>
  );
}
