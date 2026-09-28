import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  FileText,
  User,
  ArrowLeft,
  Save,
  CheckCircle2,
  Phone,
  Tag,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Truck,
  Percent,
  DollarSign,
  Download,
  Printer,
  Share2,
  Calculator,
  RefreshCw,
  Search,
  Layers,
  Package,
  Check,
  ChevronRight,
  ArrowRight,
  Sparkles,
  X,
  Filter,
  Edit3,
  Loader2,
  RotateCcw,
  ChevronDown,
  Copy,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ClientRecord, ClientType, SavedOrcamento, OrcamentoStatus, PriceTableTier } from '../types';
import { addClientActivity } from '../utils/activities';
import {
  getOrcamentoMessageTemplate,
  getWhatsAppMessageTemplate,
  formatOrcamentoMessage,
} from '../utils/configOrcamentoEMetas';
import {
  getProductDetailsFromCatalog,
  getDynamicProductCatalog,
  getOfficialCategories,
  getProductTierPrice,
  normalizePriceTier,
  getPriceTierFromClientType,
  getOfficialPriceTableLabel,
  CatalogProduct,
} from '../data/productCatalog';
import { ProductSelectionModal } from './ProductSelectionModal';
import { ModalCadastrarNovoProdutoOrcamento } from './ModalCadastrarNovoProdutoOrcamento';
import { EspelhoOrcamento, EspelhoItem } from './EspelhoOrcamento';
import { filterClientsForUser, isClientOwnedByUser, getSellerIdForUser } from '../utils/userDataFilter';
import { saveItemToSupabase } from '../utils/supabaseClient';
import { getOrcamentoExportFileName } from '../utils/orcamentoFileName';
import {
  getUserShortcuts,
  recordProductUsage,
  UserCategoryShortcut,
} from '../utils/orcamentoShortcuts';

interface OrcamentoScreenProps {
  client: ClientRecord | null;
  onBackToCadastro?: () => void;
  onBackToList?: () => void;
  currentUserName?: string;
  onSelectClient?: (client: ClientRecord | null) => void;
  initialOrcamento?: SavedOrcamento | null;
  onSaveSuccess?: (saved: SavedOrcamento) => void;
  onStatusChangeInProgress?: (inProgress: boolean) => void;
}

// Helpers seguros para conversão e formatação monetária (prevenindo TypeErrors)
const formatPriceToBrl = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0,00';
  if (typeof val === 'number') {
    return (isNaN(val) ? 0 : val).toFixed(2).replace('.', ',');
  }
  if (typeof val === 'string') {
    const clean = val.replace('R$', '').trim();
    if (clean.includes(',')) {
      const num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
      return (isNaN(num) ? 0 : num).toFixed(2).replace('.', ',');
    }
    const num = parseFloat(clean);
    return (isNaN(num) ? 0 : num).toFixed(2).replace('.', ',');
  }
  return '0,00';
};

