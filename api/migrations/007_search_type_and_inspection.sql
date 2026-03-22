-- Add search_type and device to keyword_history
ALTER TABLE keyword_history
  ADD COLUMN IF NOT EXISTS search_type TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS device TEXT DEFAULT 'all';

-- Backfill any existing NULL device values
UPDATE keyword_history SET device = 'all' WHERE device IS NULL;

-- Update unique constraint to include search_type and device
ALTER TABLE keyword_history
  DROP CONSTRAINT IF EXISTS keyword_history_keyword_id_date_key,
  DROP CONSTRAINT IF EXISTS keyword_history_keyword_id_date_search_type_key,
  DROP CONSTRAINT IF EXISTS keyword_history_keyword_id_date_type_device_key;
ALTER TABLE keyword_history
  ADD CONSTRAINT keyword_history_keyword_id_date_search_type_device_key
  UNIQUE (keyword_id, date, search_type, device);

-- Add richer URL inspection fields + hostname to pages
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS mobile_usability TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rich_results_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS crawl_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS robots_txt_state TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hostname TEXT DEFAULT NULL;

-- Sitemaps metadata table
CREATE TABLE IF NOT EXISTS sitemaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  is_index BOOLEAN DEFAULT FALSE,
  type TEXT,
  last_submitted TIMESTAMPTZ,
  last_downloaded TIMESTAMPTZ,
  warnings BIGINT DEFAULT 0,
  errors BIGINT DEFAULT 0,
  urls_submitted BIGINT DEFAULT 0,
  urls_indexed BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, path)
);

-- RLS: users access sitemaps via site ownership
ALTER TABLE sitemaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sitemaps"
  ON sitemaps FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access on sitemaps"
  ON sitemaps FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sitemaps_site_id ON sitemaps(site_id);
