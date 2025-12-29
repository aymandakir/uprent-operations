/**
 * Scraper Engine - Main entry point
 * Express server for scraping rental platforms
 */

import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '@uprent/database';
import { ScrapeService } from './services/scrape-service';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const scrapeService = new ScrapeService();

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Debug endpoint - Fetch all monitors for debugging
 */
app.get('/api/debug/monitors', async (_req, res) => {
  try {
    console.log('🔍 DEBUG: Fetching ALL monitors (no filter)...');
    
    const { data: allMonitors, error: allError } = await supabase
      .from('platform_monitors')
      .select('*');
    
    console.log('📊 All monitors query error:', allError);
    console.log('📊 All monitors count:', allMonitors?.length);
    console.log('📊 All monitors:', allMonitors);
    
    const { data: activeMonitors, error: activeError } = await supabase
      .from('platform_monitors')
      .select('*')
      .eq('status', 'active');
    
    console.log('📊 Active monitors query error:', activeError);
    console.log('📊 Active monitors count:', activeMonitors?.length);
    console.log('📊 Active monitors:', activeMonitors);
    
    res.json({
      all: { count: allMonitors?.length || 0, data: allMonitors, error: allError },
      active: { count: activeMonitors?.length || 0, data: activeMonitors, error: activeError }
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Get all active monitors
 */
app.get('/api/monitors', async (_req, res) => {
  try {
    console.log('📡 GET /api/monitors - Fetching active monitors...');
    const monitors = await scrapeService.getActiveMonitors();
    console.log('✅ Returning', monitors.length, 'monitors');
    res.json(monitors);
  } catch (error) {
    console.error('❌ Error fetching monitors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch monitors',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Trigger scrapes for all active monitors
 * MUST come BEFORE /:platformId route!
 */
app.post('/api/scrape/all', async (_req, res) => {
  try {
    console.log('🚀 [ENDPOINT] Starting scrape for all active monitors...');
    
    const { data: monitors, error: queryError } = await supabase
      .from('platform_monitors')
      .select('*')
      .eq('status', 'active');
    
    console.log('📊 [ENDPOINT] Found monitors:', monitors?.length || 0);
    if (queryError) {
      console.error('📊 [ENDPOINT] Query error:', queryError);
    }
    
    if (!monitors || monitors.length === 0) {
      return res.status(404).json({ error: 'No active monitors found' });
    }
    
    // Execute scrapes for all monitors
    console.log('🔄 [ENDPOINT] Executing scrapes...');
    const results = await Promise.all(
      monitors.map(async (monitor) => {
        try {
          console.log(`🔄 Scraping: ${monitor.name}...`);
          const log = await scrapeService.executeScrape(monitor);
          // Database returns snake_case, but TypeScript type uses camelCase
          // Handle both formats
          const listingsFound = (log as any).listings_found ?? log.listingsFound ?? 0;
          const responseTime = (log as any).response_time ?? log.responseTime ?? 0;
          const errorMessage = (log as any).error_message ?? log.errorMessage ?? null;
          
          console.log(`✅ ${monitor.name}: ${listingsFound} listings`);
          return {
            platform: monitor.name,
            success: log.success,
            listings_found: listingsFound,
            response_time_ms: responseTime,
            error: errorMessage
          };
        } catch (error) {
          console.error(`❌ ${monitor.name} failed:`, error);
          return {
            platform: monitor.name,
            success: false,
            listings_found: 0,
            response_time_ms: 0,
            error: String(error)
          };
        }
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ [ENDPOINT] Completed: ${successCount}/${results.length} successful`);
    
    res.json({ 
      success: true,
      total: results.length,
      successful: successCount,
      results
    });
  } catch (error) {
    console.error('❌ [ENDPOINT] Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Trigger a scrape for a specific platform
 * MUST come AFTER /all route!
 */
app.post('/api/scrape/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const monitors = await scrapeService.getActiveMonitors();
    const monitor = monitors.find(m => m.id === platformId);

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const log = await scrapeService.executeScrape(monitor);
    res.json(log);
  } catch (error) {
    console.error('Error executing scrape:', error);
    res.status(500).json({ error: 'Failed to execute scrape' });
  }
});

/**
 * Test selector endpoint - Debug tool to test CSS selectors on a URL
 */
app.post('/api/test-selector', async (req, res) => {
  try {
    const { url, selector } = req.body;
    
    if (!url || !selector) {
      return res.status(400).json({ 
        error: 'Missing required fields: url and selector' 
      });
    }

    console.log(`🔍 Testing selector "${selector}" on ${url}...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const count = $(selector).length;
    
    console.log(`📊 Found ${count} elements with selector "${selector}"`);
    
    // Test the provided selector (may be comma-separated)
    const selectors = selector.split(',').map((s: string) => s.trim());
    const testedResults = selectors.map((sel: string) => ({
      selector: sel,
      count: $(sel).length,
      sampleHtml: $(sel).first().html()?.substring(0, 300) || null
    }));
    
    const bestTested = testedResults.reduce((best: { selector: string; count: number; sampleHtml: string | null }, current: { selector: string; count: number; sampleHtml: string | null }) => 
      current.count > best.count ? current : best
    , { selector: '', count: 0, sampleHtml: null });
    
    // Also try common selectors for rental platforms
    const commonSelectors = [
      // Funda patterns
      '[data-test-id="search-result-item"]',
      '[data-test-id*="search-result"]',
      '.search-result',
      '.object-list-item',
      'li[class*="search-result"]',
      'div[class*="search-result"]',
      // Pararius patterns
      '.listing-search-item',
      '.property-list-item',
      'li[class*="listing"]',
      'section[class*="property"]',
      '[data-testid*="listing"]',
      // Kamernet patterns
      '.listing-item',
      '.room-card',
      'div[class*="listing"]',
      'div[class*="room"]',
      '[data-testid*="listing"]',
      '[data-testid*="room"]',
      // Generic patterns
      'article[class*="listing"]',
      'div[data-test-id]',
      '[class*="result"]',
      '[class*="item"]'
    ];
    
    const alternativeResults = commonSelectors.map((sel: string) => ({
      selector: sel,
      count: $(sel).length
    })).filter((r: { selector: string; count: number }) => r.count > 0); // Only show selectors that found something
    
    // Sort by count descending
    alternativeResults.sort((a: { selector: string; count: number }, b: { selector: string; count: number }) => b.count - a.count);
    
    // Find the best overall selector
    const bestOverall: { selector: string; count: number } = alternativeResults.length > 0 && alternativeResults[0]
      ? alternativeResults[0] 
      : { selector: 'none', count: 0 };
    
    console.log(`📊 Tested selector "${selector}": ${bestTested.count} matches`);
    console.log(`✅ Best alternative: "${bestOverall.selector}" with ${bestOverall.count} matches`);
    
    res.json({ 
      tested: selector,
      testedResults,
      bestTested: bestTested.count > 0 ? bestTested : null,
      alternatives: alternativeResults.slice(0, 10), // Top 10
      bestOverall: bestOverall.count > 0 ? bestOverall : null,
      htmlLength: response.data.length,
      recommendation: bestOverall.count > bestTested.count 
        ? `Use "${bestOverall.selector}" instead (found ${bestOverall.count} vs ${bestTested.count})`
        : bestTested.count > 0 
          ? `Current selector works (${bestTested.count} matches)`
          : 'No listings found - selector may be broken'
    });
  } catch (error) {
    console.error('❌ Test selector error:', error);
    res.status(500).json({ 
      error: String(error),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Competitor Analysis Endpoint
 * Scrapes real platforms, UPRENT scraper, and HuurScout simultaneously
 */
app.post('/api/competitor-analysis/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const cityLower = city.toLowerCase();
    
    console.log(`🔍 [COMPETITOR] Starting analysis for ${city}...`);
    
    // Helper function to scrape a URL with a selector
    const scrapeUrl = async (url: string, selector: string, name: string) => {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8'
          },
          timeout: 45000
        });
        
        const $ = cheerio.load(response.data);
        const selectors = selector.split(',').map((s: string) => s.trim());
        
        let maxCount = 0;
        for (const sel of selectors) {
          const count = $(sel).length;
          if (count > maxCount) {
            maxCount = count;
          }
        }
        
        console.log(`✅ [COMPETITOR] ${name}: ${maxCount} listings`);
        return { count: maxCount, success: true };
      } catch (error) {
        console.error(`❌ [COMPETITOR] ${name} failed:`, error);
        return { count: 0, success: false, error: String(error) };
      }
    };
    
    // Get city-specific URLs
    const cityUrls: Record<string, { pararius: string; funda: string; huurscout: string }> = {
      amsterdam: {
        pararius: 'https://www.pararius.com/apartments/amsterdam',
        funda: 'https://www.funda.nl/huur/amsterdam/',
        huurscout: 'https://huurscout.nl/amsterdam'
      },
      rotterdam: {
        pararius: 'https://www.pararius.com/apartments/rotterdam',
        funda: 'https://www.funda.nl/huur/rotterdam/',
        huurscout: 'https://huurscout.nl/rotterdam'
      },
      utrecht: {
        pararius: 'https://www.pararius.com/apartments/utrecht',
        funda: 'https://www.funda.nl/huur/utrecht/',
        huurscout: 'https://huurscout.nl/utrecht'
      }
    };
    
    const urls = cityUrls[cityLower] || cityUrls.amsterdam;
    
    if (!urls) {
      return res.status(400).json({
        error: `City "${city}" not supported. Supported cities: amsterdam, rotterdam, utrecht`
      });
    }
    
    // 1. Scrape REAL platforms (Pararius + Funda)
    const [parariusReal, fundaReal] = await Promise.all([
      scrapeUrl(
        urls.pararius,
        '.listing-search-item, .property-list-item, li[class*="listing"], section[class*="property"]',
        'Pararius (REAL)'
      ),
      scrapeUrl(
        urls.funda,
        '.search-result, [data-test-id*="search-result"], [data-test-id="search-result-item"]',
        'Funda (REAL)'
      )
    ]);
    
    const realListings = parariusReal.count + fundaReal.count;
    
    // 2. Get UPRENT scraper results from database (latest scrape for city platforms)
    const { data: uprentMonitors } = await supabase
      .from('platform_monitors')
      .select('id, name')
      .or(`name.ilike.%${city}%,name.ilike.%${cityLower}%`)
      .eq('status', 'active');
    
    let uprentCoverage = 0;
    if (uprentMonitors && uprentMonitors.length > 0) {
      const uprentScrapes = await Promise.all(
        uprentMonitors.map(async (monitor) => {
          const { data: latestScrape } = await supabase
            .from('scrape_logs')
            .select('listings_found')
            .eq('platform_id', monitor.id)
            .eq('success', true)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return latestScrape?.listings_found || 0;
        })
      );
      uprentCoverage = uprentScrapes.reduce((sum, count) => sum + count, 0);
    }
    
    // 3. Scrape HuurScout (competitor)
    const huurscoutResult = await scrapeUrl(
      urls.huurscout,
      '.listing-item, .property-card, div[class*="listing"], article[class*="listing"]',
      'HuurScout (COMPETITOR)'
    );
    
    const huurscoutCoverage = huurscoutResult.count;
    
    // Calculate percentages
    const uprentPercent = realListings > 0 ? Math.round((uprentCoverage / realListings) * 100 * 10) / 10 : 0;
    const huurscoutPercent = realListings > 0 ? Math.round((huurscoutCoverage / realListings) * 100 * 10) / 10 : 0;
    
    // Determine winner
    const uprentAdvantage = uprentCoverage > huurscoutCoverage;
    const status = uprentAdvantage ? 'DOMINATE' : uprentCoverage === huurscoutCoverage ? 'PRICE_WAR' : 'BEHIND';
    
    const result = {
      city: cityLower,
      realListings,
      platforms: {
        pararius: parariusReal.count,
        funda: fundaReal.count
      },
      uprentCoverage,
      uprentPercent,
      huurscoutCoverage,
      huurscoutPercent,
      uprentAdvantage,
      status,
      gap: Math.abs(uprentCoverage - huurscoutCoverage),
      gapPercent: Math.round((Math.abs(uprentCoverage - huurscoutCoverage) / Math.max(uprentCoverage, huurscoutCoverage, 1)) * 100 * 10) / 10
    };
    
    console.log(`📊 [COMPETITOR] ${city}: UPRENT ${uprentCoverage} (${uprentPercent}%) vs HuurScout ${huurscoutCoverage} (${huurscoutPercent}%) - ${status}`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [COMPETITOR] Error:', error);
    res.status(500).json({
      error: String(error),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Scraper Engine running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
