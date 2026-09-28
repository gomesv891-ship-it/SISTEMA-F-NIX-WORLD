/**
 * Utilitários e configurações para:
 * 1. Mensagem Padrão de Envio de Orçamento
 * 2. Parâmetros e Cálculos de Dias e Metas com base na Data Atual
 */

import { getSupabaseClient, saveWholeCollectionToSupabase, withTimeout } from './supabaseClient';

export interface OrcamentoMessageData {
  clientName?: string;
  totalFinal?: number;
  consultoraName?: string;
  items?: Array<{
    qtd?: string | number;
    unidade?: string;
    descricao?: string;
    total?: number;
  }>;
  freteAtivo?: boolean;
  freteValor?: number;
  freteEndereco?: string;
  descontoValor?: number;
  descontoTexto?: string;
  numeroOrcamento?: string;
  categoria?: string;
}

export const STORAGE_ORCAMENTO_MSG_KEY = 'fenix_config_mensagem_orcamento';
export const STORAGE_WHATSAPP_CATEGORIES_KEY = 'fenix_config_whatsapp_categories_v2';

export type WhatsAppCategory =
  | 'Envio de Orçamento'
  | 'Follow-up de Orçamentos'
  | 'Pós-Vendas'
  | 'Follow-up de Prospecção';

export const WHATSAPP_CATEGORIES: WhatsAppCategory[] = [
  'Envio de Orçamento',
  'Follow-up de Orçamentos',
  'Pós-Vendas',
  'Follow-up de Prospecção',
];

/**
 * Retorna saudação dinâmica baseada no horário do dia:
 * - 05:00 às 11:59: Bom dia
 * - 12:00 às 17:59: Boa tarde
 * - 18:00 às 04:59: Boa noite
 */
export function getDynamicGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const DEFAULT_ORCAMENTO_MESSAGE = `{saudacao}, {cliente}!

Segue o seu Orçamento Oficial Fênix World Distribuidora.

Ficamos à total disposição para tirar qualquer dúvida e viabilizar o seu pedido!`;

export const DEFAULT_WHATSAPP_TEMPLATES_BY_CATEGORY: Record<WhatsAppCategory, string> = {
  'Envio de Orçamento': `{saudacao}, {cliente}!

Segue o seu Orçamento Oficial Fênix World Distribuidora.

Ficamos à total disposição para tirar qualquer dúvida e viabilizar o seu pedido!`,

  'Follow-up de Orçamentos': `{saudacao}, {cliente}! Tudo bem?

Gostaria de saber se você conseguiu avaliar a proposta comercial que enviamos recentemente da Fênix World Distribuidora.

Caso tenha alguma dúvida ou queira ajustar condições, estamos à disposição para ajudar a viabilizar o seu pedido!`,

  'Pós-Vendas': `{saudacao}, {cliente}! Tudo bem?

Passando para acompanhar a entrega e o recebimento dos materiais do seu pedido pela Fênix World Distribuidora.

Deu tudo certo com o recebimento? Como ficou o resultado final?

Sua satisfação é fundamental para nós! Se precisar de qualquer orientação ou nova cotação, conte sempre conosco.`,

  'Follow-up de Prospecção': `{saudacao}, {cliente}! Tudo bem?

Aqui é da Fênix World Distribuidora. Estou entrando em contato para saber se você está precisando de cotações para pisos vinílicos, rodapés ou insumos para os seus próximos projetos.

Podemos preparar uma condição comercial diferenciada para atender você hoje!`,
};

/**
 * Substitui exclusivamente as variáveis {saudacao} e {cliente}
 * pelo cumprimento do horário (Bom dia / Boa tarde / Boa noite) e pelo nome real do cliente.
 * Evita duplicação de saudação.
 */
export function formatWhatsAppMessage(
  template: string,
  clienteName?: string
): string {
  if (!template) return '';
  const greeting = getDynamicGreeting();
  const name = (clienteName || '').trim() || 'Cliente';

  let result = template
    .replace(/\{saudacao\}|\{greeting\}/gi, greeting)
    .replace(/\{cliente\}|\{clientName\}|\{nomeCliente\}/gi, name);

  // Evita duplicações acidentais de saudação no início da mensagem (ex: "Bom dia! Bom dia", "Boa tarde, Boa tarde")
  result = result
    .replace(/(Bom dia)[\s,!.-]+(Bom dia)/gi, '$1')
    .replace(/(Boa tarde)[\s,!.-]+(Boa tarde)/gi, '$1')
    .replace(/(Boa noite)[\s,!.-]+(Boa noite)/gi, '$1')
    .replace(/(Olá|Ola)[\s,!.-]+(Olá|Ola)/gi, '$1');

  return result;
}

