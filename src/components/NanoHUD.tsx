// ===================================================
// DeepSync HUD — Nano HUD Component
// 超コンパクトな極小サイバーパンクHUDバー
// ===================================================

import React from 'react';
import type { SlideData } from '../types';
import { useClock } from '../hooks/useClock';
import './NanoHUD.css';

interface NanoHUDProps {
  currentSlide: SlideData | null;
  pomodoroMode: string;
  timeDisplay: string;
  progress: number;
  isRunning: boolean;
  onTimerToggle: () => void;
  onExpandDashboard: () => void;
  onNextSlide: () => void;
}

export const NanoHUD: React.FC<NanoHUDProps> = ({
  currentSlide,
  pomodoroMode,
  timeDisplay,
  progress,
  isRunning,
  onTimerToggle,
  onExpandDashboard,
  onNextSlide,
}) => {
  const clock = useClock();

  return (
    <div className="nano-hud-bar" data-tauri-drag-region>
      {/* サムネイル */}
      <div className="nano-thumb" onClick={onNextSlide} title="クリックで次の画像へ">
        {currentSlide ? (
          <img src={currentSlide.imageUrl} alt="" className="thumb-img" />
        ) : (
          <div className="thumb-placeholder">🌌</div>
        )}
      </div>

      {/* リアルタイム時計 */}
      <div className="nano-clock" title="システム現在時刻">
        {clock.timeStr}
      </div>

      {/* タイマー表示 */}
      <div className="nano-timer" onClick={onTimerToggle} title={isRunning ? '一時停止' : '開始'}>
        <span className={`nano-mode-tag mode-${pomodoroMode}`}>
          {pomodoroMode[0].toUpperCase()}
        </span>
        <span className="nano-time-num">{timeDisplay}</span>
        <div className="nano-progress-bg">
          <div className="nano-progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* メディア情報 / ティッカー */}
      <div className="nano-info" data-tauri-drag-region>
        <span className="nano-author">{currentSlide?.character || 'DEEPSYNC'}</span>
        <span className="nano-caption">{currentSlide?.displayName || 'Online'}</span>
      </div>

      {/* 展開ボタン */}
      <button
        className="nano-expand-btn"
        onClick={onExpandDashboard}
        title="ダッシュボードを展開"
      >
        ⤢
      </button>
    </div>
  );
};
