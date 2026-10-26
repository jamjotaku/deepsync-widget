// ===================================================
// DeepSync HUD — Main Application Component
// サイバーパンク情報ダッシュボード & スライドショーウィジェット
// ===================================================

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Slideshow } from './components/Slideshow';
import { HUDOverlay } from './components/HUDOverlay';
import { HeaderHUD } from './components/HeaderHUD';
import { DashboardGrid } from './components/DashboardGrid';
import { NanoHUD } from './components/NanoHUD';
import { MediaAddModal } from './components/MediaAddModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { HUDToast } from './components/HUDToast';
import { useCsvData } from './hooks/useCsvData';
import { usePlaylists } from './hooks/usePlaylists';
import { useSlideshow } from './hooks/useSlideshow';
import { usePomodoro } from './hooks/usePomodoro';
import { useFeedReader } from './hooks/useFeedReader';
import { useNotifications } from './hooks/useNotifications';
import { DEFAULT_SETTINGS, WIDGET_SIZES } from './types';
import type { AppSettings, DisplayMode, SlideData } from './types';
import { setAlwaysOnTop, resizeWindow, isTauri } from './lib/windowManager';
import './App.css';

export default function App() {
  // ── 設定 ──
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // ── 外部通知 & トースト ──
  const {
    notifications,
    activeToasts,
    closeToast,
    addNotification,
    clearAllNotifications,
  } = useNotifications();

  // ── RSS / SNS シグナルフィード ──
  const {
    feedItems,
    sources: feedSources,
    isLoading: isFeedLoading,
    refreshFeeds,
    toggleSource: toggleFeedSource,
    addSource: addFeedSource,
    removeSource: removeFeedSource,
  } = useFeedReader((newItem) => {
    // 新着フィード受信時のトースト通知
    addNotification(
      `NEW SIGNAL: [${newItem.badge}]`,
      newItem.title,
      'info',
      newItem.source
    );
  });

  // ── プレイリスト管理 & X抽出 ──
  const {
    playlists,
    items: playlistItems,
    slides: playlistSlides,
    activePlaylistId,
    setActivePlaylistId,
    createPlaylist,
    deletePlaylist,
    clearPlaylistItems,
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
  const lastPomodoroModeRef = useRef(pomodoro.mode);

  // ポモドーロモード切替時の自動HUDトースト
  useEffect(() => {
    if (lastPomodoroModeRef.current !== pomodoro.mode) {
      if (pomodoro.mode === 'focus') {
        addNotification(
          'FOCUS PROTOCOL ENGAGED',
          `${settings.focusDuration}分間の集中セッションを開始しました。`,
          'info',
          'CHRONO'
        );
      } else if (pomodoro.mode === 'break') {
        addNotification(
          'RECOVERY MODE ACTIVATED',
          `${settings.breakDuration}分間の休憩時間です。深呼吸しましょう。`,
          'success',
          'CHRONO'
        );
      }
      lastPomodoroModeRef.current = pomodoro.mode;
    }
  }, [pomodoro.mode, settings.focusDuration, settings.breakDuration, addNotification]);

  // ── スライドソースの統合 ──
  const combinedSlides = useMemo<SlideData[]>(() => {
    if (settings.mediaSourceMode === 'csv') {
      return csvSlides;
    }
    if (settings.mediaSourceMode === 'hybrid') {
      return [...playlistSlides, ...csvSlides];
    }
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
      if (partial.widgetSize && WIDGET_SIZES[partial.widgetSize]) {
        const { width, height } = WIDGET_SIZES[partial.widgetSize];
        resizeWindow(width, height).catch(() => {});
      }
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
    if (slideshow.currentSlide) {
      const slideId = slideshow.currentSlide.id;
      if (slideId) {
        deleteItem(slideId);
        slideshow.next();
        addNotification('MEDIA EXPELLED', '画像をプレイリストから削除しました', 'warning', 'STORAGE');
      } else {
        // IDがない場合はimageUrlで検索
        const targetItem = playlistSlides.find(
          (s) => s.imageUrl === slideshow.currentSlide?.imageUrl
        );
        if (targetItem && targetItem.id) {
          deleteItem(targetItem.id);
          slideshow.next();
          addNotification('MEDIA EXPELLED', '画像をプレイリストから削除しました', 'warning', 'STORAGE');
        }
      }
    }
  }, [slideshow, playlistSlides, deleteItem, addNotification]);

  // テスト通知トリガー
  const handleTriggerTestAlert = useCallback(() => {
    const types: Array<'info' | 'success' | 'warning' | 'alert'> = ['info', 'success', 'warning', 'alert'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    addNotification(
      'INCOMING TELEMETRY ALERT',
      '外部システムまたはWebhookからのシグナルを受信しました。',
      randomType,
      'DISCORD/HOOK'
    );
  }, [addNotification]);

  // ESCキーで設定ドロワーやモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMediaModalOpen) setIsMediaModalOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMediaModalOpen, isSettingsOpen]);

  const activeFilterCount =
    settings.selectedMembers.length + settings.selectedLayers.length;
  const dataMode = pomodoro.mode === 'break' ? 'break' : 'focus';

  // ── プレビュー用サイズ計算（ブラウザモード時） ──
  const isNative = isTauri();
  const currentDimensions = useMemo(() => {
    if (settings.displayMode === 'nano') {
      return { width: 380, height: 44 };
    }
    return WIDGET_SIZES[settings.widgetSize] || WIDGET_SIZES.medium;
  }, [settings.displayMode, settings.widgetSize]);

  return (
    <div
      className={`app-wrapper ${isNative ? 'native-mode' : 'browser-mode'}`}
      style={
        !isNative
          ? ({
              '--preview-width': `${currentDimensions.width}px`,
              '--preview-height': `${currentDimensions.height}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
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
            mediaSourceMode={settings.mediaSourceMode}
            onMediaSourceChange={(mode) => updateSettings({ mediaSourceMode: mode })}
            csvSlideCount={csvSlides.length}
            onOpenAddModal={() => setIsMediaModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen((prev) => !prev)}
            isSettingsOpen={isSettingsOpen}
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
              onImageError={slideshow.handleImageError}
              pomodoroMode={pomodoro.mode}
              timeDisplay={pomodoro.timeDisplay}
              progress={pomodoro.progress}
              isRunning={pomodoro.isRunning}
              completedSessions={pomodoro.completedSessions}
              onTimerStart={pomodoro.start}
              onTimerPause={pomodoro.pause}
              onTimerReset={pomodoro.reset}
              onTimerSkip={pomodoro.skip}
              feedItems={feedItems}
              isFeedLoading={isFeedLoading}
              onRefreshFeeds={refreshFeeds}
              notifications={notifications}
              onClearNotifications={clearAllNotifications}
              onTriggerTestAlert={handleTriggerTestAlert}
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
                onImageError={slideshow.handleImageError}
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
            onSelectPlaylist={setActivePlaylistId}
            onAddUrls={addTweetUrls}
            onCreatePlaylist={createPlaylist}
            onDeletePlaylist={deletePlaylist}
            onClearPlaylistItems={clearPlaylistItems}
            isProcessing={isProcessing}
            statusMessage={statusMessage}
            onDownloadBackup={downloadBackup}
            onRestoreBackup={restoreBackup}
            currentItems={playlistItems}
          />

          {/* ── 設定ドロワー ── */}
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSettingsChange={updateSettings}
            availableMembers={uniqueMembers}
            availableLayers={uniqueLayers}
            feedSources={feedSources}
            onToggleFeedSource={toggleFeedSource}
            onAddFeedSource={addFeedSource}
            onRemoveFeedSource={removeFeedSource}
          />

          {/* ── サイバーパンク ホログラムHUDトースト ── */}
          <HUDToast toasts={activeToasts} onClose={closeToast} />
        </>
      )}
      </div>
    </div>
  );
}
