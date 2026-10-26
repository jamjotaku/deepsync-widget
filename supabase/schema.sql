-- ===================================================
-- DeepSync HUD — Supabase Database Schema
-- マルチデバイス（PC / iPhone / Android / タブレット）リアルタイム同期用
-- ===================================================

-- 1. プレイリストテーブル
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. プレイリスト内メディアアイテムテーブル
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    source_url TEXT,
    author_name TEXT,
    author_handle TEXT,
    caption TEXT,
    tweet_id TEXT,
    aspect_ratio NUMERIC,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ユーザー設定（ウィジェットサイズ・タイマー設定・フィード登録）
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ポモドーロ作業統計ログ
CREATE TABLE IF NOT EXISTS public.pomodoro_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    duration_mins INT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'focus',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_created_at ON public.playlist_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_logs_user_id ON public.pomodoro_logs(user_id, completed_at DESC);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_logs ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 認証済みユーザーは自身のデータのみ読み書き可能
-- （開発・デモ用として匿名・公開読み書きポリシーも許容する設定）
CREATE POLICY "Users can manage their own playlists" ON public.playlists
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage their own playlist items" ON public.playlist_items
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage their pomodoro logs" ON public.pomodoro_logs
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5. Realtime (リアルタイム同期) の有効化
-- PCで追加したアイテムが即座にスマホやタブレットにプッシュ配信されるように設定
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.playlists, 
    public.playlist_items, 
    public.user_settings;
COMMIT;
