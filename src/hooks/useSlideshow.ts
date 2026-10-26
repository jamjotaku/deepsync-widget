// ===================================================
// DeepSync HUD — Slideshow Hook
// フィルタリング・インターバル・破損画像自動スキップ & プリロード
// ===================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SlideData, AppSettings } from '../types';

const FAILED_IMAGES_KEY = 'deepsync_failed_images_v1';

interface UseSlideshowOptions {
  slides: SlideData[];
  settings: AppSettings;
  /** 現在のポモドーロモードに応じた実効インターバル（秒） */
  effectiveInterval: number;
}

interface UseSlideshowReturn {
  currentSlide: SlideData | null;
  currentIndex: number;
  totalSlides: number;
  /** 次のスライドに進む */
  next: () => void;
  /** 前のスライドに戻る */
  prev: () => void;
  /** 一時停止/再開 */
  isPaused: boolean;
  togglePause: () => void;
  /** トランジション状態 */
  isTransitioning: boolean;
  /** 画像ロードエラー発生時のコールバック */
  handleImageError: (failedUrl: string) => void;
}

/**
 * 画像プリロード (リファラー制限回避対応)
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
    img.src = url;
  });
}

export function useSlideshow({
  slides,
  settings,
  effectiveInterval,
}: UseSlideshowOptions): UseSlideshowReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 読み込みに失敗した画像URLのブラックリスト
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAILED_IMAGES_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // 壊れた画像を除外し、フィルタを適用したスライドリスト
  const validSlides = useMemo(() => {
    return slides.filter((s) => !failedUrls.has(s.imageUrl));
  }, [slides, failedUrls]);

  const filteredSlides = useMemo(() => {
    let result = validSlides;

    // メンバーフィルタ（キャラクター列）
    if (settings.selectedMembers.length > 0) {
      result = result.filter((s) => settings.selectedMembers.includes(s.character));
    }

    // レイヤーフィルタ（表示名列）
    if (settings.selectedLayers.length > 0) {
      result = result.filter((s) => settings.selectedLayers.includes(s.displayName));
    }

    return result;
  }, [validSlides, settings.selectedMembers, settings.selectedLayers]);

  // インデックスのクランプ
  useEffect(() => {
    if (filteredSlides.length > 0 && currentIndex >= filteredSlides.length) {
      setCurrentIndex(0);
    }
  }, [filteredSlides.length, currentIndex]);

  const currentSlide = filteredSlides[currentIndex] ?? null;

  // 次のスライドへ
  const next = useCallback(() => {
    if (filteredSlides.length <= 1) return;

    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredSlides.length);

      // 次の次の画像をプリロード
      const nextNextIndex = (currentIndex + 2) % filteredSlides.length;
      const nextNextSlide = filteredSlides[nextNextIndex];
      if (nextNextSlide) {
        preloadImage(nextNextSlide.imageUrl).catch(() => {});
      }

      setIsTransitioning(false);
    }, 400);
  }, [filteredSlides, currentIndex]);

  // 画像エラー時のハンドラー（自動スキップ ＆ ブラックリスト登録）
  const handleImageError = useCallback(
    (failedUrl: string) => {
      console.warn(`[useSlideshow] Image failed to load, skipping: ${failedUrl}`);
      setFailedUrls((prev) => {
        const nextSet = new Set(prev).add(failedUrl);
        try {
          localStorage.setItem(FAILED_IMAGES_KEY, JSON.stringify(Array.from(nextSet).slice(-200)));
        } catch (e) {
          console.error(e);
        }
        return nextSet;
      });
      // 即座に次のスライドへ進む
      next();
    },
    [next]
  );

  // 前のスライドへ
  const prev = useCallback(() => {
    if (filteredSlides.length <= 1) return;

    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex((p) => (p - 1 + filteredSlides.length) % filteredSlides.length);
      setIsTransitioning(false);
    }, 400);
  }, [filteredSlides.length]);

  // 一時停止トグル
  const togglePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  // 自動スライドショータイマー
  useEffect(() => {
    if (isPaused || filteredSlides.length <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      next();
    }, effectiveInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, filteredSlides.length, effectiveInterval, next]);

  // 初回マウント時: 次の画像をプリロード
  useEffect(() => {
    if (filteredSlides.length > 1) {
      const nextSlide = filteredSlides[1];
      if (nextSlide) {
        preloadImage(nextSlide.imageUrl).catch(() => {});
      }
    }
  }, [filteredSlides]);

  return {
    currentSlide,
    currentIndex,
    totalSlides: filteredSlides.length,
    next,
    prev,
    isPaused,
    togglePause,
    isTransitioning,
    handleImageError,
  };
}
