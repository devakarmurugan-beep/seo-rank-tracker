-- Add metric columns to pages table so page analytics can be read
-- directly instead of reconstructed from keyword_history at query time.
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_position NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT DEFAULT NULL;
