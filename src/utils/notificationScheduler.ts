import { FollowUpItem, TaskItem } from '../types';
import { sendUserNotification } from './notifications';
import { isRecordOfResponsible } from './userDataFilter';
import { saveItemToSupabase } from './supabaseClient';
import { isDiaUtil, formatDateKey } from './feriadosBrasil';
import {
  isFollowUpRetornoHoje,
  isFollowUpAtrasado,
  getFollowUpProximoRetornoDate,
  formatDateKey as toFormatDateKey,
} from './followUpCycles';

/**
 * Calculates calendar days elapsed between dateStr and today
 */
function getElapsedCalendarDays(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    let parsedDate: Date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
      } else {
        parsedDate = new Date(dateStr);
      }
    } else {
      parsedDate = new Date(dateStr);
    }
    if (isNaN(parsedDate.getTime())) return 0;
    const diffMs = Date.now() - parsedDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Requirement 5: FOLLOW-UP — LEMBRETE AUTOMÁTICO
 * Após 2 dias, se um orçamento estiver no Follow-up e ainda NÃO estiver marcado como:
 * Vendido ou Perdido
 * gerar uma nova notificação no sino para lembrar o usuário de entrar novamente em contato com o cliente.
 * A notificação deve:
 * - aparecer no sino;
 * - respeitar o usuário responsável pelo Follow-up;
 * - tocar o som da notificação conforme a configuração de volume;
 * - funcionar mesmo que a tela de Follow-up ou o sino não estejam abertos.
 * - Não gerar notificações para Follow-ups já marcados como Vendido ou Perdido.
 */
export function checkFollowUpTwoDayAlerts(): void {
  if (typeof window === 'undefined') return;

  try {
    const now = new Date();

    // Regra 6: SÁBADOS, DOMINGOS E FERIADOS: Nunca contar esses dias no ciclo. Também não gerar notificação.
    if (!isDiaUtil(now)) {
      return;
    }

    // Regra 2 e 9: Notificação deve ocorrer somente a partir das 08:00 do vencimento do ciclo
    if (now.getHours() < 8) {
      return;
    }

    const raw = localStorage.getItem('fenix_followup_cards_v2') || localStorage.getItem('fenix_followup_db');
    if (!raw) return;
    const items: FollowUpItem[] = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) return;

    let itemsModified = false;
    const todayDateStr = formatDateKey(now);

    const updatedItems = items.map((item) => {
      const alertKey = `fenix_fup_last_date_${item.id}`;

      // Regra 7: Se o Follow-up estiver marcado como Vendido ou Perdido:
      // Remover de Atrasados, remover de Retornos Hoje, cancelar próximos ciclos e não gerar novas notificações
      const isFinished = item.status === 'Vendido' || item.status === 'Perdido';
      if (isFinished) {
        try {
          localStorage.removeItem(alertKey);
          localStorage.removeItem(`fenix_fup_alerted_2dias_${item.id}`);
          localStorage.removeItem(`fenix_fup_next_date_${item.id}`);
        } catch {}
        if (item.lembretesAtivos !== false) {
          itemsModified = true;
          return { ...item, lembretesAtivos: false };
        }
        return item;
      }

      // Regra 8: Se o sininho daquele Follow-up estiver desativado:
      // Não gerar notificações, não gerar novos alertas. Não alterar status.
      if (item.lembretesAtivos === false) {
        return item;
      }

      // Regra 3 e 9: Notificação ocorre SOMENTE na data em que o ciclo de 2 dias úteis vence ("Retornos Hoje")
      const isRetornoHoje = isFollowUpRetornoHoje(item, now);
      if (!isRetornoHoje) {
        return item;
      }

      // Regra 9: Não gerar mais de uma notificação para o mesmo Follow-up no mesmo dia
      const lastAlertDate = localStorage.getItem(alertKey);
      if (lastAlertDate === todayDateStr) {
        return item;
      }

      // Ciclo de 2 dias úteis venceu hoje às 08:00 e sininho ativo: Disparar notificação!
      localStorage.setItem(alertKey, todayDateStr);

      const proximoRetorno = getFollowUpProximoRetornoDate(item, now);
      localStorage.setItem(`fenix_fup_next_date_${item.id}`, toFormatDateKey(proximoRetorno));
      itemsModified = true;

      const responsibleUser = item.responsavel || item.vendedor || item.criadoPor || 'Vanessa Gomes';
      const valorFormatado = (typeof item.valor === 'number' && !isNaN(item.valor) ? item.valor : 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      // Dispara notificação no sino com som configurado para Follow-up e ID único determinístico
      sendUserNotification({
        id: `notif_fup_${item.id}_${todayDateStr}`,
        category: 'Follow-up',
        title: `Lembrete Follow-up: ${item.cliente}`,
        description: `Orçamento #${item.pedido || item.id} de ${item.cliente} (${item.produto || 'Orçamento'} • ${valorFormatado}) atingiu o ciclo de 2 dias úteis para retorno.`,
        targetTab: 'Follow-up',
        recipientName: responsibleUser,
        authorName: 'Sistema Follow-up',
        metadata: {
          followUpId: item.id,
          cliente: item.cliente,
          clientName: item.cliente,
          type: 'followup_pending_reminder',
        },
      });

      return {
        ...item,
        cobrancaAutomaticaGerada: true,
        dataUltimaCobranca: now.toISOString(),
      };
    });

    if (itemsModified) {
      localStorage.setItem('fenix_followup_cards_v2', JSON.stringify(updatedItems));
      updatedItems.forEach((it) => {
        if (it.cobrancaAutomaticaGerada) {
          saveItemToSupabase('fenix_followup_cards_v2', it, 'id', 'Sistema Fênix').catch(() => {});
        }
      });
      window.dispatchEvent(new Event('fenix_followup_updated'));
    }
  } catch (err) {
    console.warn('Erro na verificação de lembretes automáticos do Follow-up:', err);
  }
}

