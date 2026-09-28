import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Plus,
  Tag,
  Check,
  Package,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  getDynamicProductCatalog,
  getOfficialCategories,
  getProductTierPrice,
  getOfficialPriceTableLabel,
  CatalogProduct,
} from '../data/productCatalog';
import { PriceTableTier } from '../types';

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientType: string;
  priceTable: PriceTableTier;
  onSelectProduct: (product: {
    name: string;
    category: string;
    unit: string;
    price: number;
    quantity: string;
    subtitulo?: string;
  }) => void;
  onOpenCadastrarNovoProduto?: (initialName?: string) => void;
}

export const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  isOpen,
  onClose,
  clientType,
  priceTable,
  onSelectProduct,
  onOpenCadastrarNovoProduto,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [subtituloInput, setSubtituloInput] = useState<string>('');
  const [priceInput, setPriceInput] = useState<string>('');

  const products = useMemo(() => getDynamicProductCatalog(), [isOpen]);
  const categories = useMemo(() => getOfficialCategories(), [isOpen]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Name filter
      const matchesName =
        !searchTerm.trim() ||
        prod.name.toLowerCase().includes(searchTerm.toLowerCase().trim());

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' ||
        prod.categoryId === selectedCategory ||
        prod.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesName && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  const handleChooseProduct = (prod: CatalogProduct) => {
    const tierPrice = getProductTierPrice(prod, priceTable);
    const parsedPrice = priceInput
      ? parseFloat(priceInput.replace(/\./g, '').replace(',', '.')) || tierPrice
      : tierPrice;
    const cleanQty = quantityInput.trim() || '1';

    onSelectProduct({
      name: prod.name,
      category: prod.category,
      unit: prod.unit,
      price: parsedPrice,
      quantity: cleanQty,
      subtitulo: subtituloInput.trim() || undefined,
    });

    // Reset temporary state & close
    setSelectedProductId(null);
    setQuantityInput('1');
    setSubtituloInput('');
    setPriceInput('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#091122]">
                  Adicionar Produtos ao Orçamento
                </h2>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-[#0057ff]">
                  Base Oficial PRODUTOS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Cliente: <strong className="text-slate-700">{clientType}</strong></span>
                <span>•</span>
                <span>Tabela ativa: <strong className="text-[#0057ff]">{getOfficialPriceTableLabel(priceTable)}</strong> (Automática)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCadastrarNovoProduto && (
              <button
                type="button"
                onClick={() => {
                  onOpenCadastrarNovoProduto(searchTerm);
                }}
                className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#0B2046] to-[#0052cc] hover:from-[#081733] hover:to-[#0041a8] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Cadastrar Novo Produto"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Cadastrar Novo Produto</span>
                <span className="sm:hidden">Novo</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-white space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search by Name */}
            <div className="sm:col-span-7">
              <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#0057ff]" />
                <span>Buscar pelo NOME do produto</span>
              </label>
              <div className="h-11 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-2 focus-within:ring-blue-500/10 flex items-center px-3.5 transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o que está buscando..."
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter by Category */}
            <div className="sm:col-span-5">
              <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0057ff]" />
                <span>Filtrar por CATEGORIA</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="all">Todas as Categorias ({products.length} itens)</option>
                {categories.map((cat) => {
                  const count = products.filter(
                    (p) => p.categoryId === cat.id || p.category.toLowerCase() === cat.name.toLowerCase()
                  ).length;
                  return (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-semibold transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 mb-1">
            <span>
              Mostrando <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'produto' : 'produtos'}
            </span>
            <span className="text-[11px] text-slate-400">
              Valores calculados automaticamente para a tabela <strong className="text-slate-700">{getOfficialPriceTableLabel(priceTable)}</strong>
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">Nenhum produto encontrado</p>
              <p className="text-xs text-slate-400 mt-1">
                Tente ajustar os termos da busca ou mudar a categoria selecionada.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {(searchTerm || selectedCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                )}
                {onOpenCadastrarNovoProduto && (
                  <button
                    type="button"
                    onClick={() => onOpenCadastrarNovoProduto(searchTerm)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B2046] to-[#0052cc] hover:from-[#081733] hover:to-[#0041a8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Cadastrar Novo Produto</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const currentPrice = getProductTierPrice(prod, priceTable);
              const isSelected = selectedProductId === prod.id;

              return (
                <div
                  key={prod.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#0057ff] bg-blue-50/30 ring-2 ring-blue-500/15'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase">
                          {prod.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0057ff] text-[10px] font-semibold">
                          Unidade: {prod.unit}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-[15px] font-bold text-[#091122] leading-snug">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-slate-400 font-medium">
                          Preço ({getOfficialPriceTableLabel(priceTable)})
                        </p>
                        <p className="text-base sm:text-lg font-extrabold text-[#0057ff]">
                          R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-xs font-normal text-slate-500 ml-1">/ {prod.unit}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProductId(null);
                          } else {
                            setSelectedProductId(prod.id);
                            const safeNum = Number(currentPrice) || 0;
                            setPriceInput(safeNum.toFixed(2).replace('.', ','));
                            if (!quantityInput) setQuantityInput('1');
                          }
                        }}
                        className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0057ff] text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Configurar</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Selecionar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded configuration when selected */}
                  {isSelected && (
                    <div className="mt-3.5 pt-3.5 border-t border-blue-100 bg-white/80 -mx-3.5 -mb-3.5 p-3.5 rounded-b-2xl animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Quantidade ({prod.unit})
                          </label>
                          <input
                            type="text"
                            value={quantityInput}
                            onChange={(e) => setQuantityInput(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-300 px-2 text-center text-sm font-bold text-slate-900 outline-none focus:border-[#0057ff]"
                            placeholder="1"
                            autoFocus
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Detalhe (cor, caixas, etc.)
                          </label>
                          <input
                            type="text"
                            value={subtituloInput}
                            onChange={(e) => setSubtituloInput(e.target.value)}
                            placeholder="Ex: cor, quantidade de caixas..."
                            className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs sm:text-sm text-slate-800 outline-none focus:border-[#0057ff]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Preço Unit. (R$) - Editável
                          </label>
                          <input
                            type="text"
                            value={priceInput || (Number(currentPrice) || 0).toFixed(2).replace('.', ',')}
                            onChange={(e) => setPriceInput(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-300 px-3 text-right text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-[#0057ff]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <button
                            type="button"
                            onClick={() => handleChooseProduct(prod)}
                            className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>Inserir no Orçamento</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <p className="text-slate-500">
            Você poderá alterar o preço manualmente no orçamento sem afetar o cadastro oficial de produtos.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
