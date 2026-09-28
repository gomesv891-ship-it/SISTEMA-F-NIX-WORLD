import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Boxes,
  ArrowLeftRight,
  BarChart3,
  Plus,
  ChevronDown,
  Search,
  Filter,
  ShoppingCart,
  Wrench,
  Package,
  Sliders,
  Folder,
  Layers,
  Info,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Pencil,
  Trash2,
  Minus,
  Download,
  X,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { EstoqueItem, MovimentacaoEstoque, EstoqueStatus } from '../types';
import {
  fetchEstoqueFromDatabase,
  fetchMovimentacoesFromDatabase,
  fetchCategoriasFromDatabase,
  fetchGruposFromDatabase,
  calculateEstoqueStatus,
  excluirItemEstoque,
  getCachedEstoqueItems,
  getCachedMovimentacoes,
  getCachedCategorias,
  getCachedGrupos,
} from '../utils/estoqueService';
import { ProductCategory, ProductGroup } from '../data/initialProductsSeed';
import { NovaEntradaModal } from './estoque/NovaEntradaModal';
import { NovoProdutoModal } from './estoque/NovoProdutoModal';
import { EditarProdutoModal } from './estoque/EditarProdutoModal';
import { SaidaVendaModal } from './estoque/SaidaVendaModal';
import { SaidaFullModal } from './estoque/SaidaFullModal';
import { SaidaOutroModal } from './estoque/SaidaOutroModal';
import { CategoriasModal } from './estoque/CategoriasModal';
import { GruposModal } from './estoque/GruposModal';
import { DetalhesEstoqueModal } from './estoque/DetalhesEstoqueModal';
import { EstoqueMovimentacoesView } from './estoque/EstoqueMovimentacoesView';
import { EstoqueResumoView } from './estoque/EstoqueResumoView';
import { EstoqueInsumosView } from './estoque/EstoqueInsumosView';

