import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

app.get('/api/platforms/overview', async (req, res) => {
  try {
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
    const hours = Number(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data: listings } = await supabase
      .from('listings')
      .select(`
        *,
        platform_monitors!fk_scrape_logs_platform(platform_type)
      `)
      .gt('scraped_at', since)
      .limit(100);
    
     const gapPlatforms = ['facebook_group', 'facebook', 'university', 'studenthousing', 'telegram', 'ssh', 'xior', 'roomspot'];
     const gapListings = listings?.filter(l => gapPlatforms.includes(l.platform_monitors?.platform_type)) || [];
     
     const totalNewListings24h = listings?.length || 0;
     const gapListings24h = gapListings.length;
     const gapPercentage = totalNewListings24h > 0 
       ? (gapListings24h / totalNewListings24h) * 100 
       : 0;
     
     res.json({
       totalNewListings24h,
       gapListings24h,
       gapPercentage: Math.round(gapPercentage * 10) / 10, // Round to 1 decimal
       topGapPlatforms: [], // Can be added later if needed
       sampleGapListings: gapListings?.slice(0, 5) || []
     });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scrapes/recent', async (req, res) => {
  try {
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
