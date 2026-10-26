// ===================================================
// DeepSync HUD — Header HUD Component
// コックピットヘッダー: モード切替 / プレイリスト選択 / クイック追加
// ===================================================

import React from 'react';
import type { DisplayMode, Playlist, WidgetSize } from '../types';
import { WIDGET_SIZES } from '../types';
import { useClock } from '../hooks/useClock';
import './HeaderHUD.css';

interface HeaderHUDProps {
  displayMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onPlaylistChange: (id: string | null) => void;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  isSettingsOpen?: boolean;
  widgetSize: WidgetSize;
  onSizeChange: (size: WidgetSize) => void;
  isAlwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  pomodoroMode: string;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  displayMode,
  onModeChange,
  playlists,
  activePlaylistId,
  onPlaylistChange,
  onOpenAddModal,
  onOpenSettings,
  isSettingsOpen = false,
  widgetSize,
  onSizeChange,
  isAlwaysOnTop,
  onToggleAlwaysOnTop,
  pomodoroMode,
}) => {
  const clock = useClock();

  return (
    <header className="hud-header" data-tauri-drag-region>
      {/* 左側: システム識別 & リアルタイム時計 */}
      <div className="header-brand" data-tauri-drag-region>
        <span className="brand-badge">HUD</span>
        <span className="brand-title">DEEPSYNC</span>
        <span className={`status-dot mode-${pomodoroMode}`} title={`Mode: ${pomodoroMode}`} />
        <div className="header-clock" title="システム現在時刻">
          <span className="clock-date">{clock.dateStr}</span>
          <span className="clock-time">{clock.timeStr}</span>
        </div>
      </div>

      {/* 中央: プレイリスト選択 & クイック追加 */}
      <div className="header-playlist-bar">
        <select
          className="hud-select playlist-select"
          value={activePlaylistId || ''}
          onChange={(e) => onPlaylistChange(e.target.value || null)}
          title="再生プレイリストを選択"
        >
          <option value="">📁 全プレイリスト</option>
          {playlists.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.name} ({pl.itemCount})
            </option>
          ))}
        </select>

        <button
          className="hud-btn hud-btn-accent add-btn"
          onClick={onOpenAddModal}
          title="X (Twitter) ポストから画像を追加"
        >
          <span className="btn-icon">＋</span> X登録
        </button>
      </div>

      {/* 右側: モード切替 & ウィンドウ操作 */}
      <div className="header-controls">
        {/* モード切替 */}
        <div className="mode-toggle-group">
          <button
            className={`mode-btn ${displayMode === 'nano' ? 'active' : ''}`}
            onClick={() => onModeChange('nano')}
            title="Nano (極小バー) モード"
          >
            NANO
          </button>
          <button
            className={`mode-btn ${displayMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => onModeChange('dashboard')}
            title="Dashboard (グリッド) モード"
          >
            DASH
          </button>
          <button
            className={`mode-btn ${displayMode === 'ambient' ? 'active' : ''}`}
            onClick={() => onModeChange('ambient')}
            title="Ambient (全面シネマ) モード"
          >
            CINEMA
          </button>
        </div>

        {/* サイズプリセット */}
        <select
          className="hud-select size-select"
          value={widgetSize}
          onChange={(e) => onSizeChange(e.target.value as WidgetSize)}
          title="ウィジェットサイズ変更"
        >
          {Object.entries(WIDGET_SIZES).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>

        {/* 最前面ピン */}
        <button
          className={`hud-icon-btn ${isAlwaysOnTop ? 'pinned' : ''}`}
          onClick={onToggleAlwaysOnTop}
          title={isAlwaysOnTop ? '最前面固定中 (クリックで解除)' : '最前面固定する'}
        >
          📌
        </button>

        {/* 設定 */}
        <button
          className={`hud-icon-btn ${isSettingsOpen ? 'pinned' : ''}`}
          onClick={onOpenSettings}
          title={isSettingsOpen ? '設定を閉じる' : '設定を開く'}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};
