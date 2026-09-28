import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Calendar,
  RotateCcw,
  User,
  Users,
  Store,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  AlertOctagon,
} from 'lucide-react';
import { VendaGerencial, ClientRecord } from '../types';
import { isEderPerez } from '../utils/auth';
import {
  fetchVendasFromDatabase,
  fetchClientsFromDatabase,
  excluirVendaGerencial,
  extrairNumeroPuroPedido,
} from '../utils/vendasService';
import { UserAvatar } from './UserAvatar';
import { VendasComercialView } from './vendas/VendasComercialView';
import { VendasMarketplaceView } from './vendas/VendasMarketplaceView';
import { ModalDetalhesPedido } from './vendas/ModalDetalhesPedido';
import { ModalCalculoMargem } from './vendas/ModalCalculoMargem';
import { ModalEditarCustos } from './vendas/ModalEditarCustos';
import { ModalEditarPedido } from './vendas/ModalEditarPedido';
import { ModalCancelarVenda } from './vendas/ModalCancelarVenda';
import { ModalImprimirExportar } from './vendas/ModalImprimirExportar';

interface VendasScreenProps {
  currentUserName: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

// Opções de Responsável: Todos, Éder Perez, Vanessa Gomes, Jhessica Camargo e Jeferson Trolesi
export const RESPONSAVEIS_VENDAS = [
  { id: 'Todos', nome: 'Todos', cargo: 'Todas as vendas', tipo: 'todos' },
  { id: 'Éder Perez', nome: 'Éder Perez', cargo: 'Diretoria Geral', tipo: 'diretoria' },
  { id: 'Vanessa Gomes', nome: 'Vanessa Gomes', cargo: 'Consultora Comercial', tipo: 'comercial' },
  { id: 'Jhessica Camargo', nome: 'Jhessica Camargo', cargo: 'Consultora Comercial', tipo: 'comercial' },
  { id: 'Jeferson Trolesi', nome: 'Jeferson Trolesi', cargo: 'Marketplace', tipo: 'marketplace' },
] as const;

export type ResponsavelId = typeof RESPONSAVEIS_VENDAS[number]['id'];

export type PeriodoOpcao =
  | 'Hoje'
  | 'Ontem'
  | 'Esta semana'
  | 'Semana anterior'
  | 'Este mês'
  | 'Mês anterior'
  | 'Este ano'
  | 'Período personalizado';

export function VendasScreen({
  currentUserName,
  onBackToCadastro,
  onNavigateTab,
}: VendasScreenProps) {
  const isDirector = isEderPerez(currentUserName);

  // Acesso exclusivo do Diretor Éder Perez
  if (!isDirector) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-6">
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-2xs">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-[#091122]">Acesso Exclusivo da Diretoria</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            A aba <strong>Vendas</strong> é de acesso restrito e exclusivo do <strong>Diretor Éder Perez</strong>. Somente a Diretoria pode acessar, visualizar as vendas de todos os responsáveis e cadastrar vendas diretamente.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('Clientes')}
            className="mt-5 px-5 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Ir para Clientes
          </button>
        </div>
      </div>
    );
  }

  // Responsável: Inicia em 'Todos' para reunir todas as vendas reais do CRM para o Diretor Éder Perez
  const [responsavelSelecionado, setResponsavelSelecionado] = useState<ResponsavelId>('Todos');

  // Período: Inicia em "Este mês"
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoOpcao>('Este mês');

  // Datas para Período Personalizado
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Busca textual (Cliente ou Pedido)
  const [buscaTexto, setBuscaTexto] = useState('');

  // Dados carregados do Supabase
  const [vendas, setVendas] = useState<VendaGerencial[]>([]);
  const [clientes, setClientes] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Guards e debounce para evitar ciclos ou re-consultas redundantes
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  // Modais de Controle
  const [modalDetalhesVenda, setModalDetalhesVenda] = useState<VendaGerencial | null>(null);
  const [modalMargemVenda, setModalMargemVenda] = useState<VendaGerencial | null>(null);
  const [modalCustosVenda, setModalCustosVenda] = useState<VendaGerencial | null>(null);
  const [modalEditarVenda, setModalEditarVenda] = useState<VendaGerencial | null>(null);
  const [modalCancelarVenda, setModalCancelarVenda] = useState<VendaGerencial | null>(null);
  const [modalImprimirVenda, setModalImprimirVenda] = useState<VendaGerencial | null>(null);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<VendaGerencial | null>(null);
  const [isExcluindo, setIsExcluindo] = useState(false);

  // Carrega vendas e clientes diretamente do Supabase
  const carregarVendas = useCallback(async (isManualRefresh = false) => {
    // Evita chamadas concorrentes ou loops repetidos
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    try {
      setFetchError(null);
      const [vendasData, clientsData] = await Promise.all([
        fetchVendasFromDatabase(),
        fetchClientsFromDatabase(),
      ]);
      setVendas(vendasData);
      setClientes(clientsData);
    } catch (err: any) {
      console.error('Erro ao carregar vendas do Supabase:', err);
      setFetchError('Não foi possível sincronizar as vendas com o Supabase. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Carrega dados do Supabase ao abrir a aba
    carregarVendas(false);

    // Atualização em background controlada com debounce apenas para inclusões em Metas e Follow-up
    // Não aciona se a alteração for da própria tela de vendas
    const handleExternalDataChanged = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        carregarVendas(false);
      }, 2000);
    };

    window.addEventListener('fenix_metas_updated', handleExternalDataChanged);
    window.addEventListener('fenix_marketplace_sales_updated', handleExternalDataChanged);
    window.addEventListener('fenix_followup_updated', handleExternalDataChanged);
    window.addEventListener('fenix_vendas_updated', handleExternalDataChanged);
    window.addEventListener('fenix_vendas_gerencial_updated', handleExternalDataChanged);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('fenix_metas_updated', handleExternalDataChanged);
      window.removeEventListener('fenix_marketplace_sales_updated', handleExternalDataChanged);
      window.removeEventListener('fenix_followup_updated', handleExternalDataChanged);
      window.removeEventListener('fenix_vendas_updated', handleExternalDataChanged);
      window.removeEventListener('fenix_vendas_gerencial_updated', handleExternalDataChanged);
    };
  }, [carregarVendas]);

  // Função auxiliar para conferir se uma data cai no período selecionado
  const isDateInPeriod = useCallback((dateStr: string, periodo: PeriodoOpcao): boolean => {
    if (!dateStr) return false;
    const cleanDate = dateStr.split('T')[0];
    const itemDate = new Date(cleanDate + 'T12:00:00');
    if (isNaN(itemDate.getTime())) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

    switch (periodo) {
      case 'Hoje':
        return itemDay.getTime() === today.getTime();

      case 'Ontem': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return itemDay.getTime() === yesterday.getTime();
      }

      case 'Esta semana': {
        // Segunda-feira desta semana
        const dayOfWeek = today.getDay(); // 0 é domingo, 1 é segunda
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return itemDay >= monday && itemDay <= sunday;
      }

      case 'Semana anterior': {
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() + diffToMonday - 7);

        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);

        return itemDay >= lastMonday && itemDay <= lastSunday;
      }

      case 'Este mês':
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );

      case 'Mês anterior': {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          itemDate.getFullYear() === lastMonthDate.getFullYear() &&
          itemDate.getMonth() === lastMonthDate.getMonth()
        );
      }

      case 'Este ano':
        return itemDate.getFullYear() === now.getFullYear();

      case 'Período personalizado': {
        if (!dataInicioPersonalizada || !dataFimPersonalizada) return true;
        const start = new Date(dataInicioPersonalizada + 'T00:00:00');
        const end = new Date(dataFimPersonalizada + 'T23:59:59');
        return itemDate >= start && itemDate <= end;
      }

      default:
        return true;
    }
  }, [dataInicioPersonalizada, dataFimPersonalizada]);

  // Filtragem das vendas com base no Responsável e Período
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((venda) => {
      // 1. Filtro de Responsável (Todos, Éder Perez, Vanessa Gomes, Jhessica Camargo, Jeferson Trolesi)
      const respAtual = responsavelSelecionado;
      const respItem = (venda.vendedor || '').trim().toLowerCase();
      const criadoPor = (venda.criadoPor || '').trim().toLowerCase();

      if (respAtual === 'Todos') {
        // Exibe todas as vendas concluídas de todos os responsáveis
      } else if (respAtual === 'Jeferson Trolesi') {
        // Para Jeferson, aceita se o vendedor for ele ou se for de canal marketplace
        const isJef =
          respItem.includes('jeferson') ||
          criadoPor.includes('jeferson') ||
          Boolean(venda.canalMarketplace);
        if (!isJef) return false;
      } else if (respAtual === 'Vanessa Gomes') {
        const isVan = respItem.includes('vanessa') || criadoPor.includes('vanessa');
        if (!isVan) return false;
      } else if (respAtual === 'Jhessica Camargo') {
        const isJhes =
          respItem.includes('jhessica') ||
          respItem.includes('jessica') ||
          criadoPor.includes('jhessica') ||
          criadoPor.includes('jessica');
        if (!isJhes) return false;
      } else if (respAtual === 'Éder Perez') {
        // Cada opção deve mostrar as vendas cadastradas pelo respectivo responsável.
        // Éder Perez também visualiza e tem suas próprias vendas normalmente.
        const isEder =
          respItem.includes('éder') ||
          respItem.includes('eder') ||
          criadoPor.includes('éder') ||
          criadoPor.includes('eder');
        if (!isEder) return false;
      }

      // 2. Filtro de Período
      if (!isDateInPeriod(venda.data, periodoSelecionado)) {
        return false;
      }

      // 3. Filtro de Busca textual (Cliente ou Pedido)
      if (buscaTexto.trim()) {
        const term = buscaTexto.trim().toLowerCase();
        const client = (venda.cliente || '').toLowerCase();
        const pedido = String(venda.numeroPedido || '').toLowerCase();
        if (!client.includes(term) && !pedido.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [vendas, responsavelSelecionado, periodoSelecionado, isDateInPeriod, buscaTexto]);

  // Handlers para ações de menu (⋮)
  const handleVerDetalhes = (venda: VendaGerencial) => {
    setModalDetalhesVenda(venda);
  };

  const handleVerMargem = (venda: VendaGerencial) => {
    setModalMargemVenda(venda);
  };

  const handleEditarPedido = (venda: VendaGerencial) => {
    setModalEditarVenda(venda);
  };

  const handleEditarCustos = (venda: VendaGerencial) => {
    setModalCustosVenda(venda);
  };

  const handleImprimir = (venda: VendaGerencial) => {
    setModalImprimirVenda(venda);
  };

  const handleCancelarVenda = (venda: VendaGerencial) => {
    setModalCancelarVenda(venda);
  };

  // EXCLUSÃO DE VENDAS: Somente Éder Perez pode excluir
  const handleSolicitarExcluir = (venda: VendaGerencial) => {
    setVendaParaExcluir(venda);
  };

  const handleConfirmarExclusao = async () => {
    if (!vendaParaExcluir) return;
    setIsExcluindo(true);
    try {
      const res = await excluirVendaGerencial(vendaParaExcluir.id, currentUserName);
      if (res.success) {
        // Remove imediatamente da listagem local
        setVendas((prev) => prev.filter((v) => v.id !== vendaParaExcluir.id));
        setVendaParaExcluir(null);
      } else {
        alert(`Erro ao excluir venda: ${res.error || 'Falha na operação'}`);
      }
    } catch (err: any) {
      alert(`Erro inesperado ao excluir venda: ${err?.message || 'Falha ao sincronizar com Supabase'}`);
    } finally {
      setIsExcluindo(false);
    }
  };

  // Se o responsável selecionado for Jeferson Trolesi, ativa o Módulo Marketplace
  const isMarketplaceView = responsavelSelecionado === 'Jeferson Trolesi';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 flex-1 flex flex-col min-h-full animate-fadeIn">
      {/* Barra Superior: Título do Módulo e Botão de Atualizar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0B2046] text-white flex items-center justify-center shadow-xs">
              {isMarketplaceView ? (
                <Store className="w-5 h-5 text-orange-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isMarketplaceView ? 'Vendas Marketplace' : 'Vendas'}
              </h1>
              <p className="text-xs text-slate-500">
                {isMarketplaceView
                  ? 'Apuração comercial de Shopee e Mercado Livre'
                  : 'Gestão de vendas fechadas, custos e margem líquida'}
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação com Supabase */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => carregarVendas(true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition flex items-center gap-2"
            title="Sincronizar com Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const defaultVendedor =
                responsavelSelecionado === 'Todos' ? 'Éder Perez' : responsavelSelecionado;
              setModalEditarVenda({
                id: `vnd-${Date.now()}`,
                numeroPedido: String(Math.floor(100000 + Math.random() * 900000)),
                data: new Date().toISOString().split('T')[0],
                cliente: '',
                tipoCliente: 'Cliente Final',
                vendedor: defaultVendedor,
                valorVenda: 0,
                desconto: 0,
                frete: 0,
                formaPagamento: 'Pix / À Vista',
                statusPedido: 'Concluída',
                criadoPor: currentUserName || 'Éder Perez',
                observacoes: '',
              } as VendaGerencial);
            }}
            className="px-4 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center cursor-pointer"
            title="Cadastrar Nova Venda"
          >
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      {/* Seletor de Responsável e Período (Design Moderno Fênix World) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* 1. SELETOR DE RESPONSÁVEL (Todos, Éder Perez, Vanessa Gomes, Jhessica Camargo e Jeferson Trolesi) */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Responsável
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {RESPONSAVEIS_VENDAS.map((resp) => {
              const isSelected = responsavelSelecionado === resp.id;
              const isMarketplace = resp.tipo === 'marketplace';

              return (
                <button
                  key={resp.id}
                  type="button"
                  onClick={() => setResponsavelSelecionado(resp.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex items-center gap-3 ${
                    isSelected
                      ? isMarketplace
                        ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/20 text-orange-950 shadow-xs'
                        : 'bg-[#0B2046] border-[#0B2046] text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  {resp.id === 'Todos' ? (
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? isMarketplace
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/20 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                  ) : (
                    <UserAvatar userName={resp.nome} size="sm" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        isSelected && !isMarketplace ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {resp.nome}
                    </p>
                    <p
                      className={`text-[10px] truncate ${
                        isSelected
                          ? isMarketplace
                            ? 'text-orange-700 font-medium'
                            : 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {resp.cargo}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. SELETOR DE PERÍODO & CAMPO DE BUSCA */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Opções de Período */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </span>
            {(
              [
                'Hoje',
                'Ontem',
                'Esta semana',
                'Semana anterior',
                'Este mês',
                'Mês anterior',
                'Este ano',
                'Período personalizado',
              ] as PeriodoOpcao[]
            ).map((opcao) => {
              const isSelected = periodoSelecionado === opcao;
              return (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setPeriodoSelecionado(opcao)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#0B2046] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {opcao}
                </button>
              );
            })}
          </div>

          {/* Campo de Busca rápida por Cliente ou Pedido */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cliente ou número do pedido..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Campos adicionais para Período Personalizado */}
        {periodoSelecionado === 'Período personalizado' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/60 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">De:</span>
              <input
                type="date"
                value={dataInicioPersonalizada}
                onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Até:</span>
              <input
                type="date"
                value={dataFimPersonalizada}
                onChange={(e) => setDataFimPersonalizada(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Alerta de Erro com opção Tentar novamente */}
      {fetchError && !isLoading && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-center shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Atenção ao consultar vendas</h3>
          <p className="text-xs text-slate-600 mb-4 max-w-md mx-auto">{fetchError}</p>
          <button
            type="button"
            onClick={() => carregarVendas(true)}
            className="px-4 py-2 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* Visão de Conteúdo: Comercial OU Marketplace */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-600">Carregando vendas oficiais do Supabase...</p>
        </div>
      ) : isMarketplaceView ? (
        <VendasMarketplaceView
          vendas={vendasFiltradas}
          isDirector={isDirector}
          currentUserName={currentUserName}
          onVerDetalhes={handleVerDetalhes}
          onVerMargem={handleVerMargem}
          onEditarPedido={handleEditarPedido}
          onEditarCustos={handleEditarCustos}
          onImprimir={handleImprimir}
          onCancelarVenda={handleCancelarVenda}
          onExcluirVenda={handleSolicitarExcluir}
        />
      ) : (
        <VendasComercialView
          vendas={vendasFiltradas}
          clientes={clientes}
          isDirector={isDirector}
          currentUserName={currentUserName}
          onVerDetalhes={handleVerDetalhes}
          onVerMargem={handleVerMargem}
          onEditarPedido={handleEditarPedido}
          onEditarCustos={handleEditarCustos}
          onImprimir={handleImprimir}
          onCancelarVenda={handleCancelarVenda}
          onExcluirVenda={handleSolicitarExcluir}
        />
      )}

      {/* Modais de Ações do Pedido */}
      <ModalDetalhesPedido
        venda={modalDetalhesVenda}
        clientes={clientes}
        isOpen={Boolean(modalDetalhesVenda)}
        onClose={() => setModalDetalhesVenda(null)}
        onOpenMargemModal={(v) => {
          setModalDetalhesVenda(null);
          setModalMargemVenda(v);
        }}
        onOpenCustosModal={(v) => {
          setModalDetalhesVenda(null);
          setModalCustosVenda(v);
        }}
        isDirector={isDirector}
      />

      <ModalCalculoMargem
        venda={modalMargemVenda}
        isOpen={Boolean(modalMargemVenda)}
        onClose={() => setModalMargemVenda(null)}
      />

      <ModalEditarCustos
        venda={modalCustosVenda}
        isOpen={Boolean(modalCustosVenda)}
        onClose={() => setModalCustosVenda(null)}
        currentUserName={currentUserName}
        onSuccess={() => {
          carregarVendas(true);
        }}
      />

      <ModalEditarPedido
        venda={modalEditarVenda}
        clientes={clientes}
        isOpen={Boolean(modalEditarVenda)}
        onClose={() => setModalEditarVenda(null)}
        currentUserName={currentUserName}
        onSuccess={() => {
          carregarVendas(true);
        }}
      />

      <ModalCancelarVenda
        venda={modalCancelarVenda}
        isOpen={Boolean(modalCancelarVenda)}
        onClose={() => setModalCancelarVenda(null)}
        currentUserName={currentUserName}
        onSuccess={() => {
          carregarVendas(true);
        }}
      />

      <ModalImprimirExportar
        venda={modalImprimirVenda}
        clientes={clientes}
        isOpen={Boolean(modalImprimirVenda)}
        onClose={() => setModalImprimirVenda(null)}
      />

      {/* Modal de Confirmação de Exclusão Definitiva (Somente Éder Perez) */}
      {vendaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Excluir Venda Definitivamente
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  Ação restrita ao Diretor Éder Perez
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 space-y-2 text-xs text-rose-900">
              <p className="font-semibold">
                Tem certeza de que deseja excluir permanentemente esta venda?
              </p>
              <div className="bg-white/80 rounded-lg p-2.5 space-y-1 text-[11px] text-slate-700 font-mono">
                <div>
                  <strong className="text-slate-900">Pedido:</strong> #{extrairNumeroPuroPedido(vendaParaExcluir.numeroPedido)}
                </div>
                <div>
                  <strong className="text-slate-900">Cliente:</strong> {vendaParaExcluir.cliente}
                </div>
                <div>
                  <strong className="text-slate-900">Valor Total:</strong>{' '}
                  {(vendaParaExcluir.valorVenda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div>
                  <strong className="text-slate-900">Vendedor:</strong> {vendaParaExcluir.vendedor}
                </div>
              </div>
              <p className="text-[11px] text-rose-700">
                Esta ação excluirá o registro efetivamente do Supabase e de todos os relatórios, sumindo da listagem. Não é apenas uma inativação.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVendaParaExcluir(null)}
                disabled={isExcluindo}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={isExcluindo}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isExcluindo ? 'Excluindo do Supabase...' : 'Sim, Excluir Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
