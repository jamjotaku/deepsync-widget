// ===================================================
// DeepSync HUD — RSS & Atom Feed Parser
// CORS対応プロキシ経由でRSS/Atomフィードを取得・解析
// ===================================================

import type { FeedItem } from '../types';

/** デフォルトで用意するおすすめプリセットフィード */
export const DEFAULT_FEED_PRESETS = [
  {
    id: 'zenn-tech',
    name: 'Zenn Tech Trend',
    url: 'https://zenn.dev/feed',
    badge: 'ZENN',
  },
  {
    id: 'hatena-it',
    name: 'はてなブックマーク (IT)',
    url: 'https://b.hatena.ne.jp/hotentry/it.rss',
    badge: 'HATENA',
  },
  {
    id: 'gigazine',
    name: 'GIGAZINE',
    url: 'https://gigazine.net/news/rss_2.0/',
    badge: 'GIGAZINE',
  },
];

/**
 * CORS対応でXMLテキストを取得
 */
async function fetchXmlWithProxy(url: string): Promise<string> {
  // プロキシ候補
  const proxies = [
    (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
  ];

  // まず直接リクエスト（同一オリジンやCORS許可サイト用）
  try {
    const res = await fetch(url, { headers: { Accept: 'application/rss+xml, application/atom+xml, text/xml' } });
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // CORSブロック等の場合はプロキシへフォールバック
  }

  for (const buildProxyUrl of proxies) {
    try {
      const proxyUrl = buildProxyUrl(url);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // 次のプロキシを試す
    }
  }

  throw new Error(`フィードの取得に失敗しました: ${url}`);
}

/**
 * 相対時刻表示 (例: 5m ago, 2h ago)
 */
function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = Date.now();
    const diffMs = now - d.getTime();

    if (isNaN(diffMs)) return 'RECENT';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  } catch {
    return 'RECENT';
  }
}

/**
 * RSS 2.0 / Atom XML を FeedItem[] に変換
 */
export async function fetchFeedItems(feedUrl: string, badgeName?: string): Promise<FeedItem[]> {
  const xmlText = await fetchXmlWithProxy(feedUrl);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // パースエラー検出
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XMLフォーマットの解析に失敗しました');
  }

  const items: FeedItem[] = [];

  // 1. RSS 2.0 (<item>)
  const rssItems = xmlDoc.querySelectorAll('item');
  if (rssItems.length > 0) {
    const channelTitle = xmlDoc.querySelector('channel > title')?.textContent?.trim() || badgeName || 'RSS';

    rssItems.forEach((el, idx) => {
      if (idx >= 10) return; // 最大10件
      const title = el.querySelector('title')?.textContent?.trim() || 'No Title';
      const link = el.querySelector('link')?.textContent?.trim() || '#';
      const pubDate = el.querySelector('pubDate')?.textContent?.trim() || '';

      items.push({
        id: `rss_${btoa(link).slice(0, 16)}_${idx}`,
        title,
        source: channelTitle,
        url: link,
        timestamp: formatRelativeTime(pubDate),
        badge: badgeName || channelTitle.slice(0, 8).toUpperCase(),
      });
    });

    return items;
  }

  // 2. Atom (<entry>)
  const atomEntries = xmlDoc.querySelectorAll('entry');
  if (atomEntries.length > 0) {
    const feedTitle = xmlDoc.querySelector('feed > title')?.textContent?.trim() || badgeName || 'ATOM';

    atomEntries.forEach((el, idx) => {
      if (idx >= 10) return; // 最大10件
      const title = el.querySelector('title')?.textContent?.trim() || 'No Title';
      let link = el.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
                 el.querySelector('link')?.getAttribute('href') ||
                 el.querySelector('link')?.textContent?.trim() || '#';
      const updated = el.querySelector('updated, published')?.textContent?.trim() || '';

      items.push({
        id: `atom_${btoa(link).slice(0, 16)}_${idx}`,
        title,
        source: feedTitle,
        url: link,
        timestamp: formatRelativeTime(updated),
        badge: badgeName || feedTitle.slice(0, 8).toUpperCase(),
      });
    });

    return items;
  }

  return items;
}
