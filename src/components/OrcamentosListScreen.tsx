import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  Calendar,
  Eye,
  Edit3,
  Copy,
  MoreHorizontal,
  Home,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Trash2,
  Printer,
  Check,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  XCircle,
  AlertCircle,
  X,
  Download,
  Image as ImageIcon,
  Loader2,
  Phone,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SavedOrcamento, OrcamentoStatus } from '../types';
import { EspelhoOrcamento } from './EspelhoOrcamento';
import { ModalVerOrcamentoFollowUp } from './followup/ModalVerOrcamentoFollowUp';
import { filterOrcamentosForUser, getSellerIdForUser, isRecordOfResponsible, isOrcamentoAccessibleByUser } from '../utils/userDataFilter';
import { ResponsibleFilterTabs } from './ResponsibleFilterTabs';
import {
  saveItemToSupabase,
  deleteItemFromSupabase,
  saveWholeCollectionToSupabase,
} from '../utils/supabaseClient';
import { getClientTypeVisual } from '../utils/clientTypeVisual';
import { getOrcamentoExportFileName } from '../utils/orcamentoFileName';
import {
  getOrcamentoMessageTemplate,
  getWhatsAppMessageTemplate,
  formatOrcamentoMessage,
} from '../utils/configOrcamentoEMetas';

interface OrcamentosListScreenProps {
  onNewOrcamento: () => void;
  onOpenOrcamento: (orcamento: SavedOrcamento) => void;
  onNavigateTab?: (tab: string) => void;
  currentUserName?: string;
}

