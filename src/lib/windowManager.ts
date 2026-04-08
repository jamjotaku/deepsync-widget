// ===================================================
// DeepSync Widget — Window Manager
// Tauri ウィンドウ API のラッパー
// ===================================================

import type { WidgetSize } from '../types';
import { WIDGET_SIZES } from '../types';

// Tauri 環境かどうかの判定
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * ウィンドウサイズをプリセットに変更
 */
export async function setWidgetSize(size: WidgetSize): Promise<void> {
  if (!isTauri()) {
    console.log(`[WindowManager] setSize: ${size} (browser mode — skipped)`);
    return;
  }

  const { width, height } = WIDGET_SIZES[size];

  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.setSize(new LogicalSize(width, height));
  } catch (err) {
    console.error('[WindowManager] Failed to set size:', err);
  }
}

/**
 * 常に最前面表示の切り替え
 */
export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  if (!isTauri()) {
    console.log(`[WindowManager] alwaysOnTop: ${enabled} (browser mode — skipped)`);
    return;
  }

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.setAlwaysOnTop(enabled);
  } catch (err) {
    console.error('[WindowManager] Failed to set always on top:', err);
  }
}

/**
 * 外部URLをデフォルトブラウザで開く
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;

  if (!isTauri()) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch (err) {
    console.error('[WindowManager] Failed to open URL:', err);
    // フォールバック
    window.open(url, '_blank', 'noopener');
  }
}
