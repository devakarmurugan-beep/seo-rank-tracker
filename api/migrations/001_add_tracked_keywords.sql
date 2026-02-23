-- Migration: Add tracked keyword support
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Add is_tracked flag to mark keywords users want to monitor daily
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS is_tracked boolean DEFAULT false;

-- Add expected_url for the target page a keyword should rank for  
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS expected_url text;

-- Create index for fast filtering of tracked keywords
CREATE INDEX IF NOT EXISTS idx_keywords_tracked ON keywords (site_id, is_tracked) WHERE is_tracked = true;