const INITIAL_REFERENCE_ORCAMENTOS: SavedOrcamento[] = [];

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const OrcamentosListScreen: React.FC<OrcamentosListScreenProps> = ({
  onNewOrcamento,
  onOpenOrcamento,
  onNavigateTab,
  currentUserName = 'Vanessa Gomes',
}) => {
  const [orcamentos, setOrcamentos] = useState<SavedOrcamento[]>(() => {
    try {
      const raw = localStorage.getItem('fenix_orcamentos_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [periodMode, setPeriodMode] = useState<'mes' | 'dia' | 'todos'>('todos');
  
  // Date navigation states (Defaulting to current real date)
  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date>(now);
  const [filterByDate, setFilterByDate] = useState<boolean>(false);
  const [scopeFilter, setScopeFilter] = useState<'todos' | 'meus'>('todos');

  // Responsável filter for Diretor Éder Perez
  const isDirector = (currentUserName || '').toLowerCase().includes('eder');
  const [responsibleTab, setResponsibleTab] = useState<string>('Todos');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 9;
  const [draftRefreshCounter, setDraftRefreshCounter] = useState<number>(0);

  // Detecta se há um orçamento em preenchimento salvo em rascunho
  const hasInProgressDraft = useMemo(() => {
    try {
      const userKey = `fenix_orcamento_in_progress_draft_${currentUserName || 'default'}`;
      const raw = localStorage.getItem(userKey) || localStorage.getItem('fenix_orcamento_in_progress_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const hasData =
            (Array.isArray(parsed.items) && parsed.items.length > 0) ||
            Boolean(parsed.nomeOrcamento && parsed.nomeOrcamento.trim()) ||
            Boolean(parsed.observacoes && parsed.observacoes.trim()) ||
            Boolean(parsed.selectedClientId) ||
            Boolean(parsed.hasFreteEnabled);
          return hasData ? parsed : null;
        }
      }
    } catch {}
    return null;
  }, [currentUserName, draftRefreshCounter]);

  // Cancela somente o rascunho em andamento, remove o bloco da tela e não cria, duplica ou abre outro orçamento
  const handleCancelDraft = () => {
    try {
      const userKey = `fenix_orcamento_in_progress_draft_${currentUserName || 'default'}`;
      localStorage.removeItem(userKey);
      localStorage.removeItem('fenix_orcamento_in_progress_draft');
    } catch {}
    setDraftRefreshCounter((prev) => prev + 1);
  };

  // View mode: 'cards' (default, matching Follow-up) or 'tabela'
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards');
  const [expandedClients, setExpandedClients] = useState<{ [clientKey: string]: boolean }>({});

  const toggleCard = (clientKey: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientKey]: !prev[clientKey],
    }));
  };

  // Modals state
  const [viewingEspelhoOrcamento, setViewingEspelhoOrcamento] = useState<SavedOrcamento | null>(null);
  const [duplicatingOrcamento, setDuplicatingOrcamento] = useState<SavedOrcamento | null>(null);
  const [duplicateNameInput, setDuplicateNameInput] = useState<string>('');
  const [actionModalOrcamento, setActionModalOrcamento] = useState<SavedOrcamento | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<SavedOrcamento | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadPdf = async (orc: SavedOrcamento) => {
    const element = document.getElementById('espelho-oficial-orcamento');
    if (!element) {
      showToast('Espelho do orçamento não encontrado na tela.');
      return;
    }

    try {
      setIsExporting(true);
      showToast('Gerando PDF oficial do orçamento...');

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

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const imgWidthMm = elementWidth * 0.264583;
      const imgHeightMm = elementHeight * 0.264583;
      const scale = Math.min(availableWidth / imgWidthMm, availableHeight / imgHeightMm);

      const renderWidth = imgWidthMm * scale;
      const renderHeight = imgHeightMm * scale;
      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

      const filename = getOrcamentoExportFileName(orc.clientName, orc.dataOrcamento, 'pdf');

      pdf.save(filename);
      showToast('PDF oficial baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      showToast('Erro ao exportar PDF. Tente a opção Imprimir / Gerar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async (orc: SavedOrcamento) => {
    const element = document.getElementById('espelho-oficial-orcamento');
    if (!element) {
      showToast('Espelho do orçamento não encontrado na tela.');
      return;
    }

    try {
      setIsExporting(true);
      showToast('Gerando imagem em alta resolução...');

      const fullWidth = Math.max(element.scrollWidth, element.offsetWidth, 1040);
      const fullHeight = Math.max(element.scrollHeight, element.offsetHeight, 600);

      let dataUrl = '';
      try {
        dataUrl = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          width: fullWidth,
          height: fullHeight,
          canvasWidth: fullWidth * 2,
          canvasHeight: fullHeight * 2,
          style: {
            margin: '0',
            transform: 'none',
            width: `${fullWidth}px`,
            minWidth: `${fullWidth}px`,
            maxWidth: 'none',
            overflow: 'visible',
          },
        });
      } catch (errToPng) {
        console.warn('toPng falhou na imagem, usando fallback html2canvas...', errToPng);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: fullWidth,
          height: fullHeight,
          windowWidth: fullWidth + 100,
          windowHeight: fullHeight + 100,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById(element.id || 'espelho-oficial-orcamento');
            if (clonedEl) {
              clonedEl.style.width = `${fullWidth}px`;
              clonedEl.style.minWidth = `${fullWidth}px`;
              clonedEl.style.maxWidth = 'none';
              clonedEl.style.overflow = 'visible';
              clonedEl.style.margin = '0 auto';
            }
          },
        });
        dataUrl = canvas.toDataURL('image/png');
      }

      const filename = getOrcamentoExportFileName(orc.clientName, orc.dataOrcamento, 'png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Imagem PNG baixada com sucesso!');
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
      showToast('Erro ao exportar imagem.');
    } finally {
      setIsExporting(false);
    }
  };

  // Copiar imagem do espelho diretamente para colar no WhatsApp (Ctrl+V)
  const handleCopyImage = async (orc: SavedOrcamento) => {
    const element = document.getElementById('espelho-oficial-orcamento');
    if (!element) {
      showToast('Espelho do orçamento não encontrado.');
      return;
    }

    try {
      setIsExporting(true);
      showToast('Copiando imagem do espelho...');

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
      } catch (errCanvas) {
        console.warn('toPng falhou, tentando fallback html2canvas...', errCanvas);
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
        showToast('✓ Imagem copiada com fidelidade total! Cole no WhatsApp (Ctrl+V).');
      } else {
        showToast('✓ Imagem gerada! Utilize "Baixar Imagem" caso seu navegador restrinja colar direto.');
      }
    } catch (err) {
      console.warn('Falha ao copiar imagem para a área de transferência:', err);
      showToast('✓ Dica: Pressione "Baixar Imagem" para salvar o arquivo do orçamento.');
    } finally {
      setIsExporting(false);
    }
  };

  // Enviar orçamento via WhatsApp
  const handleSendWhatsApp = (orc: SavedOrcamento) => {
    const rawContact = (orc.clientContact || '').replace(/\D/g, '');
    const template = getWhatsAppMessageTemplate('Envio de Orçamento');
    const message = formatOrcamentoMessage(template, {
      clientName: orc.clientName,
      totalFinal: orc.totalFinal,
      consultoraName: orc.consultoraName,
      items: orc.items,
      freteAtivo: orc.freteAtivo,
      freteValor: orc.freteValor,
      freteEndereco: orc.freteEndereco,
      descontoValor: orc.descontoValor,
      descontoTexto: orc.descontoTexto,
      numeroOrcamento: orc.nomeOrcamento || orc.id,
    });
    const textMsg = encodeURIComponent(message);
    const phoneParam = rawContact.length >= 10 ? `phone=55${rawContact}&` : '';
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${textMsg}`, '_blank');
  };

  // Load budgets from localStorage
  const loadOrcamentos = () => {
    try {
      const raw = localStorage.getItem('fenix_orcamentos_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setOrcamentos(parsed);
          return;
        }
      }
      setOrcamentos([]);
    } catch {
      setOrcamentos([]);
    }
  };

  useEffect(() => {
    loadOrcamentos();

    const handleSync = () => {
      loadOrcamentos();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('fenix_orcamentos_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('fenix_orcamentos_updated', handleSync);
    };
  }, []);

  // Abre automaticamente o orçamento original ao navegar do Follow-up ("Ir para o orçamento" ou "Editar Orçamento")
  useEffect(() => {
    try {
      const targetId = sessionStorage.getItem('fenix_target_orcamento_id');
      const targetAction = sessionStorage.getItem('fenix_target_orcamento_action');
      if (targetId && orcamentos.length > 0) {
        sessionStorage.removeItem('fenix_target_orcamento_id');
        sessionStorage.removeItem('fenix_target_orcamento_action');
        const matched = orcamentos.find(
          (o) =>
            o.id === targetId ||
            o.id === targetId.replace('fup_', '') ||
            (o.id && targetId.includes(o.id))
        );
        if (matched) {
          if (targetAction === 'edit') {
            if (onOpenOrcamento) {
              onOpenOrcamento(matched);
            }
          } else {
            // 'view_espelho' ou default: "Ir para o Orçamento" abre o espelho original oficial
            setViewingEspelhoOrcamento(matched);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [orcamentos, onOpenOrcamento]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setFilterByDate(true);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setFilterByDate(true);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - 1);
    setSelectedDay(d);
    setFilterByDate(true);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + 1);
    setSelectedDay(d);
    setFilterByDate(true);
  };

  const formattedDayDisplay = useMemo(() => {
    const dayStr = String(selectedDay.getDate()).padStart(2, '0');
    const monthStr = String(selectedDay.getMonth() + 1).padStart(2, '0');
    return `${dayStr}/${monthStr}`;
  }, [selectedDay]);

  const formattedMonthDisplay = useMemo(() => {
    return MONTH_NAMES[selectedMonth];
  }, [selectedMonth]);

  // Date matching logic
  const matchesPeriod = (orc: SavedOrcamento) => {
    if (!filterByDate || periodMode === 'todos') return true;
    if (!orc.dataOrcamento) return true;
    const parts = orc.dataOrcamento.split('/');
    if (parts.length < 3) return true;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (periodMode === 'mes') {
      return month === selectedMonth + 1 && year === selectedYear;
    } else if (periodMode === 'dia') {
      return (
        day === selectedDay.getDate() &&
        month === selectedDay.getMonth() + 1 &&
        year === selectedDay.getFullYear()
      );
    }
    return true;
  };

  // User-scoped budgets based on logged-in responsible seller
  const userOrcamentos = useMemo(() => {
    return filterOrcamentosForUser(orcamentos, currentUserName);
  }, [orcamentos, currentUserName]);

  // Responsible counts for Director Éder Perez
  const responsibleCounts = useMemo(() => {
    if (!isDirector) return undefined;
    return {
      todos: orcamentos.length,
      eder: orcamentos.filter((o) => isRecordOfResponsible(o, 'Éder')).length,
      vanessa: orcamentos.filter((o) => isRecordOfResponsible(o, 'Vanessa')).length,
      jhessica: orcamentos.filter((o) => isRecordOfResponsible(o, 'Jhessica')).length,
      demais: orcamentos.filter((o) => isRecordOfResponsible(o, 'demais')).length,
    };
  }, [orcamentos, isDirector]);

  // Active orcamentos list:
  const activeOrcamentosSource = useMemo(() => {
    if (isDirector) {
      if (responsibleTab === 'Todos') return orcamentos;
      return orcamentos.filter((o) => isRecordOfResponsible(o, responsibleTab));
    }
    // Usuários comuns visualizam somente seus próprios orçamentos
    return userOrcamentos;
  }, [isDirector, responsibleTab, orcamentos, userOrcamentos, currentUserName]);

  // Status counts (respecting current period if active, or overall)
  const counts = useMemo(() => {
    let emAberto = 0;
    let aguardando = 0;
    let fechados = 0;
    let perdidos = 0;

    const source = activeOrcamentosSource.filter(matchesPeriod);

    source.forEach((o) => {
      const st = o.status;
      if (st === 'Em aberto') emAberto++;
      else if (st === 'Aguardando retorno') aguardando++;
      else if (st === 'Fechados' || st === 'Fechado') fechados++;
      else if (st === 'Perdidos' || st === 'Perdido') perdidos++;
    });

    return {
      total: source.length,
      emAberto,
      aguardando,
      fechados,
      perdidos,
    };
  }, [activeOrcamentosSource, periodMode, selectedMonth, selectedYear, selectedDay, filterByDate]);

  // Filter budgets based on search and period (No status control/filter in Orçamentos)
  const filteredOrcamentos = useMemo(() => {
    return activeOrcamentosSource.filter((orc) => {
      // Period filter
      if (!matchesPeriod(orc)) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesClient = orc.clientName.toLowerCase().includes(query);
        const matchesNome = (orc.nomeOrcamento || '').toLowerCase().includes(query);
        const matchesType = (orc.clientType || '').toLowerCase().includes(query);
        if (!matchesClient && !matchesNome && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [userOrcamentos, searchTerm, periodMode, selectedMonth, selectedYear, selectedDay, filterByDate]);

  // Reset page when filter, search or viewMode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, periodMode, selectedMonth, selectedDay, filterByDate, viewMode]);

  // Agrupamento por Cliente (Card Layout idêntico ao Follow-up)
  const clientGroups = useMemo(() => {
    const map = new Map<string, {
      clientKey: string;
      clientName: string;
      clientType: string;
      clientContact?: string;
      orcamentosCount: number;
      totalValue: number;
      orcamentos: SavedOrcamento[];
    }>();

    filteredOrcamentos.forEach((orc) => {
      const key = (orc.clientName || 'Cliente Sem Nome').trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          clientKey: key,
          clientName: orc.clientName || 'Cliente Sem Nome',
          clientType: orc.clientType || 'Cliente Final',
          clientContact: orc.clientContact,
          orcamentosCount: 0,
          totalValue: 0,
          orcamentos: [],
        });
      }
      const group = map.get(key)!;
      group.orcamentosCount += 1;
      group.totalValue += Number(orc.totalFinal) || 0;
      group.orcamentos.push(orc);
    });

    return Array.from(map.values());
  }, [filteredOrcamentos]);

  // Paginated list
  const totalPages = Math.max(
    1,
    Math.ceil((viewMode === 'cards' ? clientGroups.length : filteredOrcamentos.length) / itemsPerPage)
  );

  const paginatedOrcamentos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrcamentos.slice(start, start + itemsPerPage);
  }, [filteredOrcamentos, currentPage, itemsPerPage]);

  const paginatedClientGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return clientGroups.slice(start, start + itemsPerPage);
  }, [clientGroups, currentPage, itemsPerPage]);

  // Open Duplicar Modal
  const openDuplicateModal = (orc: SavedOrcamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDuplicatingOrcamento(orc);
    setDuplicateNameInput(`${orc.nomeOrcamento} — Cópia`);
    setActionModalOrcamento(null);
  };

  // Confirm Duplicar
  const handleConfirmDuplicate = async () => {
    if (!duplicatingOrcamento) return;
    const finalName = duplicateNameInput.trim() || `${duplicatingOrcamento.nomeOrcamento} — Cópia`;
    const newId = `orc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Clona fielmente exatamente os mesmos itens originais sem adicionar nada extra nem duplicar itens internos
    const duplicatedItems = (duplicatingOrcamento.items || []).map((it, idx) => ({
      ...it,
      id: `it_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
    }));

    const duplicated: SavedOrcamento = {
      ...duplicatingOrcamento,
      id: newId,
      nomeOrcamento: finalName,
      items: duplicatedItems,
      consultoraName: currentUserName,
      registeredBy: currentUserName,
      vendedorId: getSellerIdForUser(currentUserName),
      isChildRow: true,
      parentId: duplicatingOrcamento.id,
      savedAt: new Date().toISOString(),
      status: 'Em aberto',
    };

    const targetIdx = orcamentos.findIndex((o) => o.id === duplicatingOrcamento.id);
    const updated = [...orcamentos];
    if (targetIdx >= 0) {
      updated.splice(targetIdx + 1, 0, duplicated);
    } else {
      updated.unshift(duplicated);
    }

    setOrcamentos(updated);
    localStorage.setItem('fenix_orcamentos_history', JSON.stringify(updated));
    await saveItemToSupabase('fenix_orcamentos_history', duplicated, 'id', currentUserName);
    window.dispatchEvent(new Event('fenix_orcamentos_updated'));
    showToast(`Orçamento "${finalName}" criado com sucesso!`);
    setDuplicatingOrcamento(null);
  };

  // Handle Delete - Regra: Somente o próprio usuário pode excluir seus orçamentos
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = orcamentos.find((o) => o.id === id);
    if (!target) return;
    if (!isOrcamentoAccessibleByUser(target, currentUserName)) {
      showToast('Você só pode excluir orçamentos pertencentes a você.');
      return;
    }
    setBudgetToDelete(target);
  };

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;
    const id = budgetToDelete.id;
    if (!isOrcamentoAccessibleByUser(budgetToDelete, currentUserName)) {
      showToast('Você só pode excluir orçamentos pertencentes a você.');
      setBudgetToDelete(null);
      return;
    }
    
    // Filtra SOMENTE pelo ID específico do orçamento
    const updated = orcamentos.filter((o) => o.id !== id);
    setOrcamentos(updated);
    localStorage.setItem('fenix_orcamentos_history', JSON.stringify(updated));
    await deleteItemFromSupabase('fenix_orcamentos_history', id, 'id', currentUserName);
    window.dispatchEvent(new Event('fenix_orcamentos_updated'));

    // Excluir também o registro correspondente do Follow-up (evitar registros órfãos)
    try {
      await deleteItemFromSupabase('fenix_followup_cards_v2', `fup_${id}`, 'id', currentUserName);
      await deleteItemFromSupabase('fenix_followup_cards_v2', id, 'id', currentUserName);
      const followUpRaw = localStorage.getItem('fenix_followup_cards_v2');
      if (followUpRaw) {
        const followUpList = JSON.parse(followUpRaw);
        if (Array.isArray(followUpList)) {
          const filteredFollowUp = followUpList.filter(
            (f: any) => f.orcamentoId !== id && f.id !== `fup_${id}` && f.id !== id
          );
          localStorage.setItem('fenix_followup_cards_v2', JSON.stringify(filteredFollowUp));
          window.dispatchEvent(new Event('fenix_followup_updated'));
        }
      }
    } catch (err) {
      console.error('Erro ao excluir registro de follow-up correspondente:', err);
    }

    showToast('Orçamento excluído com sucesso.');
    setBudgetToDelete(null);
    setActionModalOrcamento(null);
  };

  // Handle Status Update directly - Regra: UPDATE do ID existente
  const handleUpdateStatus = async (id: string, newStatus: OrcamentoStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetOrc = orcamentos.find((o) => o.id === id);
    if (!targetOrc) return;
    const updatedOrc = { ...targetOrc, status: newStatus };
    const updated = orcamentos.map((o) => (o.id === id ? updatedOrc : o));
    setOrcamentos(updated);
    localStorage.setItem('fenix_orcamentos_history', JSON.stringify(updated));
    await saveItemToSupabase('fenix_orcamentos_history', updatedOrc, 'id', currentUserName);
    window.dispatchEvent(new Event('fenix_orcamentos_updated'));

    // Sincroniza bidirecionalmente com fenix_followup_cards_v2
    try {
      const followUpRaw = localStorage.getItem('fenix_followup_cards_v2');
      if (followUpRaw) {
        const followUpList = JSON.parse(followUpRaw);
        if (Array.isArray(followUpList)) {
          const isVendidoStatus = newStatus === 'Fechado' || newStatus === 'Fechados' || (newStatus as any) === 'Vendido';
          const targetStatus = isVendidoStatus ? 'Vendido' : newStatus === 'Perdido' || newStatus === 'Perdidos' ? 'Perdido' : 'Orçamento Enviado';
          
          let fupChanged = false;
          const updatedFollowUp = followUpList.map((f: any) => {
            if (f.orcamentoId === id || f.id === `fup_${id}` || f.id === id) {
              fupChanged = true;
              return {
                ...f,
                status: targetStatus,
                dataAtualizacao: new Date().toISOString(),
                ...(isVendidoStatus ? { lembretesAtivos: false } : {}),
              };
            }
            return f;
          });

          if (fupChanged) {
            localStorage.setItem('fenix_followup_cards_v2', JSON.stringify(updatedFollowUp));
            const updatedFupItem = updatedFollowUp.find((f: any) => f.orcamentoId === id || f.id === `fup_${id}` || f.id === id);
            if (updatedFupItem) {
              saveItemToSupabase('fenix_followup_cards_v2', updatedFupItem, 'id', currentUserName).catch(() => {});
            }
            window.dispatchEvent(new Event('fenix_followup_updated'));
          }
        }
      }
    } catch (fupSyncErr) {
      console.warn('Erro ao sincronizar status com follow-up:', fupSyncErr);
    }

    showToast(`Status atualizado para "${newStatus}".`);
    if (actionModalOrcamento && actionModalOrcamento.id === id) {
      setActionModalOrcamento({ ...actionModalOrcamento, status: newStatus });
    }
  };

  // Format currency
  const formatCurrency = (val?: number | null) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    return `R$ ${num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Badge render for client type
  const renderClientTypeBadge = (type: string) => {
    switch (type) {
      case 'Construtora':
        return (
          <span className="bg-[#e0f2fe] text-[#0284c7] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
            Construtora
          </span>
        );
      case 'Residencial':
        return (
          <span className="bg-[#f3e8ff] text-[#9333ea] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
            Residencial
          </span>
        );
      case 'Comercial':
        return (
          <span className="bg-[#dcfce7] text-[#16a34a] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
            Comercial
          </span>
        );
      case 'Instalador':
        return (
          <span className="bg-[#fef3c7] text-[#b45309] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
            Instalador
          </span>
        );
      case 'Arquiteto':
        return (
          <span className="bg-[#fae8ff] text-[#a21caf] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
            Arquiteto
          </span>
        );
      case 'Engenheiro':
        return (
          <span className="bg-[#ffedd5] text-[#c2410c] font-semibold text-xs px-3 py-1 rounded-lg inline-block">
            Engenheiro
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 font-semibold text-xs px-3 py-1 rounded-lg inline-block">
            {type}
          </span>
        );
    }
  };

  // Helper: Icon container for client type (without letter avatars)
  const renderClientTypeIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('residencial') || t.includes('casa') || t.includes('final')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0052cc] border border-sky-100 flex items-center justify-center flex-shrink-0" title="Cliente Final / Residencial">
          <Home className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes('revenda') || t.includes('loja') || t.includes('comercial')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0" title="Revenda / Comercial">
          <Store className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes('construtora') || t.includes('prédio') || t.includes('predio') || t.includes('edifício')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0" title="Construtora / Edifício">
          <Building2 className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes('instalador') || t.includes('chave') || t.includes('ferramenta')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0" title="Instalador">
          <Wrench className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes('arquiteto') || t.includes('desenho')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center flex-shrink-0" title="Arquiteto">
          <PenTool className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes('engenheiro') || t.includes('esquadro') || t.includes('obra')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center flex-shrink-0" title="Engenheiro">
          <HardHat className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center flex-shrink-0">
        <Home className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="w-full max-w-full px-3 sm:px-6 xl:px-8 py-5 sm:py-6 space-y-4 sm:space-y-5 overflow-x-hidden">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-xl bg-[#003865] text-white shadow-xl flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs sm:text-sm font-normal text-slate-500 flex-wrap">
        <Home className="w-4 h-4 text-[#0066ff]" />
        <span className="text-[#0066ff] font-medium cursor-pointer hover:underline">
          Início
        </span>
        <span className="text-slate-400 font-normal">›</span>
        <span className="text-slate-800 font-medium">Orçamentos</span>
      </nav>

      {/* 2. Header Section: Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Icon Badge & Title */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1c3d] flex items-center justify-center flex-shrink-0 shadow-sm">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0c1e3c] tracking-tight">
              Orçamentos
            </h1>
            <p className="text-xs sm:text-sm text-[#4b6b94] mt-0.5 font-normal">
              Crie, acompanhe e gerencie seus orçamentos.
            </p>
          </div>
        </div>

        {/* Right: Period Switch & Navigation Arrows & + Novo Orçamento */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Switch Por mês / Por dia */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl p-1 shadow-xs">
            <Calendar className="w-4 h-4 text-[#0c1e3c] ml-2 mr-1" />
            <button
              onClick={() => {
                setPeriodMode('mes');
                setFilterByDate(true);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                periodMode === 'mes' && filterByDate
                  ? 'bg-[#0c1e3c] text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Por mês
            </button>
            <button
              onClick={() => {
                setPeriodMode('dia');
                setFilterByDate(true);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                periodMode === 'dia' && filterByDate
                  ? 'bg-[#0c1e3c] text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Por dia
            </button>
          </div>

          {/* Date navigation: < Setembro > ou < 06/09 > */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-xl px-1.5 py-1 shadow-xs">
            <button
              onClick={periodMode === 'mes' ? handlePrevMonth : handlePrevDay}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors cursor-pointer"
              title={periodMode === 'mes' ? 'Mês anterior' : 'Dia anterior'}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={() => setFilterByDate(!filterByDate)}
              title={filterByDate ? "Filtrando por este período (clique para alternar)" : "Filtro de período desativado"}
              className={`text-xs sm:text-sm font-bold min-w-[76px] sm:min-w-[82px] text-center px-1.5 sm:px-2 select-none rounded-md transition-colors cursor-pointer ${
                filterByDate ? 'text-[#0c1e3c] hover:bg-slate-50' : 'text-slate-400 line-through'
              }`}
            >
              {periodMode === 'mes' ? formattedMonthDisplay : formattedDayDisplay}
            </button>

            <button
              onClick={periodMode === 'mes' ? handleNextMonth : handleNextDay}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors cursor-pointer"
              title={periodMode === 'mes' ? 'Próximo mês' : 'Próximo dia'}
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Novo Orçamento Button */}
          <button
            onClick={onNewOrcamento}
            className="h-10 px-4 sm:px-5 rounded-xl text-white font-semibold text-xs sm:text-sm flex items-center justify-center shadow-xs transition-colors cursor-pointer bg-[#0066ff] hover:bg-blue-600 w-full sm:w-auto"
          >
            <span>Novo Orçamento</span>
          </button>
        </div>
      </div>

      {/* Bloco Direto: Orçamento em Andamento */}
      {hasInProgressDraft && (
        <div className="bg-gradient-to-r from-blue-50/95 via-sky-50/60 to-white border border-blue-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0066ff] text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Continuar Orçamento
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Existe um orçamento em andamento salvo com seus dados preservados
                {hasInProgressDraft.items?.length
                  ? ` (${hasInProgressDraft.items.length} ${hasInProgressDraft.items.length === 1 ? 'item' : 'itens'})`
                  : ''}
                {hasInProgressDraft.nomeOrcamento ? ` — "${hasInProgressDraft.nomeOrcamento}"` : ''}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0 flex-wrap">
            <button
              onClick={onNewOrcamento}
              className="h-10 px-4 sm:px-5 rounded-xl bg-[#0066ff] hover:bg-blue-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span>CONTINUAR ORÇAMENTO →</span>
            </button>
            <button
              onClick={handleCancelDraft}
              className="h-10 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-700 hover:text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm flex items-center transition-colors cursor-pointer"
            >
              <span>CANCELAR</span>
            </button>
          </div>
        </div>
      )}

      {/* Abas de Responsável para o Diretor Éder Perez */}
      {isDirector && (
        <div className="pt-1">
          <ResponsibleFilterTabs
            currentResponsible={responsibleTab}
            onSelectResponsible={setResponsibleTab}
            counts={responsibleCounts}
          />
        </div>
      )}

      {/* 3. Operational Pipeline Indicator & Search Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-1">
        {/* Pipeline Automatic Trigger Banner */}
        <div className="flex flex-wrap items-center gap-3 bg-blue-50/80 border border-blue-100/90 rounded-2xl px-4 py-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0052cc] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#0052cc]">
              Esteira Comercial Integrada
            </span>
            <span className="text-xs text-slate-600">
              Todo orçamento criado é enviado automaticamente para a aba <strong className="text-slate-800 font-semibold">Follow-up</strong> como &quot;Orçamento Enviado&quot;.
            </span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('Follow-up')}
              className="ml-auto px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#0052cc] border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <span>Ver Follow-up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Bar, View Toggle & Counter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle: Cards (Default) vs Tabela */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualização em Cards por Cliente (idêntico ao Follow-up)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tabela')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'tabela'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visualização em Tabela"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500 hidden sm:inline whitespace-nowrap">
            {clientGroups.length} {clientGroups.length === 1 ? 'cliente' : 'clientes'} ({filteredOrcamentos.length} {filteredOrcamentos.length === 1 ? 'orçamento' : 'orçamentos'})
          </span>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cliente ou orçamento..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Content Area: Cards por Cliente (Padrão, Idêntico ao Follow-up) OU Tabela */}
      {viewMode === 'cards' ? (
        paginatedClientGroups.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-2xs">
              <FileText className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-bold text-[#091122]">Nenhum orçamento encontrado</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'Nenhum cliente ou orçamento corresponde ao termo pesquisado.'
                : `Nenhum orçamento no período (${periodMode === 'mes' ? formattedMonthDisplay : formattedDayDisplay}).`}
            </p>
            {(searchTerm || filterByDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterByDate(false);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <span>Exibir todos os orçamentos ({orcamentos.length})</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedClientGroups.map((group) => {
              const isExpanded = !!expandedClients[group.clientKey];
              const visual = getClientTypeVisual(group.clientType);
              const TypeIcon = visual.Icon;

              return (
                <div
                  key={group.clientKey}
                  className={`rounded-[22px] sm:rounded-[26px] border ${visual.cardBorder} ${visual.cardBg} shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all overflow-hidden`}
                >
                  {/* CABEÇALHO DO CARD DO CLIENTE (RESUMO):
                      Mostrar SOMENTE:
                      - ícone do tipo de cliente;
                      - tipo de cliente;
                      - nome do cliente;
                      - quantidade de orçamentos;
                      - valor total dos orçamentos.
                      NÃO mostrar datas no resumo do cliente! */}
                  <div
                    onClick={() => toggleCard(group.clientKey)}
                    className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none ${visual.headerHover} transition-colors`}
                  >
                    {/* Esquerda: Ícone do tipo + Tipo de cliente + Nome do cliente */}
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${visual.iconBg}`}>
                        <TypeIcon className="w-5 h-5 stroke-[2]" />
                      </div>

                      <div className="min-w-0">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${visual.badgeBg} mb-1`}>
                          {group.clientType}
                        </span>
                        <h3 className="text-base sm:text-lg font-extrabold text-[#091122] tracking-tight truncate">
                          {group.clientName}
                        </h3>
                        {group.clientContact && (
                          <span className="text-xs text-slate-500 font-normal block">
                            {group.clientContact}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direita: Quantidade de orçamentos + Valor total dos orçamentos + Seta de expansão */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.06]">
                      {/* Quantidade de orçamentos */}
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                          Orçamentos
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {group.orcamentosCount} {group.orcamentosCount === 1 ? 'orçamento' : 'orçamentos'}
                        </span>
                      </div>

                      {/* Valor total dos orçamentos */}
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                          Valor Total
                        </span>
                        <span className="text-base sm:text-lg font-black text-[#091122]">
                          {formatCurrency(group.totalValue)}
                        </span>
                      </div>

                      {/* Seta de expansão com animação */}
                      <div
                        className={`w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-2xs border border-black/[0.05] ${
                          isExpanded ? 'rotate-180 bg-white text-[#0052cc]' : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* ÁREA EXPANDIDA DO CARD:
                      Ao expandir o card, mostrar cada orçamento separadamente:
                      - Nome dado ao orçamento
                      - Valor
                      - Data de criação
                      - Ações:
                        1) "Ver Orçamento" (Abre a imagem espelho completa para baixar, copiar, imprimir ou enviar WhatsApp)
                        2) "Editar" (Abre o orçamento para incluir, remover produtos ou mudar preços)
                        3) "Duplicar"
                        4) Mais (...)
                      NÃO tem a opção Produtos/Metragem! */}
                  {isExpanded && (
                    <div className="border-t border-black/[0.06] bg-white/40 p-4 sm:p-6 space-y-3 animate-in fade-in duration-150">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                        Orçamentos deste Cliente ({group.orcamentos.length})
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {group.orcamentos.map((budget) => (
                          <div
                            key={budget.id}
                            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                          >
                            {/* 1. Nome dado ao orçamento */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#0052cc] flex-shrink-0" />
                                <h4 className="text-sm sm:text-base font-bold text-[#091122] truncate">
                                  {budget.nomeOrcamento}
                                </h4>
                              </div>
                              {budget.clientContact && (
                                <p className="text-xs text-slate-400 mt-0.5 ml-6">
                                  Contato: {budget.clientContact}
                                </p>
                              )}
                            </div>

                            {/* 2. Valor */}
                            <div className="flex-shrink-0 lg:text-right min-w-[120px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Valor Total
                              </span>
                              <span className="text-sm sm:text-base font-extrabold text-[#091122]">
                                {formatCurrency(budget.totalFinal)}
                              </span>
                            </div>

                            {/* 3. Data de Criação */}
                            <div className="flex-shrink-0 lg:text-right min-w-[120px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Data de Criação
                              </span>
                              <span className="text-xs font-semibold text-slate-600 flex items-center lg:justify-end gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{budget.dataOrcamento || '06/09/2026'}</span>
                              </span>
                            </div>

                            {/* 4. Ações */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                              {/* Ver Orçamento (Abre a imagem espelho completa para baixar, copiar, imprimir ou enviar WhatsApp) */}
                              <button
                                type="button"
                                onClick={() => setViewingEspelhoOrcamento(budget)}
                                className="h-8.5 px-3 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-[#0052cc] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                title="Ver imagem espelho completa para baixar, copiar, imprimir ou enviar WhatsApp"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#0052cc]" />
                                <span>Ver Orçamento</span>
                              </button>

                              {/* Editar (Abre o orçamento para incluir, remover produtos ou mudar preços) */}
                              <button
                                type="button"
                                onClick={() => onOpenOrcamento(budget)}
                                className="h-8.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                title="Editar orçamento: incluir, remover produtos ou mudar preços"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                <span>Editar</span>
                              </button>

                              {/* Duplicar */}
                              <button
                                type="button"
                                onClick={(e) => openDuplicateModal(budget, e)}
                                className="h-8.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                title="Duplicar Orçamento"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden sm:inline">Duplicar</span>
                              </button>

                              {/* Excluir (somente orçamentos pertencentes ao próprio usuário) */}
                              {isOrcamentoAccessibleByUser(budget, currentUserName) && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(budget.id, e)}
                                  className="h-8.5 w-8.5 rounded-xl border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                                  title="Excluir Orçamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Mais (...) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionModalOrcamento(budget);
                                }}
                                className="h-8.5 w-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                                title="Mais opções"
                              >
                                <MoreHorizontal className="w-4 h-4 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Visualização Alternativa em Tabela (Sem Produtos/Metragem) */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500">
                    Cliente
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500">
                    Tipo
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500">
                    Nome do Orçamento
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500">
                    Valor Total
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500">
                    Data de Criação
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90">
                {paginatedOrcamentos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      <p className="font-semibold text-slate-700">
                        Nenhum orçamento encontrado para o período selecionado ({periodMode === 'mes' ? formattedMonthDisplay : formattedDayDisplay}).
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Navegue pelas setas &lt; &gt; ou clique no botão abaixo para ver todos os orçamentos.
                      </p>
                      <button
                        onClick={() => setFilterByDate(false)}
                        className="mt-3 px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Exibir todos os orçamentos ({orcamentos.length})
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedOrcamentos.map((orc) => (
                    <tr
                      key={orc.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Cliente */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {renderClientTypeIcon(orc.clientType)}
                          <div>
                            <span className="font-bold text-[#0c1e3c] text-sm block">
                              {orc.clientName}
                            </span>
                            {orc.clientContact && (
                              <span className="text-[11px] text-slate-400 font-normal">
                                {orc.clientContact}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo de Cliente */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {renderClientTypeBadge(orc.clientType)}
                      </td>

                      {/* Nome do Orçamento */}
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-slate-800 font-medium">
                        {orc.nomeOrcamento}
                      </td>

                      {/* Valor Total */}
                      <td className="py-4 px-6 whitespace-nowrap font-bold text-sm text-[#0c1e3c]">
                        {formatCurrency(orc.totalFinal)}
                      </td>

                      {/* Data de Criação */}
                      <td className="py-4 px-6 whitespace-nowrap text-xs font-medium text-slate-600">
                        {orc.dataOrcamento || '06/09/2026'}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {/* Ver Orçamento */}
                          <button
                            onClick={() => setViewingEspelhoOrcamento(orc)}
                            className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#0052CC] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Ver imagem espelho completa para baixar, copiar, imprimir ou enviar WhatsApp"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#0052CC]" />
                            <span>Ver Orçamento</span>
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => onOpenOrcamento(orc)}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Editar orçamento: incluir, remover produtos ou mudar preços"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Editar</span>
                          </button>

                          {/* Duplicar */}
                          <button
                            onClick={(e) => openDuplicateModal(orc, e)}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Duplicar Orçamento"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-600" />
                            <span>Duplicar</span>
                          </button>

                          {/* Excluir (somente orçamentos pertencentes ao próprio usuário) */}
                          {isOrcamentoAccessibleByUser(orc, currentUserName) && (
                            <button
                              onClick={(e) => handleDelete(orc.id, e)}
                              className="h-8 w-8 rounded-lg border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                              title="Excluir Orçamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* More (...) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModalOrcamento(orc);
                            }}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                            title="Opções do Orçamento"
                          >
                            <MoreHorizontal className="w-4 h-4 text-slate-600" />
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
      )}

      {/* 5. Pagination Footer */}
      <div className="py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-200/90 rounded-2xl bg-white shadow-2xs">
        <span className="text-xs sm:text-sm text-slate-500 font-normal">
          {viewMode === 'cards' ? (
            <>
              Mostrando {paginatedClientGroups.length} de {clientGroups.length} clientes ({filteredOrcamentos.length} orçamentos)
            </>
          ) : (
            <>
              Mostrando {paginatedOrcamentos.length} de {filteredOrcamentos.length} orçamentos
            </>
          )}
          {filterByDate && (
            <span className="text-slate-400 ml-1">
              ({periodMode === 'mes' ? formattedMonthDisplay : formattedDayDisplay})
            </span>
          )}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Previous Page Button */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
                currentPage === pageNum
                  ? 'bg-[#0066ff] text-white'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Next Page Button */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VER SOMENTE O ESPELHO DO ORÇAMENTO (PADRÃO OFICIAL VISUAL)       */}
      {/* ========================================================================= */}
      {viewingEspelhoOrcamento && (
        <ModalVerOrcamentoFollowUp
          selectedOrcamento={viewingEspelhoOrcamento}
          onClose={() => setViewingEspelhoOrcamento(null)}
          onNavigateToOrcamento={(orc, mode) => {
            setViewingEspelhoOrcamento(null);
            if (mode === 'edit') {
              onOpenOrcamento(orc);
            }
          }}
          showToast={(msg) => showToast(msg)}
          origin="orcamentos"
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TELA DE DUPLICAÇÃO COM NOME DO ORÇAMENTO                         */}
      {/* ========================================================================= */}
      {duplicatingOrcamento && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066ff] flex items-center justify-center flex-shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#0c1e3c]">
                    Duplicar Orçamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliente: <span className="font-semibold text-slate-700">{duplicatingOrcamento.clientName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDuplicatingOrcamento(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmDuplicate();
              }}
              className="p-5 sm:p-6 space-y-4"
            >
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Orçamento original:</span>{' '}
                  {duplicatingOrcamento.nomeOrcamento}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Valor total:</span>{' '}
                  <span className="font-bold text-[#0c1e3c]">{formatCurrency(duplicatingOrcamento.totalFinal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Nome do Novo Orçamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={duplicateNameInput}
                  onChange={(e) => setDuplicateNameInput(e.target.value)}
                  placeholder="Ex: Apartamento Modelo — Revisão 2"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#0066ff] focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Informe um nome para identificar esta cópia na sua lista de orçamentos.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDuplicatingOrcamento(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#0066ff] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Criar Cópia</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TELA DE OPÇÕES DO ORÇAMENTO (SUBSTITUI A CAIXINHA PEQUENA ...)   */}
      {/* ========================================================================= */}
      {actionModalOrcamento && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0b1c3d] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#0c1e3c]">
                    Opções do Orçamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    {actionModalOrcamento.nomeOrcamento}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionModalOrcamento(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Cliente</span>
                  <span className="font-bold text-slate-800 line-clamp-1">{actionModalOrcamento.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Valor Total</span>
                  <span className="font-bold text-[#0c1e3c]">{formatCurrency(actionModalOrcamento.totalFinal)}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px] font-medium">Data</span>
                  <span className="font-semibold text-slate-700">{actionModalOrcamento.dataOrcamento}</span>
                </div>
              </div>

              {/* Esteira Comercial / Follow-up Reference */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0052cc] text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Esteira Comercial</span>
                    <span className="text-[11px] text-slate-500">Status e negociação gerenciados no Follow-up</span>
                  </div>
                </div>
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      setActionModalOrcamento(null);
                      onNavigateTab('Follow-up');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#0052cc] text-xs font-semibold border border-blue-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Abrir Follow-up</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Main Actions List */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Ações do Orçamento
                </label>
                <div className="space-y-2">
                  {/* Editar Orçamento */}
                  <button
                    onClick={() => {
                      const orc = actionModalOrcamento;
                      setActionModalOrcamento(null);
                      onOpenOrcamento(orc);
                    }}
                    className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0052cc] flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs sm:text-sm font-semibold text-[#0052cc] block">Editar Orçamento</span>
                        <span className="text-[11px] text-slate-500">Incluir, remover produtos, alterar medidas e mudar preços</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#0052cc]" />
                  </button>

                  {/* Ver Imagem Espelho (WhatsApp / PDF / Imprimir) */}
                  <button
                    onClick={() => {
                      const orc = actionModalOrcamento;
                      setActionModalOrcamento(null);
                      setViewingEspelhoOrcamento(orc);
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs sm:text-sm font-semibold block">Ver Imagem Espelho Oficial</span>
                        <span className="text-[11px] text-slate-400">Baixar imagem, salvar em PDF, imprimir ou copiar para WhatsApp</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Duplicar */}
                  <button
                    onClick={() => {
                      const orc = actionModalOrcamento;
                      openDuplicateModal(orc);
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Copy className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs sm:text-sm font-semibold block">Duplicar Orçamento</span>
                        <span className="text-[11px] text-slate-400">Criar uma nova cópia com novo nome</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Imprimir / PDF */}
                  <button
                    onClick={() => {
                      const orc = actionModalOrcamento;
                      setActionModalOrcamento(null);
                      setViewingEspelhoOrcamento(orc);
                      setTimeout(() => window.print(), 350);
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs sm:text-sm font-semibold block">Imprimir / Salvar PDF</span>
                        <span className="text-[11px] text-slate-400">Exportar versão em folha A4 com layout oficial</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Excluir */}
                  {isOrcamentoAccessibleByUser(actionModalOrcamento, currentUserName) && (
                    <button
                      onClick={(e) => handleDelete(actionModalOrcamento.id, e)}
                      className="w-full p-3 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-600 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs sm:text-sm font-semibold block">Excluir Orçamento</span>
                          <span className="text-[11px] text-red-400">Remover permanentemente este orçamento</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActionModalOrcamento(null)}
                className="h-9 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE ORÇAMENTO */}
      {budgetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#091122]">Excluir Orçamento</h3>
                <p className="text-xs text-slate-500">Confirmação de exclusão</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir o orçamento <strong className="text-slate-900 font-semibold">{budgetToDelete.nomeOrcamento || 'Orçamento de Materiais'}</strong> de <strong className="text-slate-900 font-semibold">{budgetToDelete.clientName}</strong>? Esta ação removerá o orçamento do sistema.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBudgetToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

