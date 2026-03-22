-- Add index status tracking columns to pages table
-- for sitemap crawling + GSC URL Inspection API integration.
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'gsc',
  ADD COLUMN IF NOT EXISTS index_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS index_verdict TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS crawl_timestamp TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_inspected_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient batch inspection queries (uninspected pages first)
CREATE INDEX IF NOT EXISTS idx_pages_inspection
  ON pages (site_id, last_inspected_at ASC NULLS FIRST);
