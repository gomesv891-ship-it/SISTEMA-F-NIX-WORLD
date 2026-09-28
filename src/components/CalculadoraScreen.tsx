import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  Calculator,
  User,
  Users,
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Tag,
  PanelTop,
  Columns3,
  Scroll,
  RotateCcw,
  FileText,
  Plus,
  Minus,
  Check,
  Pencil,
  Ruler,
  SquareDashed,
  Info,
  X,
  Package,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ClientRecord, ClientType, MaterialRow } from '../types';
import {
  getLivePisoProducts,
  getLiveRodapeProducts,
  getLiveRodapeColaProducts,
  getLiveTetoProducts,
  getLiveTetoPerfilProducts,
  getLiveRipadoProducts,
  getLiveRipadoPerfilProducts,
  getLiveRipadoColaProducts,
  getLiveMantaProducts,
  getLiveAutonivelanteProducts,
  NO_PRODUCTS_LABEL,
  formatBRL,
  parseBRLNumber,
  parsePisoVinilicoName,
  generateAllMaterialRows,
  PisoState,
  RodapeState,
  TetoState,
  RipadoState,
  MantaState,
} from '../utils/calculadoraEngine';
import {
  getProductDetailsFromCatalog,
  getPriceTierFromClientType,
  safeParsePrice,
} from '../data/productCatalog';
import { addClientActivity } from '../utils/activities';
import { filterClientsForUser } from '../utils/userDataFilter';
import { ModalRendimentos } from './calculadora/ModalRendimentos';

interface CalculadoraScreenProps {
  client: ClientRecord | null;
  onBackToCadastro: () => void;
  onGoToOrcamento?: () => void;
  onSelectClient?: (client: ClientRecord | null) => void;
  currentUserName?: string;
}

const CLIENT_TYPES: ClientType[] = [
  'Arquiteto',
  'Cliente Final',
  'Consumidor Final',
  'Construtora',
  'Distribuidor',
  'Engenheiro',
  'Instalador',
  'Revenda',
];

interface CategoryMaterialsTableProps {
  categoryName: string;
  rows: MaterialRow[];
  theme: 'blue' | 'emerald' | 'orange' | 'purple';
  onToggleInclude: (id: string) => void;
  onProductChange: (id: string, newProduct: string) => void;
  onQuantityStep: (id: string, delta: number) => void;
  onQuantityTextChange: (id: string, text: string) => void;
}

const THEME_MAP = {
  blue: {
    border: 'border-blue-100',
    headerBg: 'bg-blue-50/60',
    headerBorder: 'border-blue-100',
    iconBg: 'bg-[#0057ff] text-white',
    titleColor: 'text-[#0057ff]',
    badgeBg: 'bg-blue-100 text-[#0057ff]',
    checkActive: 'bg-[#0057ff] border-[#0057ff] text-white',
    btnStep: 'bg-blue-50 text-[#0057ff] hover:bg-blue-100',
    selectFocus: 'focus:border-[#0057ff]',
    rowHover: 'hover:bg-blue-50/20',
  },
  emerald: {
    border: 'border-emerald-100',
    headerBg: 'bg-emerald-50/60',
    headerBorder: 'border-emerald-100',
    iconBg: 'bg-emerald-600 text-white',
    titleColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    checkActive: 'bg-emerald-600 border-emerald-600 text-white',
    btnStep: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    selectFocus: 'focus:border-emerald-600',
    rowHover: 'hover:bg-emerald-50/20',
  },
  orange: {
    border: 'border-orange-100',
    headerBg: 'bg-orange-50/60',
    headerBorder: 'border-orange-100',
    iconBg: 'bg-orange-600 text-white',
    titleColor: 'text-orange-700',
    badgeBg: 'bg-orange-100 text-orange-800',
    checkActive: 'bg-orange-600 border-orange-600 text-white',
    btnStep: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    selectFocus: 'focus:border-orange-600',
    rowHover: 'hover:bg-orange-50/20',
  },
  purple: {
    border: 'border-purple-100',
    headerBg: 'bg-purple-50/60',
    headerBorder: 'border-purple-100',
    iconBg: 'bg-purple-600 text-white',
    titleColor: 'text-purple-700',
    badgeBg: 'bg-purple-100 text-purple-800',
    checkActive: 'bg-purple-600 border-purple-600 text-white',
    btnStep: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    selectFocus: 'focus:border-purple-600',
    rowHover: 'hover:bg-purple-50/20',
  },
};

