import React, { useState, useEffect } from 'react';
import { X, Pencil, Package, AlertCircle, Check } from 'lucide-react';
import { EstoqueItem } from '../../types';
import { ProductCategory, ProductGroup } from '../../data/initialProductsSeed';
import {
  salvarItemEstoque,
  fetchCategoriasFromDatabase,
  fetchGruposFromDatabase,
} from '../../utils/estoqueService';

interface EditarProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EstoqueItem | null;
  currentUserName: string;
  onSuccess: (itemAtualizado?: EstoqueItem) => void;
}

export function EditarProdutoModal({
  isOpen,
  onClose,
  item,
  currentUserName,
  onSuccess,
}: EditarProdutoModalProps) {
  const [produto, setProduto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [grupo, setGrupo] = useState('');
  const [unidade, setUnidade] = useState('m²');
  const [estoqueMinimo, setEstoqueMinimo] = useState('10');
  const [observacoes, setObservacoes] = useState('');

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setProduto(item.produto || '');
      setCodigo(item.codigo || '');
      setMarca(item.marca || 'Fênix');
      setCategoria(item.categoria || 'Pisos Vinílicos');
      setGrupo(item.grupo || 'SEM GRUPO');
      setUnidade(item.unidade || 'm²');
      setEstoqueMinimo(String(item.estoqueMinimo ?? 10));
      setObservacoes(item.observacoes || '');
      setError(null);

      Promise.all([fetchCategoriasFromDatabase(), fetchGruposFromDatabase()])
        .then(([cats, grps]) => {
          setCategories(cats);
          setGroups(grps);
        })
        .catch(() => {});
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto.trim()) {
      setError('Informe o nome do produto.');
      return;
    }

    const estoqueMinimoNum = parseFloat(estoqueMinimo.replace(',', '.'));
    if (isNaN(estoqueMinimoNum) || estoqueMinimoNum < 0) {
      setError('Informe um estoque mínimo válido maior ou igual a zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedItem: EstoqueItem = {
        ...item,
        produto: produto.trim(),
        codigo: codigo.trim() || item.codigo,
        marca: marca.trim() || 'Fênix',
        categoria: categoria.trim() || 'Geral',
        grupo: grupo.trim() || 'SEM GRUPO',
        unidade: unidade.trim() || 'm²',
        estoqueMinimo: estoqueMinimoNum,
        observacoes: observacoes.trim() || undefined,
      };

      const res = await salvarItemEstoque(updatedItem, currentUserName || 'Sistema Fênix');

      if (!res.success) {
        setError(res.error || 'Erro ao atualizar dados do produto.');
        return;
      }

      onSuccess(updatedItem);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar edições.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2046] flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Editar Produto</h2>
              <p className="text-xs text-slate-500">
                Altere informações cadastrais e parâmetros de estoque.
              </p>
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

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={produto}
              onChange={(e) => setProduto(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Código e Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Categoria e Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria
              </label>
              <input
                type="text"
                list="edit-categorias-list"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
              <datalist id="edit-categorias-list">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grupo
              </label>
              <input
                type="text"
                list="edit-grupos-list"
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
              <datalist id="edit-grupos-list">
                {groups.map((g) => (
                  <option key={g.id} value={g.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Unidade, Estoque Atual (Informativo) e Estoque Mínimo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unidade
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white font-semibold"
              >
                <option value="UN">UN</option>
                <option value="M">M</option>
                <option value="M²">M²</option>
                <option value="KG">KG</option>
                <option value="L">L</option>
                <option value="CX">CX</option>
                <option value="PC">PC</option>
                <option value="KIT">KIT</option>
                <option value="ROLO">ROLO</option>
                <option value="SACO">SACO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Atual
              </label>
              <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                {Math.round(item.estoqueAtual)} {item.unidade}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Mínimo
              </label>
              <input
                type="text"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white font-bold"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
            />
          </div>

          {/* Rodapé e Ações */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
