// ===================================================
// DeepSync Widget — Settings Drawer Component
// 下部からスライドアップする設定パネル
// ===================================================

import { FilterPanel } from './FilterPanel';
import { setWidgetSize, setAlwaysOnTop, setWindowPositionPreset } from '../lib/windowManager';
import type { AppSettings, WidgetSize, MediaSourceMode } from '../types';
import { WIDGET_SIZES } from '../types';
import type { FeedSourceConfig } from '../hooks/useFeedReader';
import '../styles/settings.css';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose?: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  availableMembers: string[];
  availableLayers: string[];
  feedSources?: FeedSourceConfig[];
  onToggleFeedSource?: (id: string) => void;
  onAddFeedSource?: (name: string, url: string, badge?: string) => void;
  onRemoveFeedSource?: (id: string) => void;
}

const SIZE_KEYS: WidgetSize[] = ['small', 'medium', 'large', 'wide', 'expanded'];

export function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  availableMembers,
  availableLayers,
  feedSources,
  onToggleFeedSource,
  onAddFeedSource,
  onRemoveFeedSource,
}: SettingsDrawerProps) {
  const handleSizeChange = async (size: WidgetSize) => {
    onSettingsChange({ widgetSize: size });
    await setWidgetSize(size);
  };

  const handleAlwaysOnTopChange = async () => {
    const newValue = !settings.alwaysOnTop;
    onSettingsChange({ alwaysOnTop: newValue });
    await setAlwaysOnTop(newValue);
  };

  const formatInterval = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
  };

  return (
    <>
      {/* ── 外側クリックで閉じるバックドロップ ── */}
      {isOpen && (
        <div
          className="settings-drawer-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 19,
          }}
        />
      )}

      <div className={`settings-drawer ${isOpen ? 'settings-drawer--open' : ''}`}>
        <div className="settings-drawer__scanline" />

        {/* ── ドロワーヘッダー (タイトル & 閉じるボタン) ── */}
        <div
          className="settings-drawer__header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px 6px',
            borderBottom: '1px solid rgba(0, 242, 255, 0.15)',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#00f2ff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚙️</span> SYSTEM CONFIGURATION
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 0, 127, 0.1)',
                border: '1px solid rgba(255, 0, 127, 0.3)',
                color: '#ff007f',
                borderRadius: '3px',
                padding: '2px 8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
              title="設定を閉じる"
            >
              ✕ CLOSE
            </button>
          )}
        </div>

        {/* Handle */}
        <div
          className="settings-drawer__handle"
          onClick={onClose}
          style={{ cursor: onClose ? 'pointer' : 'default' }}
          title={onClose ? 'クリックして閉じる' : undefined}
        >
          <div className="settings-drawer__handle-bar" />
        </div>

      <div className="settings-drawer__content">
        {/* ── サイズプリセット ── */}
        <div className="settings-section">
          <div className="settings-section__title">ウィジェットサイズ</div>
          <div className="settings-sizes">
            {SIZE_KEYS.map((key) => {
              const size = WIDGET_SIZES[key];
              return (
                <button
                  key={key}
                  className={`settings-size-btn ${
                    settings.widgetSize === key ? 'settings-size-btn--active' : ''
                  }`}
                  onClick={() => handleSizeChange(key)}
                >
                  <span className="settings-size-btn__label">{size.label}</span>
                  <span className="settings-size-btn__dims">
                    {size.width}×{size.height}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── デスクトップ配置スナップ ── */}
        <div className="settings-section">
          <div className="settings-section__title">デスクトップ配置（スナップ移動）</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '6px' }}>
            <button
              className="settings-size-btn"
              onClick={() => setWindowPositionPreset('top-left')}
              title="画面左上にピタッと配置"
            >
              ↖ 画面左上
            </button>
            <button
              className="settings-size-btn"
              onClick={() => setWindowPositionPreset('top-right')}
              title="画面右上にピタッと配置"
            >
              ↗ 画面右上
            </button>
            <button
              className="settings-size-btn"
              onClick={() => setWindowPositionPreset('bottom-left')}
              title="画面左下にピタッと配置"
            >
              ↙ 画面左下
            </button>
            <button
              className="settings-size-btn"
              onClick={() => setWindowPositionPreset('bottom-right')}
              title="画面右下にピタッと配置"
            >
              ↘ 画面右下
            </button>
          </div>
          <button
            className="settings-size-btn"
            style={{ width: '100%', marginTop: '6px' }}
            onClick={() => setWindowPositionPreset('center')}
            title="画面中央に配置"
          >
            ⦿ 画面中央
          </button>
        </div>

        {/* ── スライド間隔 ── */}
        <div className="settings-section">
          <div className="settings-section__title">表示設定</div>

          <div className="settings-slider">
            <div className="settings-slider__header">
              <span className="settings-slider__label">スライド間隔</span>
              <span className="settings-slider__value">
                {formatInterval(settings.slideInterval)}
              </span>
            </div>
            <input
              className="settings-slider__input"
              type="range"
              min={10}
              max={600}
              step={5}
              value={settings.slideInterval}
              onChange={(e) =>
                onSettingsChange({ slideInterval: Number(e.target.value) })
              }
            />
          </div>

          {/* Always on Top Toggle */}
          <div className="settings-toggle" onClick={handleAlwaysOnTopChange}>
            <span className="settings-toggle__label">常に最前面表示</span>
            <div
              className={`settings-toggle__switch ${
                settings.alwaysOnTop ? 'settings-toggle__switch--on' : ''
              }`}
            >
              <div className="settings-toggle__switch-knob" />
            </div>
          </div>
        </div>

        {/* ── ポモドーロ設定 ── */}
        <div className="settings-section">
          <div className="settings-section__title">ポモドーロ</div>
          <div className="settings-pomodoro">
            <div className="settings-slider">
              <div className="settings-slider__header">
                <span className="settings-slider__label">集中</span>
                <span className="settings-slider__value">
                  {settings.focusDuration}分
                </span>
              </div>
              <input
                className="settings-slider__input"
                type="range"
                min={5}
                max={60}
                step={5}
                value={settings.focusDuration}
                onChange={(e) =>
                  onSettingsChange({ focusDuration: Number(e.target.value) })
                }
              />
            </div>
            <div className="settings-slider">
              <div className="settings-slider__header">
                <span className="settings-slider__label">休憩</span>
                <span className="settings-slider__value">
                  {settings.breakDuration}分
                </span>
              </div>
              <input
                className="settings-slider__input"
                type="range"
                min={1}
                max={30}
                step={1}
                value={settings.breakDuration}
                onChange={(e) =>
                  onSettingsChange({ breakDuration: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>

        {/* ── メディアソース選択 ── */}
        <div className="settings-section">
          <div className="settings-section__title">メディアソース</div>
          <div className="settings-sizes">
            {(
              [
                { key: 'playlist', label: 'Xプレイリスト' },
                { key: 'csv', label: 'Google Sheets' },
                { key: 'hybrid', label: '両方 (ハイブリッド)' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                className={`settings-size-btn ${
                  settings.mediaSourceMode === key ? 'settings-size-btn--active' : ''
                }`}
                onClick={() => onSettingsChange({ mediaSourceMode: key as MediaSourceMode })}
              >
                <span className="settings-size-btn__label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── RSS フィードソース ── */}
        {feedSources && (
          <div className="settings-section">
            <div className="settings-section__title">RSS シグナルフィード</div>
            <div className="feed-sources-list">
              {feedSources.map((source) => (
                <div
                  key={source.id}
                  className="settings-toggle"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                >
                  <span
                    className="settings-toggle__label"
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => onToggleFeedSource?.(source.id)}
                  >
                    [{source.badge}] {source.name}
                  </span>
                  <div
                    className={`settings-toggle__switch ${
                      source.enabled ? 'settings-toggle__switch--on' : ''
                    }`}
                    onClick={() => onToggleFeedSource?.(source.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="settings-toggle__switch-knob" />
                  </div>
                  {onRemoveFeedSource && (
                    <button
                      className="hud-mini-action-btn"
                      style={{ color: '#ff007f', borderColor: 'rgba(255,0,127,0.3)' }}
                      onClick={() => onRemoveFeedSource(source.id)}
                      title="このフィードを削除"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {onAddFeedSource && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="RSS URL (例: https://...)"
                  className="hud-input"
                  style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
                  id="custom-rss-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      if (input.value.trim()) {
                        onAddFeedSource('Custom RSS', input.value.trim(), 'RSS');
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  className="hud-btn hud-btn-accent"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  onClick={() => {
                    const input = document.getElementById('custom-rss-input') as HTMLInputElement | null;
                    if (input && input.value.trim()) {
                      onAddFeedSource('Custom RSS', input.value.trim(), 'RSS');
                      input.value = '';
                    }
                  }}
                >
                  ＋追加
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── フィルタ ── */}
        <FilterPanel
          availableMembers={availableMembers}
          availableLayers={availableLayers}
          selectedMembers={settings.selectedMembers}
          selectedLayers={settings.selectedLayers}
          onMembersChange={(members) =>
            onSettingsChange({ selectedMembers: members })
          }
          onLayersChange={(layers) =>
            onSettingsChange({ selectedLayers: layers })
          }
        />
      </div>
    </div>
    </>
  );
}
