import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  X,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Tag,
  Percent,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  RegraCustoPedido,
  CategoriaCustoPedido,
  TipoCustoPedido,
  AplicacaoCustoPedido,
  CATEGORIAS_CUSTO_PEDIDO,
  saveCustosPedidoRegras,
} from '../../utils/costsConfigService';

interface CustosPedidoTabProps {
  regras: RegraCustoPedido[];
  setRegras: React.Dispatch<React.SetStateAction<RegraCustoPedido[]>>;
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosPedidoTab: React.FC<CustosPedidoTabProps> = ({
  regras,
  setRegras,
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraCustoPedido | null>(null);

  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState<CategoriaCustoPedido>('Operacional');
  const [formTipo, setFormTipo] = useState<TipoCustoPedido>('%');
  const [formValor, setFormValor] = useState('0');
  const [formAplicacao, setFormAplicacao] = useState<AplicacaoCustoPedido>('Ambos');
  const [formDescricao, setFormDescricao] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [regraToDelete, setRegraToDelete] = useState<RegraCustoPedido | null>(null);

  const handleOpenNew = () => {
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode adicionar regras de custos.', 'error');
      return;
    }
    setEditingRegra(null);
    setFormNome('');
    setFormCategoria('Operacional');
    setFormTipo('%');
    setFormValor('0');
    setFormAplicacao('Ambos');
    setFormDescricao('');
    setFormAtivo(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (regra: RegraCustoPedido) => {
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode editar regras de custos.', 'error');
      return;
    }
    setEditingRegra(regra);
    setFormNome(regra.nome);
    setFormCategoria(regra.categoria);
    setFormTipo(regra.tipo);
    setFormValor(regra.valor.toString().replace('.', ','));
    setFormAplicacao(regra.aplicacao);
    setFormDescricao(regra.descricao || '');
    setFormAtivo(regra.ativo);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setFormError('Somente o Diretor Geral Éder Perez pode alterar regras de custos.');
      return;
    }

    if (!formNome.trim()) {
      setFormError('Informe o nome da regra de custo.');
      return;
    }

    const valNum = parseFloat(formValor.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valNum) || valNum < 0) {
      setFormError('Informe um valor numérico válido.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      let updatedList: RegraCustoPedido[];

      if (editingRegra) {
        updatedList = regras.map((r) =>
          r.id === editingRegra.id
            ? {
                ...r,
                nome: formNome.trim(),
                categoria: formCategoria,
                tipo: formTipo,
                valor: Number(valNum.toFixed(2)),
                aplicacao: formAplicacao,
                descricao: formDescricao.trim() || undefined,
                ativo: formAtivo,
              }
            : r
        );
      } else {
        const nova: RegraCustoPedido = {
          id: `regra-custo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nome: formNome.trim(),
          categoria: formCategoria,
          tipo: formTipo,
          valor: Number(valNum.toFixed(2)),
          aplicacao: formAplicacao,
          descricao: formDescricao.trim() || undefined,
          ativo: formAtivo,
        };
        updatedList = [...regras, nova];
      }

      const res = await saveCustosPedidoRegras(updatedList, currentUserName);
      if (res.success) {
        setRegras(updatedList);
        setIsModalOpen(false);
        if (showToast) {
          showToast(
            editingRegra ? 'Regra de custo atualizada no Supabase!' : 'Nova regra de custo cadastrada!',
            'success'
          );
        }
      } else {
        setFormError(res.error || 'Erro ao persistir no Supabase.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao salvar regra de custo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAtivo = async (regra: RegraCustoPedido) => {
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode ativar ou desativar regras.', 'error');
      return;
    }
    const updated = regras.map((r) => (r.id === regra.id ? { ...r, ativo: !r.ativo } : r));
    const res = await saveCustosPedidoRegras(updated, currentUserName);
    if (res.success) {
      setRegras(updated);
      if (showToast) showToast(`Regra "${regra.nome}" ${!regra.ativo ? 'ativada' : 'desativada'}.`, 'info');
    }
  };

  const handleDeleteRegra = async () => {
    if (!regraToDelete || !isDirector) return;
    setIsSaving(true);
    try {
      const updated = regras.filter((r) => r.id !== regraToDelete.id);
      const res = await saveCustosPedidoRegras(updated, currentUserName);
      if (res.success) {
        setRegras(updated);
        setRegraToDelete(null);
        if (showToast) showToast('Regra de custo removida.', 'success');
      } else {
        if (showToast) showToast(res.error || 'Erro ao remover regra.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Erro ao remover.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Custos do Pedido
            </h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {regras.filter((r) => r.ativo).length} ativas
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Categorias de custos que compõem os pedidos comerciais e de marketplace.
          </p>
        </div>

        <div>
          {isDirector ? (
            <button
              onClick={handleOpenNew}
              type="button"
              className="px-4 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Regra de Custo
            </button>
          ) : (
            <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Somente Diretor Éder pode editar
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Regras */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">Regra de Custo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Valor Padrão</th>
                <th className="py-3 px-4">Aplicação</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regras.map((regra) => (
                <tr key={regra.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {regra.nome}
                    {regra.descricao && (
                      <div className="text-[11px] text-slate-400 font-normal">
                        {regra.descricao}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
                      {regra.categoria}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    {regra.tipo}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {regra.tipo === '%'
                      ? `${regra.valor}%`
                      : regra.tipo === 'Fixo'
                      ? regra.valor === 0
                        ? 'Informado no Pedido'
                        : `R$ ${regra.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'Tabela'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        regra.aplicacao === 'Comercial'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : regra.aplicacao === 'Marketplace'
                          ? 'bg-orange-50 text-orange-700 border border-orange-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {regra.aplicacao}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      disabled={!isDirector || regra.obrigatorio}
                      onClick={() => handleToggleAtivo(regra)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer disabled:cursor-not-allowed ${
                        regra.ativo
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {regra.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {isDirector ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(regra)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!regra.obrigatorio && (
                          <button
                            onClick={() => setRegraToDelete(regra)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Somente leitura</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Regra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                {editingRegra ? 'Editar Regra de Custo' : 'Nova Regra de Custo'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRegra} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome da Regra *
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Embalagem Especial, Montagem..."
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
                    onChange={(e) => setFormCategoria(e.target.value as CategoriaCustoPedido)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {CATEGORIAS_CUSTO_PEDIDO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo *</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as TipoCustoPedido)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="%">% (Porcentagem)</option>
                    <option value="Fixo">Fixo (R$)</option>
                    <option value="Tabela">Tabela</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor Padrão ({formTipo === '%' ? '%' : 'R$'}) *
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Aplicação *</label>
                  <select
                    value={formAplicacao}
                    onChange={(e) => setFormAplicacao(e.target.value as AplicacaoCustoPedido)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Ambos">Ambos</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Marketplace">Marketplace</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Explicação do custo..."
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
                  {isSaving ? 'Salvando...' : 'Salvar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {regraToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center space-y-4 border border-rose-100 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remover Regra de Custo?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja remover a regra <strong>{regraToDelete.nome}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setRegraToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleDeleteRegra}
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
