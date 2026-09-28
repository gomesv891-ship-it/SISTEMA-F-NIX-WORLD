import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  PhoneCall,
  User,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  DollarSign,
  PieChart as PieIcon,
  Check,
  Edit2,
  Pencil,
  X,
  Trash2,
  Search,
  MessageCircle,
  FileText,
  AlertTriangle,
  History,
  Filter,
  ChevronDown,
  Package,
  Layers,
  Tag,
} from 'lucide-react';
import { ClientRecord, PriceTableTier, FormaPagamentoItem } from '../types';
import {
  PaymentSplitManager,
  isPaymentSplitComplete,
  summarizePayments,
  isFormaCartaoCredito,
} from './common/PaymentSplitManager';
import { sendUserNotification } from '../utils/notifications';
import {
  getDynamicProductCatalog,
  getOfficialCategories,
  getProductTierPrice,
  getOfficialPriceTableLabel,
  CatalogProduct,
} from '../data/productCatalog';
import { ProductSelectionModal } from './ProductSelectionModal';
import { onMetaSaleDeleted } from '../utils/followUpSalesSync';
import {
  syncSingleMetaSaleToVendas,
  removeMetaSaleFromVendas,
} from '../utils/vendasService';
import {
  getMetasParametersConfig,
  calculateCurrentMetasDates,
  saveMetasParametersConfig,
  loadMetasConfigsFromSupabase,
  MetasParametersConfig,
  MetasCalculatedDates,
  IndividualMetasMap,
  DEFAULT_INDIVIDUAL_METAS,
  getIndividualMetas,
  saveIndividualMetas,
  calculateMetaTodos,
  updateSingleUserMeta,
  normalizeUserMetaKey,
} from '../utils/configOrcamentoEMetas';
import { addOrUpdateSaleInPosVendas } from '../utils/syncPosVendas';
import { isRecordOfResponsible } from '../utils/userDataFilter';
import { saveItemToSupabase, deleteItemFromSupabase, saveWholeCollectionToSupabase } from '../utils/supabaseClient';
import { ResponsibleFilterTabs } from './ResponsibleFilterTabs';
import { MetasMarketplaceJeferson } from './metas/MetasMarketplaceJeferson';
import { isMarketplaceUser } from '../utils/auth';

export type ClientType =
  | 'Cliente Final'
  | 'Revenda'
  | 'Construtora'
  | 'Instalador'
  | 'Arquiteto'
  | 'Engenheiro';

export interface VendaProdutoItem {
  id: string;
  nome: string;
  detalhe?: string;
  categoria?: string;
  unidade?: string;
  quantidade: number;
  valorUnitario: number;
  subtotal?: number;
}

export interface VendaItem {
  id: string;
  pedido: string;
  valor: number;
  tipoCliente: ClientType;
  cliente: string;
  whatsapp?: string;
  data?: string;
  responsavel?: string;
  vendedor?: string;
  criadoPor?: string;
  registeredBy?: string;
  vendedorId?: string | null;
  desconto?: number;
  frete?: number;
  formaPagamento?: 'Pix' | 'Boleto' | 'Cartão' | string;
  formasPagamento?: FormaPagamentoItem[];
  parcelas?: string | number;
  produtos?: VendaProdutoItem[] | string;
}

/**
 * Utilitário seguro para conversão de valores em moeda BRL / numéricos
 * Trata entradas nos formatos:
 * - "R$ 6.000,00" -> 6000
 * - "6.000,00" -> 6000
 * - "6000,00" -> 6000
 * - "6000" -> 6000
 * - "6.000" -> 6000
 * - 6000 -> 6000
 */
export const parseBRLCurrency = (raw: string | number | undefined | null): number => {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const str = String(raw).trim();
  if (!str) return 0;

  // Se já for número JS válido como "6000" ou "6000.5"
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }

  // Remove caracteres exceto dígitos, ponto, vírgula e hífen
  const cleaned = str.replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;

  // Formato brasileiro com milhar e centavos: 6.000,00
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  // Apenas vírgula decimal: 6000,00 ou 60,50
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  // Apenas ponto: verificar se é separador de milhar (ex: 6.000 ou 1.200.000)
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      const normalized = cleaned.replace(/\./g, '');
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    }
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  const n = parseFloat(digitsOnly);
  return isNaN(n) ? 0 : n;
};

export interface MetasScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

// Configuração oficial de cores e ícones por Tipo de Cliente Fênix
export const CLIENT_TYPE_CONFIG: Record<
  ClientType,
  {
    label: ClientType;
    color: string;
    bgBadge: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  'Cliente Final': {
    label: 'Cliente Final',
    color: '#0052cc', // Azul
    bgBadge: 'bg-blue-50',
    textClass: 'text-[#0052cc]',
    borderClass: 'border-blue-200',
    dotClass: 'bg-[#0052cc]',
    Icon: User,
  },
  'Revenda': {
    label: 'Revenda',
    color: '#7c3aed', // Roxo
    bgBadge: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    dotClass: 'bg-purple-600',
    Icon: Store,
  },
  'Construtora': {
    label: 'Construtora',
    color: '#10b981', // Verde
    bgBadge: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-600',
    Icon: Building2,
  },
  'Instalador': {
    label: 'Instalador',
    color: '#f97316', // Laranja
    bgBadge: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
    dotClass: 'bg-orange-500',
    Icon: Wrench,
  },
  'Arquiteto': {
    label: 'Arquiteto',
    color: '#8b5cf6', // Lilás
    bgBadge: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
    dotClass: 'bg-violet-500',
    Icon: PenTool,
  },
  'Engenheiro': {
    label: 'Engenheiro',
    color: '#0284c7', // Azul claro
    bgBadge: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
    dotClass: 'bg-sky-600',
    Icon: HardHat,
  },
};

const CLIENT_TYPES_LIST: ClientType[] = [
  'Cliente Final',
  'Revenda',
  'Construtora',
  'Instalador',
  'Arquiteto',
  'Engenheiro',
];

// Helpers de formatação e contato
const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const getWhatsappLink = (phone?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
};

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) {
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  return dateStr;
};

// Helper para identificar vendas fictícias/mock de teste
const isMockSale = (item: any): boolean => {
  if (!item) return true;
  const mockIds = ['v_1', 'v_2', 'v_3', 'v_4', 'v_5', 'v_6'];
  if (mockIds.includes(item.id)) return true;
  const mockNames = [
    'roberto silva residência',
    'carvalho materiais & design',
    'construtora almeida & silva',
    'marcos vinicius instalações',
    'studio arqdesign interiores',
    'eng. renato prado projetos',
    'carlos eduardo',
    'mariana silva',
    'cliente comercial',
  ];
  const name = (item.cliente || '').toLowerCase().trim();
  return mockNames.includes(name);
};

// Helper para verificar se a venda pertence ao mês alvo (padrão: Setembro de 2026)
export const isSaleInTargetMonth = (
  dateStr?: string,
  targetMonth: number = 8, // 8 = Setembro (0-indexed)
  targetYear: number = 2026
): boolean => {
  if (!dateStr) return true; // Vendas cadastradas no fluxo ativo pertencem ao mês corrente
  const str = String(dateStr).trim();
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        return y === targetYear && m === targetMonth;
      }
    }
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m)) {
        return y === targetYear && m === targetMonth;
      }
    }
  }
  return true;
};

// Helper para verificar se a venda foi realizada hoje
export const isSaleToday = (dateStr?: string, refDate: Date = new Date()): boolean => {
  if (!dateStr) return false;
  const str = String(dateStr).trim().split('T')[0];
  const y = refDate.getFullYear();
  const m = refDate.getMonth() + 1;
  const d = refDate.getDate();

  const isoToday = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const brToday = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

  if (str === isoToday || str === brToday) return true;

  if (str.includes('-')) {
    const p = str.split('-');
    if (p.length === 3) {
      const sy = parseInt(p[0], 10);
      const sm = parseInt(p[1], 10);
      const sd = parseInt(p[2], 10);
      if (sy === y && sm === m && sd === d) return true;
    }
  }
  if (str.includes('/')) {
    const p = str.split('/');
    if (p.length === 3) {
      const sd = parseInt(p[0], 10);
      const sm = parseInt(p[1], 10);
      const sy = parseInt(p[2], 10);
      if (sy === y && sm === m && sd === d) return true;
    }
  }
  return false;
};

export interface PipelineBudgetItem {
  id: string;
  orcamentoId?: string;
  cliente: string;
  valor: number;
  status: string;
  responsavel?: string;
  vendedor?: string;
  criadoPor?: string;
  registeredBy?: string;
  consultoraName?: string;
  vendedorId?: string | null;
  responsavelId?: string | null;
}

export const isPipelineBudgetOpen = (status?: string): boolean => {
  if (!status) return true;
  const s = status.toLowerCase().trim();
  const isSold =
    s === 'vendido' ||
    s === 'fechado' ||
    s === 'concluído' ||
    s === 'concluido' ||
    s === 'aprovado' ||
    s === 'ganho';
  const isLost =
    s === 'perdido' ||
    s === 'rejeitado' ||
    s === 'recusado' ||
    s === 'desistiu' ||
    s === 'cancelado';
  return !isSold && !isLost;
};

export function loadAllPipelineBudgets(): PipelineBudgetItem[] {
  if (typeof window === 'undefined') return [];
  const items: PipelineBudgetItem[] = [];
  const seenIds = new Set<string>();

  // 1. Esteira de Follow-up (fonte primária dos cards e propostas ativas)
  try {
    const rawFup = localStorage.getItem('fenix_followup_cards_v2') || localStorage.getItem('fenix_followup_db');
    if (rawFup) {
      const parsed = JSON.parse(rawFup);
      if (Array.isArray(parsed)) {
        parsed.forEach((it: any) => {
          if (!it || !it.id) return;
          const clientName = (it.cliente || it.clientName || '').toLowerCase().trim();
          if (clientName.includes('roberto silveira')) return;

          seenIds.add(String(it.id));
          if (it.orcamentoId) seenIds.add(String(it.orcamentoId));

          items.push({
            id: String(it.id),
            orcamentoId: it.orcamentoId ? String(it.orcamentoId) : undefined,
            cliente: it.cliente || it.clientName || 'Cliente',
            valor: Number(it.valor) || 0,
            status: it.status || 'Orçamento Enviado',
            responsavel: it.responsavel || it.vendedor || it.criadoPor || it.registeredBy,
            vendedor: it.vendedor || it.responsavel,
            criadoPor: it.criadoPor || it.registeredBy,
            registeredBy: it.registeredBy || it.criadoPor,
            consultoraName: it.consultoraName || it.vendedor || it.responsavel,
            vendedorId: it.vendedorId || null,
            responsavelId: it.responsavelId || null,
          });
        });
      }
    }
  } catch {}

  // 2. Histórico de Orçamentos (captura propostas complementares emitidas)
  try {
    const rawOrcs = localStorage.getItem('fenix_orcamentos_history') || localStorage.getItem('fenix_saved_orcamentos');
    if (rawOrcs) {
      const parsed = JSON.parse(rawOrcs);
      if (Array.isArray(parsed)) {
        parsed.forEach((orc: any) => {
          if (!orc || !orc.id) return;
          const orcId = String(orc.id);
          const fupId = `fup_${orcId}`;
          if (seenIds.has(orcId) || seenIds.has(fupId)) return;

          seenIds.add(orcId);
          items.push({
            id: orcId,
            orcamentoId: orcId,
            cliente: orc.clientName || orc.clienteNome || orc.cliente || 'Cliente',
            valor: Number(orc.totalFinal) || Number(orc.totalGeral) || Number(orc.valor) || 0,
            status: orc.status || 'Orçamento Enviado',
            responsavel: orc.responsavel || orc.consultoraName || orc.vendedor || orc.registeredBy || orc.criadoPor,
            vendedor: orc.vendedor || orc.consultoraName || orc.responsavel,
            criadoPor: orc.criadoPor || orc.registeredBy,
            registeredBy: orc.registeredBy || orc.criadoPor,
            consultoraName: orc.consultoraName || orc.vendedor,
            vendedorId: orc.vendedorId || null,
            responsavelId: orc.responsavelId || null,
          });
        });
      }
    }
  } catch {}

  return items;
}

