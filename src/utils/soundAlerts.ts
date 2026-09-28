/**
 * Motor de Síntese Sonora para Notificações Fênix World
 * Utiliza a Web Audio API nativa com alta fidelidade e zero dependências externas.
 */

export type NotificationSoundType =
  | 'Sino Suave (Padrão)'
  | 'Pop Discreto'
  | 'Ding Comercial'
  | 'Campainha Corporativa (Longa)'
  | 'Harpa Melódica (Rica)'
  | 'Chime Cristalino com Ressonância'
  | 'Fanfarra de Conquista (Meta)'
  | 'Alerta Duplo Atenção'
  | 'Marimba Moderna'
  | 'Vibrafone Elegante'
  | 'Pulso Tecnológico'
  | 'Carrilhão Sereno'
  | 'Acorde Harmônico Triunfal'
  | 'Gongo Zen Discreto';

export interface SoundOptionMeta {
  id: NotificationSoundType;
  label: string;
  durationLabel: string;
  description: string;
}

export const SOUND_OPTIONS: SoundOptionMeta[] = [
  {
    id: 'Sino Suave (Padrão)',
    label: 'Sino Suave (Padrão)',
    durationLabel: '0.6s',
    description: 'Dois tons harmônicos suaves e discretos.',
  },
  {
    id: 'Pop Discreto',
    label: 'Pop Discreto',
    durationLabel: '0.15s',
    description: 'Toque ultracurto e nítido para quem prefere sutileza.',
  },
  {
    id: 'Ding Comercial',
    label: 'Ding Comercial',
    durationLabel: '0.8s',
    description: 'Toque comercial cristalino em duas notas alegres.',
  },
  {
    id: 'Campainha Corporativa (Longa)',
    label: 'Campainha Corporativa (Longa)',
    durationLabel: '1.5s',
    description: 'Tríade ascendente elegante, perceptível e bem audível.',
  },
  {
    id: 'Harpa Melódica (Rica)',
    label: 'Harpa Melódica (Rica)',
    durationLabel: '1.7s',
    description: 'Arpejo suave de 4 notas de carrilhão harmônico com presença.',
  },
  {
    id: 'Chime Cristalino com Ressonância',
    label: 'Chime Cristalino com Ressonância',
    durationLabel: '1.8s',
    description: 'Sino duplo de ressonância prolongada com eco sutil.',
  },
  {
    id: 'Fanfarra de Conquista (Meta)',
    label: 'Fanfarra de Conquista (Meta)',
    durationLabel: '1.9s',
    description: 'Acorde maior triunfante, ideal para comemoração e metas.',
  },
  {
    id: 'Alerta Duplo Atenção',
    label: 'Alerta Duplo Atenção',
    durationLabel: '1.3s',
    description: 'Dois toques harmônicos sequenciais para avisos prioritários.',
  },
  {
    id: 'Marimba Moderna',
    label: 'Marimba Moderna',
    durationLabel: '0.9s',
    description: 'Arpejo rítmico orgânico de madeira, suave e acolhedor.',
  },
  {
    id: 'Vibrafone Elegante',
    label: 'Vibrafone Elegante',
    durationLabel: '1.4s',
    description: 'Notas aveludadas de vibrafone com sutil modulação.',
  },
  {
    id: 'Pulso Tecnológico',
    label: 'Pulso Tecnológico',
    durationLabel: '0.5s',
    description: 'Pulso digital moderno, limpo e direto para ações operacionais.',
  },
  {
    id: 'Carrilhão Sereno',
    label: 'Carrilhão Sereno',
    durationLabel: '1.6s',
    description: 'Cascata de notas calmas e harmônicas como brisa de sino de vento.',
  },
  {
    id: 'Acorde Harmônico Triunfal',
    label: 'Acorde Harmônico Triunfal',
    durationLabel: '1.5s',
    description: 'Rico acorde solene e caloroso para grandes conquistas e marcos.',
  },
  {
    id: 'Gongo Zen Discreto',
    label: 'Gongo Zen Discreto',
    durationLabel: '1.8s',
    description: 'Ressonância profunda e serena em baixa frequência.',
  },
];

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Auto-desbloqueio do AudioContext na primeira interação do usuário (clique, toque ou tecla)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export function playNotificationSound(
  soundType: NotificationSoundType = 'Sino Suave (Padrão)',
  volumePercent: number = 80
) {
  if (typeof window === 'undefined') return;
  if (volumePercent <= 0) return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const renderSound = () => {
      try {
        const masterGain = ctx.createGain();
        // Normalizar volume de 0 a 100 com fator de ganho confortável e bem audível
        const volumeFactor = (Math.max(0, Math.min(100, volumePercent)) / 100) * 0.48;
        masterGain.gain.setValueAtTime(volumeFactor, ctx.currentTime);
        masterGain.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (soundType) {
          case 'Pop Discreto': {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(750, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.09);
            gain.gain.setValueAtTime(0.9, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.12);
            break;
          }

          case 'Ding Comercial': {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(1046.5, now); // C6
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1318.51, now + 0.06); // E6
            gain.gain.setValueAtTime(0.85, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(masterGain);
            osc1.start(now);
            osc1.stop(now + 0.75);
            osc2.start(now + 0.06);
            osc2.stop(now + 0.75);
            break;
          }

          case 'Campainha Corporativa (Longa)': {
            // Sequência harmônica ascendente de 4 notas: F5 (698Hz), A5 (880Hz), C6 (1046Hz), F6 (1396Hz)
            const notes = [698.46, 880.0, 1046.5, 1396.91];
            notes.forEach((freq, idx) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              const startTime = now + idx * 0.14;
              const duration = 0.95;

              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, startTime);

              gain.gain.setValueAtTime(0.001, now);
              gain.gain.setValueAtTime(0.75 - idx * 0.1, startTime);
              gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

              osc.connect(gain);
              gain.connect(masterGain);

              osc.start(startTime);
              osc.stop(startTime + duration);
            });
            break;
          }

      case 'Harpa Melódica (Rica)': {
        // Arpejo de harpa suave e cristalino: D5 (587Hz), F#5 (739Hz), A5 (880Hz), D6 (1174Hz)
        const notes = [587.33, 739.99, 880.0, 1174.66];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.16;
          const duration = 1.1;

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.8, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        break;
      }

      case 'Chime Cristalino com Ressonância': {
        // Sino duplo com cauda harmônica de ressonância
        const freqPairs = [
          { f1: 880, f2: 1760, start: 0, dur: 1.4 },
          { f1: 1046.5, f2: 2093, start: 0.22, dur: 1.5 },
        ];
        freqPairs.forEach((pair) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + pair.start;

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(pair.f1, st);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(pair.f2, st);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.7, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + pair.dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);

          osc1.start(st);
          osc1.stop(st + pair.dur);
          osc2.start(st);
          osc2.stop(st + pair.dur);
        });
        break;
      }

      case 'Fanfarra de Conquista (Meta)': {
        // Acorde triunfante em dó maior (C5 -> E5 -> G5 -> C6) com toque festivo
        const fanfare = [
          { f: 523.25, time: 0, dur: 0.4 },
          { f: 659.25, time: 0.14, dur: 0.4 },
          { f: 783.99, time: 0.28, dur: 0.5 },
          { f: 1046.5, time: 0.45, dur: 1.3 },
          { f: 1318.51, time: 0.48, dur: 1.25 }, // Terça maior na nota final
        ];
        fanfare.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + n.time;

          osc.type = n.time > 0.4 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(n.f, st);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.85, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + n.dur);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(st);
          osc.stop(st + n.dur);
        });
        break;
      }

      case 'Alerta Duplo Atenção': {
        // Dois toques firmes e audíveis: tom 1 (740Hz), tom 2 (880Hz)
        [0, 0.26].forEach((stOffset, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = Math.max(ctx.currentTime, now + stOffset);
          const freq = idx === 0 ? 740 : 880;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, st);

          gain.gain.setValueAtTime(0.0001, st);
          gain.gain.linearRampToValueAtTime(0.95, st + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.42);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(st);
          osc.stop(st + 0.45);
        });
        break;
      }

      case 'Marimba Moderna': {
        // Arpejo de madeira quente e percussivo: G4, B4, D5, G5
        const marimbaNotes = [392.0, 493.88, 587.33, 783.99];
        marimbaNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + idx * 0.11;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, st);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.85, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.4);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(st);
          osc.stop(st + 0.4);
        });
        break;
      }

      case 'Vibrafone Elegante': {
        // Notas suaves de vibrafone com modulação sutil
        const vibraNotes = [523.25, 659.25, 783.99, 1046.5];
        vibraNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + idx * 0.18;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, st);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.75, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.9);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(st);
          osc.stop(st + 0.9);
        });
        break;
      }

      case 'Pulso Tecnológico': {
        // Pulso digital moderno e limpo
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'Carrilhão Sereno': {
        // Cascata suave de notas harmônicas pentatônicas
        const chimeNotes = [659.25, 783.99, 987.77, 1174.66, 1318.51];
        chimeNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + idx * 0.13;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, st);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.65, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.9);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(st);
          osc.stop(st + 0.9);
        });
        break;
      }

      case 'Acorde Harmônico Triunfal': {
        // Acorde rico e nobre (Fá Maior 7M: F4, A4, C5, E5)
        const triadNotes = [349.23, 440.0, 523.25, 659.25];
        triadNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + idx * 0.08;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, st);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.7, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 1.2);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(st);
          osc.stop(st + 1.2);
        });
        break;
      }

      case 'Gongo Zen Discreto': {
        // Ressonância profunda e suave
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, now); // C4
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(130.81, now); // C3

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 1.6);
        subOsc.start(now);
        subOsc.stop(now + 1.6);
        break;
      }

      case 'Sino Suave (Padrão)':
      default: {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.8, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.08);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.65, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc1.start(now);
        osc1.stop(now + 0.55);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.65);
        break;
      }
    }
  } catch (renderErr) {
    console.warn('Erro ao renderizar som de notificação:', renderErr);
  }
};

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => renderSound()).catch(() => renderSound());
    } else {
      renderSound();
    }
  } catch (err) {
    console.warn('Web Audio indisponível ou bloqueado pelo navegador:', err);
  }
}
