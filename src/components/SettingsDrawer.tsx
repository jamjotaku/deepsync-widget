// ===================================================
// DeepSync Widget — Settings Drawer Component
// 下部からスライドアップする設定パネル
// ===================================================

import { FilterPanel } from './FilterPanel';
import { setWidgetSize, setAlwaysOnTop } from '../lib/windowManager';
import type { AppSettings, WidgetSize } from '../types';
import { WIDGET_SIZES } from '../types';
import '../styles/settings.css';

interface SettingsDrawerProps {
  isOpen: boolean;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  availableMembers: string[];
  availableLayers: string[];
}

const SIZE_KEYS: WidgetSize[] = ['small', 'medium', 'large', 'wide'];

export function SettingsDrawer({
  isOpen,
  settings,
  onSettingsChange,
  availableMembers,
  availableLayers,
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
    <div className={`settings-drawer ${isOpen ? 'settings-drawer--open' : ''}`}>
      <div className="settings-drawer__scanline" />

      {/* Handle */}
      <div className="settings-drawer__handle">
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
  );
}
