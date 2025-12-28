-- Uprent Operations Database Schema
-- Supabase PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Platform monitors table
-- Stores configuration for each rental platform to monitor
CREATE TABLE IF NOT EXISTS platform_monitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  selector TEXT NOT NULL,
  expected_min_listings INTEGER NOT NULL DEFAULT 10,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scrape logs table
-- Stores historical scrape results for each platform
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_id UUID NOT NULL REFERENCES platform_monitors(id) ON DELETE CASCADE,
  listings_found INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  html_hash VARCHAR(64),
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  response_time INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform alerts table
-- Stores alerts generated when issues are detected
CREATE TABLE IF NOT EXISTS platform_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_id UUID NOT NULL REFERENCES platform_monitors(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('no_listings', 'low_listings', 'scrape_failure', 'selector_broken')),
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_logs_platform_id ON scrape_logs(platform_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_scraped_at ON scrape_logs(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_platform_id ON platform_alerts(platform_id);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_resolved ON platform_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_created_at ON platform_alerts(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on platform_monitors
CREATE TRIGGER update_platform_monitors_updated_at
  BEFORE UPDATE ON platform_monitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE platform_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read" ON platform_monitors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read" ON scrape_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read" ON platform_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to perform all operations
CREATE POLICY "Allow service role all" ON platform_monitors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role all" ON scrape_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role all" ON platform_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

