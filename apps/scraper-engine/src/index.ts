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
    
    // Also try to find what selectors exist
    const possibleSelectors = [
      '[data-test-id="search-result-item"]',
      '.search-result',
      '.object-list-item',
      'li[class*="search"]',
      'div[class*="listing"]',
      'li[data-test-id*="search"]',
      '[data-test-id*="result"]',
      '.object-list-item',
      'article[class*="search"]',
      'div[data-test-id]'
    ];
    
    const results = possibleSelectors.map(sel => ({
      selector: sel,
      count: $(sel).length
    }));
    
    // Find the best selector (one with most matches)
    const bestSelector = results.reduce((best, current) => 
      current.count > best.count ? current : best
    , { selector: '', count: 0 });
    
    console.log(`✅ Best selector found: "${bestSelector.selector}" with ${bestSelector.count} matches`);
    
    res.json({ 
      tested: selector,
      count,
      alternatives: results,
      bestSelector: bestSelector.count > 0 ? bestSelector : null,
      htmlLength: response.data.length,
      sampleHtml: count > 0 ? $(selector).first().html()?.substring(0, 200) : null
    });
  } catch (error) {
    console.error('❌ Test selector error:', error);
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
