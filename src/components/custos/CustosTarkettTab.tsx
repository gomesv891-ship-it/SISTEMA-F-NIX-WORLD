import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Layers,
  History,
  Search,
  Plus,
  Save,
  Trash2,
  Lock,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Percent,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Tag,
  Edit2,
} from 'lucide-react';
import {
  TarkettProdutoReferencia,
  TarkettSimulacaoItem,
  CustoTarkettItem,
  calcularSimuladorTarkett,
  getTarkettSimulacoes,
  saveNovaTarkettSimulacao,
  deleteTarkettSimulacao,
  getTarkettProdutosCatalogo,
  saveTarkettProdutosCatalogo,
  deleteTarkettProdutoCatalogo,
  saveOrUpdateTarkettProduto,
  getCustosTarkettItens,
  addCustoTarkett,
  updateCustoTarkett,
  deleteCustoTarkett,
  toggleStatusCustoTarkett,
  EVENT_CUSTOS_TARKETT_UPDATED,
} from '../../utils/costsConfigService';

interface CustosTarkettTabProps {
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type TarkettSubTab = 'Simulador' | 'Produtos' | 'Custos' | 'Histórico';

export const CustosTarkettTab: React.FC<CustosTarkettTabProps> = ({
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<TarkettSubTab>('Simulador');

  // Proteção obrigatória: usuários não-diretores nunca visualizam ou acessam a sub-aba 'Custos'
  useEffect(() => {
    if (!isDirector && subTab === 'Custos') {
      setSubTab('Simulador');
    }
  }, [isDirector, subTab]);

  // Custos Tarkett Oficiais com persistência e sincronização em tempo real
  const [custosTarkett, setCustosTarkett] = useState<CustoTarkettItem[]>([]);
  const [isLoadingCustos, setIsLoadingCustos] = useState(false);

  // Estados de Gerenciamento de Custos (Exclusivo Éder Perez)
  const [isAddCustoModalOpen, setIsAddCustoModalOpen] = useState(false);
  const [isSavingCusto, setIsSavingCusto] = useState(false);
  const [newCustoNome, setNewCustoNome] = useState('');
  const [newCustoTipo, setNewCustoTipo] = useState<'R$' | '%'>('R$');
  const [newCustoValor, setNewCustoValor] = useState('');
  const [newCustoQtdM2, setNewCustoQtdM2] = useState('100');
  const [newCustoObs, setNewCustoObs] = useState('');

  // Edição de Custo Tarkett
  const [isEditCustoModalOpen, setIsEditCustoModalOpen] = useState(false);
  const [editingCustoId, setEditingCustoId] = useState<string | null>(null);
  const [editCustoNome, setEditCustoNome] = useState('');
  const [editCustoTipo, setEditCustoTipo] = useState<'R$' | '%'>('R$');
  const [editCustoValor, setEditCustoValor] = useState('');
  const [editCustoQtdM2, setEditCustoQtdM2] = useState('100');
  const [editCustoObs, setEditCustoObs] = useState('');

  // Exclusão de Custo Tarkett
  const [custoToDelete, setCustoToDelete] = useState<CustoTarkettItem | null>(null);
  const [isDeletingCusto, setIsDeletingCusto] = useState(false);

  // Carregar e sincronizar custos Tarkett
  useEffect(() => {
    let mounted = true;
    setIsLoadingCustos(true);
    getCustosTarkettItens()
      .then((items) => {
        if (mounted) setCustosTarkett(items);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingCustos(false);
      });

    const handleCustosUpdate = () => {
      getCustosTarkettItens().then((items) => {
        if (mounted) setCustosTarkett(items);
      });
    };

    window.addEventListener(EVENT_CUSTOS_TARKETT_UPDATED, handleCustosUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(EVENT_CUSTOS_TARKETT_UPDATED, handleCustosUpdate);
    };
  }, []);

  // Catálogo dinâmico de produtos com persistência e desconto individual
  const [produtosRef, setProdutosRef] = useState<TarkettProdutoReferencia[]>(() =>
    getTarkettProdutosCatalogo()
  );
  const [searchProduto, setSearchProduto] = useState('');

  // Modal de Confirmação de Exclusão Permanente
  const [productToDelete, setProductToDelete] = useState<TarkettProdutoReferencia | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Modal de Novo Produto Tarkett
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCodigo, setNewCodigo] = useState('');
  const [newLinha, setNewLinha] = useState('Essence 30');
  const [newUnidade, setNewUnidade] = useState('m²');
  const [newQuantidadeM2, setNewQuantidadeM2] = useState('1');
  const [newPreco, setNewPreco] = useState('');
  const [newDesconto, setNewDesconto] = useState('10');
  const [newDescricao, setNewDescricao] = useState('');

  // Modal de Edição de Produto Tarkett
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editLinha, setEditLinha] = useState('');
  const [editUnidade, setEditUnidade] = useState('m²');
  const [editQuantidadeM2, setEditQuantidadeM2] = useState('1');
  const [editPreco, setEditPreco] = useState('');
  const [editDesconto, setEditDesconto] = useState('10');
  const [editDescricao, setEditDescricao] = useState('');

  // Sincronização em tempo real do catálogo
  useEffect(() => {
    const handleUpdate = () => {
      setProdutosRef(getTarkettProdutosCatalogo());
    };
    window.addEventListener('fenix_tarkett_produtos_updated', handleUpdate);
    return () => window.removeEventListener('fenix_tarkett_produtos_updated', handleUpdate);
  }, []);

  // Simulador States
  const [produtoNome, setProdutoNome] = useState('Piso Vinílico Tarkett Linha Essence 30');
  const [linhaNome, setLinhaNome] = useState('Essence 30');
  const [unidade, setUnidade] = useState('m²');
  const [quantidadeDesejadaM2Input, setQuantidadeDesejadaM2Input] = useState('1');
  const [precoSiteInput, setPrecoSiteInput] = useState('89,90');
  const [descontoFabricaInput, setDescontoFabricaInput] = useState('10');
  const [freteInput, setFreteInput] = useState('0');
  const [outrosCustosInput, setOutrosCustosInput] = useState('0');

  // Margens configuráveis por perfil
  const [margemCFInput, setMargemCFInput] = useState('35');
  const [margemRevInput, setMargemRevInput] = useState('18');
  const [margemConsInput, setMargemConsInput] = useState('22');
  const [simulacaoObs, setSimulacaoObs] = useState('');

