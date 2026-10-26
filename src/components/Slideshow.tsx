// ===================================================
// DeepSync Widget — Slideshow Component
// ===================================================

import { useCallback, useRef } from 'react';
import { openExternalUrl } from '../lib/windowManager';
import type { SlideData } from '../types';
import '../styles/slideshow.css';

interface SlideshowProps {
  currentSlide: SlideData | null;
  currentIndex: number;
  totalSlides: number;
  isTransitioning: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onNext: () => void;
  onPrev: () => void;
  onImageError?: (url: string) => void;
}

export function Slideshow({
  currentSlide,
  currentIndex,
  totalSlides,
  isTransitioning,
  isLoading,
  error,
  onRetry,
  onNext,
  onPrev,
  onImageError,
}: SlideshowProps) {
  const handleImageClick = useCallback(() => {
    if (currentSlide?.sourceLink) {
      openExternalUrl(currentSlide.sourceLink);
    }
  }, [currentSlide]);

  // スマホ / タブレット用 スワイプジェスチャー検出
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0) {
        onNext(); // 左スワイプで次の画像
      } else {
        onPrev(); // 右スワイプで前の画像
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="slideshow">
        <div className="slideshow__loading">
          <div className="slideshow__loading-ring" />
          <span className="slideshow__loading-text">データを読み込み中...</span>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="slideshow">
        <div className="slideshow__error">
          <span className="slideshow__error-icon">⚠</span>
          <span className="slideshow__error-text">{error}</span>
          <button className="slideshow__error-retry" onClick={onRetry}>
            再試行
          </button>
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (!currentSlide) {
    return (
      <div className="slideshow">
        <div className="slideshow__error">
          <span className="slideshow__error-icon">📷</span>
          <span className="slideshow__error-text">
            表示する画像がありません
            <br />
            フィルタ設定を確認してください
          </span>
        </div>
      </div>
    );
  }

  // ── Active Slideshow ──
  return (
    <div
      className="slideshow"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gradient Overlays */}
      <div className="slideshow__gradient-top" />
      <div className="slideshow__gradient-bottom" />

      {/* Image */}
      <div className="slideshow__image-container">
        <img
          key={currentSlide.imageUrl}
          className={`slideshow__image ${
            isTransitioning
              ? 'slideshow__image--entering'
              : 'slideshow__image--active'
          }`}
          src={currentSlide.imageUrl}
          alt={`${currentSlide.character} by ${currentSlide.displayName}`}
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => {
            if (onImageError) {
              onImageError(currentSlide.imageUrl);
            } else {
              onNext();
            }
          }}
        />
      </div>

      {/* Click to open source */}
      <div
        className="slideshow__link-overlay"
        onClick={handleImageClick}
        title="ソースを開く"
      />

      {/* Navigation Arrows */}
      {totalSlides > 1 && (
        <>
          <button
            className="slideshow__nav slideshow__nav--prev"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            title="前へ"
          >
            ‹
          </button>
          <button
            className="slideshow__nav slideshow__nav--next"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            title="次へ"
          >
            ›
          </button>
        </>
      )}

      {/* Slide Info */}
      <div className="slideshow__info">
        <span className="slideshow__character">{currentSlide.character}</span>
        <div className="slideshow__meta">
          <span className="slideshow__date">{currentSlide.date}</span>
          <span className="slideshow__layer">{currentSlide.displayName}</span>
          <span className="slideshow__counter">
            {currentIndex + 1}/{totalSlides}
          </span>
        </div>
      </div>
    </div>
  );
}
