// ===================================================
// DeepSync HUD — Twitter / X Media Extractor
// FxTwitter / VxTwitter API を利用してポスト画像とメタデータを抽出
// CORSプロキシフォールバック対応
// ===================================================

import type { PlaylistItem } from '../types';

/** FxTwitter API レスポンス型 */
interface FxTweetResponse {
  code: number;
  message?: string;
  tweet?: {
    url: string;
    id: string;
    text: string;
    created_at?: string;
    created_timestamp?: number;
    author: {
      name: string;
      screen_name: string;
      avatar_url?: string;
    };
    media?: {
      photos?: Array<{
        type?: string;
        url: string;
        width?: number;
        height?: number;
      }>;
      videos?: Array<{
        type?: string;
        url: string;
        thumbnail_url?: string;
      }>;
      mosaic?: {
        formats?: {
          jpeg?: string;
          webp?: string;
        };
      };
    };
    // vxTwitter 互換
    media_extended?: Array<{
      type?: string;
      url: string;
      size?: { w: number; h: number };
    }>;
  };
}

/**
 * X/TwitterのURLまたはステータスIDをパース
 */
export function parseTweetUrl(input: string): { statusId: string; screenName?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 数値のみの場合はステータスID
  if (/^\d+$/.test(trimmed)) {
    return { statusId: trimmed };
  }

  // URLから status ID を抽出 (クエリパラメータやハッシュ対応)
  const regex = /(?:twitter|x|fxtwitter|vxtwitter|fixupx)\.com\/([a-zA-Z0-9_]+)\/status(?:es)?\/(\d+)/i;
  const match = trimmed.match(regex);

  if (match) {
    return {
      screenName: match[1],
      statusId: match[2],
    };
  }

  // status/数値 パターン
  const altMatch = /status(?:es)?\/(\d+)/i.exec(trimmed);
  if (altMatch) {
    return { statusId: altMatch[1] };
  }

  return null;
}

/**
 * 複数行のテキストからツイートURLを抽出
 */
export function extractTweetUrls(text: string): string[] {
  const tokens = text.split(/[\r\n\s]+/);
  const validUrls: string[] = [];

  for (const token of tokens) {
    const parsed = parseTweetUrl(token);
    if (parsed) {
      validUrls.push(token.trim());
    }
  }

  return Array.from(new Set(validUrls));
}

/**
 * URLからJSONを取得（直接リクエスト ＋ CORSプロキシフォールバック）
 */
async function fetchJsonWithFallback(apiUrl: string): Promise<FxTweetResponse> {
  const urlsToTry = [
    apiUrl,
    `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`,
  ];

  let lastErr: Error | null = null;

  for (const target of urlsToTry) {
    try {
      const res = await fetch(target, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json && (json.tweet || json.code === 200)) {
          return json as FxTweetResponse;
        }
      }
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastErr || new Error(`Failed to fetch from ${apiUrl}`);
}

/**
 * 単一のツイートから画像とメタデータを抽出
 */
export async function fetchTweetMedia(
  urlOrId: string,
  targetPlaylistId: string
): Promise<PlaylistItem[]> {
  const parsed = parseTweetUrl(urlOrId);
  if (!parsed) {
    throw new Error('有効なX (Twitter) ポストURLまたはIDを入力してください (例: https://x.com/user/status/12345)');
  }

  const { statusId, screenName } = parsed;

  const targetApis = [
    screenName
      ? `https://api.fxtwitter.com/${screenName}/status/${statusId}`
      : `https://api.fxtwitter.com/status/${statusId}`,
    `https://api.vxtwitter.com/Twitter/status/${statusId}`,
  ];

  let data: FxTweetResponse | null = null;
  let lastError: Error | null = null;

  for (const api of targetApis) {
    try {
      data = await fetchJsonWithFallback(api);
      if (data && data.tweet) break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!data || !data.tweet) {
    throw new Error(
      lastError
        ? `ポスト情報の取得に失敗しました: ${lastError.message}`
        : 'ポスト情報が見つかりませんでした。URLをご確認ください。'
    );
  }

  const tweet = data.tweet;

  // 画像リストの収集 (photos, media_extended, videosのサムネイル)
  const imageUrls: string[] = [];

  // 1. media.photos
  if (tweet.media?.photos && tweet.media.photos.length > 0) {
    tweet.media.photos.forEach((p) => {
      if (p.url) imageUrls.push(p.url);
    });
  }

  // 2. media_extended (vxTwitter)
  if (imageUrls.length === 0 && tweet.media_extended && tweet.media_extended.length > 0) {
    tweet.media_extended.forEach((m) => {
      if (m.type === 'image' && m.url) {
        imageUrls.push(m.url);
      }
    });
  }

  if (imageUrls.length === 0) {
    throw new Error('このポストには画像が含まれていません');
  }

  const resultItems: PlaylistItem[] = [];

  imageUrls.forEach((rawUrl, idx) => {
    let optimizedUrl = rawUrl;
    // Twitter公式画像サーバーの場合、高画質パラメータを付与
    if (optimizedUrl.includes('pbs.twimg.com/media/')) {
      try {
        const u = new URL(optimizedUrl);
        u.searchParams.set('name', 'orig');
        optimizedUrl = u.toString();
      } catch {
        // noop
      }
    }

    resultItems.push({
      id: `tweet-${tweet.id}_${idx}_${Date.now()}`,
      imageUrl: optimizedUrl,
      sourceLink: tweet.url || `https://x.com/${tweet.author?.screen_name || 'i'}/status/${tweet.id}`,
      authorName: tweet.author?.name || 'X Creator',
      authorHandle: tweet.author?.screen_name ? `@${tweet.author.screen_name}` : '@unknown',
      authorAvatar: tweet.author?.avatar_url,
      text: tweet.text,
      createdAt: tweet.created_at,
      addedAt: Date.now(),
      playlistId: targetPlaylistId,
    });
  });

  return resultItems;
}