/**
 * Retorna o template salvo da mensagem de WhatsApp para uma categoria específica
 */
export function getWhatsAppMessageTemplate(category: WhatsAppCategory = 'Envio de Orçamento'): string {
  try {
    const raw = localStorage.getItem(STORAGE_WHATSAPP_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed[category] === 'string' && parsed[category].trim().length > 0) {
        return parsed[category];
      }
    }
    if (category === 'Envio de Orçamento') {
      const legacy = localStorage.getItem(STORAGE_ORCAMENTO_MSG_KEY);
      if (legacy && legacy.trim().length > 0) return legacy;
    }
  } catch {}
  return DEFAULT_WHATSAPP_TEMPLATES_BY_CATEGORY[category] || DEFAULT_ORCAMENTO_MESSAGE;
}

/**
 * Carrega templates salvos de WhatsApp diretamente do Supabase
 */
export async function loadWhatsAppTemplatesFromSupabase(): Promise<Record<string, string>> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await withTimeout(
        client
          .from('fenix_kv_store')
          .select('data')
          .eq('key', 'fenix_whatsapp_templates_by_category')
          .maybeSingle(),
        3000,
        { data: null, error: null }
      );
      if (!error && data && data.data) {
        let parsed = data.data;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {}
        }
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem(STORAGE_WHATSAPP_CATEGORIES_KEY, JSON.stringify(parsed));
          if (parsed['Envio de Orçamento']) {
            localStorage.setItem(STORAGE_ORCAMENTO_MSG_KEY, parsed['Envio de Orçamento']);
          }
          window.dispatchEvent(new CustomEvent('fenix_orcamento_msg_updated'));
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Falha não bloqueante ao buscar modelos WhatsApp do Supabase:', err);
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_WHATSAPP_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Salva o template da mensagem de WhatsApp para uma categoria específica
 */
export function saveWhatsAppMessageTemplate(category: WhatsAppCategory, template: string): void {
  try {
    let map: Record<string, string> = {};
    const raw = localStorage.getItem(STORAGE_WHATSAPP_CATEGORIES_KEY);
    if (raw) {
      map = JSON.parse(raw) || {};
    }
    map[category] = template;
    localStorage.setItem(STORAGE_WHATSAPP_CATEGORIES_KEY, JSON.stringify(map));
    
    // Sincroniza também chave legada se for Envio de Orçamento
    if (category === 'Envio de Orçamento') {
      localStorage.setItem(STORAGE_ORCAMENTO_MSG_KEY, template);
    }
    window.dispatchEvent(new CustomEvent('fenix_orcamento_msg_updated'));

    // Sincroniza oficialmente com o Supabase
    saveWholeCollectionToSupabase('fenix_whatsapp_templates_by_category', map).catch((err) => {
      console.warn('Erro ao salvar template WhatsApp no Supabase:', err);
    });
  } catch {}
}

/**
 * Retorna o template salvo da mensagem de orçamento ou o padrão (retrocompatibilidade)
 */
export function getOrcamentoMessageTemplate(category?: string): string {
  if (category && (WHATSAPP_CATEGORIES as string[]).includes(category)) {
    return getWhatsAppMessageTemplate(category as WhatsAppCategory);
  }
  return getWhatsAppMessageTemplate('Envio de Orçamento');
}

/**
 * Salva o template da mensagem de orçamento (retrocompatibilidade)
 */
export function saveOrcamentoMessageTemplate(template: string, category?: string): void {
  if (category && (WHATSAPP_CATEGORIES as string[]).includes(category)) {
    saveWhatsAppMessageTemplate(category as WhatsAppCategory, template);
  } else {
    saveWhatsAppMessageTemplate('Envio de Orçamento', template);
  }
}

/**
 * Formata a mensagem com os dados dinâmicos do orçamento
 */
