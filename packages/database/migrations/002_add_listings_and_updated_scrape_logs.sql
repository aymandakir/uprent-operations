-- Migration: Add listings table and update scrape_logs structure
-- Date: 2025-01-01
-- Description: Add listings table for tracking individual listings and update scrape_logs

-- Update existing scrape_logs table to match new structure
-- Add started_at and finished_at if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'scrape_logs' AND column_name = 'started_at') THEN
    ALTER TABLE scrape_logs ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'scrape_logs' AND column_name = 'finished_at') THEN
    ALTER TABLE scrape_logs ADD COLUMN finished_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES platform_monitors(id) ON DELETE SET NULL,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  price INTEGER, -- in euros (950)
  city TEXT,
  bedrooms INTEGER,
  square_meters INTEGER,
  description TEXT,
  image_url TEXT,
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add platform_type to platform_monitors if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'platform_monitors' AND column_name = 'platform_type') THEN
    ALTER TABLE platform_monitors ADD COLUMN platform_type VARCHAR(100);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_logs_platform ON scrape_logs(platform_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_started ON scrape_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_scraped ON listings(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_platform ON listings(platform_id);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_url ON listings(url);
CREATE INDEX IF NOT EXISTS idx_platform_monitors_type ON platform_monitors(platform_type);

-- RLS policies for listings
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON listings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role all" ON listings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

