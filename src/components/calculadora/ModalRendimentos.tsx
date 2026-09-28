import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  RendimentoItem,
  getStoredRendimentos,
  loadRendimentosFromSupabase,
  saveRendimento,
  deleteRendimento,
  UNIDADES_PADRAO_RENDIMENTO,
} from '../../utils/rendimentosService';

interface ModalRendimentosProps {
  onClose: () => void;
}

export const ModalRendimentos: React.FC<ModalRendimentosProps> = ({ onClose }) => {
  const [rendimentos, setRendimentos] = useState<RendimentoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RendimentoItem | null>(null);
  const [formProduto, setFormProduto] = useState('');
  const [formRendimento, setFormRendimento] = useState('');
  const [formUnidade, setFormUnidade] = useState(UNIDADES_PADRAO_RENDIMENTO[0]);
  const [formObservacao, setFormObservacao] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    // Carrega dados locais imediatamente
    setRendimentos(getStoredRendimentos());

    // Sincroniza da nuvem respeitando exclusões
    loadRendimentosFromSupabase().then((data) => {
      setRendimentos(data);
    });

    const handleUpdate = (e?: any) => {
      if (e?.detail?.items && Array.isArray(e.detail.items)) {
        setRendimentos(e.detail.items);
      } else {
        setRendimentos(getStoredRendimentos());
      }
    };

    window.addEventListener('fenix_rendimentos_updated', handleUpdate);
    return () => {
      window.removeEventListener('fenix_rendimentos_updated', handleUpdate);
    };
  }, []);

  const filteredRendimentos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rendimentos;
    return rendimentos.filter((item) => {
      return (
        item.produto.toLowerCase().includes(term) ||
        item.unidade.toLowerCase().includes(term) ||
        item.rendimento.toLowerCase().includes(term) ||
        (item.observacao && item.observacao.toLowerCase().includes(term))
      );
    });
  }, [rendimentos, searchTerm]);

  const handleOpenAddForm = () => {
    setEditingItem(null);
    setFormProduto('');
    setFormRendimento('');
    setFormUnidade(UNIDADES_PADRAO_RENDIMENTO[0]);
    setFormObservacao('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: RendimentoItem) => {
    setEditingItem(item);
    setFormProduto(item.produto);
    setFormRendimento(item.rendimento);
    setFormUnidade(item.unidade);
    setFormObservacao(item.observacao || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduto.trim()) {
      setFormError('Informe o nome do produto.');
      return;
    }
    if (!formRendimento.trim()) {
      setFormError('Informe o rendimento.');
      return;
    }
    if (!formUnidade.trim()) {
      setFormError('Informe a unidade.');
      return;
    }

    try {
      setIsSaving(true);
      const saved = await saveRendimento(
        {
          produto: formProduto,
          rendimento: formRendimento,
          unidade: formUnidade,
          observacao: formObservacao,
        },
        editingItem ? editingItem.id : undefined
      );

      // Atualiza o estado da lista imediatamente
      setRendimentos((prev) => {
        if (editingItem) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev.filter((item) => item.id !== saved.id)];
      });

      setIsFormOpen(false);
      showToast(
        editingItem
          ? '✓ Rendimento atualizado com sucesso!'
          : '✓ Novo rendimento cadastrado com sucesso!'
      );
    } catch (err) {
      console.error(err);
      setFormError('Erro ao salvar rendimento.');
    } finally {
      setIsSaving(false);
    }
  };

  // Exclusão real e imediata ao clicar no botão "Remover"
  const handleDeleteItem = async (item: RendimentoItem) => {
    const targetId = item.id;

    // 1. Atualiza imediatamente o estado da tabela e o contador (0ms)
    setRendimentos((prev) => prev.filter((i) => i.id !== targetId));

    try {
      // 2. Remove da fonte de dados (localStorage e Supabase kv_store permanentemente)
      await deleteRendimento(targetId);
      showToast(`✓ "${item.produto}" removido.`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover rendimento.');
      setRendimentos(getStoredRendimentos());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150"
      >
        {/* Toast Notificação */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-60 bg-[#071a52] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. CABEÇALHO */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4.5 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0057ff] flex items-center justify-center border border-blue-200/80 shadow-2xs flex-shrink-0">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-[#071a52]">
                  Rendimentos
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0057ff]">
                  Informativo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tabela simples e independente de rendimentos técnicos de produtos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFormOpen && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="h-9 px-3.5 rounded-xl bg-[#0057ff] hover:bg-[#0047db] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Adicionar Rendimento</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* 2. FORMULÁRIO DE ADICIONAR / EDITAR RENDIMENTO (CADASTRO MANUAL) */}
        {isFormOpen && (
          <form
            onSubmit={handleSaveForm}
            className="p-5 sm:p-6 bg-blue-50/40 border-b border-blue-100 space-y-4 animate-in slide-in-from-top-2 duration-150 flex-shrink-0"
          >
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0057ff]" />
                <h4 className="text-xs font-bold text-[#071a52] uppercase tracking-wider">
                  {editingItem ? 'Editar Rendimento' : 'Novo Cadastro de Rendimento'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Campo 1: Produto */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#071a52] uppercase tracking-wider mb-1">
                  Produto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={formProduto}
                  onChange={(e) => setFormProduto(e.target.value)}
                  placeholder="Nome do produto..."
                  className="w-full h-10 px-3.5 bg-white border border-slate-300 focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all"
                />
              </div>

              {/* Campo 2: Rendimento */}
              <div>
                <label className="block text-[11px] font-bold text-[#071a52] uppercase tracking-wider mb-1">
                  Rendimento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formRendimento}
                  onChange={(e) => setFormRendimento(e.target.value)}
                  placeholder="Ex: 3,34 ou 15"
                  className="w-full h-10 px-3.5 bg-white border border-slate-300 focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all"
                />
              </div>

              {/* Campo 3: Unidade */}
              <div>
                <label className="block text-[11px] font-bold text-[#071a52] uppercase tracking-wider mb-1">
                  Unidade <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="unidades-list"
                  value={formUnidade}
                  onChange={(e) => setFormUnidade(e.target.value)}
                  placeholder="Ex: m²/caixa, m/barra, un..."
                  className="w-full h-10 px-3.5 bg-white border border-slate-300 focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all"
                />
                <datalist id="unidades-list">
                  {UNIDADES_PADRAO_RENDIMENTO.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              {/* Campo 4: Observação */}
              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-[11px] font-bold text-[#071a52] uppercase tracking-wider mb-1">
                  Observação
                </label>
                <input
                  type="text"
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  placeholder="Observações complementares (opcional)..."
                  className="w-full h-10 px-3.5 bg-white border border-slate-300 focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-9 px-5 rounded-xl bg-[#0057ff] hover:bg-[#0047db] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{editingItem ? 'Atualizar Rendimento' : 'Salvar Rendimento'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 3. BARRA DE BUSCA E CONTADOR */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por produto, rendimento, unidade ou observação..."
              className="w-full h-10 pl-10 pr-9 bg-slate-50 border border-slate-200 focus:border-[#0057ff] focus:bg-white rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs font-semibold text-slate-500 flex-shrink-0">
            Total: <strong className="text-slate-900">{filteredRendimentos.length}</strong> {filteredRendimentos.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* 4. TABELA DE RENDIMENTOS: SOMENTE Produto | Rendimento | Unidade | Observação | Ações */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-2">
          {filteredRendimentos.length === 0 ? (
            <div className="text-center py-14 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Nenhum rendimento cadastrado</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchTerm
                    ? `Nenhum resultado para "${searchTerm}".`
                    : 'A tabela está vazia. Adicione rendimentos técnicos manualmente clicando no botão acima.'}
                </p>
              </div>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-[#0057ff] hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Cadastrar Primeiro Rendimento</span>
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[34%]">Produto</th>
                    <th className="py-3 px-4 text-center w-[16%]">Rendimento</th>
                    <th className="py-3 px-4 text-center w-[16%]">Unidade</th>
                    <th className="py-3 px-4 w-[22%]">Observação</th>
                    <th className="py-3 px-4 text-right w-[12%]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRendimentos.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Produto */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {item.produto}
                      </td>

                      {/* Rendimento */}
                      <td className="py-3 px-4 text-center font-extrabold text-[#071a52]">
                        {item.rendimento}
                      </td>

                      {/* Unidade */}
                      <td className="py-3 px-4 text-center font-semibold text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          {item.unidade}
                        </span>
                      </td>

                      {/* Observação */}
                      <td className="py-3 px-4 text-slate-500 font-normal">
                        {item.observacao ? (
                          <span>{item.observacao}</span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* Ações (Editar e Remover direto e real) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0057ff] hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Editar rendimento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200/80 transition-all cursor-pointer text-xs font-semibold flex items-center gap-1 active:scale-95"
                            title="Remover definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Dica Informativa */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#0057ff] flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-700">
                Base Informativa Independente
              </p>
              <p>
                Esta tabela é exclusivamente informativa e manual. Não possui vínculo com produtos, calculadora ou estoques.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