export function formatOrcamentoMessage(
  template: string,
  data: OrcamentoMessageData
): string {
  const clientName = data.clientName?.trim() || 'Cliente';
  const totalFinalFormatted = (data.totalFinal || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const consultoraName = data.consultoraName?.trim() || 'Consultora Comercial';

  // Formata lista de produtos
  let itemsListText = '';
  if (data.items && data.items.length > 0) {
    itemsListText = data.items
      .map((i) => {
        const qtd = i.qtd || '1';
        const un = i.unidade || 'un';
        const desc = i.descricao || 'Produto';
        const itemTotal = (i.total || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        return `• ${qtd} ${un} - ${desc} (${itemTotal})`;
      })
      .join('\n');
  } else {
    itemsListText = '• Conforme especificações do espelho oficial';
  }

  // Formata frete
  let freteText = '';
  if (data.freteAtivo && (data.freteValor || 0) > 0) {
    const freteValorFmt = (data.freteValor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const endereco = data.freteEndereco ? ` (${data.freteEndereco})` : '';
    freteText = `\n🚚 Frete: ${freteValorFmt}${endereco}`;
  } else {
    freteText = '\n🚚 Frete não incluso — a calcular após fechamento';
  }

  // Formata desconto se houver
  let descontoText = '';
  if ((data.descontoValor || 0) > 0) {
    const descValorFmt = (data.descontoValor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const labelDesc = data.descontoTexto || 'DESCONTO ESPECIAL APLICADO:';
    descontoText = `\n🏷️ ${labelDesc} - ${descValorFmt}`;
  }

  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const dynamicGreeting = getDynamicGreeting();

  // Substituição de todas as tags conhecidas
  let result = template
    .replace(/\{saudacao\}|\{greeting\}/gi, dynamicGreeting)
    .replace(/\{cliente\}|\{clientName\}|\{nomeCliente\}/gi, clientName)
    .replace(/\{valor\}|\{totalFinal\}|\{total\}/gi, totalFinalFormatted)
    .replace(/\{produtos\}|\{itens\}|\{items\}/gi, itemsListText)
    .replace(/\{frete\}/gi, freteText)
    .replace(/\{desconto\}|\{descontoAplicado\}/gi, descontoText)
    .replace(/\{consultora\}|\{vendedora\}|\{consultor\}/gi, consultoraName)
    .replace(/\{empresa\}/gi, 'Fênix World Distribuidora')
    .replace(/\{pedido\}|\{numeroOrcamento\}|\{numero\}/gi, data.numeroOrcamento || '')
    .replace(/\{data\}|\{dataAtual\}/gi, dataHoje);

  // Evita duplicações acidentais de saudação no início da mensagem
  result = result
    .replace(/(Bom dia)[\s,!.-]+(Bom dia)/gi, '$1')
    .replace(/(Boa tarde)[\s,!.-]+(Boa tarde)/gi, '$1')
    .replace(/(Boa noite)[\s,!.-]+(Boa noite)/gi, '$1')
    .replace(/(Olá|Ola)[\s,!.-]+(Olá|Ola)/gi, '$1');

  if (consultoraName.toLowerCase().includes('eder')) {
    result = result
      .replace(/Consultora Comercial:\s*Éder/gi, 'Diretor: Éder')
      .replace(/Consultora Comercial:\s*Eder/gi, 'Diretor: Eder')
      .replace(/Aqui é a Éder/gi, 'Aqui é o Éder');
  }

  return result;
}

// ----------------------------------------------------------------------
// CONFIGURAÇÕES DE METAS E CÁLCULO DE DIAS BASEADO NA DATA ATUAL
// ----------------------------------------------------------------------

export const STORAGE_METAS_CONFIG_KEY = 'fenix_metas_config_v2';
export const STORAGE_METAS_TARGET_KEY = 'fenix_metas_target_value';
export const STORAGE_INDIVIDUAL_METAS_KEY = 'fenix_metas_individuais_v1';

export interface IndividualMetasMap {
  eder: number;
  vanessa: number;
  jhessica: number;
  jeferson?: number;
  [key: string]: number | undefined;
}

export const DEFAULT_INDIVIDUAL_METAS: IndividualMetasMap = {
  eder: 100000,
  vanessa: 300000,
  jhessica: 100000,
  jeferson: 100000,
};

export function normalizeUserMetaKey(userNameOrKey?: string | null): 'eder' | 'vanessa' | 'jhessica' | 'jeferson' | string {
  if (!userNameOrKey) return 'todos';
  const lower = userNameOrKey.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (lower.includes('eder')) return 'eder';
  if (lower.includes('vanessa')) return 'vanessa';
  if (lower.includes('jhes') || lower.includes('jess')) return 'jhessica';
  if (lower.includes('jeferson') || lower.includes('troles')) return 'jeferson';
  return lower.replace(/[^a-z0-9]/g, '');
}

export function calculateMetaTodos(metas: IndividualMetasMap): number {
  const eder = Number(metas.eder) || 0;
  const vanessa = Number(metas.vanessa) || 0;
  const jhessica = Number(metas.jhessica) || 0;
  const jeferson = Number(metas.jeferson) || 0;
  return eder + vanessa + jhessica + jeferson;
}

export function getIndividualMetas(): IndividualMetasMap {
  try {
    const saved = localStorage.getItem(STORAGE_INDIVIDUAL_METAS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'object' && parsed !== null) {
        // Se for versão anterior (vanessa com 80k ou sem jeferson), atualiza para as metas oficiais solicitadas
        if (parsed.vanessa === 80000 || !parsed.jeferson) {
          const merged: IndividualMetasMap = {
            ...DEFAULT_INDIVIDUAL_METAS,
            ...parsed,
            vanessa: parsed.vanessa === 80000 ? 300000 : parsed.vanessa,
            jeferson: parsed.jeferson || 100000,
          };
          saveIndividualMetas(merged);
          return merged;
        }
        return {
          ...DEFAULT_INDIVIDUAL_METAS,
          ...parsed,
        };
      }
    }
  } catch {}
  return { ...DEFAULT_INDIVIDUAL_METAS };
}

export function saveIndividualMetas(metas: IndividualMetasMap): void {
  try {
    localStorage.setItem(STORAGE_INDIVIDUAL_METAS_KEY, JSON.stringify(metas));
    // Sincroniza o alvo geral do mês com a meta "Todos"
    const total = calculateMetaTodos(metas);
    localStorage.setItem(STORAGE_METAS_TARGET_KEY, total.toString());
    window.dispatchEvent(new CustomEvent('fenix_metas_config_updated'));
    window.dispatchEvent(new CustomEvent('fenix_metas_updated'));

    // Sincroniza oficialmente com o Supabase
    saveWholeCollectionToSupabase('fenix_individual_metas_map', metas).catch(() => {});
  } catch {}
}

export function updateSingleUserMeta(userNameOrKey: string, newMetaValue: number): IndividualMetasMap {
  const current = getIndividualMetas();
  const key = normalizeUserMetaKey(userNameOrKey);
  const updated: IndividualMetasMap = {
    ...current,
    [key]: Math.max(0, Number(newMetaValue) || 0),
  };
  saveIndividualMetas(updated);
  return updated;
}

import { isDiaUtil, getFeriadosNacionais, getTodosFeriados, getFeriadoInfo } from './feriadosBrasil';

export interface MetasParametersConfig {
  metaValor: number; // ex: 400000
  modoCalculoDias: 'automatico' | 'manual'; // 'automatico' (baseado na data atual) | 'manual'
  diasUteisMesManual: number; // total de dias úteis customizado no mês
  diasUteisRestantesManual: number; // dias úteis restantes customizado
  semanasComerciais: number; // customizado ou calculado
  incluirDiaAtualNoRestante: boolean; // se hoje for dia útil comercial, considera no restante
}

export interface MetasCalculatedDates {
  dateObj: Date;
  currentDateFormatted: string; // "16/09/2026"
  dayOfWeekName: string; // "Quarta-feira"
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  currentDay: number; // 16
  currentMonthZeroIndex: number; // 8 (Setembro)
  currentYear: number; // 2026
  monthName: string; // "Setembro"
  monthYearLabel: string; // "Setembro 2026"
  totalDaysInMonth: number; // 30
  diasDecorridos: number; // 16
  diasRestantes: number; // 14 (30 - 16)
  totalWorkingDays: number; // 21 (úteis no mês, excluindo feriados e finais de semana)
  workingDaysElapsed: number; // 10
  remainingWorkingDays: number; // 11 (dias úteis restantes reais)
  semanasComerciais: number; // total de semanas comerciais do mês (ex: 4 ou 5)
  semanasTotais: number; // total de semanas no mês
  semanaAtual: number; // semana atual no mês (ex: 3)
  semanasRestantes: number; // semanas comerciais restantes disponíveis no período (ex: 3)
  feriadosNoMes: { data: string; nome: string; dia: number }[];
  isManualOverride: boolean;
}

export const DEFAULT_METAS_CONFIG: MetasParametersConfig = {
  metaValor: 400000,
  modoCalculoDias: 'automatico',
  diasUteisMesManual: 21,
  diasUteisRestantesManual: 11,
  semanasComerciais: 4,
  incluirDiaAtualNoRestante: true,
};

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

/**
 * Calcula os dias corridos, dias decorridos, dias restantes, dias úteis reais
 * (descontando sábados, domingos e feriados nacionais/estaduais/municipais)
 * e semanas comerciais disponíveis restantes de forma 100% automática e dinâmica.
 */
export function calculateCurrentMetasDates(
  customConfig?: Partial<MetasParametersConfig>,
  referenceDate?: Date
): MetasCalculatedDates {
  const now = referenceDate || new Date();
  const year = now.getFullYear();
  const monthZero = now.getMonth();
  const currentDay = now.getDate();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const todayHolidayInfo = getFeriadoInfo(now);
  const isHoliday = todayHolidayInfo.isFeriado;
  const holidayName = todayHolidayInfo.nome;

  const totalDaysInMonth = new Date(year, monthZero + 1, 0).getDate();
  const diasDecorridos = currentDay;
  const diasRestantes = Math.max(0, totalDaysInMonth - currentDay);

  let autoTotalWorkingDays = 0;
  let autoWorkingDaysElapsed = 0;
  let autoRemainingWorkingDays = 0;

  const feriadosNoMes: { data: string; nome: string; dia: number }[] = [];

  // Mapeamento das semanas do mês
  // Cada semana inicia na segunda-feira ou dia 1
  let weekCounter = 1;
  let currentWeekNumber = 1;
  const daysInWeeks: Map<number, number[]> = new Map();

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(year, monthZero, day);
    const dow = d.getDay(); // 0 = Domingo, 1 = Segunda ... 6 = Sábado

    // Se for segunda-feira e não for o dia 1, avança o contador de semanas
    if (dow === 1 && day > 1) {
      weekCounter++;
    }

    if (!daysInWeeks.has(weekCounter)) {
      daysInWeeks.set(weekCounter, []);
    }
    daysInWeeks.get(weekCounter)?.push(day);

    if (day === currentDay) {
      currentWeekNumber = weekCounter;
    }

    // Identificar feriados do mês
    const feriado = getFeriadoInfo(d);
    if (feriado.isFeriado) {
      feriadosNoMes.push({
        data: `${year}-${String(monthZero + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        nome: feriado.nome || 'Feriado',
        dia: day,
      });
    }

    // Regra oficial: Segunda a Sexta E NÃO Feriado
    const util = isDiaUtil(d);

    if (util) {
      autoTotalWorkingDays++;
      if (day < currentDay) {
        autoWorkingDaysElapsed++;
      } else if (day === currentDay) {
        const includeToday = customConfig?.incluirDiaAtualNoRestante !== false;
        if (includeToday) {
          autoRemainingWorkingDays++;
        } else {
          autoWorkingDaysElapsed++;
        }
      } else {
        autoRemainingWorkingDays++;
      }
    }
  }

  const totalSemanasNoMes = weekCounter;

  // Semanas disponíveis restantes no mês:
  // A semana atual mais todas as semanas subsequentes até o final do período
  const autoSemanasRestantes = Math.max(1, totalSemanasNoMes - currentWeekNumber + 1);

  const isManual = customConfig?.modoCalculoDias === 'manual';

  const totalWorkingDays =
    isManual && typeof customConfig?.diasUteisMesManual === 'number'
      ? Math.max(1, customConfig.diasUteisMesManual)
      : Math.max(1, autoTotalWorkingDays);

  const remainingWorkingDays =
    isManual && typeof customConfig?.diasUteisRestantesManual === 'number'
      ? Math.max(0, customConfig.diasUteisRestantesManual)
      : Math.max(0, autoRemainingWorkingDays);

  // Semanas comerciais restantes: no modo automático, calcula dinamicamente
  const semanasRestantes =
    isManual && typeof customConfig?.semanasComerciais === 'number'
      ? Math.max(1, customConfig.semanasComerciais)
      : autoSemanasRestantes;

  const dayStr = String(currentDay).padStart(2, '0');
  const monthStr = String(monthZero + 1).padStart(2, '0');
  const currentDateFormatted = `${dayStr}/${monthStr}/${year}`;
  const monthName = MONTH_NAMES_PT[monthZero] || 'Mês';
  const monthYearLabel = `${monthName} ${year}`;
  const dayOfWeekName = WEEKDAY_NAMES_PT[dayOfWeek] || '';

  return {
    dateObj: now,
    currentDateFormatted,
    dayOfWeekName,
    isWeekend,
    isHoliday,
    holidayName,
    currentDay,
    currentMonthZeroIndex: monthZero,
    currentYear: year,
    monthName,
    monthYearLabel,
    totalDaysInMonth,
    diasDecorridos,
    diasRestantes,
    totalWorkingDays,
    workingDaysElapsed: autoWorkingDaysElapsed,
    remainingWorkingDays,
    semanasComerciais: totalSemanasNoMes,
    semanasTotais: totalSemanasNoMes,
    semanaAtual: currentWeekNumber,
    semanasRestantes,
    feriadosNoMes,
    isManualOverride: isManual,
  };
}

/**
 * Lê as configurações salvas de metas
 */
export function getMetasParametersConfig(): MetasParametersConfig {
  try {
    // Tenta ler valor da meta salvo isoladamente para retrocompatibilidade
    let metaValor = DEFAULT_METAS_CONFIG.metaValor;
    const savedMetaVal = localStorage.getItem(STORAGE_METAS_TARGET_KEY);
    if (savedMetaVal) {
      const parsed = parseFloat(savedMetaVal);
      if (!isNaN(parsed) && parsed > 0) metaValor = parsed;
    }

    const saved = localStorage.getItem(STORAGE_METAS_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_METAS_CONFIG,
        ...parsed,
        metaValor: parsed.metaValor || metaValor,
      };
    }

    return {
      ...DEFAULT_METAS_CONFIG,
      metaValor,
    };
  } catch {
    return DEFAULT_METAS_CONFIG;
  }
}

/**
 * Carrega configurações de metas do Supabase
 */
export async function loadMetasConfigsFromSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { data: configRow } = await withTimeout(
      client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', 'fenix_metas_config_data')
        .maybeSingle(),
      3000,
      { data: null }
    );
    if (configRow && configRow.data) {
      let parsed = configRow.data;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {}
      }
      if (parsed && typeof parsed === 'object') {
        localStorage.setItem(STORAGE_METAS_CONFIG_KEY, JSON.stringify(parsed));
        if (parsed.metaValor) {
          localStorage.setItem(STORAGE_METAS_TARGET_KEY, parsed.metaValor.toString());
        }
      }
    }

    const { data: individualRow } = await withTimeout(
      client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', 'fenix_individual_metas_map')
        .maybeSingle(),
      3000,
      { data: null }
    );
    if (individualRow && individualRow.data) {
      let parsed = individualRow.data;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {}
      }
      if (parsed && typeof parsed === 'object') {
        localStorage.setItem(STORAGE_INDIVIDUAL_METAS_KEY, JSON.stringify(parsed));
      }
    }

    window.dispatchEvent(new CustomEvent('fenix_metas_config_updated'));
    window.dispatchEvent(new CustomEvent('fenix_metas_updated'));
  } catch (err) {
    console.warn('Falha não bloqueante ao buscar metas do Supabase:', err);
  }
}

/**
 * Salva as configurações de metas e dispara evento de sincronização
 */
export function saveMetasParametersConfig(config: MetasParametersConfig): void {
  try {
    localStorage.setItem(STORAGE_METAS_CONFIG_KEY, JSON.stringify(config));
    if (config.metaValor) {
      localStorage.setItem(STORAGE_METAS_TARGET_KEY, config.metaValor.toString());
    }
    window.dispatchEvent(new CustomEvent('fenix_metas_config_updated'));
    window.dispatchEvent(new CustomEvent('fenix_metas_updated'));

    // Sincroniza oficialmente com o Supabase
    saveWholeCollectionToSupabase('fenix_metas_config_data', config).catch(() => {});
  } catch {}
}