const CategoryMaterialsTable: React.FC<CategoryMaterialsTableProps> = ({
  categoryName,
  rows,
  theme,
  onToggleInclude,
  onProductChange,
  onQuantityStep,
  onQuantityTextChange,
}) => {
  const styles = THEME_MAP[theme];
  const includedCount = rows.filter((r) => r.included).length;

  if (rows.length === 0) {
    return (
      <div className={`rounded-2xl border ${styles.border} p-4 text-center bg-slate-50/50 mt-4`}>
        <p className="text-xs font-semibold text-slate-500">
          Nenhum material necessário disponível para {categoryName}.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${styles.border} overflow-hidden shadow-2xs mt-4`}>
      {/* Header interno do card para materiais necessários */}
      <div
        className={`p-3.5 sm:p-4 ${styles.headerBg} border-b ${styles.headerBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0 shadow-2xs`}
          >
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-xs sm:text-sm font-bold ${styles.titleColor}`}>
                Materiais Necessários — {categoryName}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.badgeBg}`}
              >
                {includedCount} de {rows.length} incluídos
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Itens calculados para esta categoria. Ajuste produtos, inclusão e quantidades.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela dos Materiais */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-[#071a52] uppercase tracking-wider">
              <th className="py-2.5 px-3 text-center w-14 sm:w-16">Incluir</th>
              <th className="py-2.5 px-3 text-center">Produto</th>
              <th className="py-2.5 px-3 text-center w-36 sm:w-44">Quantidade</th>
              <th className="py-2.5 px-3 text-center w-20 sm:w-24">Unidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {rows.map((row) => {
              const isUnavailable =
                row.selectedProduct === NO_PRODUCTS_LABEL ||
                row.selectedProduct === 'Nenhum produto cadastrado nesta categoria.';

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${styles.rowHover} ${
                    row.included && !isUnavailable ? 'bg-white' : 'bg-slate-50/40 opacity-60'
                  }`}
                >
                  {/* Coluna 1: Checkbox Incluir */}
                  <td className="py-2.5 px-3 text-center align-middle">
                    <button
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => onToggleInclude(row.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mx-auto transition-all ${
                        isUnavailable
                          ? 'border-slate-200 bg-slate-100 cursor-not-allowed text-slate-300'
                          : row.included
                          ? `${styles.checkActive} cursor-pointer`
                          : 'border-slate-300 bg-white hover:border-slate-400 cursor-pointer'
                      }`}
                      aria-label={`Incluir ${row.selectedProduct}`}
                    >
                      {row.included && !isUnavailable && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  </td>

                  {/* Coluna 2: Produto Dropdown */}
                  <td className="py-2.5 px-3 align-middle">
                    {isUnavailable ? (
                      <div className="py-1 px-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium text-center">
                        Nenhum produto cadastrado nesta categoria.
                      </div>
                    ) : (
                      <div className="relative max-w-md mx-auto">
                        <select
                          value={row.selectedProduct}
                          onChange={(e) => onProductChange(row.id, e.target.value)}
                          className={`w-full h-8.5 rounded-xl border border-slate-200 bg-white px-2.5 pr-7 text-xs font-semibold text-[#071a52] outline-none ${styles.selectFocus} cursor-pointer appearance-none truncate`}
                        >
                          {row.productOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                      </div>
                    )}
                  </td>

                  {/* Coluna 3: Quantidade Stepper */}
                  <td className="py-2.5 px-3 text-center align-middle">
                    {isUnavailable ? (
                      <span className="text-xs font-bold text-slate-400">—</span>
                    ) : (
                      <div className="inline-flex items-center justify-center gap-1.5 border border-slate-200/90 rounded-xl px-1.5 py-0.5 bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onQuantityStep(row.id, -1)}
                          className={`w-6 h-6 rounded-lg ${styles.btnStep} flex items-center justify-center font-bold text-xs transition-colors cursor-pointer`}
                          title="Diminuir"
                        >
                          <Minus className="w-3 h-3 stroke-[2.5]" />
                        </button>

                        <input
                          type="text"
                          value={row.quantity}
                          onChange={(e) => onQuantityTextChange(row.id, e.target.value)}
                          className="w-14 sm:w-16 text-center font-bold text-xs sm:text-sm text-[#071a52] outline-none bg-transparent"
                        />

                        <button
                          type="button"
                          onClick={() => onQuantityStep(row.id, 1)}
                          className={`w-6 h-6 rounded-lg ${styles.btnStep} flex items-center justify-center font-bold text-xs transition-colors cursor-pointer`}
                          title="Aumentar"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Coluna 4: Unidade */}
                  <td className="py-2.5 px-3 text-center align-middle font-medium text-xs text-slate-500">
                    {isUnavailable ? '—' : row.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CalculadoraScreen: React.FC<CalculadoraScreenProps> = ({
  client,
  onBackToCadastro,
  onGoToOrcamento,
  onSelectClient,
  currentUserName = 'Vanessa Gomes',
}) => {
  // Clients list from local database
  const [clientsList, setClientsList] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(client?.id || '');
  const [selectedClientType, setSelectedClientType] = useState<string>(
    client?.clientType || ''
  );
  const [clientSearchQuery, setClientSearchQuery] = useState<string>(client?.name || '');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState<boolean>(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Close client dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =========================================================
  // CATEGORIES TOGGLE (ON/OFF) & EXPAND/COLLAPSE STATES
  // Inicialmente todas desligadas (false) conforme solicitado
  // =========================================================
  // 1. Piso Vinílico e Insumos
  const [catPiso, setCatPiso] = useState(false);
  const [expPiso, setExpPiso] = useState(false);

  // 2. Rodapé
  const [catRodape, setCatRodape] = useState(false);
  const [expRodape, setExpRodape] = useState(false);

  // 3. Teto Vinílico
  const [catTeto, setCatTeto] = useState(false);
  const [expTeto, setExpTeto] = useState(false);

  // 4. Ripado
  const [catRipado, setCatRipado] = useState(false);
  const [expRipado, setExpRipado] = useState(false);

  // 5. Manta Hospitalar
  const [catManta, setCatManta] = useState(false);
  const [expManta, setExpManta] = useState(false);

  // =========================================================
  // CATÁLOGO REAL E DINÂMICO (CRM / GOOGLE SHEETS)
  // =========================================================
  const livePisoProducts = useMemo(() => getLivePisoProducts(), []);
  const liveRodapeProducts = useMemo(() => getLiveRodapeProducts(), []);
  const liveTetoProducts = useMemo(() => getLiveTetoProducts(), []);
  const liveTetoPerfilProducts = useMemo(() => getLiveTetoPerfilProducts(), []);
  const liveRipadoProducts = useMemo(() => getLiveRipadoProducts(), []);
  const liveRipadoPerfilProducts = useMemo(() => getLiveRipadoPerfilProducts(), []);
  const liveRipadoColaProducts = useMemo(() => getLiveRipadoColaProducts(), []);
  const liveMantaProducts = useMemo(() => getLiveMantaProducts(), []);
  const liveAutonivelanteCatalog = useMemo(() => getLiveAutonivelanteProducts(), []);

  // =========================================================
  // 1. PISO VINÍLICO INPUTS (inicialmente sem informação)
  // =========================================================
  const [pisoProduct, setPisoProduct] = useState<string>(
    () => livePisoProducts[0]?.name || ''
  );
  const [pisoManual, setPisoManual] = useState(false);
  const [pisoManualName, setPisoManualName] = useState('');
  const [pisoInstType, setPisoInstType] = useState<'colado' | 'clicado'>('colado');
  const [incluirInsumosClicado, setIncluirInsumosClicado] = useState<boolean>(true);
  const [pisoAreaInput, setPisoAreaInput] = useState('');
  const [pisoM2BoxInput, setPisoM2BoxInput] = useState(() =>
    livePisoProducts[0]?.defaultM2PerBox
      ? formatBRL(livePisoProducts[0].defaultM2PerBox, 2)
      : '3,34'
  );

  // =========================================================
  // 2. RODAPÉ INPUTS (inicialmente sem informação)
  // =========================================================
  const [rodapeProduct, setRodapeProduct] = useState<string>(
    () => liveRodapeProducts[0]?.name || ''
  );
  const [rodapeMlInput, setRodapeMlInput] = useState('');
  const [rodapeBarLengthInput, setRodapeBarLengthInput] = useState<string>(() => {
    const prod = liveRodapeProducts[0];
    return prod?.barLengthMeters ? formatBRL(prod.barLengthMeters, 2) : '2,40';
  });

  // =========================================================
  // 3. TETO VINÍLICO INPUTS (inicialmente sem informação)
  // =========================================================
  const [tetoProduct, setTetoProduct] = useState<string>(
    () => liveTetoProducts[0] || ''
  );
  const [tetoAreaInput, setTetoAreaInput] = useState('');
  const [tetoPerfilProduct, setTetoPerfilProduct] = useState<string>(
    () => liveTetoPerfilProducts[0] || ''
  );

  // =========================================================
  // 4. RIPADO INPUTS (inicialmente sem informação)
  // =========================================================
  const [ripadoProduct, setRipadoProduct] = useState<string>(
    () => liveRipadoProducts[0]?.name || ''
  );
  const [ripadoManual, setRipadoManual] = useState(false);
  const [ripadoManualName, setRipadoManualName] = useState('');
  const [ripadoCalcMode, setRipadoCalcMode] = useState<'m2' | 'medidas'>('m2');
  const [ripadoAreaInput, setRipadoAreaInput] = useState('');
  const [ripadoWidthInput, setRipadoWidthInput] = useState('');
  const [ripadoHeightInput, setRipadoHeightInput] = useState('');
  const [ripadoPerfilProduct, setRipadoPerfilProduct] = useState<string>(
    () => liveRipadoPerfilProducts[0] || ''
  );
  const [ripadoColaProduct, setRipadoColaProduct] = useState<string>(
    () => liveRipadoColaProducts[0] || ''
  );

  // =========================================================
  // 5. MANTA HOSPITALAR INPUTS (inicialmente sem informação)
  // =========================================================
  const [mantaProduct, setMantaProduct] = useState<string>(
    () => liveMantaProducts[0] || ''
  );
  const [mantaManual, setMantaManual] = useState(false);
  const [mantaManualName, setMantaManualName] = useState('');
  const [mantaAreaInput, setMantaAreaInput] = useState('');
  const [mantaMlInput, setMantaMlInput] = useState('');

  // =========================================================
  // SHARED MATERIAL ROWS
  // =========================================================
  const [materials, setMaterials] = useState<MaterialRow[]>([]);

  // Modals & Feedback
  const [showRendimentosModal, setShowRendimentosModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sincronizar produtos de Teto Vinílico e Acabamento com o catálogo existente
  useEffect(() => {
    if (liveTetoProducts.length > 0 && (!tetoProduct || !liveTetoProducts.includes(tetoProduct))) {
      setTetoProduct(liveTetoProducts[0]);
    }
  }, [liveTetoProducts, tetoProduct]);

  useEffect(() => {
    if (liveTetoPerfilProducts.length > 0 && (!tetoPerfilProduct || !liveTetoPerfilProducts.includes(tetoPerfilProduct))) {
      setTetoPerfilProduct(liveTetoPerfilProducts[0]);
    }
  }, [liveTetoPerfilProducts, tetoPerfilProduct]);

  // Load clients from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fenix_clients_db');
      if (stored) {
        const parsed: ClientRecord[] = JSON.parse(stored);
        setClientsList(filterClientsForUser(parsed, currentUserName));
      }
    } catch {
      // fallback
    }
  }, [currentUserName]);

  // Sync client prop
  useEffect(() => {
    if (client) {
      setSelectedClientId(client.id);
      setSelectedClientType(client.clientType || 'Cliente Final');
      setClientSearchQuery(client.name);
    } else {
      setSelectedClientId('');
      setClientSearchQuery('');
    }
  }, [client]);

  const handleSelectClientRecord = (c: ClientRecord) => {
    setSelectedClientId(c.id);
    setClientSearchQuery(c.name);
    const autoType = c.clientType || 'Cliente Final';
    setSelectedClientType(autoType);
    setIsClientDropdownOpen(false);
    if (onSelectClient) onSelectClient(c);
  };

  const handleClearClientSelection = () => {
    setSelectedClientId('');
    setClientSearchQuery('');
    setIsClientDropdownOpen(false);
    if (onSelectClient) onSelectClient(null);
  };

  const filteredClientsForSearch = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList;
    const q = clientSearchQuery.toLowerCase().trim();
    return clientsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.clientType && c.clientType.toLowerCase().includes(q))
    );
  }, [clientsList, clientSearchQuery]);

  // When Piso product changes from list, auto-populate m² per box & type
  const handlePisoProductSelect = (name: string) => {
    setPisoProduct(name);
    const prod = livePisoProducts.find((p) => p.name === name);
    if (prod) {
      setPisoM2BoxInput(formatBRL(prod.defaultM2PerBox, 2));
      setPisoInstType(prod.type);
    }
  };

  // =========================================================
  // INTERNAL METRICS FOR CATEGORY SUMMARY CARDS
  // =========================================================
  // 1. Piso Vinílico
  const pisoMetrics = useMemo(() => {
    const area = parseBRLNumber(pisoAreaInput);
    const m2Box = parseBRLNumber(pisoM2BoxInput) || 3.34;
    const boxes = area > 0 ? Math.ceil(area / m2Box) : 0;
    const totalM2 = boxes * m2Box;
    return { area, m2Box, boxes, totalM2 };
  }, [pisoAreaInput, pisoM2BoxInput]);

  // 2. Rodapé
  const rodapeMetrics = useMemo(() => {
    const ml = parseBRLNumber(rodapeMlInput);
    const prod = liveRodapeProducts.find((r) => r.name === rodapeProduct) || liveRodapeProducts[0];
    const customBarLength = parseBRLNumber(rodapeBarLengthInput);
    const barLength = customBarLength > 0 ? customBarLength : (prod?.barLengthMeters || 2.4);
    const barras = ml > 0 ? Math.ceil(ml / barLength) : 0;
    const totalMl = barras * barLength;
    const colaKg = totalMl > 0 ? totalMl / 8 : 0;
    return { ml, barLength, barras, totalMl, colaKg };
  }, [rodapeMlInput, rodapeBarLengthInput, rodapeProduct, liveRodapeProducts]);

  // 3. Teto Vinílico
  // Regra interna: m² ÷ 1,19 = quantidade de réguas (arredondar para cima)
  // Depois: quantidade de réguas × 1,19 = área total
  // O valor 1,19 NÃO deve aparecer na interface!
  const tetoMetrics = useMemo(() => {
    const area = parseBRLNumber(tetoAreaInput);
    const reguas = area > 0 ? Math.ceil(area / 1.19) : 0;
    const totalArea = reguas * 1.19;
    return { areaInformada: area, reguas, totalArea };
  }, [tetoAreaInput]);

  // 4. Ripado
  const ripadoMetrics = useMemo(() => {
    const prod = liveRipadoProducts.find((r) => r.name === ripadoProduct) || liveRipadoProducts[0];
    const barArea = prod ? prod.barLengthMeters * prod.barWidthMeters : 0.34;
    let barras = 0;

    if (ripadoCalcMode === 'm2') {
      const area = parseBRLNumber(ripadoAreaInput);
      barras = area > 0 ? Math.ceil(area / barArea) : 0;
    } else {
      const w = parseBRLNumber(ripadoWidthInput);
      const h = parseBRLNumber(ripadoHeightInput);
      if (w > 0 && prod) {
        barras = Math.ceil(w / prod.barWidthMeters);
        if (h > prod.barLengthMeters) {
          barras *= Math.ceil(h / prod.barLengthMeters);
        }
      }
    }
    const tubosCola = barras > 0 ? Math.ceil(barras / 3) : 0;
    return { prod, barArea, barras, tubosCola };
  }, [
    ripadoProduct,
    ripadoCalcMode,
    ripadoAreaInput,
    ripadoWidthInput,
    ripadoHeightInput,
    liveRipadoProducts,
  ]);

  // 5. Manta Hospitalar
  const mantaMetrics = useMemo(() => {
    const area = parseBRLNumber(mantaAreaInput);
    const ml = parseBRLNumber(mantaMlInput);
    return { area, ml };
  }, [mantaAreaInput, mantaMlInput]);

  // =========================================================
  // EXECUTE CALCULATION & SYNC UNIFIED TABLE
  // =========================================================
  const executeCalculation = (keepCustom: boolean = false) => {
    const pisoState: PisoState = {
      enabled: catPiso,
      selectedProduct: pisoProduct,
      isManualProduct: pisoManual,
      manualProductName: pisoManualName,
      installationType: pisoInstType,
      incluirInsumosClicado: pisoInstType === 'clicado' ? incluirInsumosClicado : false,
      areaM2: parseBRLNumber(pisoAreaInput),
      m2PerBox: parseBRLNumber(pisoM2BoxInput) || 3.34,
    };

    const rodapeState: RodapeState = {
      enabled: catRodape,
      selectedProduct: rodapeProduct,
      metroLinear: parseBRLNumber(rodapeMlInput),
      barLength: parseBRLNumber(rodapeBarLengthInput) || 2.4,
    };

    const tetoState: TetoState = {
      enabled: catTeto,
      selectedProduct: tetoProduct,
      areaM2: parseBRLNumber(tetoAreaInput),
      selectedPerfilProduct: tetoPerfilProduct,
    };

    const ripadoState: RipadoState = {
      enabled: catRipado,
      selectedProduct: ripadoProduct,
      isManualProduct: ripadoManual,
      manualProductName: ripadoManualName,
      calcMode: ripadoCalcMode,
      areaM2: parseBRLNumber(ripadoAreaInput),
      wallWidthMeters: parseBRLNumber(ripadoWidthInput),
      wallHeightMeters: parseBRLNumber(ripadoHeightInput),
      selectedPerfilProduct: ripadoPerfilProduct,
      selectedColaProduct: ripadoColaProduct,
    };

    const mantaState: MantaState = {
      enabled: catManta,
      selectedProduct: mantaProduct,
      isManualProduct: mantaManual,
      manualProductName: mantaManualName,
      areaM2: parseBRLNumber(mantaAreaInput),
      metroLinear: parseBRLNumber(mantaMlInput),
    };

    const rows = generateAllMaterialRows(
      pisoState,
      rodapeState,
      tetoState,
      ripadoState,
      mantaState,
      keepCustom ? materials : undefined
    );

    setMaterials(rows);
  };

  // Re-run whenever category states or inputs change, keeping custom values
  useEffect(() => {
    executeCalculation(true);
  }, [
    catPiso,
    pisoProduct,
    pisoManual,
    pisoManualName,
    pisoInstType,
    incluirInsumosClicado,
    pisoAreaInput,
    pisoM2BoxInput,
    catRodape,
    rodapeProduct,
    rodapeMlInput,
    rodapeBarLengthInput,
    catTeto,
    tetoProduct,
    tetoAreaInput,
    tetoPerfilProduct,
    catRipado,
    ripadoProduct,
    ripadoManual,
    ripadoManualName,
    ripadoCalcMode,
    ripadoAreaInput,
    ripadoWidthInput,
    ripadoHeightInput,
    ripadoPerfilProduct,
    ripadoColaProduct,
    catManta,
    mantaProduct,
    mantaManual,
    mantaManualName,
    mantaAreaInput,
    mantaMlInput,
  ]);

  // Table row interactions
  const handleToggleInclude = (id: string) => {
    setMaterials((prev) =>
      prev.map((row) => (row.id === id ? { ...row, included: !row.included } : row))
    );
  };

  const handleRowProductChange = (id: string, newProduct: string) => {
    setMaterials((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (row.typeKey.includes('autonivelante') && !row.isCustomQuantity) {
          const area = row.typeKey.includes('manta')
            ? parseBRLNumber(mantaAreaInput)
            : pisoMetrics.area;
          const bags = area > 0 ? Math.ceil(area * 0.255) : 0;
          return { ...row, selectedProduct: newProduct, quantity: String(bags) };
        }
        return { ...row, selectedProduct: newProduct };
      })
    );
  };

  const handleQuantityStep = (id: string, delta: number) => {
    setMaterials((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        if (row.quantity === '—') {
          return {
            ...row,
            quantity: delta > 0 ? '1' : '0',
            isCustomQuantity: true,
          };
        }

        const currentVal = parseBRLNumber(row.quantity);
        const isDecimal = row.unit === 'm²' || row.unit === 'metros';
        const step = isDecimal ? 1 : 1;
        const nextVal = Math.max(0, currentVal + delta * step);

        return {
          ...row,
          quantity: isDecimal ? formatBRL(nextVal, 2) : String(Math.round(nextVal)),
          isCustomQuantity: true,
        };
      })
    );
  };

  const handleQuantityTextChange = (id: string, text: string) => {
    setMaterials((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, quantity: text, isCustomQuantity: true } : row
      )
    );
  };

  // Recalculate button handler
  const handleRecalculate = () => {
    executeCalculation(false);
    showToast('Materiais recalculados com sucesso com base nas metragens.');
  };

  // Bottom action: Limpar
  const handleClear = () => {
    setPisoAreaInput('');
    setPisoManual(false);
    setPisoManualName('');
    setRodapeMlInput('');
    setTetoAreaInput('');
    setRipadoAreaInput('');
    setRipadoWidthInput('');
    setRipadoHeightInput('');
    setRipadoManual(false);
    setRipadoManualName('');
    setMantaAreaInput('');
    setMantaMlInput('');
    setMantaManual(false);
    setMantaManualName('');

    setCatPiso(false);
    setExpPiso(false);
    setCatRodape(false);
    setExpRodape(false);
    setCatTeto(false);
    setExpTeto(false);
    setCatRipado(false);
    setExpRipado(false);
    setCatManta(false);
    setExpManta(false);

    setMaterials([]);
    showToast('Calculadora reiniciada. Todas as categorias desligadas.');
  };

  // Bottom action: Calcular materiais
  const handleCalculateMaterials = () => {
    executeCalculation(false);
    showToast('Cálculo de materiais executado com sucesso!');
  };

  // Bottom action: Adicionar ao orçamento
  const handleAddToBudget = () => {
    // Filtrar apenas itens marcados com 'included' e que possuam produto válido
    const includedItems = materials.filter(
      (m) =>
        m.included &&
        m.selectedProduct &&
        m.selectedProduct !== NO_PRODUCTS_LABEL &&
        m.selectedProduct !== 'Nenhum produto cadastrado nesta categoria.'
    );

    if (includedItems.length === 0) {
      showToast('Selecione ao menos um produto válido marcado em "Incluir" para adicionar ao orçamento.');
      return;
    }

    const currentClient = selectedClientId
      ? clientsList.find((c) => c.id === selectedClientId) || (client?.id === selectedClientId ? client : null)
      : null;

    const targetClientType = selectedClientType || currentClient?.clientType || 'Cliente Final';
    const tier = getPriceTierFromClientType(targetClientType);

    // Determine which categories are active
    const activeCategories: string[] = [];
    if (catPiso) activeCategories.push('Piso Vinílico');
    if (catRodape) activeCategories.push('Rodapé');
    if (catTeto) activeCategories.push('Teto Vinílico');
    if (catRipado) activeCategories.push('Ripado');
    if (catManta) activeCategories.push('Manta Hospitalar');

    const draft = {
      clientId: currentClient?.id || null,
      clientName: currentClient?.name || '',
      clientType: targetClientType,
      category: activeCategories.join(', ') || 'Calculadora Geral',
      observacoes: '',
      items: includedItems.map((item) => {
        const details = getProductDetailsFromCatalog(item.selectedProduct, tier);
        const preco = safeParsePrice(details.price);

        // Regra Especial e Definitiva para Piso Vinílico vindo da calculadora:
        // A fórmula do Piso Vinílico deve ser EXATAMENTE:
        // QUANTIDADE DE CAIXAS: Math.ceil(m2Necessarios / m2PorCaixa)
        // M² TOTAL COMPRADO: quantidadeCaixas * m2PorCaixa
        //
        // EXEMPLO OBRIGATÓRIO:
        // M² necessários: 60
        // M² por caixa: 5,70
        // 60 ÷ 5,70 = 10,5263... -> Math.ceil = 11 caixas
        // 11 × 5,70 = 62,70 m²
        //
        // Portanto:
        // QTD no orçamento: 62,70
        // UNID: m²
        // Detalhe na descrição: 11 CAIXAS
        //
        // IMPORTANTE:
        // - Nunca arredondar os 60 m² antes de calcular as caixas.
        // - Sempre calcular caixas com Math.ceil().
        // - O M² do orçamento é o total das caixas.
        // - Não lançar o Piso Vinílico como "11 caixas" na quantidade principal.
        // - "11 CAIXAS" aparece somente como detalhe dentro da área da descrição.
        // - Não colocar "11 CAIXAS" na coluna QTD.
        // - Não colocar "11 CAIXAS" em Observações.
        if (item.typeKey === 'piso' || item.id === 'mat_piso_prod') {
          const m2Necessarios = parseBRLNumber(pisoAreaInput);
          const m2PorCaixa = parseBRLNumber(pisoM2BoxInput) || (pisoMetrics.m2Box > 0 ? pisoMetrics.m2Box : 3.34);
          const boxes = item.isCustomQuantity
            ? (parseBRLNumber(item.quantity) || (m2Necessarios > 0 && m2PorCaixa > 0 ? Math.ceil(m2Necessarios / m2PorCaixa) : 0))
            : (m2Necessarios > 0 && m2PorCaixa > 0 ? Math.ceil(m2Necessarios / m2PorCaixa) : (pisoMetrics.boxes || 0));
          const totalM2Comprado = boxes * m2PorCaixa;
          const qtdFormatada = formatBRL(totalM2Comprado, 2);
          const caixasTexto = `${boxes} ${boxes === 1 ? 'CAIXA' : 'CAIXAS'}`;

          const { mainTitle, specSubtitle } = parsePisoVinilicoName(item.selectedProduct);
          const baseSub = specSubtitle || details.defaultSubtitle || '';
          const subtituloComCaixas = baseSub ? `${baseSub}\n${caixasTexto}` : caixasTexto;

          return {
            product: mainTitle || item.selectedProduct,
            quantity: qtdFormatada,
            unit: 'm²',
            precoUnitario: preco,
            subtitulo: subtituloComCaixas,
            observacao: '',
          };
        }

        return {
          product: item.selectedProduct,
          quantity: item.quantity,
          unit: item.unit || details.unit || 'unidades',
          precoUnitario: preco,
          subtitulo: details.defaultSubtitle || '',
          observacao: '',
        };
      }),
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem('fenix_orcamento_draft', JSON.stringify(draft));
    } catch (err) {
      console.error('Erro ao salvar rascunho de orçamento:', err);
    }

    // Register calculation in client history if client exists
    if (currentClient?.id) {
      addClientActivity({
        clientId: currentClient.id,
        type: 'calculo_realizado',
        title: `Cálculo de Materiais (${activeCategories.join(', ')})`,
        description: `Cálculo executado para as categorias: ${activeCategories.join(
          ', '
        )} com ${includedItems.length} materiais selecionados.`,
        date: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        relevantInfo: `Itens: ${includedItems
          .map((i) => `${i.selectedProduct}: ${i.quantity} ${i.unit}`)
          .join('; ')}`,
      });
    }

    if (onSelectClient && currentClient) {
      onSelectClient(currentClient);
    }

    showToast('Materiais adicionados ao Novo Orçamento com sucesso!');

    if (onGoToOrcamento) {
      setTimeout(() => {
        onGoToOrcamento();
      }, 400);
    }
  };

  const hasAnyCategoryActive =
    catPiso || catRodape || catTeto || catRipado || catManta;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#071a52] text-white px-5 py-3 rounded-2xl shadow-xl border border-blue-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =======================================================
          BREADCRUMB
         ======================================================= */}
      <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
        <Home className="w-4 h-4 text-[#0057ff]" />
        <span className="text-slate-300">›</span>
        <button
          type="button"
          onClick={onBackToCadastro}
          className="text-slate-600 hover:text-[#0057ff] cursor-pointer transition-colors"
        >
          Calculadora
        </button>
        <span className="text-slate-300">›</span>
        <span className="text-[#071a52] font-semibold">
          Calculadora de Materiais
        </span>
      </nav>

      {/* =======================================================
          PAGE TITLE ROW
         ======================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#0057ff] text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Calculator className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0057ff] tracking-tight">
              Calculadora de Materiais
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
              Calcule os materiais necessários para o seu projeto e adicione ao orçamento.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRendimentosModal(true)}
          className="self-start sm:self-center h-10 px-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-[#0057ff] font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          title="Cadastrar e gerenciar rendimentos técnicos da calculadora"
        >
          <Layers className="w-4 h-4 text-[#0057ff]" />
          <span>Rendimentos</span>
        </button>
      </div>

      {/* =======================================================
          MAIN CALCULATOR CONTAINER
         ======================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
        {/* =======================================================
            TOP ROW: CLIENTE (OPCIONAL) & TIPO DE CLIENTE
           ======================================================= */}
        {/* =======================================================
            TOP ROW: CLIENTE (BUSCA DIGITÁVEL) & TIPO DE CLIENTE
           ======================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
          {/* Campo Cliente (Digitável para localizar) */}
          <div className="space-y-1.5" ref={clientDropdownRef}>
            <label className="flex items-center gap-2 text-xs font-bold text-[#071a52] uppercase tracking-wider">
              <User className="w-4 h-4 text-[#0057ff]" />
              <span>Cliente (Opcional - Digite para localizar)</span>
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
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff] transition-all"
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
                            isSelected ? 'bg-blue-50/70 font-semibold text-[#0057ff]' : 'text-slate-800'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-medium">
                              {c.name} {c.isImportant ? '★' : ''}
                            </span>
                            {c.phone || c.whatsapp ? (
                              <span className="text-[11px] text-slate-400">
                                {c.phone || c.whatsapp}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                            {c.clientType || 'Cliente Final'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Campo Tipo de Cliente (Preenchido automaticamente) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold text-[#071a52] uppercase tracking-wider">
              <Users className="w-4 h-4 text-[#0057ff]" />
              <span>Tipo de Cliente</span>
            </label>
            <div className="relative">
              <select
                value={selectedClientType || 'Cliente Final'}
                onChange={(e) => setSelectedClientType(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff] transition-all cursor-pointer appearance-none"
              >
                {CLIENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* =======================================================
            AS 5 CATEGORIAS DE CALCULADORAS COM TOGGLES E ACCORDION
            1. Piso Vinílico e Insumos (Azul)
            2. Rodapé (Verde)
            3. Teto Vinílico (Laranja)
            4. Ripado (Roxo)
            5. Manta Hospitalar (Azul / Turquesa)
           ======================================================= */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          {/* =====================================================
              1. PISO VINÍLICO E INSUMOS
             ===================================================== */}
          <div
            className={`border rounded-2xl transition-all duration-200 ${
              catPiso
                ? 'border-blue-300 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/40'
            }`}
          >
            {/* Header da Categoria */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Toggle switch azul */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !catPiso;
                    setCatPiso(next);
                    if (next && !expPiso) setExpPiso(true);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                    catPiso ? 'bg-[#0057ff]' : 'bg-slate-300'
                  }`}
                  aria-label="Alternar Piso Vinílico"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      catPiso ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>

                {/* Ícone vetorial azul */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    catPiso
                      ? 'bg-blue-50 text-[#0057ff] border border-blue-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Layers className="w-5 h-5 stroke-[2]" />
                </div>

                <div>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      catPiso ? 'text-[#071a52]' : 'text-slate-600'
                    }`}
                  >
                    Piso Vinílico e Insumos
                  </span>
                  {catPiso && pisoMetrics.boxes > 0 && (
                    <span className="hidden sm:inline-block ml-3 text-xs font-semibold text-[#0057ff] bg-blue-50 px-2 py-0.5 rounded-md">
                      {pisoMetrics.boxes} caixas ({formatBRL(pisoMetrics.totalM2, 2)} m²)
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpPiso(!expPiso)}
                className="p-1.5 text-slate-400 hover:text-[#0057ff] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Expandir ou recolher Piso Vinílico"
              >
                {expPiso ? (
                  <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Conteúdo Expandido do Piso Vinílico */}
            {expPiso && (
              <div className="px-5 pb-6 pt-1 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
                {/* Seleção do Produto de Piso */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#0057ff] uppercase tracking-wider">
                    Produto de Piso Vinílico
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      {pisoManual ? (
                        <input
                          type="text"
                          value={pisoManualName}
                          onChange={(e) => setPisoManualName(e.target.value)}
                          placeholder="Digite o nome do produto de piso vinílico..."
                          className="w-full h-11 rounded-xl border border-blue-300 bg-white px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff]"
                        />
                      ) : livePisoProducts.length === 0 ? (
                        <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Nenhum produto cadastrado nesta categoria.</span>
                        </div>
                      ) : (
                        <select
                          value={pisoProduct}
                          onChange={(e) => handlePisoProductSelect(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff] cursor-pointer appearance-none"
                        >
                          {livePisoProducts.map((prod) => (
                            <option key={prod.name} value={prod.name}>
                              {prod.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {!pisoManual && livePisoProducts.length > 0 && (
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      )}
                    </div>

                    <span className="text-xs font-medium text-slate-400 text-center sm:text-left">
                      ou
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setPisoManual(!pisoManual);
                        if (!pisoManual && !pisoManualName) {
                          setPisoManualName(pisoProduct);
                        }
                      }}
                      className="h-11 px-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-50 text-[#0057ff] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>
                        {pisoManual ? 'Selecionar da lista' : 'Preencher manualmente'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Tipo de Instalação: Colado / Clicado */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#071a52] uppercase tracking-wider">
                    Tipo de instalação
                  </label>
                  <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                    <button
                      type="button"
                      onClick={() => setPisoInstType('colado')}
                      className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        pisoInstType === 'colado'
                          ? 'bg-[#0057ff] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Colado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPisoInstType('clicado')}
                      className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        pisoInstType === 'clicado'
                          ? 'bg-[#0057ff] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Clicado
                    </button>
                  </div>
                </div>

                {/* Pergunta oficial para Piso Vinílico Clicado: "Incluir Insumos? SIM / NÃO" */}
                {pisoInstType === 'clicado' && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#071a52] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#0057ff]" />
                        <span>Incluir Insumos?</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Deseja calcular também os insumos de preparação (autonivelante e primer) para o piso clicado?
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl p-1 bg-white border border-blue-200 shadow-2xs gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setIncluirInsumosClicado(true)}
                        className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          incluirInsumosClicado
                            ? 'bg-[#0057ff] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncluirInsumosClicado(false)}
                        className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !incluirInsumosClicado
                            ? 'bg-[#071a52] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>
                )}

                {/* Metragem do Ambiente & m² por caixa */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Metragem do ambiente (m²) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071a52] flex items-center gap-1.5">
                      <span>Metragem do ambiente (m²)</span>
                      <span
                        title="Área em m² do piso a ser instalado"
                        className="cursor-help"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                      </span>
                    </label>
                    <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 focus-within:border-[#0057ff] focus-within:ring-1 focus-within:ring-[#0057ff] px-4 flex items-center justify-between transition-all">
                      <SquareDashed className="w-5 h-5 text-[#0057ff] stroke-[2]" />
                      <input
                        type="text"
                        value={pisoAreaInput}
                        onChange={(e) => setPisoAreaInput(e.target.value)}
                        placeholder="0,00"
                        className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        m²
                      </span>
                    </div>
                  </div>

                  {/* m² por caixa */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071a52] flex items-center gap-1.5">
                      <span>m² por caixa</span>
                      <span
                        title="Rendimento de cada caixa do piso selecionado"
                        className="cursor-help"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                      </span>
                    </label>
                    <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 focus-within:border-[#0057ff] focus-within:ring-1 focus-within:ring-[#0057ff] px-4 flex items-center justify-between transition-all">
                      <Package className="w-5 h-5 text-[#0057ff] stroke-[2]" />
                      <input
                        type="text"
                        value={pisoM2BoxInput}
                        onChange={(e) => setPisoM2BoxInput(e.target.value)}
                        placeholder="3,34"
                        className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        m²/cx
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumo Elegante na Seção */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Quantidade de caixas:
                    </span>
                    <span className="text-base font-extrabold text-[#0057ff]">
                      {pisoMetrics.boxes > 0 ? `${pisoMetrics.boxes} caixas` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      m² total:
                    </span>
                    <span className="text-base font-extrabold text-[#0057ff]">
                      {pisoMetrics.totalM2 > 0 ? `${formatBRL(pisoMetrics.totalM2, 2)} m²` : '—'}
                    </span>
                  </div>
                </div>

                {/* Materiais Necessários do Piso Vinílico dentro do Card */}
                {pisoInstType === 'clicado' ? (
                  <div className="space-y-4">
                    <CategoryMaterialsTable
                      categoryName="Piso Vinílico Clicado"
                      rows={materials.filter((m) => m.id === 'mat_piso_prod')}
                      theme="blue"
                      onToggleInclude={handleToggleInclude}
                      onProductChange={handleRowProductChange}
                      onQuantityStep={handleQuantityStep}
                      onQuantityTextChange={handleQuantityTextChange}
                    />

                    {incluirInsumosClicado && (
                      <CategoryMaterialsTable
                        categoryName="Insumos (Preparação para Clicado)"
                        rows={materials.filter((m) => m.id.startsWith('mat_piso_') && m.id !== 'mat_piso_prod')}
                        theme="blue"
                        onToggleInclude={handleToggleInclude}
                        onProductChange={handleRowProductChange}
                        onQuantityStep={handleQuantityStep}
                        onQuantityTextChange={handleQuantityTextChange}
                      />
                    )}
                  </div>
                ) : (
                  <CategoryMaterialsTable
                    categoryName="Piso Vinílico"
                    rows={materials.filter((m) => m.id.startsWith('mat_piso_'))}
                    theme="blue"
                    onToggleInclude={handleToggleInclude}
                    onProductChange={handleRowProductChange}
                    onQuantityStep={handleQuantityStep}
                    onQuantityTextChange={handleQuantityTextChange}
                  />
                )}
              </div>
            )}
          </div>

          {/* =====================================================
              2. RODAPÉ
             ===================================================== */}
          <div
            className={`border rounded-2xl transition-all duration-200 ${
              catRodape
                ? 'border-emerald-300 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/40'
            }`}
          >
            {/* Header da Categoria */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Toggle switch verde */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !catRodape;
                    setCatRodape(next);
                    if (next && !expRodape) setExpRodape(true);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                    catRodape ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  aria-label="Alternar Rodapé"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      catRodape ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>

                {/* Ícone vetorial verde */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    catRodape
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Tag className="w-5 h-5 stroke-[2]" />
                </div>

                <div>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      catRodape ? 'text-[#071a52]' : 'text-slate-600'
                    }`}
                  >
                    Rodapé
                  </span>
                  {catRodape && rodapeMetrics.barras > 0 && (
                    <span className="hidden sm:inline-block ml-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {rodapeMetrics.barras} barras ({rodapeMlInput} ml)
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpRodape(!expRodape)}
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Expandir ou recolher Rodapé"
              >
                {expRodape ? (
                  <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Conteúdo Expandido do Rodapé */}
            {expRodape && (
              <div className="px-5 pb-6 pt-1 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
                {/* Seleção do Produto de Rodapé */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Produto de Rodapé
                  </label>
                  <div className="relative">
                    {liveRodapeProducts.length === 0 ? (
                      <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Nenhum produto cadastrado nesta categoria.</span>
                      </div>
                    ) : (
                      <>
                        <select
                          value={rodapeProduct}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setRodapeProduct(newName);
                            const found = liveRodapeProducts.find((r) => r.name === newName);
                            if (found && found.barLengthMeters) {
                              setRodapeBarLengthInput(formatBRL(found.barLengthMeters, 2));
                            }
                          }}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none"
                        >
                          {liveRodapeProducts.map((prod) => (
                            <option key={prod.name} value={prod.name}>
                              {prod.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      </>
                    )}
                  </div>
                </div>

                {/* Metragem Linear e Tamanho da Barra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Metragem linear (ml) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071a52] flex items-center gap-1.5">
                      <span>Metragem linear (ml)</span>
                      <span
                        title="Comprimento linear total do perímetro do rodapé"
                        className="cursor-help"
                      >
                        <Info className="w-3.5 h-3.5 text-emerald-500" />
                      </span>
                    </label>
                    <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 px-4 flex items-center justify-between transition-all">
                      <Ruler className="w-5 h-5 text-emerald-600 stroke-[2]" />
                      <input
                        type="text"
                        value={rodapeMlInput}
                        onChange={(e) => setRodapeMlInput(e.target.value)}
                        placeholder="0,00"
                        className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        ml
                      </span>
                    </div>
                  </div>

                  {/* Tamanho da Barra (m) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071a52] flex items-center gap-1.5">
                      <span>Tamanho da barra (m)</span>
                      <span
                        title="Comprimento de cada barra de rodapé (em metros)"
                        className="cursor-help"
                      >
                        <Info className="w-3.5 h-3.5 text-emerald-500" />
                      </span>
                    </label>
                    <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 px-4 flex items-center justify-between transition-all">
                      <Ruler className="w-5 h-5 text-emerald-600 stroke-[2]" />
                      <input
                        type="text"
                        value={rodapeBarLengthInput}
                        onChange={(e) => setRodapeBarLengthInput(e.target.value)}
                        placeholder="2,40"
                        className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumo Elegante na Seção */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Tamanho barra:
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {formatBRL(rodapeMetrics.barLength, 2)} m
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Qtd. barras:
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {rodapeMetrics.barras > 0 ? `${rodapeMetrics.barras}` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      ml total:
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {rodapeMetrics.totalMl > 0 ? `${formatBRL(rodapeMetrics.totalMl, 2)} ml` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Quantidade de cola necessária:
                    </span>
                    <span className="text-base font-extrabold text-emerald-800">
                      {rodapeMetrics.totalMl > 0 ? `${formatBRL(rodapeMetrics.colaKg, 2)} kg` : '—'}
                    </span>
                  </div>
                </div>

                {/* Materiais Necessários do Rodapé dentro do Card */}
                <CategoryMaterialsTable
                  categoryName="Rodapé"
                  rows={materials.filter((m) => m.id.startsWith('mat_rodape_'))}
                  theme="emerald"
                  onToggleInclude={handleToggleInclude}
                  onProductChange={handleRowProductChange}
                  onQuantityStep={handleQuantityStep}
                  onQuantityTextChange={handleQuantityTextChange}
                />
              </div>
            )}
          </div>

          {/* =====================================================
              3. TETO VINÍLICO
             ===================================================== */}
          <div
            className={`border rounded-2xl transition-all duration-200 ${
              catTeto
                ? 'border-orange-300 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/40'
            }`}
          >
            {/* Header da Categoria */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Toggle switch laranja */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !catTeto;
                    setCatTeto(next);
                    if (next && !expTeto) setExpTeto(true);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                    catTeto ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                  aria-label="Alternar Teto Vinílico"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      catTeto ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>

                {/* Ícone vetorial laranja */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    catTeto
                      ? 'bg-orange-50 text-orange-600 border border-orange-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <PanelTop className="w-5 h-5 stroke-[2]" />
                </div>

                <div>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      catTeto ? 'text-[#071a52]' : 'text-slate-600'
                    }`}
                  >
                    Teto Vinílico
                  </span>
                  {catTeto && tetoMetrics.reguas > 0 && (
                    <span className="hidden sm:inline-block ml-3 text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                      {tetoMetrics.reguas} réguas ({formatBRL(tetoMetrics.totalArea, 2)} m²)
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpTeto(!expTeto)}
                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Expandir ou recolher Teto Vinílico"
              >
                {expTeto ? (
                  <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Conteúdo Expandido do Teto Vinílico */}
            {expTeto && (
              <div className="px-5 pb-6 pt-1 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
                {/* Seleção de Produtos: Teto e Perfil de Acabamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Produto de Teto Vinílico */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-orange-700 uppercase tracking-wider">
                      Produto de Teto Vinílico
                    </label>
                    <div className="relative">
                      {liveTetoProducts.length === 0 ? (
                        <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Nenhum produto cadastrado nesta categoria.</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={tetoProduct}
                            onChange={(e) => setTetoProduct(e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer appearance-none"
                          >
                            {liveTetoProducts.map((prod) => (
                              <option key={prod} value={prod}>
                                {prod}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Perfil de Acabamento selecionável por dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-orange-700 uppercase tracking-wider">
                      Perfil de Acabamento
                    </label>
                    <div className="relative">
                      {liveTetoPerfilProducts.length === 0 ? (
                        <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Nenhum produto cadastrado nesta categoria.</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={tetoPerfilProduct}
                            onChange={(e) => setTetoPerfilProduct(e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer appearance-none"
                          >
                            {liveTetoPerfilProducts.map((perfil) => (
                              <option key={perfil} value={perfil}>
                                {perfil}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metragem do Ambiente (m²) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#071a52] flex items-center gap-1.5">
                    <span>Metragem do ambiente (m²)</span>
                    <span
                      title="Área total em m² da superfície do teto"
                      className="cursor-help"
                    >
                      <Info className="w-3.5 h-3.5 text-orange-400" />
                    </span>
                  </label>
                  <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 px-4 flex items-center justify-between transition-all">
                    <SquareDashed className="w-5 h-5 text-orange-500 stroke-[2]" />
                    <input
                      type="text"
                      value={tetoAreaInput}
                      onChange={(e) => setTetoAreaInput(e.target.value)}
                      placeholder="0,00"
                      className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                    />
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      m²
                    </span>
                  </div>
                </div>

                {/* Resumo Elegante na Seção (Apenas Metragem informada, Quantidade de réguas, Área total) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Metragem informada:
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-orange-700">
                      {tetoMetrics.areaInformada > 0 ? `${formatBRL(tetoMetrics.areaInformada, 2)} m²` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Quantidade de réguas:
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-orange-700">
                      {tetoMetrics.reguas > 0 ? `${tetoMetrics.reguas} réguas` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Área total:
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-orange-700">
                      {tetoMetrics.totalArea > 0 ? `${formatBRL(tetoMetrics.totalArea, 2)} m²` : '—'}
                    </span>
                  </div>
                </div>

                {/* Materiais Necessários do Teto Vinílico dentro do Card */}
                <CategoryMaterialsTable
                  categoryName="Teto Vinílico"
                  rows={materials.filter((m) => m.id.startsWith('mat_teto_'))}
                  theme="orange"
                  onToggleInclude={handleToggleInclude}
                  onProductChange={handleRowProductChange}
                  onQuantityStep={handleQuantityStep}
                  onQuantityTextChange={handleQuantityTextChange}
                />
              </div>
            )}
          </div>

          {/* =====================================================
              4. RIPADO
             ===================================================== */}
          <div
            className={`border rounded-2xl transition-all duration-200 ${
              catRipado
                ? 'border-purple-300 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/40'
            }`}
          >
            {/* Header da Categoria */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Toggle switch roxo */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !catRipado;
                    setCatRipado(next);
                    if (next && !expRipado) setExpRipado(true);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                    catRipado ? 'bg-purple-600' : 'bg-slate-300'
                  }`}
                  aria-label="Alternar Ripado"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      catRipado ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>

                {/* Ícone vetorial roxo */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    catRipado
                      ? 'bg-purple-50 text-purple-600 border border-purple-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Columns3 className="w-5 h-5 stroke-[2]" />
                </div>

                <div>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      catRipado ? 'text-[#071a52]' : 'text-slate-600'
                    }`}
                  >
                    Ripado
                  </span>
                  {catRipado && ripadoMetrics.barras > 0 && (
                    <span className="hidden sm:inline-block ml-3 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {ripadoMetrics.barras} barras
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpRipado(!expRipado)}
                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Expandir ou recolher Ripado"
              >
                {expRipado ? (
                  <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Conteúdo Expandido do Ripado */}
            {expRipado && (
              <div className="px-5 pb-6 pt-1 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
                {/* Seleção do Produto de Ripado */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Produto de Painel Ripado
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      {ripadoManual ? (
                        <input
                          type="text"
                          value={ripadoManualName}
                          onChange={(e) => setRipadoManualName(e.target.value)}
                          placeholder="Digite o nome do ripado personalizado..."
                          className="w-full h-11 rounded-xl border border-purple-300 bg-white px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                        />
                      ) : liveRipadoProducts.length === 0 ? (
                        <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Nenhum produto cadastrado nesta categoria.</span>
                        </div>
                      ) : (
                        <select
                          value={ripadoProduct}
                          onChange={(e) => setRipadoProduct(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 cursor-pointer appearance-none"
                        >
                          {liveRipadoProducts.map((prod) => (
                            <option key={prod.name} value={prod.name}>
                              {prod.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {!ripadoManual && liveRipadoProducts.length > 0 && (
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      )}
                    </div>

                    <span className="text-xs font-medium text-slate-400 text-center sm:text-left">
                      ou
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setRipadoManual(!ripadoManual);
                        if (!ripadoManual && !ripadoManualName) {
                          setRipadoManualName(ripadoProduct);
                        }
                      }}
                      className="h-11 px-4 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-50 text-purple-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>
                        {ripadoManual ? 'Selecionar da lista' : 'Preencher manualmente'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Perfil de Acabamento & Cola para Ripado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Perfil de Acabamento */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#071a52] uppercase tracking-wider">
                      Perfil de Acabamento
                    </label>
                    <div className="relative">
                      {liveRipadoPerfilProducts.length === 0 ? (
                        <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Nenhum produto cadastrado nesta categoria.</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={ripadoPerfilProduct}
                            onChange={(e) => setRipadoPerfilProduct(e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 cursor-pointer appearance-none"
                          >
                            {liveRipadoPerfilProducts.map((perfil) => (
                              <option key={perfil} value={perfil}>
                                {perfil}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cola para Ripado */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#071a52] uppercase tracking-wider">
                      Cola para Ripado
                    </label>
                    <div className="relative">
                      {liveRipadoColaProducts.length === 0 ? (
                        <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Nenhum produto cadastrado nesta categoria.</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={ripadoColaProduct}
                            onChange={(e) => setRipadoColaProduct(e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 cursor-pointer appearance-none"
                          >
                            {liveRipadoColaProducts.map((cola) => (
                              <option key={cola} value={cola}>
                                {cola}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modo de Cálculo: Por m² ou Por Medidas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#071a52] uppercase tracking-wider">
                      Modo de cálculo
                    </label>
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                      <button
                        type="button"
                        onClick={() => setRipadoCalcMode('m2')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          ripadoCalcMode === 'm2'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Por m²
                      </button>
                      <button
                        type="button"
                        onClick={() => setRipadoCalcMode('medidas')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          ripadoCalcMode === 'medidas'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Por medidas (L × A)
                      </button>
                    </div>
                  </div>

                  {ripadoCalcMode === 'm2' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#071a52]">
                        Área do painel ripado (m²)
                      </label>
                      <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-purple-300 focus-within:border-purple-600 focus-within:ring-1 focus-within:ring-purple-600 px-4 flex items-center justify-between transition-all">
                        <SquareDashed className="w-5 h-5 text-purple-600 stroke-[2]" />
                        <input
                          type="text"
                          value={ripadoAreaInput}
                          onChange={(e) => setRipadoAreaInput(e.target.value)}
                          placeholder="0,00"
                          className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                        />
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          m²
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#071a52]">
                          Largura da parede (m)
                        </label>
                        <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-purple-300 focus-within:border-purple-600 focus-within:ring-1 focus-within:ring-purple-600 px-4 flex items-center justify-between transition-all">
                          <Ruler className="w-5 h-5 text-purple-600 stroke-[2]" />
                          <input
                            type="text"
                            value={ripadoWidthInput}
                            onChange={(e) => setRipadoWidthInput(e.target.value)}
                            placeholder="3,60"
                            className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                          />
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            m
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#071a52]">
                          Altura do pé-direito (m)
                        </label>
                        <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-purple-300 focus-within:border-purple-600 focus-within:ring-1 focus-within:ring-purple-600 px-4 flex items-center justify-between transition-all">
                          <Ruler className="w-5 h-5 text-purple-600 stroke-[2]" />
                          <input
                            type="text"
                            value={ripadoHeightInput}
                            onChange={(e) => setRipadoHeightInput(e.target.value)}
                            placeholder="2,70"
                            className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                          />
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            m
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumo Elegante na Seção */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Dimensões da barra:
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-purple-700">
                      {formatBRL(ripadoMetrics.prod.barLengthMeters, 2)} m ×{' '}
                      {Math.round(ripadoMetrics.prod.barWidthMeters * 100)} cm
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Quantidade de barras:
                    </span>
                    <span className="text-base font-extrabold text-purple-700">
                      {ripadoMetrics.barras > 0 ? `${ripadoMetrics.barras} barras` : '—'}
                    </span>
                  </div>
                </div>

                {/* Materiais Necessários do Ripado dentro do Card */}
                <CategoryMaterialsTable
                  categoryName="Ripado"
                  rows={materials.filter((m) => m.id.startsWith('mat_ripado_'))}
                  theme="purple"
                  onToggleInclude={handleToggleInclude}
                  onProductChange={handleRowProductChange}
                  onQuantityStep={handleQuantityStep}
                  onQuantityTextChange={handleQuantityTextChange}
                />
              </div>
            )}
          </div>

          {/* =====================================================
              5. MANTA HOSPITALAR (Azul / Turquesa)
             ===================================================== */}
          <div
            className={`border rounded-2xl transition-all duration-200 ${
              catManta
                ? 'border-blue-300 bg-white shadow-xs'
                : 'border-slate-200 bg-slate-50/40'
            }`}
          >
            {/* Header da Categoria */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Toggle switch azul */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !catManta;
                    setCatManta(next);
                    if (next && !expManta) setExpManta(true);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                    catManta ? 'bg-[#0057ff]' : 'bg-slate-300'
                  }`}
                  aria-label="Alternar Manta Hospitalar"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      catManta ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>

                {/* Ícone vetorial azul/turquesa */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    catManta
                      ? 'bg-blue-50 text-[#0057ff] border border-blue-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Scroll className="w-5 h-5 stroke-[2]" />
                </div>

                <div>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      catManta ? 'text-[#0057ff]' : 'text-slate-600'
                    }`}
                  >
                    Manta Hospitalar
                  </span>
                  {catManta && (parseBRLNumber(mantaAreaInput) > 0 || parseBRLNumber(mantaMlInput) > 0) && (
                    <span className="hidden sm:inline-block ml-3 text-xs font-semibold text-[#0057ff] bg-blue-50 px-2 py-0.5 rounded-md">
                      {mantaAreaInput || '0'} m² / {mantaMlInput || '0'} ml
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpManta(!expManta)}
                className="p-1.5 text-slate-400 hover:text-[#0057ff] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Expandir ou recolher Manta Hospitalar"
              >
                {expManta ? (
                  <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Conteúdo Expandido da Manta Hospitalar */}
            {expManta && (
              <div className="px-5 pb-6 pt-1 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
                {/* Seleção do Produto de Manta Hospitalar */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#0057ff] uppercase tracking-wider">
                    Produto de Manta Hospitalar
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      {mantaManual ? (
                        <input
                          type="text"
                          value={mantaManualName}
                          onChange={(e) => setMantaManualName(e.target.value)}
                          placeholder="Digite o nome do produto de manta hospitalar..."
                          className="w-full h-11 rounded-xl border border-blue-300 bg-white px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff]"
                        />
                      ) : liveMantaProducts.length === 0 ? (
                        <div className="w-full h-11 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Nenhum produto cadastrado nesta categoria.</span>
                        </div>
                      ) : (
                        <select
                          value={mantaProduct}
                          onChange={(e) => setMantaProduct(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff] cursor-pointer appearance-none"
                        >
                          {liveMantaProducts.map((prod) => (
                            <option key={prod} value={prod}>
                              {prod}
                            </option>
                          ))}
                        </select>
                      )}
                      {!mantaManual && liveMantaProducts.length > 0 && (
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      )}
                    </div>

                    <span className="text-xs font-medium text-slate-400 text-center sm:text-left">
                      ou
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setMantaManual(!mantaManual);
                        if (!mantaManual && !mantaManualName) {
                          setMantaManualName(mantaProduct);
                        }
                      }}
                      className="h-11 px-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-50 text-[#0057ff] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>
                        {mantaManual ? 'Selecionar da lista' : 'Preencher manualmente'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Área do ambiente & Metro linear */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Área do ambiente (m²) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071a52] flex items-center gap-1.5">
                      <span>Área do ambiente (m²)</span>
                      <span
                        title="Área total da superfície do ambiente a receber a manta vinílica"
                        className="cursor-help"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                      </span>
                    </label>
                    <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 focus-within:border-[#0057ff] focus-within:ring-1 focus-within:ring-[#0057ff] px-4 flex items-center justify-between transition-all">
                      <SquareDashed className="w-5 h-5 text-[#0057ff] stroke-[2]" />
                      <input
                        type="text"
                        value={mantaAreaInput}
                        onChange={(e) => setMantaAreaInput(e.target.value)}
                        placeholder="0,00"
                        className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        m²
                      </span>
                    </div>
                  </div>

                  {/* Metro Linear (ml) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#071a52] flex items-center gap-1.5">
                      <span>Metro Linear (ml)</span>
                      <span
                        title="Perímetro linear para cordão de solda, suporte canto curvo e perfis"
                        className="cursor-help"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                      </span>
                    </label>
                    <div className="h-14 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 focus-within:border-[#0057ff] focus-within:ring-1 focus-within:ring-[#0057ff] px-4 flex items-center justify-between transition-all">
                      <Ruler className="w-5 h-5 text-[#0057ff] stroke-[2]" />
                      <input
                        type="text"
                        value={mantaMlInput}
                        onChange={(e) => setMantaMlInput(e.target.value)}
                        placeholder="0,00"
                        className="flex-1 text-center font-extrabold text-lg sm:text-xl text-[#071a52] outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        ml
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumo Elegante na Seção */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Área informada:
                    </span>
                    <span className="text-base font-extrabold text-[#0057ff]">
                      {parseBRLNumber(mantaAreaInput) > 0 ? `${mantaAreaInput} m²` : '—'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#071a52]">
                      Metro Linear informado:
                    </span>
                    <span className="text-base font-extrabold text-[#0057ff]">
                      {parseBRLNumber(mantaMlInput) > 0 ? `${mantaMlInput} ml` : '—'}
                    </span>
                  </div>
                </div>

                {/* Materiais Necessários da Manta Hospitalar dentro do Card */}
                <CategoryMaterialsTable
                  categoryName="Manta Hospitalar"
                  rows={materials.filter((m) => m.id.startsWith('mat_manta_'))}
                  theme="blue"
                  onToggleInclude={handleToggleInclude}
                  onProductChange={handleRowProductChange}
                  onQuantityStep={handleQuantityStep}
                  onQuantityTextChange={handleQuantityTextChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* =======================================================
            ESTADO DAS CATEGORIAS / INFORMATIVO
           ======================================================= */}
        {hasAnyCategoryActive ? (
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0057ff] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {materials.filter((m) => m.included).length}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#071a52]">
                  {materials.filter((m) => m.included).length}{' '}
                  {materials.filter((m) => m.included).length === 1
                    ? 'material selecionado'
                    : 'materiais selecionados'}{' '}
                  nas categorias ativas
                </p>
                <p className="text-xs text-slate-500">
                  Os materiais necessários são gerenciados diretamente dentro do card de cada categoria acima.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecalculate}
              className="self-start sm:self-center h-9 px-3.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#0057ff] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recalcular tudo</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-500">
              Nenhuma categoria ativada no momento.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Ative uma ou mais das calculadoras acima para visualizar os materiais necessários diretamente dentro do card de cada categoria.
            </p>
          </div>
        )}

        {/* =======================================================
            BOTÕES NO FINAL:
            [ Limpar ]   [ Calcular materiais ]   [ Adicionar ao orçamento ]
           ======================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Botão Limpar */}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0057ff] font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs order-3 sm:order-1"
          >
            <RotateCcw className="w-4 h-4 stroke-[2]" />
            <span>Limpar</span>
          </button>

          {/* Botão Calcular materiais */}
          <button
            type="button"
            onClick={handleCalculateMaterials}
            className="h-13 rounded-2xl bg-[#0057ff] hover:bg-[#0047db] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm order-1 sm:order-2"
          >
            <Calculator className="w-4 h-4 stroke-[2]" />
            <span>Calcular materiais</span>
          </button>

          {/* Botão Adicionar ao orçamento */}
          <button
            type="button"
            onClick={handleAddToBudget}
            className="h-13 rounded-2xl bg-[#071a52] hover:bg-[#05133d] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm order-2 sm:order-3"
          >
            <FileText className="w-4 h-4 stroke-[2]" />
            <span>Adicionar ao orçamento</span>
          </button>
        </div>
      </div>

      {/* =======================================================
          MODAL: RENDIMENTOS DA CALCULADORA
         ======================================================= */}
      {showRendimentosModal && (
        <ModalRendimentos onClose={() => setShowRendimentosModal(false)} />
      )}
    </div>
  );
};
