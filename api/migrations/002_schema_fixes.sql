-- Migration 002: Schema fixes for data sync bugs
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add last_synced_at to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- 2. Add page_url to keyword_history table
ALTER TABLE public.keyword_history
ADD COLUMN IF NOT EXISTS page_url TEXT;

-- 3. Create keyword_cache table (if not already created via sync_engine.sql)
CREATE TABLE IF NOT EXISTS public.keyword_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    keyword TEXT NOT NULL,
    avg_pos NUMERIC(5,2),
    total_impressions INTEGER,
    total_clicks INTEGER,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, keyword)
);

ALTER TABLE public.keyword_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies (using IF NOT EXISTS via DO block to avoid errors on re-run)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keyword_cache' AND policyname = 'Users can read own keyword cache') THEN
        CREATE POLICY "Users can read own keyword cache" ON public.keyword_cache FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keyword_cache' AND policyname = 'Users can modify own keyword cache') THEN
        CREATE POLICY "Users can modify own keyword cache" ON public.keyword_cache FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON public.sites (user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_site_id ON public.keywords (site_id);
CREATE INDEX IF NOT EXISTS idx_kh_keyword_date ON public.keyword_history (keyword_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_kh_date ON public.keyword_history (date);
CREATE INDEX IF NOT EXISTS idx_keyword_cache_site ON public.keyword_cache (site_id);
CREATE INDEX IF NOT EXISTS idx_keyword_cache_lookup ON public.keyword_cache (user_id, LOWER(keyword));
