import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Pencil, Trash2, Check, AlertCircle } from 'lucide-react';
import { ProductGroup, ProductCategory } from '../../data/initialProductsSeed';
import {
  fetchGruposFromDatabase,
  fetchCategoriasFromDatabase,
  salvarGrupoNoBanco,
  excluirGrupoDoBanco,
} from '../../utils/estoqueService';

interface GruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onUpdated: () => void;
}

export function GruposModal({
  isOpen,
  onClose,
  currentUserName,
  onUpdated,
}: GruposModalProps) {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [grps, cats] = await Promise.all([
        fetchGruposFromDatabase(),
        fetchCategoriasFromDatabase(),
      ]);
      setGroups(grps);
      setCategories(cats);
      if (cats.length > 0 && !newCategoryId) {
        setNewCategoryId(cats[0].id);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar grupos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError(null);
      setNewName('');
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    setError(null);

    const newGrp: ProductGroup = {
      id: `grp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim().toUpperCase(),
      categoryId: newCategoryId || (categories[0]?.id || 'cat-default'),
      color: newColor,
    };

    const res = await salvarGrupoNoBanco(newGrp, currentUserName || 'Sistema Fênix');
    if (res.success) {
      setNewName('');
      await loadData();
      onUpdated();
    } else {
      setError(res.error || 'Erro ao salvar grupo.');
    }
    setIsSaving(false);
  };

  const handleStartEdit = (grp: ProductGroup) => {
    setEditingId(grp.id);
    setEditName(grp.name);
    setEditCategory(grp.categoryId);
    setEditColor(grp.color || '#3b82f6');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    setError(null);

    const updatedGrp: ProductGroup = {
      id,
      name: editName.trim().toUpperCase(),
      categoryId: editCategory,
      color: editColor,
    };

    const res = await salvarGrupoNoBanco(updatedGrp, currentUserName || 'Sistema Fênix');
    if (res.success) {
      setEditingId(null);
      await loadData();
      onUpdated();
    } else {
      setError(res.error || 'Erro ao atualizar grupo.');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o grupo "${name}"?`)) return;
    setIsSaving(true);
    setError(null);

    const res = await excluirGrupoDoBanco(id, currentUserName || 'Sistema Fênix');
    if (res.success) {
      await loadData();
      onUpdated();
    } else {
      setError(res.error || 'Erro ao excluir grupo.');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gerenciar Grupos</h2>
              <p className="text-xs text-slate-500">Organize as linhas e acabamentos dos produtos.</p>
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
          {/* Adicionar novo grupo */}
          <form onSubmit={handleAddGroup} className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800 block">Novo Grupo de Produtos</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  placeholder="Nome do grupo (ex: FLEXFLOOR)..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-4">
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-1">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
                  title="Cor identificadora"
                />
                <button
                  type="submit"
                  disabled={isSaving || !newName.trim()}
                  className="flex-1 py-2 bg-[#0B2046] hover:bg-[#081836] text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Lista de grupos */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Carregando grupos...</div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">Nenhum grupo cadastrado.</div>
            ) : (
              groups.map((grp) => {
                const catName = categories.find((c) => c.id === grp.categoryId)?.name || 'Geral';
                return (
                  <div key={grp.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                    {editingId === grp.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 border border-blue-400 rounded-lg text-xs font-semibold text-slate-800 bg-white"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(grp.id)}
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
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: grp.color || '#3b82f6' }}
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-800">{grp.name}</span>
                            <span className="text-[10px] text-slate-400 block">{catName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(grp)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar grupo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(grp.id, grp.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir grupo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
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
