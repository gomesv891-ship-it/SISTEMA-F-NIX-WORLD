import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Percent,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
  Calculator,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  CustoVariavel,
  getCustosVariaveis,
  addCustoVariavel,
  updateCustoVariavel,
  deleteCustoVariavel,
  calcularCustosVariaveis,
  EVENT_CUSTOS_VARIAVEIS_UPDATED,
} from '../utils/custosVariaveis';

interface CustosVariaveisConfigViewProps {
  currentUserName?: string;
  isDirector: boolean;
  showToast: (msg: string) => void;
}

export const CustosVariaveisConfigView: React.FC<CustosVariaveisConfigViewProps> = ({
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [custos, setCustos] = useState<CustoVariavel[]>(() => getCustosVariaveis());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'fixo' | 'porcentagem'>('todos');

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCusto, setEditingCusto] = useState<CustoVariavel | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState<'fixo' | 'porcentagem'>('porcentagem');
  const [formValor, setFormValor] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Confirmação de Exclusão
  const [deletingCusto, setDeletingCusto] = useState<CustoVariavel | null>(null);

  // Simulador de Cálculo para o Diretor
  const [simuladorValorBase, setSimuladorValorBase] = useState('10000');

  useEffect(() => {
    const handleSync = () => {
      setCustos(getCustosVariaveis());
    };
    window.addEventListener(EVENT_CUSTOS_VARIAVEIS_UPDATED, handleSync);
    return () => {
      window.removeEventListener(EVENT_CUSTOS_VARIAVEIS_UPDATED, handleSync);
    };
  }, []);

  // Se não for o Diretor Éder, bloqueia o acesso
  if (!isDirector) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-lg mx-auto shadow-xs my-6">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 stroke-[2]" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          Acesso Exclusivo da Diretoria
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          A área de configuração de Custos Variáveis é restrita ao Diretor Éder Perez.
        </p>
      </div>
    );
  }

  // Filtragem dos custos
  const filteredCustos = useMemo(() => {
    return custos.filter((c) => {
      if (filterTipo !== 'todos' && c.tipo !== filterTipo) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          c.nome.toLowerCase().includes(q) ||
          (c.descricao && c.descricao.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [custos, filterTipo, searchTerm]);

  // Totais resumidos
  const stats = useMemo(() => {
    const total = custos.length;
    const fixos = custos.filter((c) => c.tipo === 'fixo').length;
    const percentuais = custos.filter((c) => c.tipo === 'porcentagem').length;
    const ativos = custos.filter((c) => c.ativo).length;
    return { total, fixos, percentuais, ativos };
  }, [custos]);

  // Resultado da simulação
  const simulacao = useMemo(() => {
    const base = parseFloat(simuladorValorBase.replace(/\./g, '').replace(',', '.')) || 0;
    return calcularCustosVariaveis(base, custos);
  }, [simuladorValorBase, custos]);

  // Abrir modal para novo custo
  const handleOpenAdd = () => {
    setEditingCusto(null);
    setFormNome('');
    setFormTipo('porcentagem');
    setFormValor('');
    setFormDescricao('');
    setFormAtivo(true);
    setFormError('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar custo
  const handleOpenEdit = (c: CustoVariavel) => {
    setEditingCusto(c);
    setFormNome(c.nome);
    setFormTipo(c.tipo);
    setFormValor(
      c.tipo === 'porcentagem'
        ? c.valor.toString().replace('.', ',')
        : c.valor.toFixed(2).replace('.', ',')
    );
    setFormDescricao(c.descricao || '');
    setFormAtivo(c.ativo);
    setFormError('');
    setIsModalOpen(true);
  };

  // Salvar custo (adicionar ou editar)
  const handleSaveCusto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormError('Por favor, informe o nome do custo variável.');
      return;
    }

    const valorLimpo = formValor.replace(/\./g, '').replace(',', '.');
    const valorNum = parseFloat(valorLimpo);
    if (isNaN(valorNum) || valorNum < 0) {
      setFormError('Por favor, informe um valor numérico válido.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCusto) {
        await updateCustoVariavel(editingCusto.id, {
          nome: formNome.trim(),
          tipo: formTipo,
          valor: valorNum,
          descricao: formDescricao.trim() || undefined,
          ativo: formAtivo,
        });
        showToast('Custo variável atualizado com sucesso!');
      } else {
        await addCustoVariavel({
          nome: formNome.trim(),
          tipo: formTipo,
          valor: valorNum,
          descricao: formDescricao.trim() || undefined,
          ativo: formAtivo,
          criadoPor: currentUserName || 'Éder Perez',
        });
        showToast('Novo custo variável cadastrado com sucesso!');
      }
      setCustos(getCustosVariaveis());
      setIsModalOpen(false);
    } catch (err) {
      setFormError('Ocorreu um erro ao salvar o custo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!deletingCusto) return;
    try {
      await deleteCustoVariavel(deletingCusto.id);
      setCustos(getCustosVariaveis());
      showToast(`Custo "${deletingCusto.nome}" removido com sucesso.`);
    } catch (err) {
      showToast('Erro ao remover custo.');
    } finally {
      setDeletingCusto(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* BANNER EXCLUSIVO DA DIRETORIA */}
      <div className="bg-gradient-to-r from-amber-50 via-blue-50 to-indigo-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                Custos Variáveis — Área Exclusiva do Diretor
              </h2>
              <span className="text-[10px] uppercase font-extrabold tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                Éder Perez
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cadastre e gerencie custos variáveis fixos (R$) ou percentuais (%) para os cálculos do sistema e regras de margem da diretoria.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-[#0052cc] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Custo Variável</span>
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Cadastrados</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-800">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{stats.ativos} ativos no momento</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Em Porcentagem (%)</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{stats.percentuais}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Calculados sobre o valor</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Em Valor Fixo (R$)</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-700">{stats.fixos}</div>
          <div className="text-[11px] text-indigo-600 mt-0.5">Valor fixo por operação</div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'porcentagem', label: 'Porcentagem (%)' },
              { id: 'fixo', label: 'Valor Fixo (R$)' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTipo(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                filterTipo === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do custo..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* TABELA DE CUSTOS VARIÁVEIS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nome do Custo</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4 text-right">Valor Definido</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Nenhum custo variável encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCustos.map((custo) => (
                  <tr key={custo.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{custo.nome}</span>
                        {custo.descricao && (
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            {custo.descricao}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {custo.tipo === 'porcentagem' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <Percent className="w-3 h-3" />
                          Porcentagem
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                          <DollarSign className="w-3 h-3" />
                          Valor Fixo
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                      {custo.tipo === 'porcentagem' ? (
                        <span className="text-emerald-700">{custo.valor.toFixed(2)} %</span>
                      ) : (
                        <span className="text-indigo-700">
                          R$ {custo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {custo.ativo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                          <Check className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(custo)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Editar custo"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCusto(custo)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remover custo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SIMULADOR DE CÁLCULO DE CUSTOS VARIÁVEIS */}
      <div className="bg-gradient-to-br from-slate-900 via-[#071a52] to-slate-900 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Simulador Dinâmico de Custos Variáveis
              </h3>
              <p className="text-[11px] text-slate-300">
                Visualize em tempo real como os custos cadastrados acima incidem sobre um orçamento base.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium">Valor Base (R$):</span>
            <input
              type="number"
              value={simuladorValorBase}
              onChange={(e) => setSimuladorValorBase(e.target.value)}
              className="w-32 px-3 py-1 text-xs font-mono font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[11px] text-slate-400">Total Custos Percentuais</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              R$ {simulacao.totalPercentuais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[11px] text-slate-400">Total Custos Fixos</div>
            <div className="text-lg font-bold text-indigo-400 font-mono">
              R$ {simulacao.totalFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-blue-400/20">
            <div className="text-[11px] text-blue-200 font-semibold">Custo Variável Total</div>
            <div className="text-xl font-extrabold text-white font-mono">
              R$ {simulacao.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE CUSTO VARIÁVEL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 text-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center font-bold">
                  {editingCusto ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#071a52]">
                    {editingCusto ? 'Editar Custo Variável' : 'Cadastrar Novo Custo Variável'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Regra exclusiva de custos do Diretor Éder Perez
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCusto} className="space-y-4">
              {/* Nome do Custo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Custo Variável *
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Impostos / Nota Fiscal, Comissão, Taxa de Cartão"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                />
              </div>

              {/* Seletor de Tipo: Fixo (R$) ou Porcentagem (%) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Custo *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTipo('porcentagem')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formTipo === 'porcentagem'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs ring-1 ring-emerald-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Porcentagem (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTipo('fixo')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      formTipo === 'fixo'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-2xs ring-1 ring-indigo-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Valor Fixo (R$)</span>
                  </button>
                </div>
              </div>

              {/* Valor em R$ ou % */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {formTipo === 'porcentagem' ? 'Valor em Porcentagem (%) *' : 'Valor Fixo em Reais (R$) *'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    {formTipo === 'porcentagem' ? '%' : 'R$'}
                  </div>
                  <input
                    type="text"
                    required
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder={formTipo === 'porcentagem' ? 'Ex: 5,5' : 'Ex: 150,00'}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold text-slate-800"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {formTipo === 'porcentagem'
                    ? 'Será calculado percentualmente sobre o valor do orçamento.'
                    : 'Será adicionado como custo fixo em reais na operação.'}
                </span>
              </div>

              {/* Descrição / Observação */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição ou Observação (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Detalhes sobre a incidência deste custo..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Custo Ativo</span>
                  <span className="text-[10px] text-slate-400 block">
                    Se desativado, não incidirá sobre novos orçamentos ou simulações.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#0052cc] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : editingCusto ? 'Salvar Alterações' : 'Cadastrar Custo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingCusto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-sm space-y-4 shadow-2xl text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800">
                Remover Custo Variável?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja remover <strong>&quot;{deletingCusto.nome}&quot;</strong>? Esta ação é irreversível.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCusto(null)}
                className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
