import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Check,
  X,
  Clock,
  Music,
  Sliders,
  Sparkles,
  Volume2
} from 'lucide-react';
import {
  NotificationCategoryType,
  formatAudioTime,
  getAudioDuration,
  playAudioSnippet,
  stopAudioPreview
} from '../utils/userNotificationPreferences';

export interface AudioSnippetEditorProps {
  categoryKey: NotificationCategoryType | 'general' | string;
  categoryLabel: string;
  userName: string;
  fileName: string;
  dataUrl: string;
  fileSize?: number;
  initialStartTime?: number;
  initialDuration?: number;
  initialDurationTotal?: number;
  volumePercent?: number;
  onSave: (snippet: { startTime: number; duration: number; durationTotal: number }) => void;
  onCancel: () => void;
}

export const AudioSnippetEditor: React.FC<AudioSnippetEditorProps> = ({
  categoryLabel,
  userName,
  fileName,
  dataUrl,
  fileSize,
  initialStartTime = 0,
  initialDuration = 5,
  initialDurationTotal = 30,
  volumePercent = 85,
  onSave,
  onCancel,
}) => {
  const [durationTotal, setDurationTotal] = useState<number>(() =>
    initialDurationTotal > 0 ? initialDurationTotal : 30
  );
  const [startTime, setStartTime] = useState<number>(() => Math.max(0, initialStartTime));
  const [duration, setDuration] = useState<number>(() => Math.max(1, initialDuration));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(initialStartTime);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Carrega a duração exata do arquivo
  useEffect(() => {
    let active = true;
    getAudioDuration(dataUrl).then((dur) => {
      if (!active) return;
      if (dur > 0) {
        setDurationTotal(dur);
        // Ajusta startTime se ultrapassar a duração total
        setStartTime((prev) => Math.max(0, Math.min(prev, Math.max(0, dur - duration))));
      }
    });
    return () => {
      active = false;
      stopAudioPreview();
    };
  }, [dataUrl]);

  // Interrompe reprodução ao desmontar
  useEffect(() => {
    return () => {
      stopAudioPreview();
    };
  }, []);

  // Controlar reprodução de prévia
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudioPreview();
      setIsPlaying(false);
      setPlaybackTime(startTime);
      setPlaybackProgress(0);
      return;
    }

    setIsPlaying(true);
    setPlaybackTime(startTime);
    setPlaybackProgress(0);

    playAudioSnippet(
      dataUrl,
      startTime,
      duration,
      volumePercent,
      () => {
        // onEnd
        setIsPlaying(false);
        setPlaybackTime(startTime);
        setPlaybackProgress(0);
      },
      (curr, progress) => {
        // onTimeUpdate
        setPlaybackTime(curr);
        setPlaybackProgress(progress);
      }
    );
  };

  // Ajuste do ponto de início na linha do tempo por clique
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || durationTotal <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = clickX / rect.width;
    const targetSec = pct * durationTotal;
    const maxStart = Math.max(0, durationTotal - duration);
    const newStart = Math.max(0, Math.min(maxStart, Math.round(targetSec * 2) / 2));
    setStartTime(newStart);

    if (isPlaying) {
      stopAudioPreview();
      setIsPlaying(false);
    }
  };

  const maxStartTime = Math.max(0, Math.floor(durationTotal - duration));
  const endTime = Math.min(durationTotal, startTime + duration);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const presetDurations = [2, 3, 5, 8, 10, 15];

  return (
    <div
      id="audio-snippet-editor"
      className="p-4 sm:p-5 rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-indigo-50/40 text-slate-800 shadow-sm transition-all"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-200/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">{categoryLabel}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                {userName}
              </span>
            </div>
            <div className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md" title={fileName}>
              {fileName} {fileSize ? `(${formatFileSize(fileSize)})` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white/80 px-2.5 py-1 rounded-md border border-blue-200/60 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Total: {formatAudioTime(durationTotal)}</span>
        </div>
      </div>

      {/* Linha do Tempo Visual Interativa */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>00:00</span>
          <span className="text-blue-700 font-medium font-sans flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Clique na barra para posicionar o trecho
          </span>
          <span>{formatAudioTime(durationTotal)}</span>
        </div>

        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative h-12 w-full bg-slate-900 rounded-xl overflow-hidden cursor-pointer select-none border border-slate-700 shadow-inner group"
          title="Clique para definir o início do trecho"
        >
          {/* Fundo com visual de ondas sonoras */}
          <div className="absolute inset-0 flex items-center justify-around opacity-30 px-2 pointer-events-none">
            {Array.from({ length: 36 }).map((_, i) => {
              const h = 20 + Math.sin(i * 0.7) * 45 + (i % 3) * 15;
              return (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full transition-all"
                  style={{ height: `${Math.max(15, Math.min(85, h))}%` }}
                />
              );
            })}
          </div>

          {/* Trecho selecionado destacado */}
          {durationTotal > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-blue-500/40 border-x-2 border-blue-400 rounded transition-all pointer-events-none flex items-center justify-center"
              style={{
                left: `${(startTime / durationTotal) * 100}%`,
                width: `${(Math.min(duration, durationTotal - startTime) / durationTotal) * 100}%`,
              }}
            >
              <div className="text-[10px] font-bold text-white bg-blue-600/90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                {duration}s
              </div>
            </div>
          )}

          {/* Agulha / cursor de reprodução em tempo real */}
          {isPlaying && durationTotal > 0 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.8)]"
              style={{
                left: `${((startTime + playbackProgress * duration) / durationTotal) * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Controles de Ponto de Início e Duração */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/70 p-3.5 rounded-lg border border-blue-200/60">
        {/* Controle: Início do Trecho */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Início do Trecho:
            </span>
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {formatAudioTime(startTime)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStartTime((prev) => Math.max(0, prev - 1));
                if (isPlaying) stopAudioPreview();
              }}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95"
              title="Voltar 1 segundo"
            >
              -1s
            </button>

            <input
              type="range"
              min={0}
              max={Math.max(0, durationTotal - duration)}
              step={0.5}
              value={startTime}
              onChange={(e) => {
                setStartTime(parseFloat(e.target.value) || 0);
                if (isPlaying) stopAudioPreview();
              }}
              className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            <button
              type="button"
              onClick={() => {
                setStartTime((prev) => Math.min(maxStartTime, prev + 1));
                if (isPlaying) stopAudioPreview();
              }}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95"
              title="Avançar 1 segundo"
            >
              +1s
            </button>
          </div>
        </div>

        {/* Controle: Duração do Trecho */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" /> Duração do Trecho:
            </span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {duration} segundos
            </span>
          </div>

          {/* Presets rápidos e input livre */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {presetDurations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDuration(d);
                  if (startTime + d > durationTotal) {
                    setStartTime(Math.max(0, durationTotal - d));
                  }
                  if (isPlaying) stopAudioPreview();
                }}
                className={`px-2 py-1 text-xs font-semibold rounded transition-all ${
                  duration === d
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white hover:bg-blue-50 text-slate-700 border border-slate-200'
                }`}
              >
                {d}s
              </button>
            ))}

            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                min={1}
                max={Math.floor(durationTotal) || 60}
                value={duration}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) {
                    const safeDur = Math.min(Math.floor(durationTotal) || 60, val);
                    setDuration(safeDur);
                    if (startTime + safeDur > durationTotal) {
                      setStartTime(Math.max(0, durationTotal - safeDur));
                    }
                    if (isPlaying) stopAudioPreview();
                  }
                }}
                className="w-12 text-center text-xs py-1 px-1 font-mono rounded border border-slate-300 bg-white"
                title="Digitar segundos"
              />
              <span className="text-[11px] text-slate-500">seg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo do trecho */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            Trecho: <strong>{formatAudioTime(startTime)}</strong> até{' '}
            <strong>{formatAudioTime(endTime)}</strong> ({duration}s) •{' '}
            <span className="text-emerald-700 font-medium">Toca 1 única vez sem loop</span>
          </span>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-blue-200/70">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Parar Prévia</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ouvir Prévia ({duration}s)</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              stopAudioPreview();
              onCancel();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopAudioPreview();
              onSave({
                startTime,
                duration,
                durationTotal,
              });
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Salvar Som do Usuário</span>
          </button>
        </div>
      </div>
    </div>
  );
};
