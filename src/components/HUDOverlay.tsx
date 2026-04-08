// ===================================================
// DeepSync Widget — HUD Overlay Component
// 上部: 時計 + 設定ボタン, 下部: フィルタ情報 + タイマー
// ===================================================

import { useState, useEffect } from 'react';
import { Timer } from './Timer';
import type { AppSettings, PomodoroMode } from '../types';
import '../styles/hud.css';

interface HUDOverlayProps {
  settings: AppSettings;
  pomodoroMode: PomodoroMode;
  timeDisplay: string;
  progress: number;
  isRunning: boolean;
  completedSessions: number;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  onTimerSkip: () => void;
  onSettingsToggle: () => void;
  isSettingsOpen: boolean;
  activeFilterCount: number;
  isPaused: boolean;
  onSlidePauseToggle: () => void;
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

export function HUDOverlay({
  settings,
  pomodoroMode,
  timeDisplay,
  progress,
  isRunning,
  completedSessions,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onTimerSkip,
  onSettingsToggle,
  isSettingsOpen,
  activeFilterCount,
  isPaused,
  onSlidePauseToggle,
}: HUDOverlayProps) {
  const currentTime = useCurrentTime();

  return (
    <div className={`hud ${isSettingsOpen ? 'hud--settings-open' : ''}`}>
      {/* Drag Region (Tauri) */}
      <div className="hud__drag-region" data-tauri-drag-region />

      {/* ── Top Bar ── */}
      <div className="hud__top">
        <span className="hud__clock">{currentTime}</span>

        <div className="hud__top-actions">
          {/* Slideshow pause/play */}
          <button
            className={`hud__icon-btn ${isPaused ? 'hud__icon-btn--active' : ''}`}
            onClick={onSlidePauseToggle}
            title={isPaused ? 'スライドショー再開' : 'スライドショー一時停止'}
          >
            {isPaused ? '▶' : '⏸'}
          </button>

          {/* Settings */}
          <button
            className={`hud__icon-btn ${isSettingsOpen ? 'hud__icon-btn--active' : ''}`}
            onClick={onSettingsToggle}
            title="設定"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="hud__bottom">
        {/* Filter Info */}
        <div className="hud__filter-info">
          {activeFilterCount > 0 && (
            <span className="hud__filter-tag">
              <span className="hud__filter-tag-dot" />
              フィルタ: {activeFilterCount}件
            </span>
          )}
        </div>

        {/* Timer */}
        <Timer
          mode={pomodoroMode}
          timeDisplay={timeDisplay}
          progress={progress}
          isRunning={isRunning}
          completedSessions={completedSessions}
          sessionsBeforeLongBreak={settings.sessionsBeforeLongBreak}
          onStart={onTimerStart}
          onPause={onTimerPause}
          onReset={onTimerReset}
          onSkip={onTimerSkip}
        />
      </div>
    </div>
  );
}
