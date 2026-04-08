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
      // 1. そもそもURLが正しく渡されているか確認
      if (!CSV_URL) {
        throw new Error("CSV_URLが未定義です。lib/csvParserを確認してください。");
      }

      console.log("Fetching from:", CSV_URL);

      // TauriのHTTPプラグイン経由でフェッチ
      const response = await fetch(CSV_URL, { 
        method: 'GET',
        signal: controller.signal,
        connectTimeout: 30000 
      });

      if (!response.ok) {
        // HTTPエラー（404や403など）を具体的に投げる
        throw new Error(`サーバ応答エラー: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();

      // 2. 取得した中身がHTML（スプレッドシートのログイン画面など）になっていないか
      if (csvText.includes("<!DOCTYPE html>")) {
        throw new Error("CSVではなくHTMLが返ってきました。スプレッドシートの『ウェブに公開』設定を再確認してください。");
      }

      const parsed = parseCsv(csvText);

      if (parsed.length === 0) {
        throw new Error('CSVデータが空です。');
      }

      dataCache = { slides: parsed, timestamp: Date.now() };
      setSlides(parsed);
      setError(null);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      // 💡 ここが重要！エラーの正体を具体的に画面に出します
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useCsvData] Fetch error:', err);
      
      // 画面の「データ取得に失敗しました」を、具体的な理由に書き換える
      setError(`取得失敗: ${message}`); 
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
