import React, { useState, useEffect } from 'react';
import { X, Folder, Plus, Pencil, Trash2, Check, AlertCircle } from 'lucide-react';
import { ProductCategory } from '../../data/initialProductsSeed';
import {
  fetchCategoriasFromDatabase,
  salvarCategoriaNoBanco,
  excluirCategoriaDoBanco,
} from '../../utils/estoqueService';

interface CategoriasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onUpdated: () => void;
}

export function CategoriasModal({
  isOpen,
  onClose,
  currentUserName,
  onUpdated,
}: CategoriasModalProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const cats = await fetchCategoriasFromDatabase();
      setCategories(cats);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar categorias.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setError(null);
      setNewName('');
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    setError(null);

    const newCat: ProductCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim().toUpperCase(),
    };

    const res = await salvarCategoriaNoBanco(newCat, currentUserName || 'Sistema Fênix');
    if (res.success) {
      setNewName('');
      await loadCategories();
      onUpdated();
    } else {
      setError(res.error || 'Erro ao salvar categoria.');
    }
    setIsSaving(false);
  };

  const handleStartEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    setError(null);

    const updatedCat: ProductCategory = {
      id,
      name: editName.trim().toUpperCase(),
    };

    const res = await salvarCategoriaNoBanco(updatedCat, currentUserName || 'Sistema Fênix');
    if (res.success) {
      setEditingId(null);
      await loadCategories();
      onUpdated();
    } else {
      setError(res.error || 'Erro ao atualizar categoria.');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a categoria "${name}"?`)) return;
    setIsSaving(true);
    setError(null);

    const res = await excluirCategoriaDoBanco(id, currentUserName || 'Sistema Fênix');
    if (res.success) {
      await loadCategories();
      onUpdated();
    } else {
      setError(res.error || 'Erro ao excluir categoria.');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gerenciar Categorias</h2>
              <p className="text-xs text-slate-500">Crie, renomeie ou remova categorias oficiais.</p>
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

        <div className="p-6 space-y-4">
          {/* Adicionar nova categoria */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Nome da nova categoria (ex: MANTA VINÍLICA)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isSaving || !newName.trim()}
              className="px-4 py-2.5 bg-[#0B2046] hover:bg-[#081836] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </form>

          {/* Lista de categorias */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Carregando categorias...</div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">Nenhuma categoria cadastrada.</div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-blue-400 rounded-lg text-xs font-semibold text-slate-800 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Salvar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Folder className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-800">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar nome"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