/**
 * Requirement 8: TAREFAS — NOTIFICAÇÃO NO DIA E HORÁRIO
 * Quando o usuário salvar uma tarefa com data e horário definidos:
 * Exatamente no dia e horário programados:
 * - gerar uma notificação no sino;
 * - tocar o som da notificação;
 * - manter a notificação no sino até ser visualizada/gerenciada conforme a lógica existente.
 * A notificação deve funcionar mesmo quando:
 * - a tela de Tarefas não estiver aberta;
 * - o sino não estiver aberto;
 * - o usuário estiver em outra tela do sistema.
 * A tarefa deve continuar vinculada ao usuário que a criou.
 */
export function checkScheduledTaskAlerts(): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem('fenix_tarefas_db');
    if (!raw) return;
    const tasks: TaskItem[] = JSON.parse(raw);
    if (!Array.isArray(tasks) || tasks.length === 0) return;

    const now = new Date();
    const nowTime = now.getTime();
    let tasksModified = false;

    const updatedTasks = tasks.map((task) => {
      // Ignorar tarefas já concluídas: nunca devem virar Atrasadas
      if (task.status === 'Concluída') {
        return task;
      }

      if (!task.dueDate) {
        return task;
      }

      // Extrai data e horário programados
      const cleanDueDate = task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate;
      const cleanDueTime = task.dueTime ? task.dueTime.trim() : '00:00';

      // Parse da data/hora programada
      const scheduledDateTime = new Date(`${cleanDueDate}T${cleanDueTime.length === 5 ? cleanDueTime : `${cleanDueTime}:00`}`);
      if (isNaN(scheduledDateTime.getTime())) {
        return task;
      }

      const scheduledTime = scheduledDateTime.getTime();
      const diffMs = nowTime - scheduledTime;

      let currentTask = { ...task };

      // 1. CHEGOU O HORÁRIO PROGRAMADO (diffMs >= 0):
      // Dispara a notificação pontual no sino e alerta sonoro
      const alertKey = `fenix_task_alarm_notified_${task.id}`;
      const isAlreadyNotified = localStorage.getItem(alertKey) === 'true' || (task as any).notifiedAtScheduledTime === true;

      if (diffMs >= 0 && diffMs <= 48 * 60 * 60 * 1000 && !isAlreadyNotified) {
        localStorage.setItem(alertKey, 'true');
        tasksModified = true;

        const recipientUser = task.responsavel || task.atribuidoA || task.criadoPor || 'Vanessa Gomes';

        // Dispara no sino e toca o som configurado para tarefas
        sendUserNotification({
          category: 'Tarefas',
          title: `Tarefa no Horário: ${task.title}`,
          description: `Horário programado atingido (${cleanDueTime}) para ${task.clientName || 'cliente'}. ${task.description || ''}`.trim(),
          targetTab: 'Tarefas',
          recipientName: recipientUser,
          authorName: task.criadoPor || 'Sistema de Tarefas',
          metadata: {
            taskId: task.id,
            scheduledDueDate: cleanDueDate,
            scheduledDueTime: cleanDueTime,
            type: 'task_scheduled_alarm',
          },
        });

        currentTask = {
          ...currentTask,
          notifiedAtScheduledTime: true,
        };
      }

      // 2. PASSARAM-SE 10 MINUTOS APÓS O HORÁRIO PROGRAMADO (diffMs >= 10 * 60 * 1000 = 600.000 ms):
      // Se a tarefa não foi concluída dentro de 10 minutos após o horário:
      // - Alterar automaticamente o status para "Atrasada"
      // - Contabilizar como atrasada nas métricas
      // - Exibir a informação no sino/notificações
      const TEN_MINUTES_MS = 10 * 60 * 1000;
      if (diffMs >= TEN_MINUTES_MS && currentTask.status !== 'Atrasada' && currentTask.status !== 'Concluída') {
        const delayedAlertKey = `fenix_task_delayed_alarm_${task.id}`;
        const alreadyDelayedNotified = localStorage.getItem(delayedAlertKey) === 'true';

        currentTask = {
          ...currentTask,
          status: 'Atrasada',
        };
        tasksModified = true;

        if (!alreadyDelayedNotified) {
          localStorage.setItem(delayedAlertKey, 'true');
          const recipientUser = task.responsavel || task.atribuidoA || task.criadoPor || 'Vanessa Gomes';

          sendUserNotification({
            category: 'Tarefas',
            title: `Tarefa Atrasada: ${task.title}`,
            description: `A tarefa não foi concluída dentro de 10 minutos após o horário programado (${cleanDueTime}). Status alterado para Atrasada.`,
            targetTab: 'Tarefas',
            recipientName: recipientUser,
            authorName: 'Sistema de Tarefas',
            metadata: {
              taskId: task.id,
              scheduledDueDate: cleanDueDate,
              scheduledDueTime: cleanDueTime,
              type: 'task_delayed_alarm',
            },
          });
        }
      }

      return currentTask;
    });

    if (tasksModified) {
      localStorage.setItem('fenix_tarefas_db', JSON.stringify(updatedTasks));
      updatedTasks.forEach((t) => {
        if ((t as any).alarmTriggered) {
          saveItemToSupabase('fenix_tarefas_db', t, 'id', 'Sistema Fênix').catch(() => {});
        }
      });
      window.dispatchEvent(new Event('fenix_tarefas_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.warn('Erro na verificação de alarmes de tarefas programadas:', err);
  }
}

/**
 * Inicia o verificador global periódico que roda em background em todo o sistema.
 */
export function startGlobalNotificationScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Execução imediata
  checkFollowUpTwoDayAlerts();
  checkScheduledTaskAlerts();

  // Execução a cada 15 segundos para pegar o horário exato da tarefa e follow-ups
  const intervalId = window.setInterval(() => {
    checkFollowUpTwoDayAlerts();
    checkScheduledTaskAlerts();
  }, 15000);

  // Execução quando a aba do navegador volta ao foco
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkFollowUpTwoDayAlerts();
      checkScheduledTaskAlerts();
    }
  };

  const handleFollowUpUpdated = () => {
    checkFollowUpTwoDayAlerts();
  };

  const handleTasksUpdated = () => {
    checkScheduledTaskAlerts();
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);
  window.addEventListener('fenix_followup_updated', handleFollowUpUpdated);
  window.addEventListener('fenix_tarefas_updated', handleTasksUpdated);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
    window.removeEventListener('fenix_followup_updated', handleFollowUpUpdated);
    window.removeEventListener('fenix_tarefas_updated', handleTasksUpdated);
  };
}
