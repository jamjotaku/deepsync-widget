// ===================================================
// DeepSync Widget — Timer Component
// 円形プログレスリング + デジタルタイマー
// ===================================================

import type { PomodoroMode } from '../types';
import '../styles/timer.css';

interface TimerProps {
  mode: PomodoroMode;
  timeDisplay: string;
  progress: number;
  isRunning: boolean;
  completedSessions: number;
  sessionsBeforeLongBreak: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

const RING_RADIUS = 27;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MODE_LABELS: Record<PomodoroMode, string> = {
  idle: 'READY',
  focus: 'FOCUS',
  break: 'BREAK',
};

export function Timer({
  mode,
  timeDisplay,
  progress,
  isRunning,
  completedSessions,
  sessionsBeforeLongBreak,
  onStart,
  onPause,
  onReset,
  onSkip,
}: TimerProps) {
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="timer">
      {/* Ring */}
      <div className="timer__ring-container">
        <svg className="timer__ring-svg" viewBox="0 0 64 64">
          <circle
            className="timer__ring-bg"
            cx="32"
            cy="32"
            r={RING_RADIUS}
          />
          <circle
            className="timer__ring-progress"
            cx="32"
            cy="32"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className={`timer__time ${isRunning ? 'timer__time--running' : ''}`}>
          {timeDisplay}
        </span>
      </div>

      {/* Mode Label */}
      <span className="timer__mode">{MODE_LABELS[mode]}</span>

      {/* Session Dots */}
      <div className="timer__sessions">
        {Array.from({ length: sessionsBeforeLongBreak }, (_, i) => (
          <span
            key={i}
            className={`timer__session-dot ${
              i < completedSessions ? 'timer__session-dot--completed' : ''
            }`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="timer__controls">
        <button className="timer__btn" onClick={onReset} title="リセット">
          ↺
        </button>
        <button
          className="timer__btn timer__btn--primary"
          onClick={isRunning ? onPause : onStart}
          title={isRunning ? '一時停止' : '開始'}
        >
          {isRunning ? '⏸' : '▶'}
        </button>
        {mode !== 'idle' && (
          <button className="timer__btn" onClick={onSkip} title="スキップ">
            ⏭
          </button>
        )}
      </div>
    </div>
  );
}
