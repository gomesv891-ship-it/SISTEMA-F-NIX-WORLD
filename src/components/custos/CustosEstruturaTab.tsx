import React, { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  Lock,
  Check,
  X,
  AlertTriangle,
  Info,
  DollarSign,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  CustoEstruturaItem,
  CategoriaEstrutura,
  FrequenciaEstrutura,
  CATEGORIAS_ESTRUTURA,
  FREQUENCIAS_ESTRUTURA,
  calcularEquivalenteMensal,
  saveCustosEstrutura,
} from '../../utils/costsConfigService';

interface CustosEstruturaTabProps {
  estrutura: CustoEstruturaItem[];
  setEstrutura: React.Dispatch<React.SetStateAction<CustoEstruturaItem[]>>;
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosEstruturaTab: React.FC<CustosEstruturaTabProps> = ({
  estrutura,
  setEstrutura,
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  // Modal de Criar/Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustoEstruturaItem | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState<CategoriaEstrutura>('Aluguel');
  const [formValor, setFormValor] = useState('');
  const [formFrequencia, setFormFrequencia] = useState<FrequenciaEstrutura>('mensal');
  const [formStatus, setFormStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [formObs, setFormObs] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal de Exclusão
  const [itemToDelete, setItemToDelete] = useState<CustoEstruturaItem | null>(null);

  const formatBRL = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Itens filtrados
  const filteredItems = useMemo(() => {
    return estrutura.filter((item) => {
      const matchSearch =
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategoria === 'Todas' || item.categoria === filterCategoria;
      const matchStatus = filterStatus === 'Todos' || item.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [estrutura, searchTerm, filterCategoria, filterStatus]);

  // Totais
  const totalMensal = useMemo(() => {
    return estrutura
      .filter((i) => i.status === 'Ativo')
      .reduce((acc, curr) => acc + calcularEquivalenteMensal(curr.valor, curr.frequencia), 0);
  }, [estrutura]);

  const handleOpenNew = () => {
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode adicionar custos de estrutura.', 'error');
      return;
    }
    setEditingItem(null);
    setFormNome('');
    setFormCategoria('Aluguel');
    setFormValor('');
    setFormFrequencia('mensal');
    setFormStatus('Ativo');
    setFormObs('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CustoEstruturaItem) => {
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode editar custos de estrutura.', 'error');
      return;
    }
    setEditingItem(item);
    setFormNome(item.nome);
    setFormCategoria(item.categoria);
    setFormValor(item.valor.toFixed(2).replace('.', ','));
    setFormFrequencia(item.frequencia);
    setFormStatus(item.status);
    setFormObs(item.observacao || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setFormError('Somente o Diretor Geral Éder Perez pode alterar a estrutura de custos.');
      return;
    }

    if (!formNome.trim()) {
      setFormError('Informe o nome do custo operacional.');
      return;
    }

    const valorNum = parseFloat(formValor.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      let updatedList: CustoEstruturaItem[];

      if (editingItem) {
        updatedList = estrutura.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                nome: formNome.trim(),
                categoria: formCategoria,
                valor: Number(valorNum.toFixed(2)),
                frequencia: formFrequencia,
                status: formStatus,
                observacao: formObs.trim() || undefined,
                atualizadoEm: new Date().toISOString(),
              }
            : item
        );
      } else {
        const novo: CustoEstruturaItem = {
          id: `est-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nome: formNome.trim(),
          categoria: formCategoria,
          valor: Number(valorNum.toFixed(2)),
          frequencia: formFrequencia,
          status: formStatus,
          observacao: formObs.trim() || undefined,
          criadoPor: currentUserName || 'Éder Perez',
          atualizadoEm: new Date().toISOString(),
        };
        updatedList = [novo, ...estrutura];
      }

      // Salva no Supabase primeiro com confirmação obrigatória
      const res = await saveCustosEstrutura(updatedList, currentUserName);
      if (res.success) {
        setEstrutura(updatedList);
        setIsModalOpen(false);
        if (showToast) {
          showToast(
            editingItem ? 'Custo de estrutura atualizado com sucesso!' : 'Novo custo operacional cadastrado!',
            'success'
          );
        }
      } else {
        setFormError(res.error || 'Erro ao persistir no Supabase.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao salvar no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || !isDirector) return;
    setIsSaving(true);
    try {
      const updatedList = estrutura.filter((i) => i.id !== itemToDelete.id);
      const res = await saveCustosEstrutura(updatedList, currentUserName);
      if (res.success) {
        setEstrutura(updatedList);
        setItemToDelete(null);
        if (showToast) showToast('Item de estrutura removido com sucesso.', 'success');
      } else {
        if (showToast) showToast(res.error || 'Erro ao remover.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Erro ao remover item.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Regras e Ações */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Estrutura Operacional Geral
            </h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              Total Mensal: {formatBRL(totalMensal)}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Custos fixos e despesas gerais da empresa. <strong>Regra:</strong> Estrutura não entra
            automaticamente nos pedidos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirector ? (
            <button
              onClick={handleOpenNew}
              type="button"
              className="px-4 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Custo Operacional
            </button>
          ) : (
            <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Somente Diretor Éder pode editar
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden cursor-pointer"
          >
            <option value="Todas">Todas as Categorias</option>
            {CATEGORIAS_ESTRUTURA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden cursor-pointer"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Custos de Estrutura */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">Nome do Custo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Valor Original</th>
                <th className="py-3 px-4">Frequência</th>
                <th className="py-3 px-4">Equivalente Mensal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum custo operacional encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const eqMensal = calcularEquivalenteMensal(item.valor, item.frequencia);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.nome}
                        {item.observacao && (
                          <div className="text-[11px] text-slate-400 font-normal">
                            {item.observacao}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {formatBRL(item.valor)}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-600">
                        {item.frequencia}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatBRL(eqMensal)}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">/mês</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'Ativo'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isDirector ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar Custo"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remover Custo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Somente leitura</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastrar / Editar Custo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                {editingItem ? 'Editar Custo Operacional' : 'Novo Custo Operacional'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Custo Operacional *
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Aluguel Galpão, Energia Elétrica..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as CategoriaEstrutura)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {CATEGORIAS_ESTRUTURA.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Frequência *
                  </label>
                  <select
                    value={formFrequencia}
                    onChange={(e) => setFormFrequencia(e.target.value as FrequenciaEstrutura)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {FREQUENCIAS_ESTRUTURA.map((freq) => (
                      <option key={freq.id} value={freq.id}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor Original (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Ativo' | 'Inativo')}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer font-semibold"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Informações adicionais..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando no Supabase...' : 'Confirmar & Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center space-y-4 border border-rose-100 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remover Custo Operacional?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja remover <strong>{itemToDelete.nome}</strong> ({formatBRL(itemToDelete.valor)})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleDeleteItem}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Removendo...' : 'Sim, Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
