// ===================================================
// DeepSync HUD — Supabase Client & Cloud Sync
// マルチデバイス（PC / iPhone / Android / タブレット）クラウド同期基盤
// ===================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Playlist, PlaylistItem } from '../types';

const STORAGE_KEY_URL = 'deepsync_supabase_url_v1';
const STORAGE_KEY_KEY = 'deepsync_supabase_key_v1';

// 環境変数またはローカル設定から Supabase 接続情報を取得
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey,
  };
}

// 接続情報の保存
export function setSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  if (url) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
  }

  if (anonKey) {
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_KEY);
  }

  // クライアントインスタンスをリセット
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

// Supabase クライアントの取得 (シングルトン)
export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client:', err);
    return null;
  }
}

// クラウド同期が有効かどうか
export function isCloudSyncEnabled(): boolean {
  return getSupabase() !== null;
}

// ── クラウド同期サービス API ──

export const cloudSync = {
  /**
   * クラウド接続テスト
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Supabase URL と API Key が設定されていません。' };
    }

    try {
      const { error } = await supabase.from('playlists').select('id', { count: 'exact', head: true });
      if (error) {
        return { success: false, message: `接続エラー: ${error.message}` };
      }
      return { success: true, message: 'クラウド同期（Supabase）に正常に接続されました！' };
    } catch (err: any) {
      return { success: false, message: `通信エラー: ${err.message || err}` };
    }
  },

  /**
   * クラウドから全プレイリストと全アイテムを取得
   */
  async fetchCloudData(): Promise<{ playlists: Playlist[]; items: PlaylistItem[] } | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data: playlistsData, error: plError } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: true });

      if (plError || !playlistsData) {
        console.error('[CloudSync] fetch playlists error:', plError);
        return null;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select('*')
        .order('sort_order', { ascending: true });

      if (itemsError || !itemsData) {
        console.error('[CloudSync] fetch items error:', itemsError);
        return null;
      }

      const items: PlaylistItem[] = itemsData.map((item: any) => ({
        id: item.id,
        imageUrl: item.image_url,
        sourceLink: item.source_url || '',
        authorName: item.author_name || '',
        authorHandle: item.author_handle || '',
        authorAvatar: item.author_avatar || '',
        text: item.caption || '',
        createdAt: item.created_at,
        addedAt: new Date(item.created_at).getTime() || Date.now(),
        playlistId: item.playlist_id,
      }));

      const playlists: Playlist[] = playlistsData.map((pl: any) => {
        const plItems = items.filter((it) => it.playlistId === pl.id);
        return {
          id: pl.id,
          name: pl.name,
          description: pl.description || '',
          createdAt: new Date(pl.created_at).getTime() || Date.now(),
          itemCount: plItems.length,
        };
      });

      return { playlists, items };
    } catch (err) {
      console.error('[CloudSync] fetch failed:', err);
      return null;
    }
  },

  /**
   * プレイリストをクラウドに保存 / 作成
   */
  async upsertPlaylist(playlist: Playlist): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('playlists').upsert({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch (err) {
      console.error('[CloudSync] upsertPlaylist failed:', err);
      return false;
    }
  },

  /**
   * メディアアイテムをクラウドに追加
   */
  async addPlaylistItem(playlistId: string, item: PlaylistItem): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('playlist_items').upsert({
        id: item.id,
        playlist_id: playlistId,
        image_url: item.imageUrl,
        source_url: item.sourceLink,
        author_name: item.authorName,
        author_handle: item.authorHandle,
        author_avatar: item.authorAvatar,
        caption: item.text,
        created_at: new Date(item.addedAt).toISOString(),
      });
      return !error;
    } catch (err) {
      console.error('[CloudSync] addPlaylistItem failed:', err);
      return false;
    }
  },

  /**
   * メディアアイテムをクラウドから削除
   */
  async deletePlaylistItem(itemId: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('playlist_items').delete().eq('id', itemId);
      return !error;
    } catch (err) {
      console.error('[CloudSync] deletePlaylistItem failed:', err);
      return false;
    }
  },

  /**
   * 他端末からの変更を検知する Realtime サブスクリプション
   */
  subscribeToChanges(onUpdate: () => void): (() => void) | null {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const channel = supabase
        .channel('deepsync_realtime_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => {
          console.log('[CloudSync] Realtime: playlists changed, syncing...');
          onUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_items' }, () => {
          console.log('[CloudSync] Realtime: playlist_items changed, syncing...');
          onUpdate();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('[CloudSync] Realtime subscription error:', err);
      return null;
    }
  },
};
