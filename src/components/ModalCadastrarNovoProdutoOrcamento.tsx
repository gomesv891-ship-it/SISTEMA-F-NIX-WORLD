import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Plus,
  Check,
  Tag,
  AlertCircle,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { getOfficialCategories, CatalogProduct, getProductTierPrice } from '../data/productCatalog';
import { registerNewProductInCatalog, normalizeText } from '../utils/orcamentoShortcuts';
import { PriceTableTier } from '../types';

interface ModalCadastrarNovoProdutoOrcamentoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: CatalogProduct, initialQty: string, initialDetail?: string) => void;
  currentUserName?: string;
  initialName?: string;
  priceTableTier?: PriceTableTier;
}

export const ModalCadastrarNovoProdutoOrcamento: React.FC<ModalCadastrarNovoProdutoOrcamentoProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUserName = 'Vanessa Gomes',
  initialName = '',
  priceTableTier = 'Cliente Final',
}) => {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [isNovaCategoria, setIsNovaCategoria] = useState(false);
  const [unidade, setUnidade] = useState('m²');
  const [precoInput, setPrecoInput] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [detalhe, setDetalhe] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingCategories = useMemo(() => {
    return getOfficialCategories();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setNome(initialName.trim());
      setError('');
      setIsNovaCategoria(false);
      setNovaCategoria('');
      setQuantidade('1');
      setDetalhe('');
      setPrecoInput('');

      // Categoria padrão inteligente
      if (existingCategories.length > 0) {
        setCategoria(existingCategories[0].name);
      } else {
        setCategoria('Pisos Vinílicos');
      }
    }
  }, [isOpen, initialName, existingCategories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nome.trim();
    if (!cleanName) {
      setError('Por favor, informe o nome do produto.');
      return;
    }

    const targetCategory = isNovaCategoria ? novaCategoria.trim() : categoria.trim();
    if (!targetCategory) {
      setError('Por favor, selecione ou informe uma categoria.');
      return;
    }

    const cleanPrecoDigits = precoInput.replace(/\D/g, '');
    const numPreco = cleanPrecoDigits ? parseFloat(cleanPrecoDigits) / 100 : 0;
    if (numPreco <= 0) {
      setError('Por favor, informe o preço unitário do produto.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const result = await registerNewProductInCatalog({
        name: cleanName,
        categoryName: targetCategory,
        unit: unidade.trim() || 'un',
        priceClienteFinal: numPreco,
        currentUserName,
      });

      onSuccess(result.product, quantidade.trim() || '1', detalhe.trim() || undefined);
      onClose();
    } catch (err: any) {
      console.error('Erro ao cadastrar produto:', err);
      setError(err?.message || 'Não foi possível cadastrar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B2046] to-[#0052cc] text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#091122] tracking-tight">
                Cadastrar Novo Produto
              </h3>
              <p className="text-xs text-slate-500">
                Salva no catálogo oficial e adiciona imediatamente a este orçamento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8.5 h-8.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Nome do Produto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex: Piso Vinílico Flexfloor Carvalho 2mm"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-2xs"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Não duplica se já existir um produto com este nome no catálogo.
            </span>
          </div>

          {/* Categoria */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Categoria <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsNovaCategoria(!isNovaCategoria)}
                className="text-[11px] font-bold text-[#0052cc] hover:underline cursor-pointer"
              >
                {isNovaCategoria ? 'Selecionar existente' : '+ Nova categoria'}
              </button>
            </div>

            {isNovaCategoria ? (
              <input
                type="text"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                placeholder="Nome da nova categoria (ex: Perfis Especiais)"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-2xs"
              />
            ) : (
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-2xs cursor-pointer"
              >
                {existingCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Grid: Unidade & Preço Base */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Unidade de Medida
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-2xs cursor-pointer"
              >
                <option value="m²">m² (Metro quadrado)</option>
                <option value="un">un (Unidade)</option>
                <option value="barra">barra (Barra)</option>
                <option value="cx">cx (Caixa)</option>
                <option value="kg">kg (Quilo)</option>
                <option value="metro">metro (Metro linear)</option>
                <option value="lata">lata (Balde/Lata)</option>
                <option value="rolo">rolo (Rolo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Preço Base / Unitário (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="text-xs font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                  R$
                </span>
                <input
                  type="text"
                  value={precoInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (!digits) {
                      setPrecoInput('');
                      return;
                    }
                    const num = parseFloat(digits) / 100;
                    setPrecoInput(
                      num.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    );
                    if (error) setError('');
                  }}
                  placeholder="0,00"
                  className="w-full h-11 pl-9 pr-3.5 bg-white border border-slate-300 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-extrabold text-slate-900 outline-none transition-all shadow-2xs text-right"
                />
              </div>
            </div>
          </div>

          {/* Quantidade Inicial & Detalhe para este Orçamento */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Inserção no Orçamento Atual
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="text"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="1"
                  className="w-full h-10 px-3 text-center bg-white border border-slate-300 focus:border-[#0052cc] rounded-xl text-sm font-bold text-slate-900 outline-none shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detalhe <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={detalhe}
                  onChange={(e) => setDetalhe(e.target.value)}
                  placeholder="Ex: cor, lote, espessura..."
                  className="w-full h-10 px-3 bg-white border border-slate-300 focus:border-[#0052cc] rounded-xl text-xs font-medium text-slate-800 outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0B2046] to-[#0052cc] hover:from-[#081733] hover:to-[#0041a8] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Salvar no Catálogo e Adicionar ao Orçamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
