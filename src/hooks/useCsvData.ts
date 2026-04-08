// ===================================================
// DeepSync Widget — CSV Data Hook (Tauri HTTP Plugin版)
// ===================================================

import { useState, useEffect, useCallback, useRef } from 'react';
// ブラウザ標準の fetch ではなく、Tauriプラグインの fetch を使用
import { fetch } from '@tauri-apps/plugin-http'; 
import { parseCsv, extractUniqueValues, CSV_URL } from '../lib/csvParser';
import type { SlideData, CsvDataResult } from '../types';

/** データキャッシュの有効期限（5分） */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  slides: SlideData[];
  timestamp: number;
}

// モジュールレベルキャッシュ
let dataCache: CacheEntry | null = null;

export function useCsvData(): CsvDataResult {
  const [slides, setSlides] = useState<SlideData[]>(dataCache?.slides ?? []);
  const [isLoading, setIsLoading] = useState(!dataCache);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // キャッシュチェック
    if (!forceRefresh && dataCache && Date.now() - dataCache.timestamp < CACHE_TTL_MS) {
      setSlides(dataCache.slides);
      setIsLoading(false);
      return;
    }

    // 既存リクエストをキャンセル
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      // TauriのHTTPプラグイン経由でフェッチ（CORSを回避）
      const response = await fetch(CSV_URL, { 
        method: 'GET',
        signal: controller.signal,
        // タイムアウト設定を追加（任意）
        connectTimeout: 30000 
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const parsed = parseCsv(csvText);

      if (parsed.length === 0) {
        throw new Error('CSVデータが空です。データソースを確認してください。');
      }

      // キャッシュ更新
      dataCache = { slides: parsed, timestamp: Date.now() };
      setSlides(parsed);
      setError(null);
    } catch (err: any) {
      // キャンセル時はエラーにしない
      if (err.name === 'AbortError' || (err instanceof DOMException && err.name === 'AbortError')) return;
      
      const message = err instanceof Error ? err.message : 'データ取得に失敗しました';
      console.error('[useCsvData] Fetch error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回マウント時にデータ取得
  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const { members: uniqueMembers, layers: uniqueLayers } = extractUniqueValues(slides);

  return {
    slides,
    uniqueMembers,
    uniqueLayers,
    isLoading,
    error,
    refetch: () => fetchData(true),
  };
}
