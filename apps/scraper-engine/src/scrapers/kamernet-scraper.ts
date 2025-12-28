/**
 * Kamernet.nl scraper implementation
 */

import { BaseScraper } from './base-scraper';
import { kamernetConfig } from '@uprent/scrapers';
import type { ScrapeResult } from '@uprent/shared';

/**
 * Kamernet platform scraper
 */
export class KamernetScraper extends BaseScraper {
  /**
   * Scrape Kamernet listings
   * @returns Scrape result
   */
  async scrapeListings(): Promise<ScrapeResult> {
    return this.scrape(
      kamernetConfig.url,
      kamernetConfig.selector,
      kamernetConfig.options
    );
  }
}

