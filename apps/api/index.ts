import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are missing or are placeholder values
const isPlaceholder = (value: string | undefined) => 
  !value || 
  value.includes('your_') || 
  value.includes('here') || 
  value.trim() === '';

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseKey)) {
  console.error('❌ Missing or invalid Supabase credentials.');
  console.error('   Please edit apps/api/.env and add your real Supabase credentials:');
  console.error('   SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_ANON_KEY=your-anon-key');
  console.error('');
  console.error('   The API will start but endpoints will return errors until credentials are set.');
}

// Create client only if we have valid credentials, otherwise it will be null
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseKey)) {
  try {
    // Validate URL format before creating client
    if (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client initialized');
    } else {
      console.error('❌ Invalid SUPABASE_URL format. Must start with http:// or https://');
    }
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
  }
} else {
  console.warn('⚠️  Supabase client not initialized - API endpoints will return errors');
}

app.get('/api/platforms/overview', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ 
        error: 'Supabase not configured',
        message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY in apps/api/.env'
      });
    }
    
    const { data: platforms, error } = await supabase
      .from('platform_monitors')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    // Get latest scrape and listing counts for each platform
    const platformsWithData = await Promise.all(
      (platforms || []).map(async (platform) => {
        const { data: latestScrape } = await supabase
          .from('scrape_logs')
          .select('started_at, success, listings_found, error_message')
          .eq('platform_id', platform.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const { count: listingCount } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('platform_id', platform.id);
        
        return {
          ...platform,
          lastScrape: latestScrape ? {
            startedAt: latestScrape.started_at,
            success: latestScrape.success,
            listingsFound: latestScrape.listings_found,
            error: latestScrape.error_message
          } : null,
          totalListings: listingCount || 0
        };
      })
    );
    
    // Calculate summary
    const totalPlatforms = platformsWithData.length;
    const failingPlatforms = platformsWithData.filter(
      p => p.status === 'error' || (p.lastScrape && !p.lastScrape.success)
    ).length;
    
    // Calculate average listings in last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentScrapes } = await supabase
      .from('scrape_logs')
      .select('listings_found')
      .gte('started_at', last24h);
    
    const avgListingsLast24h = recentScrapes && recentScrapes.length > 0
      ? recentScrapes.reduce((sum, s) => sum + (s.listings_found || 0), 0) / recentScrapes.length
      : 0;
    
    res.json({ 
      platforms: platformsWithData, 
      summary: {
        totalPlatforms,
        failingPlatforms,
        avgListingsLast24h: Math.round(avgListingsLast24h * 10) / 10
      }
    });
  } catch (error: any) {
    console.error('Error fetching platforms overview:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/huurscout-gap', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ 
        error: 'Supabase not configured',
        message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY in apps/api/.env'
      });
    }
    
    const hours = Number(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    // Get all listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, url, title, price, city, platform_id')
      .gte('scraped_at', since);
    
    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      throw listingsError;
    }
    
    // Get platform types for all platform IDs
    const platformIds = [...new Set((listings || []).map((l: any) => l.platform_id).filter(Boolean))];
    const { data: platforms } = await supabase
      .from('platform_monitors')
      .select('id, platform_type')
      .in('id', platformIds);
    
    // Create a map of platform_id -> platform_type
    const platformTypeMap = new Map((platforms || []).map((p: any) => [p.id, p.platform_type]));
    
    const gapPlatforms = ['facebook_group', 'facebook', 'university', 'studenthousing', 'telegram', 'ssh', 'xior', 'roomspot'];
    
    // Filter gap listings
    const gapListings = (listings || []).filter((l: any) => {
      const platformType = platformTypeMap.get(l.platform_id);
      return platformType && gapPlatforms.includes(platformType);
    });
    
    const totalNewListings24h = listings?.length || 0;
    const gapListings24h = gapListings.length;
    const gapPercentage = totalNewListings24h > 0 
      ? (gapListings24h / totalNewListings24h) * 100 
      : 0;
    
    // Group by platform type
    const gapByType: Record<string, number> = {};
    gapListings.forEach((l: any) => {
      const type = platformTypeMap.get(l.platform_id) || 'unknown';
      gapByType[type] = (gapByType[type] || 0) + 1;
    });
    
    const topGapPlatforms = Object.entries(gapByType)
      .map(([platformType, count]) => ({ platformType, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      totalNewListings24h,
      gapListings24h,
      gapPercentage: Math.round(gapPercentage * 10) / 10,
      topGapPlatforms: topGapPlatforms || [],
      sampleGapListings: gapListings.slice(0, 5).map((l: any) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        url: l.url,
        city: l.city,
        platformType: platformTypeMap.get(l.platform_id)
      })) || []
    });
  } catch (error: any) {
    console.error('Error in huurscout-gap:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate gap report',
      details: String(error)
    });
  }
});

app.get('/api/scrapes/recent', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ 
        error: 'Supabase not configured',
        message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY in apps/api/.env'
      });
    }
    
    const { data, error } = await supabase
      .from('scrape_logs')
      .select(`
        *,
        platform_monitors!fk_scrape_logs_platform(name, platform_type)
      `)
      .order('started_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scrape/batch', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ 
        error: 'Supabase not configured',
        message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY in apps/api/.env'
      });
    }
    
    const { limit = 10 } = req.body;
    
    const { data: platforms } = await supabase
      .from('platform_monitors')
      .select('id, name, url, platform_type')
      .eq('status', 'active')
      .order('expected_min_listings', { ascending: false })
      .limit(limit);
    
    // Add demo data instantly
    const now = new Date().toISOString();
    for (const platform of platforms || []) {
      await supabase.from('scrape_logs').insert({
        platform_id: platform.id,
        success: true,
        listings_found: Math.floor(Math.random() * 20) + 5,
        started_at: now
      });
      
      // Add demo listings
      await supabase.from('listings').insert(
        Array.from({ length: 5 }, () => ({
          platform_id: platform.id,
          url: `https://uprent-demo.com/${Math.random()}`,
          title: `${platform.name} - €${1500 + Math.floor(Math.random() * 1000)}`,
          price: 1500 + Math.floor(Math.random() * 1000),
          city: platform.name.includes('Amsterdam') ? 'Amsterdam' : 'Rotterdam'
        }))
      );
    }
    
    res.json({ 
      success: true, 
      scraped: platforms?.length || 0,
      message: `Demo data added for ${platforms?.length || 0} platforms - check dashboard!` 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 UPRENT API running on http://localhost:${PORT}`);
  console.log('✅ Endpoints ready: /api/rms/overview, /api/scrape/batch, /api/reports/huurscout-gap');
});
