/**
 * Pararius.nl scraper implementation
 */

import { BaseScraper } from './base-scraper';
import { parariusConfig } from '@uprent/scrapers';
import type { ScrapeResult } from '@uprent/shared';

/**
 * Pararius platform scraper
 */
export class ParariusScraper extends BaseScraper {
  /**
   * Scrape Pararius listings
   * @returns Scrape result
   */
  async scrapeListings(): Promise<ScrapeResult> {
    return this.scrape(
      parariusConfig.url,
      parariusConfig.selector,
      parariusConfig.options
    );
  }
}