interface ControleEstoqueScreenProps {
  currentUserName: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function ControleEstoqueScreen({
  currentUserName,
  onBackToCadastro,
  onNavigateTab,
}: ControleEstoqueScreenProps) {
  const [items, setItems] = useState<EstoqueItem[]>(() => getCachedEstoqueItems());
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>(() => getCachedMovimentacoes());
  const [categories, setCategories] = useState<ProductCategory[]>(() => getCachedCategorias());
  const [groups, setGroups] = useState<ProductGroup[]>(() => getCachedGrupos());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return getCachedEstoqueItems().length === 0;
  });
  const lastFetchTimeRef = useRef<number>(0);

  // ABAS: 'produtos' | 'insumos' | 'movimentacoes' | 'resumo'
  const [activeTab, setActiveTab] = useState<'produtos' | 'insumos' | 'movimentacoes' | 'resumo'>('produtos');
  const [targetMovimentacaoId, setTargetMovimentacaoId] = useState<string | null>(null);

  // Filtros da aba Produtos em Estoque
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Ordenação da Tabela
  const [sortField, setSortField] = useState<'codigo' | 'estoqueAtual' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Seleção de linhas (Checkboxes)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modais
  const [isNovoProdutoModalOpen, setIsNovoProdutoModalOpen] = useState<boolean>(false);
  const [isEditarProdutoModalOpen, setIsEditarProdutoModalOpen] = useState<boolean>(false);
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState<boolean>(false);
  const [isEntradaDropdownOpen, setIsEntradaDropdownOpen] = useState<boolean>(false);
  const [entradaSubtipo, setEntradaSubtipo] = useState<'Compra' | 'Devolução' | 'Outro'>('Compra');
  const [isSaidaDropdownOpen, setIsSaidaDropdownOpen] = useState<boolean>(false);
  const [isSaidaVendaModalOpen, setIsSaidaVendaModalOpen] = useState<boolean>(false);
  const [isSaidaFullModalOpen, setIsSaidaFullModalOpen] = useState<boolean>(false);
  const [isSaidaOutroModalOpen, setIsSaidaOutroModalOpen] = useState<boolean>(false);
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState<boolean>(false);
  const [isGruposModalOpen, setIsGruposModalOpen] = useState<boolean>(false);
  const [itemParaDetalhes, setItemParaDetalhes] = useState<EstoqueItem | null>(null);
  const [selectedItemForAction, setSelectedItemForAction] = useState<EstoqueItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<EstoqueItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EstoqueItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast de sucesso
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Carregamento de dados centralizado e otimizado (não-bloqueante)
  const loadData = useCallback(async (options?: { silent?: boolean; forceRemote?: boolean }) => {
    const hasData = getCachedEstoqueItems().length > 0;
    const silent = options?.silent ?? hasData;
    const forceRemote = options?.forceRemote ?? false;

    // Previne consultas repetidas ao abrir ou atualizar a aba se consultado recentemente (< 25s)
    if (!forceRemote && Date.now() - lastFetchTimeRef.current < 25000 && hasData) {
      return;
    }
    lastFetchTimeRef.current = Date.now();

    if (!silent) {
      setIsLoading(true);
    }

    try {
      // 1. Carrega dados essenciais primeiro (produtos, categorias e grupos)
      const [stockData, catData, grpData] = await Promise.all([
        fetchEstoqueFromDatabase({ forceRemote }),
        fetchCategoriasFromDatabase(forceRemote),
        fetchGruposFromDatabase(forceRemote),
      ]);
      setItems(stockData);
      setCategories(catData);
      setGroups(grpData);

      // 2. Movimentações são carregadas sob demanda ou em segundo plano
      if (activeTab === 'movimentacoes' || activeTab === 'resumo' || getCachedMovimentacoes().length === 0) {
        fetchMovimentacoesFromDatabase({ forceRemote })
          .then((movData) => {
            setMovimentacoes(movData);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.warn('Carregamento de estoque resiliente com dados locais:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Carrega movimentações sob demanda quando o usuário acessar a aba de movimentações ou resumo
  useEffect(() => {
    if ((activeTab === 'movimentacoes' || activeTab === 'resumo') && movimentacoes.length === 0) {
      fetchMovimentacoesFromDatabase({ forceRemote: false })
        .then((m) => {
          if (m && m.length > 0) setMovimentacoes(m);
        })
        .catch(() => {});
    }
  }, [activeTab, movimentacoes.length]);

  useEffect(() => {
    const hasInitialData = getCachedEstoqueItems().length > 0;
    loadData({ silent: hasInitialData });

    // Verifica se veio de notificação de movimentação
    const checkTargetTab = () => {
      try {
        const targetTab = sessionStorage.getItem('fenix_target_estoque_tab');
        const targetMovId = sessionStorage.getItem('fenix_target_movimentacao_id');
        if (targetTab === 'movimentacoes' || targetMovId) {
          sessionStorage.removeItem('fenix_target_estoque_tab');
          setActiveTab('movimentacoes');
          if (targetMovId) {
            setTargetMovimentacaoId(targetMovId);
          }
        }
      } catch {}
    };
    checkTargetTab();

    const handleOpenMov = (e: any) => {
      setActiveTab('movimentacoes');
      if (e?.detail?.movimentacaoId) {
        setTargetMovimentacaoId(e.detail.movimentacaoId);
      }
    };

    let debounceTimer: any = null;
    const handleStockUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Atualiza a partir do cache local sem reconsultar o Supabase repetidamente
        const cached = getCachedEstoqueItems();
        if (cached.length > 0) setItems(cached);
        const cachedMovs = getCachedMovimentacoes();
        if (cachedMovs.length > 0) setMovimentacoes(cachedMovs);
      }, 300);
    };

    window.addEventListener('fenix_open_estoque_movimentacao', handleOpenMov);
    window.addEventListener('fenix_estoque_items', handleStockUpdate);
    window.addEventListener('fenix_estoque_movimentacoes', handleStockUpdate);
    window.addEventListener('fenix_products_updated', handleStockUpdate);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('fenix_open_estoque_movimentacao', handleOpenMov);
      window.removeEventListener('fenix_estoque_items', handleStockUpdate);
      window.removeEventListener('fenix_estoque_movimentacoes', handleStockUpdate);
      window.removeEventListener('fenix_products_updated', handleStockUpdate);
    };
  }, [loadData]);

  // Estatísticas para os 4 Cards
  const stats = useMemo(() => {
    let normal = 0;
    let atencao = 0;
    let estoqueBaixo = 0;
    let semEstoque = 0;
    let totalEmEstoque = 0;

    items.forEach((item) => {
      totalEmEstoque += item.estoqueAtual || 0;
      if (item.status === 'Normal') normal++;
      else if (item.status === 'Atenção') atencao++;
      else if (item.status === 'Estoque baixo') estoqueBaixo++;
      else if (item.status === 'Sem estoque') semEstoque++;
    });

    const totalProdutos = items.length;
    const normalPct = totalProdutos > 0 ? Math.round((normal / totalProdutos) * 100) : 0;
    const atencaoPct = totalProdutos > 0 ? Math.round((atencao / totalProdutos) * 100) : 0;
    const alertaTotal = estoqueBaixo + semEstoque;
    const alertaPct = totalProdutos > 0 ? Math.round((alertaTotal / totalProdutos) * 100) : 0;

    return {
      totalProdutos,
      normal,
      atencao,
      estoqueBaixo,
      semEstoque,
      alertaTotal,
      normalPct,
      atencaoPct,
      alertaPct,
      totalEmEstoque,
    };
  }, [items]);

  // Filtragem dos Produtos
  const filteredProducts = useMemo(() => {
    let result = items.filter((p) => {
      // Busca textual por nome, código ou categoria
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesName = p.produto?.toLowerCase().includes(term);
        const matchesCode = p.codigo?.toLowerCase().includes(term);
        const matchesCategory = p.categoria?.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesCategory) return false;
      }

      // Categoria
      if (selectedCategory !== 'all' && p.categoria !== selectedCategory) {
        return false;
      }

      // Grupo
      if (selectedGroup !== 'all' && p.grupo !== selectedGroup) {
        return false;
      }

      // Status
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'alerta') {
          if (p.status !== 'Estoque baixo' && p.status !== 'Sem estoque') return false;
        } else if (p.status !== selectedStatus) {
          return false;
        }
      }

      return true;
    });

    // Ordenação
    if (sortField) {
      result.sort((a, b) => {
        if (sortField === 'codigo') {
          const valA = a.codigo || '';
          const valB = b.codigo || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (sortField === 'estoqueAtual') {
          const valA = a.estoqueAtual || 0;
          const valB = b.estoqueAtual || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return result;
  }, [items, searchTerm, selectedCategory, selectedGroup, selectedStatus, sortField, sortDirection]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Alternar ordenação
  const handleToggleSort = (field: 'codigo' | 'estoqueAtual') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Checkbox seleção de linhas
  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedProducts.map((p) => p.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Limpar filtros da tabela
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedGroup('all');
    setSelectedStatus('all');
    setCurrentPage(1);
  };

  // Exportar produtos para CSV
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) return;
    const headers = [
      'Código',
      'Produto',
      'Categoria',
      'Grupo',
      'Estoque Atual',
      'Unidade',
      'Estoque Mínimo',
      'Status',
    ];
    const rows = filteredProducts.map((p) => [
      `"${(p.codigo || '').replace(/"/g, '""')}"`,
      `"${(p.produto || '').replace(/"/g, '""')}"`,
      `"${(p.categoria || '').replace(/"/g, '""')}"`,
      `"${(p.grupo || '').replace(/"/g, '""')}"`,
      p.estoqueAtual ?? 0,
      `"${(p.unidade || 'un').replace(/"/g, '""')}"`,
      p.estoqueMinimo ?? 10,
      `"${(p.status || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `estoque_produtos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirmar exclusão de produto
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await excluirItemEstoque(itemToDelete.id, currentUserName);
      if (res.success) {
        showToast(`Produto ${itemToDelete.produto} removido com sucesso!`);
        const deletedId = itemToDelete.id;
        setItemToDelete(null);
        setItems((prev) => prev.filter((it) => it.id !== deletedId));
      } else {
        alert(res.error || 'Erro ao excluir produto.');
      }
    } catch {
      alert('Falha ao processar exclusão.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Renderizador de Status Badge
  const renderStatusBadge = (status: EstoqueStatus) => {
    switch (status) {
      case 'Normal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Normal
          </span>
        );
      case 'Atenção':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ↓ Em atenção
          </span>
        );
      case 'Estoque baixo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            ! Estoque baixo
          </span>
        );
      case 'Sem estoque':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            • Zerado
          </span>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-7 lg:px-9 xl:px-10 py-6 sm:py-8 space-y-7 sm:space-y-8 pb-20 text-slate-800 font-sans">
      {/* Toast de Sucesso */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Início</span>
        <span>&gt;</span>
        <span>Estoque</span>
        <span>&gt;</span>
        <span className="font-semibold text-slate-800">
          {activeTab === 'produtos'
            ? 'Produtos em Estoque'
            : activeTab === 'movimentacoes'
            ? 'Movimentações'
            : 'Resumo'}
        </span>
      </div>

      {/* HEADER PRINCIPAL COM ÍCONE VETORIAL SVG MINIMALISTA E BOTÕES DE AÇÃO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8 pt-1 pb-1">
        <div className="flex items-center gap-4">
          {/* Ícone vetorial SVG minimalista de estoque/caixa - flat e corporativo, traços simples, azul Fênix World, sem 3D, sem gradiente */}
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-blue-50/90 border border-blue-100 flex items-center justify-center text-[#0B2046] shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0B2046"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-[#0B2046]"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
              <path d="M10 4v6" />
              <path d="M14 4v6" />
              <line x1="8" y1="15" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#0B2046] tracking-tight">Controle de Estoque</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Gerencie entradas, saídas e acompanhe o nível de estoque em tempo real.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-3.5">
          {/* Botão Gerenciar Categorias */}
          <button
            type="button"
            onClick={() => setIsCategoriasModalOpen(true)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Folder className="w-4 h-4 text-slate-500" />
            <span>Gerenciar Categorias</span>
          </button>

          {/* Botão Gerenciar Grupos */}
          <button
            type="button"
            onClick={() => setIsGruposModalOpen(true)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Gerenciar Grupos</span>
          </button>

          {/* Botão + Novo Produto */}
          <button
            type="button"
            onClick={() => setIsNovoProdutoModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>

          {/* Botão + Nova Entrada (com opções Compra / Devolução / Outro) */}
          <div className="relative">
            <div className="inline-flex rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setEntradaSubtipo('Compra');
                  setIsEntradaModalOpen(true);
                  setIsEntradaDropdownOpen(false);
                }}
                className="px-3.5 py-2.5 bg-[#0B2046] hover:bg-[#081836] text-white rounded-l-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Entrada</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEntradaDropdownOpen(!isEntradaDropdownOpen);
                  setIsSaidaDropdownOpen(false);
                }}
                className="px-2 py-2.5 bg-[#081836] hover:bg-[#061228] text-white rounded-r-xl text-xs font-bold transition-all border-l border-white/10 cursor-pointer"
                title="Opções de Entrada: Compra / Devolução / Outro"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {isEntradaDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tipo de Entrada
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEntradaSubtipo('Compra');
                    setIsEntradaModalOpen(true);
                    setIsEntradaDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Entrada por Compra</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntradaSubtipo('Devolução');
                    setIsEntradaModalOpen(true);
                    setIsEntradaDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Entrada por Devolução</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntradaSubtipo('Outro');
                    setIsEntradaModalOpen(true);
                    setIsEntradaDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-slate-600" />
                  <span>Outro (Ajuste / Bonificação)</span>
                </button>
              </div>
            )}
          </div>

          {/* Botão Saída (com opções Venda / Full / Outro) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSaidaDropdownOpen(!isSaidaDropdownOpen);
                setIsEntradaDropdownOpen(false);
              }}
              className="px-3.5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
              <span>Saída</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {isSaidaDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tipo de Saída
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemForAction(null);
                    setIsSaidaVendaModalOpen(true);
                    setIsSaidaDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                  <span>Saída — Venda</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemForAction(null);
                    setIsSaidaFullModalOpen(true);
                    setIsSaidaDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  <span>Saída — Full</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemForAction(null);
                    setIsSaidaOutroModalOpen(true);
                    setIsSaidaDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-slate-600" />
                  <span>Saída — Outro</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PAINEL DE MÉTRICAS EXECUTIVAS (Moderno, clean e equilibrado, reduzindo a sensação de excesso de cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5">
        {/* Card 1: Total de Produtos */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase block">Total de Itens</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tabular-nums">{stats.totalProdutos.toLocaleString('pt-BR')}</span>
                <span className="text-xs text-slate-400">itens no catálogo</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200/60 shrink-0">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Saldo físico total</span>
            <span className="font-bold text-slate-900 tabular-nums font-mono text-[11px]">
              {Math.round(stats.totalEmEstoque).toLocaleString('pt-BR')} un
            </span>
          </div>
        </div>

        {/* Card 2: Estoque Normal */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase block">Estoque Normal</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-[26px] font-bold text-emerald-600 tabular-nums">{stats.normal.toLocaleString('pt-BR')}</span>
                <span className="text-xs text-emerald-600/80">produtos no nível ideal</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold tabular-nums">✓ {stats.normalPct}% do catálogo</span>
            <span className="text-slate-400 text-[11px]">Nível ideal</span>
          </div>
        </div>

        {/* Card 3: Produtos em Atenção */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase block">Em Atenção</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-[26px] font-bold text-amber-600 tabular-nums">{stats.atencao.toLocaleString('pt-BR')}</span>
                <span className="text-xs text-amber-600/80">próximos do mínimo</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-amber-700 font-semibold tabular-nums">⏰ {stats.atencaoPct}% do catálogo</span>
            <span className="text-slate-400 text-[11px]">Monitorar</span>
          </div>
        </div>

        {/* Card 4: Produtos com Estoque Baixo */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-rose-700 uppercase block">Estoque Crítico / Baixo</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-[26px] font-bold text-rose-600 tabular-nums">{stats.alertaTotal.toLocaleString('pt-BR')}</span>
                <span className="text-[11px] text-rose-600/80">
                  ({stats.semEstoque} zerados · {stats.estoqueBaixo} baixos)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-rose-700 font-semibold tabular-nums">⚠️ {stats.alertaPct}% do catálogo</span>
            <span className="text-rose-600 font-medium text-[11px]">Necessita reposição</span>
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO: Produtos em Estoque | Insumos da Loja | Movimentações | Resumo */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 max-w-fit overflow-x-auto shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('produtos');
              setCurrentPage(1);
            }}
            className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'produtos'
                ? 'bg-white text-[#0B2046] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Boxes className="w-4 h-4 text-blue-600" />
            <span>Produtos em Estoque</span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono tabular-nums font-bold">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('insumos')}
            className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'insumos'
                ? 'bg-white text-[#0B2046] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Package className="w-4 h-4 text-slate-600" />
            <span>Insumos da Loja</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movimentacoes')}
            className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'movimentacoes'
                ? 'bg-white text-[#0B2046] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
            <span>Movimentações</span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono tabular-nums font-bold">
              {movimentacoes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resumo')}
            className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'resumo'
                ? 'bg-white text-[#0B2046] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Resumo</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA ABA INSUMOS DA LOJA */}
      {activeTab === 'insumos' && (
        <div className="pt-3 sm:pt-5">
          <EstoqueInsumosView currentUserName={currentUserName} />
        </div>
      )}

      {/* CONTEÚDO DA ABA MOVIMENTAÇÕES */}
      {activeTab === 'movimentacoes' && (
        <div className="pt-3 sm:pt-5">
          <EstoqueMovimentacoesView
            movimentacoes={movimentacoes}
            items={items}
            categories={categories}
            currentUserName={currentUserName}
            targetMovimentacaoId={targetMovimentacaoId}
            onRefresh={() => {
              const cached = getCachedEstoqueItems();
              if (cached.length > 0) setItems(cached);
              const cachedMovs = getCachedMovimentacoes();
              if (cachedMovs.length > 0) setMovimentacoes(cachedMovs);
            }}
          />
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: RESUMO */}
      {activeTab === 'resumo' && (
        <div className="pt-3 sm:pt-5">
          <EstoqueResumoView items={items} movimentacoes={movimentacoes} />
        </div>
      )}

      {/* CONTEÚDO DA ABA 1: PRODUTOS EM ESTOQUE (Espelho da Imagem 2 - Largura Total, Sem Barra Lateral) */}
      {activeTab === 'produtos' && (
        <div className="pt-4 sm:pt-6 space-y-7 sm:space-y-8">
          {/* Card de Filtros (Linha 1: Busca + Limpar + Exportar | Linha 2: Dropdowns de Categoria, Grupo, Status) */}
          <div className="bg-white p-4.5 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 sm:top-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome, código ou categoria..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                />
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar filtros</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Exportar produtos filtrados para CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Linha 2: Dropdowns de Categoria, Grupo e Status (3 colunas, sem Marca) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-0.5">
              {/* Categoria - Dropdown com as categorias cadastradas em Gerenciar Categorias */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Categoria
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grupo */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Grupo
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="all">Todos os grupos</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nível de Estoque
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="all">Todos os status</option>
                  <option value="Normal">Normal (Ideal)</option>
                  <option value="Atenção">Atenção (Próximo ao mín.)</option>
                  <option value="Estoque baixo">Estoque baixo</option>
                  <option value="Sem estoque">Sem estoque (Zerado)</option>
                  <option value="alerta">Alerta Crítico (Baixo + Zerado)</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABELA DE PRODUTOS EM ESTOQUE (LARGURA TOTAL, SEM MARCA) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                Sincronizando estoque...
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0B2046] flex items-center justify-center mx-auto border border-blue-100/60">
                  <Package className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Nenhum produto cadastrado no estoque</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  O estoque está zerado. Todos os produtos podem ser cadastrados manualmente através de "+ Novo Produto".
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNovoProdutoModalOpen(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Produto</span>
                  </button>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <p>Nenhum produto encontrado com os filtros selecionados.</p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-3.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={
                            paginatedProducts.length > 0 &&
                            selectedIds.length === paginatedProducts.length
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th
                        className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/60 transition-colors"
                        onClick={() => handleToggleSort('codigo')}
                      >
                        <div className="flex items-center gap-1">
                          <span>CÓDIGO</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">PRODUTO</th>
                      <th className="py-3.5 px-3.5">CATEGORIA</th>
                      <th className="py-3.5 px-3.5">GRUPO</th>
                      <th
                        className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100/60 transition-colors"
                        onClick={() => handleToggleSort('estoqueAtual')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>ESTOQUE ATUAL</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-right">ESTOQUE MÍNIMO</th>
                      <th className="py-3.5 px-3.5 text-center">STATUS</th>
                      <th className="py-3.5 px-4 text-center">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedProducts.map((p) => {
                      const isSelected = selectedIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(p.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Código */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-medium text-slate-700">
                            <span className="bg-slate-100/80 px-2 py-0.5 rounded text-[11px] border border-slate-200/60">
                              {p.codigo}
                            </span>
                          </td>

                          {/* Produto */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-semibold text-slate-900 leading-snug">{p.produto}</p>
                          </td>

                          {/* Categoria */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className="font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 text-[11px]">
                              {p.categoria || 'Geral'}
                            </span>
                          </td>

                          {/* Grupo */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-500">
                            {p.grupo || '—'}
                          </td>

                          {/* Estoque Atual */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums">
                            <span
                              className={`font-bold font-mono ${
                                p.estoqueAtual > 0
                                  ? p.status === 'Normal'
                                    ? 'text-slate-900'
                                    : 'text-amber-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {Math.round(p.estoqueAtual)} {p.unidade}
                            </span>
                          </td>

                          {/* Estoque Mínimo */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-500 font-medium font-mono tabular-nums">
                            {Math.round(p.estoqueMinimo)} {p.unidade}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                            {renderStatusBadge(p.status)}
                          </td>

                          {/* Ações (Editar, Detalhes / Gráfico, Excluir) */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Editar Produto */}
                              <button
                                type="button"
                                onClick={() => {
                                  setItemToEdit(p);
                                  setIsEditarProdutoModalOpen(true);
                                }}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200/60 shadow-2xs cursor-pointer"
                                title="Editar produto"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Detalhes / Histórico do Produto */}
                              <button
                                type="button"
                                onClick={() => setItemParaDetalhes(p)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer"
                                title="Detalhes do estoque e histórico deste produto"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Excluir Produto */}
                              <button
                                type="button"
                                onClick={() => setItemToDelete(p)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200/60 shadow-2xs cursor-pointer"
                                title="Excluir produto do estoque"
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

            {/* Paginação da Tabela (Espelho da Imagem 2) */}
            {filteredProducts.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
                  {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de{' '}
                  {filteredProducts.length} produtos
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                        currentPage === p
                          ? 'bg-[#0B2046] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-7 h-7 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200"
                  >
                    &gt;
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Itens por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                  >
                    <option value={10}>10 por página</option>
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: NOVA ENTRADA */}
      <NovaEntradaModal
        isOpen={isEntradaModalOpen}
        onClose={() => setIsEntradaModalOpen(false)}
        availableProducts={items}
        currentUserName={currentUserName}
        initialSubtipo={entradaSubtipo}
        onSuccess={(updatedItems, newMovs) => {
          if (updatedItems && updatedItems.length > 0) {
            setItems(updatedItems);
          } else {
            const cached = getCachedEstoqueItems();
            if (cached.length > 0) setItems(cached);
          }
          if (newMovs && newMovs.length > 0) {
            setMovimentacoes((prev) => [...newMovs, ...prev]);
          } else {
            const cachedMovs = getCachedMovimentacoes();
            if (cachedMovs.length > 0) setMovimentacoes(cachedMovs);
          }
          showToast('Entrada de estoque registrada com sucesso!');
        }}
      />

      {/* MODAL 2: SAÍDA VENDA */}
      <SaidaVendaModal
        isOpen={isSaidaVendaModalOpen}
        onClose={() => {
          setIsSaidaVendaModalOpen(false);
          setSelectedItemForAction(null);
        }}
        availableProducts={items}
        preselectedProduct={selectedItemForAction}
        currentUserName={currentUserName}
        onSuccess={(itemAtualizado, novaMov) => {
          if (itemAtualizado) {
            setItems((prev) => prev.map((it) => (it.id === itemAtualizado.id ? itemAtualizado : it)));
          } else {
            const cached = getCachedEstoqueItems();
            if (cached.length > 0) setItems(cached);
          }
          if (novaMov) {
            setMovimentacoes((prev) => [novaMov, ...prev]);
          } else {
            const cachedMovs = getCachedMovimentacoes();
            if (cachedMovs.length > 0) setMovimentacoes(cachedMovs);
          }
          showToast('Saída por venda registrada com sucesso!');
        }}
      />

      {/* MODAL 3: SAÍDA FULL */}
      <SaidaFullModal
        isOpen={isSaidaFullModalOpen}
        onClose={() => {
          setIsSaidaFullModalOpen(false);
          setSelectedItemForAction(null);
        }}
        availableProducts={items}
        preselectedProduct={selectedItemForAction}
        currentUserName={currentUserName}
        onSuccess={(itemAtualizado, novaMov) => {
          if (itemAtualizado) {
            setItems((prev) => prev.map((it) => (it.id === itemAtualizado.id ? itemAtualizado : it)));
          } else {
            const cached = getCachedEstoqueItems();
            if (cached.length > 0) setItems(cached);
          }
          if (novaMov) {
            setMovimentacoes((prev) => [novaMov, ...prev]);
          } else {
            const cachedMovs = getCachedMovimentacoes();
            if (cachedMovs.length > 0) setMovimentacoes(cachedMovs);
          }
          showToast('Saída para Full/CD registrada com sucesso!');
        }}
      />

      {/* MODAL 4: SAÍDA OUTRO */}
      <SaidaOutroModal
        isOpen={isSaidaOutroModalOpen}
        onClose={() => {
          setIsSaidaOutroModalOpen(false);
          setSelectedItemForAction(null);
        }}
        availableProducts={items}
        preselectedProduct={selectedItemForAction}
        currentUserName={currentUserName}
        onSuccess={(itemAtualizado, novaMov) => {
          if (itemAtualizado) {
            setItems((prev) => prev.map((it) => (it.id === itemAtualizado.id ? itemAtualizado : it)));
          } else {
            const cached = getCachedEstoqueItems();
            if (cached.length > 0) setItems(cached);
          }
          if (novaMov) {
            setMovimentacoes((prev) => [novaMov, ...prev]);
          } else {
            const cachedMovs = getCachedMovimentacoes();
            if (cachedMovs.length > 0) setMovimentacoes(cachedMovs);
          }
          showToast('Saída registrada com sucesso!');
        }}
      />

      {/* MODAL 5: GERENCIAR CATEGORIAS */}
      <CategoriasModal
        isOpen={isCategoriasModalOpen}
        onClose={() => setIsCategoriasModalOpen(false)}
        currentUserName={currentUserName}
        onUpdated={() => {
          setCategories(getCachedCategorias());
          showToast('Categorias atualizadas com sucesso!');
        }}
      />

      {/* MODAL 6: GERENCIAR GRUPOS */}
      <GruposModal
        isOpen={isGruposModalOpen}
        onClose={() => setIsGruposModalOpen(false)}
        currentUserName={currentUserName}
        onUpdated={() => {
          setGroups(getCachedGrupos());
          showToast('Grupos atualizados com sucesso!');
        }}
      />

      {/* MODAL 7: DETALHES E HISTÓRICO DO PRODUTO */}
      <DetalhesEstoqueModal
        isOpen={!!itemParaDetalhes}
        onClose={() => setItemParaDetalhes(null)}
        item={itemParaDetalhes}
        movimentacoes={movimentacoes}
        currentUserName={currentUserName}
        onSuccess={(itemAtualizado) => {
          if (itemAtualizado) {
            setItems((prev) => prev.map((it) => (it.id === itemAtualizado.id ? itemAtualizado : it)));
          } else {
            const cached = getCachedEstoqueItems();
            if (cached.length > 0) setItems(cached);
          }
          showToast('Estoque do produto atualizado com sucesso!');
        }}
      />

      {/* MODAL 8: NOVO PRODUTO MANUAL */}
      <NovoProdutoModal
        isOpen={isNovoProdutoModalOpen}
        onClose={() => setIsNovoProdutoModalOpen(false)}
        currentUserName={currentUserName}
        onSuccess={(novoItem) => {
          if (novoItem) {
            setItems((prev) => [novoItem, ...prev]);
            const cachedMovs = getCachedMovimentacoes();
            if (cachedMovs.length > 0) setMovimentacoes(cachedMovs);
          } else {
            const cached = getCachedEstoqueItems();
            if (cached.length > 0) setItems(cached);
          }
          showToast('Produto cadastrado no estoque com sucesso!');
        }}
      />

      {/* MODAL 9: EDITAR PRODUTO */}
      <EditarProdutoModal
        isOpen={isEditarProdutoModalOpen}
        onClose={() => {
          setIsEditarProdutoModalOpen(false);
          setItemToEdit(null);
        }}
        item={itemToEdit}
        currentUserName={currentUserName}
        onSuccess={(itemAtualizado) => {
          if (itemAtualizado) {
            setItems((prev) => prev.map((it) => (it.id === itemAtualizado.id ? itemAtualizado : it)));
          } else {
            const cached = getCachedEstoqueItems();
            if (cached.length > 0) setItems(cached);
          }
          showToast('Produto atualizado com sucesso!');
        }}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Produto do Estoque?</h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="font-semibold text-slate-800">{itemToDelete.produto}</p>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <span>Código: {itemToDelete.codigo}</span>
                <span>•</span>
                <span>Saldo atual: {Math.round(itemToDelete.estoqueAtual)} {itemToDelete.unidade}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O produto será removido permanentemente do controle físico de estoque.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Produto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
