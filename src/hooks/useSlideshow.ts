// ===================================================
// DeepSync Widget — Slideshow Hook
// フィルタリング・インターバル・プリロード管理
// ===================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SlideData, AppSettings } from '../types';

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
}

/**
 * 画像プリロード
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
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

  // フィルタ適用済みスライドリスト
  const filteredSlides = useMemo(() => {
    let result = slides;

    // メンバーフィルタ（キャラクター列）
    if (settings.selectedMembers.length > 0) {
      result = result.filter((s) => settings.selectedMembers.includes(s.character));
    }

    // レイヤーフィルタ（表示名列）
    if (settings.selectedLayers.length > 0) {
      result = result.filter((s) => settings.selectedLayers.includes(s.displayName));
    }

    return result;
  }, [slides, settings.selectedMembers, settings.selectedLayers]);

  // インデックスがフィルタ結果数を超えないようにクランプ
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
        preloadImage(nextNextSlide.imageUrl).catch(() => {
          /* silent */
        });
      }

      setTimeout(() => setIsTransitioning(false), 100);
    }, 400); // トランジション時間の半分
  }, [filteredSlides, currentIndex]);

  // 前のスライドへ
  const prev = useCallback(() => {
    if (filteredSlides.length <= 1) return;

    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredSlides.length) % filteredSlides.length);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 400);
  }, [filteredSlides]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // 自動切り替えインターバル
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isPaused && filteredSlides.length > 1 && effectiveInterval > 0) {
      intervalRef.current = setInterval(() => {
        next();
      }, effectiveInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, filteredSlides.length, effectiveInterval, next]);

  // 初期プリロード（次の画像）
  useEffect(() => {
    if (filteredSlides.length > 1) {
      const nextSlide = filteredSlides[(currentIndex + 1) % filteredSlides.length];
      if (nextSlide) {
        preloadImage(nextSlide.imageUrl).catch(() => {
          /* silent */
        });
      }
    }
  }, [currentIndex, filteredSlides]);

  return {
    currentSlide,
    currentIndex,
    totalSlides: filteredSlides.length,
    next,
    prev,
    isPaused,
    togglePause,
    isTransitioning,
  };
}
