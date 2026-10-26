-- ===================================================
-- DeepSync HUD — Supabase Schema (Clean & Safe)
-- ===================================================

-- 1. プレイリストテーブル
CREATE TABLE IF NOT EXISTS public.playlists (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. メディアアイテムテーブル
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    source_url TEXT,
    author_name TEXT,
    author_handle TEXT,
    author_avatar TEXT,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ユーザー設定
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ポモドーロ統計
CREATE TABLE IF NOT EXISTS public.pomodoro_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    duration_mins INT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'focus',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_created_at ON public.playlist_items(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_logs ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーをリセットして再作成
DROP POLICY IF EXISTS "Public access playlists" ON public.playlists;
CREATE POLICY "Public access playlists" ON public.playlists FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access items" ON public.playlist_items;
CREATE POLICY "Public access items" ON public.playlist_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access settings" ON public.user_settings;
CREATE POLICY "Public access settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access logs" ON public.pomodoro_logs;
CREATE POLICY "Public access logs" ON public.pomodoro_logs FOR ALL USING (true) WITH CHECK (true);

-- 5. Realtime (テーブルをリアルタイム通知に追加)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_items;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
