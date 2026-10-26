// ===================================================
// DeepSync HUD — Playlist Storage & Management
// プレイリストとメディアアイテムのローカル永続化
// ===================================================

import type { Playlist, PlaylistItem, SlideData } from '../types';

const PLAYLISTS_KEY = 'deepsync_hud_playlists_v1';
const ITEMS_KEY = 'deepsync_hud_playlist_items_v1';

/** デフォルトの初期プレイリスト */
const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'default',
    name: 'メインフィード',
    description: 'Xから取り込んだお気に入り画像',
    createdAt: Date.now(),
    itemCount: 0,
    isDefault: true,
  },
  {
    id: 'favorites',
    name: '⭐ スター付き',
    description: '特にお気に入りの画像',
    createdAt: Date.now(),
    itemCount: 0,
    isDefault: true,
  },
];

/** 初期サンプルアイテム（初回起動時でもすぐ楽しめるように） */
const INITIAL_ITEMS: PlaylistItem[] = [
  {
    id: 'sample_1',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    sourceLink: 'https://unsplash.com',
    authorName: 'DeepSync Cyber',
    authorHandle: '@deepsync',
    text: 'サイバーパンク・ネオンシティ HUD 起動中',
    addedAt: Date.now() - 3600000,
    playlistId: 'default',
  },
  {
    id: 'sample_2',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    sourceLink: 'https://unsplash.com',
    authorName: 'Neon Interface',
    authorHandle: '@neon_hud',
    text: '高解像度アンビエントビジュアル',
    addedAt: Date.now() - 1800000,
    playlistId: 'default',
  },
  {
    id: 'sample_3',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
    sourceLink: 'https://unsplash.com',
    authorName: 'Digital Art',
    authorHandle: '@art_archive',
    text: 'コックピット・ビジュアルストリーム',
    addedAt: Date.now() - 900000,
    playlistId: 'default',
  },
];

/**
 * プレイリスト一覧を取得
 */
export function getStoredPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (!raw) {
      const initial = [...DEFAULT_PLAYLISTS];
      initial[0].itemCount = INITIAL_ITEMS.length;
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as Playlist[];
  } catch (err) {
    console.error('Failed to load playlists:', err);
    return DEFAULT_PLAYLISTS;
  }
}

/**
 * 全アイテムを取得
 */
export function getStoredItems(): PlaylistItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(INITIAL_ITEMS));
      return INITIAL_ITEMS;
    }
    return JSON.parse(raw) as PlaylistItem[];
  } catch (err) {
    console.error('Failed to load playlist items:', err);
    return INITIAL_ITEMS;
  }
}

/**
 * プレイリスト一覧を保存
 */
export function savePlaylists(playlists: Playlist[]): void {
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch (err) {
    console.error('Failed to save playlists:', err);
  }
}

/**
 * アイテム一覧を保存し、プレイリストのカウントを更新
 */
export function saveItems(items: PlaylistItem[]): void {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    // カウントを同期
    const playlists = getStoredPlaylists();
    const updated = playlists.map((p) => ({
      ...p,
      itemCount: items.filter((item) => item.playlistId === p.id).length,
    }));
    savePlaylists(updated);
  } catch (err) {
    console.error('Failed to save playlist items:', err);
  }
}

/**
 * PlaylistItem を SlideData に変換（スライドショーエンジン用）
 */
export function playlistItemToSlideData(item: PlaylistItem): SlideData {
  return {
    date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('ja-JP') : 'RECENT',
    character: item.authorName || 'X User',
    displayName: item.authorHandle || '',
    imageUrl: item.imageUrl,
    sourceLink: item.sourceLink,
    caption: item.text,
    avatarUrl: item.authorAvatar,
    playlistId: item.playlistId,
  };
}

/**
 * プレイリストデータを JSON としてエクスポート
 */
export function exportPlaylistBackup(): string {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    playlists: getStoredPlaylists(),
    items: getStoredItems(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * JSON からプレイリストデータをインポート
 */
export function importPlaylistBackup(jsonStr: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.playlists || !Array.isArray(parsed.playlists) || !parsed.items || !Array.isArray(parsed.items)) {
      return { success: false, message: '無効なバックアップデータ形式です' };
    }

    // 既存データとマージまたは置換
    savePlaylists(parsed.playlists);
    saveItems(parsed.items);
    return { success: true, message: `${parsed.items.length}件のアイテムをインポートしました` };
  } catch (err) {
    return { success: false, message: `JSONの解析に失敗しました: ${err instanceof Error ? err.message : String(err)}` };
  }
}
