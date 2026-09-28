import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  X,
  Building2,
  History,
  RotateCcw,
  Coffee,
  Sparkles,
} from 'lucide-react';
import {
  InsumoLojaItem,
  InsumoMovimentacao,
  INSUMO_CATEGORIAS,
  SETORES_CONSUMO,
  fetchInsumosLoja,
  fetchInsumosMovimentacoes,
  cadastrarInsumo,
  atualizarInsumo,
  excluirInsumo,
  registrarEntradaInsumo,
  registrarSaidaConsumoInsumo,
} from '../../utils/insumosLojaService';

interface EstoqueInsumosViewProps {
  currentUserName: string;
}

export function EstoqueInsumosView({ currentUserName }: EstoqueInsumosViewProps) {
  const [insumos, setInsumos] = useState<InsumoLojaItem[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<InsumoMovimentacao[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'historico'>('catalogo');

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState<boolean>(false);
  const [isEditarModalOpen, setIsEditarModalOpen] = useState<boolean>(false);
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState<boolean>(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState<boolean>(false);
  const [selectedInsumo, setSelectedInsumo] = useState<InsumoLojaItem | null>(null);
  const [insumoToDelete, setInsumoToDelete] = useState<InsumoLojaItem | null>(null);

  // Formulário de Novo/Editar Insumo
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: INSUMO_CATEGORIAS[0],
    unidade: 'un',
    saldoAtual: 0,
    estoqueMinimo: 5,
    custoUnitario: 0,
    localizacao: '',
    observacoes: '',
  });

  // Formulário de Entrada
  const [entradaForm, setEntradaForm] = useState({
    insumoId: '',
    quantidade: 1,
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    custoUnitario: 0,
    subtipo: 'Compra Reposição',
    observacao: '',
    setorOuDestino: 'Almoxarifado',
  });

  // Formulário de Saída / Consumo
  const [saidaForm, setSaidaForm] = useState({
    insumoId: '',
    quantidade: 1,
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    setorOuDestino: SETORES_CONSUMO[0],
    subtipo: 'Consumo Interno',
    observacao: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ins, movs] = await Promise.all([
        fetchInsumosLoja(),
        fetchInsumosMovimentacoes(),
      ]);
      setInsumos(ins);
      setMovimentacoes(movs);
    } catch (err) {
      console.error('Erro ao carregar dados de insumos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('fenix_estoque_insumos_v1_updated', handleUpdate);
    window.addEventListener('fenix_estoque_insumos_movs_v1_updated', handleUpdate);
    return () => {
      window.removeEventListener('fenix_estoque_insumos_v1_updated', handleUpdate);
      window.removeEventListener('fenix_estoque_insumos_movs_v1_updated', handleUpdate);
    };
  }, []);

  // Status helper
  const getStatus = (saldo: number, min: number) => {
    if (saldo <= 0) return { label: 'Zerado', color: 'rose', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (saldo <= min) return { label: 'Estoque Baixo', color: 'rose', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (saldo <= min * 1.3) return { label: 'Em Atenção', color: 'amber', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Normal', color: 'emerald', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  // KPIs
  const stats = useMemo(() => {
    const totalItens = insumos.length;
    const totalSaldo = insumos.reduce((acc, it) => acc + (it.saldoAtual || 0), 0);
    const emAtencaoOuBaixo = insumos.filter((it) => (it.saldoAtual || 0) <= (it.estoqueMinimo || 0) * 1.3).length;
    const totalConsumosMes = movimentacoes.filter((m) => m.tipo === 'SAIDA_CONSUMO').length;

    return {
      totalItens,
      totalSaldo,
      emAtencaoOuBaixo,
      totalConsumosMes,
    };
  }, [insumos, movimentacoes]);

  // Insumos filtrados
  const filteredInsumos = useMemo(() => {
    return insumos.filter((it) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchNome = it.nome.toLowerCase().includes(term);
        const matchCode = it.codigo.toLowerCase().includes(term);
        const matchCat = it.categoria.toLowerCase().includes(term);
        const matchLoc = (it.localizacao || '').toLowerCase().includes(term);
        if (!matchNome && !matchCode && !matchCat && !matchLoc) return false;
      }
      if (selectedCategoria !== 'todas' && it.categoria !== selectedCategoria) {
        return false;
      }
      if (selectedStatus !== 'todos') {
        const st = getStatus(it.saldoAtual, it.estoqueMinimo).label;
        if (selectedStatus === 'normal' && st !== 'Normal') return false;
        if (selectedStatus === 'atencao' && st !== 'Em Atenção') return false;
        if (selectedStatus === 'baixo' && st !== 'Estoque Baixo' && st !== 'Zerado') return false;
      }
      return true;
    });
  }, [insumos, searchTerm, selectedCategoria, selectedStatus]);

  // Abertura de Modal de Novo Insumo
  const handleOpenNovo = () => {
    setFormData({
      codigo: `INS-${String(insumos.length + 1).padStart(3, '0')}`,
      nome: '',
      categoria: INSUMO_CATEGORIAS[0],
      unidade: 'un',
      saldoAtual: 0,
      estoqueMinimo: 5,
      custoUnitario: 0,
      localizacao: '',
      observacoes: '',
    });
    setIsNovoModalOpen(true);
  };

  // Salvar Novo Insumo
  const handleSaveNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('Informe o nome do insumo.');
      return;
    }
    try {
      await cadastrarInsumo(formData);
      setIsNovoModalOpen(false);
      await loadData();
      showToast('Insumo cadastrado com sucesso!');
    } catch (err) {
      alert('Erro ao salvar insumo.');
    }
  };

  // Abertura de Modal de Edição
  const handleOpenEditar = (it: InsumoLojaItem) => {
    setSelectedInsumo(it);
    setFormData({
      codigo: it.codigo,
      nome: it.nome,
      categoria: it.categoria,
      unidade: it.unidade,
      saldoAtual: it.saldoAtual,
      estoqueMinimo: it.estoqueMinimo,
      custoUnitario: it.custoUnitario || 0,
      localizacao: it.localizacao || '',
      observacoes: it.observacoes || '',
    });
    setIsEditarModalOpen(true);
  };

  // Salvar Edição
  const handleSaveEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsumo) return;
    try {
      await atualizarInsumo(selectedInsumo.id, formData);
      setIsEditarModalOpen(false);
      setSelectedInsumo(null);
      await loadData();
      showToast('Insumo atualizado com sucesso!');
    } catch (err) {
      alert('Erro ao atualizar insumo.');
    }
  };

  // Excluir
  const handleConfirmDelete = async () => {
    if (!insumoToDelete) return;
    try {
      await excluirInsumo(insumoToDelete.id);
      setInsumoToDelete(null);
      await loadData();
      showToast('Insumo removido com sucesso!');
    } catch (err) {
      alert('Erro ao excluir insumo.');
    }
  };

  // Abrir Modal de Entrada
  const handleOpenEntrada = (it?: InsumoLojaItem) => {
    const defaultId = it ? it.id : (insumos[0]?.id || '');
    const found = insumos.find((x) => x.id === defaultId);
    setEntradaForm({
      insumoId: defaultId,
      quantidade: 1,
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      custoUnitario: found?.custoUnitario || 0,
      subtipo: 'Compra Reposição',
      observacao: '',
      setorOuDestino: 'Almoxarifado',
    });
    setIsEntradaModalOpen(true);
  };

  // Salvar Entrada
  const handleSaveEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entradaForm.insumoId) {
      alert('Selecione o insumo.');
      return;
    }
    const res = await registrarEntradaInsumo({
      insumoId: entradaForm.insumoId,
      quantidade: Number(entradaForm.quantidade),
      data: entradaForm.data,
      hora: entradaForm.hora,
      responsavel: currentUserName,
      subtipo: entradaForm.subtipo,
      custoUnitario: Number(entradaForm.custoUnitario),
      observacao: entradaForm.observacao,
      setorOuDestino: entradaForm.setorOuDestino,
    });

    if (!res.success) {
      alert(res.error || 'Erro ao registrar entrada.');
      return;
    }

    setIsEntradaModalOpen(false);
    await loadData();
    showToast('Entrada de insumo registrada com sucesso!');
  };

  // Abrir Modal de Saída / Consumo
  const handleOpenSaida = (it?: InsumoLojaItem) => {
    const defaultId = it ? it.id : (insumos[0]?.id || '');
    setSaidaForm({
      insumoId: defaultId,
      quantidade: 1,
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      setorOuDestino: SETORES_CONSUMO[0],
      subtipo: 'Consumo Interno da Loja',
      observacao: '',
    });
    setIsSaidaModalOpen(true);
  };

  // Salvar Saída
  const handleSaveSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saidaForm.insumoId) {
      alert('Selecione o insumo.');
      return;
    }
    const res = await registrarSaidaConsumoInsumo({
      insumoId: saidaForm.insumoId,
      quantidade: Number(saidaForm.quantidade),
      data: saidaForm.data,
      hora: saidaForm.hora,
      responsavel: currentUserName,
      setorOuDestino: saidaForm.setorOuDestino,
      subtipo: saidaForm.subtipo,
      observacao: saidaForm.observacao,
    });

    if (!res.success) {
      alert(res.error || 'Erro ao registrar saída de insumo.');
      return;
    }

    setIsSaidaModalOpen(false);
    await loadData();
    showToast('Saída / Consumo registrado com sucesso!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BANNER INFORMATIVO */}
      <div className="bg-gradient-to-r from-blue-900/10 via-slate-50 to-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B2046] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#0B2046]">
              Controle de Insumos da Loja (Consumo Interno)
            </h2>
            <p className="text-xs text-slate-500">
              Gerencie materiais de escritório, copa, limpeza e embalagem sem misturar com produtos para venda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEntrada()}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Entrada de Insumo</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenSaida()}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>- Registrar Consumo</span>
          </button>
          <button
            type="button"
            onClick={handleOpenNovo}
            className="px-3.5 py-2 bg-[#0B2046] hover:bg-[#123366] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Novo Insumo</span>
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO / INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
              Total de Insumos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#0B2046]">{stats.totalItens}</span>
              <span className="text-xs text-slate-400">itens cadastrados</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
              Saldo Físico Total
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-700">{stats.totalSaldo}</span>
              <span className="text-xs text-emerald-600">unidades disponíveis</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
              Atenção / Repor
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-600">{stats.emAtencaoOuBaixo}</span>
              <span className="text-xs text-amber-600">insumos no limite</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
              Consumos da Loja
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-rose-700">{stats.totalConsumosMes}</span>
              <span className="text-xs text-rose-600">baixas registradas</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SUB-ABAS: CATÁLOGO DE INSUMOS & HISTÓRICO DE MOVIMENTAÇÕES */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveSubTab('catalogo')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'catalogo'
              ? 'text-[#0B2046] border-b-2 border-[#0B2046]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo & Saldo Disponível ({filteredInsumos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('historico')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'historico'
              ? 'text-[#0B2046] border-b-2 border-[#0B2046]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Entradas & Consumos ({movimentacoes.length})</span>
        </button>
      </div>

      {/* CONTEÚDO 1: CATÁLOGO & SALDO */}
      {activeSubTab === 'catalogo' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, código ou localização do insumo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Categoria */}
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
              >
                <option value="todas">Todas as Categorias</option>
                {INSUMO_CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Filtro Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="normal">Estoque Normal</option>
                <option value="atencao">Em Atenção</option>
                <option value="baixo">Estoque Baixo / Zerado</option>
              </select>

              {(searchTerm || selectedCategoria !== 'todas' || selectedStatus !== 'todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategoria('todas');
                    setSelectedStatus('todos');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* TABELA DE INSUMOS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Carregando insumos da loja...</div>
            ) : filteredInsumos.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Nenhum insumo encontrado</p>
                <p className="text-[11px] text-slate-400 mt-1">Ajuste os filtros ou cadastre um novo insumo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">CÓDIGO</th>
                      <th className="py-3 px-4">INSUMO</th>
                      <th className="py-3 px-4">CATEGORIA</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                      <th className="py-3 px-4 text-right">SALDO DISPONÍVEL</th>
                      <th className="py-3 px-4 text-right">ESTOQUE MÍN.</th>
                      <th className="py-3 px-4">LOCALIZAÇÃO</th>
                      <th className="py-3 px-4 text-center">AÇÕES RÁPIDAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInsumos.map((it) => {
                      const st = getStatus(it.saldoAtual, it.estoqueMinimo);
                      return (
                        <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#0B2046]">{it.codigo}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 leading-tight">{it.nome}</p>
                            {it.observacoes && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">{it.observacoes}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              {it.categoria}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.bg}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-extrabold text-sm text-[#0B2046]">
                              {it.saldoAtual}
                            </span>{' '}
                            <span className="text-[11px] text-slate-500 font-medium">{it.unidade}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-medium">
                            {it.estoqueMinimo} {it.unidade}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {it.localizacao || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Registrar Entrada deste insumo"
                                onClick={() => handleOpenEntrada(it)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Registrar Saída/Consumo deste insumo"
                                onClick={() => handleOpenSaida(it)}
                                className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Editar insumo"
                                onClick={() => handleOpenEditar(it)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Excluir insumo"
                                onClick={() => setInsumoToDelete(it)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO 2: HISTÓRICO DE MOVIMENTAÇÕES DE INSUMOS */}
      {activeSubTab === 'historico' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {movimentacoes.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Nenhuma movimentação de insumos registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">DATA & HORA</th>
                    <th className="py-3 px-4">TIPO</th>
                    <th className="py-3 px-4">INSUMO</th>
                    <th className="py-3 px-4 text-right">QUANTIDADE</th>
                    <th className="py-3 px-4 text-right">SALDO RESULTANTE</th>
                    <th className="py-3 px-4">SETOR / DESTINO</th>
                    <th className="py-3 px-4">RESPONSÁVEL</th>
                    <th className="py-3 px-4">OBSERVAÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimentacoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {m.data.split('-').reverse().join('/')} às {m.hora}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {m.tipo === 'ENTRADA' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Entrada (+{m.quantidade})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Consumo (-{m.quantidade})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{m.insumoNome}</span>
                        {m.insumoCodigo && (
                          <span className="text-[10px] font-mono text-slate-400 block">{m.insumoCodigo}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-slate-800">
                        {m.tipo === 'ENTRADA' ? `+${m.quantidade}` : `-${m.quantidade}`} {m.unidade}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-[#0B2046]">
                        {m.saldoPosterior} {m.unidade}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {m.setorOuDestino || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {m.responsavel}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {m.observacao || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NOVO INSUMO */}
      {isNovoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0B2046]" />
                <h3 className="text-sm sm:text-base font-bold text-[#0B2046]">Cadastrar Insumo da Loja</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNovoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNovo} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    {INSUMO_CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Insumo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Papel Sulfite A4 Report (cx c/ 10 resmas)"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="un">un (unidade)</option>
                    <option value="cx">cx (caixa)</option>
                    <option value="pct">pct (pacote)</option>
                    <option value="fardo">fardo</option>
                    <option value="rolo">rolo</option>
                    <option value="galão">galão</option>
                    <option value="par">par</option>
                    <option value="kg">kg</option>
                    <option value="L">L (litros)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Saldo Inicial</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.saldoAtual}
                    onChange={(e) => setFormData({ ...formData, saldoAtual: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.estoqueMinimo}
                    onChange={(e) => setFormData({ ...formData, estoqueMinimo: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custo Unitário Estimado (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.custoUnitario}
                    onChange={(e) => setFormData({ ...formData, custoUnitario: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Local de Armazenamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Almoxarifado, Copa, DML"
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  placeholder="Informações sobre uso, fornecedor habitual ou restrições..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNovoModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B2046] hover:bg-[#123366] text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR INSUMO */}
      {isEditarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#0B2046]" />
                <h3 className="text-sm sm:text-base font-bold text-[#0B2046]">Editar Insumo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditarModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditar} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    {INSUMO_CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Insumo</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="un">un (unidade)</option>
                    <option value="cx">cx (caixa)</option>
                    <option value="pct">pct (pacote)</option>
                    <option value="fardo">fardo</option>
                    <option value="rolo">rolo</option>
                    <option value="galão">galão</option>
                    <option value="par">par</option>
                    <option value="kg">kg</option>
                    <option value="L">L (litros)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Saldo Atual</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.saldoAtual}
                    onChange={(e) => setFormData({ ...formData, saldoAtual: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.estoqueMinimo}
                    onChange={(e) => setFormData({ ...formData, estoqueMinimo: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.custoUnitario}
                    onChange={(e) => setFormData({ ...formData, custoUnitario: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Localização</label>
                  <input
                    type="text"
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditarModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B2046] hover:bg-[#123366] text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENTRADA DE INSUMO */}
      {isEntradaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Registrar Entrada de Insumo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEntradaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntrada} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Insumo da Loja</label>
                <select
                  value={entradaForm.insumoId}
                  onChange={(e) => {
                    const found = insumos.find((x) => x.id === e.target.value);
                    setEntradaForm({
                      ...entradaForm,
                      insumoId: e.target.value,
                      custoUnitario: found?.custoUnitario || 0,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                >
                  {insumos.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.codigo} - {it.nome} (Saldo atual: {it.saldoAtual} {it.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantidade Entrando</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={entradaForm.quantidade}
                    onChange={(e) => setEntradaForm({ ...entradaForm, quantidade: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-extrabold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entradaForm.custoUnitario}
                    onChange={(e) => setEntradaForm({ ...entradaForm, custoUnitario: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={entradaForm.data}
                    onChange={(e) => setEntradaForm({ ...entradaForm, data: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Entrada</label>
                  <select
                    value={entradaForm.subtipo}
                    onChange={(e) => setEntradaForm({ ...entradaForm, subtipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Compra Reposição">Compra / Reposição</option>
                    <option value="Doação">Doação / Bonificação</option>
                    <option value="Ajuste de Estoque">Ajuste de Saldo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observação / Fornecedor</label>
                <input
                  type="text"
                  placeholder="Ex: Compra Kalunga NF 5420"
                  value={entradaForm.observacao}
                  onChange={(e) => setEntradaForm({ ...entradaForm, observacao: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEntradaModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SAÍDA / CONSUMO DA LOJA */}
      {isSaidaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Registrar Consumo / Saída</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaidaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSaida} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Insumo Consumido</label>
                <select
                  value={saidaForm.insumoId}
                  onChange={(e) => setSaidaForm({ ...saidaForm, insumoId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                >
                  {insumos.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.codigo} - {it.nome} (Disponível: {it.saldoAtual} {it.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantidade Retirada</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={saidaForm.quantidade}
                    onChange={(e) => setSaidaForm({ ...saidaForm, quantidade: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-extrabold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Setor / Destino</label>
                  <select
                    value={saidaForm.setorOuDestino}
                    onChange={(e) => setSaidaForm({ ...saidaForm, setorOuDestino: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    {SETORES_CONSUMO.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data da Retirada</label>
                  <input
                    type="date"
                    value={saidaForm.data}
                    onChange={(e) => setSaidaForm({ ...saidaForm, data: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motivo do Consumo</label>
                  <select
                    value={saidaForm.subtipo}
                    onChange={(e) => setSaidaForm({ ...saidaForm, subtipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Consumo Interno">Consumo Interno Regular</option>
                    <option value="Atendimento Cliente">Atendimento Showroom</option>
                    <option value="Limpeza / Higienização">Higienização da Loja</option>
                    <option value="Perda / Danificado">Avaria / Perda</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observação Adicional</label>
                <input
                  type="text"
                  placeholder="Ex: Retirada para abastecer cafeteira da recepção"
                  value={saidaForm.observacao}
                  onChange={(e) => setSaidaForm({ ...saidaForm, observacao: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSaidaModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Confirmar Consumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE INSUMO */}
      {insumoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Insumo da Loja?</h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="font-semibold text-slate-800">{insumoToDelete.nome}</p>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <span>Código: {insumoToDelete.codigo}</span>
                <span>•</span>
                <span>Saldo atual: {insumoToDelete.saldoAtual} {insumoToDelete.unidade}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInsumoToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Sim, Excluir Insumo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
