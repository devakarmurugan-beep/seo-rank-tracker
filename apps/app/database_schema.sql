-- ==========================================
-- SEO TRACKER: SUPABASE DATABASE SCHEMA
-- ==========================================

-- 1. USER CONNECTIONS TABLE
-- Securely stores the Google Search Console (OAuth) refresh_tokens for background syncing.
CREATE TABLE public.user_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'google',
    provider_id TEXT, -- Google Account ID
    refresh_token TEXT, -- Encrypted or plain (if relying on RLS) refresh token
    access_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Row Level Security (RLS) for user_connections
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own connections" ON public.user_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own connections" ON public.user_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own connections" ON public.user_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own connections" ON public.user_connections FOR DELETE USING (auth.uid() = user_id);

-- 2. SITES (GSC Properties) TABLE
-- Maps to the specific URL prefixes or Domain properties the user tracks in GSC.
CREATE TABLE public.sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_url TEXT NOT NULL, -- e.g., 'sc-domain:example.com' or 'https://example.com/'
    site_name TEXT NOT NULL, -- Display name (e.g., 'Example Corp')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for sites
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own sites" ON public.sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own sites" ON public.sites FOR ALL USING (auth.uid() = user_id);

-- 3. KEYWORDS TABLE
-- Master list of keywords a user chooses to track for a specific site.
CREATE TABLE public.keywords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
    keyword TEXT NOT NULL,
    category TEXT, -- e.g., 'Brand', 'Core Product'
    intent TEXT, -- e.g., 'Commercial', 'Informational'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, keyword)
);

-- RLS for keywords (joins through sites table to ensure ownership)
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own keywords" ON public.keywords FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = keywords.site_id AND sites.user_id = auth.uid())
);
CREATE POLICY "Users can modify own keywords" ON public.keywords FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = keywords.site_id AND sites.user_id = auth.uid())
);

-- 4. KEYWORD HISTORY TABLE
-- Daily analytical snapshots pulled from GSC API.
CREATE TABLE public.keyword_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword_id UUID REFERENCES public.keywords(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    position NUMERIC(5,2),
    impressions INTEGER,
    clicks INTEGER,
    ctr NUMERIC(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(keyword_id, date)
);

-- RLS for keyword_history
ALTER TABLE public.keyword_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own keyword history" ON public.keyword_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.keywords k 
        JOIN public.sites s ON k.site_id = s.id 
        WHERE k.id = keyword_history.keyword_id AND s.user_id = auth.uid()
    )
);

-- 5. FUNCTION TO AUTO-UPDATE TIMESTAMPS
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_connections_modtime
BEFORE UPDATE ON public.user_connections
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
