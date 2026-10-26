// ===================================================
// DeepSync HUD — useWakeLock Hook
// 画面常時点灯（スリープ防止）ライフサイクル管理
// ===================================================

import { useEffect, useState } from 'react';
import { requestWakeLock, releaseWakeLock, isWakeLockSupported } from '../lib/wakeLock';

export function useWakeLock(enabled: boolean = true) {
  const [isActive, setIsActive] = useState(false);
  const isSupported = isWakeLockSupported();

  useEffect(() => {
    if (!enabled || !isSupported) {
      releaseWakeLock();
      setIsActive(false);
      return;
    }

    let mounted = true;

    const acquire = async () => {
      const ok = await requestWakeLock();
      if (mounted) {
        setIsActive(ok);
      }
    };

    acquire();

    // 画面が別タブから戻ってきた際に WakeLock を自動再取得
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled, isSupported]);

  return { isActive, isSupported };
}