  // Histórico
  const [historico, setHistorico] = useState<TarkettSimulacaoItem[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const [isSavingSimulacao, setIsSavingSimulacao] = useState(false);

  const formatBRL = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const parseNumber = (str: string) =>
    parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;

  // Cálculos dinâmicos em tempo real com Quantidade desejada em m² e Custos Ativos da Tarkett
  const calculo = useMemo(() => {
    return calcularSimuladorTarkett({
      precoSiteFabrica: parseNumber(precoSiteInput),
      descontoFabricaPercent: parseNumber(descontoFabricaInput),
      freteValor: parseNumber(freteInput),
      outrosCustosPercent: parseNumber(outrosCustosInput),
      margemClienteFinalPercent: parseNumber(margemCFInput),
      margemRevendaPercent: parseNumber(margemRevInput),
      margemConstrutoraPercent: parseNumber(margemConsInput),
      quantidadeDesejadaM2: parseNumber(quantidadeDesejadaM2Input) || 1,
      custosTarkettAtivos: custosTarkett.filter((c) => c.status === 'Ativo'),
    });
  }, [
    precoSiteInput,
    descontoFabricaInput,
    freteInput,
    outrosCustosInput,
    margemCFInput,
    margemRevInput,
    margemConsInput,
    quantidadeDesejadaM2Input,
    custosTarkett,
  ]);

  // Carregar histórico
  useEffect(() => {
    let mounted = true;
    setIsLoadingHistorico(true);
    getTarkettSimulacoes()
      .then((items) => {
        if (mounted) setHistorico(items);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingHistorico(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Selecionar produto do catálogo de referência para o simulador
  const handleSelecionarProdutoCatalogo = (p: TarkettProdutoReferencia) => {
    setProdutoNome(p.nome);
    setLinhaNome(p.linha);
    setUnidade(p.unidade);
    setQuantidadeDesejadaM2Input((p.quantidadeM2 ?? 1).toString().replace('.', ','));
    setPrecoSiteInput(p.precoTabelaFabrica.toFixed(2).replace('.', ','));
    // Aplica o desconto individual específico do produto correspondente
    const descIndividual = p.descontoIndividualPercent ?? 10;
    setDescontoFabricaInput(descIndividual.toString());
    setSubTab('Simulador');
    if (showToast)
      showToast(
        `Produto "${p.nome}" carregado no simulador (${p.quantidadeM2 ?? 1} m², desconto individual de ${descIndividual}%).`,
        'info'
      );
  };

  // Salvar novo produto no catálogo Tarkett com Quantidade em m²
  const handleSaveNewProduct = async () => {
    if (!newNome.trim()) {
      if (showToast) showToast('Informe o nome do produto.', 'error');
      return;
    }
    const precoNum = parseNumber(newPreco);
    if (precoNum <= 0) {
      if (showToast) showToast('Informe um preço de tabela de fábrica válido.', 'error');
      return;
    }
    const descontoNum = parseFloat(newDesconto.replace(',', '.')) || 0;
    const qtdM2Num = parseNumber(newQuantidadeM2) || 1;

    const codigoGerado =
      newCodigo.trim() ||
      `TK-${newLinha.substring(0, 3).toUpperCase()}-${String(produtosRef.length + 1).padStart(2, '0')}`;

    const novoProduto: TarkettProdutoReferencia = {
      id: `tar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      codigo: codigoGerado,
      nome: newNome.trim(),
      linha: newLinha.trim() || 'Geral',
      unidade: newUnidade.trim() || 'm²',
      quantidadeM2: Math.max(0.01, qtdM2Num),
      precoTabelaFabrica: precoNum,
      descontoIndividualPercent: Math.max(0, Math.min(100, descontoNum)),
      descricao: newDescricao.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const res = await saveOrUpdateTarkettProduto(novoProduto, currentUserName);
    if (res.success) {
      setProdutosRef((prev) => [novoProduto, ...prev]);
      setIsAddModalOpen(false);
      setNewNome('');
      setNewCodigo('');
      setNewQuantidadeM2('1');
      setNewPreco('');
      setNewDesconto('10');
      setNewDescricao('');

      if (showToast)
        showToast(
          `Produto "${novoProduto.nome}" adicionado com sucesso (${novoProduto.quantidadeM2} m²).`,
          'success'
        );
    } else {
      if (showToast) showToast(`Erro ao adicionar produto: ${res.error || 'Falha'}`, 'error');
    }
  };

  // Abrir modal de edição de produto
  const handleOpenEditModal = (p: TarkettProdutoReferencia) => {
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode editar produtos.', 'error');
      return;
    }
    setEditingProductId(p.id);
    setEditNome(p.nome);
    setEditCodigo(p.codigo);
    setEditLinha(p.linha);
    setEditUnidade(p.unidade);
    setEditQuantidadeM2((p.quantidadeM2 ?? 1).toString().replace('.', ','));
    setEditPreco(p.precoTabelaFabrica.toFixed(2).replace('.', ','));
    setEditDesconto((p.descontoIndividualPercent ?? 10).toString().replace('.', ','));
    setEditDescricao(p.descricao || '');
    setIsEditModalOpen(true);
  };

  // Salvar produto editado
  const handleSaveEditProduct = async () => {
    if (!editingProductId) return;
    if (!editNome.trim()) {
      if (showToast) showToast('Informe o nome do produto.', 'error');
      return;
    }
    const precoNum = parseNumber(editPreco);
    if (precoNum <= 0) {
      if (showToast) showToast('Informe um preço de tabela de fábrica válido.', 'error');
      return;
    }
    const descontoNum = parseFloat(editDesconto.replace(',', '.')) || 0;
    const qtdM2Num = parseNumber(editQuantidadeM2) || 1;

    const produtoAtualizado: TarkettProdutoReferencia = {
      id: editingProductId,
      codigo: editCodigo.trim() || 'TK-GERAL',
      nome: editNome.trim(),
      linha: editLinha.trim() || 'Geral',
      unidade: editUnidade.trim() || 'm²',
      quantidadeM2: Math.max(0.01, qtdM2Num),
      precoTabelaFabrica: precoNum,
      descontoIndividualPercent: Math.max(0, Math.min(100, descontoNum)),
      descricao: editDescricao.trim() || undefined,
    };

    const res = await saveOrUpdateTarkettProduto(produtoAtualizado, currentUserName);
    if (res.success) {
      setProdutosRef((prev) =>
        prev.map((item) => (item.id === editingProductId ? produtoAtualizado : item))
      );
      setIsEditModalOpen(false);
      setEditingProductId(null);
      if (showToast)
        showToast(`Produto "${produtoAtualizado.nome}" atualizado com sucesso no banco!`, 'success');
    } else {
      if (showToast) showToast(`Erro ao atualizar produto: ${res.error || 'Falha'}`, 'error');
    }
  };

  // Confirmar exclusão permanente do produto no banco Supabase
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    if (!isDirector) {
      if (showToast) showToast('Apenas o Diretor Éder Perez pode remover produtos.', 'error');
      setProductToDelete(null);
      return;
    }

    setIsDeletingProduct(true);
    try {
      const res = await deleteTarkettProdutoCatalogo(productToDelete.id, currentUserName);
      if (res.success) {
        setProdutosRef((prev) => prev.filter((it) => it.id !== productToDelete.id));
        if (showToast)
          showToast(
            `Produto "${productToDelete.nome}" excluído permanentemente do banco de dados.`,
            'success'
          );
      } else {
        if (showToast) showToast(`Erro ao excluir: ${res.error || 'Falha ao remover'}`, 'error');
      }
    } catch (err: any) {
      if (showToast) showToast('Erro ao excluir produto do banco de dados.', 'error');
    } finally {
      setIsDeletingProduct(false);
      setProductToDelete(null);
    }
  };

  // Atualizar porcentagem de desconto individual vinculada a um produto específico
  const handleUpdateDescontoIndividual = async (produtoId: string, novoDescontoStr: string) => {
    const desc = parseFloat(novoDescontoStr.replace(',', '.')) || 0;
    const clamped = Math.max(0, Math.min(100, desc));

    const updated = produtosRef.map((item) => {
      if (item.id === produtoId) {
        return {
          ...item,
          descontoIndividualPercent: clamped,
        };
      }
      return item;
    });

    setProdutosRef(updated);
    await saveTarkettProdutosCatalogo(updated, currentUserName);
  };

  // Salvar Simulação
  const handleSalvarSimulacao = async () => {
    if (!isDirector) {
      if (showToast)
        showToast('Apenas o Diretor Éder Perez pode salvar simulações oficiais no histórico.', 'error');
      return;
    }

    setIsSavingSimulacao(true);
    try {
      const nova: TarkettSimulacaoItem = {
        id: `tar-sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        data: new Date().toISOString(),
        operador: currentUserName || 'Éder Perez',
        produtoNome,
        linha: linhaNome,
        unidade,
        quantidadeDesejadaM2: calculo.quantidadeM2,
        precoSiteFabrica: parseNumber(precoSiteInput),
        descontoFabricaPercent: parseNumber(descontoFabricaInput),
        freteValor: parseNumber(freteInput),
        outrosCustosPercent: parseNumber(outrosCustosInput),
        custoLiquidoCalculado: calculo.custoLiquido,
        custoLiquidoTotal: calculo.custoLiquidoTotal,
        margemClienteFinalPercent: parseNumber(margemCFInput),
        precoClienteFinal: calculo.clienteFinal.precoVenda,
        precoTotalClienteFinal: calculo.clienteFinal.precoVendaTotal,
        lucroClienteFinal: calculo.clienteFinal.lucro,
        lucroTotalClienteFinal: calculo.clienteFinal.lucroTotal,
        margemRevendaPercent: parseNumber(margemRevInput),
        precoRevenda: calculo.revenda.precoVenda,
        precoTotalRevenda: calculo.revenda.precoVendaTotal,
        lucroRevenda: calculo.revenda.lucro,
        lucroTotalRevenda: calculo.revenda.lucroTotal,
        margemConstrutoraPercent: parseNumber(margemConsInput),
        precoConstrutora: calculo.construtora.precoVenda,
        precoTotalConstrutora: calculo.construtora.precoVendaTotal,
        lucroConstrutora: calculo.construtora.lucro,
        lucroTotalConstrutora: calculo.construtora.lucroTotal,
        observacao: simulacaoObs.trim() || undefined,
      };

      const res = await saveNovaTarkettSimulacao(nova, currentUserName);
      if (res.success) {
        setHistorico((prev) => [nova, ...prev]);
        setSimulacaoObs('');
        if (showToast) showToast('Simulação Tarkett gravada com sucesso no Supabase!', 'success');
      } else {
        if (showToast) showToast(res.error || 'Erro ao salvar simulação.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Falha ao salvar simulação.', 'error');
    } finally {
      setIsSavingSimulacao(false);
    }
  };

  // Carregar Simulação Antiga no Simulador
  const handleCarregarHistoricoNoSimulador = (item: TarkettSimulacaoItem) => {
    setProdutoNome(item.produtoNome);
    setLinhaNome(item.linha);
    setUnidade(item.unidade);
    setQuantidadeDesejadaM2Input((item.quantidadeDesejadaM2 ?? 1).toString().replace('.', ','));
    setPrecoSiteInput(item.precoSiteFabrica.toFixed(2).replace('.', ','));
    setDescontoFabricaInput(item.descontoFabricaPercent.toString().replace('.', ','));
    setFreteInput(item.freteValor.toFixed(2).replace('.', ','));
    setOutrosCustosInput(item.outrosCustosPercent.toString().replace('.', ','));
    setMargemCFInput(item.margemClienteFinalPercent.toString().replace('.', ','));
    setMargemRevInput(item.margemRevendaPercent.toString().replace('.', ','));
    setMargemConsInput(item.margemConstrutoraPercent.toString().replace('.', ','));
    setSubTab('Simulador');
    if (showToast) showToast('Simulação carregada no simulador interativo.', 'info');
  };

  // Excluir Simulação
  const handleExcluirSimulacao = async (id: string) => {
    if (!isDirector) return;
    try {
      const res = await deleteTarkettSimulacao(id, currentUserName);
      if (res.success) {
        setHistorico((prev) => prev.filter((s) => s.id !== id));
        if (showToast) showToast('Simulação excluída do histórico.', 'info');
      }
    } catch {}
  };

  // Exportar Histórico CSV
  const handleExportCSV = () => {
    if (historico.length === 0) return;
    const header =
      'Data;Operador;Produto;Linha;Quantidade_m2;Preco_Site_Fabrica;Desconto_Fabrica;Custo_Liquido_Unit;Custo_Liquido_Total;Preco_Cliente_Final_Unit;Preco_Cliente_Final_Total;Margem_CF;Preco_Revenda_Unit;Preco_Revenda_Total;Margem_Rev;Preco_Construtora_Unit;Preco_Construtora_Total;Margem_Cons\n';
    const rows = historico
      .map((h) => {
        const qtd = h.quantidadeDesejadaM2 ?? 1;
        const custoTotal = h.custoLiquidoTotal ?? h.custoLiquidoCalculado * qtd;
        const pCfTotal = h.precoTotalClienteFinal ?? h.precoClienteFinal * qtd;
        const pRevTotal = h.precoTotalRevenda ?? h.precoRevenda * qtd;
        const pConsTotal = h.precoTotalConstrutora ?? h.precoConstrutora * qtd;
        return [
          new Date(h.data).toLocaleDateString('pt-BR'),
          h.operador,
          `"${h.produtoNome}"`,
          h.linha,
          qtd,
          h.precoSiteFabrica.toFixed(2),
          `${h.descontoFabricaPercent}%`,
          h.custoLiquidoCalculado.toFixed(2),
          custoTotal.toFixed(2),
          h.precoClienteFinal.toFixed(2),
          pCfTotal.toFixed(2),
          `${h.margemClienteFinalPercent}%`,
          h.precoRevenda.toFixed(2),
          pRevTotal.toFixed(2),
          `${h.margemRevendaPercent}%`,
          h.precoConstrutora.toFixed(2),
          pConsTotal.toFixed(2),
          `${h.margemConstrutoraPercent}%`,
        ].join(';');
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `simulacoes_tarkett_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // HANDLERS DE CUSTOS TARKETT (EXCLUSIVO ÉDER PEREZ)
  // =========================================================================
  const handleOpenAddCustoModal = () => {
    if (!isDirector) return;
    setNewCustoNome('');
    setNewCustoTipo('R$');
    setNewCustoValor('');
    setNewCustoQtdM2('100');
    setNewCustoObs('');
    setIsAddCustoModalOpen(true);
  };

  const handleSaveNewCusto = async () => {
    if (!isDirector) return;
    if (!newCustoNome.trim()) {
      if (showToast) showToast('Informe a descrição/nome do custo.', 'error');
      return;
    }
    const valNum = parseNumber(newCustoValor);
    if (valNum <= 0) {
      if (showToast) showToast('Informe um valor de custo positivo.', 'error');
      return;
    }
    const qtdM2Num = parseNumber(newCustoQtdM2) || 1;

    setIsSavingCusto(true);
    try {
      const res = await addCustoTarkett(
        {
          nome: newCustoNome.trim(),
          tipo: newCustoTipo,
          valor: valNum,
          quantidadeM2: qtdM2Num,
          custoPorM2Diluido: newCustoTipo === 'R$' ? Number((valNum / qtdM2Num).toFixed(2)) : valNum,
          status: 'Ativo',
          observacao: newCustoObs.trim() || undefined,
        },
        currentUserName
      );

      if (res.success && res.newItem) {
        setCustosTarkett((prev) => [...prev, res.newItem!]);
        setIsAddCustoModalOpen(false);
        if (showToast) showToast('Custo Tarkett cadastrado e ativado com sucesso!', 'success');
      } else {
        if (showToast) showToast(res.error || 'Erro ao cadastrar custo Tarkett.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Falha ao salvar custo Tarkett.', 'error');
    } finally {
      setIsSavingCusto(false);
    }
  };

  const handleOpenEditCustoModal = (c: CustoTarkettItem) => {
    if (!isDirector) return;
    setEditingCustoId(c.id);
    setEditCustoNome(c.nome);
    setEditCustoTipo(c.tipo);
    setEditCustoValor(c.valor.toString().replace('.', ','));
    setEditCustoQtdM2((c.quantidadeM2 || 100).toString().replace('.', ','));
    setEditCustoObs(c.observacao || '');
    setIsEditCustoModalOpen(true);
  };

  const handleSaveEditCusto = async () => {
    if (!isDirector || !editingCustoId) return;
    if (!editCustoNome.trim()) {
      if (showToast) showToast('Informe a descrição/nome do custo.', 'error');
      return;
    }
    const valNum = parseNumber(editCustoValor);
    if (valNum <= 0) {
      if (showToast) showToast('Informe um valor de custo positivo.', 'error');
      return;
    }
    const qtdM2Num = parseNumber(editCustoQtdM2) || 1;

    setIsSavingCusto(true);
    try {
      const targetCusto = custosTarkett.find((c) => c.id === editingCustoId);
      if (!targetCusto) return;

      const updatedCusto: CustoTarkettItem = {
        ...targetCusto,
        nome: editCustoNome.trim(),
        tipo: editCustoTipo,
        valor: valNum,
        quantidadeM2: qtdM2Num,
        custoPorM2Diluido: editCustoTipo === 'R$' ? Number((valNum / qtdM2Num).toFixed(2)) : valNum,
        observacao: editCustoObs.trim() || undefined,
        atualizadoEm: new Date().toISOString(),
      };

      const res = await updateCustoTarkett(updatedCusto, currentUserName);
      if (res.success) {
        setCustosTarkett((prev) => prev.map((c) => (c.id === editingCustoId ? updatedCusto : c)));
        setIsEditCustoModalOpen(false);
        if (showToast) showToast('Custo Tarkett atualizado com sucesso!', 'success');
      } else {
        if (showToast) showToast(res.error || 'Erro ao atualizar custo Tarkett.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Falha ao editar custo Tarkett.', 'error');
    } finally {
      setIsSavingCusto(false);
    }
  };

  const handleToggleCustoStatus = async (id: string) => {
    if (!isDirector) return;
    try {
      const res = await toggleStatusCustoTarkett(id, currentUserName);
      if (res.success) {
        setCustosTarkett((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: res.novoStatus || 'Ativo' } : c))
        );
        if (showToast) {
          showToast(`Custo ${res.novoStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`, 'info');
        }
      } else {
        if (showToast) showToast(res.error || 'Erro ao alterar status.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Falha ao alterar status.', 'error');
    }
  };

  const handleDeleteCustoConfirm = async () => {
    if (!isDirector || !custoToDelete) return;
    setIsDeletingCusto(true);
    try {
      const res = await deleteCustoTarkett(custoToDelete.id, currentUserName);
      if (res.success) {
        setCustosTarkett((prev) => prev.filter((c) => c.id !== custoToDelete.id));
        setCustoToDelete(null);
        if (showToast) showToast('Custo Tarkett excluído com sucesso.', 'info');
      } else {
        if (showToast) showToast(res.error || 'Erro ao excluir custo.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Falha ao excluir custo.', 'error');
    } finally {
      setIsDeletingCusto(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Regra de Escopo Restrito */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Formação de Preço Tarkett (Exclusivo)
            </h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-100">
              Ferramenta Independente
            </span>
          </div>
          <p className="text-xs text-slate-500">
            <strong>Escopo estrito:</strong> Ferramenta exclusiva de análise e formação de preço
            para a linha Tarkett. Não altera pedidos, vendas, orçamentos, estoque ou preços do
            catálogo de produtos.
          </p>
        </div>

        {/* Sub-abas Tarkett: Simulador | Produtos | Custos (Exclusivo Éder) | Histórico */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(isDirector
            ? (['Simulador', 'Produtos', 'Custos', 'Histórico'] as const)
            : (['Simulador', 'Produtos', 'Histórico'] as const)
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === tab
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'Custos' && <Lock className="w-3 h-3 text-amber-500" />}
              <span>{tab === 'Histórico' ? `Histórico (${historico.length})` : tab}</span>
              {tab === 'Custos' && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                  Diretor
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-ABA 1: SIMULADOR */}
      {subTab === 'Simulador' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda (5 cols): Parâmetros de Entrada */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Parâmetros de Entrada da Fábrica</h3>
                <span className="text-[11px] text-slate-400 font-medium">Dados do Site / Tabela</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Produto Tarkett
                  </label>
                  <input
                    type="text"
                    value={produtoNome}
                    onChange={(e) => setProdutoNome(e.target.value)}
                    placeholder="Ex: Vinílico Tarkett Essence 30"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Linha / Família
                    </label>
                    <input
                      type="text"
                      value={linhaNome}
                      onChange={(e) => setLinhaNome(e.target.value)}
                      placeholder="Ex: Essence, Injoy..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Unidade de Medida
                    </label>
                    <input
                      type="text"
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      placeholder="m², balde, barra..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Preço de Tabela do Site / Fábrica */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preço Informado no Site / Tabela Fábrica (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      value={precoSiteInput}
                      onChange={(e) => setPrecoSiteInput(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Campo Novo: Quantidade Desejada em m² */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Quantidade Desejada em m² *
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Cálculo Dinâmico
                    </span>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={quantidadeDesejadaM2Input}
                      onChange={(e) => setQuantidadeDesejadaM2Input(e.target.value)}
                      placeholder="Ex: 50 ou 100,5"
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      m²
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Utilizada nos cálculos dinâmicos para apresentar tanto os valores unitários quanto os totais para a metragem desejada.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Desc. Fábrica (%)
                    </label>
                    <input
                      type="text"
                      value={descontoFabricaInput}
                      onChange={(e) => setDescontoFabricaInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Frete (R$)
                    </label>
                    <input
                      type="text"
                      value={freteInput}
                      onChange={(e) => setFreteInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Outros (%)
                    </label>
                    <input
                      type="text"
                      value={outrosCustosInput}
                      onChange={(e) => setOutrosCustosInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Margens Desejadas */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Margens de Lucro Alvo por Perfil (%):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">Cliente Final</span>
                      <input
                        type="text"
                        value={margemCFInput}
                        onChange={(e) => setMargemCFInput(e.target.value)}
                        className="w-full text-center text-xs font-bold bg-white border border-slate-200 rounded p-1 mt-1"
                      />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">Revenda</span>
                      <input
                        type="text"
                        value={margemRevInput}
                        onChange={(e) => setMargemRevInput(e.target.value)}
                        className="w-full text-center text-xs font-bold bg-white border border-slate-200 rounded p-1 mt-1"
                      />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">Construtora</span>
                      <input
                        type="text"
                        value={margemConsInput}
                        onChange={(e) => setMargemConsInput(e.target.value)}
                        className="w-full text-center text-xs font-bold bg-white border border-slate-200 rounded p-1 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Anotações da Simulação (Opcional)
                  </label>
                  <input
                    type="text"
                    value={simulacaoObs}
                    onChange={(e) => setSimulacaoObs(e.target.value)}
                    placeholder="Ex: Cotação para obra Alphaville..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSalvarSimulacao}
                    disabled={isSavingSimulacao}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSimulacao ? 'Gravando no Supabase...' : 'Salvar Simulação no Histórico'}
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna Direita (7 cols): Resultados Calculados em Tempo Real */}
            <div className="lg:col-span-7 space-y-4">
              {/* Card de Custo Estimado Líquido */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Custo Estimado Líquido
                  </span>
                  <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300">
                    Base p/ {unidade}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-3 mt-1">
                  <div className="text-3xl sm:text-4xl font-black text-white">
                    {formatBRL(calculo.custoLiquido)}
                    <span className="text-xs font-normal text-slate-300 ml-1">/{unidade}</span>
                  </div>
                  {calculo.quantidadeM2 !== 1 && (
                    <div className="text-sm font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                      Total ({calculo.quantidadeM2} m²): {formatBRL(calculo.custoLiquidoTotal)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Preço Site: {formatBRL(parseNumber(precoSiteInput))}</span>
                  <span>Desc: -{descontoFabricaInput}%</span>
                  <span>Frete: +{formatBRL(parseNumber(freteInput))}</span>
                  <span className="font-bold text-emerald-400">Qtd Calculada: {calculo.quantidadeM2} m²</span>
                </div>
              </div>

              {/* Custos Operacionais e Logísticos Tarkett Integrados Automaticamente */}
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-950">
                      Custos Tarkett Ativos Integrados no Cálculo
                    </span>
                    <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      {calculo.custosTarkettDetalhes?.length || 0} ativo(s)
                    </span>
                  </div>
                  {isDirector && (
                    <button
                      type="button"
                      onClick={() => setSubTab('Custos')}
                      className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Gerenciar Custos</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {!calculo.custosTarkettDetalhes || calculo.custosTarkettDetalhes.length === 0 ? (
                  <p className="text-xs text-amber-800">
                    Nenhum custo adicional Tarkett ativo no momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {calculo.custosTarkettDetalhes.map((c) => (
                        <div
                          key={c.id}
                          className="bg-white/90 border border-amber-200 rounded-lg px-2.5 py-1 text-xs flex items-center gap-1.5 text-slate-800 shadow-2xs"
                        >
                          <span className="font-semibold text-slate-900">{c.nome}:</span>
                          <span className="font-bold text-amber-800">
                            {c.tipo === '%' ? `${c.valor}%` : formatBRL(c.valor)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            (+{formatBRL(c.impactoUnitarioM2)}/m²)
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-amber-950 pt-1.5 border-t border-amber-200/70">
                      <span>Total Custos Tarkett Incorporados:</span>
                      <span className="text-emerald-800">
                        +{formatBRL(calculo.totalCustosTarkettM2)}/m²
                        {calculo.quantidadeM2 !== 1 && ` (Total Lote: +${formatBRL(calculo.totalCustosTarkettTotal)})`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid dos 3 Perfis de Formação de Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Cliente Final */}
                <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">Cliente Final</span>
                    <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                      {margemCFInput}% margem
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {formatBRL(calculo.clienteFinal.precoVenda)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preço Sugerido /{unidade}
                    </div>
                    {calculo.quantidadeM2 !== 1 && (
                      <div className="mt-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        Total: {formatBRL(calculo.clienteFinal.precoVendaTotal)}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Lucro Unit.:</span>
                      <span className="font-bold text-emerald-700">
                        +{formatBRL(calculo.clienteFinal.lucro)}
                      </span>
                    </div>
                    {calculo.quantidadeM2 !== 1 && (
                      <div className="flex items-center justify-between font-semibold text-emerald-800">
                        <span>Lucro Total:</span>
                        <span>+{formatBRL(calculo.clienteFinal.lucroTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Revenda */}
                <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700">Revenda</span>
                    <span className="text-[10px] bg-purple-50 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                      {margemRevInput}% margem
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {formatBRL(calculo.revenda.precoVenda)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preço Sugerido /{unidade}
                    </div>
                    {calculo.quantidadeM2 !== 1 && (
                      <div className="mt-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        Total: {formatBRL(calculo.revenda.precoVendaTotal)}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Lucro Unit.:</span>
                      <span className="font-bold text-emerald-700">
                        +{formatBRL(calculo.revenda.lucro)}
                      </span>
                    </div>
                    {calculo.quantidadeM2 !== 1 && (
                      <div className="flex items-center justify-between font-semibold text-emerald-800">
                        <span>Lucro Total:</span>
                        <span>+{formatBRL(calculo.revenda.lucroTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Construtora */}
                <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">Construtora</span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                      {margemConsInput}% margem
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {formatBRL(calculo.construtora.precoVenda)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preço Sugerido /{unidade}
                    </div>
                    {calculo.quantidadeM2 !== 1 && (
                      <div className="mt-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Total: {formatBRL(calculo.construtora.precoVendaTotal)}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Lucro Unit.:</span>
                      <span className="font-bold text-emerald-700">
                        +{formatBRL(calculo.construtora.lucro)}
                      </span>
                    </div>
                    {calculo.quantidadeM2 !== 1 && (
                      <div className="flex items-center justify-between font-semibold text-emerald-800">
                        <span>Lucro Total:</span>
                        <span>+{formatBRL(calculo.construtora.lucroTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabela Comparativa Rápida com Quantidade Desejada em m² */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-slate-700">
                    Resumo de Formação de Preço Tarkett ({produtoNome}):
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    Metragem: {calculo.quantidadeM2} m²
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold">
                        <th className="py-2 px-3">Perfil</th>
                        <th className="py-2 px-3">Custo Unit.</th>
                        <th className="py-2 px-3">Custo Total ({calculo.quantidadeM2} m²)</th>
                        <th className="py-2 px-3">Margem</th>
                        <th className="py-2 px-3">Preço Unit.</th>
                        <th className="py-2 px-3 font-bold text-slate-800">Preço Total</th>
                        <th className="py-2 px-3 text-right">Lucro Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">Cliente Final</td>
                        <td className="py-2.5 px-3">{formatBRL(calculo.custoLiquido)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {formatBRL(calculo.custoLiquidoTotal)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">{margemCFInput}%</td>
                        <td className="py-2.5 px-3 font-medium">{formatBRL(calculo.clienteFinal.precoVenda)}</td>
                        <td className="py-2.5 px-3 font-bold text-blue-700">
                          {formatBRL(calculo.clienteFinal.precoVendaTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          +{formatBRL(calculo.clienteFinal.lucroTotal)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-purple-700">Revenda</td>
                        <td className="py-2.5 px-3">{formatBRL(calculo.custoLiquido)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {formatBRL(calculo.custoLiquidoTotal)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">{margemRevInput}%</td>
                        <td className="py-2.5 px-3 font-medium">{formatBRL(calculo.revenda.precoVenda)}</td>
                        <td className="py-2.5 px-3 font-bold text-purple-700">
                          {formatBRL(calculo.revenda.precoVendaTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          +{formatBRL(calculo.revenda.lucroTotal)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-amber-700">Construtora</td>
                        <td className="py-2.5 px-3">{formatBRL(calculo.custoLiquido)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {formatBRL(calculo.custoLiquidoTotal)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">{margemConsInput}%</td>
                        <td className="py-2.5 px-3 font-medium">{formatBRL(calculo.construtora.precoVenda)}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-700">
                          {formatBRL(calculo.construtora.precoVendaTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          +{formatBRL(calculo.construtora.lucroTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: PRODUTOS DE REFERÊNCIA */}
      {subTab === 'Produtos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchProduto}
                onChange={(e) => setSearchProduto(e.target.value)}
                placeholder="Buscar linha ou produto Tarkett..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              {isDirector && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Novo Produto Tarkett
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtosRef
              .filter(
                (p) =>
                  p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
                  p.linha.toLowerCase().includes(searchProduto.toLowerCase()) ||
                  p.codigo.toLowerCase().includes(searchProduto.toLowerCase())
              )
              .map((p) => {
                const descIndividual = p.descontoIndividualPercent ?? 10;
                const custoLiquidoFabrica = p.precoTabelaFabrica * (1 - descIndividual / 100);

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {p.linha}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-mono">{p.codigo}</span>
                          {isDirector && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(p)}
                                title="Editar produto Tarkett"
                                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductToDelete(p)}
                                title="Remover produto Tarkett permanentemente"
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{p.nome}</h4>

                      {p.descricao && (
                        <p className="text-xs text-slate-500 line-clamp-2">{p.descricao}</p>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      {/* Campo Quantidade em m² */}
                      <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100/70">
                        <span className="text-slate-500 font-medium">Quantidade em m²:</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {(p.quantidadeM2 ?? 1).toLocaleString('pt-BR')} m²
                        </span>
                      </div>

                      {/* Tabela de Fábrica Base */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Tabela de Fábrica:</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatBRL(p.precoTabelaFabrica)}
                          <span className="text-xs font-normal text-slate-400 ml-0.5">
                            /{p.unidade}
                          </span>
                        </span>
                      </div>

                      {/* Box de Desconto Individual Vinculado ao Produto */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <Percent className="w-3 h-3 text-emerald-600" /> Desconto Fábrica:
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              disabled={!isDirector}
                              value={p.descontoIndividualPercent ?? 10}
                              onChange={(e) => handleUpdateDescontoIndividual(p.id, e.target.value)}
                              title={
                                isDirector
                                  ? 'Ajustar porcentagem de desconto individual vinculada a este produto'
                                  : 'Desconto individual configurado pelo Diretor'
                              }
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-right focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
                            />
                            <span className="text-xs font-bold text-slate-700">%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/70">
                          <span className="text-slate-500">Custo c/ Desconto:</span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {formatBRL(custoLiquidoFabrica)}
                            <span className="text-[10px] font-normal text-slate-400 ml-0.5">
                              /{p.unidade}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Ações: Simular e se Diretor, Botão Remover explícito */}
                      <div className="space-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelecionarProdutoCatalogo(p)}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          Simular Preço <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {isDirector && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(p)}
                              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(p)}
                              className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" /> Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Modal de Confirmação de Exclusão Permanente */}
          {productToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Excluir Produto Permanentemente</h3>
                    <p className="text-xs text-slate-500">Esta ação é irreversível</p>
                  </div>
                </div>

                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 text-xs text-rose-900 leading-relaxed">
                  Tem certeza de que deseja excluir permanentemente o produto{' '}
                  <strong className="font-bold">{productToDelete.nome}</strong> ({productToDelete.codigo}) do catálogo e do banco de dados Supabase?
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isDeletingProduct}
                    onClick={() => setProductToDelete(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingProduct}
                    onClick={handleConfirmDeleteProduct}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeletingProduct ? 'Excluindo do banco...' : 'Sim, Excluir do Banco'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Adicionar Novo Produto Tarkett */}
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Novo Produto Tarkett</h3>
                      <p className="text-xs text-slate-500">
                        Cadastre um produto com quantidade em m² e desconto individual
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      value={newNome}
                      onChange={(e) => setNewNome(e.target.value)}
                      placeholder="Ex: Piso Vinílico Tarkett Linha Essence 30"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Linha</label>
                      <input
                        type="text"
                        value={newLinha}
                        onChange={(e) => setNewLinha(e.target.value)}
                        placeholder="Ex: Essence 30, Injoy, Square..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Código (Opcional)</label>
                      <input
                        type="text"
                        value={newCodigo}
                        onChange={(e) => setNewCodigo(e.target.value)}
                        placeholder="Ex: TK-ESS-06"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                      <select
                        value={newUnidade}
                        onChange={(e) => setNewUnidade(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="m²">m²</option>
                        <option value="caixa">caixa</option>
                        <option value="balde">balde</option>
                        <option value="un">un</option>
                        <option value="barra">barra</option>
                        <option value="rolo">rolo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Qtd em m² *
                      </label>
                      <input
                        type="text"
                        value={newQuantidadeM2}
                        onChange={(e) => setNewQuantidadeM2(e.target.value)}
                        placeholder="Ex: 3,34"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Preço Tabela (R$) *
                      </label>
                      <input
                        type="text"
                        value={newPreco}
                        onChange={(e) => setNewPreco(e.target.value)}
                        placeholder="Ex: 89,90"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Desconto Indiv. (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={newDesconto}
                        onChange={(e) => setNewDesconto(e.target.value)}
                        placeholder="10"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-emerald-700 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Descrição / Observações
                    </label>
                    <textarea
                      value={newDescricao}
                      onChange={(e) => setNewDescricao(e.target.value)}
                      rows={2}
                      placeholder="Detalhes sobre aplicação, metragem por embalagem, etc."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewProduct}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Salvar Produto
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Editar Produto Tarkett */}
          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Edit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Editar Produto Tarkett</h3>
                      <p className="text-xs text-slate-500">
                        Altere os dados, a quantidade em m² e o desconto do produto
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder="Ex: Piso Vinílico Tarkett Linha Essence 30"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Linha</label>
                      <input
                        type="text"
                        value={editLinha}
                        onChange={(e) => setEditLinha(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Código</label>
                      <input
                        type="text"
                        value={editCodigo}
                        onChange={(e) => setEditCodigo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                      <select
                        value={editUnidade}
                        onChange={(e) => setEditUnidade(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="m²">m²</option>
                        <option value="caixa">caixa</option>
                        <option value="balde">balde</option>
                        <option value="un">un</option>
                        <option value="barra">barra</option>
                        <option value="rolo">rolo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Qtd em m² *
                      </label>
                      <input
                        type="text"
                        value={editQuantidadeM2}
                        onChange={(e) => setEditQuantidadeM2(e.target.value)}
                        placeholder="Ex: 3,34"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Preço Tabela (R$) *
                      </label>
                      <input
                        type="text"
                        value={editPreco}
                        onChange={(e) => setEditPreco(e.target.value)}
                        placeholder="Ex: 89,90"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Desconto Indiv. (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={editDesconto}
                        onChange={(e) => setEditDesconto(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-emerald-700 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Descrição / Observações
                    </label>
                    <textarea
                      value={editDescricao}
                      onChange={(e) => setEditDescricao(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditProduct}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA: CUSTOS TARKETT (EXCLUSIVA DO DIRETOR ÉDER PEREZ)                */}
      {/* ========================================================================= */}
      {subTab === 'Custos' && isDirector && (
        <div className="space-y-6">
          {/* Header da Sub-aba Custos */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Lock className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Custos Oficiais da Linha Tarkett
                </h3>
                <span className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                  Exclusivo Éder Perez
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Cadastre e gerencie custos em <strong>R$</strong> (diluídos por m²) ou em{' '}
                <strong>%</strong> (aplicados sobre a fábrica). Custos com status{' '}
                <span className="text-emerald-700 font-bold">Ativo</span> entram automaticamente
                na simulação e formam os preços de <strong>Cliente Final</strong>,{' '}
                <strong>Revenda</strong> e <strong>Construtora</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddCustoModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Custo Tarkett</span>
            </button>
          </div>

          {/* Cards de Métricas dos Custos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total de Custos Cadastrados</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{custosTarkett.length}</div>
              <span className="text-[11px] text-slate-400">Parâmetros no sistema</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs bg-emerald-50/20">
              <span className="text-xs text-emerald-800 font-medium">Custos Ativos na Simulação</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {custosTarkett.filter((c) => c.status === 'Ativo').length}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                Incidem automaticamente nas vendas
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-2xs bg-amber-50/20">
              <span className="text-xs text-amber-800 font-medium">Impacto Médio Ativo (m²)</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {formatBRL(
                  custosTarkett
                    .filter((c) => c.status === 'Ativo')
                    .reduce((acc, c) => acc + (c.custoPorM2Diluido || 0), 0)
                )}
                <span className="text-xs font-normal text-slate-500 ml-1">/m²</span>
              </div>
              <span className="text-[11px] text-amber-700">Somatório de base por m²</span>
            </div>
          </div>

          {/* Tabela de Custos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Lista de Custos Operacionais e Logísticos</span>
                <span className="text-[11px] font-normal text-slate-400">
                  ({custosTarkett.length} itens)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Clique no switch para ativar ou desativar instantaneamente
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Custo</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Valor Base</th>
                    <th className="py-3 px-4">Diluição / Base</th>
                    <th className="py-3 px-4">Impacto no m²</th>
                    <th className="py-3 px-4">Observações</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {custosTarkett.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        Nenhum custo adicional cadastrado. Clique no botão &quot;Novo Custo
                        Tarkett&quot; acima para começar.
                      </td>
                    </tr>
                  ) : (
                    custosTarkett.map((c) => {
                      const isAtivo = c.status === 'Ativo';
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !isAtivo ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          {/* Toggle Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleCustoStatus(c.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all border ${
                                isAtivo
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                              }`}
                              title={isAtivo ? 'Clique para desativar' : 'Clique para ativar'}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isAtivo ? 'bg-emerald-600' : 'bg-slate-400'
                                }`}
                              />
                              {isAtivo ? 'Ativo' : 'Inativo'}
                            </button>
                          </td>

                          {/* Nome */}
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {c.nome}
                          </td>

                          {/* Tipo */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                c.tipo === '%'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {c.tipo === '%' ? '% Percentual' : 'R$ Valor Fixo'}
                            </span>
                          </td>

                          {/* Valor Base */}
                          <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                            {c.tipo === '%' ? `${c.valor}%` : formatBRL(c.valor)}
                          </td>

                          {/* Diluição */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {c.tipo === 'R$'
                              ? `${c.quantidadeM2 || 1} m²`
                              : 'Sobre Preço Líquido'}
                          </td>

                          {/* Impacto no m² */}
                          <td className="py-3 px-4 font-bold text-emerald-700 whitespace-nowrap">
                            {c.tipo === 'R$'
                              ? `+${formatBRL(c.custoPorM2Diluido || 0)}/m²`
                              : `+${c.valor}%`}
                          </td>

                          {/* Observações */}
                          <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                            {c.observacao || '—'}
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCustoModal(c)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                title="Editar Custo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCustoToDelete(c)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Excluir Custo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Adicionar Novo Custo Tarkett */}
          {isAddCustoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
                <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    <h3 className="font-bold text-sm">Novo Custo Tarkett</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCustoModalOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome / Descrição do Custo *
                    </label>
                    <input
                      type="text"
                      value={newCustoNome}
                      onChange={(e) => setNewCustoNome(e.target.value)}
                      placeholder="Ex: Frete Dedicado Fábrica, Taxa de Manuseio..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Custo *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCustoTipo('R$')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center justify-center gap-2 ${
                          newCustoTipo === 'R$'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>R$ (Valor Fixo)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewCustoTipo('%')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center justify-center gap-2 ${
                          newCustoTipo === '%'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Percent className="w-4 h-4" />
                        <span>% (Percentual)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {newCustoTipo === 'R$' ? 'Valor (R$) *' : 'Percentual (%) *'}
                      </label>
                      <input
                        type="text"
                        value={newCustoValor}
                        onChange={(e) => setNewCustoValor(e.target.value)}
                        placeholder={newCustoTipo === 'R$' ? '0,00' : '5'}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {newCustoTipo === 'R$' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Diluir em (m²) *
                        </label>
                        <input
                          type="text"
                          value={newCustoQtdM2}
                          onChange={(e) => setNewCustoQtdM2(e.target.value)}
                          placeholder="Ex: 100"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {newCustoTipo === 'R$' && (
                    <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl text-[11px] text-blue-900">
                      <strong>Cálculo do impacto por m²:</strong>{' '}
                      {formatBRL(parseNumber(newCustoValor))} ÷{' '}
                      {parseNumber(newCustoQtdM2) || 1} m² ={' '}
                      <span className="font-bold text-blue-800">
                        {formatBRL(
                          parseNumber(newCustoValor) / (parseNumber(newCustoQtdM2) || 1)
                        )}
                        /m²
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observação / Justificativa (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newCustoObs}
                      onChange={(e) => setNewCustoObs(e.target.value)}
                      placeholder="Ex: Referente a cotação de frete rodoviário"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddCustoModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewCusto}
                      disabled={isSavingCusto}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSavingCusto ? 'Gravando...' : 'Salvar Custo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Editar Custo Tarkett */}
          {isEditCustoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
                <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-5 h-5" />
                    <h3 className="font-bold text-sm">Editar Custo Tarkett</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditCustoModalOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome / Descrição do Custo *
                    </label>
                    <input
                      type="text"
                      value={editCustoNome}
                      onChange={(e) => setEditCustoNome(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Custo *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditCustoTipo('R$')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center justify-center gap-2 ${
                          editCustoTipo === 'R$'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>R$ (Valor Fixo)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditCustoTipo('%')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center justify-center gap-2 ${
                          editCustoTipo === '%'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Percent className="w-4 h-4" />
                        <span>% (Percentual)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {editCustoTipo === 'R$' ? 'Valor (R$) *' : 'Percentual (%) *'}
                      </label>
                      <input
                        type="text"
                        value={editCustoValor}
                        onChange={(e) => setEditCustoValor(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {editCustoTipo === 'R$' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Diluir em (m²) *
                        </label>
                        <input
                          type="text"
                          value={editCustoQtdM2}
                          onChange={(e) => setEditCustoQtdM2(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observação (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editCustoObs}
                      onChange={(e) => setEditCustoObs(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditCustoModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditCusto}
                      disabled={isSavingCusto}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSavingCusto ? 'Gravando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Confirmação de Exclusão */}
          {custoToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-fadeIn">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">Excluir Custo Tarkett?</h4>
                  <p className="text-xs text-slate-500">
                    Tem certeza que deseja excluir o custo &quot;<strong>{custoToDelete.nome}</strong>&quot;?
                    Ele deixará de impactar a formação de preço de toda a equipe.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCustoToDelete(null)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCustoConfirm}
                    disabled={isDeletingCusto}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingCusto ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 3: HISTÓRICO DE SIMULAÇÕES SALVAS */}
      {subTab === 'Histórico' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Simulações Gravadas no Supabase ({historico.length})</span>
            </div>

            <div className="flex items-center gap-2">
              {historico.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar CSV
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4">Produto Tarkett</th>
                    <th className="py-3 px-4">Qtd (m²)</th>
                    <th className="py-3 px-4">Custo Total</th>
                    <th className="py-3 px-4">Cliente Final (Total)</th>
                    <th className="py-3 px-4">Revenda (Total)</th>
                    <th className="py-3 px-4">Construtora (Total)</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historico.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Nenhuma simulação salva ainda. Use a aba &quot;Simulador&quot; e clique em &quot;Salvar
                        Simulação no Histórico&quot;.
                      </td>
                    </tr>
                  ) : (
                    historico.map((item) => {
                      const qtd = item.quantidadeDesejadaM2 ?? 1;
                      const custoTotal = item.custoLiquidoTotal ?? item.custoLiquidoCalculado * qtd;
                      const pCfTotal = item.precoTotalClienteFinal ?? item.precoClienteFinal * qtd;
                      const pRevTotal = item.precoTotalRevenda ?? item.precoRevenda * qtd;
                      const pConsTotal = item.precoTotalConstrutora ?? item.precoConstrutora * qtd;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(item.data).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.operador}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {item.produtoNome}
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.linha} ({item.unidade})
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 bg-slate-50/50">
                            {qtd} m²
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {formatBRL(custoTotal)}
                            <div className="text-[10px] text-slate-400 font-normal">
                              Unit: {formatBRL(item.custoLiquidoCalculado)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-blue-700 font-bold">
                            {formatBRL(pCfTotal)}
                            <div className="text-[10px] text-slate-400 font-normal">
                              Unit: {formatBRL(item.precoClienteFinal)} ({item.margemClienteFinalPercent}%)
                            </div>
                          </td>
                          <td className="py-3 px-4 text-purple-700 font-bold">
                            {formatBRL(pRevTotal)}
                            <div className="text-[10px] text-slate-400 font-normal">
                              Unit: {formatBRL(item.precoRevenda)} ({item.margemRevendaPercent}%)
                            </div>
                          </td>
                          <td className="py-3 px-4 text-amber-700 font-bold">
                            {formatBRL(pConsTotal)}
                            <div className="text-[10px] text-slate-400 font-normal">
                              Unit: {formatBRL(item.precoConstrutora)} ({item.margemConstrutoraPercent}%)
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCarregarHistoricoNoSimulador(item)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                title="Carregar no Simulador"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              {isDirector && (
                                <button
                                  type="button"
                                  onClick={() => handleExcluirSimulacao(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
