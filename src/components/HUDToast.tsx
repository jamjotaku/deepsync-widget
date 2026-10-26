// ===================================================
// DeepSync HUD — HUD Toast Component
// サイバーパンク・ホログラム風トースト通知オーバーレイ
// ===================================================

import React from 'react';
import type { NotificationItem } from '../types';
import './HUDToast.css';

interface HUDToastProps {
  toasts: NotificationItem[];
  onClose: (id: string) => void;
}

export const HUDToast: React.FC<HUDToastProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="hud-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`hud-toast-item type-${toast.type}`}>
          <div className="toast-header">
            <span className="toast-type-tag">[{toast.type.toUpperCase()}]</span>
            <span className="toast-source">{toast.source || 'SYSTEM'}</span>
            <button className="toast-close" onClick={() => onClose(toast.id)}>
              ✕
            </button>
          </div>
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>
          <div className="toast-progress-bar" />
        </div>
      ))}
    </div>
  );
};
