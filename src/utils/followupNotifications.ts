import { FollowUpItem } from '../types';
import { sendUserNotification } from './notifications';
import { playNotificationSound } from './soundAlerts';
import {
  getUserNotificationPreferences,
  playUserCustomSoundForCategory,
} from './userNotificationPreferences';
import { getCurrentAuthUser } from './auth';

/**
 * Synthesizes a soft, pleasant dual-tone chime using Web Audio API (E5 -> A5).
 * Safe, zero-asset dependency, executes client-side seamlessly.
 */
export function playGentleAlertSound(): void {
  try {
    const currentUserName = getCurrentAuthUser();
    const prefs = getUserNotificationPreferences(currentUserName);
    if (prefs && typeof prefs.volumePercent === 'number') {
      if (prefs.volumePercent === 0) return;
      playUserCustomSoundForCategory(currentUserName, 'followup');
      return;
    }
  } catch {}

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.09, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: A5 (880.00 Hz) - delayed slightly for an elegant chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain2.gain.setValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);
  } catch {
    // Gracefully handle browser policy or audio restrictions
  }
}

export interface SystemNotificationItem {
  id: string;
  type: 'followup_2dias' | 'boleto' | 'meta' | 'tarefa' | 'sistema';
  title: string;
  badge: string;
  badgeColor: string;
  message: string;
  timeDisplay: string;
  targetTab: string;
  timestamp: number;
  read?: boolean;
}

/**
 * Triggers a real notification alert in the header bell and plays the notification sound respecting volume.
 */
export function triggerTwoDayAlert(itemOrCount: FollowUpItem | number): void {
  const isNumber = typeof itemOrCount === 'number';
  const item: FollowUpItem | null = isNumber ? null : itemOrCount;
  const count: number = isNumber ? itemOrCount : 1;

  const notifId = item?.id
    ? `notif_fup_${item.id}_${new Date().toISOString().split('T')[0]}`
    : `notif_fup_count_${new Date().toISOString().split('T')[0]}`;
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const valorStr = ((item?.valor !== undefined && item?.valor !== null && !isNaN(item.valor))
    ? item.valor
    : 0
  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const title = item?.cliente
    ? `Follow-up Retorno em 2 Dias Úteis: ${item.cliente}`
    : `Follow-up: ${count} ${count === 1 ? 'contato sem retorno há 2 dias úteis' : 'contatos sem retorno há 2 dias úteis'}`;

  const message = item?.cliente
    ? `O contato de ${item.cliente} (${item.produto || 'Orçamento'} - R$ ${valorStr}) atingiu o ciclo de 2 dias úteis para retorno.`
    : `${count} contatos atingiram o ciclo de 2 dias úteis para retorno no Follow-up.`;

  // Dispara no novo sistema global de notificações do CRM (sino + som respeitando volume)
  try {
    sendUserNotification({
      category: 'Follow-up',
      title,
      description: message,
      targetTab: 'Follow-up',
      recipientName: item?.vendedor || item?.responsavel || 'Vanessa Gomes',
      authorName: 'Sistema Follow-up',
      metadata: {
        followUpId: item?.id,
        clientName: item?.cliente,
        cliente: item?.cliente,
      },
    });
  } catch (e) {
    console.warn('Erro ao disparar sendUserNotification no followup:', e);
  }

  const notif: SystemNotificationItem = {
    id: notifId,
    type: 'followup_2dias',
    title,
    badge: 'Comercial',
    badgeColor: 'sky',
    message,
    timeDisplay: `Hoje às ${timeFormatted} • Módulo Follow-up`,
    targetTab: 'Follow-up',
    timestamp: Date.now(),
    read: false,
  };

  try {
    const raw = localStorage.getItem('fenix_system_notifications');
    let list: SystemNotificationItem[] = raw ? JSON.parse(raw) : [];
    list = list.filter((n) => n.id !== notifId);
    list.unshift(notif);
    localStorage.setItem('fenix_system_notifications', JSON.stringify(list.slice(0, 30)));
    window.dispatchEvent(new CustomEvent('fenix_notification_alert', { detail: notif }));
  } catch {
    // ignore
  }
}
