/**
 * Base scraper class with common functionality
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapeResult } from '@uprent/shared';
import { hashHtml } from '@uprent/shared';

export interface ScrapeOptions {
  waitForSelector?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Base scraper implementation
 */
export class BaseScraper {
  protected apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SCRAPINGBEE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Warning: SCRAPINGBEE_API_KEY not set. Scraping may fail.');
    }
  }

  /**
   * Scrape a URL using ScrapingBee API
   * @param url - URL to scrape
   * @param selector - CSS selector to find listings
   * @param options - Scraping options
   * @returns Scrape result
   */
  async scrape(url: string, selector: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const startTime = Date.now();
    
    try {
      // Use ScrapingBee API for reliable scraping
      const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key: this.apiKey,
          url: url,
          render_js: 'true',
          wait: options.waitForSelector ? 3000 : 0,
          wait_for: options.waitForSelector || undefined,
          timeout: options.timeout || 30000
        },
        headers: options.headers || {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: (options.timeout || 30000) + 5000
      });

      const html = response.data;
      const htmlHash = hashHtml(html);
      const $ = cheerio.load(html);
      
      // Count listings using the selector
      const listings = $(selector);
      const listingsFound = listings.length;

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        listingsFound,
        htmlHash,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Scraping failed for ${url}:`, errorMessage);
      
      return {
        success: false,
        listingsFound: 0,
        htmlHash: '',
        error: errorMessage,
        responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

