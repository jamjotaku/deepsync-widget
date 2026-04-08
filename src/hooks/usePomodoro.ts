// ===================================================
// DeepSync Widget — Pomodoro Timer Hook
// Focus / Break サイクル管理
// ===================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PomodoroMode, PomodoroState, AppSettings } from '../types';

interface UsePomodoroReturn extends PomodoroState {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  /** 進捗率 0〜1 */
  progress: number;
  /** 表示用タイムstringf "MM:SS" */
  timeDisplay: string;
}

export function usePomodoro(settings: AppSettings): UsePomodoroReturn {
  const [mode, setMode] = useState<PomodoroMode>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(settings.focusDuration * 60);
  const [totalSeconds, setTotalSeconds] = useState(settings.focusDuration * 60);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // モードに応じた秒数を計算
  const getModeDuration = useCallback(
    (targetMode: PomodoroMode): number => {
      switch (targetMode) {
        case 'focus':
          return settings.focusDuration * 60;
        case 'break': {
          // 長休憩判定
          const isLongBreak =
            (completedSessions + 1) % settings.sessionsBeforeLongBreak === 0 &&
            completedSessions > 0;
          return (isLongBreak ? settings.longBreakDuration : settings.breakDuration) * 60;
        }
        case 'idle':
        default:
          return settings.focusDuration * 60;
      }
    },
    [settings, completedSessions]
  );

  // タイマー開始
  const start = useCallback(() => {
    if (mode === 'idle') {
      const duration = settings.focusDuration * 60;
      setMode('focus');
      setTotalSeconds(duration);
      setRemainingSeconds(duration);
    }
    setIsRunning(true);
  }, [mode, settings.focusDuration]);

  // タイマー一時停止
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  // タイマーリセット
  const reset = useCallback(() => {
    setIsRunning(false);
    setMode('idle');
    setRemainingSeconds(settings.focusDuration * 60);
    setTotalSeconds(settings.focusDuration * 60);
    setCompletedSessions(0);
  }, [settings.focusDuration]);

  // モード遷移
  const transitionToNextMode = useCallback(() => {
    if (mode === 'focus') {
      setCompletedSessions((prev) => prev + 1);
      const breakDuration = getModeDuration('break');
      setMode('break');
      setTotalSeconds(breakDuration);
      setRemainingSeconds(breakDuration);
    } else if (mode === 'break') {
      const focusDuration = settings.focusDuration * 60;
      setMode('focus');
      setTotalSeconds(focusDuration);
      setRemainingSeconds(focusDuration);
    }
  }, [mode, getModeDuration, settings.focusDuration]);

  // スキップ（現在のモードを飛ばす）
  const skip = useCallback(() => {
    transitionToNextMode();
  }, [transitionToNextMode]);

  // タイマー tick
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (isRunning && mode !== 'idle') {
      tickRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // モード完了
            transitionToNextMode();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    };
  }, [isRunning, mode, transitionToNextMode]);

  // 設定変更時の対応（idle時のみ反映）
  useEffect(() => {
    if (mode === 'idle') {
      const duration = settings.focusDuration * 60;
      setRemainingSeconds(duration);
      setTotalSeconds(duration);
    }
  }, [settings.focusDuration, mode]);

  // 進捗率
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  // 表示用時間
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    mode,
    remainingSeconds,
    totalSeconds,
    completedSessions,
    isRunning,
    start,
    pause,
    reset,
    skip,
    progress,
    timeDisplay,
  };
}