export const MetasScreen: React.FC<MetasScreenProps> = ({
  currentUserName = 'Vanessa Gomes',
  onBackToCadastro,
  onNavigateTab,
}) => {
  // Configurações de Metas (Lê as configurações salvas ou padrão)
  const [metasConfig, setMetasConfig] = useState<MetasParametersConfig>(() =>
    getMetasParametersConfig()
  );

  // Identificação de Diretor e Tab de Responsável
  const isDirector = (currentUserName || '').toLowerCase().includes('eder');
  const [responsibleTab, setResponsibleTab] = useState<string>('Todos');

  // Metas Individuais da Equipe (Éder, Vanessa, Jéssica) e Meta "Todos"
  const [individualMetas, setIndividualMetas] = useState<IndividualMetasMap>(() => getIndividualMetas());

  useEffect(() => {
    const handleMetasSync = () => {
      setIndividualMetas(getIndividualMetas());
    };
    window.addEventListener('fenix_metas_config_updated', handleMetasSync);
    window.addEventListener('fenix_metas_updated', handleMetasSync);
    window.addEventListener('storage', handleMetasSync);
    return () => {
      window.removeEventListener('fenix_metas_config_updated', handleMetasSync);
      window.removeEventListener('fenix_metas_updated', handleMetasSync);
      window.removeEventListener('storage', handleMetasSync);
    };
  }, []);

  // Mês selecionado: Dinâmico baseado na data atual
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonthName, setCurrentMonthName] = useState('Setembro 2026');

  // Meta do Mês:
  // REGRA: META TODOS = META ÉDER + META VANESSA + META JHESSICA
  // Calculada automaticamente com base nos valores individuais cadastrados.
  // Se estiver visualizando um usuário individual, exibe a meta daquele usuário.
  const metaDefinida = useMemo<number>(() => {
    if (isDirector) {
      if (responsibleTab === 'Todos') {
        return calculateMetaTodos(individualMetas);
      }
      const key = normalizeUserMetaKey(responsibleTab);
      return individualMetas[key] ?? DEFAULT_INDIVIDUAL_METAS[key as keyof IndividualMetasMap] ?? 0;
    }
    const myKey = normalizeUserMetaKey(currentUserName);
    return individualMetas[myKey] ?? DEFAULT_INDIVIDUAL_METAS[myKey as keyof IndividualMetasMap] ?? 80000;
  }, [isDirector, responsibleTab, individualMetas, currentUserName]);

  const [isEditingMeta, setIsEditingMeta] = useState<boolean>(false);
  const [metaInputValue, setMetaInputValue] = useState<string>('');
  const [editEderValue, setEditEderValue] = useState<string>('100000');
  const [editVanessaValue, setEditVanessaValue] = useState<string>('300000');
  const [editJhessicaValue, setEditJhessicaValue] = useState<string>('100000');
  const [editJefersonValue, setEditJefersonValue] = useState<string>('100000');

  // Recalcula as datas, dias úteis reais e semanas comerciais de acordo com a data e mês selecionados
  const metasDates = useMemo<MetasCalculatedDates>(() => {
    const today = new Date();
    const isSameMonthYear =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth();
    const refDate = isSameMonthYear ? today : selectedDate;
    return calculateCurrentMetasDates(metasConfig, refDate);
  }, [metasConfig, selectedDate]);

  const {
    currentDateFormatted,
    monthYearLabel,
    monthName,
    totalDaysInMonth,
    diasDecorridos,
    diasRestantes,
    totalWorkingDays,
    remainingWorkingDays,
    semanasComerciais,
    semanasTotais,
    semanaAtual,
    semanasRestantes,
    isHoliday,
    holidayName,
    isManualOverride,
  } = metasDates;

  // Sincroniza mês com label formatada
  useEffect(() => {
    if (monthYearLabel) {
      setCurrentMonthName(monthYearLabel);
    }
  }, [monthYearLabel]);

  const handlePrevMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Listener para sincronização em tempo real quando as configurações de metas forem salvas
  useEffect(() => {
    loadMetasConfigsFromSupabase().catch(() => {});
    const handleConfigSync = () => {
      const cfg = getMetasParametersConfig();
      setMetasConfig(cfg);
    };
    window.addEventListener('fenix_metas_config_updated', handleConfigSync);
    return () => {
      window.removeEventListener('fenix_metas_config_updated', handleConfigSync);
    };
  }, []);

  // Clientes cadastrados para autocomplete/sugestão
  const [dbClients, setDbClients] = useState<ClientRecord[]>(() => {
    try {
      const saved = localStorage.getItem('fenix_clients_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Vendas reais: Iniciar limpo ou carregar apenas vendas reais cadastradas pelo usuário ou vindas do Follow-up
  const [vendas, setVendas] = useState<VendaItem[]>(() => {
    try {
      const saved = localStorage.getItem('fenix_metas_sales_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const realSales = parsed.filter((item: any) => !isMockSale(item));
          return realSales.map((item: any, idx: number) => ({
            id: item.id || `v_${idx}`,
            pedido: item.pedido ? String(item.pedido).replace(/^#+/, '') : String(1040 + idx),
            valor: parseBRLCurrency(item.valor),
            frete: item.frete !== undefined && item.frete !== null ? parseBRLCurrency(item.frete) : undefined,
            desconto: item.desconto !== undefined && item.desconto !== null ? parseBRLCurrency(item.desconto) : undefined,
            produtos: item.produtos,
            formaPagamento: item.formaPagamento,
            formasPagamento: item.formasPagamento,
            parcelas: item.parcelas,
            tipoCliente: (CLIENT_TYPES_LIST.includes(item.tipoCliente)
              ? item.tipoCliente
              : 'Cliente Final') as ClientType,
            cliente: item.cliente || 'Cliente',
            whatsapp: item.whatsapp || '',
            data: item.data || new Date().toISOString().split('T')[0],
            responsavel: item.responsavel || item.vendedor || item.criadoPor || item.registeredBy || currentUserName || 'Vanessa Gomes',
            vendedor: item.vendedor || item.responsavel || currentUserName || 'Vanessa Gomes',
            criadoPor: item.criadoPor || item.registeredBy || item.responsavel || currentUserName || 'Vanessa Gomes',
            registeredBy: item.registeredBy || item.criadoPor || item.responsavel || currentUserName || 'Vanessa Gomes',
            vendedorId: item.vendedorId || null,
          }));
        }
      }
    } catch {}
    return [];
  });

  // Orçamentos e propostas da esteira comercial de Follow-up / CRM carregados dinamicamente
  const [pipelineBudgets, setPipelineBudgets] = useState<PipelineBudgetItem[]>(() =>
    loadAllPipelineBudgets()
  );

  // Sincronização em tempo real de vendas e orçamentos
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedSales = localStorage.getItem('fenix_metas_sales_db');
        if (savedSales) {
          const parsed = JSON.parse(savedSales);
          if (Array.isArray(parsed)) {
            const realSales = parsed.filter((item: any) => !isMockSale(item));
            setVendas(
              realSales.map((item: any, idx: number) => ({
                id: item.id || `v_${idx}`,
                pedido: item.pedido ? String(item.pedido).replace(/^#+/, '') : String(1040 + idx),
                valor: parseBRLCurrency(item.valor),
                frete: item.frete !== undefined && item.frete !== null ? parseBRLCurrency(item.frete) : undefined,
                desconto: item.desconto !== undefined && item.desconto !== null ? parseBRLCurrency(item.desconto) : undefined,
                produtos: item.produtos,
                formaPagamento: item.formaPagamento,
                formasPagamento: item.formasPagamento,
                parcelas: item.parcelas,
                tipoCliente: (CLIENT_TYPES_LIST.includes(item.tipoCliente)
                  ? item.tipoCliente
                  : 'Cliente Final') as ClientType,
                cliente: item.cliente || 'Cliente',
                whatsapp: item.whatsapp || '',
                data: item.data || new Date().toISOString().split('T')[0],
                responsavel: item.responsavel || item.vendedor || item.criadoPor || item.registeredBy || currentUserName || 'Vanessa Gomes',
                vendedor: item.vendedor || item.responsavel || currentUserName || 'Vanessa Gomes',
                criadoPor: item.criadoPor || item.registeredBy || item.responsavel || currentUserName || 'Vanessa Gomes',
                registeredBy: item.registeredBy || item.criadoPor || item.responsavel || currentUserName || 'Vanessa Gomes',
                vendedorId: item.vendedorId || null,
              }))
            );
          }
        }

        // Atualiza a esteira de orçamentos e propostas
        setPipelineBudgets(loadAllPipelineBudgets());

        const savedClients = localStorage.getItem('fenix_clients_db');
        if (savedClients) {
          const parsedC = JSON.parse(savedClients);
          if (Array.isArray(parsedC)) setDbClients(parsedC);
        }
      } catch {}
    };

    window.addEventListener('fenix_metas_updated', handleSync);
    window.addEventListener('fenix_followup_updated', handleSync);
    window.addEventListener('fenix_orcamentos_updated', handleSync);
    window.addEventListener('fenix_vendas_gerencial_updated', handleSync);
    window.addEventListener('fenix_vendas_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('fenix_metas_updated', handleSync);
      window.removeEventListener('fenix_followup_updated', handleSync);
      window.removeEventListener('fenix_orcamentos_updated', handleSync);
      window.removeEventListener('fenix_vendas_gerencial_updated', handleSync);
      window.removeEventListener('fenix_vendas_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentUserName]);

  // Salva no localStorage quando vendas ou meta mudarem
  useEffect(() => {
    try {
      localStorage.setItem('fenix_metas_sales_db', JSON.stringify(vendas));
    } catch {}
  }, [vendas]);

  useEffect(() => {
    try {
      localStorage.setItem('fenix_metas_target_value', metaDefinida.toString());
    } catch {}
  }, [metaDefinida]);

  // Sub-abas internas da tela de Metas ('geral' | 'historico')
  const [activeTab, setActiveTab] = useState<'geral' | 'historico'>('geral');

  // Estado do Modal de Adicionar Venda
  const [isAddVendaOpen, setIsAddVendaOpen] = useState<boolean>(false);

  // Vendedor selecionado no formulário de venda (para Éder Perez, Vanessa Gomes e Jhessica Camargo)
  const [formVendedor, setFormVendedor] = useState<string>(() => {
    if (currentUserName) return currentUserName;
    return 'Vanessa Gomes';
  });

  // Estados para seleção de produtos com mesmo funcionamento do Novo Orçamento
  const [productSubTab, setProductSubTab] = useState<'buscar' | 'categorias' | 'produtos'>('buscar');
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryFilterQuery, setCategoryFilterQuery] = useState<string>('');
  const [isProductCatalogModalOpen, setIsProductCatalogModalOpen] = useState<boolean>(false);

  // Campos do produto ativo a ser puxado/adicionado
  const [selectedProductCatalog, setSelectedProductCatalog] = useState<string>('');
  const [newCategoria, setNewCategoria] = useState<string>('');
  const [newSubtitulo, setNewSubtitulo] = useState<string>('');
  const [newQtd, setNewQtd] = useState<string>('1');
  const [newUnid, setNewUnid] = useState<string>('m²');
  const [newPrecoUnitario, setNewPrecoUnitario] = useState<string>('');

  // Catálogo e categorias oficiais
  const dynamicCatalog = useMemo(() => getDynamicProductCatalog(), [isAddVendaOpen]);
  const categoriesList = useMemo(() => getOfficialCategories(), [isAddVendaOpen]);

  // Resultados da busca com dropdown embaixo
  const searchProductResults = useMemo(() => {
    if (!searchProductQuery.trim()) return [];
    const q = searchProductQuery.toLowerCase().trim();
    return dynamicCatalog
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 15);
  }, [searchProductQuery, dynamicCatalog]);

  // Produtos da categoria selecionada
  const categoryProductsList = useMemo(() => {
    if (!selectedCategoryId) return [];
    const cat = categoriesList.find((c) => c.id === selectedCategoryId);
    const catName = cat?.name?.toLowerCase() || '';
    let filtered = dynamicCatalog.filter(
      (p) =>
        (p.categoryId && p.categoryId === selectedCategoryId) ||
        (p.category && p.category.toLowerCase() === catName)
    );
    if (categoryFilterQuery.trim()) {
      const fq = categoryFilterQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(fq));
    }
    return filtered;
  }, [selectedCategoryId, categoriesList, dynamicCatalog, categoryFilterQuery]);

  // Helper para puxar um produto do catálogo oficial para os campos
  const handleSelectAndPullProduct = (prod: CatalogProduct) => {
    const tierPrice = getProductTierPrice(prod, formTipoCliente);
    setSelectedProductCatalog(prod.name);
    setNewCategoria(prod.category || 'Geral');
    setNewUnid(prod.unit || 'un');
    setNewPrecoUnitario(
      tierPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    setNewQtd('1');
    setNewSubtitulo('');
    setProductSubTab('produtos');
  };

  // Helper para adicionar o produto ativo à lista da venda
  const handleAddProductToSale = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedProductCatalog.trim()) return;

    const qty = Math.max(0.1, parseFloat(newQtd.replace(',', '.')) || 1);
    const unitPrice = parseBRLCurrency(newPrecoUnitario);
    const subtotal = Math.round(qty * unitPrice * 100) / 100;

    const newItem: VendaProdutoItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: selectedProductCatalog.trim(),
      detalhe: newSubtitulo.trim() || undefined,
      categoria: newCategoria.trim() || undefined,
      unidade: newUnid.trim() || 'un',
      quantidade: qty,
      valorUnitario: unitPrice,
      subtotal: subtotal,
    };

    const currentClean = formProdutos.filter((p) => p.nome.trim() !== '');
    const updated = [...currentClean, newItem];
    setFormProdutos(updated);

    // Recalcula o valor total da venda
    const totalItens = updated.reduce(
      (acc, p) => acc + (p.subtotal ?? p.quantidade * p.valorUnitario),
      0
    );
    const desc = parseBRLCurrency(formDesconto);
    const frt = parseBRLCurrency(formFrete);
    const finalVal = Math.max(0, totalItens - desc + frt);
    setFormValor(finalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

    // Reset campos para o próximo
    setSelectedProductCatalog('');
    setNewSubtitulo('');
    setNewQtd('1');
    setNewPrecoUnitario('');
    setProductSubTab('buscar');
  };

  // Helper para remover produto da venda
  const handleRemoveProductFromSale = (idx: number) => {
    const clean = formProdutos.filter((p) => p.nome.trim() !== '');
    const updated = clean.filter((_, i) => i !== idx);
    setFormProdutos(
      updated.length > 0
        ? updated
        : [{ id: 'prod_1', nome: '', quantidade: 1, valorUnitario: 0 }]
    );
    if (updated.length > 0) {
      const totalItens = updated.reduce(
        (acc, p) => acc + (p.subtotal ?? p.quantidade * p.valorUnitario),
        0
      );
      const desc = parseBRLCurrency(formDesconto);
      const frt = parseBRLCurrency(formFrete);
      const finalVal = Math.max(0, totalItens - desc + frt);
      setFormValor(finalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    }
  };

  // Helper para seleção vinda do modal completo do catálogo (ProductSelectionModal)
  const handleSelectFromModal = (prod: {
    name: string;
    category: string;
    unit: string;
    price: number;
    quantity: string;
    subtitulo?: string;
  }) => {
    const qty = Math.max(0.1, parseFloat(prod.quantity.replace(',', '.')) || 1);
    const subtotal = Math.round(qty * prod.price * 100) / 100;
    const newItem: VendaProdutoItem = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: prod.name,
      detalhe: prod.subtitulo,
      categoria: prod.category,
      unidade: prod.unit,
      quantidade: qty,
      valorUnitario: prod.price,
      subtotal: subtotal,
    };
    const currentClean = formProdutos.filter((p) => p.nome.trim() !== '');
    const updated = [...currentClean, newItem];
    setFormProdutos(updated);

    const totalItens = updated.reduce(
      (acc, p) => acc + (p.subtotal ?? p.quantidade * p.valorUnitario),
      0
    );
    const desc = parseBRLCurrency(formDesconto);
    const frt = parseBRLCurrency(formFrete);
    const finalVal = Math.max(0, totalItens - desc + frt);
    setFormValor(finalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  // Helper centralizado para abertura do modal Adicionar Venda
  const handleOpenAddVenda = () => {
    setFormError('');
    setShowClientSuggestions(false);
    let initialVendedor = 'Vanessa Gomes';
    if (isDirector) {
      if (responsibleTab === 'vanessa') initialVendedor = 'Vanessa Gomes';
      else if (responsibleTab === 'jhessica') initialVendedor = 'Jhessica Camargo';
      else if (responsibleTab === 'jeferson') initialVendedor = 'Jeferson Trolesi';
      else if (responsibleTab === 'eder') initialVendedor = 'Éder Perez';
      else initialVendedor = currentUserName || 'Éder Perez';
    } else if (currentUserName) {
      initialVendedor = currentUserName;
    }
    setFormVendedor(initialVendedor);
    setProductSubTab('buscar');
    setSearchProductQuery('');
    setSelectedCategoryId(null);
    setCategoryFilterQuery('');
    setSelectedProductCatalog('');
    setNewCategoria('');
    setNewSubtitulo('');
    setNewQtd('1');
    setNewUnid('m²');
    setFormPedido('');
    setNewPrecoUnitario('');
    setFormPayments([]);
    setIsAddVendaOpen(true);
  };
  const [formPedido, setFormPedido] = useState<string>('');
  const [formCliente, setFormCliente] = useState<string>('');
  const [formWhatsapp, setFormWhatsapp] = useState<string>('');
  const [formValor, setFormValor] = useState<string>('');
  const [formTipoCliente, setFormTipoCliente] = useState<ClientType>('Cliente Final');
  const [formDesconto, setFormDesconto] = useState<string>('');
  const [formFrete, setFormFrete] = useState<string>('');
  const [formFormaPagamento, setFormFormaPagamento] = useState<'Pix' | 'Boleto' | 'Cartão'>('Pix');
  const [formParcelas, setFormParcelas] = useState<string>('1x à vista');
  const [formPayments, setFormPayments] = useState<FormaPagamentoItem[]>([]);
  const [formProdutos, setFormProdutos] = useState<VendaProdutoItem[]>([
    { id: 'prod_1', nome: '', quantidade: 1, valorUnitario: 0 },
  ]);
  const [formError, setFormError] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  // Sugestões preditivas ao digitar o cliente
  const [showClientSuggestions, setShowClientSuggestions] = useState<boolean>(false);
  const [showEditClientSuggestions, setShowEditClientSuggestions] = useState<boolean>(false);

  // Estados para o Histórico de Vendas (Busca e Filtro)
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyTipoFilter, setHistoryTipoFilter] = useState<string>('Todos');

  // Estados para Edição de Venda
  const [editingVenda, setEditingVenda] = useState<VendaItem | null>(null);
  const [editPedido, setEditPedido] = useState<string>('');
  const [editCliente, setEditCliente] = useState<string>('');
  const [editWhatsapp, setEditWhatsapp] = useState<string>('');
  const [editValor, setEditValor] = useState<string>('');
  const [editTipoCliente, setEditTipoCliente] = useState<ClientType>('Cliente Final');
  const [editDesconto, setEditDesconto] = useState<string>('');
  const [editFrete, setEditFrete] = useState<string>('');
  const [editFormaPagamento, setEditFormaPagamento] = useState<'Pix' | 'Boleto' | 'Cartão'>('Pix');
  const [editParcelas, setEditParcelas] = useState<string>('1x à vista');
  const [editPayments, setEditPayments] = useState<FormaPagamentoItem[]>([]);
  const [editProdutos, setEditProdutos] = useState<VendaProdutoItem[]>([]);
  const [editError, setEditError] = useState<string>('');

  // Estado para Remoção de Venda
  const [deletingVenda, setDeletingVenda] = useState<VendaItem | null>(null);

  // Responsible counts for Director Éder Perez no mês de setembro
  const responsibleCounts = useMemo(() => {
    if (!isDirector) return undefined;
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    const monthSales = vendas.filter((v) =>
      isSaleInTargetMonth(v.data, targetMonth, targetYear)
    );
    return {
      todos: monthSales.length,
      eder: monthSales.filter((v) => isRecordOfResponsible(v, 'Éder Perez')).length,
      vanessa: monthSales.filter((v) => isRecordOfResponsible(v, 'Vanessa Gomes')).length,
      jhessica: monthSales.filter((v) => isRecordOfResponsible(v, 'Jhessica Camargo')).length,
      jeferson: monthSales.filter((v) => isRecordOfResponsible(v, 'Jeferson Trolesi')).length,
      demais: monthSales.filter((v) => isRecordOfResponsible(v, 'demais')).length,
    };
  }, [vendas, isDirector, selectedDate]);

  // Vendas reais de setembro do usuário logado ou filtradas por responsável para o Diretor
  const userVendas = useMemo(() => {
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    const monthSales = vendas.filter((v) =>
      isSaleInTargetMonth(v.data, targetMonth, targetYear)
    );

    if (isDirector) {
      if (responsibleTab === 'Todos') return monthSales;
      return monthSales.filter((v) => isRecordOfResponsible(v, responsibleTab));
    }
    return monthSales.filter((v) => isRecordOfResponsible(v, currentUserName || ''));
  }, [vendas, isDirector, responsibleTab, currentUserName, selectedDate]);

  // Orçamentos em negociação / abertos com permissões rigorosas:
  // - Usuário comum: SOMENTE seus próprios orçamentos em negociação/abertos
  // - Éder Perez: manter a permissão atual (próprios orçamentos ou visão geral com aba "Todos")
  const userOpenBudgets = useMemo(() => {
    const openItems = pipelineBudgets.filter((b) => isPipelineBudgetOpen(b.status));

    if (isDirector) {
      if (responsibleTab === 'Todos') {
        return openItems;
      }
      return openItems.filter((b) => isRecordOfResponsible(b, responsibleTab));
    }

    // Usuário comum calcula a projeção SOMENTE com seus próprios orçamentos
    return openItems.filter((b) => isRecordOfResponsible(b, currentUserName || ''));
  }, [pipelineBudgets, isDirector, responsibleTab, currentUserName]);

  // Total em negociação (soma dos orçamentos do usuário)
  const openBudgetsTotal = useMemo(() => {
    return userOpenBudgets.reduce((sum, it) => sum + (Number(it.valor) || 0), 0);
  }, [userOpenBudgets]);

  // Propostas ativas na esteira (quantidade de orçamentos do usuário)
  const openBudgetsCount = useMemo(() => {
    return userOpenBudgets.length;
  }, [userOpenBudgets]);

  // Formatador de Moeda BRL
  const formatCurrency = (val?: number | null) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // REGRA OFICIAL FÊNIX WORLD: O frete nunca entra no cálculo da Meta.
  // A Meta considera SOMENTE o valor dos produtos.
  // O frete continua registrado normalmente na venda.
  // Exemplo: Produtos R$ 10.000 + Frete R$ 500 => Meta considera R$ 10.000.
  const getSaleMetaValue = (sale: { valor?: number | string | null; frete?: number | string | null }): number => {
    if (!sale) return 0;
    const valorTotal = typeof sale.valor === 'number' ? sale.valor : parseBRLCurrency(sale.valor);
    const frete = typeof sale.frete === 'number' ? sale.frete : parseBRLCurrency(sale.frete);
    if (frete > 0) {
      return Math.max(0, valorTotal - frete);
    }
    return valorTotal;
  };

  // Cálculos principais
  const totalVendido = useMemo(() => {
    return userVendas.reduce((sum, it) => sum + getSaleMetaValue(it), 0);
  }, [userVendas]);

  const faltaParaMeta = useMemo(() => {
    return Math.max(0, metaDefinida - totalVendido);
  }, [metaDefinida, totalVendido]);

  const percentualAtingido = useMemo(() => {
    if (metaDefinida <= 0) return 0;
    const p = (totalVendido / metaDefinida) * 100;
    return Number(p.toFixed(1));
  }, [totalVendido, metaDefinida]);

  // REGRA OFICIAL: Só notificar no sino quando os dados REAIS confirmarem que a meta foi atingida.
  // Zero notificações falsas ou testes fictícios.
  useEffect(() => {
    if (metaDefinida > 0 && totalVendido >= metaDefinida) {
      const yearMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      const userKey = currentUserName || 'Geral';
      const notifiedKey = `fenix_meta_reached_notified_${yearMonth}_${userKey}`;

      if (!localStorage.getItem(notifiedKey)) {
        localStorage.setItem(notifiedKey, 'true');

        const valorVendidoFormatado = totalVendido.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const metaFormatada = metaDefinida.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });

        sendUserNotification({
          id: `notif_meta_atingida_${yearMonth}_${userKey}`,
          category: 'Meta',
          title: `Meta Atingida! 🎉`,
          description: `Parabéns! O faturamento registrado atingiu ${valorVendidoFormatado} da meta estipulada de ${metaFormatada}.`,
          targetTab: 'Metas',
          recipientName: currentUserName || 'Todos',
          authorName: 'Sistema de Metas',
          metadata: {
            totalVendido,
            metaDefinida,
            yearMonth,
            type: 'meta_real_reached',
          },
        });
      }
    }
  }, [totalVendido, metaDefinida, selectedDate, currentUserName]);

  // Nova Lógica da Meta Diária:
  // META RESTANTE = META MENSAL − VENDAS REALIZADAS (faltaParaMeta)
  // META DIÁRIA = META RESTANTE ÷ DIAS ÚTEIS RESTANTES (Seg a Sex, sem sáb/dom/feriados)
  const metaDiariaUteis = useMemo(() => {
    if (remainingWorkingDays <= 0) return 0;
    return faltaParaMeta / remainingWorkingDays;
  }, [faltaParaMeta, remainingWorkingDays]);

  // Meta Diária Dinâmica exibida no Card de Metas de Setembro
  const metaDiariaCalculada = useMemo(() => {
    if (remainingWorkingDays > 0 && faltaParaMeta > 0) {
      return Math.round((faltaParaMeta / remainingWorkingDays) * 100) / 100;
    }
    const dias = totalWorkingDays > 0 ? totalWorkingDays : 22;
    return Math.round((metaDefinida / dias) * 100) / 100;
  }, [faltaParaMeta, remainingWorkingDays, metaDefinida, totalWorkingDays]);

  // Vendas reais realizadas hoje (dinâmicas, calculadas pelas vendas reais do usuário - produtos apenas)
  const vendidoHoje = useMemo(() => {
    return userVendas
      .filter((v) => {
        if (!v || typeof v.valor !== 'number') return false;
        return isSaleToday(v.data, new Date());
      })
      .reduce((sum, it) => sum + getSaleMetaValue(it), 0);
  }, [userVendas]);

  // Valor restante para a meta do dia
  const faltaParaMetaDia = useMemo(() => {
    return Math.max(0, metaDiariaCalculada - vendidoHoje);
  }, [metaDiariaCalculada, vendidoHoje]);

  // Percentual da meta diária atingido
  const percentualMetaDia = useMemo(() => {
    if (metaDiariaCalculada <= 0) return 0;
    return Math.min(100, Math.round((vendidoHoje / metaDiariaCalculada) * 100));
  }, [vendidoHoje, metaDiariaCalculada]);

  // Formatação do badge de data dinâmica para a Meta do Dia
  const todayBadgeFormatted = useMemo(() => {
    const now = new Date();
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const dow = daysOfWeek[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    return `${dow}, ${day} de ${month}`;
  }, []);

  // Nova Lógica da Meta Semanal:
  // META RESTANTE = META MENSAL − VENDAS REALIZADAS (faltaParaMeta)
  // META SEMANAL = META RESTANTE ÷ SEMANAS DISPONÍVEIS RESTANTES
  const metaSemanal = useMemo(() => {
    const sem = semanasRestantes > 0 ? semanasRestantes : 1;
    return faltaParaMeta / sem;
  }, [faltaParaMeta, semanasRestantes]);

  // Vendas agrupadas por Tipo de Cliente para o gráfico de Donut
  // A proporção e o centro são calculados pelo TOTAL DE VENDAS (quantidade)
  const totalVendasCount = userVendas.length;
  const vendasPorTipo = useMemo(() => {
    const totals: Record<ClientType, { count: number; total: number }> = {
      'Cliente Final': { count: 0, total: 0 },
      'Revenda': { count: 0, total: 0 },
      'Construtora': { count: 0, total: 0 },
      'Instalador': { count: 0, total: 0 },
      'Arquiteto': { count: 0, total: 0 },
      'Engenheiro': { count: 0, total: 0 },
    };

    userVendas.forEach((v) => {
      const tipo = v.tipoCliente && totals[v.tipoCliente] ? v.tipoCliente : 'Cliente Final';
      totals[tipo].total += getSaleMetaValue(v);
      totals[tipo].count += 1;
    });

    return CLIENT_TYPES_LIST.map((tipo) => {
      const data = totals[tipo];
      const percent = totalVendasCount > 0 ? (data.count / totalVendasCount) * 100 : 0;
      return {
        tipo,
        total: data.total,
        count: data.count,
        percent: Number(percent.toFixed(1)),
        config: CLIENT_TYPE_CONFIG[tipo],
      };
    });
  }, [userVendas, totalVendasCount]);

  // SVG Donut Slices calculation
  const donutSlices = useMemo(() => {
    const radius = 54;
    const circumference = 2 * Math.PI * radius; // ~339.292
    let accumulatedPercent = 0;

    return vendasPorTipo.map((item) => {
      const strokeLength = (item.percent / 100) * circumference;
      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
      accumulatedPercent += item.percent;

      return {
        ...item,
        strokeLength,
        strokeDashoffset,
        circumference,
      };
    });
  }, [vendasPorTipo]);

  // Cenários de Fechamento dos Orçamentos
  const cenarios = useMemo(() => {
    // Cenário 100% de conversão
    const pot100 = totalVendido + openBudgetsTotal;
    const pct100 = metaDefinida > 0 ? (pot100 / metaDefinida) * 100 : 0;

    // Cenário 70% de conversão
    const pot70 = totalVendido + openBudgetsTotal * 0.7;
    const pct70 = metaDefinida > 0 ? (pot70 / metaDefinida) * 100 : 0;

    // Cenário 50% de conversão
    const pot50 = totalVendido + openBudgetsTotal * 0.5;
    const pct50 = metaDefinida > 0 ? (pot50 / metaDefinida) * 100 : 0;

    // Quanto precisa ser vendido dos orçamentos para atingir exatamente 100% da meta
    const precisaDosOrcamentos = Math.max(0, metaDefinida - totalVendido);
    const taxaNecessaria =
      openBudgetsTotal > 0
        ? Math.min(100, Math.round((precisaDosOrcamentos / openBudgetsTotal) * 100))
        : 0;

    return {
      pot100,
      pct100: Number(pct100.toFixed(1)),
      pot70,
      pct70: Number(pct70.toFixed(1)),
      pot50,
      pct50: Number(pct50.toFixed(1)),
      precisaDosOrcamentos,
      taxaNecessaria,
    };
  }, [totalVendido, openBudgetsTotal, metaDefinida]);

  // Formatar entrada de valor R$
  const handleValorInputChange = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, '');
    if (!onlyDigits) {
      setFormValor('');
      return;
    }
    const num = parseFloat(onlyDigits) / 100;
    setFormValor(
      num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    );
  };

  // Filtro de sugestões preditivas para o cadastro de venda
  const clientSuggestions = useMemo(() => {
    if (!formCliente.trim()) return [];
    const q = formCliente.toLowerCase().trim();
    return dbClients
      .filter((c) => {
        const name = (c.name || (c as any).nome || '').toLowerCase();
        const doc = (c.document || (c as any).documento || '').toLowerCase();
        const phone = c.whatsapp || (c as any).telefone || '';
        return name.includes(q) || doc.includes(q) || phone.includes(q);
      })
      .slice(0, 5);
  }, [formCliente, dbClients]);

  // Ao selecionar um cliente sugerido: preenche nome, puxa whatsapp e tipo de cliente se existir
  const handleSelectClientSuggestion = (client: ClientRecord) => {
    const clientName = client.name || (client as any).nome || '';
    const phone = client.whatsapp || (client as any).telefone || '';
    setFormCliente(clientName);
    if (phone) {
      setFormWhatsapp(formatPhone(phone));
    }
    if (client.clientType && CLIENT_TYPES_LIST.includes(client.clientType as ClientType)) {
      setFormTipoCliente(client.clientType as ClientType);
    }
    setShowClientSuggestions(false);
    setFormError('');
  };

  // Filtro de sugestões para o modal de alteração de venda
  const editClientSuggestions = useMemo(() => {
    if (!editCliente.trim()) return [];
    const q = editCliente.toLowerCase().trim();
    return dbClients
      .filter((c) => {
        const name = (c.name || (c as any).nome || '').toLowerCase();
        const doc = (c.document || (c as any).documento || '').toLowerCase();
        return name.includes(q) || doc.includes(q);
      })
      .slice(0, 5);
  }, [editCliente, dbClients]);

  const handleSelectEditClientSuggestion = (client: ClientRecord) => {
    const clientName = client.name || (client as any).nome || '';
    const phone = client.whatsapp || (client as any).telefone || '';
    setEditCliente(clientName);
    if (phone) {
      setEditWhatsapp(formatPhone(phone));
    }
    if (client.clientType && CLIENT_TYPES_LIST.includes(client.clientType as ClientType)) {
      setEditTipoCliente(client.clientType as ClientType);
    }
    setShowEditClientSuggestions(false);
    setEditError('');
  };

  // Submissão do cadastro de venda (Modal / Botão Adicionar Venda)
  // Campos solicitados: Pedido sem por #, Nome do Cliente/Razão Social, Whatsapp, Valor, Tipo de Cliente
  const handleSalvarVenda = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formPedido.trim()) {
      setFormError('Informe o número do Pedido.');
      return;
    }

    if (!formCliente.trim()) {
      setFormError('Informe o Nome Completo ou Razão Social.');
      return;
    }

    // Extrai o valor de forma resiliente suportando formatos BRL, dígitos e centavos
    let valorNum = parseBRLCurrency(formValor);
    if (valorNum <= 0) {
      const cleanDigits = formValor.replace(/\D/g, '');
      valorNum = cleanDigits ? parseFloat(cleanDigits) / 100 : 0;
    }

    if (valorNum <= 0) {
      setFormError('Informe um valor de venda válido maior que zero.');
      return;
    }

    // Validação estrita de pagamento múltiplo
    if (!isPaymentSplitComplete(formPayments, valorNum)) {
      setFormError('A soma das formas de pagamento deve ser exatamente igual ao valor total da venda.');
      return;
    }

    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();

    // Pedido sem por # (limpa qualquer hashtag acidental inserida)
    const cleanPedido = formPedido.trim().replace(/^#+/, '');
    const descontoNum = parseBRLCurrency(formDesconto);
    const freteNum = parseBRLCurrency(formFrete);
    const validProdutos = formProdutos.filter((p) => p.nome.trim() !== '');
    const paymentSummary = summarizePayments(formPayments);
    const cardPayment = formPayments.find((p) => isFormaCartaoCredito(p.forma));
    const resolvedParcelas = cardPayment?.parcelas || (formFormaPagamento === 'Cartão' ? formParcelas : undefined);

    const newSale: VendaItem = {
      id: `v_${Date.now()}`,
      pedido: cleanPedido,
      cliente: formCliente.trim(),
      whatsapp: formWhatsapp.trim(),
      valor: valorNum,
      tipoCliente: formTipoCliente,
      data: `${ano}-${mes}-${dia}`,
      responsavel: formVendedor || currentUserName || 'Vanessa Gomes',
      vendedor: formVendedor || currentUserName || 'Vanessa Gomes',
      criadoPor: currentUserName || formVendedor || 'Vanessa Gomes',
      registeredBy: currentUserName || formVendedor || 'Vanessa Gomes',
      desconto: descontoNum > 0 ? descontoNum : undefined,
      frete: freteNum > 0 ? freteNum : undefined,
      formaPagamento: paymentSummary,
      formasPagamento: formPayments,
      parcelas: resolvedParcelas,
      produtos: validProdutos.length > 0 ? validProdutos : undefined,
    };

    const updatedSales = [newSale, ...vendas.filter((v) => v.id !== newSale.id)];
    setVendas(updatedSales);
    setFormValor('');
    setFormCliente('');
    setFormWhatsapp('');
    setFormPedido(String(Math.floor(1050 + Math.random() * 8900)));
    setFormTipoCliente('Cliente Final');
    setFormDesconto('');
    setFormFrete('');
    setFormFormaPagamento('Pix');
    setFormParcelas('1x à vista');
    setFormPayments([]);
    setFormProdutos([{ id: 'prod_1', nome: '', quantidade: 1, valorUnitario: 0 }]);
    setShowClientSuggestions(false);
    setIsAddVendaOpen(false);

    try {
      localStorage.setItem('fenix_metas_sales_db', JSON.stringify(updatedSales));
      window.dispatchEvent(new Event('fenix_metas_updated'));
      saveItemToSupabase('fenix_metas_sales_db', newSale, 'id', currentUserName).catch(() => {});
      syncSingleMetaSaleToVendas(newSale, currentUserName);
      addOrUpdateSaleInPosVendas({
        id: newSale.id,
        pedido: newSale.pedido,
        cliente: newSale.cliente,
        whatsapp: newSale.whatsapp,
        valor: newSale.valor,
        tipoCliente: newSale.tipoCliente,
        data: newSale.data,
        origem: 'metas',
      });
    } catch {}

    setSuccessToast(`Venda do Pedido ${cleanPedido} (${formatCurrency(valorNum)}) cadastrada com sucesso!`);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Abertura do modal de alteração de venda
  const handleOpenEdit = (item: VendaItem) => {
    setEditingVenda(item);
    setEditPedido(item.pedido.replace(/^#+/, ''));
    setEditCliente(item.cliente);
    setEditWhatsapp(item.whatsapp ? formatPhone(item.whatsapp) : '');
    setEditValor(
      item.valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    );
    setEditTipoCliente(item.tipoCliente);
    setEditDesconto(
      item.desconto
        ? item.desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : ''
    );
    setEditFrete(
      item.frete
        ? item.frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : ''
    );
    setEditFormaPagamento((item.formaPagamento as any) || 'Pix');
    setEditParcelas(item.parcelas ? String(item.parcelas) : '1x à vista');
    if (item.formasPagamento && item.formasPagamento.length > 0) {
      setEditPayments(item.formasPagamento);
    } else {
      setEditPayments([
        {
          id: `pay_edit_${Date.now()}`,
          forma: (item.formaPagamento as any) || 'Pix',
          valor: item.valor || 0,
        },
      ]);
    }
    if (Array.isArray(item.produtos) && item.produtos.length > 0) {
      setEditProdutos(item.produtos.map((p: any, idx: number) => ({
        id: p.id || `prod_${idx}`,
        nome: p.nome || '',
        quantidade: p.quantidade || 1,
        valorUnitario: p.valorUnitario || 0,
      })));
    } else {
      setEditProdutos([{ id: 'prod_1', nome: '', quantidade: 1, valorUnitario: 0 }]);
    }
    setEditError('');
    setShowEditClientSuggestions(false);
  };

  const handleEditValorChange = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, '');
    if (!onlyDigits) {
      setEditValor('');
      return;
    }
    const num = parseFloat(onlyDigits) / 100;
    setEditValor(
      num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    );
  };

  // Salvar alteração de venda
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenda) return;
    setEditError('');

    if (!editPedido.trim()) {
      setEditError('Informe o número do Pedido.');
      return;
    }

    if (!editCliente.trim()) {
      setEditError('Informe o Nome Completo ou Razão Social.');
      return;
    }

    let valorNum = parseBRLCurrency(editValor);
    if (valorNum <= 0) {
      const cleanDigits = editValor.replace(/\D/g, '');
      valorNum = cleanDigits ? parseFloat(cleanDigits) / 100 : 0;
    }
    if (valorNum <= 0) {
      setEditError('Informe um valor de venda válido maior que zero.');
      return;
    }

    if (editPayments.length > 0 && !isPaymentSplitComplete(editPayments, valorNum)) {
      setEditError('A soma das formas de pagamento deve ser exatamente igual ao valor total da venda.');
      return;
    }

    const cleanPedido = editPedido.trim().replace(/^#+/, '');
    const editDescontoNum = parseBRLCurrency(editDesconto);
    const editFreteNum = parseBRLCurrency(editFrete);
    const editValidProdutos = editProdutos.filter((p) => p.nome.trim() !== '');
    const paymentSummary = editPayments.length > 0 ? summarizePayments(editPayments) : editFormaPagamento;

    const editCardPayment = editPayments.find((p) => isFormaCartaoCredito(p.forma));
    const resolvedEditParcelas = editCardPayment?.parcelas || (editFormaPagamento === 'Cartão' ? editParcelas : undefined);

    const updated = vendas.map((v) =>
      v.id === editingVenda.id
        ? {
            ...v,
            pedido: cleanPedido,
            cliente: editCliente.trim(),
            whatsapp: editWhatsapp.trim(),
            valor: valorNum,
            tipoCliente: editTipoCliente,
            responsavel: v.responsavel || currentUserName || 'Vanessa Gomes',
            vendedor: v.vendedor || currentUserName || 'Vanessa Gomes',
            criadoPor: v.criadoPor || currentUserName || 'Vanessa Gomes',
            registeredBy: v.registeredBy || currentUserName || 'Vanessa Gomes',
            desconto: editDescontoNum > 0 ? editDescontoNum : undefined,
            frete: editFreteNum > 0 ? editFreteNum : undefined,
            formaPagamento: paymentSummary,
            formasPagamento: editPayments.length > 0 ? editPayments : v.formasPagamento,
            parcelas: resolvedEditParcelas,
            produtos: editValidProdutos.length > 0 ? editValidProdutos : undefined,
          }
        : v
    );

    setVendas(updated);
    try {
      localStorage.setItem('fenix_metas_sales_db', JSON.stringify(updated));
      window.dispatchEvent(new Event('fenix_metas_updated'));
      const updatedSale = updated.find((v) => v.id === editingVenda.id);
      if (updatedSale) {
        saveItemToSupabase('fenix_metas_sales_db', updatedSale, 'id', currentUserName).catch(() => {});
        syncSingleMetaSaleToVendas(updatedSale, currentUserName);
      }
      addOrUpdateSaleInPosVendas({
        id: editingVenda.id,
        pedido: cleanPedido,
        cliente: editCliente.trim(),
        whatsapp: editWhatsapp.trim(),
        valor: valorNum,
        tipoCliente: editTipoCliente,
        origem: 'metas',
      });
    } catch {}

    const updatedPed = editPedido.trim();
    setEditingVenda(null);
    setSuccessToast(`Pedido #${updatedPed} atualizado com sucesso!`);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Confirmar exclusão de venda da meta
  const handleConfirmDelete = () => {
    if (!deletingVenda) return;
    const removedPed = deletingVenda.pedido;
    const targetVenda = { ...deletingVenda };
    const updated = vendas.filter((v) => v.id !== deletingVenda.id);
    setVendas(updated);
    try {
      localStorage.setItem('fenix_metas_sales_db', JSON.stringify(updated));
      window.dispatchEvent(new Event('fenix_metas_updated'));
      deleteItemFromSupabase('fenix_metas_sales_db', targetVenda.id, 'id', currentUserName).catch(() => {});
      removeMetaSaleFromVendas(targetVenda.id, targetVenda.pedido, currentUserName);
    } catch {}

    // REGRA EXPLÍCITA: Se uma venda for excluída da META:
    // - Follow-up correspondente vira PERDIDO automaticamente
    // - Também é removido das Vendas do Diretor Éder
    try {
      onMetaSaleDeleted(
        {
          id: targetVenda.id,
          orcamentoId: (targetVenda as any).orcamentoId,
          followUpId: (targetVenda as any).followUpId,
          pedido: targetVenda.pedido,
          cliente: targetVenda.cliente,
        },
        currentUserName
      );
    } catch (err) {
      console.error('Erro ao sincronizar exclusão da Meta com Follow-up e Vendas do Diretor:', err);
    }

    setDeletingVenda(null);
    setSuccessToast(`Pedido #${removedPed} removido da meta. Follow-up atualizado para Perdido e removido das Vendas do Diretor.`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Vendas filtradas para o Histórico
  const filteredVendas = useMemo(() => {
    return userVendas.filter((v) => {
      const matchTipo = historyTipoFilter === 'Todos' || v.tipoCliente === historyTipoFilter;
      if (!matchTipo) return false;

      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      const matchPed = v.pedido?.toLowerCase().includes(q);
      const matchCli = v.cliente?.toLowerCase().includes(q);
      const matchZap = v.whatsapp?.toLowerCase().includes(q);
      return matchPed || matchCli || matchZap;
    });
  }, [userVendas, historySearch, historyTipoFilter]);

  // Abertura do modal de edição da meta
  const handleOpenEditMeta = () => {
    setEditEderValue((individualMetas.eder || 100000).toString());
    setEditVanessaValue((individualMetas.vanessa || 300000).toString());
    setEditJhessicaValue((individualMetas.jhessica || 100000).toString());
    setEditJefersonValue((individualMetas.jeferson || 100000).toString());
    setMetaInputValue(metaDefinida.toString());
    setIsEditingMeta(true);
  };

  // Salvar nova meta editada
  // REGRA: META TODOS = META ÉDER + META VANESSA + META JHESSICA + META JEFERSON = R$ 600.000,00
  // Calculada automaticamente com base nos valores individuais cadastrados.
  const handleSaveMeta = () => {
    if (isDirector && responsibleTab === 'Todos') {
      const vEder = parseFloat(editEderValue.replace(/[^0-9.]/g, '')) || 0;
      const vVanessa = parseFloat(editVanessaValue.replace(/[^0-9.]/g, '')) || 0;
      const vJhessica = parseFloat(editJhessicaValue.replace(/[^0-9.]/g, '')) || 0;
      const vJeferson = parseFloat(editJefersonValue.replace(/[^0-9.]/g, '')) || 0;
      const updated: IndividualMetasMap = {
        ...individualMetas,
        eder: vEder,
        vanessa: vVanessa,
        jhessica: vJhessica,
        jeferson: vJeferson,
      };
      saveIndividualMetas(updated);
      setIndividualMetas(updated);
      setSuccessToast('Metas individuais salvas com sucesso! Meta "Todos" recalculada automaticamente.');
    } else {
      const numeric = parseFloat(metaInputValue.replace(/[^0-9.]/g, ''));
      if (!isNaN(numeric) && numeric >= 0) {
        const targetUser = isDirector ? responsibleTab : currentUserName;
        const updated = updateSingleUserMeta(targetUser, numeric);
        setIndividualMetas(updated);
        setSuccessToast(`Meta de ${targetUser} salva com sucesso! Meta "Todos" recalculada automaticamente.`);
      }
    }
    setIsEditingMeta(false);
  };

  // SVG Circular Percentage Ring calculations (para o card escuro superior)
  const circleRadius = 56;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleStrokeOffset =
    circleCircumference - (Math.min(100, Math.max(0, percentualAtingido)) / 100) * circleCircumference;

  // 3. USUÁRIO MARKETPLACE:
  // Ao criar um usuário com função “Marketplace”, a aba Metas deve seguir automaticamente
  // o mesmo padrão da aba Metas do Jeferson Trolesi.
  const isMarketplaceActive =
    isMarketplaceUser(currentUserName) ||
    (currentUserName || '').toLowerCase().includes('jeferson') ||
    (isDirector && (responsibleTab || '').toLowerCase().includes('jeferson')) ||
    (isDirector && (responsibleTab || '').toLowerCase().includes('marketplace'));

  if (isMarketplaceActive) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 text-slate-800 font-sans">
        {/* Se for Diretor (Éder Perez), mantém os tabs de responsável para poder alternar */}
        {isDirector && (
          <div className="pb-1">
            <ResponsibleFilterTabs
              activeTab={responsibleTab}
              onSelectTab={setResponsibleTab}
              counts={responsibleCounts}
              includeJeferson={true}
              label="Metas e Vendas por Responsável"
            />
          </div>
        )}

        <MetasMarketplaceJeferson
          currentUserName={currentUserName}
          isDirector={isDirector}
          onNavigateTab={onNavigateTab}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 text-slate-800 font-sans">
      {/* TOAST DE SUCESSO */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B2046] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm border border-slate-700 animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* 1. CABEÇALHO “Metas”, SELETOR DE MÊS & BOTÃO ADICIONAR VENDA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Esquerda: Ícone azul Fênix + Cabeçalho "Metas" */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-[#0052cc] flex items-center justify-center flex-shrink-0 shadow-xs">
            <Target className="w-6 h-6 stroke-[2.3]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B2046] tracking-tight">
              Metas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Acompanhamento estratégico de faturamento e esteira comercial.
            </p>
          </div>
        </div>

        {/* Direita: Seletor de mês e Botão Adicionar Venda */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          {/* Seletor de mês dinâmico */}
          <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-2xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 min-w-[150px] sm:min-w-[170px] justify-center text-xs sm:text-sm font-bold text-[#0B2046]">
              <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>{currentMonthName}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão ADICIONAR VENDA */}
          <button
            type="button"
            onClick={handleOpenAddVenda}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#0052cc] to-[#0072ff] hover:from-blue-700 hover:to-blue-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
          >
            <span>Adicionar Venda</span>
          </button>
        </div>
      </div>

      {/* Visão da Diretoria: Separação por Responsável (Éder | Vanessa | Jhessica | Jeferson | Todos) */}
      {isDirector && (
        <ResponsibleFilterTabs
          activeTab={responsibleTab}
          onSelectTab={setResponsibleTab}
          counts={responsibleCounts}
          includeJeferson={true}
          label="Metas e Vendas por Responsável"
        />
      )}

      {/* SUB-ABAS DA TELA DE METAS: [Visão Geral da Meta] e [Histórico de Vendas] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'geral'
                ? 'bg-white text-[#0B2046] shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Target className={`w-4 h-4 ${activeTab === 'geral' ? 'text-[#0052cc]' : 'text-slate-400'}`} />
            <span>Visão Geral da Meta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-white text-[#0B2046] shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className={`w-4 h-4 ${activeTab === 'historico' ? 'text-[#0052cc]' : 'text-slate-400'}`} />
            <span>Histórico de Vendas</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === 'historico'
                  ? 'bg-blue-50 text-[#0052cc] border border-blue-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {userVendas.length}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Total faturado no período:</span>
          <span className="font-bold text-[#0B2046] bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/60">
            {formatCurrency(totalVendido)}
          </span>
        </div>
      </div>

      {/* ABA 1: VISÃO GERAL DA META */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* CARD DE METAS DE SETEMBRO — REPLICAÇÃO EXATA DO LAYOUT DA IMAGEM DE REFERÊNCIA */}
          <div className="relative overflow-hidden rounded-[26px] bg-[#0c021f] text-white p-6 sm:p-8 lg:p-9 shadow-[0_0_35px_rgba(147,51,234,0.4)] border-2 border-purple-600/70">
            {/* Brilhos sutis de ambientação violeta ao fundo */}
            <div className="absolute -top-24 -left-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 lg:gap-8">
              {/* SEÇÃO ESQUERDA: META DE SETEMBRO (Info + Valor + Métricas + Círculo) */}
              <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-8">
                {/* Coluna de Textos e Valores da Meta de Setembro */}
                <div className="space-y-4 flex-1 min-w-[260px]">
                  {/* Topo: Ícone Gráfico, Título e Lápis de Edição */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5850ec] via-[#7e3af2] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-purple-950/60 flex-shrink-0">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="11" width="3.5" height="10" rx="1.75" />
                        <rect x="10" y="6" width="3.5" height="15" rx="1.75" />
                        <rect x="17" y="2" width="3.5" height="19" rx="1.75" />
                        <path d="M4 8l5-5 5 4 6-6" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 1h5v5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base sm:text-lg font-black text-white tracking-wider uppercase">
                          META DE SETEMBRO
                        </h3>
                        <button
                          type="button"
                          onClick={handleOpenEditMeta}
                          className="text-purple-300/80 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
                          title="Ajustar meta mensal"
                        >
                          <Pencil className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-purple-200/80 font-medium">
                        Sua meta mensal de vendas
                      </p>
                    </div>
                  </div>

                  {/* Valor Principal da Meta Mensal */}
                  <div className="text-4xl sm:text-5xl lg:text-[52px] xl:text-[56px] font-black tracking-tight text-white leading-none pt-2 pb-1">
                    {formatCurrency(metaDefinida)}
                  </div>

                  {/* Sub-métricas: Vendido no mês | Falta para a meta */}
                  <div className="flex items-center gap-6 sm:gap-8 pt-2">
                    <div>
                      <div className="text-xl sm:text-2xl lg:text-[26px] font-black text-white tracking-tight leading-snug">
                        {formatCurrency(totalVendido)}
                      </div>
                      <div className="text-xs sm:text-sm text-purple-200/80 font-medium mt-0.5">
                        Vendido no mês
                      </div>
                    </div>

                    <div className="h-10 w-px bg-white/20 self-center" />

                    <div>
                      <div className="text-xl sm:text-2xl lg:text-[26px] font-black text-white tracking-tight leading-snug">
                        {formatCurrency(faltaParaMeta)}
                      </div>
                      <div className="text-xs sm:text-sm text-purple-200/80 font-medium mt-0.5">
                        Falta para a meta
                      </div>
                    </div>
                  </div>
                </div>

                {/* Círculo de Progresso Mensal */}
                <div className="flex items-center justify-center flex-shrink-0 self-center py-2 px-2 sm:px-4">
                  <div className="relative w-40 h-40 sm:w-44 sm:h-44 lg:w-48 lg:h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                      <defs>
                        <linearGradient id="purpleRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#7c3aed" />
                          <stop offset="40%" stopColor="#9333ea" />
                          <stop offset="80%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#ffffff" />
                        </linearGradient>
                        <filter id="purpleRingGlow" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="4.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      {/* Track circle */}
                      <circle
                        cx="70"
                        cy="70"
                        r={circleRadius}
                        className="stroke-[#221045]"
                        strokeWidth="13"
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="70"
                        cy="70"
                        r={circleRadius}
                        stroke="url(#purpleRingGrad)"
                        strokeWidth="13"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={circleStrokeOffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                        filter="url(#purpleRingGlow)"
                      />
                    </svg>

                    {/* Centro do círculo */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                      <span className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                        {percentualAtingido.toString().replace('.', ',')}%
                      </span>
                      <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-purple-200/90 mt-1.5">
                        ATINGIDO
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linha Divisória Vertical sutil entre os blocos (Desktop) */}
              <div className="hidden xl:block w-px self-stretch bg-white/10 my-2 mx-1" />

              {/* SEÇÃO DIREITA: META DO DIA (Container Escuro Elegante com Borda Suave) */}
              <div className="w-full xl:w-[440px] 2xl:w-[480px] bg-white/[0.03] backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/15 p-6 sm:p-7 flex flex-col justify-between shadow-sm flex-shrink-0">
                {/* Topo: Ícone Calendário, META DO DIA e Badge de Data */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-purple-900/40 flex-shrink-0">
                      <Calendar className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-sm sm:text-base font-black text-white tracking-wider uppercase">
                      META DO DIA
                    </span>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-full bg-white/[0.07] border border-white/20 text-xs sm:text-sm text-purple-100 font-medium flex items-center justify-center shadow-xs">
                    <span>{todayBadgeFormatted}</span>
                  </div>
                </div>

                {/* Valor da Meta Diária */}
                <div className="text-3xl sm:text-4xl lg:text-[40px] 2xl:text-[44px] font-black tracking-tight text-white leading-none my-4">
                  {formatCurrency(metaDiariaCalculada)}
                </div>

                {/* Barra de Progresso com Percentual */}
                <div className="flex items-center gap-3.5 w-full mb-5">
                  <div className="flex-1 h-4 sm:h-5 bg-white/10 rounded-full overflow-hidden p-0.5 relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#d8b4fe] shadow-[0_0_15px_rgba(168,85,247,0.85)] transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, percentualMetaDia))}%` }}
                    />
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-white flex-shrink-0">
                    {percentualMetaDia}%
                  </span>
                </div>

                {/* Sub-métricas: Vendas hoje | Valor restante */}
                <div className="flex items-center gap-6 sm:gap-8 pt-1">
                  <div>
                    <div className="text-xl sm:text-2xl lg:text-[24px] font-black text-white tracking-tight leading-snug">
                      {formatCurrency(vendidoHoje)}
                    </div>
                    <div className="text-xs sm:text-sm text-purple-200/80 font-medium mt-0.5">
                      Vendas hoje
                    </div>
                  </div>

                  <div className="h-10 w-px bg-white/20 self-center" />

                  <div>
                    <div className="text-xl sm:text-2xl lg:text-[24px] font-black text-white tracking-tight leading-snug">
                      {formatCurrency(faltaParaMetaDia)}
                    </div>
                    <div className="text-xs sm:text-sm text-purple-200/80 font-medium mt-0.5">
                      Valor restante
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* MODAL EDITAR META SE SOLICITADO */}
      {isEditingMeta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B2046]">
                  {isDirector && responsibleTab === 'Todos'
                    ? 'Metas Individuais da Equipe'
                    : `Definir Meta — ${isDirector ? responsibleTab : currentUserName}`}
                </h3>
                {isDirector && responsibleTab === 'Todos' && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    A meta &quot;Todos&quot; é a soma automática calculada das três metas individuais.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingMeta(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDirector && responsibleTab === 'Todos' ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Éder Perez (Diretor)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      value={editEderValue}
                      onChange={(e) => setEditEderValue(e.target.value)}
                      placeholder="100000"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0052cc] focus:ring-2 focus:ring-blue-900/10 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Vanessa Gomes (Consultora)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      value={editVanessaValue}
                      onChange={(e) => setEditVanessaValue(e.target.value)}
                      placeholder="300000"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0052cc] focus:ring-2 focus:ring-blue-900/10 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Jhessica Camargo (Consultora)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      value={editJhessicaValue}
                      onChange={(e) => setEditJhessicaValue(e.target.value)}
                      placeholder="100000"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0052cc] focus:ring-2 focus:ring-blue-900/10 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Jeferson Trolesi
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      value={editJefersonValue}
                      onChange={(e) => setEditJefersonValue(e.target.value)}
                      placeholder="100000"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0052cc] focus:ring-2 focus:ring-blue-900/10 font-bold"
                    />
                  </div>
                </div>

                {/* SOMA AUTOMÁTICA DA META "TODOS" */}
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">
                      Meta &quot;Todos&quot; (Soma Automática)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-800">
                      Calculada Automaticamente
                    </span>
                  </div>
                  <div className="text-xl font-black text-purple-900 mt-1">
                    {formatCurrency(
                      (parseFloat(editEderValue) || 0) +
                      (parseFloat(editVanessaValue) || 0) +
                      (parseFloat(editJhessicaValue) || 0) +
                      (parseFloat(editJefersonValue) || 0)
                    )}
                  </div>
                  <span className="text-[10px] text-purple-700 block mt-0.5">
                    Éder ({formatCurrency(parseFloat(editEderValue) || 0)}) + Vanessa ({formatCurrency(parseFloat(editVanessaValue) || 0)}) + Jhessica ({formatCurrency(parseFloat(editJhessicaValue) || 0)}) + Jeferson ({formatCurrency(parseFloat(editJefersonValue) || 0)})
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Valor da Meta Mensal (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      value={metaInputValue}
                      onChange={(e) => setMetaInputValue(e.target.value)}
                      placeholder="80000"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0052cc] focus:ring-2 focus:ring-blue-900/10 font-bold"
                    />
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  ℹ️ Ao salvar, a meta &quot;Todos&quot; da equipe será atualizada automaticamente com a nova soma das metas individuais.
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingMeta(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMeta}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0052cc] hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CARDS DE META DIÁRIA E META SEMANAL (VISUAL REFINADO: LILÁS CLARO, ROXO SUAVE, BRANCO E DETALHES DELICADOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card: Meta Diária (Ritmo Necessário) */}
        <div className="bg-white rounded-3xl border border-[#EDE9FE] hover:border-[#DDD6FE] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          {/* Brilho decorativo sutil */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#F3E8FF]/40 rounded-full blur-2xl pointer-events-none" />

          {/* Topo do Card */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] border border-[#E9D5FF] text-[#7E22CE] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]">
                Dias Úteis (Seg a Sex)
              </span>
              {isManualOverride ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Manual
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F3FF] text-[#6B21A8] border border-[#DDD6FE]">
                  Data: {currentDateFormatted}
                </span>
              )}
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="mt-4 relative z-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              META DIÁRIA (RITMO NECESSÁRIO)
            </span>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2E1065] tracking-tight block mt-1.5">
              {formatCurrency(metaDiariaUteis)}
            </span>

            {/* Retângulo Lilás Claro, Arredondado e Elegante */}
            <div className="mt-3.5 bg-gradient-to-br from-[#FAF5FF] to-[#F3EEFE] border border-[#E9D5FF] rounded-2xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <Clock className="w-4 h-4 text-[#7E22CE] flex-shrink-0" />
                <span>
                  <strong className="text-[#581C87] font-bold">
                    {remainingWorkingDays} {remainingWorkingDays === 1 ? 'dia útil restante' : 'dias úteis restantes'}
                  </strong>{' '}
                  <span className="text-slate-500">({totalWorkingDays} úteis no mês)</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11.5px] text-slate-500 pl-6">
                <span>
                  {diasDecorridos} dias decorridos • {diasRestantes} dias restantes no mês
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#7E22CE]/80 pt-1.5 border-t border-[#E9D5FF]/70 pl-6">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A855F7] flex-shrink-0" />
                <span>Sábados, domingos e feriados não são considerados dias úteis.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Meta Semanal */}
        <div className="bg-white rounded-3xl border border-[#EDE9FE] hover:border-[#DDD6FE] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          {/* Brilho decorativo sutil */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#F3E8FF]/40 rounded-full blur-2xl pointer-events-none" />

          {/* Topo do Card */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] border border-[#E9D5FF] text-[#7E22CE] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]">
              Ritmo Semanal
            </span>
          </div>

          {/* Conteúdo Principal */}
          <div className="mt-4 relative z-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              META SEMANAL
            </span>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2E1065] tracking-tight block mt-1.5">
              {formatCurrency(metaSemanal)}
            </span>

            {/* Retângulo Lilás Claro, Arredondado e Elegante */}
            <div className="mt-3.5 bg-gradient-to-br from-[#FAF5FF] to-[#F3EEFE] border border-[#E9D5FF] rounded-2xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <Calendar className="w-4 h-4 text-[#7E22CE] flex-shrink-0" />
                <span>
                  <strong className="text-[#581C87] font-bold">
                    {semanasRestantes} {semanasRestantes === 1 ? 'semana comercial restante' : 'semanas comerciais restantes'}
                  </strong>
                  {semanasTotais ? <span className="text-slate-500"> ({semanasTotais} semanas no mês)</span> : null}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11.5px] text-slate-600 pl-6">
                <span>
                  Semana atual:{' '}
                  <strong className="text-[#581C87] font-semibold">{semanaAtual}ª semana</strong> de {monthName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#7E22CE]/80 pt-1.5 border-t border-[#E9D5FF]/70 pl-6">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A855F7] flex-shrink-0" />
                <span>Calculada automaticamente pela meta restante ÷ semanas disponíveis.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DOIS CARDS DE EXATAMENTE O MESMO TAMANHO:
          - “Como atingir a meta com base nos orçamentos cadastrados”
          - “Vendas por Tipo de Cliente” */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Como atingir a meta com base nos orçamentos cadastrados */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full">
          <div className="space-y-4">
            {/* Cabeçalho do Card */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#0B2046] tracking-tight">
                  Como atingir a meta com base nos orçamentos cadastrados
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Projeção automática com base na esteira comercial em andamento.
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#0052cc] flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Target className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            {/* Resumo da Esteira */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Orçamentos em Negociação
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#0B2046] block mt-0.5">
                  {formatCurrency(openBudgetsTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                  Na Esteira
                </span>
                <span className="text-xs sm:text-sm font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-xl border border-blue-200 inline-block mt-0.5">
                  {openBudgetsCount} propostas ativas
                </span>
              </div>
            </div>

            {/* Cenários de Fechamento */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                Cenários de Fechamento
              </span>

              {/* Cenário 1: 100% */}
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-800">
                      100% de Conversão
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      +{formatCurrency(openBudgetsTotal)}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Faturamento total de {formatCurrency(cenarios.pot100)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm sm:text-base font-black text-emerald-800">
                    {cenarios.pct100}%
                  </span>
                  <span className="text-[10px] text-emerald-600 block font-semibold">
                    da meta
                  </span>
                </div>
              </div>

              {/* Cenário 2: 70% */}
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#0052cc]">
                      70% de Conversão
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      +{formatCurrency(openBudgetsTotal * 0.7)}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Faturamento total de {formatCurrency(cenarios.pot70)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm sm:text-base font-black text-[#0052cc]">
                    {cenarios.pct70}%
                  </span>
                  <span className="text-[10px] text-blue-600 block font-semibold">
                    da meta
                  </span>
                </div>
              </div>

              {/* Cenário 3: 50% */}
              <div className="p-3 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">
                      50% de Conversão
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                      +{formatCurrency(openBudgetsTotal * 0.5)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Faturamento total de {formatCurrency(cenarios.pot50)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm sm:text-base font-black text-slate-800">
                    {cenarios.pct50}%
                  </span>
                  <span className="text-[10px] text-slate-500 block font-semibold">
                    da meta
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botão Ver Follow-up dentro desta área */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigateTab?.('Follow-up')}
              className="w-full py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100/90 text-[#0052cc] border border-blue-200 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Ver Follow-up</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Vendas por Tipo de Cliente (Gráfico limpo e organizado) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full">
          <div>
            {/* Cabeçalho do Card */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#0B2046] tracking-tight">
                  Vendas por Tipo de Cliente
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribuição proporcional das vendas por perfil de cliente.
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <PieIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            {/* GRÁFICO EM FORMATO DE CÍRCULO / DONUT + LEGENDA ORGANIZADA */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 my-2 p-1">
              {/* Donut SVG com proporção adequada */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex-shrink-0 flex items-center justify-center my-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  {/* Background ring */}
                  <circle
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="15"
                  />

                  {/* Slices por tipo de cliente */}
                  {totalVendasCount > 0 &&
                    donutSlices.map((slice) => {
                      if (slice.percent <= 0) return null;
                      return (
                        <circle
                          key={slice.tipo}
                          cx="70"
                          cy="70"
                          r="54"
                          fill="transparent"
                          stroke={slice.config.color}
                          strokeWidth="15"
                          strokeDasharray={`${slice.strokeLength} ${slice.circumference}`}
                          strokeDashoffset={slice.strokeDashoffset}
                          className="transition-all duration-700 ease-out"
                        />
                      );
                    })}
                </svg>

                {/* Centro do Donut: TOTAL DE VENDAS posicionado sem sobreposição */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                    Total
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[#0B2046] leading-tight my-0.5">
                    {userVendas.length}
                  </span>
                  <span className="text-[11px] text-slate-500 font-bold leading-none">
                    {userVendas.length === 1 ? 'venda' : 'vendas'}
                  </span>
                </div>
              </div>

              {/* Legenda limpa e organizada: quantidade e porcentagem visíveis */}
              <div className="flex-1 w-full space-y-1.5 min-w-0">
                {vendasPorTipo.map((item) => {
                  const hasSales = item.count > 0;
                  return (
                    <div
                      key={item.tipo}
                      className={`flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 rounded-xl border transition-colors ${
                        hasSales
                          ? 'bg-slate-50/90 border-slate-200/80'
                          : 'bg-white/50 border-slate-100 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hasSales ? '' : 'opacity-40'}`}
                          style={{ backgroundColor: item.config.color }}
                        />
                        <span
                          className={`font-bold text-xs truncate ${
                            hasSales ? 'text-slate-800' : 'text-slate-500'
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`font-bold text-xs ${
                            hasSales ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {item.count} {item.count === 1 ? 'venda' : 'vendas'}
                        </span>
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md min-w-[48px] text-right ${
                            hasSales
                              ? 'bg-blue-50 text-[#0052cc] border border-blue-200/60'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rodapé do card: Total de vendas e faturamento */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{userVendas.length} {userVendas.length === 1 ? 'venda registrada' : 'vendas registradas'} no mês</span>
            <span className="font-bold text-[#0B2046]">{formatCurrency(totalVendido)} faturados</span>
          </div>
        </div>
      </div>

      {/* 5. NA PARTE INFERIOR:
          - “Ver Follow-up” e “Cadastrar Venda” devem ter EXATAMENTE O MESMO TAMANHO.
          - “Ver Follow-up” fica à ESQUERDA.
          - “Cadastrar Venda” fica à DIREITA.
          - Cadastrar Venda deve ser feito DIRETAMENTE NA TELA, não como botão que abre outra tela.
          - Para cadastrar venda manualmente pedir SOMENTE:
            Valor da venda
            Tipo de cliente
            Salvar Venda
          - NÃO mostrar últimas vendas. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card da ESQUERDA: “Ver Follow-up” */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-[#0052cc] flex items-center justify-center flex-shrink-0 shadow-2xs">
                <PhoneCall className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#0052cc] border border-blue-200">
                Esteira Ativa
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-[#0B2046] tracking-tight">
              Ver Follow-up Comercial
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Acesse a esteira completa para acompanhar o retorno de clientes, negociar propostas
              e fechar vendas pendentes.
            </p>

            {/* Métricas da Esteira */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Propostas em Aberto
                </span>
                <span className="text-xl font-black text-[#0B2046] block mt-1">
                  {openBudgetsCount}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Aguardando retorno ou negociação
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Volume Pendente
                </span>
                <span className="text-xl font-black text-[#0052cc] block mt-1">
                  {formatCurrency(openBudgetsTotal)}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Potencial de conversão
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigateTab?.('Follow-up')}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0052cc] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Ver Follow-up</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Card da DIREITA: “Resumo & Destaques das Vendas” */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Performance do Mês
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-[#0B2046] tracking-tight">
              Resumo Comercial da Meta
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Consolidação dos pedidos faturados e atalhos rápidos para registro de novas vendas ou consulta completa do histórico.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Vendas Realizadas
                </span>
                <span className="text-xl font-black text-[#0B2046] block mt-1">
                  {userVendas.length} {userVendas.length === 1 ? 'pedido' : 'pedidos'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Registrados na meta
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ticket Médio
                </span>
                <span className="text-xl font-black text-[#0052cc] block mt-1">
                  {formatCurrency(userVendas.length > 0 ? totalVendido / userVendas.length : 0)}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Por venda fechada
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenAddVenda}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0052cc] to-[#0072ff] hover:from-blue-700 hover:to-blue-600 text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Adicionar Venda</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#0B2046] text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-[#0052cc]" />
              <span>Ver Histórico ({userVendas.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* ABA 2: HISTÓRICO DE VENDAS DA META */}
  {activeTab === 'historico' && (
    <div id="historico-vendas" className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
      {/* Cabeçalho do Histórico */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#0052cc] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#0B2046] tracking-tight">
                Histórico de Vendas da Meta
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte todos os lançamentos que compõem a meta do mês. Você pode alterar dados ou remover registros.
              </p>
            </div>
          </div>
        </div>

        {/* Filtros, Busca e Botão Adicionar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Buscar pedido, cliente, whatsapp..."
              className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all"
            />
            {historySearch && (
              <button
                type="button"
                onClick={() => setHistorySearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={historyTipoFilter}
              onChange={(e) => setHistoryTipoFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0052cc] cursor-pointer"
            >
              <option value="Todos">Todos os tipos ({userVendas.length})</option>
              {CLIENT_TYPES_LIST.map((t) => {
                const c = userVendas.filter((v) => v.tipoCliente === t).length;
                return (
                  <option key={t} value={t}>
                    {t} ({c})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={handleOpenAddVenda}
            className="px-3.5 py-2 rounded-xl bg-[#0052cc] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Adicionar Venda</span>
          </button>
        </div>
      </div>

      {/* Resumo de Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total de Vendas
          </span>
          <span className="text-xl font-black text-[#0B2046] block mt-0.5">
            {userVendas.length} {userVendas.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Total Faturado
          </span>
          <span className="text-xl font-black text-emerald-800 block mt-0.5">
            {formatCurrency(totalVendido)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0052cc] block">
            Ticket Médio
          </span>
          <span className="text-xl font-black text-[#0B2046] block mt-0.5">
            {formatCurrency(userVendas.length > 0 ? totalVendido / userVendas.length : 0)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
            Meta Atingida
          </span>
          <span className="text-xl font-black text-purple-800 block mt-0.5">
            {percentualAtingido}%
          </span>
        </div>
      </div>

      {/* LISTA / TABELA DE VENDAS */}
      {filteredVendas.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 my-2">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhuma venda encontrada</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {historySearch || historyTipoFilter !== 'Todos'
              ? 'Tente ajustar os filtros ou o termo de busca.'
              : 'Cadastre uma nova venda clicando no botão "Adicionar Venda".'}
          </p>
        </div>
      ) : (
        <>
          {/* Tabela para Telas Médias e Grandes */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">PEDIDO</th>
                  <th className="py-3 px-3">CLIENTE / RAZÃO SOCIAL</th>
                  <th className="py-3 px-3">WHATSAPP</th>
                  <th className="py-3 px-3">TIPO DE CLIENTE</th>
                  <th className="py-3 px-3 text-right">VALOR</th>
                  <th className="py-3 px-3 text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredVendas.map((item) => {
                  const cfg = CLIENT_TYPE_CONFIG[item.tipoCliente] || CLIENT_TYPE_CONFIG['Cliente Final'];
                  const waLink = getWhatsappLink(item.whatsapp);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* PEDIDO (sem por #) */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center font-mono font-bold text-xs text-[#0B2046] bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/80">
                          {item.pedido.replace(/^#+/, '')}
                        </span>
                      </td>

                      {/* CLIENTE / RAZÃO SOCIAL */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {item.cliente}
                        </div>
                        {item.data && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {formatDateDisplay(item.data)}
                          </div>
                        )}
                      </td>

                      {/* WHATSAPP */}
                      <td className="py-3.5 px-3">
                        {item.whatsapp ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">
                              {formatPhone(item.whatsapp)}
                            </span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Conversar no WhatsApp"
                                className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors border border-emerald-200"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* TIPO DE CLIENTE */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bgBadge} ${cfg.textClass} ${cfg.borderClass}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cfg.color }}
                          />
                          {item.tipoCliente}
                        </span>
                      </td>

                      {/* VALOR */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-sm text-[#0B2046]">
                            {formatCurrency(item.valor)}
                          </span>
                          {item.frete && item.frete > 0 ? (
                            <span
                              className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5 border border-emerald-200"
                              title={`Valor considerado na Meta: ${formatCurrency(getSaleMetaValue(item))} (Produtos). Frete de ${formatCurrency(item.frete)} registrado na venda, mas não entra na Meta.`}
                            >
                              Meta: {formatCurrency(getSaleMetaValue(item))}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* AÇÕES (ALTERAR / REMOVER) */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="Alterar dados da venda"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Alterar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingVenda(item)}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="Remover venda da meta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards para Mobile */}
          <div className="block md:hidden space-y-3">
            {filteredVendas.map((item) => {
              const cfg = CLIENT_TYPE_CONFIG[item.tipoCliente] || CLIENT_TYPE_CONFIG['Cliente Final'];
              const waLink = getWhatsappLink(item.whatsapp);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#0B2046] bg-slate-200 px-2 py-0.5 rounded-lg">
                        {item.pedido.replace(/^#+/, '')}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bgBadge} ${cfg.textClass} ${cfg.borderClass}`}
                      >
                        {item.tipoCliente}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-[#0B2046] block">
                        {formatCurrency(item.valor)}
                      </span>
                      {item.frete && item.frete > 0 ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 mt-0.5 inline-block">
                          Meta: {formatCurrency(getSaleMetaValue(item))}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.cliente}</h4>
                    {item.data && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Data: {formatDateDisplay(item.data)}
                      </p>
                    )}
                  </div>

                  {item.whatsapp && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">
                        Whatsapp: <strong className="text-slate-700">{formatPhone(item.whatsapp)}</strong>
                      </span>
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 font-bold flex items-center gap-1 hover:underline text-[11px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Abrir
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="flex-1 py-2 rounded-xl border border-blue-200 bg-blue-50 text-[#0052cc] font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Alterar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingVenda(item)}
                      className="flex-1 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  )}

      {/* MODAL ADICIONAR VENDA */}
      {isAddVendaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-7 w-full max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0B2046]">Cadastrar Venda</h3>
                  <p className="text-xs text-slate-400">Lançamento de venda para a meta mensal com catálogo de produtos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddVendaOpen(false);
                  setShowClientSuggestions(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarVenda} className="space-y-4">
              {/* 1. Vendedor e Pedido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Vendedor / Responsável <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formVendedor}
                      onChange={(e) => setFormVendedor(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs pr-10 cursor-pointer"
                    >
                      <option value="Éder Perez">Éder Perez (Diretoria)</option>
                      <option value="Vanessa Gomes">Vanessa Gomes (Comercial / Vendas)</option>
                      <option value="Jhessica Camargo">Jhessica Camargo (Comercial / Vendas)</option>
                      <option value="Jeferson Trolesi">Jeferson Trolesi (Marketplace / Vendas)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Pedido <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPedido}
                    onChange={(e) => {
                      setFormPedido(e.target.value.replace(/^#+/, ''));
                      if (formError) setFormError('');
                    }}
                    placeholder="Ex: 1052"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Número do pedido (sem #)</span>
                </div>
              </div>

              {/* 2. Nome Completo / Razão Social */}
              <div className="relative">
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Nome Completo / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCliente}
                  onChange={(e) => {
                    setFormCliente(e.target.value);
                    setShowClientSuggestions(true);
                    if (formError) setFormError('');
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  placeholder="Digite o nome completo ou razão social..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs"
                />

                {/* Dropdown de sugestões de clientes */}
                {showClientSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Clientes cadastrados sugeridos:
                    </div>
                    {clientSuggestions.map((c) => {
                      const cName = c.name || (c as any).nome || '';
                      const cDoc = c.document || (c as any).documento || c.city || (c as any).cidade || '';
                      const cPhone = c.whatsapp || (c as any).telefone || '';
                      return (
                        <button
                          key={c.id || cName}
                          type="button"
                          onClick={() => handleSelectClientSuggestion(c)}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#0B2046] truncate">{cName}</div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {cDoc || 'Cliente cadastrado'}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {c.clientType && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full block mb-0.5">
                                {c.clientType}
                              </span>
                            )}
                            {cPhone && (
                              <span className="text-[10px] text-emerald-600 font-semibold block">
                                {formatPhone(cPhone)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Whatsapp e 4. Tipo de Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Whatsapp
                  </label>
                  <div className="relative">
                    <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formWhatsapp}
                      onChange={(e) => {
                        setFormWhatsapp(formatPhone(e.target.value));
                        if (formError) setFormError('');
                      }}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-medium focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Tipo de Cliente
                  </label>
                  <div className="relative">
                    <select
                      value={formTipoCliente}
                      onChange={(e) => setFormTipoCliente(e.target.value as ClientType)}
                      className="w-full appearance-none px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-bold focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs pr-10 cursor-pointer"
                    >
                      {CLIENT_TYPES_LIST.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 5. Desconto e Frete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Desconto (R$)
                  </label>
                  <input
                    type="text"
                    value={formDesconto}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      const desc = digits ? (parseFloat(digits) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
                      setFormDesconto(desc);
                      // Atualiza valor total
                      const totalItens = formProdutos.reduce((acc, p) => acc + (p.subtotal ?? p.quantidade * p.valorUnitario), 0);
                      const descNum = digits ? parseFloat(digits) / 100 : 0;
                      const frtNum = parseBRLCurrency(formFrete);
                      if (totalItens > 0) {
                        const finalVal = Math.max(0, totalItens - descNum + frtNum);
                        setFormValor(finalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                      }
                    }}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Frete (R$)
                  </label>
                  <input
                    type="text"
                    value={formFrete}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      const frt = digits ? (parseFloat(digits) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
                      setFormFrete(frt);
                      // Atualiza valor total
                      const totalItens = formProdutos.reduce((acc, p) => acc + (p.subtotal ?? p.quantidade * p.valorUnitario), 0);
                      const descNum = parseBRLCurrency(formDesconto);
                      const frtNum = digits ? parseFloat(digits) / 100 : 0;
                      if (totalItens > 0) {
                        const finalVal = Math.max(0, totalItens - descNum + frtNum);
                        setFormValor(finalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                      }
                    }}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* 6. Formas de Pagamento (Múltiplos Pagamentos com Soma Automática) */}
              <div className="pt-1">
                <PaymentSplitManager
                  totalVenda={parseBRLCurrency(formValor)}
                  payments={formPayments}
                  onChange={setFormPayments}
                />
              </div>

              {/* 7. SELEÇÃO DE PRODUTOS (MESMO FUNCIONAMENTO DO NOVO ORÇAMENTO) */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs sm:text-sm font-bold text-[#0B2046] uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-[#0052cc]" />
                        Produtos e Itens da Venda
                      </label>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052cc] border border-blue-200">
                        {getOfficialPriceTableLabel(formTipoCliente)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Puxe produtos cadastrados com tabela automática de preços.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsProductCatalogModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-[#0052cc] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#0052cc]" />
                    <span>Catálogo Geral</span>
                  </button>
                </div>

                {/* Sub-Abas de Navegação */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setProductSubTab('buscar')}
                    className={`flex-1 min-w-[130px] py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      productSubTab === 'buscar'
                        ? 'bg-white text-[#0052cc] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>1. Barra de Busca</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductSubTab('categorias')}
                    className={`flex-1 min-w-[140px] py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      productSubTab === 'categorias'
                        ? 'bg-white text-[#0052cc] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>2. Categorias</span>
                    {selectedCategoryId && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductSubTab('produtos')}
                    className={`flex-1 min-w-[140px] py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      productSubTab === 'produtos'
                        ? 'bg-white text-[#0052cc] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>3. Aba Produtos</span>
                    {selectedProductCatalog && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                        Puxado ✓
                      </span>
                    )}
                  </button>
                </div>

                {/* SUB-ABA 1: BARRA DE BUSCA COM DROPDOWN IMEDIATO */}
                {productSubTab === 'buscar' && (
                  <div className="space-y-2.5 p-3 rounded-2xl bg-blue-50/40 border border-blue-100">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchProductQuery}
                        onChange={(e) => setSearchProductQuery(e.target.value)}
                        placeholder="Digite para buscar produtos no catálogo..."
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0052cc]"
                      />
                      {searchProductQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchProductQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Sugestões rápidas de busca */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      <span className="text-slate-400 text-[10px] uppercase font-bold flex-shrink-0">
                        Atalhos:
                      </span>
                      {['Pisos Vinílicos', 'Rodapés', 'Colas', 'Autonivelantes', 'Manta', 'Santa Luzia'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setSearchProductQuery(chip)}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-[#0052cc] text-slate-600 hover:text-[#0052cc] text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Lista de resultados da busca */}
                    {searchProductResults.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 bg-white rounded-xl p-2 border border-slate-200">
                        {searchProductResults.map((prod) => {
                          const priceVal = getProductTierPrice(prod, formTipoCliente);
                          return (
                            <div
                              key={prod.id}
                              className="pt-1.5 first:pt-0 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-800 truncate">{prod.name}</div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                  <span className="font-semibold text-[#0052cc]">{prod.category}</span>
                                  <span>•</span>
                                  <span>{prod.unit}</span>
                                  <span>•</span>
                                  <span className="font-bold text-emerald-700">
                                    R$ {priceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSelectAndPullProduct(prod)}
                                className="px-2.5 py-1 rounded-lg bg-[#0052cc] hover:bg-blue-700 text-white text-[11px] font-bold flex-shrink-0 cursor-pointer shadow-2xs transition-colors"
                              >
                                Puxar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : searchProductQuery.trim() ? (
                      <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                        Nenhum produto encontrado com esse termo.
                      </div>
                    ) : (
                      <div className="p-2.5 text-center text-[11px] text-slate-500 bg-white/70 rounded-xl border border-slate-200">
                        Digite no campo acima ou clique em uma categoria para puxar o produto.
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-ABA 2: ESCOLHER CATEGORIA */}
                {productSubTab === 'categorias' && (
                  <div className="space-y-2.5 p-3 rounded-2xl bg-blue-50/40 border border-blue-100">
                    {!selectedCategoryId ? (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700">Selecione uma categoria do catálogo:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {categoriesList.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSelectedCategoryId(cat.id)}
                              className="p-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition-all cursor-pointer shadow-2xs group"
                            >
                              <div className="text-xs font-bold text-slate-800 group-hover:text-[#0052cc] truncate">
                                {cat.name}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">Ver produtos →</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryId(null)}
                            className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            ← Voltar para Categorias
                          </button>
                          <span className="text-xs font-bold text-slate-700">
                            {categoriesList.find((c) => c.id === selectedCategoryId)?.name || 'Categoria'}
                          </span>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={categoryFilterQuery}
                            onChange={(e) => setCategoryFilterQuery(e.target.value)}
                            placeholder="Filtrar nesta categoria..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0052cc]"
                          />
                        </div>

                        <div className="max-h-44 overflow-y-auto space-y-1 bg-white rounded-xl p-2 border border-slate-200 divide-y divide-slate-100">
                          {categoryProductsList.map((prod) => {
                            const priceVal = getProductTierPrice(prod, formTipoCliente);
                            return (
                              <div key={prod.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 truncate">{prod.name}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {prod.unit} • R$ {priceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAndPullProduct(prod)}
                                  className="px-2.5 py-1 rounded-lg bg-[#0052cc] hover:bg-blue-700 text-white text-[11px] font-bold flex-shrink-0 cursor-pointer shadow-2xs"
                                >
                                  Puxar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-ABA 3: ABA PRODUTOS (Preenchimento e Inclusão na Venda) */}
                {productSubTab === 'produtos' && (
                  <div className="space-y-2.5 p-3 rounded-2xl bg-blue-50/40 border border-blue-100">
                    {selectedProductCatalog ? (
                      <div className="p-2.5 rounded-xl bg-white border border-blue-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-[#0052cc] uppercase tracking-wider">
                            Produto Selecionado do Catálogo:
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {selectedProductCatalog}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProductSubTab('buscar')}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer flex-shrink-0"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
                        <span>Nenhum produto puxado ainda. Digite na busca ou escolha uma categoria.</span>
                        <button
                          type="button"
                          onClick={() => setProductSubTab('buscar')}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-700 flex-shrink-0"
                        >
                          Ir para Busca
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Produto / Descrição
                        </label>
                        <input
                          type="text"
                          value={selectedProductCatalog}
                          onChange={(e) => setSelectedProductCatalog(e.target.value)}
                          placeholder="Nome do produto"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0052cc]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Detalhe (ex: cor, caixas, lote, acabamento)
                        </label>
                        <input
                          type="text"
                          value={newSubtitulo}
                          onChange={(e) => setNewSubtitulo(e.target.value)}
                          placeholder="Ex: Cor Carvalho / 10 Caixas"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0052cc]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={newQtd}
                          onChange={(e) => setNewQtd(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-[#0052cc]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Unidade
                        </label>
                        <input
                          type="text"
                          value={newUnid}
                          onChange={(e) => setNewUnid(e.target.value)}
                          placeholder="m², cx, un"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-[#0052cc]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Preço Unitário (R$)
                        </label>
                        <input
                          type="text"
                          value={newPrecoUnitario}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            const val = digits ? parseFloat(digits) / 100 : 0;
                            setNewPrecoUnitario(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                          }}
                          placeholder="0,00"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-right text-slate-800 focus:outline-none focus:border-[#0052cc]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <div className="text-xs">
                        <span className="text-slate-500">Subtotal do item: </span>
                        <span className="font-extrabold text-[#0052cc]">
                          {(() => {
                            const q = Math.max(0, parseFloat(newQtd.replace(',', '.')) || 0);
                            const p = parseBRLCurrency(newPrecoUnitario);
                            return (q * p).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                          })()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddProductToSale}
                        disabled={!selectedProductCatalog.trim()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Adicionar Produto à Venda</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TABELA DE PRODUTOS ADICIONADOS À VENDA */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Itens Inclusos na Venda ({formProdutos.filter((p) => p.nome.trim()).length})</span>
                    {formProdutos.filter((p) => p.nome.trim()).length > 0 && (
                      <span className="text-xs font-extrabold text-slate-900">
                        Total Produtos: {formatCurrency(
                          formProdutos.reduce((acc, p) => acc + (p.subtotal ?? p.quantidade * p.valorUnitario), 0)
                        )}
                      </span>
                    )}
                  </div>

                  {formProdutos.filter((p) => p.nome.trim()).length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Nenhum produto adicionado ainda. Puxe produtos pelo catálogo acima.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50 max-h-48 overflow-y-auto">
                      {formProdutos
                        .filter((p) => p.nome.trim())
                        .map((prod, idx) => {
                          const subtotal = prod.subtotal ?? prod.quantidade * prod.valorUnitario;
                          return (
                            <div
                              key={prod.id || idx}
                              className="p-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-800 truncate">{prod.nome}</div>
                                <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                                  {prod.detalhe && (
                                    <span className="text-slate-600 font-medium">({prod.detalhe})</span>
                                  )}
                                  <span>
                                    {prod.quantidade} {prod.unidade || 'un'} × {formatCurrency(prod.valorUnitario)}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-2 flex-shrink-0">
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {formatCurrency(subtotal)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductFromSale(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                  title="Remover produto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* 8. VALOR TOTAL DA VENDA */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Valor Total da Venda <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[#0052cc] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formValor}
                    onChange={(e) => {
                      handleValorInputChange(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="R$ 0,00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-base font-black focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all shadow-2xs"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Calculado automaticamente pela soma dos produtos (- Desconto + Frete), editável se necessário.
                </span>
                {parseBRLCurrency(formFrete) > 0 && (
                  <span className="text-[11px] text-emerald-700 font-bold mt-1 block bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    ✓ Frete ({formFrete}) registrado na venda, mas não entra na Meta. Valor considerado para a Meta: {formatCurrency(Math.max(0, parseBRLCurrency(formValor) - parseBRLCurrency(formFrete)))}.
                  </span>
                )}
              </div>

              {formError && (
                <div className="text-xs text-rose-600 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddVendaOpen(false);
                    setShowClientSuggestions(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0052cc] hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Salvar Venda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATÁLOGO GERAL DE PRODUTOS */}
      <ProductSelectionModal
        isOpen={isProductCatalogModalOpen}
        onClose={() => setIsProductCatalogModalOpen(false)}
        clientType={formTipoCliente}
        priceTable={
          formTipoCliente.toLowerCase().includes('revenda') || formTipoCliente.toLowerCase().includes('instalador')
            ? 'tier1'
            : formTipoCliente.toLowerCase().includes('arquiteto') || formTipoCliente.toLowerCase().includes('engenheiro')
            ? 'tier2'
            : 'tier3'
        }
        onSelectProduct={(prod) => {
          handleSelectFromModal(prod);
          setIsProductCatalogModalOpen(false);
        }}
      />

      {/* MODAL ALTERAR VENDA */}
      {editingVenda && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center">
                  <Edit2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-black text-[#0B2046]">
                  Alterar Venda do Pedido {editingVenda.pedido.replace(/^#+/, '')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingVenda(null);
                  setShowEditClientSuggestions(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* PEDIDO (sem por #) */}
              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Pedido <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editPedido}
                  onChange={(e) => {
                    setEditPedido(e.target.value.replace(/^#+/, ''));
                    if (editError) setEditError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0052cc]"
                  placeholder="Número do pedido"
                />
              </div>

              {/* Nome do Cliente / Razão Social */}
              <div className="relative">
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Nome do Cliente / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editCliente}
                  onChange={(e) => {
                    setEditCliente(e.target.value);
                    setShowEditClientSuggestions(true);
                    if (editError) setEditError('');
                  }}
                  onFocus={() => setShowEditClientSuggestions(true)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0052cc]"
                  placeholder="Nome do cliente ou razão social"
                />

                {showEditClientSuggestions && editClientSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {editClientSuggestions.map((c) => {
                      const cName = c.name || (c as any).nome || '';
                      return (
                        <button
                          key={c.id || cName}
                          type="button"
                          onClick={() => handleSelectEditClientSuggestion(c)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="font-bold text-[#0B2046]">{cName}</span>
                          {c.clientType && (
                            <span className="text-[10px] text-slate-500">{c.clientType}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Whatsapp */}
              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Whatsapp
                </label>
                <input
                  type="text"
                  value={editWhatsapp}
                  onChange={(e) => {
                    setEditWhatsapp(formatPhone(e.target.value));
                    if (editError) setEditError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#0052cc]"
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Valor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editValor}
                  onChange={(e) => {
                    handleEditValorChange(e.target.value);
                    if (editError) setEditError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:outline-none focus:border-[#0052cc]"
                  placeholder="R$ 0,00"
                />
                {parseBRLCurrency(editFrete) > 0 && (
                  <span className="text-[11px] text-emerald-700 font-bold mt-1 block bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    ✓ Frete ({editFrete}) registrado na venda, mas não entra na Meta. Valor considerado para a Meta: {formatCurrency(Math.max(0, parseBRLCurrency(editValor) - parseBRLCurrency(editFrete)))}.
                  </span>
                )}
              </div>

              {/* Tipo de Cliente (seta selecionável) */}
              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1.5 uppercase tracking-wider">
                  Tipo de Cliente
                </label>
                <div className="relative">
                  <select
                    value={editTipoCliente}
                    onChange={(e) => setEditTipoCliente(e.target.value as ClientType)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:outline-none focus:border-[#0052cc] pr-10 cursor-pointer"
                  >
                    {CLIENT_TYPES_LIST.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Desconto e Frete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Desconto (R$)
                  </label>
                  <input
                    type="text"
                    value={editDesconto}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setEditDesconto(digits ? (parseFloat(digits) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
                    }}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0052cc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Frete (R$)
                  </label>
                  <input
                    type="text"
                    value={editFrete}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setEditFrete(digits ? (parseFloat(digits) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
                    }}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0052cc]"
                  />
                </div>
              </div>

              {/* Formas de Pagamento (Múltiplos Pagamentos com Soma Automática) */}
              <div className="pt-1">
                <PaymentSplitManager
                  totalVenda={parseBRLCurrency(editValor)}
                  payments={editPayments}
                  onChange={setEditPayments}
                />
              </div>

              {/* Produtos e Valores Unitários */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#0B2046] uppercase tracking-wider">
                    Produtos e Itens da Venda
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditProdutos((prev) => [
                        ...prev,
                        { id: `prod_${Date.now()}_${Math.random()}`, nome: '', quantidade: 1, valorUnitario: 0 },
                      ])
                    }
                    className="text-xs font-bold text-[#0052cc] hover:text-blue-700 cursor-pointer"
                  >
                    Adicionar Produto
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                  {editProdutos.map((prod, idx) => (
                    <div key={prod.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={prod.nome}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditProdutos((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, nome: val } : p))
                          );
                        }}
                        placeholder="Nome do produto"
                        className="flex-1 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0052cc]"
                      />
                      <input
                        type="number"
                        min="1"
                        value={prod.quantidade}
                        onChange={(e) => {
                          const qty = Math.max(1, parseInt(e.target.value) || 1);
                          setEditProdutos((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, quantidade: qty } : p))
                          );
                        }}
                        placeholder="Qtd"
                        title="Quantidade"
                        className="w-16 px-2 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-center focus:outline-none focus:border-[#0052cc]"
                      />
                      <input
                        type="text"
                        value={prod.valorUnitario ? prod.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const unit = digits ? parseFloat(digits) / 100 : 0;
                          setEditProdutos((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, valorUnitario: unit } : p))
                          );
                        }}
                        placeholder="Vlr Unit."
                        title="Valor Unitário"
                        className="w-24 px-2 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-right focus:outline-none focus:border-[#0052cc]"
                      />
                      {editProdutos.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditProdutos((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {editError && (
                <div className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingVenda(null);
                    setShowEditClientSuggestions(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0052cc] hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingVenda && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-[#0B2046]">Remover Venda da Meta?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tem certeza que deseja remover o pedido <strong>{deletingVenda.pedido.replace(/^#+/, '')}</strong> de{' '}
                <strong>{deletingVenda.cliente}</strong> no valor de{' '}
                <strong className="text-rose-600">{formatCurrency(deletingVenda.valor)}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                O valor será subtraído da meta de faturamento imediatamente.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVenda(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, remover</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
