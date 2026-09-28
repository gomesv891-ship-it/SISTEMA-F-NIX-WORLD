/**
 * feriadosBrasil.ts
 * Cálculo oficial de Feriados Nacionais Brasileiros (fixos e móveis)
 * e estrutura extensível para feriados estaduais, municipais e personalizados.
 */

export interface Feriado {
  data: string; // Formato "YYYY-MM-DD"
  nome: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'personalizado';
  descricao?: string;
}

const STORAGE_CUSTOM_FERIADOS_KEY = 'fenix_feriados_custom';

/**
 * Calcula a data do Domingo de Páscoa no calendário Gregoriano
 * usando o algoritmo de Butcher/Meeus.
 */
export function calcularPascoa(ano: number): { mes: number; dia: number } {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

/**
 * Retorna todos os feriados nacionais brasileiros para o ano especificado.
 */
export function getFeriadosNacionais(ano: number): Feriado[] {
  const feriados: Feriado[] = [];

  const add = (mes: number, dia: number, nome: string) => {
    const mm = String(mes).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    feriados.push({
      data: `${ano}-${mm}-${dd}`,
      nome,
      tipo: 'nacional',
    });
  };

  // 1. Feriados Nacionais Fixos (Leis Federais)
  add(1, 1, 'Confraternização Universal (Ano Novo)');
  add(4, 21, 'Tiradentes');
  add(5, 1, 'Dia Mundial do Trabalho');
  add(9, 7, 'Independência do Brasil');
  add(10, 12, 'Nossa Senhora Aparecida (Padroeira do Brasil)');
  add(11, 2, 'Finados');
  add(11, 15, 'Proclamação da República');
  add(11, 20, 'Dia Nacional de Zumbi e da Consciência Negra'); // Lei 14.759/2023
  add(12, 25, 'Natal');

  // 2. Feriados Móveis baseados na Páscoa
  const pascoa = calcularPascoa(ano);
  const dataPascoa = new Date(ano, pascoa.mes - 1, pascoa.dia);

  const addOffset = (diasOffset: number, nome: string) => {
    const d = new Date(dataPascoa.getTime());
    d.setDate(d.getDate() + diasOffset);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    feriados.push({
      data: `${ano}-${mm}-${dd}`,
      nome,
      tipo: 'nacional',
    });
  };

  // Carnaval: Segunda e Terça-feira (Terça = Páscoa - 47 dias, Segunda = Páscoa - 48 dias)
  addOffset(-48, 'Carnaval (Segunda-feira)');
  addOffset(-47, 'Carnaval (Terça-feira)');

  // Sexta-feira Santa (Paixão de Cristo): Páscoa - 2 dias
  addOffset(-2, 'Sexta-feira Santa (Paixão de Cristo)');

  // Domingo de Páscoa
  addOffset(0, 'Páscoa');

  // Corpus Christi: Páscoa + 60 dias (Quinta-feira)
  addOffset(60, 'Corpus Christi');

  return feriados;
}

/**
 * Obtém feriados adicionais (estaduais, municipais ou personalizados) salvos.
 */
export function getFeriadosCustom(): Feriado[] {
  try {
    const saved = localStorage.getItem(STORAGE_CUSTOM_FERIADOS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Cadastra um novo feriado estadual, municipal ou personalizado.
 */
export function salvarFeriadoCustom(feriado: Feriado): void {
  try {
    const atuais = getFeriadosCustom();
    const filtrados = atuais.filter((f) => f.data !== feriado.data);
    filtrados.push(feriado);
    localStorage.setItem(STORAGE_CUSTOM_FERIADOS_KEY, JSON.stringify(filtrados));
  } catch (err) {
    console.error('Erro ao salvar feriado customizado:', err);
  }
}

/**
 * Retorna todos os feriados (nacionais + estaduais/municipais/customizados) para um ano.
 */
export function getTodosFeriados(ano: number): Feriado[] {
  const nacionais = getFeriadosNacionais(ano);
  const custom = getFeriadosCustom().filter((f) => {
    return f.data.startsWith(`${ano}-`);
  });
  return [...nacionais, ...custom];
}

/**
 * Formata um objeto Date para string "YYYY-MM-DD".
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Verifica se uma data específica é feriado.
 */
export function getFeriadoInfo(date: Date): { isFeriado: boolean; nome?: string; tipo?: string } {
  const ano = date.getFullYear();
  const feriados = getTodosFeriados(ano);
  const key = formatDateKey(date);
  const match = feriados.find((f) => f.data === key);

  if (match) {
    return { isFeriado: true, nome: match.nome, tipo: match.tipo };
  }
  return { isFeriado: false };
}

/**
 * Verifica se um dia é útil de acordo com as regras:
 * - Segunda a Sexta-feira: Útil (exceto se for feriado)
 * - Sábado: NÃO útil
 * - Domingo: NÃO útil
 * - Feriado (Nacional, Estadual ou Municipal): NÃO útil
 */
export function isDiaUtil(date: Date): boolean {
  const dow = date.getDay(); // 0 = Domingo, 6 = Sábado
  if (dow === 0 || dow === 6) {
    return false;
  }
  const feriado = getFeriadoInfo(date);
  if (feriado.isFeriado) {
    return false;
  }
  return true;
}

/**
 * Conta a quantidade de dias úteis em um intervalo de datas (inclusive).
 */
export function contarDiasUteisIntervalo(dataInicio: Date, dataFim: Date): number {
  let count = 0;
  const curr = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
  const fim = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());

  while (curr <= fim) {
    if (isDiaUtil(curr)) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}
