// ===================================================
// DeepSync Widget — Main App Component
// スライドショー + HUD + 設定ドロワー + ポモドーロ統合
// ===================================================

import { useState, useCallback, useMemo } from 'react';
import { Slideshow } from './components/Slideshow';
import { HUDOverlay } from './components/HUDOverlay';
import { SettingsDrawer } from './components/SettingsDrawer';
import { useCsvData } from './hooks/useCsvData';
import { useSlideshow } from './hooks/useSlideshow';
import { usePomodoro } from './hooks/usePomodoro';
import { DEFAULT_SETTINGS } from './types';
import type { AppSettings } from './types';
import './App.css';

export default function App() {
  // ── 設定 ──
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── CSV データ ──
  const { slides, uniqueMembers, uniqueLayers, isLoading, error, refetch } =
    useCsvData();

  // ── ポモドーロ ──
  const pomodoro = usePomodoro(settings);

  // ── スライド間隔（ポモドーロ連動） ──
  const effectiveInterval = useMemo(() => {
    if (pomodoro.mode === 'break') {
      return settings.breakSlideInterval;
    }
    return settings.slideInterval;
  }, [pomodoro.mode, settings.slideInterval, settings.breakSlideInterval]);

  // ── スライドショー ──
  const slideshow = useSlideshow({
    slides,
    settings,
    effectiveInterval,
  });

  // ── アクティブフィルタ数 ──
  const activeFilterCount =
    settings.selectedMembers.length + settings.selectedLayers.length;

  // ── ポモドーロモードに応じた data-mode 属性 ──
  const dataMode = pomodoro.mode === 'break' ? 'break' : 'focus';

  return (
    <div className="app" data-mode={dataMode}>
      {/* Background Slideshow */}
      <Slideshow
        currentSlide={slideshow.currentSlide}
        currentIndex={slideshow.currentIndex}
        totalSlides={slideshow.totalSlides}
        isTransitioning={slideshow.isTransitioning}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onNext={slideshow.next}
        onPrev={slideshow.prev}
      />

      {/* HUD Overlay */}
      <HUDOverlay
        settings={settings}
        pomodoroMode={pomodoro.mode}
        timeDisplay={pomodoro.timeDisplay}
        progress={pomodoro.progress}
        isRunning={pomodoro.isRunning}
        completedSessions={pomodoro.completedSessions}
        onTimerStart={pomodoro.start}
        onTimerPause={pomodoro.pause}
        onTimerReset={pomodoro.reset}
        onTimerSkip={pomodoro.skip}
        onSettingsToggle={() => setIsSettingsOpen((prev) => !prev)}
        isSettingsOpen={isSettingsOpen}
        activeFilterCount={activeFilterCount}
        isPaused={slideshow.isPaused}
        onSlidePauseToggle={slideshow.togglePause}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        settings={settings}
        onSettingsChange={updateSettings}
        availableMembers={uniqueMembers}
        availableLayers={uniqueLayers}
      />
    </div>
  );
}
