// ===================================================
// DeepSync HUD — WakeLock & Fullscreen Manager
// タブレット据え置き・スマートディスプレイ常駐用ユーティリティ
// ===================================================

let wakeLockSentinel: any = null;

/**
 * Screen Wake Lock API がサポートされているか確認
 */
export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

/**
 * 画面常時点灯（スリープ防止）を要求
 */
export async function requestWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) {
    console.log('[WakeLock] Screen Wake Lock API is not supported on this platform');
    return false;
  }

  try {
    if (wakeLockSentinel !== null && !wakeLockSentinel.released) {
      return true; // 既にアクティブ
    }

    wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    console.log('[WakeLock] Screen Wake Lock acquired (Active)');

    wakeLockSentinel.addEventListener('release', () => {
      console.log('[WakeLock] Screen Wake Lock released');
      wakeLockSentinel = null;
    });

    return true;
  } catch (err: any) {
    console.warn(`[WakeLock] Failed to acquire wake lock: ${err.message || err}`);
    return false;
  }
}

/**
 * 画面常時点灯を解除
 */
export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel !== null) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      console.warn('[WakeLock] Error releasing wake lock:', err);
    } finally {
      wakeLockSentinel = null;
    }
  }
}

/**
 * フルスクリーンの切替（タブレット据え置き時にブラウザUIを完全非表示にする）
 */
export async function toggleFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return true;
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      return false;
    }
  } catch (err) {
    console.warn('[Fullscreen] Error toggling fullscreen:', err);
    return false;
  }
}

/**
 * 現在フルスクリーンかどうか
 */
export function isFullscreen(): boolean {
  return typeof document !== 'undefined' && Boolean(document.fullscreenElement);
}
