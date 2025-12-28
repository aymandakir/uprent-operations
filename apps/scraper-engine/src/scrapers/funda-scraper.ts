/**
 * Funda.nl scraper implementation
 */

import { BaseScraper } from './base-scraper';
import { fundaConfig } from '@uprent/scrapers';
import type { ScrapeResult } from '@uprent/shared';

/**
 * Funda platform scraper
 */
export class FundaScraper extends BaseScraper {
  /**
   * Scrape Funda listings
   * @returns Scrape result
   */
  async scrapeListings(): Promise<ScrapeResult> {
    return this.scrape(
      fundaConfig.url,
      fundaConfig.selector,
      fundaConfig.options
    );
  }
}

