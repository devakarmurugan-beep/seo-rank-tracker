-- 1. Ensure the 'sites' table has a unique constraint 
DELETE FROM public.sites
WHERE id NOT IN (SELECT MIN(id) FROM public.sites GROUP BY user_id, property_url);
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_user_id_property_url_key;
ALTER TABLE public.sites ADD CONSTRAINT sites_user_id_property_url_key UNIQUE (user_id, property_url);

-- 2. Add Keyword Intent columns to the existing 'keywords' table
ALTER TABLE public.keywords
  ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'Informational',
  ADD COLUMN IF NOT EXISTS intent_confidence NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS intent_source TEXT DEFAULT 'rule',
  ADD COLUMN IF NOT EXISTS classified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create the 'pages' tracking table
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
    page_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, page_url)
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own pages" ON public.pages;
CREATE POLICY "Users can read own pages" ON public.pages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = pages.site_id AND sites.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can modify own pages" ON public.pages;
CREATE POLICY "Users can modify own pages" ON public.pages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = pages.site_id AND sites.user_id = auth.uid())
);
