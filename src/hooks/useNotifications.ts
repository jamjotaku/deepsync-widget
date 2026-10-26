// ===================================================
// DeepSync HUD — useNotifications Hook
// アラート・トースト・外部通知の管理
// ===================================================

import { useState, useCallback, useEffect } from 'react';
import type { NotificationItem } from '../types';

const NOTIFICATIONS_KEY = 'deepsync_hud_notifications_v1';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // 現在表示中のトースト通知（最大3件）
  const [activeToasts, setActiveToasts] = useState<NotificationItem[]>([]);

  // 永続化
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  // 新規通知の追加
  const addNotification = useCallback(
    (
      title: string,
      message: string,
      type: NotificationItem['type'] = 'info',
      source = 'SYSTEM'
    ) => {
      const newNotif: NotificationItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        message,
        type,
        source,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // トーストに表示
      setActiveToasts((prev) => [newNotif, ...prev.slice(0, 2)]);

      // 5秒後にトーストを閉じる
      setTimeout(() => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
      }, 5000);

      return newNotif.id;
    },
    []
  );

  // トースト単体クローズ
  const closeToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 通知を既読にする
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // 全通知クリア
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setActiveToasts([]);
  }, []);

  // 未読数
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    activeToasts,
    unreadCount,
    addNotification,
    closeToast,
    markAsRead,
    clearAllNotifications,
  };
}
