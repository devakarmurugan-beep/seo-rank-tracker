-- Migration 008: Ensure all sync upsert conflict targets have matching unique constraints.
-- Safe to re-run.

-- keyword_history upserts on (keyword_id, date, search_type, device)
ALTER TABLE public.keyword_history
  ADD COLUMN IF NOT EXISTS search_type TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS device TEXT DEFAULT 'all';

UPDATE public.keyword_history
SET search_type = COALESCE(search_type, 'web'),
    device = COALESCE(device, 'all')
WHERE search_type IS NULL OR device IS NULL;

ALTER TABLE public.keyword_history
  ALTER COLUMN search_type SET DEFAULT 'web',
  ALTER COLUMN device SET DEFAULT 'all';

ALTER TABLE public.keyword_history
  DROP CONSTRAINT IF EXISTS keyword_history_keyword_id_date_key,
  DROP CONSTRAINT IF EXISTS keyword_history_keyword_id_date_search_type_key,
  DROP CONSTRAINT IF EXISTS keyword_history_keyword_id_date_type_device_key,
  DROP CONSTRAINT IF EXISTS keyword_history_keyword_id_date_search_type_device_key;

ALTER TABLE public.keyword_history
  ADD CONSTRAINT keyword_history_keyword_id_date_search_type_device_key
  UNIQUE (keyword_id, date, search_type, device);
