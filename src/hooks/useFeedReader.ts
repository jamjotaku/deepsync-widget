// ===================================================
// DeepSync HUD — useFeedReader Hook
// RSS/Atomフィードの管理・定期フェッチ・新着検知
// ===================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FeedItem } from '../types';
import { fetchFeedItems, DEFAULT_FEED_PRESETS } from '../lib/feedReader';

const FEED_URLS_KEY = 'deepsync_hud_feed_urls_v1';

export interface FeedSourceConfig {
  id: string;
  name: string;
  url: string;
  badge: string;
  enabled: boolean;
}

const DEFAULT_SOURCES: FeedSourceConfig[] = DEFAULT_FEED_PRESETS.map((p) => ({
  ...p,
  enabled: true,
}));

export function useFeedReader(onNewItem?: (item: FeedItem) => void) {
  const [sources, setSources] = useState<FeedSourceConfig[]>(() => {
    try {
      const raw = localStorage.getItem(FEED_URLS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_SOURCES;
    } catch {
      return DEFAULT_SOURCES;
    }
  });

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());

  // フィード設定保存
  const saveSources = useCallback((newSources: FeedSourceConfig[]) => {
    setSources(newSources);
    try {
      localStorage.setItem(FEED_URLS_KEY, JSON.stringify(newSources));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 全有効フィードをフェッチ
  const fetchAllFeeds = useCallback(async () => {
    const activeSources = sources.filter((s) => s.enabled);
    if (activeSources.length === 0) {
      setFeedItems([]);
      return;
    }

    setIsLoading(true);
    const allItems: FeedItem[] = [];

    for (const source of activeSources) {
      try {
        const items = await fetchFeedItems(source.url, source.badge);
        allItems.push(...items);
      } catch (err) {
        console.warn(`[useFeedReader] Feed fetch error (${source.name}):`, err);
      }
    }

    if (allItems.length > 0) {
      // 新着チェック
      if (knownIdsRef.current.size > 0 && onNewItem) {
        for (const item of allItems) {
          if (!knownIdsRef.current.has(item.id)) {
            onNewItem(item);
          }
        }
      }

      // ID記憶
      allItems.forEach((item) => knownIdsRef.current.add(item.id));
      setFeedItems(allItems);
      setLastUpdated(Date.now());
    }

    setIsLoading(false);
  }, [sources, onNewItem]);

  // 初回およびインターバルフェッチ (10分ごと)
  useEffect(() => {
    fetchAllFeeds();
    const interval = setInterval(fetchAllFeeds, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAllFeeds]);

  // ソース追加
  const addSource = useCallback(
    (name: string, url: string, badge?: string) => {
      const newSource: FeedSourceConfig = {
        id: `src_${Date.now()}`,
        name: name.trim(),
        url: url.trim(),
        badge: (badge || name).slice(0, 8).toUpperCase(),
        enabled: true,
      };
      saveSources([...sources, newSource]);
    },
    [sources, saveSources]
  );

  // ソース削除
  const removeSource = useCallback(
    (id: string) => {
      saveSources(sources.filter((s) => s.id !== id));
    },
    [sources, saveSources]
  );

  // ソース有効/無効トグル
  const toggleSource = useCallback(
    (id: string) => {
      saveSources(
        sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      );
    },
    [sources, saveSources]
  );

  return {
    feedItems,
    sources,
    isLoading,
    lastUpdated,
    refreshFeeds: fetchAllFeeds,
    addSource,
    removeSource,
    toggleSource,
  };
}
