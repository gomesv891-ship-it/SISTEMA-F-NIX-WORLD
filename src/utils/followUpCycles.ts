/**
 * followUpCycles.ts
 * Implementação rigorosa das regras oficiais de contagem de prazos, atrasados,
 * retornos hoje e ciclos de 2 dias úteis do Follow-up Fênix.
 *
 * REGRAS OFICIAIS:
 * 1. CONTAGEM DO PRAZO: 2 dias úteis (Segunda a sexta, excluindo sábado, domingo e feriados).
 * 2. APÓS 2 DIAS ÚTEIS: Notificação no sininho às 08:00, "Retornos Hoje" e "Atrasados".
 * 3. RETORNOS HOJE: Apenas no dia em que o ciclo de 2 dias úteis vence. Depois do dia, sai de "Retornos Hoje".
 * 4. ATRASADOS: Ultrapassou 2 dias úteis sem resolução (Vendido/Perdido), permanece em "Atrasados".
 * 5. NOVO CICLO: Ao contatar o cliente sem resolução, inicia novo ciclo de 2 dias úteis.
 *    Permanece em "Atrasados", sai de "Retornos Hoje", e volta a "Retornos Hoje" quando completar 2 dias úteis.
 * 6. SÁBADOS, DOMINGOS E FERIADOS: Nunca contam no ciclo, não geram notificação, não entram em "Retornos Hoje".
 * 7. VENDIDO OU PERDIDO: Remove de "Atrasados", remove de "Retornos Hoje", cancela ciclos e notificações.
 * 8. SININHO DESATIVADO: Não gera notificações nem novos alertas. Não altera status.
 * 9. REGRA DO SININHO: Notificação apenas às 08:00 do vencimento do ciclo, máx 1 por dia.
 */

import { FollowUpItem } from '../types';
import { isDiaUtil, formatDateKey } from './feriadosBrasil';

export { formatDateKey };

/**
 * Converte qualquer representação de data (ISO, DD/MM/YYYY, YYYY-MM-DD, Date)
 * em um objeto Date configurado com horário zerado no fuso local.
 */
export function parseDateOnly(dateVal?: string | Date | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  try {
    // Formato brasileiro: DD/MM/YYYY
    if (str.includes('/')) {
      const parts = str.split(' ')[0].split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          const dt = new Date(y, m, d);
          return isNaN(dt.getTime()) ? null : dt;
        }
      }
    }

    // Formato ISO ou YYYY-MM-DD
    const isoPart = str.split('T')[0].split(' ')[0];
    const parts = isoPart.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const dt = new Date(y, m, d);
        return isNaN(dt.getTime()) ? null : dt;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Adiciona exatamente N dias úteis a uma data inicial,
 * desconsiderando sábados, domingos e feriados (nacionais e customizados).
 * Exemplo: Sexta-feira + 2 dias úteis = Terça-feira.
 */
export function addBusinessDays(startDate: Date, businessDaysToAdd: number = 2): Date {
  const curr = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let added = 0;

  while (added < businessDaysToAdd) {
    curr.setDate(curr.getDate() + 1);
    if (isDiaUtil(curr)) {
      added++;
    }
  }

  return curr;
}

/**
 * Conta quantos dias úteis decorreram estritamente após startDate até endDate (inclusive).
 * Sábados, domingos e feriados são ignorados.
 */
export function countBusinessDaysElapsed(startDate: Date, endDate: Date): number {
  const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  if (s >= e) return 0;

  let count = 0;
  const curr = new Date(s);

  while (curr < e) {
    curr.setDate(curr.getDate() + 1);
    if (isDiaUtil(curr)) {
      count++;
    }
  }

  return count;
}

/**
 * Retorna a data original em que o Follow-up foi gerado ou entrou na esteira.
 */
export function getFollowUpCreationDate(item: FollowUpItem): Date {
  const parsed = parseDateOnly(
    item.dataEntradaFollowUp ||
    item.dataCriacao ||
    item.createdAt ||
    item.dataEnvio
  );
  if (parsed) return parsed;
  return new Date();
}

/**
 * Retorna a data de início do ciclo atual de 2 dias úteis.
 * Se o usuário registrou um contato recente (dataUltimoContato ou dataCicloAtual),
 * essa data marca o início do novo ciclo de 2 dias úteis.
 * Caso contrário, o ciclo teve início na data de criação do follow-up.
 */
