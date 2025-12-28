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
    const { data, error } = await supabase
      .from(TABLES.PLATFORM_MONITORS)
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching monitors:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Execute a scrape for a platform monitor
   * @param monitor - Platform monitor configuration
   * @returns Scrape log entry
   */
  async executeScrape(monitor: PlatformMonitor): Promise<ScrapeLog> {
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

    // Save scrape log to database
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
      console.error('Error saving scrape log:', error);
      throw error;
    }

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

