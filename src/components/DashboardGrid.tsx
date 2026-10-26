// ===================================================
// DeepSync HUD — Dashboard Grid Component
// 4モジュール (メディア / フィード / 通知 / タイマー) を統合したサイバーパンクHUD
// ===================================================

import React, { useState } from 'react';
import type { FeedItem, NotificationItem, SlideData } from '../types';
import './DashboardGrid.css';

interface DashboardGridProps {
  currentSlide: SlideData | null;
  currentIndex: number;
  totalSlides: number;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  isSlidePaused: boolean;
  onToggleSlidePause: () => void;
  onDeleteCurrentSlide?: () => void;
  // ポモドーロ関連
  pomodoroMode: string;
  timeDisplay: string;
  progress: number;
  isRunning: boolean;
  completedSessions: number;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  onTimerSkip: () => void;
}

// サンプルフィード（後でRSS/X連携に接続）
const INITIAL_FEEDS: FeedItem[] = [
  {
    id: 'f1',
    title: 'DeepSync HUD v2.0 再起動完了 - サイバーコックピット稼働中',
    source: 'SYSTEM',
    url: '#',
    timestamp: 'NOW',
    badge: 'ONLINE',
  },
  {
    id: 'f2',
    title: 'X (Twitter) FxTwitter API連携モジュールがアクティブになりました',
    source: 'MODULE',
    url: '#',
    timestamp: '2m ago',
    badge: 'X/TW',
  },
  {
    id: 'f3',
    title: 'Tauri v2 デスクトップ常駐エンジン待機中',
    source: 'TELEMETRY',
    url: '#',
    timestamp: '15m ago',
    badge: 'CORE',
  },
];

// サンプル通知
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'FOCUS SESSION READY',
    message: '集中セッションを開始する準備が整いました。',
    type: 'info',
    timestamp: Date.now() - 60000,
    source: 'Timer',
    read: false,
  },
  {
    id: 'n2',
    title: 'SYNC COMPLETED',
    message: 'メディアプレイリストの同期が完了しました。',
    type: 'success',
    timestamp: Date.now() - 300000,
    source: 'Store',
    read: true,
  },
];

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  currentSlide,
  currentIndex,
  totalSlides,
  onNextSlide,
  onPrevSlide,
  isSlidePaused,
  onToggleSlidePause,
  onDeleteCurrentSlide,
  pomodoroMode,
  timeDisplay,
  progress,
  isRunning,
  completedSessions,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onTimerSkip,
}) => {
  const [feeds] = useState<FeedItem[]>(INITIAL_FEEDS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="dashboard-grid">
      {/* ── 1. メディア・スライドショー パネル ── */}
      <section className="hud-card media-card">
        <div className="card-header">
          <span className="card-badge">MEDIA STREAM</span>
          <span className="card-counter">
            {totalSlides > 0 ? `${currentIndex + 1} / ${totalSlides}` : '0 / 0'}
          </span>
        </div>

        <div className="media-preview-container">
          {currentSlide ? (
            <>
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.displayName || 'Media'}
                className="media-img"
              />
              <div className="media-overlay-meta">
                <div className="media-author">
                  {currentSlide.avatarUrl && (
                    <img src={currentSlide.avatarUrl} alt="" className="author-avatar" />
                  )}
                  <span className="author-name">{currentSlide.character}</span>
                  <span className="author-handle">{currentSlide.displayName}</span>
                </div>
                {currentSlide.caption && (
                  <p className="media-caption">{currentSlide.caption}</p>
                )}
                {currentSlide.sourceLink && (
                  <a
                    href={currentSlide.sourceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="source-link-pill"
                    title="元ポストを開く"
                  >
                    ↗ Xポスト
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="empty-media-box">
              <span>画像がありません。「＋X登録」から追加してください。</span>
            </div>
          )}
        </div>

        <div className="media-control-bar">
          <button className="hud-mini-btn" onClick={onPrevSlide} title="前の画像">
            ◀ PREV
          </button>
          <button
            className={`hud-mini-btn ${isSlidePaused ? 'active' : ''}`}
            onClick={onToggleSlidePause}
            title={isSlidePaused ? '再生再開' : '一時停止'}
          >
            {isSlidePaused ? '▶ PLAY' : '❚❚ PAUSE'}
          </button>
          <button className="hud-mini-btn" onClick={onNextSlide} title="次の画像">
            NEXT ▶
          </button>
          {onDeleteCurrentSlide && (
            <button
              className="hud-mini-btn danger"
              onClick={onDeleteCurrentSlide}
              title="この画像をプレイリストから削除"
            >
              🗑️
            </button>
          )}
        </div>
      </section>

      {/* ── 2. ポモドーロ＆テレメトリー パネル ── */}
      <section className="hud-card timer-card">
        <div className="card-header">
          <span className="card-badge">CHRONO TELEMETRY</span>
          <span className={`mode-pill mode-${pomodoroMode}`}>
            {pomodoroMode.toUpperCase()}
          </span>
        </div>

        <div className="timer-main-display">
          <div className="digital-clock-face">
            <span className="time-numbers">{timeDisplay}</span>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
          </div>
          <div className="session-count">
            SESSIONS: <span className="highlight-num">{completedSessions}</span>
          </div>
        </div>

        <div className="timer-controls">
          {isRunning ? (
            <button className="hud-btn hud-btn-accent timer-btn" onClick={onTimerPause}>
              ❚❚ PAUSE
            </button>
          ) : (
            <button className="hud-btn hud-btn-accent timer-btn" onClick={onTimerStart}>
              ▶ START
            </button>
          )}
          <button className="hud-btn timer-btn" onClick={onTimerSkip} title="現在のセッションをスキップ">
            SKIP ⏭
          </button>
          <button className="hud-btn timer-btn" onClick={onTimerReset} title="リセット">
            RESET ↺
          </button>
        </div>
      </section>

      {/* ── 3. SNS & RSS シグナルフィード パネル ── */}
      <section className="hud-card feed-card">
        <div className="card-header">
          <span className="card-badge">SIGNAL FEED</span>
          <span className="signal-status">⚡ LIVE</span>
        </div>

        <div className="feed-list">
          {feeds.map((feed) => (
            <a
              key={feed.id}
              href={feed.url}
              target="_blank"
              rel="noreferrer"
              className="feed-item-row"
            >
              <div className="feed-meta">
                <span className="feed-badge">{feed.badge}</span>
                <span className="feed-time">{feed.timestamp}</span>
              </div>
              <div className="feed-title">{feed.title}</div>
            </a>
          ))}
        </div>
      </section>

      {/* ── 4. 外部通知 & アラートモニター パネル ── */}
      <section className="hud-card alert-card">
        <div className="card-header">
          <span className="card-badge">ALERT MONITOR</span>
          {notifications.length > 0 && (
            <button className="clear-btn" onClick={clearNotifications} title="通知を消去">
              CLEAR
            </button>
          )}
        </div>

        <div className="alert-list">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div key={notif.id} className={`alert-item type-${notif.type}`}>
                <div className="alert-head">
                  <span className="alert-type-tag">[{notif.type.toUpperCase()}]</span>
                  <span className="alert-title">{notif.title}</span>
                </div>
                <div className="alert-body">{notif.message}</div>
              </div>
            ))
          ) : (
            <div className="empty-alerts">ALL SYSTEMS NOMINAL</div>
          )}
        </div>
      </section>
    </div>
  );
};