export function getFollowUpCycleStartDate(item: FollowUpItem): Date {
  const creationDate = getFollowUpCreationDate(item);

  if ((item as any).dataUltimoContato) {
    const contactDate = parseDateOnly((item as any).dataUltimoContato);
    if (contactDate && contactDate >= creationDate) {
      return contactDate;
    }
  }

  if ((item as any).dataCicloAtual) {
    const cicloDate = parseDateOnly((item as any).dataCicloAtual);
    if (cicloDate && cicloDate >= creationDate) {
      return cicloDate;
    }
  }

  return creationDate;
}

/**
 * REGRA PRINCIPAL — ATRASADOS:
 * "Depois que o prazo de 2 dias úteis for ultrapassado sem resolução:
 * - O Follow-up entra em 'Atrasados'.
 * - Continua em 'Atrasados' enquanto não estiver como Vendido ou Perdido.
 * - Pode permanecer atrasado por vários dias."
 *
 * @returns true se já decorreram 2 ou mais dias úteis desde a criação e não está Vendido ou Perdido.
 */
export function isFollowUpAtrasado(item: FollowUpItem, referenceNow: Date = new Date()): boolean {
  // 7. Vendido ou Perdido: remover de Atrasados imediatamente
  if (item.status === 'Vendido' || item.status === 'Perdido') {
    return false;
  }

  const creationDate = getFollowUpCreationDate(item);
  const today = parseDateOnly(referenceNow) || new Date();

  const businessDaysElapsed = countBusinessDaysElapsed(creationDate, today);

  // Entra e permanece em atrasados após 2 dias úteis decorridos
  return businessDaysElapsed >= 2;
}

/**
 * REGRA PRINCIPAL — RETORNOS HOJE:
 * "'Retornos Hoje' deve mostrar SOMENTE os Follow-ups cujo ciclo de 2 dias úteis
 * vence naquele dia e, portanto, gerará a notificação daquele ciclo.
 * Depois que o dia passar:
 * - O Follow-up sai de 'Retornos Hoje'.
 * - Se continuar sem resolução, permanece em 'Atrasados'.
 * Um Follow-up atrasado NÃO deve aparecer continuamente em 'Retornos Hoje'.
 * Ele só volta para 'Retornos Hoje' quando chegar a data do próximo ciclo de 2 dias úteis."
 *
 * 6. Sábados, domingos e feriados: nunca entram em "Retornos Hoje".
 *
 * @returns true SOMENTE se hoje for dia útil E o ciclo de 2 dias úteis vencer hoje.
 */
export function isFollowUpRetornoHoje(item: FollowUpItem, referenceNow: Date = new Date()): boolean {
  // 7. Vendido ou Perdido: remover de Retornos Hoje imediatamente
  if (item.status === 'Vendido' || item.status === 'Perdido') {
    return false;
  }

  const today = parseDateOnly(referenceNow) || new Date();

  // 6. Sábados, domingos e feriados nunca entram em "Retornos Hoje"
  if (!isDiaUtil(today)) {
    return false;
  }

  const cycleStartDate = getFollowUpCycleStartDate(item);
  const businessDaysInCycle = countBusinessDaysElapsed(cycleStartDate, today);

  // Vence exatamente hoje se completou 2 dias úteis (ou múltiplos de 2 dias úteis para ciclos recorrentes sem contato)
  if (businessDaysInCycle >= 2 && businessDaysInCycle % 2 === 0) {
    return true;
  }

  return false;
}

/**
 * Calcula a data exata em que o ciclo atual de 2 dias úteis vence.
 */
export function getFollowUpProximoRetornoDate(item: FollowUpItem, referenceNow: Date = new Date()): Date {
  const cycleStartDate = getFollowUpCycleStartDate(item);
  const today = parseDateOnly(referenceNow) || new Date();
  const businessDaysInCycle = countBusinessDaysElapsed(cycleStartDate, today);

  if (businessDaysInCycle < 2) {
    return addBusinessDays(cycleStartDate, 2);
  }

  // Se já passou, calcula o próximo vencimento (próximo múltiplo par de dias úteis)
  const nextTargetDays = Math.ceil((businessDaysInCycle + 1) / 2) * 2;
  return addBusinessDays(cycleStartDate, nextTargetDays);
}
