// ===================================================
// DeepSync HUD — Twitter / X Media Extractor
// FxTwitter / VxTwitter API を利用してポスト画像とメタデータを抽出
// ===================================================

import type { PlaylistItem } from '../types';

/** FxTwitter API レスポンス型 (必要部分のみ定義) */
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
    };
  };
}

/**
 * X/TwitterのURLまたはステータスIDをパース
 * 戻り値: { statusId: string, screenName?: string } | null
 */
export function parseTweetUrl(input: string): { statusId: string; screenName?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 数値のみの場合はステータスIDとみなす
  if (/^\d+$/.test(trimmed)) {
    return { statusId: trimmed };
  }

  // URLパターン: x.com / twitter.com / fxtwitter.com / vxtwitter.com
  const regex = /(?:https?:\/\/)?(?:(?:www\.|mobile\.)?(?:twitter|x|fxtwitter|vxtwitter|fixupx)\.com)\/([a-zA-Z0-9_]+)\/status(?:es)?\/(\d+)/i;
  const match = trimmed.match(regex);

  if (match) {
    return {
      screenName: match[1],
      statusId: match[2],
    };
  }

  return null;
}

/**
 * 複数行のテキストからツイートURLを抽出
 */
export function extractTweetUrls(text: string): string[] {
  const lines = text.split(/[\r\n\s]+/);
  const validUrls: string[] = [];

  for (const line of lines) {
    const parsed = parseTweetUrl(line);
    if (parsed) {
      validUrls.push(line.trim());
    }
  }

  return Array.from(new Set(validUrls));
}

/**
 * 単一のツイートから画像とメタデータを抽出
 * @param urlOrId XポストURLまたはステータスID
 * @param targetPlaylistId 追加先のプレイリストID
 */
export async function fetchTweetMedia(
  urlOrId: string,
  targetPlaylistId: string
): Promise<PlaylistItem[]> {
  const parsed = parseTweetUrl(urlOrId);
  if (!parsed) {
    throw new Error('有効なX (Twitter) ポストURLまたはIDを入力してください');
  }

  const { statusId, screenName } = parsed;

  // 1. FxTwitter API を呼び出し
  const endpoints = [
    screenName
      ? `https://api.fxtwitter.com/${screenName}/status/${statusId}`
      : `https://api.fxtwitter.com/status/${statusId}`,
    `https://api.vxtwitter.com/status/${statusId}`,
  ];

  let lastError: Error | null = null;
  let data: FxTweetResponse | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`API HTTP ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as FxTweetResponse;
      if (json && json.code === 200 && json.tweet) {
        data = json;
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // 次のフォールバックエンドポイントを試す
    }
  }

  if (!data || !data.tweet) {
    throw new Error(
      lastError
        ? `ツイート情報の取得に失敗しました: ${lastError.message}`
        : 'ツイート情報の取得に失敗しました。URLをご確認ください。'
    );
  }

  const tweet = data.tweet;
  const photos = tweet.media?.photos ?? [];

  if (photos.length === 0) {
    throw new Error('このポストには画像が含まれていません');
  }

  const resultItems: PlaylistItem[] = [];

  photos.forEach((photo, idx) => {
    // 高解像度画像URLの確保 (pbs.twimg.comの画像ならname=origまたはname=largeにする)
    let optimizedUrl = photo.url;
    if (optimizedUrl.includes('pbs.twimg.com/media/')) {
      const urlObj = new URL(optimizedUrl);
      urlObj.searchParams.set('name', 'orig');
      optimizedUrl = urlObj.toString();
    }

    resultItems.push({
      id: `tweet-${tweet.id}_${idx}_${Date.now()}`,
      imageUrl: optimizedUrl,
      sourceLink: tweet.url || `https://x.com/${tweet.author.screen_name}/status/${tweet.id}`,
      authorName: tweet.author.name,
      authorHandle: `@${tweet.author.screen_name}`,
      authorAvatar: tweet.author.avatar_url,
      text: tweet.text,
      createdAt: tweet.created_at,
      addedAt: Date.now(),
      playlistId: targetPlaylistId,
    });
  });

  return resultItems;
}
