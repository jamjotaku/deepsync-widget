// ===================================================
// DeepSync HUD — Main Application Component
// サイバーパンク情報ダッシュボード & スライドショーウィジェット
// ===================================================

import { useState, useCallback, useMemo } from 'react';
import { Slideshow } from './components/Slideshow';
import { HUDOverlay } from './components/HUDOverlay';
import { HeaderHUD } from './components/HeaderHUD';
import { DashboardGrid } from './components/DashboardGrid';
import { NanoHUD } from './components/NanoHUD';
import { MediaAddModal } from './components/MediaAddModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { useCsvData } from './hooks/useCsvData';
import { usePlaylists } from './hooks/usePlaylists';
import { useSlideshow } from './hooks/useSlideshow';
import { usePomodoro } from './hooks/usePomodoro';
import { DEFAULT_SETTINGS, WIDGET_SIZES } from './types';
import type { AppSettings, DisplayMode, SlideData } from './types';
import { setAlwaysOnTop, resizeWindow } from './lib/windowManager';
import './App.css';

export default function App() {
  // ── 設定 ──
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // ── プレイリスト管理 & X抽出 ──
  const {
    playlists,
    slides: playlistSlides,
    activePlaylistId,
    setActivePlaylistId,
    createPlaylist,
    deletePlaylist,
    addTweetUrls,
    deleteItem,
    isProcessing,
    statusMessage,
    downloadBackup,
    restoreBackup,
  } = usePlaylists(settings.activePlaylistId);

  // ── 従来の Google Sheets CSV データ ──
  const {
    slides: csvSlides,
    uniqueMembers,
    uniqueLayers,
    isLoading: isCsvLoading,
    error: csvError,
    refetch: refetchCsv,
  } = useCsvData();

  // ── ポモドーロ ──
  const pomodoro = usePomodoro(settings);

  // ── スライドソースの統合（プレイリスト優先、無ければCSVまたはハイブリッド） ──
  const combinedSlides = useMemo<SlideData[]>(() => {
    if (settings.mediaSourceMode === 'csv') {
      return csvSlides;
    }
    if (settings.mediaSourceMode === 'hybrid') {
      return [...playlistSlides, ...csvSlides];
    }
    // デフォルト: プレイリスト
    return playlistSlides.length > 0 ? playlistSlides : csvSlides;
  }, [settings.mediaSourceMode, playlistSlides, csvSlides]);

  // ── スライド間隔（ポモドーロ連動） ──
  const effectiveInterval = useMemo(() => {
    if (pomodoro.mode === 'break') {
      return settings.breakSlideInterval;
    }
    return settings.slideInterval;
  }, [pomodoro.mode, settings.slideInterval, settings.breakSlideInterval]);

  // ── スライドショー状態管理 ──
  const slideshow = useSlideshow({
    slides: combinedSlides,
    settings,
    effectiveInterval,
  });

  // ── 設定変更ハンドラー ──
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      // ウィンドウサイズ同期
      if (partial.widgetSize && WIDGET_SIZES[partial.widgetSize]) {
        const { width, height } = WIDGET_SIZES[partial.widgetSize];
        resizeWindow(width, height).catch(() => {});
      }
      // 最前面同期
      if (partial.alwaysOnTop !== undefined) {
        setAlwaysOnTop(partial.alwaysOnTop).catch(() => {});
      }
      return next;
    });
  }, []);

  // ── モード切替 ──
  const handleModeChange = useCallback(
    (mode: DisplayMode) => {
      updateSettings({ displayMode: mode });
      // Nanoモード時はウィンドウをスリムにリサイズ
      if (mode === 'nano') {
        resizeWindow(380, 48).catch(() => {});
      } else {
        const size = WIDGET_SIZES[settings.widgetSize] || WIDGET_SIZES.medium;
        resizeWindow(size.width, size.height).catch(() => {});
      }
    },
    [updateSettings, settings.widgetSize]
  );

  // ── 現在の画像削除 ──
  const handleDeleteCurrentSlide = useCallback(() => {
    if (slideshow.currentSlide?.playlistId) {
      // プレイリストアイテムを削除
      const targetItem = playlistSlides.find(
        (s) => s.imageUrl === slideshow.currentSlide?.imageUrl
      );
      if (targetItem) {
        deleteItem(targetItem.imageUrl);
        slideshow.next();
      }
    }
  }, [slideshow, playlistSlides, deleteItem]);

  const activeFilterCount =
    settings.selectedMembers.length + settings.selectedLayers.length;
  const dataMode = pomodoro.mode === 'break' ? 'break' : 'focus';

  return (
    <div className={`app mode-${settings.displayMode}`} data-mode={dataMode}>
      {/* ── 1. NANO モード (極小バー) ── */}
      {settings.displayMode === 'nano' ? (
        <NanoHUD
          currentSlide={slideshow.currentSlide}
          pomodoroMode={pomodoro.mode}
          timeDisplay={pomodoro.timeDisplay}
          progress={pomodoro.progress}
          isRunning={pomodoro.isRunning}
          onTimerToggle={pomodoro.isRunning ? pomodoro.pause : pomodoro.start}
          onExpandDashboard={() => handleModeChange('dashboard')}
          onNextSlide={slideshow.next}
        />
      ) : (
        <>
          {/* ── 常設ヘッダーHUD ── */}
          <HeaderHUD
            displayMode={settings.displayMode}
            onModeChange={handleModeChange}
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            onPlaylistChange={setActivePlaylistId}
            onOpenAddModal={() => setIsMediaModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            widgetSize={settings.widgetSize}
            onSizeChange={(size) => updateSettings({ widgetSize: size })}
            isAlwaysOnTop={settings.alwaysOnTop}
            onToggleAlwaysOnTop={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
            pomodoroMode={pomodoro.mode}
          />

          {/* ── 2. DASHBOARD モード (マルチパネルグリッド) ── */}
          {settings.displayMode === 'dashboard' && (
            <DashboardGrid
              currentSlide={slideshow.currentSlide}
              currentIndex={slideshow.currentIndex}
              totalSlides={slideshow.totalSlides}
              onNextSlide={slideshow.next}
              onPrevSlide={slideshow.prev}
              isSlidePaused={slideshow.isPaused}
              onToggleSlidePause={slideshow.togglePause}
              onDeleteCurrentSlide={handleDeleteCurrentSlide}
              pomodoroMode={pomodoro.mode}
              timeDisplay={pomodoro.timeDisplay}
              progress={pomodoro.progress}
              isRunning={pomodoro.isRunning}
              completedSessions={pomodoro.completedSessions}
              onTimerStart={pomodoro.start}
              onTimerPause={pomodoro.pause}
              onTimerReset={pomodoro.reset}
              onTimerSkip={pomodoro.skip}
            />
          )}

          {/* ── 3. AMBIENT モード (全面スライドショー鑑賞) ── */}
          {settings.displayMode === 'ambient' && (
            <>
              <Slideshow
                currentSlide={slideshow.currentSlide}
                currentIndex={slideshow.currentIndex}
                totalSlides={slideshow.totalSlides}
                isTransitioning={slideshow.isTransitioning}
                isLoading={isCsvLoading && combinedSlides.length === 0}
                error={csvError}
                onRetry={refetchCsv}
                onNext={slideshow.next}
                onPrev={slideshow.prev}
              />
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
            </>
          )}

          {/* ── Xメディア登録 & プレイリスト管理モーダル ── */}
          <MediaAddModal
            isOpen={isMediaModalOpen}
            onClose={() => setIsMediaModalOpen(false)}
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            onAddUrls={addTweetUrls}
            onCreatePlaylist={createPlaylist}
            onDeletePlaylist={deletePlaylist}
            isProcessing={isProcessing}
            statusMessage={statusMessage}
            onDownloadBackup={downloadBackup}
            onRestoreBackup={restoreBackup}
          />

          {/* ── 設定ドロワー ── */}
          <SettingsDrawer
            isOpen={isSettingsOpen}
            settings={settings}
            onSettingsChange={updateSettings}
            availableMembers={uniqueMembers}
            availableLayers={uniqueLayers}
          />
        </>
      )}
    </div>
  );
}
