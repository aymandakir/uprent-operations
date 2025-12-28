/**
 * Scrape service - handles scraping logic and database operations
 */

import { supabase, TABLES } from '@uprent/database';
import type { PlatformMonitor, ScrapeLog } from '@uprent/shared';
import { BaseScraper } from '../scrapers/base-scraper';

/**
 * Service for managing scrapes
 */
export class ScrapeService {
  private scraper: BaseScraper;

  constructor() {
    this.scraper = new BaseScraper();
  }

  /**
   * Get all active platform monitors
   * @returns Array of platform monitors
   */
  async getActiveMonitors(): Promise<PlatformMonitor[]> {
    console.log('🔍 Fetching active monitors from database...');
    console.log('📊 Supabase client initialized:', !!supabase);
    console.log('📋 Table name:', TABLES.PLATFORM_MONITORS);

    const { data, error } = await supabase
      .from(TABLES.PLATFORM_MONITORS)
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('❌ Error fetching monitors:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Monitors found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('📝 Monitor names:', data.map(m => m.name).join(', '));
    }

    return data || [];
  }

  /**
   * Execute a scrape for a platform monitor
   * @param monitor - Platform monitor configuration
   * @returns Scrape log entry
   */
  async executeScrape(monitor: PlatformMonitor): Promise<ScrapeLog> {
    console.log(`🕷️  Scraping ${monitor.name} (${monitor.url})...`);
    
    const result = await this.scraper.scrape(
      monitor.url,
      monitor.selector,
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    console.log(`📊 Scrape result for ${monitor.name}:`, {
      success: result.success,
      listingsFound: result.listingsFound,
      responseTime: result.responseTime
    });

    // Save scrape log to database
    console.log(`💾 Saving scrape log to database for ${monitor.name}...`);
    const { data, error } = await supabase
      .from(TABLES.SCRAPE_LOGS)
      .insert({
        platform_id: monitor.id,
        listings_found: result.listingsFound,
        success: result.success,
        html_hash: result.htmlHash,
        error_message: result.error || null,
        response_time: result.responseTime
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error saving scrape log for ${monitor.name}:`, error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log(`✅ Scrape log saved for ${monitor.name} with ID:`, data?.id);

    // Check if alert should be created
    await this.checkAndCreateAlerts(monitor, result);

    return data;
  }

  /**
   * Check scrape results and create alerts if needed
   * @param monitor - Platform monitor
   * @param result - Scrape result
   */
  private async checkAndCreateAlerts(
    monitor: PlatformMonitor,
    result: { success: boolean; listingsFound: number; error?: string }
  ): Promise<void> {
    if (!result.success) {
      // Create scrape failure alert
      await supabase.from(TABLES.PLATFORM_ALERTS).insert({
        platform_id: monitor.id,
        alert_type: 'scrape_failure',
        message: `Scraping failed: ${result.error || 'Unknown error'}`,
        resolved: false
      });
      return;
    }

    if (result.listingsFound === 0) {
      // Create no listings alert
      await supabase.from(TABLES.PLATFORM_ALERTS).insert({
        platform_id: monitor.id,
        alert_type: 'no_listings',
        message: 'No listings found on the platform',
        resolved: false
      });
    } else if (result.listingsFound < monitor.expectedMinListings) {
      // Create low listings alert
      await supabase.from(TABLES.PLATFORM_ALERTS).insert({
        platform_id: monitor.id,
        alert_type: 'low_listings',
        message: `Only ${result.listingsFound} listings found, expected at least ${monitor.expectedMinListings}`,
        resolved: false
      });
    }
  }
}

