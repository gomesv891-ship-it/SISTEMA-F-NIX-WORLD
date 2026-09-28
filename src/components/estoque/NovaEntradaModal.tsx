import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  RotateCcw,
  Package,
  Calendar,
  Search,
  Trash2,
  Plus,
  Truck,
  Building2,
} from 'lucide-react';
import { EstoqueItem, MovimentacaoEstoque } from '../../types';
import { registrarEntradaEstoque, EntradaItemPayload } from '../../utils/estoqueService';

interface NovaEntradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableProducts: EstoqueItem[];
  currentUserName: string;
  onSuccess?: (updatedItems?: EstoqueItem[], newMovs?: MovimentacaoEstoque[]) => void;
  initialSubtipo?: 'Compra' | 'Devolução' | 'Outro';
}

export function NovaEntradaModal({
  isOpen,
  onClose,
  availableProducts,
  currentUserName,
  onSuccess,
  initialSubtipo = 'Compra',
}: NovaEntradaModalProps) {
  const [subtipo, setSubtipo] = useState<'Compra' | 'Devolução' | 'Outro'>(initialSubtipo);
  const [dataEntrada, setDataEntrada] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [fornecedor, setFornecedor] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [observacao, setObservacao] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSubtipo(initialSubtipo || 'Compra');
      setSelectedItems([]);
      setSearchQuery('');
      setObservacao('');
      setFornecedor('');
      setErrorMessage(null);
    }
  }, [isOpen, initialSubtipo]);

  const [selectedItems, setSelectedItems] = useState<
    Array<{
      produtoId: string;
      produtoNome: string;
      codigo: string;
      unidade: string;
      quantidade: number;
    }>
  >([]);

  if (!isOpen) return null;

  const filteredProducts = availableProducts.filter((p) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      p.produto.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q)
    );
  });

  const handleSelectProduct = (p: EstoqueItem) => {
    if (selectedItems.some((x) => x.produtoId === p.id)) {
      setErrorMessage('Este produto já foi adicionado na lista abaixo.');
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        produtoId: p.id,
        produtoNome: p.produto,
        codigo: p.codigo,
        unidade: p.unidade,
        quantidade: 10,
      },
    ]);
    setSearchQuery('');
    setShowSearchResults(false);
    setErrorMessage(null);
  };

  const handleUpdateQuantity = (produtoId: string, val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.produtoId === produtoId ? { ...item, quantidade: isNaN(num) ? 0 : num } : item
      )
    );
  };

  const handleUpdateUnit = (produtoId: string, newUnit: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.produtoId === produtoId ? { ...item, unidade: newUnit } : item))
    );
  };

  const handleRemoveItem = (produtoId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.produtoId !== produtoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedItems.length === 0) {
      setErrorMessage('Por favor, adicione pelo menos um produto na lista da entrada.');
      return;
    }

    for (const it of selectedItems) {
      if (!it.quantidade || it.quantidade <= 0) {
        setErrorMessage(`Informe uma quantidade válida e maior que zero para "${it.produtoNome}".`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadItens: EntradaItemPayload[] = selectedItems.map((it) => ({
        produtoId: it.produtoId,
        quantidade: it.quantidade,
        unidade: it.unidade,
      }));

      const res = await registrarEntradaEstoque({
        itens: payloadItens,
        subtipo,
        data: dataEntrada,
        fornecedor: fornecedor.trim() || undefined,
        observacao: observacao.trim() || undefined,
        usuario: currentUserName || 'Sistema Fênix',
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao registrar entrada.');
        return;
      }

      if (onSuccess) {
        onSuccess(res.updatedItems, res.movsCriadas);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar entrada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Nova Entrada de Estoque</h2>
              <p className="text-xs text-slate-500">Registre a entrada de produtos no estoque.</p>
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

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Passo 1: Tipo de entrada */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-sm font-bold text-slate-800">Tipo de entrada</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opção Compra */}
              <label
                onClick={() => setSubtipo('Compra')}
                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  subtipo === 'Compra'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                    <span>Entrada — Compra</span>
                  </div>
                  <input
                    type="radio"
                    name="subtipoEntrada"
                    checked={subtipo === 'Compra'}
                    onChange={() => setSubtipo('Compra')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Produtos adquiridos para o estoque
                </p>
              </label>

              {/* Opção Devolução */}
              <label
                onClick={() => setSubtipo('Devolução')}
                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  subtipo === 'Devolução'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900">
                    <RotateCcw className="w-4 h-4 text-indigo-600" />
                    <span>Entrada — Devolução</span>
                  </div>
                  <input
                    type="radio"
                    name="subtipoEntrada"
                    checked={subtipo === 'Devolução'}
                    onChange={() => setSubtipo('Devolução')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Produtos devolvidos (pelo cliente, obra, etc.)
                </p>
              </label>

              {/* Opção Outro */}
              <label
                onClick={() => setSubtipo('Outro')}
                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  subtipo === 'Outro'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-900">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Entrada — Outro</span>
                  </div>
                  <input
                    type="radio"
                    name="subtipoEntrada"
                    checked={subtipo === 'Outro'}
                    onChange={() => setSubtipo('Outro')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Outros motivos (ex.: transferência, ajuste, etc.)
                </p>
              </label>
            </div>
          </div>

          {/* Passo 2: Data da entrada e Fornecedor */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-sm font-bold text-slate-800">Data da entrada e fornecedor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data da entrada</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataEntrada}
                    onChange={(e) => setDataEntrada(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all pr-10"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fornecedor (opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex.: Distribuidor Fênix, Tarkett Brasil..."
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all pl-9"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Passo 3: Buscar e selecionar produtos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <span className="text-sm font-bold text-slate-800">Buscar produto</span>
            </div>

            {/* Input de busca */}
            <div className="relative mb-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Digite o nome, código ou marca do produto..."
                  value={searchQuery}
                  onFocus={() => setShowSearchResults(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Lista de resultados dropdown */}
              {showSearchResults && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-20 divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Nenhum produto encontrado com "{searchQuery}".
                    </div>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-blue-50/60 transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                            {p.produto}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                              {p.codigo}
                            </span>
                            <span>•</span>
                            <span>{p.marca}</span>
                            <span>•</span>
                            <span>{p.categoria}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-medium text-slate-500">
                            Estoque atual: {Math.round(p.estoqueAtual)} {p.unidade}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Tabela de itens selecionados */}
            {selectedItems.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">PRODUTO</th>
                      <th className="py-2.5 px-3 w-28">QUANTIDADE</th>
                      <th className="py-2.5 px-3 w-24">UNIDADE</th>
                      <th className="py-2.5 px-3 w-12 text-center">AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item) => (
                      <tr key={item.produtoId} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-900 leading-tight">{item.produtoNome}</p>
                          <span className="text-[10px] font-mono text-slate-400">{item.codigo}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateQuantity(item.produtoId, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500 text-right bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.unidade}
                            onChange={(e) => handleUpdateUnit(item.produtoId, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white"
                          >
                            <option value="m²">m²</option>
                            <option value="cx">cx</option>
                            <option value="un">un</option>
                            <option value="balde">balde</option>
                            <option value="galão">galão</option>
                            <option value="saco">saco</option>
                            <option value="barra">barra</option>
                            <option value="tubo">tubo</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.produtoId)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Remover produto da entrada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSearchResults(true);
                const firstAvailable = availableProducts.find(
                  (p) => !selectedItems.some((s) => s.produtoId === p.id)
                );
                if (firstAvailable) handleSelectProduct(firstAvailable);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar outro produto</span>
            </button>
          </div>

          {/* Passo 4: Observação */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#0B2046] text-white text-[11px] font-bold flex items-center justify-center">
                4
              </span>
              <span className="text-sm font-bold text-slate-800">Observação (opcional)</span>
            </div>
            <div className="relative">
              <textarea
                maxLength={200}
                rows={2}
                placeholder="Ex.: NF 45290 — Carga descarregada no depósito principal..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400">
                {observacao.length}/200
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Total de itens: <span className="text-blue-700 font-bold">{selectedItems.length}</span>
            </span>

            <div className="flex items-center gap-3">
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
                disabled={isSubmitting || selectedItems.length === 0}
                className="px-5 py-2.5 bg-[#0B2046] hover:bg-[#081836] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <span>Salvar entrada</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
