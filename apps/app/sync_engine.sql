-- NEW: Keyword Cache Table for high-performance retrieval and storage optimization
CREATE TABLE public.keyword_cache (
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

-- RLS for keyword_cache
ALTER TABLE public.keyword_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own keyword cache" ON public.keyword_cache 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can modify own keyword cache" ON public.keyword_cache 
FOR ALL USING (auth.uid() = user_id);

-- High-performance Index for instant matching
-- B-tree index on lowercase keyword for extreme speed
CREATE INDEX idx_keyword_cache_lookup ON public.keyword_cache (user_id, LOWER(keyword));
CREATE INDEX idx_keyword_cache_site ON public.keyword_cache (site_id);