const parsePriceToNumber = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  if (typeof val === 'string') {
    const clean = val.replace('R$', '').trim();
    if (clean.includes(',')) {
      const num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const OrcamentoScreen: React.FC<OrcamentoScreenProps> = ({
  client,
  onBackToCadastro,
  onBackToList,
  currentUserName = 'Vanessa Gomes',
  onSelectClient,
  initialOrcamento,
  onSaveSuccess,
  onStatusChangeInProgress,
}) => {
  const ACTIVE_DRAFT_KEY = `fenix_orcamento_in_progress_draft_${currentUserName || 'default'}`;

  // Recupera o rascunho de orçamento em preenchimento de forma síncrona para evitar qualquer perda ao alternar abas
  const initialDraft = useMemo(() => {
    if (initialOrcamento) return null;
    try {
      const userKey = `fenix_orcamento_in_progress_draft_${currentUserName || 'default'}`;
      const raw = localStorage.getItem(userKey) || localStorage.getItem('fenix_orcamento_in_progress_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Se o client prop foi fornecido e o rascunho salvo for de outro cliente, descarta o rascunho anterior
          if (client?.id && parsed.selectedClientId && parsed.selectedClientId !== client.id) {
            try {
              localStorage.removeItem(userKey);
              localStorage.removeItem('fenix_orcamento_in_progress_draft');
            } catch {}
            return null;
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  }, [initialOrcamento, currentUserName, client]);

  // =========================================================
  // 1. DADOS DO CLIENTE
  // =========================================================
  const [clientsList, setClientsList] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return initialOrcamento?.clientId || client?.id || initialDraft?.selectedClientId || '';
  });

  const [clientSearchQuery, setClientSearchQuery] = useState<string>(() => {
    return initialOrcamento?.clientName || client?.name || initialDraft?.clientSearchQuery || '';
  });
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load clients from localStorage (Mostrar SOMENTE clientes cadastrados pelo usuário logado)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fenix_clients_db');
      if (stored) {
        const parsed: ClientRecord[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userClients = parsed.filter((c) => {
            if (!currentUserName) return true;
            if (currentUserName.toLowerCase().includes('eder')) return true;
            return isClientOwnedByUser(c, currentUserName);
          });
          setClientsList(userClients);

          // Prioriza o cliente explicitamente passado
          if (client?.id && userClients.some((c) => c.id === client.id)) {
            setSelectedClientId(client.id);
            setClientSearchQuery(client.name || '');
            return;
          }

          setSelectedClientId((prev) => {
            if (prev && userClients.some((c) => c.id === prev)) return prev;
            if (initialDraft?.selectedClientId && userClients.some((c) => c.id === initialDraft.selectedClientId)) {
              return initialDraft.selectedClientId;
            }
            // Não selecionar nenhum cliente automaticamente se for novo orçamento sem vínculo
            return '';
          });
          return;
        }
      }
      setClientsList([]);
      setSelectedClientId((prev) => prev || '');
    } catch {
      setClientsList([]);
      setSelectedClientId((prev) => prev || '');
    }
  }, [client, currentUserName, initialDraft]);

  // Current Active Client
  const currentClient = useMemo(() => {
    if (selectedClientId) {
      const found = clientsList.find((c) => c.id === selectedClientId);
      if (found) return found;
    }
    return client || null;
  }, [selectedClientId, clientsList, client]);

  // Atualiza campo de busca quando o cliente corrente mudar
  useEffect(() => {
    if (currentClient?.name && !clientSearchQuery) {
      setClientSearchQuery(currentClient.name);
    }
  }, [currentClient]);

  // Se o prop client mudar externamente (ex: clicou Novo Orçamento no card do cliente B)
  useEffect(() => {
    if (client?.id) {
      if (selectedClientId && selectedClientId !== client.id && !initialOrcamento) {
        setItems([]);
        setNomeOrcamento('');
        setObservacoes('');
        setObservacoesRodape('');
        setDescontoInput('0,00');
        setDescontoTexto('DESCONTO ESPECIAL APLICADO:');
        setHasDescontoEnabled(false);
        setHasFreteEnabled(false);
        setFreteValorInput('0,00');
        try {
          localStorage.removeItem(ACTIVE_DRAFT_KEY);
          localStorage.removeItem('fenix_orcamento_in_progress_draft');
        } catch {}
      }
      setSelectedClientId(client.id);
      setClientSearchQuery(client.name || '');
      const newType = client.clientType || 'Cliente Final';
      setCustomClientType(newType);
      const resolved = getPriceTierFromClientType(newType);
      setPriceTable(resolved);
    } else if (!client && !initialOrcamento && !initialDraft) {
      // Quando não há cliente vinculado nem rascunho, inicia completamente vazio
      setSelectedClientId('');
      setClientSearchQuery('');
    }
  }, [client]);

  const filteredClientsForSearch = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList;
    const q = clientSearchQuery.toLowerCase().trim();
    return clientsList.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || c.whatsapp || '').toLowerCase().includes(q);
      const typeMatch = (c.clientType || '').toLowerCase().includes(q);
      return nameMatch || phoneMatch || typeMatch;
    });
  }, [clientsList, clientSearchQuery]);

  const [customClientType, setCustomClientType] = useState<string>(() => {
    return initialDraft?.customClientType || '';
  });
  const activeClientType = customClientType || currentClient?.clientType || 'Instalador';

  const clientName = currentClient?.name || (clientSearchQuery.trim() ? clientSearchQuery.trim() : '');
  const clientType = activeClientType;
  const clientContact = currentClient?.whatsapp || currentClient?.phone || '';

  const handleSelectClientRecord = (c: ClientRecord) => {
    if (c.id !== selectedClientId) {
      // Ao selecionar o Cliente B e clicar em "Novo Orçamento", iniciar exclusivamente com os dados do Cliente B
      if (!initialOrcamento) {
        setItems([]);
        setNomeOrcamento('');
        setObservacoes('');
        setObservacoesRodape('');
        setDescontoInput('0,00');
        setDescontoTexto('DESCONTO ESPECIAL APLICADO:');
        setHasDescontoEnabled(false);
        setHasFreteEnabled(false);
        setFreteValorInput('0,00');
        try {
          localStorage.removeItem(ACTIVE_DRAFT_KEY);
          localStorage.removeItem('fenix_orcamento_in_progress_draft');
        } catch {}
      }
    }
    setSelectedClientId(c.id);
    setClientSearchQuery(c.name);
    setIsClientDropdownOpen(false);
    const newType = c.clientType || 'Cliente Final';
    setCustomClientType(newType);
    const resolved = getPriceTierFromClientType(newType);
    setPriceTable(resolved);
    if (selectedProductCatalog) {
      const details = getProductDetailsFromCatalog(selectedProductCatalog, resolved);
      setNewPrecoUnitario(formatPriceToBrl(details.price));
      setNewCategoria(details.category || 'Geral');
      setNewUnid(details.unit || 'unidades');
    }
    if (onSelectClient) {
      onSelectClient(c);
    }
  };

  const handleClearClientSelection = () => {
    setSelectedClientId('');
    setClientSearchQuery('');
    if (onSelectClient) {
      onSelectClient(null);
    }
  };

  const handleSelectClientChange = (id: string) => {
    const found = clientsList.find((c) => c.id === id);
    if (found) {
      handleSelectClientRecord(found);
    } else {
      setSelectedClientId(id);
    }
  };

  // =========================================================
  // 2. INFORMAÇÕES DO ORÇAMENTO
  // =========================================================
  const consultoraName = currentUserName || 'Vanessa Gomes';
  const [observacoes, setObservacoes] = useState<string>(() => {
    return initialOrcamento?.observacoes || initialDraft?.observacoes || '';
  });
  const [observacoesRodape, setObservacoesRodape] = useState<string>(() => {
    return initialOrcamento?.observacoesRodape || initialDraft?.observacoesRodape || '';
  });
  const [nomeOrcamento, setNomeOrcamento] = useState<string>(() => {
    return initialOrcamento?.nomeOrcamento || initialDraft?.nomeOrcamento || '';
  });

  // Estado para edição de item já adicionado
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Auto-filled current date DD/MM/YYYY
  const dataOrcamento = useMemo(() => {
    if (initialOrcamento?.dataOrcamento) {
      return initialOrcamento.dataOrcamento;
    }
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }, [initialOrcamento]);

  // =========================================================
  // 3 & 4. ADICIONAR PRODUTOS E ITENS DO ORÇAMENTO
  // =========================================================
  // Initial items - starts from draft if available or clean
  const [items, setItems] = useState<EspelhoItem[]>(() => {
    if (initialOrcamento?.items && initialOrcamento.items.length > 0) {
      return initialOrcamento.items;
    }
    if (initialDraft?.items && Array.isArray(initialDraft.items) && initialDraft.items.length > 0) {
      return initialDraft.items;
    }
    return [];
  });

  // Check if draft exists in localStorage from CalculadoraScreen
  const [hasDraftFromCalculator, setHasDraftFromCalculator] = useState(false);

  // Helper para garantir que textos de calculadora nunca contenham a frase proibida
  const cleanCalcText = (text?: string): string => {
    if (!text) return '';
    return text
      .replace(/Calculado via Calculadora[^\n]*/gi, '')
      .replace(/Calculado via calculadora[^\n]*/gi, '')
      .replace(/Materiais calculados pela Calculadora[^\n]*/gi, '')
      .replace(/Calculado via[^\n]*/gi, '')
      .trim();
  };

  useEffect(() => {
    // Se for um novo orçamento e houver rascunho vindo da calculadora, importa automaticamente
    try {
      const raw = localStorage.getItem('fenix_orcamento_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          if (!initialOrcamento) {
            // Aplicar cliente se presente
            if (parsed.clientId) {
              setSelectedClientId(parsed.clientId);
            }
            const targetType = parsed.clientType || 'Cliente Final';
            setCustomClientType(targetType);
            const resolvedTier = getPriceTierFromClientType(targetType);
            setPriceTable(resolvedTier);

            // Converter itens
            const convertedItems: EspelhoItem[] = parsed.items.map(
              (
                item: {
                  product: string;
                  quantity: string;
                  qtdDetalhe?: string;
                  unit?: string;
                  precoUnitario?: number;
                  subtitulo?: string;
                  observacao?: string;
                },
                idx: number
              ) => {
                const details = getProductDetailsFromCatalog(item.product, resolvedTier);
                const numQtd =
                  parseFloat(
                    String(item.quantity).replace(/\./g, '').replace(',', '.')
                  ) || 1;
                const preco =
                  typeof item.precoUnitario === 'number' && item.precoUnitario > 0
                    ? item.precoUnitario
                    : parsePriceToNumber(details.price);
                const itemTotal = Math.round(numQtd * preco * 100) / 100;

                const cleanSub = cleanCalcText(item.subtitulo) || cleanCalcText(item.observacao) || details.defaultSubtitle || '';

                return {
                  id: `calc_item_${Date.now()}_${idx}`,
                  qtd: String(item.quantity),
                  qtdDetalhe: item.qtdDetalhe,
                  descricao: item.product,
                  subtitulo: cleanSub,
                  unidade: item.unit || details.unit || 'unidades',
                  precoUnitario: preco,
                  total: itemTotal,
                };
              }
            );

            setItems(convertedItems);
            const cleanObs = cleanCalcText(parsed.observacoes);
            if (cleanObs) {
              setObservacoes((prev) => (prev ? `${prev}\n${cleanObs}` : cleanObs));
            }
            if (parsed.category) {
              setNomeOrcamento((prev) => prev || `Orçamento - ${parsed.category}`);
            }
            showToast('Itens da Calculadora importados automaticamente para o orçamento!');
            localStorage.removeItem('fenix_orcamento_draft');
            setHasDraftFromCalculator(false);
          } else {
            setHasDraftFromCalculator(true);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [initialOrcamento]);

  // Tabela de Preço Ativa baseada na REGRA OFICIAL FÊNIX WORLD:
  // - Cliente Final → Preço Cliente Final
  // - Engenheiro → Preço Cliente Final
  // - Arquiteto → Preço Cliente Final
  // - Revenda → Preço Revenda
  // - Instalador → Preço Revenda
  // - Construtora → Preço Construtora
  const resolvePriceTier = (type?: string): PriceTableTier => {
    return getPriceTierFromClientType(type);
  };

  const [priceTable, setPriceTable] = useState<PriceTableTier>(() => {
    if (initialDraft?.priceTable) return initialDraft.priceTable;
    return resolvePriceTier(client?.clientType || 'Instalador');
  });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Dynamic catalog directly from official PRODUTOS database
  const dynamicCatalog = useMemo(() => getDynamicProductCatalog(), [isProductModalOpen]);

  // Form states for adding new product
  const [selectedProductCatalog, setSelectedProductCatalog] = useState<string>(
    dynamicCatalog[0]?.name || ''
  );
  const [newCategoria, setNewCategoria] = useState<string>(
    dynamicCatalog[0]?.category || 'Geral'
  );
  const [newQtd, setNewQtd] = useState<string>('1');
  const [newUnid, setNewUnid] = useState<string>(dynamicCatalog[0]?.unit || 'unidades');
  const [newPrecoUnitario, setNewPrecoUnitario] = useState<string>(() => {
    if (dynamicCatalog[0]) {
      const details = getProductDetailsFromCatalog(dynamicCatalog[0].name, priceTable);
      return formatPriceToBrl(details.price);
    }
    return '0,00';
  });
  const [newSubtitulo, setNewSubtitulo] = useState<string>('');

  // Sub-abas do fluxo de seleção de produtos solicitado:
  // 'buscar' = Barra de busca com lista/dropdown de resultados embaixo
  // 'categorias' = Escolher Categoria (ex: Piso -> mostra só os pisos cadastrados -> puxar)
  // 'produtos' = Aba Produtos (produto puxado, campo Detalhe, Quantidade, Unidade auto, Preço Unitário editável)
  const [productSubTab, setProductSubTab] = useState<'buscar' | 'categorias' | 'produtos'>('buscar');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryFilterQuery, setCategoryFilterQuery] = useState('');

  // Categorias oficiais da base
  const categoriesList = useMemo(() => getOfficialCategories(), [isProductModalOpen]);

  // Resultados da busca com dropdown embaixo
  const searchResults = useMemo(() => {
    if (!searchProductQuery.trim()) return [];
    const q = searchProductQuery.toLowerCase().trim();
    return dynamicCatalog
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const catMatch = p.category.toLowerCase().includes(q);
        return nameMatch || catMatch;
      })
      .slice(0, 15);
  }, [searchProductQuery, dynamicCatalog]);

  // Modal para Cadastrar Novo Produto
  const [isCadastrarProdutoModalOpen, setIsCadastrarProdutoModalOpen] = useState(false);
  const [cadastrarInitialName, setCadastrarInitialName] = useState('');
  const [shortcutsRefreshCounter, setShortcutsRefreshCounter] = useState(0);

  // Atalhos reais e dinâmicos específicos do usuário conectado (somente produtos/categorias cadastrados)
  const userShortcuts = useMemo(() => {
    return getUserShortcuts(currentUserName);
  }, [currentUserName, shortcutsRefreshCounter, dynamicCatalog]);

  // Drafts para edição direta do preço unitário na tabela do orçamento
  const [itemPrecoDrafts, setItemPrecoDrafts] = useState<Record<string, string>>({});

  // Objeto da categoria ativa
  const activeCategoryObj = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categoriesList.find((c) => c.id === selectedCategoryId) || null;
  }, [selectedCategoryId, categoriesList]);

  // Produtos filtrados apenas da categoria escolhida (ex: Pisos)
  const categoryProducts = useMemo(() => {
    if (!selectedCategoryId) return [];
    let list = dynamicCatalog.filter((p) => {
      return (
        p.categoryId === selectedCategoryId ||
        p.category.toLowerCase() === (activeCategoryObj?.name || '').toLowerCase()
      );
    });
    if (categoryFilterQuery.trim()) {
      const q = categoryFilterQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [selectedCategoryId, activeCategoryObj, dynamicCatalog, categoryFilterQuery]);

  // Cálculo em tempo real do item para a Aba Produtos
  const previewItemTotal = useMemo(() => {
    const numQtd = parseFloat(newQtd.replace(/\./g, '').replace(',', '.')) || 0;
    const numPreco = parseFloat(newPrecoUnitario.replace(/\./g, '').replace(',', '.')) || 0;
    return Math.round(numQtd * numPreco * 100) / 100;
  }, [newQtd, newPrecoUnitario]);

  // Puxar produto selecionado para a aba Produtos
  const handleSelectAndPullProduct = (prod: CatalogProduct) => {
    setSelectedProductCatalog(prod.name);
    setNewCategoria(prod.category || 'Geral');
    setNewUnid(prod.unit || 'unidades');
    const price = getProductTierPrice(prod, priceTable);
    setNewPrecoUnitario(formatPriceToBrl(price));
    if (!newQtd || newQtd === '0') {
      setNewQtd('1');
    }
    setNewSubtitulo(prod.defaultSubtitle || '');
    setSearchProductQuery('');
    // Registra o uso do produto nos atalhos do usuário
    recordProductUsage(currentUserName, { id: prod.id, name: prod.name, category: prod.category });
    setShortcutsRefreshCounter((c) => c + 1);
    // Manda imediatamente para a aba produtos para preencher as demais informações!
    setProductSubTab('produtos');
    showToast(`"${prod.name}" puxado! Preencha o detalhe e a quantidade.`);
  };

  // Atualizar tabela automaticamente se o cliente ativo mudar
  useEffect(() => {
    if (currentClient?.clientType) {
      setCustomClientType(currentClient.clientType);
      const resolved = getPriceTierFromClientType(currentClient.clientType);
      setPriceTable(resolved);
      if (selectedProductCatalog) {
        const details = getProductDetailsFromCatalog(selectedProductCatalog, resolved);
        setNewPrecoUnitario(formatPriceToBrl(details.price));
        setNewCategoria(details.category || 'Geral');
        setNewUnid(details.unit || 'unidades');
      }
    }
  }, [currentClient?.id, currentClient?.clientType]);

  // Alteração do Tipo de Cliente: atualiza automaticamente a tabela de preços e os preços disponíveis
  const handleClientTypeChange = (newType: string) => {
    setCustomClientType(newType);
    const newTier = getPriceTierFromClientType(newType);
    setPriceTable(newTier);

    // Atualiza imediatamente o preço unitário do produto em foco no formulário
    if (selectedProductCatalog) {
      const details = getProductDetailsFromCatalog(selectedProductCatalog, newTier);
      setNewPrecoUnitario(formatPriceToBrl(details.price));
      setNewCategoria(details.category || 'Geral');
      setNewUnid(details.unit || 'unidades');
    }

    // Atualiza automaticamente os preços dos itens já adicionados ao orçamento
    setItems((prevItems) => {
      if (prevItems.length === 0) return prevItems;
      return prevItems.map((item) => {
        const details = getProductDetailsFromCatalog(item.descricao, newTier);
        const numQtd = parseFloat(item.qtd.replace(/\./g, '').replace(',', '.')) || 1;
        const newUnitPrice = parsePriceToNumber(details.price);
        const newTotal = Math.round(numQtd * newUnitPrice * 100) / 100;
        return {
          ...item,
          precoUnitario: newUnitPrice,
          total: newTotal,
        };
      });
    });

    // Se o cliente estiver cadastrado, persiste a alteração de tipo no cadastro
    if (selectedClientId) {
      try {
        const stored = localStorage.getItem('fenix_clients_data');
        if (stored) {
          const parsed: ClientRecord[] = JSON.parse(stored);
          const updated = parsed.map((c) =>
            c.id === selectedClientId ? { ...c, clientType: newType as ClientType } : c
          );
          localStorage.setItem('fenix_clients_data', JSON.stringify(updated));
          setClientsList(updated);
        }
      } catch (err) {
        console.error(err);
      }
    }

    showToast(`Tipo de Cliente: "${newType}" → Tabela alterada automaticamente para "${getOfficialPriceTableLabel(newTier)}"!`);
  };

  const handleImportFromCalculator = () => {
    try {
      const raw = localStorage.getItem('fenix_orcamento_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          if (parsed.clientId) {
            setSelectedClientId(parsed.clientId);
          }
          const targetType = parsed.clientType || customClientType || currentClient?.clientType || 'Cliente Final';
          setCustomClientType(targetType);
          const resolvedTier = getPriceTierFromClientType(targetType);
          setPriceTable(resolvedTier);

          const convertedItems: EspelhoItem[] = parsed.items.map(
            (
              item: {
                product: string;
                quantity: string;
                qtdDetalhe?: string;
                unit?: string;
                precoUnitario?: number;
                subtitulo?: string;
                observacao?: string;
              },
              idx: number
            ) => {
              const details = getProductDetailsFromCatalog(item.product, resolvedTier);
              const numQtd =
                parseFloat(
                  String(item.quantity).replace(/\./g, '').replace(',', '.')
                ) || 1;
              const preco =
                typeof item.precoUnitario === 'number' && item.precoUnitario > 0
                  ? item.precoUnitario
                  : parsePriceToNumber(details.price);
              const itemTotal = Math.round(numQtd * preco * 100) / 100;

              const cleanSub = cleanCalcText(item.subtitulo) || cleanCalcText(item.observacao) || details.defaultSubtitle || '';

              return {
                id: `calc_item_${Date.now()}_${idx}`,
                qtd: String(item.quantity),
                qtdDetalhe: item.qtdDetalhe,
                descricao: item.product,
                subtitulo: cleanSub,
                unidade: item.unit || details.unit || 'unidades',
                precoUnitario: preco,
                total: itemTotal,
              };
            }
          );

          setItems(convertedItems);
          const cleanObs = cleanCalcText(parsed.observacoes);
          if (cleanObs) {
            setObservacoes((prev) => (prev ? `${prev}\n${cleanObs}` : cleanObs));
          }
          if (parsed.category) {
            setNomeOrcamento((prev) => prev || `Orçamento - ${parsed.category}`);
          }
          localStorage.removeItem('fenix_orcamento_draft');
          setHasDraftFromCalculator(false);
          showToast('Itens da Calculadora importados com sucesso!');
        }
      }
    } catch {
      showToast('Erro ao carregar itens da calculadora.');
    }
  };

  // Handle product catalog change
  const handleProductCatalogSelect = (productName: string, tier: PriceTableTier = priceTable) => {
    setSelectedProductCatalog(productName);
    const details = getProductDetailsFromCatalog(productName, tier);
    setNewCategoria(details.category || 'Geral');
    setNewUnid(details.unit || 'unidades');
    setNewPrecoUnitario(formatPriceToBrl(details.price));
    if (details.defaultSubtitle) {
      setNewSubtitulo(details.defaultSubtitle);
    } else {
      setNewSubtitulo('');
    }
  };

  const handlePriceTableChange = (tier: PriceTableTier) => {
    setPriceTable(tier);
    const details = getProductDetailsFromCatalog(selectedProductCatalog, tier);
    setNewPrecoUnitario(formatPriceToBrl(details.price));
  };

  // Handle selection from ProductSelectionModal
  const handleSelectProductFromModal = (prod: {
    name: string;
    category: string;
    unit: string;
    price: number;
    quantity: string;
    subtitulo?: string;
  }) => {
    const numQtd = parseFloat(prod.quantity.replace(/\./g, '').replace(',', '.')) || 1;
    const safeProdPrice = parsePriceToNumber(prod.price);
    const itemTotal = Math.round(numQtd * safeProdPrice * 100) / 100;

    const newItem: EspelhoItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      qtd: prod.quantity,
      descricao: prod.name,
      subtitulo: prod.subtitulo,
      unidade: prod.unit,
      precoUnitario: safeProdPrice,
      total: itemTotal,
    };

    setItems((prev) => [...prev, newItem]);
    recordProductUsage(currentUserName, { name: prod.name, category: prod.category });
    setShortcutsRefreshCounter((c) => c + 1);
    showToast(`"${prod.name}" adicionado ao orçamento.`);

    // Limpa o formulário e deixa pronto para pesquisar outro produto
    setSelectedProductCatalog('');
    setNewCategoria('Geral');
    setNewUnid('unidades');
    setNewPrecoUnitario('0,00');
    setNewQtd('1');
    setNewSubtitulo('');
    setEditingItemId(null);
    setSearchProductQuery('');
    setProductSubTab('buscar');
  };

  // Callback de sucesso ao cadastrar novo produto diretamente pelo modal
  const handleCadastrarProdutoSuccess = (
    newProd: CatalogProduct,
    initialQty: string,
    initialDetail?: string
  ) => {
    const numQtd = parseFloat(initialQty.replace(/\./g, '').replace(',', '.')) || 1;
    const tierPrice = getProductTierPrice(newProd, priceTable);
    const itemTotal = Math.round(numQtd * tierPrice * 100) / 100;

    const newItem: EspelhoItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      qtd: initialQty || '1',
      descricao: newProd.name,
      subtitulo: initialDetail || undefined,
      unidade: newProd.unit,
      precoUnitario: tierPrice,
      total: itemTotal,
    };

    setItems((prev) => [...prev, newItem]);
    recordProductUsage(currentUserName, newProd);
    setShortcutsRefreshCounter((c) => c + 1);
    showToast(`Produto "${newProd.name}" cadastrado no catálogo e inserido no orçamento!`);

    setSelectedProductCatalog(newProd.name);
    setNewCategoria(newProd.category || 'Geral');
    setNewUnid(newProd.unit || 'unidades');
    setNewPrecoUnitario(formatPriceToBrl(tierPrice));
    setNewQtd(initialQty || '1');
    setNewSubtitulo(initialDetail || '');
    setProductSubTab('buscar');
  };

  // Carregar dados de produto já adicionado para edição
  const handleEditItem = (item: EspelhoItem) => {
    setEditingItemId(item.id);
    setSelectedProductCatalog(item.descricao);
    setNewSubtitulo(item.subtitulo || '');
    setNewQtd(item.qtd);
    setNewUnid(item.unidade || 'unidades');
    setNewPrecoUnitario(formatPriceToBrl(item.precoUnitario));
    setProductSubTab('produtos');
    const formSection = document.getElementById('adicionar-produtos-container');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
    showToast(`Editando "${item.descricao}". Altere os dados e salve.`);
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setSelectedProductCatalog('');
    setNewSubtitulo('');
    setNewQtd('1');
    setNewUnid('unidades');
    setNewPrecoUnitario('0,00');
    setProductSubTab('buscar');
  };

  // Salvar Produto (Adiciona novo ou Atualiza item existente sem duplicar)
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = selectedProductCatalog.trim();
    if (!cleanDesc) {
      showToast('Informe a descrição ou selecione um produto.');
      return;
    }

    const cleanQtd = newQtd.trim();
    if (!cleanQtd || cleanQtd === '0') {
      showToast('Informe uma quantidade válida.');
      return;
    }

    const numQtd =
      parseFloat(cleanQtd.replace(/\./g, '').replace(',', '.')) || 0;
    const numPreco =
      parseFloat(newPrecoUnitario.replace(/\./g, '').replace(',', '.')) || 0;

    if (numQtd <= 0) {
      showToast('A quantidade deve ser maior que zero.');
      return;
    }

    const itemTotal = Math.round(numQtd * numPreco * 100) / 100;

    if (editingItemId) {
      // ATUALIZA O ITEM EXISTENTE SEM DUPLICAR
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItemId
            ? {
                ...it,
                qtd: cleanQtd,
                descricao: cleanDesc,
                subtitulo: newSubtitulo.trim() || undefined,
                unidade: newUnid || 'unidades',
                precoUnitario: numPreco,
                total: itemTotal,
              }
            : it
        )
      );
      showToast(`Item "${cleanDesc}" atualizado com sucesso!`);
    } else {
      // ADICIONA NOVO PRODUTO
      const newItem: EspelhoItem = {
        id: `item_${Date.now()}`,
        qtd: cleanQtd,
        descricao: cleanDesc,
        subtitulo: newSubtitulo.trim() || undefined,
        unidade: newUnid || 'unidades',
        precoUnitario: numPreco,
        total: itemTotal,
      };

      setItems((prev) => [...prev, newItem]);
      recordProductUsage(currentUserName, { name: cleanDesc, category: newCategoria });
      setShortcutsRefreshCounter((c) => c + 1);
      showToast(`"${cleanDesc}" adicionado ao orçamento.`);
    }

    // LIMPAR AUTOMATICAMENTE O FORMULÁRIO e deixar pronto para pesquisar outro
    setEditingItemId(null);
    setSelectedProductCatalog('');
    setNewSubtitulo('');
    setNewQtd('1');
    setNewUnid('unidades');
    setNewPrecoUnitario('0,00');
    setSearchProductQuery('');
    setProductSubTab('buscar');
  };

  // Remove product from budget
  const handleRemoveItem = (id: string) => {
    if (editingItemId === id) {
      handleCancelEdit();
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Move product up or down in budget
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setItems((prev) => {
        const next = [...prev];
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
        return next;
      });
    } else if (direction === 'down' && index < items.length - 1) {
      setItems((prev) => {
        const next = [...prev];
        const temp = next[index];
        next[index] = next[index + 1];
        next[index + 1] = temp;
        return next;
      });
    }
  };

  // Edit item quantity directly
  const handleItemQtdChange = (id: string, newQtdVal: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const numQtd =
          parseFloat(newQtdVal.replace(/\./g, '').replace(',', '.')) || 0;
        const total = Math.round(numQtd * item.precoUnitario * 100) / 100;
        return {
          ...item,
          qtd: newQtdVal,
          total,
        };
      })
    );
  };

  // Edit item unit price directly in the budget
  // Recalculates totals automatically; alteration is valid ONLY for this budget, without altering the catalog price
  const handleItemPrecoChange = (id: string, newPrecoStr: string) => {
    let numPreco = 0;
    const clean = newPrecoStr.replace('R$', '').trim();
    if (clean.includes(',')) {
      numPreco = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      numPreco = parseFloat(clean) || 0;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const numQtd =
          parseFloat(String(item.qtd).replace(/\./g, '').replace(',', '.')) || 0;
        const total = Math.round(numQtd * numPreco * 100) / 100;
        return {
          ...item,
          precoUnitario: numPreco,
          total,
        };
      })
    );
  };

  // =========================================================
  // 5. FRETE & DESCONTO & TOTAIS
  // =========================================================
  // O frete deve iniciar SEMPRE desativado/desmarcado para novos orçamentos, exceto se configurado no rascunho
  const [hasFreteEnabled, setHasFreteEnabled] = useState<boolean>(() => {
    if (initialOrcamento) {
      return Boolean(initialOrcamento.freteAtivo ?? (parsePriceToNumber(initialOrcamento.freteValor) > 0));
    }
    if (initialDraft?.hasFreteEnabled !== undefined) {
      return initialDraft.hasFreteEnabled;
    }
    return false;
  });
  const [freteValorInput, setFreteValorInput] = useState<string>(() => {
    if (initialOrcamento?.freteValor !== undefined) {
      return formatPriceToBrl(initialOrcamento.freteValor);
    }
    if (initialDraft?.freteValorInput !== undefined) {
      return initialDraft.freteValorInput;
    }
    return '0,00';
  });

  // Campos de endereço e CEP
  const [freteCep, setFreteCep] = useState<string>(() => {
    return initialOrcamento?.freteCep || initialDraft?.freteCep || '';
  });
  const [freteLogradouro, setFreteLogradouro] = useState<string>(() => {
    return initialOrcamento?.freteLogradouro || initialDraft?.freteLogradouro || '';
  });
  const [freteNumero, setFreteNumero] = useState<string>(() => {
    return initialOrcamento?.freteNumero || initialDraft?.freteNumero || '';
  });
  const [freteComplemento, setFreteComplemento] = useState<string>(() => {
    return initialOrcamento?.freteComplemento || initialDraft?.freteComplemento || '';
  });
  const [freteBairro, setFreteBairro] = useState<string>(() => {
    return initialOrcamento?.freteBairro || initialDraft?.freteBairro || '';
  });
  const [freteCidade, setFreteCidade] = useState<string>(() => {
    return initialOrcamento?.freteCidade || initialDraft?.freteCidade || '';
  });
  const [freteUf, setFreteUf] = useState<string>(() => {
    return initialOrcamento?.freteUf || initialDraft?.freteUf || '';
  });
  const [freteEndereco, setFreteEndereco] = useState<string>(() => {
    return initialOrcamento?.freteEndereco || initialDraft?.freteEndereco || '';
  });
  const [isSearchingCep, setIsSearchingCep] = useState<boolean>(false);

  // Atualiza a linha de endereço consolidada
  const updateComposedAddress = (
    logradouro: string,
    num: string,
    comp: string,
    bairro: string,
    cidade: string,
    uf: string,
    cep: string
  ) => {
    const parts: string[] = [];
    if (logradouro) {
      parts.push(num ? `${logradouro}, ${num}` : logradouro);
    }
    if (comp) parts.push(comp);
    if (bairro) parts.push(bairro);
    if (cidade && uf) parts.push(`${cidade} - ${uf}`);
    else if (cidade || uf) parts.push(cidade || uf);
    if (cep) parts.push(`CEP: ${cep}`);

    const full = parts.join(', ');
    setFreteEndereco(full);
    return full;
  };

  // Buscar CEP via ViaCEP e preencher automaticamente Logradouro, Bairro, Cidade e UF
  const handleSearchCep = async (cepValue?: string) => {
    const clean = (cepValue !== undefined ? cepValue : freteCep).replace(/\D/g, '');
    if (clean.length !== 8) {
      showToast('Digite um CEP completo com 8 dígitos.');
      return;
    }

    try {
      setIsSearchingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();

      if (data.erro) {
        showToast('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }

      const newLog = data.logradouro || '';
      const newBairro = data.bairro || '';
      const newCidade = data.localidade || '';
      const newUf = data.uf || '';
      const formattedCep = clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');

      setFreteLogradouro(newLog);
      setFreteBairro(newBairro);
      setFreteCidade(newCidade);
      setFreteUf(newUf);

      updateComposedAddress(
        newLog,
        freteNumero,
        freteComplemento,
        newBairro,
        newCidade,
        newUf,
        formattedCep
      );

      showToast('Endereço preenchido com sucesso pelo CEP!');
      setTimeout(() => {
        document.getElementById('frete-numero-input')?.focus();
      }, 100);
    } catch (err) {
      console.warn('Erro ao buscar CEP:', err);
      showToast('Erro ao consultar CEP automaticamente. Digite o endereço.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (val: string) => {
    const numbersOnly = val.replace(/\D/g, '').slice(0, 8);
    let formatted = numbersOnly;
    if (numbersOnly.length > 5) {
      formatted = `${numbersOnly.slice(0, 5)}-${numbersOnly.slice(5)}`;
    }
    setFreteCep(formatted);
    updateComposedAddress(
      freteLogradouro,
      freteNumero,
      freteComplemento,
      freteBairro,
      freteCidade,
      freteUf,
      formatted
    );

    if (numbersOnly.length === 8) {
      handleSearchCep(numbersOnly);
    }
  };

  // Desconto (R$ ou %)
  const [descontoTipo, setDescontoTipo] = useState<'reais' | 'percent'>(() => {
    return initialDraft?.descontoTipo || 'reais';
  });
  const [descontoInput, setDescontoInput] = useState<string>(() => {
    if (initialOrcamento?.descontoValor !== undefined && initialOrcamento.descontoValor > 0) {
      return formatPriceToBrl(initialOrcamento.descontoValor);
    }
    if (initialDraft?.descontoInput !== undefined) {
      return initialDraft.descontoInput;
    }
    return '0,00';
  });
  const [descontoTexto, setDescontoTexto] = useState<string>(() => {
    return (
      initialOrcamento?.descontoTexto ||
      initialDraft?.descontoTexto ||
      'DESCONTO ESPECIAL APLICADO:'
    );
  });
  const [hasDescontoEnabled, setHasDescontoEnabled] = useState<boolean>(() => {
    if (initialOrcamento?.descontoValor !== undefined && initialOrcamento.descontoValor > 0) {
      return true;
    }
    if (initialDraft?.hasDescontoEnabled !== undefined) {
      return Boolean(initialDraft.hasDescontoEnabled);
    }
    return false;
  });

  // Sync initialOrcamento if changed
  useEffect(() => {
    if (initialOrcamento) {
      if (initialOrcamento.clientId) {
        setSelectedClientId(initialOrcamento.clientId);
      }
      if (initialOrcamento.items && initialOrcamento.items.length > 0) {
        setItems(initialOrcamento.items);
      }
      if (initialOrcamento.observacoes !== undefined) {
        setObservacoes(initialOrcamento.observacoes);
      }
      if (initialOrcamento.observacoesRodape !== undefined) {
        setObservacoesRodape(initialOrcamento.observacoesRodape);
      }
      if (initialOrcamento.nomeOrcamento) {
        setNomeOrcamento(initialOrcamento.nomeOrcamento);
      }
      if (initialOrcamento.freteValor !== undefined) {
        setFreteValorInput(formatPriceToBrl(initialOrcamento.freteValor));
        setHasFreteEnabled(
          Boolean(initialOrcamento.freteAtivo ?? (parsePriceToNumber(initialOrcamento.freteValor) > 0))
        );
      }
      if (initialOrcamento.freteEndereco !== undefined) {
        setFreteEndereco(initialOrcamento.freteEndereco);
      }
      if (initialOrcamento.freteCep !== undefined) setFreteCep(initialOrcamento.freteCep);
      if (initialOrcamento.freteLogradouro !== undefined) setFreteLogradouro(initialOrcamento.freteLogradouro);
      if (initialOrcamento.freteNumero !== undefined) setFreteNumero(initialOrcamento.freteNumero);
      if (initialOrcamento.freteComplemento !== undefined) setFreteComplemento(initialOrcamento.freteComplemento);
      if (initialOrcamento.freteBairro !== undefined) setFreteBairro(initialOrcamento.freteBairro);
      if (initialOrcamento.freteCidade !== undefined) setFreteCidade(initialOrcamento.freteCidade);
      if (initialOrcamento.freteUf !== undefined) setFreteUf(initialOrcamento.freteUf);
      if (initialOrcamento.descontoValor !== undefined) {
        setDescontoInput(formatPriceToBrl(initialOrcamento.descontoValor));
        if (initialOrcamento.descontoValor > 0) {
          setHasDescontoEnabled(true);
        }
      }
      if (initialOrcamento.descontoTexto !== undefined) {
        setDescontoTexto(initialOrcamento.descontoTexto);
      }
    }
  }, [initialOrcamento]);

  // Ref para sempre ter a versão mais recente dos dados do orçamento ao desmontar (navegação entre abas)
  const draftStateRef = useRef({
    selectedClientId,
    customClientType,
    priceTable,
    nomeOrcamento,
    observacoes,
    observacoesRodape,
    items,
    hasFreteEnabled,
    freteValorInput,
    freteCep,
    freteLogradouro,
    freteNumero,
    freteComplemento,
    freteBairro,
    freteCidade,
    freteUf,
    freteEndereco,
    descontoTipo,
    descontoInput,
    descontoTexto,
    hasDescontoEnabled,
  });

  draftStateRef.current = {
    selectedClientId,
    customClientType,
    priceTable,
    nomeOrcamento,
    observacoes,
    observacoesRodape,
    items,
    hasFreteEnabled,
    freteValorInput,
    freteCep,
    freteLogradouro,
    freteNumero,
    freteComplemento,
    freteBairro,
    freteCidade,
    freteUf,
    freteEndereco,
    descontoTipo,
    descontoInput,
    descontoTexto,
    hasDescontoEnabled,
  };

  // Salvar rascunho em andamento automaticamente a cada alteração (sem criar no Supabase ou duplicar)
  useEffect(() => {
    if (initialOrcamento) return;

    const hasData =
      items.length > 0 ||
      Boolean(nomeOrcamento && nomeOrcamento.trim()) ||
      Boolean(observacoes && observacoes.trim()) ||
      Boolean(selectedClientId) ||
      hasFreteEnabled ||
      hasDescontoEnabled;

    if (!hasData) {
      return;
    }

    try {
      const draftPayload = {
        selectedClientId,
        customClientType,
        priceTable,
        nomeOrcamento,
        observacoes,
        observacoesRodape,
        items,
        hasFreteEnabled,
        freteValorInput,
        freteCep,
        freteLogradouro,
        freteNumero,
        freteComplemento,
        freteBairro,
        freteCidade,
        freteUf,
        freteEndereco,
        descontoTipo,
        descontoInput,
        descontoTexto,
        hasDescontoEnabled,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draftPayload));
      localStorage.setItem('fenix_orcamento_in_progress_draft', JSON.stringify(draftPayload));
    } catch {
      // ignore
    }
  }, [
    initialOrcamento,
    ACTIVE_DRAFT_KEY,
    selectedClientId,
    customClientType,
    priceTable,
    nomeOrcamento,
    observacoes,
    observacoesRodape,
    items,
    hasFreteEnabled,
    freteValorInput,
    freteCep,
    freteLogradouro,
    freteNumero,
    freteComplemento,
    freteBairro,
    freteCidade,
    freteUf,
    freteEndereco,
    descontoTipo,
    descontoInput,
    descontoTexto,
    hasDescontoEnabled,
  ]);

  // Garantir persistência ao desmontar (ex: usuário clica em Pós-Vendas, Clientes ou outra aba)
  useEffect(() => {
    return () => {
      if (initialOrcamento) return;
      const cur = draftStateRef.current;
      const hasData =
        cur.items.length > 0 ||
        Boolean(cur.nomeOrcamento && cur.nomeOrcamento.trim()) ||
        Boolean(cur.observacoes && cur.observacoes.trim()) ||
        Boolean(cur.selectedClientId) ||
        cur.hasFreteEnabled ||
        cur.hasDescontoEnabled;

      if (hasData) {
        try {
          const draftPayload = {
            ...cur,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draftPayload));
          localStorage.setItem('fenix_orcamento_in_progress_draft', JSON.stringify(draftPayload));
        } catch {
          // ignore
        }
      }
    };
  }, [initialOrcamento, ACTIVE_DRAFT_KEY]);

  // Garantir persistência se fechar ou atualizar o navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (initialOrcamento) return;
      const cur = draftStateRef.current;
      const hasData =
        cur.items.length > 0 ||
        Boolean(cur.nomeOrcamento && cur.nomeOrcamento.trim()) ||
        Boolean(cur.observacoes && cur.observacoes.trim()) ||
        Boolean(cur.selectedClientId) ||
        cur.hasFreteEnabled;

      if (hasData) {
        try {
          const draftPayload = {
            ...cur,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draftPayload));
          localStorage.setItem('fenix_orcamento_in_progress_draft', JSON.stringify(draftPayload));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [initialOrcamento, ACTIVE_DRAFT_KEY]);

  // Identifica com exatidão se existe um orçamento em andamento que possa ser interrompido
  const isBudgetInProgress = useMemo(() => {
    if (initialOrcamento) {
      return true;
    }
    const hasItems = items.length > 0;
    const hasNome = Boolean(nomeOrcamento && nomeOrcamento.trim().length > 0);
    const hasClient = Boolean(selectedClientId || (clientSearchQuery && clientSearchQuery.trim().length > 0));
    const hasObs = Boolean(
      (observacoes && observacoes.trim().length > 0) ||
      (observacoesRodape && observacoesRodape.trim().length > 0)
    );
    const hasFrete = Boolean(
      hasFreteEnabled &&
      (freteValorInput !== '0,00' || (freteEndereco && freteEndereco.trim().length > 0))
    );
    const hasDesconto = Boolean(
      hasDescontoEnabled &&
      descontoInput &&
      descontoInput !== '0,00' &&
      descontoInput !== ''
    );

    return hasItems || hasNome || hasClient || hasObs || hasFrete || hasDesconto;
  }, [
    initialOrcamento,
    items.length,
    nomeOrcamento,
    selectedClientId,
    clientSearchQuery,
    observacoes,
    observacoesRodape,
    hasFreteEnabled,
    freteValorInput,
    freteEndereco,
    hasDescontoEnabled,
    descontoInput,
  ]);

  // Notifica o componente pai sobre a existência de orçamento em andamento
  useEffect(() => {
    onStatusChangeInProgress?.(isBudgetInProgress);
    return () => {
      onStatusChangeInProgress?.(false);
    };
  }, [isBudgetInProgress, onStatusChangeInProgress]);

  // Função para descartar o rascunho e recomeçar do zero caso desejado
  const handleDiscardDraft = () => {
    if (window.confirm('Tem certeza de que deseja descartar este rascunho em andamento e começar um novo orçamento do zero?')) {
      try {
        localStorage.removeItem(ACTIVE_DRAFT_KEY);
        localStorage.removeItem('fenix_orcamento_in_progress_draft');
      } catch {}
      setItems([]);
      setNomeOrcamento('');
      setObservacoes('');
      setObservacoesRodape('');
      setHasFreteEnabled(false);
      setFreteValorInput('0,00');
      setFreteCep('');
      setFreteLogradouro('');
      setFreteNumero('');
      setFreteComplemento('');
      setFreteBairro('');
      setFreteCidade('');
      setFreteUf('');
      setFreteEndereco('');
      setDescontoInput('0,00');
      setDescontoTexto('DESCONTO ESPECIAL APLICADO:');
      setHasDescontoEnabled(false);
      showToast('Rascunho descartado. Orçamento limpo para novo preenchimento.');
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.total, 0);
  }, [items]);

  const freteValor = useMemo(() => {
    if (!hasFreteEnabled) return 0;
    return (
      parseFloat(freteValorInput.replace(/\./g, '').replace(',', '.')) || 0
    );
  }, [hasFreteEnabled, freteValorInput]);

  const descontoValor = useMemo(() => {
    if (!hasDescontoEnabled) return 0;
    const rawVal =
      parseFloat(descontoInput.replace(/\./g, '').replace(',', '.')) || 0;
    if (descontoTipo === 'percent') {
      return Math.round(((subtotal * rawVal) / 100) * 100) / 100;
    }
    return rawVal;
  }, [hasDescontoEnabled, subtotal, descontoInput, descontoTipo]);

  // Total Final = Subtotal - Desconto + Frete
  const totalFinal = useMemo(() => {
    const val = subtotal - descontoValor + freteValor;
    return Math.max(0, Math.round(val * 100) / 100);
  }, [subtotal, descontoValor, freteValor]);

  // =========================================================
  // 7. AÇÕES FINAIS & FEEDBACK
  // =========================================================
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const persistedOrcIdRef = useRef<string | null>(initialOrcamento?.id || null);

  useEffect(() => {
    if (initialOrcamento?.id) {
      persistedOrcIdRef.current = initialOrcamento.id;
    }
  }, [initialOrcamento]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Salvar Orçamento no Supabase e CRM
  const persistOrcamentoToDatabase = async (silent = false): Promise<{ success: boolean; data?: SavedOrcamento; error?: string }> => {
    const orcId = persistedOrcIdRef.current || initialOrcamento?.id || `orc_${Date.now()}`;
    persistedOrcIdRef.current = orcId;
    const now = new Date();
    const todayFormatted = dataOrcamento || now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const orderNum = orcId.replace('orc_', '').slice(-4) || '1046';

    const finalNomeOrcamento =
      nomeOrcamento.trim() || 'Orçamento de Materiais';

    const sellerId = getSellerIdForUser(currentUserName) || initialOrcamento?.vendedorId;

    const orcamentoData: SavedOrcamento = {
      id: orcId,
      clientId: currentClient?.id || 'cli_geral',
      clientName,
      clientType,
      clientContact,
      nomeOrcamento: finalNomeOrcamento,
      consultoraName: currentUserName || consultoraName,
      registeredBy: currentUserName || consultoraName,
      vendedorId: sellerId,
      dataOrcamento,
      observacoes,
      observacoesRodape,
      items,
      freteAtivo: hasFreteEnabled,
      freteValor: hasFreteEnabled ? freteValor : 0,
      freteEndereco: hasFreteEnabled ? freteEndereco : '',
      freteCep: hasFreteEnabled ? freteCep : '',
      freteLogradouro: hasFreteEnabled ? freteLogradouro : '',
      freteNumero: hasFreteEnabled ? freteNumero : '',
      freteComplemento: hasFreteEnabled ? freteComplemento : '',
      freteBairro: hasFreteEnabled ? freteBairro : '',
      freteCidade: hasFreteEnabled ? freteCidade : '',
      freteUf: hasFreteEnabled ? freteUf : '',
      descontoValor,
      descontoTexto: hasDescontoEnabled && descontoValor > 0 ? (descontoTexto || 'DESCONTO ESPECIAL APLICADO:') : undefined,
      totalFinal,
      status: 'Em aberto',
      savedAt: initialOrcamento?.savedAt || now.toISOString(),
    };

    try {
      // 1. Salvar no Supabase primeiro com confirmação oficial
      const res = await saveItemToSupabase<SavedOrcamento>(
        'fenix_orcamentos_history',
        orcamentoData,
        'id',
        currentUserName || consultoraName
      );

      if (!res.success) {
        if (!silent) {
          showToast('Não foi possível salvar. Verifique sua conexão e tente novamente.');
        }
        return { success: false, error: res.error };
      }

      window.dispatchEvent(new Event('fenix_orcamentos_updated'));

      // 2. GATILHO AUTOMÁTICO PARA ABA "FOLLOW-UP"
      const produtosSummary = items.length > 0
        ? items.map((it) => `${it.descricao}${it.qtd ? ` (${it.qtd} ${it.unidade || 'm²'})` : ''}`).join(', ')
        : 'Pisos e Insumos Fênix';

      const initialHistoryEntry = {
        id: `h_init_${Date.now()}`,
        data: todayFormatted,
        hora: timeFormatted,
        novoStatus: 'Orçamento Enviado',
        observacao: 'Orçamento oficial gerado e sincronizado na esteira comercial.',
        usuario: consultoraName,
        timestamp: Date.now(),
      };

      const followUpRaw = localStorage.getItem('fenix_followup_cards_v2');
      let followUpList: any[] = [];
      try {
        followUpList = followUpRaw ? JSON.parse(followUpRaw) : [];
      } catch {
        followUpList = [];
      }

      const existingFupIdx = followUpList.findIndex(
        (f: any) => f.orcamentoId === orcId || f.id === `fup_${orcId}`
      );

      let followUpItemToSave: any;
      if (existingFupIdx >= 0) {
        followUpItemToSave = {
          ...followUpList[existingFupIdx],
          cliente: clientName,
          clientType,
          telefone: clientContact,
          produto: finalNomeOrcamento || produtosSummary,
          valor: totalFinal,
          dataAtualizacao: `${todayFormatted} às ${timeFormatted}`,
          updatedAt: now.toISOString(),
          vendedor: currentUserName || consultoraName,
          vendedorId: sellerId || followUpList[existingFupIdx].vendedorId,
          criadoPorId: sellerId || followUpList[existingFupIdx].criadoPorId,
          creatorId: sellerId || followUpList[existingFupIdx].creatorId,
          responsavelId: sellerId || followUpList[existingFupIdx].responsavelId,
        };
      } else {
        followUpItemToSave = {
          id: `fup_${orcId}`,
          orcamentoId: orcId,
          pedido: orderNum,
          clientId: currentClient?.id,
          cliente: clientName,
          clientType,
          produto: finalNomeOrcamento || produtosSummary,
          telefone: clientContact,
          valor: totalFinal,
          dataCriacao: todayFormatted,
          dataEntradaFollowUp: now.toISOString(),
          dataAtualizacao: `${todayFormatted} às ${timeFormatted}`,
          status: 'Orçamento Enviado',
          observacao: observacoes || 'Orçamento enviado ao cliente. Aguardando retorno.',
          vendedor: currentUserName || consultoraName,
          vendedorId: sellerId,
          criadoPor: currentUserName || consultoraName,
          criadoPorId: sellerId,
          creatorId: sellerId,
          responsavel: currentUserName || consultoraName,
          responsavelId: sellerId,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          historico: [initialHistoryEntry],
        };
      }

      await saveItemToSupabase('fenix_followup_cards_v2', followUpItemToSave, 'id', currentUserName || consultoraName);
      window.dispatchEvent(new Event('fenix_followup_updated'));

      // Limpar rascunho temporário de preenchimento pois o orçamento foi salvo com sucesso
      try {
        localStorage.removeItem(ACTIVE_DRAFT_KEY);
        localStorage.removeItem('fenix_orcamento_in_progress_draft');
      } catch {
        // ignore
      }

      if (currentClient?.id) {
        addClientActivity({
          clientId: currentClient.id,
          type: initialOrcamento ? 'orcamento_atualizado' : 'orcamento_criado',
          title: initialOrcamento ? 'Orçamento atualizado' : 'Orçamento gerado e salvo',
          description: `Orçamento oficial "${finalNomeOrcamento}" (${items.length} itens) no valor de R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} salvo no CRM.`,
          date: now.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          relevantInfo: `Consultora: ${consultoraName} | Total: R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        });
      }

      return { success: true, data: orcamentoData };
    } catch (err: any) {
      console.warn('Erro na persistência do orçamento:', err);
      if (!silent) {
        showToast('Não foi possível salvar. Verifique sua conexão e tente novamente.');
      }
      return { success: false, error: err?.message };
    }
  };

  // Salvar Orçamento Manualmente
  const handleSaveOrcamento = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await persistOrcamentoToDatabase();
      setIsSaving(false);
      if (res.success && res.data) {
        showToast('✓ Orçamento salvo com sucesso!');
        if (onSaveSuccess) {
          onSaveSuccess(res.data);
        }
        setTimeout(() => {
          if (onBackToList) {
            onBackToList();
          } else if (onBackToCadastro) {
            onBackToCadastro();
          }
        }, 500);
      }
    } catch {
      setIsSaving(false);
      showToast('Não foi possível salvar. Verifique sua conexão e tente novamente.');
    }
  };

  // Gerar PDF / Imprimir Oficial (Salva no banco automaticamente apenas uma vez)
  const handlePrintPdf = async () => {
    await persistOrcamentoToDatabase(true);
    showToast('✓ Orçamento salvo no banco de dados!');
    window.print();
  };

  // Baixar Orçamento como PDF Oficial (Salva no banco apenas uma vez e retorna à lista)
  const handleDownloadPdf = async () => {
    const element = document.getElementById('espelho-oficial-orcamento');
    if (!element) {
      showToast('Espelho do orçamento não encontrado na tela.');
      return;
    }

    try {
      // Salva no banco de dados apenas uma vez
      await persistOrcamentoToDatabase(true);

      setIsExporting(true);
      showToast('Salvando orçamento e gerando PDF oficial...');

      let imgData = '';
      let elementWidth = element.offsetWidth || 1040;
      let elementHeight = element.offsetHeight || 800;

      try {
        imgData = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          style: {
            margin: '0',
            transform: 'none',
          },
        });
      } catch (errToPng) {
        console.warn('toPng falhou no PDF, usando fallback html2canvas...', errToPng);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        imgData = canvas.toDataURL('image/png');
        elementWidth = canvas.width;
        elementHeight = canvas.height;
      }

      // A4 Landscape em milímetros: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Margem uniforme de 6mm
      const margin = 6;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      // Calcular escala preservando proporção exata
      const imgWidthMm = elementWidth * 0.264583;
      const imgHeightMm = elementHeight * 0.264583;
      const scale = Math.min(availableWidth / imgWidthMm, availableHeight / imgHeightMm);

      const renderWidth = imgWidthMm * scale;
      const renderHeight = imgHeightMm * scale;
      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

      const filename = getOrcamentoExportFileName(clientName, dataOrcamento, 'pdf');

      pdf.save(filename);
      showToast('✓ PDF oficial gerado e salvo!');
      
      // Retornar para a tela Orçamentos
      setTimeout(() => {
        if (onBackToList) {
          onBackToList();
        } else if (onBackToCadastro) {
          onBackToCadastro();
        }
      }, 700);
    } catch (err) {
      console.error('Erro na exportação de PDF:', err);
      showToast('Erro ao exportar PDF. Você pode utilizar a opção Imprimir Orçamento.');
    } finally {
      setIsExporting(false);
    }
  };

  // Baixar como Imagem (PNG) em Alta Resolução (Salva apenas uma vez e retorna à lista)
  const handleDownloadImage = async () => {
    const element = document.getElementById('espelho-oficial-orcamento');
    if (!element) {
      showToast('Espelho do orçamento não encontrado na tela.');
      return;
    }

    try {
      // Salva no banco de dados automaticamente apenas uma vez
      await persistOrcamentoToDatabase(true);

      setIsExporting(true);
      showToast('Salvando orçamento e gerando imagem em alta resolução...');

      let dataUrl = '';
      try {
        dataUrl = await toPng(element, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          style: {
            margin: '0',
            transform: 'none',
          },
        });
      } catch (errToPng) {
        console.warn('toPng falhou na imagem, tentando fallback...', errToPng);
        const targetWidth = Math.round(element.offsetWidth || element.scrollWidth);
        const targetHeight = Math.round(element.offsetHeight || element.scrollHeight);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: targetWidth,
          height: targetHeight,
          windowWidth: targetWidth,
          windowHeight: targetHeight,
          scrollX: 0,
          scrollY: 0,
        });
        dataUrl = canvas.toDataURL('image/png');
      }

      const filename = getOrcamentoExportFileName(clientName, dataOrcamento, 'png');

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✓ Imagem baixada e orçamento salvo!');

      // Retornar para a tela Orçamentos
      setTimeout(() => {
        if (onBackToList) {
          onBackToList();
        } else if (onBackToCadastro) {
          onBackToCadastro();
        }
      }, 700);
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
      showToast('Não foi possível gerar a imagem diretamente. Tente a opção Imprimir / Salvar como PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Copiar Imagem do Espelho Oficial (Salva no banco uma única vez e copia com fidelidade)
  const handleCopyImageFromEditor = async () => {
    const element = document.getElementById('espelho-oficial-orcamento');
    if (!element) {
      showToast('Espelho do orçamento não encontrado na tela.');
      return;
    }

    try {
      await persistOrcamentoToDatabase(true);
      setIsExporting(true);
      showToast('Copiando imagem do espelho oficial...');

      let blob: Blob | null = null;
      try {
        const dataUrl = await toPng(element, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          style: {
            margin: '0px',
            padding: '0px',
            transform: 'none',
          },
        });
        const res = await fetch(dataUrl);
        blob = await res.blob();
      } catch (errToPng) {
        console.warn('toPng falhou no editor, tentando fallback html2canvas...', errToPng);
        const targetWidth = Math.round(element.offsetWidth || element.scrollWidth);
        const targetHeight = Math.round(element.offsetHeight || element.scrollHeight);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: targetWidth,
          height: targetHeight,
          windowWidth: targetWidth,
          windowHeight: targetHeight,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById(element.id || 'espelho-oficial-orcamento');
            if (clonedEl) {
              clonedEl.style.margin = '0px';
              clonedEl.style.padding = '0px';
              clonedEl.style.transform = 'none';
            }
          },
        });
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      }

      if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('✓ Imagem copiada com sucesso! Cole na conversa do WhatsApp (Ctrl+V).');
      } else {
        showToast('✓ Imagem gerada! Utilize "Baixar Imagem" para salvar o arquivo.');
      }
    } catch (err) {
      console.warn('Falha ao copiar imagem:', err);
      showToast('Dica: Utilize o botão "Baixar Imagem" para salvar o arquivo do orçamento.');
    } finally {
      setIsExporting(false);
    }
  };

  // Enviar pelo WhatsApp (Salva no banco uma única vez)
  const handleSendWhatsApp = async () => {
    await persistOrcamentoToDatabase(true);
    const phoneDigits = clientContact.replace(/\D/g, '');
    const template = getWhatsAppMessageTemplate('Envio de Orçamento');
    const message = formatOrcamentoMessage(template, {
      clientName,
      totalFinal,
      consultoraName,
      items: items.map((i) => ({
        qtd: i.qtd,
        unidade: i.unidade,
        descricao: i.descricao,
        total: i.total,
      })),
      freteAtivo: hasFreteEnabled,
      freteValor,
      freteEndereco,
      descontoValor: hasDescontoEnabled ? descontoValor : 0,
      descontoTexto: hasDescontoEnabled ? (descontoTexto || 'DESCONTO ESPECIAL APLICADO:') : undefined,
      numeroOrcamento: nomeOrcamento || '',
    });

    const encoded = encodeURIComponent(message);
    const targetUrl =
      phoneDigits.length >= 10
        ? `https://wa.me/55${phoneDigits}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

    window.open(targetUrl, '_blank');
    showToast('✓ Orçamento salvo e mensagem preparada para o WhatsApp!');
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-2xl bg-[#003865] text-white shadow-xl flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation (no-print) */}
      <div className="no-print space-y-4">
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
          <Home className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">›</span>
          <button
            onClick={onBackToList || onBackToCadastro}
            className="hover:text-slate-800 cursor-pointer transition-colors"
          >
            Orçamentos
          </button>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-semibold">
            {initialOrcamento ? 'Visualizar / Editar Orçamento' : 'Novo Orçamento'}
          </span>
        </nav>

        {/* Page Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div className="flex items-start gap-4">
            <div className="text-[#0057ff] flex-shrink-0 pt-0.5">
              <FileText className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091122] tracking-tight">
                {initialOrcamento ? 'Visualizar / Editar Orçamento' : 'Novo Orçamento'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
                Preencha os dados abaixo. O Espelho Oficial é gerado
                automaticamente em tempo real com fidelidade visual absoluta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!initialOrcamento && (items.length > 0 || nomeOrcamento || selectedClientId) && (
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="self-start sm:self-center h-10 px-3.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 text-rose-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Limpar todos os campos e começar um orçamento do zero"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar / Novo</span>
              </button>
            )}
            <button
              onClick={onBackToList || onBackToCadastro}
              className="self-start sm:self-center h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Orçamentos</span>
            </button>
          </div>
        </div>

        {/* Banner de Rascunho em Andamento */}
        {!initialOrcamento && (items.length > 0 || nomeOrcamento || selectedClientId) && (
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-emerald-950">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="font-semibold text-emerald-900">
                Orçamento em andamento preservado:
              </span>
              <span className="text-emerald-700">
                {items.length} {items.length === 1 ? 'item adicionado' : 'itens adicionados'}. Você pode trocar de aba ou consultar outros módulos sem perder nenhum dado.
              </span>
            </div>
            <button
              onClick={handleDiscardDraft}
              type="button"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Descartar rascunho
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. DADOS DO CLIENTE (Área de Preenchimento) */}
      {/* ======================================================== */}
      <section className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#091122]">
              Dados do Cliente
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Vinculação automática do cadastro
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seleção do Cliente (Permite digitar para localizar - Apenas do usuário logado) */}
          <div className="space-y-1.5" ref={clientDropdownRef}>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#0057ff]" />
              <span>Cliente (Digite para localizar)</span>
            </label>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  placeholder="Digite o nome do cliente..."
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
                {clientSearchQuery ? (
                  <button
                    type="button"
                    onClick={handleClearClientSelection}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title="Limpar seleção"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                )}
              </div>

              {/* Dropdown com resultados filtrados */}
              {isClientDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                  {filteredClientsForSearch.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500 text-center">
                      Nenhum cliente encontrado para "{clientSearchQuery}"
                    </div>
                  ) : (
                    filteredClientsForSearch.map((c) => {
                      const isSelected = c.id === selectedClientId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectClientRecord(c)}
                          className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/70 font-bold text-[#0057ff]' : 'text-slate-800'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-semibold">
                              {c.name} {c.isImportant ? '★' : ''}
                            </span>
                            {c.phone || c.whatsapp ? (
                              <span className="text-[11px] text-slate-500">
                                {c.phone || c.whatsapp}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {c.clientType}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Cliente (determina a tabela automaticamente) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0057ff]" />
                <span>Tipo de Cliente</span>
              </label>
              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {getOfficialPriceTableLabel(priceTable)}
              </span>
            </div>
            <select
              value={activeClientType}
              onChange={(e) => handleClientTypeChange(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
            >
              <option value="Cliente Final">Cliente Final → Preço Cliente Final</option>
              <option value="Engenheiro">Engenheiro → Preço Cliente Final</option>
              <option value="Arquiteto">Arquiteto → Preço Cliente Final</option>
              <option value="Revenda">Revenda → Preço Revenda</option>
              <option value="Instalador">Instalador → Preço Revenda</option>
              <option value="Construtora">Construtora → Preço Construtora</option>
            </select>
          </div>

          {/* Contato (WhatsApp) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Contato</span>
            </label>
            <div className={`w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 flex items-center text-xs sm:text-sm font-semibold ${
              clientContact ? 'text-slate-800' : 'text-slate-400 font-normal'
            }`}>
              {clientContact || 'Nenhum contato vinculado'}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. INFORMAÇÕES DO ORÇAMENTO */}
      {/* ======================================================== */}
      <section className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#091122]">
              Informações do Orçamento
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Consultora e observações da proposta
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Consultora Comercial ou Diretor (preenchida automaticamente com usuária logada) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {(consultoraName || '').toLowerCase().includes('eder')
                ? 'Diretor'
                : 'Consultora Comercial'}
            </label>
            <div className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 flex items-center text-xs sm:text-sm font-bold text-[#003865]">
              {consultoraName}
            </div>
            <p className="text-[11px] text-slate-400">
              {(consultoraName || '').toLowerCase().includes('eder')
                ? 'Diretor logado no sistema.'
                : 'Usuária logada no sistema.'}
            </p>
          </div>

          {/* Nome do Orçamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Nome do Orçamento
            </label>
            <input
              type="text"
              value={nomeOrcamento || ''}
              onChange={(e) => setNomeOrcamento(e.target.value)}
              placeholder="Ex: Teto Vinílico Pix e Insumos"
              className="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10"
            />
            <p className="text-[11px] text-slate-400">
              Identificação na esteira de Follow-up.
            </p>
          </div>

          {/* Observação do orçamento (Aparece na parte superior do orçamento) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Observação do orçamento</span>
              <span className="text-[10px] text-blue-600 font-semibold">Topo</span>
            </label>
            <input
              type="text"
              value={observacoes || ''}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Validade da proposta: 5 dias úteis..."
              className="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10"
            />
            <p className="text-[11px] text-slate-400">
              Aparece na parte superior (junto às informações).
            </p>
          </div>

          {/* Observação do rodapé (Aparece somente no rodapé do espelho oficial) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Observação do rodapé</span>
              <span className="text-[10px] text-amber-600 font-semibold">Rodapé oficial</span>
            </label>
            <input
              type="text"
              value={observacoesRodape || ''}
              onChange={(e) => setObservacoesRodape(e.target.value)}
              placeholder="Não realizamos instalação, indicamos profissionais caso precise!"
              className="w-full h-11 rounded-xl border border-slate-200 px-4 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10"
            />
            <p className="text-[11px] text-slate-400">
              Aparece somente no rodapé do espelho oficial.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. ADICIONAR PRODUTOS (Fluxo com Busca com Dropdown, Categorias e Aba Produtos) */}
      {/* ======================================================== */}
      <section id="adicionar-produtos-container" className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#091122] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0057ff]" />
              Adicionar Produtos
            </h2>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Indicador Oficial da Tabela Selecionada Automaticamente */}
            <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-600">
                Tabela Oficial:
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-50 border border-blue-200 text-[#003865] shadow-2xs">
                {getOfficialPriceTableLabel(priceTable)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                (Automática • {activeClientType})
              </span>
            </div>

            {/* Botão de Catálogo Geral em Modal */}
            <button
              type="button"
              onClick={() => setIsProductModalOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
              title="Abrir catálogo completo em janela modal"
            >
              <Package className="w-3.5 h-3.5 text-slate-600" />
              <span>Catálogo Geral</span>
            </button>

            {/* Botão Cadastrar Novo Produto */}
            <button
              type="button"
              onClick={() => {
                setCadastrarInitialName('');
                setIsCadastrarProdutoModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#0B2046] to-[#0052cc] hover:from-[#081733] hover:to-[#0041a8] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Cadastrar novo produto no catálogo e inserir no orçamento"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Cadastrar Novo Produto</span>
            </button>

            {/* Botão de Importar da Calculadora se houver rascunho */}
            {hasDraftFromCalculator && (
              <button
                type="button"
                onClick={handleImportFromCalculator}
                className="h-9 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
              >
                <span>Importar Calculadora</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Abas de Navegação Solicitadas pelo Usuário */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl overflow-x-auto border border-slate-200/80">
          <button
            type="button"
            onClick={() => setProductSubTab('buscar')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              productSubTab === 'buscar'
                ? 'bg-white text-[#0057ff] shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>1. Barra de Busca</span>
          </button>

          <button
            type="button"
            onClick={() => setProductSubTab('categorias')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              productSubTab === 'categorias'
                ? 'bg-white text-[#0057ff] shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>2. Escolher Categoria</span>
            {selectedCategoryId && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setProductSubTab('produtos')}
            className={`flex-1 min-w-[180px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              productSubTab === 'produtos'
                ? 'bg-white text-[#0057ff] shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>3. Adicionar Produtos</span>
            {selectedProductCatalog ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                Puxado ✓
              </span>
            ) : null}
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: BARRA DE BUSCA COM DROPDOWN IMEDIATO EMBAIXO */}
        {/* ======================================================== */}
        {productSubTab === 'buscar' && (
          <div className="space-y-3 animate-in fade-in-50 duration-200">
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-[#0057ff]" />
                    Barra de Busca de Produtos
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Digite o que está buscando. Os produtos aparecem embaixo imediatamente. Ao selecionar, já vai para a aba produtos!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductSubTab('categorias')}
                  className="text-xs font-bold text-[#0057ff] hover:underline cursor-pointer self-start sm:self-auto"
                >
                  Prefere escolher por categoria? Clique aqui
                </button>
              </div>

              {/* Input com campo de busca */}
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  placeholder="Digite o que está buscando..."
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm font-medium text-slate-900 outline-none focus:border-[#0057ff] focus:ring-4 focus:ring-blue-500/10 shadow-xs transition-all"
                  autoFocus
                />
                {searchProductQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchProductQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Atalhos apenas botões de texto, simples e compactos, sem ícones */}
              {!searchProductQuery.trim() && (userShortcuts.categories.length > 0 || userShortcuts.products.length > 0) && (
                <div className="flex items-center gap-2 pt-1 flex-wrap animate-in fade-in-50 duration-150">
                  <span className="text-[11px] font-medium text-slate-400 select-none shrink-0">
                    Mais usados:
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Categorias mais utilizadas - apenas texto, sem ícones */}
                    {userShortcuts.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setProductSubTab('categorias');
                        }}
                        className="h-6 px-2.5 rounded-full bg-slate-100 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-300 text-slate-600 hover:text-[#0052cc] text-[11px] font-medium transition-all cursor-pointer shadow-2xs"
                        title={`Filtrar por ${cat.name}`}
                      >
                        {cat.name}
                      </button>
                    ))}

                    {/* Divisor sutil se houver categorias e produtos */}
                    {userShortcuts.categories.length > 0 && userShortcuts.products.length > 0 && (
                      <span className="text-slate-300 select-none mx-0.5">•</span>
                    )}

                    {/* Produtos reais mais frequentes e recentes do usuário - apenas texto, sem ícones */}
                    {userShortcuts.products.map((prod) => {
                      const tierPrice = getProductTierPrice(prod, priceTable);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectAndPullProduct(prod)}
                          className="h-6 px-2.5 rounded-full bg-white hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-[#0052cc] text-[11px] transition-all cursor-pointer shadow-2xs group flex items-center gap-1.5"
                          title={`Selecionar ${prod.name}`}
                        >
                          <span className="font-medium text-slate-800 group-hover:text-[#0052cc] truncate max-w-[155px]">
                            {prod.name}
                          </span>
                          <span className="text-[10px] font-semibold text-blue-600/90">
                            {formatPriceToBrl(tierPrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown / Lista suspensa de resultados embaixo da barra de busca */}
            {searchProductQuery.trim() && (
              <div className="border border-slate-200 rounded-2xl bg-white shadow-lg overflow-hidden animate-in fade-in-50 duration-150">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Resultados encontrados para "{searchProductQuery}" ({searchResults.length}):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Clique no produto desejado para selecioná-lo e ir para a Aba Produtos
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        Nenhum produto cadastrado com o termo "{searchProductQuery}".
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Você pode cadastrá-lo agora mesmo no catálogo oficial e adicioná-lo a este orçamento.
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setCadastrarInitialName(searchProductQuery);
                            setIsCadastrarProdutoModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B2046] to-[#0052cc] hover:from-[#081733] hover:to-[#0041a8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Cadastrar "{searchProductQuery}" como Novo Produto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductSubTab('categorias')}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Navegar por Categorias
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {searchResults.map((prod) => {
                        const tierPrice = getProductTierPrice(prod, priceTable);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectAndPullProduct(prod)}
                            className="p-3.5 hover:bg-blue-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900 group-hover:text-[#0057ff] transition-colors">
                                  {prod.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                                  {prod.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>Unidade: <strong className="text-slate-700">{prod.unit}</strong></span>
                                <span>•</span>
                                <span>
                                  Tabela {getOfficialPriceTableLabel(priceTable)}:{' '}
                                  <strong className="text-blue-700 font-bold">
                                    {tierPrice.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAndPullProduct(prod);
                              }}
                              className="h-9 px-4 rounded-xl bg-blue-50 group-hover:bg-[#0057ff] text-[#0057ff] group-hover:text-white font-bold text-xs flex items-center justify-center transition-all shadow-xs cursor-pointer self-end sm:self-auto"
                            >
                              <span>Puxar para Produtos</span>
                            </button>
                          </div>
                        );
                      })}

                      {/* Atalho rápido ao final da lista para novo produto */}
                      <div className="p-3 bg-slate-50 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>Não encontrou o que procura?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCadastrarInitialName(searchProductQuery);
                            setIsCadastrarProdutoModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#0052cc] font-bold border border-slate-200 shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Cadastrar Novo Produto</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: ESCOLHER CATEGORIA (Ex: Piso -> só pisos cadastrados -> puxar) */}
        {/* ======================================================== */}
        {productSubTab === 'categorias' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {!selectedCategoryId ? (
              /* Grid de seleção da Categoria */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      Escolha uma Categoria
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ao clicar em <strong>Piso</strong> por exemplo, só vai aparecer os pisos cadastrados para você escolher e puxar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {categoriesList.map((cat) => {
                    const count = dynamicCatalog.filter(
                      (p) =>
                        p.categoryId === cat.id ||
                        p.category.toLowerCase() === cat.name.toLowerCase()
                    ).length;
                    const isPiso = cat.name.toLowerCase().includes('piso');

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setCategoryFilterQuery('');
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                          isPiso
                            ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPiso
                                ? 'bg-blue-200/80 text-blue-900'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count} itens
                          </span>
                        </div>
                        <div>
                          <span
                            className={`text-xs font-bold leading-snug block line-clamp-2 ${
                              isPiso
                                ? 'text-blue-950 font-extrabold'
                                : 'text-slate-800 group-hover:text-[#0057ff]'
                            }`}
                          >
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 block group-hover:text-blue-600">
                            Ver produtos
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Exibição dos produtos da categoria selecionada (ex: só pisos cadastrados) */
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(null)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Trocar Categoria</span>
                    </button>
                    <div>
                      <span className="text-xs text-slate-500 font-medium">
                        Categoria Selecionada:
                      </span>
                      <h3 className="text-sm font-extrabold text-[#003865] flex items-center gap-2">
                        {activeCategoryObj?.name}
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                          {categoryProducts.length} produtos
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* Campo de filtro rápido dentro da categoria */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={categoryFilterQuery}
                      onChange={(e) => setCategoryFilterQuery(e.target.value)}
                      placeholder="Filtrar nesta categoria..."
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-[#0057ff]"
                    />
                  </div>
                </div>

                {/* Lista de produtos da categoria selecionada */}
                <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {categoryProducts.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <p className="text-sm text-slate-500">
                          Nenhum produto encontrado nesta categoria com o filtro atual.
                        </p>
                      </div>
                    ) : (
                      categoryProducts.map((prod) => {
                        const tierPrice = getProductTierPrice(prod, priceTable);
                        return (
                          <div
                            key={prod.id}
                            className="p-3.5 hover:bg-blue-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <span className="text-sm font-bold text-slate-900">
                                {prod.name}
                              </span>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>Unidade: <strong className="text-slate-700">{prod.unit}</strong></span>
                                <span>•</span>
                                <span>
                                  Tabela {getOfficialPriceTableLabel(priceTable)}:{' '}
                                  <strong className="text-blue-700 font-bold">
                                    {tierPrice.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectAndPullProduct(prod)}
                              className="h-9 px-4 rounded-xl bg-[#0057ff] hover:bg-[#0048db] text-white font-bold text-xs flex items-center justify-center shadow-sm shadow-blue-500/20 transition-all cursor-pointer self-end sm:self-auto"
                            >
                              <span>Puxar</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: ABA PRODUTOS (Preenchimento do Produto Puxado) */}
        {/* ======================================================== */}
        {productSubTab === 'produtos' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Banner do Produto Selecionado */}
            <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50/40 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0057ff] text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500">
                      Produto Selecionado:
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {newCategoria || 'Geral'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700">
                      Tabela: {getOfficialPriceTableLabel(priceTable)}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#003865] mt-0.5">
                    {selectedProductCatalog || 'Nenhum produto puxado'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setProductSubTab('buscar')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0057ff] text-xs font-bold border border-slate-200 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar Outro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductSubTab('categorias')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <span>Mudar Categoria</span>
                </button>
              </div>
            </div>

            {/* Banner de Edição de Produto */}
            {editingItemId && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-in fade-in-50">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="font-bold">Editando produto:</span>{' '}
                    <span className="font-semibold text-amber-950">"{selectedProductCatalog}"</span>
                    <p className="text-[11px] text-amber-700">
                      Altere os campos e clique em Salvar Alterações para atualizar este item sem criar duplicata.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors cursor-pointer shrink-0"
                >
                  Cancelar Edição
                </button>
              </div>
            )}

            {/* Formulário com SOMENTE os 5 campos principais solicitados */}
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                {/* 1. Produto / Descrição */}
                <div className="lg:col-span-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Produto / Descrição
                    </label>
                    <span className="text-[11px] text-blue-600 font-bold">
                      {newCategoria}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={selectedProductCatalog || ''}
                    onChange={(e) => setSelectedProductCatalog(e.target.value)}
                    placeholder="Nome ou descrição do produto..."
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                  />
                </div>

                {/* 2. Detalhe */}
                <div className="lg:col-span-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Detalhe
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Preenchimento manual
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newSubtitulo || ''}
                    onChange={(e) => setNewSubtitulo(e.target.value)}
                    placeholder="Ex: cor, quantidade de caixas, lote..."
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10 shadow-2xs placeholder:text-slate-400"
                    title="Preencha manualmente informações como cor, quantidade de caixas, lote, réguas, etc."
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Ex: cor, caixas, réguas, acabamento
                  </span>
                </div>

                {/* 3. Quantidade */}
                <div className="lg:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Quantidade
                  </label>
                  <input
                    type="text"
                    value={newQtd || ''}
                    onChange={(e) => setNewQtd(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white px-2 text-center text-xs sm:text-sm font-extrabold text-slate-900 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                    placeholder="1"
                  />
                  <span className="text-[10px] text-slate-500 block text-center">
                    Manual
                  </span>
                </div>

                {/* 4. Unidade */}
                <div className="lg:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={newUnid || ''}
                    onChange={(e) => setNewUnid(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-1 text-center text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-[#0057ff]"
                    title="Unidade puxada automaticamente (ex: m², un, cx, kg)"
                  />
                  <span className="text-[10px] text-blue-600 block text-center font-medium">
                    Automático
                  </span>
                </div>

                {/* 5. Preço Unitário */}
                <div className="lg:col-span-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Preço Unitário (R$)
                    </label>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Editável
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newPrecoUnitario || ''}
                    onChange={(e) => setNewPrecoUnitario(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-right text-xs sm:text-sm font-extrabold text-slate-900 outline-none focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                    title="Preço puxado da tabela oficial, você pode alterar livremente."
                  />
                  <span className="text-[10px] text-slate-500 block text-right">
                    Puxa da tabela ou digite livremente
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  O total do item é calculado automaticamente (Qtd × Preço Unitário). Ao salvar, os campos são limpos para o próximo produto.
                </p>
                <div className="flex items-center gap-2">
                  {editingItemId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`h-11 px-6 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                      editingItemId
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : 'bg-[#0057ff] hover:bg-[#0048db] shadow-blue-500/20'
                    }`}
                  >
                    {editingItemId ? (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Salvar Alterações</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Adicionar ao Orçamento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 4. ITENS DO ORÇAMENTO (Tabela Interativa de Edição) */}
      {/* ======================================================== */}
      <section className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#091122]">
              Itens do Orçamento ({items.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Você pode ajustar quantidades ou preços diretamente na tabela
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-16">Qtd</th>
                <th className="py-2.5 px-4">Descrição do Produto</th>
                <th className="py-2.5 px-3 text-center w-20">Unid</th>
                <th className="py-2.5 px-4 text-right w-28">Preço Unit.</th>
                <th className="py-2.5 px-4 text-right w-32">Total</th>
                <th className="py-2.5 px-3 text-center w-28">Posição / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-slate-400 italic"
                  >
                    Nenhum produto adicionado. Use o formulário acima.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const isEditingThis = editingItemId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors cursor-pointer ${
                        isEditingThis
                          ? 'bg-amber-50/90 ring-1 ring-amber-300'
                          : 'hover:bg-blue-50/50'
                      }`}
                      onClick={() => handleEditItem(item)}
                      title="Clique neste produto para editar no formulário acima"
                    >
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={item.qtd || ''}
                          onChange={(e) =>
                            handleItemQtdChange(item.id, e.target.value)
                          }
                          className="w-14 h-8 text-center font-bold text-slate-900 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-semibold text-slate-900 hover:text-[#0057ff] transition-colors">
                              {item.descricao}
                            </span>
                            {item.subtitulo && (
                              <span className="block text-[11px] text-slate-500 font-medium whitespace-pre-line">
                                {item.subtitulo}
                              </span>
                            )}
                            {!item.subtitulo?.includes(item.qtdDetalhe || '') && item.qtdDetalhe && (
                              <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                                {item.qtdDetalhe}
                              </span>
                            )}
                          </div>
                          {isEditingThis && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-200 text-amber-900 shrink-0">
                              Editando
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 font-medium">
                        {item.unidade}
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="text"
                            value={
                              itemPrecoDrafts[item.id] !== undefined
                                ? itemPrecoDrafts[item.id]
                                : formatPriceToBrl(item.precoUnitario)
                            }
                            onFocus={() => {
                              if (itemPrecoDrafts[item.id] === undefined) {
                                setItemPrecoDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: formatPriceToBrl(item.precoUnitario),
                                }));
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemPrecoDrafts((prev) => ({ ...prev, [item.id]: val }));
                              handleItemPrecoChange(item.id, val);
                            }}
                            onBlur={() => {
                              setItemPrecoDrafts((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            className="w-24 h-8 text-right font-extrabold text-slate-900 bg-white border border-slate-300 focus:border-[#0052cc] focus:ring-2 focus:ring-blue-500/20 rounded-lg outline-none px-2 shadow-2xs transition-all text-xs sm:text-sm"
                            title="Edite o preço unitário diretamente neste orçamento (sem alterar o catálogo)"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-[#003865]">
                        {parsePriceToNumber(item.total).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Editar este produto no formulário"
                            aria-label="Editar este produto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, 'up')}
                            disabled={index === 0}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              index === 0
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-[#0057ff] hover:bg-blue-50'
                            }`}
                            title="Mover produto para cima"
                            aria-label="Mover produto para cima"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveItem(index, 'down')}
                            disabled={index === items.length - 1}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              index === items.length - 1
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-[#0057ff] hover:bg-blue-50'
                            }`}
                            title="Mover produto para baixo"
                            aria-label="Mover produto para baixo"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer ml-1"
                            title="Remover produto do orçamento"
                            aria-label="Remover produto do orçamento"
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
      </section>

      {/* ======================================================== */}
      {/* 5. FRETE / DESCONTO / TOTAL */}
      {/* ======================================================== */}
      <section className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center font-bold text-sm">
              5
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#091122]">
              Frete, Desconto e Total
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Cálculo interno consolidado
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Configuração de Frete */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFreteEnabled}
                  onChange={(e) => setHasFreteEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0057ff] focus:ring-blue-500 cursor-pointer"
                />
                <Truck className="w-4 h-4 text-[#0057ff]" />
                <span>Incluir Frete no Orçamento</span>
              </label>
              {!hasFreteEnabled ? (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Desativado
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Ativado
                </span>
              )}
            </div>

            {!hasFreteEnabled ? (
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Frete não incluso — a calcular após fechamento.</strong> O valor não será somado ao total.
                </span>
              </div>
            ) : (
              <div className="space-y-3 pt-1 animate-in fade-in-50">
                {/* Valor do Frete (Manual) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      Valor do Frete (R$)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Digite manualmente
                    </span>
                  </div>
                  <input
                    type="text"
                    value={freteValorInput || ''}
                    onChange={(e) => setFreteValorInput(e.target.value)}
                    placeholder="150,00"
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-[#0057ff]"
                  />
                </div>

                {/* CEP com busca automática */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      CEP do Endereço de Entrega
                    </label>
                    <span className="text-[10px] text-blue-600 font-semibold">
                      Busca automática
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={freteCep || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setFreteCep(raw);
                        const digits = raw.replace(/\D/g, '');
                        if (digits.length === 8) {
                          handleSearchCep(digits);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchCep();
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#0057ff]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchCep()}
                      disabled={isSearchingCep}
                      className="h-10 px-3 rounded-lg bg-[#0057ff] hover:bg-[#0048db] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      title="Pesquisar CEP"
                    >
                      {isSearchingCep ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Buscar</span>
                    </button>
                  </div>
                </div>

                {/* Campos do Endereço auto-preenchidos e editáveis */}
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Logradouro / Endereço
                    </label>
                    <input
                      type="text"
                      value={freteLogradouro || ''}
                      onChange={(e) => {
                        setFreteLogradouro(e.target.value);
                        updateComposedAddress(
                          e.target.value,
                          freteNumero,
                          freteComplemento,
                          freteBairro,
                          freteCidade,
                          freteUf,
                          freteCep
                        );
                      }}
                      placeholder="Rua, Avenida, Alameda..."
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#0057ff]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Número
                      </label>
                      <input
                        id="frete-numero-input"
                        type="text"
                        value={freteNumero || ''}
                        onChange={(e) => {
                          setFreteNumero(e.target.value);
                          updateComposedAddress(
                            freteLogradouro,
                            e.target.value,
                            freteComplemento,
                            freteBairro,
                            freteCidade,
                            freteUf,
                            freteCep
                          );
                        }}
                        placeholder="Ex: 368"
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#0057ff]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={freteComplemento || ''}
                        onChange={(e) => {
                          setFreteComplemento(e.target.value);
                          updateComposedAddress(
                            freteLogradouro,
                            freteNumero,
                            e.target.value,
                            freteBairro,
                            freteCidade,
                            freteUf,
                            freteCep
                          );
                        }}
                        placeholder="Sala, Apto, Bloco..."
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#0057ff]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={freteBairro || ''}
                        onChange={(e) => {
                          setFreteBairro(e.target.value);
                          updateComposedAddress(
                            freteLogradouro,
                            freteNumero,
                            freteComplemento,
                            e.target.value,
                            freteCidade,
                            freteUf,
                            freteCep
                          );
                        }}
                        placeholder="Bairro"
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#0057ff]"
                      />
                    </div>
                    <div className="col-span-5 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={freteCidade || ''}
                        onChange={(e) => {
                          setFreteCidade(e.target.value);
                          updateComposedAddress(
                            freteLogradouro,
                            freteNumero,
                            freteComplemento,
                            freteBairro,
                            e.target.value,
                            freteUf,
                            freteCep
                          );
                        }}
                        placeholder="Cidade"
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-[#0057ff]"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        UF
                      </label>
                      <input
                        type="text"
                        value={freteUf || ''}
                        onChange={(e) => {
                          setFreteUf(e.target.value);
                          updateComposedAddress(
                            freteLogradouro,
                            freteNumero,
                            freteComplemento,
                            freteBairro,
                            freteCidade,
                            e.target.value,
                            freteCep
                          );
                        }}
                        placeholder="SP"
                        maxLength={2}
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-1 text-center uppercase text-xs font-bold text-slate-800 outline-none focus:border-[#0057ff]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Endereço Completo no Espelho
                    </label>
                    <input
                      type="text"
                      value={freteEndereco || ''}
                      onChange={(e) => setFreteEndereco(e.target.value)}
                      placeholder="Endereço consolidado de entrega..."
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#0057ff]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configuração de Desconto & Subtotal Oficial */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDescontoEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasDescontoEnabled(checked);
                    if (!checked) {
                      setDescontoInput('0,00');
                    }
                  }}
                  className="w-4 h-4 rounded text-[#0057ff] focus:ring-blue-500 cursor-pointer"
                />
                <Tag className="w-4 h-4 text-[#0057ff]" />
                <span>Adicionar Desconto</span>
              </label>
              {!hasDescontoEnabled ? (
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md">
                  Desativado
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Ativado
                </span>
              )}
            </div>

            {!hasDescontoEnabled ? (
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Sem desconto aplicado. O espelho exibirá apenas os produtos, frete e o total normal.
                </span>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* 1. Valor do Desconto */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      {descontoTipo === 'reais'
                        ? 'Valor do Desconto (R$)'
                        : 'Percentual do Desconto (%)'}
                    </label>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDescontoTipo('reais')}
                        className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                          descontoTipo === 'reais'
                            ? 'bg-[#0057ff] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescontoTipo('percent')}
                        className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                          descontoTipo === 'percent'
                            ? 'bg-[#0057ff] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={descontoInput || ''}
                    onChange={(e) => setDescontoInput(e.target.value)}
                    placeholder="200,00"
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-[#0057ff]"
                  />
                </div>

                {/* 2. Texto do Desconto — Totalmente Editável */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      Texto do Desconto (Frase exibida no espelho)
                    </label>
                    <span className="text-[10px] text-blue-600 font-medium">
                      Totalmente editável
                    </span>
                  </div>
                  <input
                    type="text"
                    value={descontoTexto}
                    onChange={(e) => setDescontoTexto(e.target.value)}
                    placeholder="DESCONTO ESPECIAL APLICADO:"
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#0057ff]"
                  />

                  {/* Sugestões rápidas de texto */}
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                      Sugestões rápidas (clique para aplicar):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'DESCONTO ESPECIAL APLICADO:',
                        'CONDIÇÃO ESPECIAL:',
                        'DESCONTO COMERCIAL:',
                        'DESCONTO NEGOCIADO:',
                        'DESCONTO PARA FECHAMENTO:',
                        'DESCONTO PROMOCIONAL:',
                        'CONDIÇÃO EXCLUSIVA:',
                      ].map((sugestao) => (
                        <button
                          key={sugestao}
                          type="button"
                          onClick={() => setDescontoTexto(sugestao)}
                          className={`text-[10px] px-2 py-1 rounded-md border transition-all cursor-pointer ${
                            descontoTexto === sugestao
                              ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 font-medium'
                          }`}
                        >
                          {sugestao}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nota explicativa oficial */}
                <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/80 leading-snug">
                  <strong>Regra do Espelho:</strong> O espelho exibirá o bloco verde com o texto{' '}
                  <span className="font-bold underline">{descontoTexto || 'DESCONTO ESPECIAL APLICADO:'}</span> e o valor{' '}
                  <span className="font-bold">- R$ {formatPriceToBrl(descontoValor)}</span> ao lado do bloco de{' '}
                  <span className="font-bold">SUBTOTAL</span>.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Consolidado */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-slate-600">
            {hasDescontoEnabled && descontoValor > 0 && (
              <div>
                Desconto ({descontoTexto || 'Desconto aplicado'}):{' '}
                <strong className="text-emerald-600">
                  - R$ {formatPriceToBrl(descontoValor)}
                </strong>
              </div>
            )}
            {hasFreteEnabled && (
              <div>
                Frete:{' '}
                <strong>
                  R$ {formatPriceToBrl(freteValor)}
                </strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Valor Final Consolidado:
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#003865]">
              {totalFinal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. ESPELHO OFICIAL DO ORÇAMENTO (FIDELIDADE MÁXIMA) */}
      {/* ======================================================== */}
      <section className="space-y-3">
        <div className="no-print flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057ff] flex items-center justify-center font-bold text-sm">
              6
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#091122]">
                Espelho Oficial do Orçamento
              </h2>
              <p className="text-xs text-slate-500">
                Modelo visual definitivo com reprodução fiel aprovada
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-blue-50 text-[#0057ff] text-xs font-bold border border-blue-200/60">
            Visualização em Tempo Real
          </span>
        </div>

        {/* The Exact Visual Mirror Component - Strict Landscape Format Preserved */}
        <div className="space-y-2">
          <div className="no-print sm:hidden flex items-center justify-between text-[11px] text-slate-500 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
            <span>📄 Arraste para o lado para ver o espelho oficial completo</span>
          </div>

          <div
            id="espelho-oficial-orcamento-wrapper"
            className="w-full overflow-x-auto pb-4 rounded-2xl bg-slate-100/50 p-2 sm:p-4 border border-slate-200/80 flex justify-center"
          >
            <EspelhoOrcamento
              id="espelho-oficial-orcamento"
              clientName={clientName}
              clientType={clientType}
              clientContact={clientContact}
              consultoraName={consultoraName}
              dataOrcamento={dataOrcamento}
              observacoes={observacoes}
              observacoesRodape={observacoesRodape}
              items={items}
              freteValor={hasFreteEnabled ? freteValor : 0}
              freteEndereco={hasFreteEnabled ? freteEndereco : ''}
              subtotal={subtotal}
              descontoValor={hasDescontoEnabled && descontoValor > 0 ? descontoValor : undefined}
              descontoTexto={hasDescontoEnabled && descontoValor > 0 ? (descontoTexto || 'DESCONTO ESPECIAL APLICADO:') : undefined}
              totalFinal={totalFinal}
            />
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. AÇÕES FINAIS: VISUALIZAÇÃO = IMAGEM = PDF = IMPRESSÃO */}
      {/* ======================================================== */}
      <section className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Espelho Oficial Fênix World:</strong> visualização, imagem, PDF e impressão utilizam rigorosamente o mesmo modelo.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {/* Baixar Orçamento como PDF */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="h-11 px-4 sm:px-5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Baixar orçamento como documento PDF oficial"
            >
              <FileText className="w-4 h-4" />
              <span>{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>

            {/* Baixar Orçamento como Imagem (PNG) */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadImage}
              className="h-11 px-4 sm:px-5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0057ff] font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Baixar imagem em alta resolução do espelho oficial"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting ? 'Exportando Imagem...' : 'Baixar Imagem'}
              </span>
            </button>

            {/* Imprimir Orçamento */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="h-11 px-4 sm:px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
              title="Imprimir orçamento no formato oficial A4 paisagem"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {/* Copiar Imagem do Espelho */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleCopyImageFromEditor}
              className="h-11 px-4 sm:px-5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Copiar imagem exata do espelho para área de transferência (Ctrl+V no WhatsApp)"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Imagem</span>
            </button>

            {/* Enviar pelo WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="h-11 px-4 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Enviar WhatsApp</span>
            </button>

            {/* Cancelar / Voltar para a tela anterior */}
            <button
              type="button"
              onClick={onBackToList || onBackToCadastro}
              className="h-11 px-4 sm:px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
              title="Cancelar e retornar para a tela anterior"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancelar</span>
            </button>

            {/* Salvar Orçamento */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveOrcamento}
              className="h-11 px-6 sm:px-7 rounded-xl bg-[#0057ff] hover:bg-[#0047db] text-white font-bold text-xs sm:text-sm tracking-wide flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-80"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Orçamento'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Modal de Seleção de Produtos do Catálogo */}
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        clientType={clientType || 'Cliente Geral'}
        priceTable={priceTable}
        onSelectProduct={handleSelectProductFromModal}
        onOpenCadastrarNovoProduto={(initialTerm) => {
          setIsProductModalOpen(false);
          setCadastrarInitialName(initialTerm || '');
          setIsCadastrarProdutoModalOpen(true);
        }}
      />

      {/* Modal de Cadastro de Novo Produto no Catálogo e Orçamento */}
      <ModalCadastrarNovoProdutoOrcamento
        isOpen={isCadastrarProdutoModalOpen}
        onClose={() => setIsCadastrarProdutoModalOpen(false)}
        onSuccess={handleCadastrarProdutoSuccess}
        currentUserName={currentUserName}
        initialName={cadastrarInitialName}
        priceTableTier={priceTable}
      />
    </div>
  );
};
