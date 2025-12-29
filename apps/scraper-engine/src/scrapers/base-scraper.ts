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
   * Scrape a URL using ScrapingBee API with fallback to direct axios
   * @param url - URL to scrape
   * @param selector - CSS selector to find listings
   * @param options - Scraping options
   * @returns Scrape result
   */
  async scrape(url: string, selector: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const startTime = Date.now();
    
    try {
      let html: string;
      
      // Try ScrapingBee first if API key is available
      if (this.apiKey) {
        try {
          console.log(`🌐 Using ScrapingBee for ${url}...`);
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
          html = response.data;
        } catch (scrapingBeeError) {
          console.warn(`⚠️  ScrapingBee failed, falling back to direct request: ${scrapingBeeError instanceof Error ? scrapingBeeError.message : String(scrapingBeeError)}`);
          // Fallback to direct axios request
          html = await this.fetchDirect(url, options);
        }
      } else {
        // No API key, use direct request
        console.log(`🌐 Using direct request for ${url} (no ScrapingBee key)...`);
        html = await this.fetchDirect(url, options);
      }

      const htmlHash = hashHtml(html);
      const $ = cheerio.load(html);
      
      // Try multiple selectors if the main one fails (comma-separated selectors)
      const selectors = selector.split(',').map(s => s.trim());
      let listingsFound = 0;
      let workingSelector = selector;
      
      for (const sel of selectors) {
        const listings = $(sel);
        const count = listings.length;
        console.log(`🔍 Testing selector "${sel}": ${count} listings found`);
        
        if (count > listingsFound) {
          listingsFound = count;
          workingSelector = sel;
        }
        
        // If we found a good number of listings, use this selector
        if (count >= 10) {
          workingSelector = sel;
          listingsFound = count;
          console.log(`✅ Using selector "${sel}" with ${count} listings`);
          break;
        }
      }

      const responseTime = Date.now() - startTime;

      console.log(`📊 Final: Found ${listingsFound} listings using selector: ${workingSelector}`);

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
      
      console.error(`❌ Scraping failed for ${url}:`, errorMessage);
      
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

  /**
   * Fetch HTML directly using axios (fallback method)
   * @param url - URL to fetch
   * @param options - Scraping options
   * @returns HTML content
   */
  private async fetchDirect(url: string, options: ScrapeOptions = {}): Promise<string> {
    const response = await axios.get(url, {
      headers: options.headers || {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: options.timeout || 30000
    });
    return response.data;
  }
}

