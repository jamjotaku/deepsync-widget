// ===================================================
// DeepSync HUD — usePlaylists Hook
// プレイリスト管理・アイテム追加・スライドデータ連携
// ===================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Playlist, PlaylistItem, SlideData } from '../types';
import {
  getStoredPlaylists,
  getStoredItems,
  savePlaylists,
  saveItems,
  playlistItemToSlideData,
  exportPlaylistBackup,
  importPlaylistBackup,
} from '../lib/playlistStorage';
import { fetchTweetMedia, extractTweetUrls } from '../lib/twitterExtractor';

export function usePlaylists(initialActiveId: string | null = null) {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => getStoredPlaylists());
  const [items, setItems] = useState<PlaylistItem[]>(() => getStoredItems());
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(initialActiveId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // ストレージ同期
  const refreshFromStorage = useCallback(() => {
    setPlaylists(getStoredPlaylists());
    setItems(getStoredItems());
  }, []);

  // 選択中プレイリストのアイテム一覧
  const currentItems = useMemo(() => {
    if (!activePlaylistId) return items;
    return items.filter((item) => item.playlistId === activePlaylistId);
  }, [items, activePlaylistId]);

  // スライドショー用 SlideData[]
  const slides = useMemo<SlideData[]>(() => {
    return currentItems.map(playlistItemToSlideData);
  }, [currentItems]);

  // 新規プレイリスト作成
  const createPlaylist = useCallback((name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}`,
      name: trimmed,
      description,
      createdAt: Date.now(),
      itemCount: 0,
    };

    const next = [...playlists, newPlaylist];
    savePlaylists(next);
    setPlaylists(next);
    return newPlaylist.id;
  }, [playlists]);

  // プレイリスト削除
  const deletePlaylist = useCallback((id: string) => {
    if (id === 'default') return; // デフォルトは削除不可

    const nextPlaylists = playlists.filter((p) => p.id !== id);
    const nextItems = items.filter((item) => item.playlistId !== id);

    savePlaylists(nextPlaylists);
    saveItems(nextItems);
    setPlaylists(nextPlaylists);
    setItems(nextItems);

    if (activePlaylistId === id) {
      setActivePlaylistId(null);
    }
  }, [playlists, items, activePlaylistId]);

  // 単一/複数URLからXメディアを追加
  const addTweetUrls = useCallback(
    async (textInput: string, targetPlaylistId?: string) => {
      const targetId = targetPlaylistId || activePlaylistId || 'default';
      const urls = extractTweetUrls(textInput);

      if (urls.length === 0) {
        throw new Error('有効なX (Twitter) ポストURLが見つかりませんでした');
      }

      setIsProcessing(true);
      setStatusMessage(`${urls.length}件のポストから画像を抽出中...`);

      const addedItems: PlaylistItem[] = [];
      const errors: string[] = [];

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        setStatusMessage(`抽出中 (${i + 1}/${urls.length}): ${url.slice(0, 35)}...`);
        try {
          const extracted = await fetchTweetMedia(url, targetId);
          addedItems.push(...extracted);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${url}: ${msg}`);
        }
      }

      if (addedItems.length > 0) {
        // 先頭に追加（最新順）
        const nextItems = [...addedItems, ...items];
        saveItems(nextItems);
        setItems(nextItems);
        setPlaylists(getStoredPlaylists()); // カウント同期
      }

      setIsProcessing(false);
      setStatusMessage(null);

      return {
        addedCount: addedItems.length,
        errors,
      };
    },
    [activePlaylistId, items]
  );

  // 単一アイテムの削除
  const deleteItem = useCallback((itemId: string) => {
    const next = items.filter((item) => item.id !== itemId);
    saveItems(next);
    setItems(next);
    setPlaylists(getStoredPlaylists());
  }, [items]);

  // アイテムを別プレイリストへ移動
  const moveItemToPlaylist = useCallback((itemId: string, newPlaylistId: string) => {
    const next = items.map((item) =>
      item.id === itemId ? { ...item, playlistId: newPlaylistId } : item
    );
    saveItems(next);
    setItems(next);
    setPlaylists(getStoredPlaylists());
  }, [items]);

  // バックアップダウンロード
  const downloadBackup = useCallback(() => {
    const jsonStr = exportPlaylistBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepsync_playlists_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // バックアップ復元
  const restoreBackup = useCallback((jsonStr: string) => {
    const result = importPlaylistBackup(jsonStr);
    if (result.success) {
      refreshFromStorage();
    }
    return result;
  }, [refreshFromStorage]);

  // ストレージイベント検知（別タブ等）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'deepsync_hud_playlists_v1' || e.key === 'deepsync_hud_playlist_items_v1') {
        refreshFromStorage();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshFromStorage]);

  return {
    playlists,
    items: currentItems,
    allItemsCount: items.length,
    slides,
    activePlaylistId,
    setActivePlaylistId,
    createPlaylist,
    deletePlaylist,
    addTweetUrls,
    deleteItem,
    moveItemToPlaylist,
    isProcessing,
    statusMessage,
    downloadBackup,
    restoreBackup,
    refreshFromStorage,
  };
}
