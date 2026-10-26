// ===================================================
// DeepSync Widget — Window Manager
// Tauri ウィンドウ API のラッパー
// ===================================================

import type { WidgetSize } from '../types';
import { WIDGET_SIZES } from '../types';

// Tauri 環境かどうかの判定 (Tauri v2 / v1 両対応)
export const isTauri = () =>
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

/**
 * 任意の幅・高さにリサイズ
 */
export async function resizeWindow(width: number, height: number): Promise<void> {
  if (!isTauri()) {
    console.log(`[WindowManager] resizeWindow: ${width}x${height} (browser mode — skipped)`);
    return;
  }

  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.setSize(new LogicalSize(width, height));
  } catch (err) {
    console.error('[WindowManager] Failed to resize window:', err);
  }
}

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
 * ドラッグ移動を開始 (マウス押し下げ時)
 */
export async function startDragging(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.startDragging();
  } catch (err) {
    console.error('[WindowManager] Failed to start dragging:', err);
  }
}

/**
 * デスクトップ上の位置プリセット（画面右下・右上・左上・中央など）へ移動
 */
export type WindowPositionPreset = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'center';

export async function setWindowPositionPreset(preset: WindowPositionPreset): Promise<void> {
  if (!isTauri()) {
    console.log(`[WindowManager] setPositionPreset: ${preset} (browser mode)`);
    return;
  }

  try {
    const { getCurrentWindow, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    const monitor = await currentMonitor();
    if (!monitor) return;

    const scale = monitor.scaleFactor || 1;
    const screenWidth = monitor.size.width / scale;
    const screenHeight = monitor.size.height / scale;
    const currentSize = await appWindow.outerSize();
    const winWidth = currentSize.width / scale;
    const winHeight = currentSize.height / scale;

    const margin = 24;
    let x = margin;
    let y = margin;

    switch (preset) {
      case 'top-right':
        x = Math.max(margin, screenWidth - winWidth - margin);
        y = margin;
        break;
      case 'bottom-right':
        x = Math.max(margin, screenWidth - winWidth - margin);
        y = Math.max(margin, screenHeight - winHeight - margin - 48); // タスクバー余白
        break;
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = Math.max(margin, screenHeight - winHeight - margin - 48);
        break;
      case 'center':
        x = Math.max(0, (screenWidth - winWidth) / 2);
        y = Math.max(0, (screenHeight - winHeight) / 2);
        break;
    }

    await appWindow.setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
    console.log(`[WindowManager] Position set to ${preset} (${x}, ${y})`);
  } catch (err) {
    console.error('[WindowManager] Failed to set window position:', err);
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
