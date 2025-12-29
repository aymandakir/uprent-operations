/**
 * Platform-specific scraper configurations
 */

import type { ScraperConfig } from '@uprent/shared';

/**
 * Configuration for Funda.nl rental listings
 * Updated 2025: Multiple selector fallbacks for reliability
 * Test order: Try each selector until one finds 400+ listings
 */
export const fundaConfig: ScraperConfig = {
  name: 'Funda',
  url: 'https://www.funda.nl/huur/amsterdam/',
  selector: '.search-result, [data-test-id*="search-result"], [data-test-id="search-result-item"], .object-list-item, li[class*="search-result"]',
  expectedMin: 400,
  options: {
    waitForSelector: '.search-result, [data-test-id*="search-result"]',
    timeout: 45000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8'
    }
  }
};

/**
 * Configuration for Pararius.nl rental listings
 * Updated 2025: Multiple selector fallbacks for reliability
 */
export const parariusConfig: ScraperConfig = {
  name: 'Pararius',
  url: 'https://www.pararius.com/apartments/amsterdam',
  selector: '.listing-search-item, .property-list-item, li[class*="listing"], section[class*="property"], [data-testid*="listing"]',
  expectedMin: 400,
  options: {
    waitForSelector: '.listing-search-item, .property-list-item',
    timeout: 45000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8'
    }
  }
};

/**
 * Configuration for Kamernet.nl rental listings
 * Updated 2025: Multiple selector fallbacks for reliability
 */
export const kamernetConfig: ScraperConfig = {
  name: 'Kamernet',
  url: 'https://kamernet.nl/en/for-rent/room-amsterdam',
  selector: '.listing-item, .room-card, div[class*="listing"], div[class*="room"], [data-testid*="listing"], [data-testid*="room"]',
  expectedMin: 250,
  options: {
    waitForSelector: '.listing-item, .room-card',
    timeout: 45000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8'
    }
  }
};

/**
 * Configuration for HuurScout.nl (competitor analysis)
 * Updated 2025: Scrape HuurScout to compare coverage
 */
export const huurscoutConfig: ScraperConfig = {
  name: 'HuurScout',
  url: 'https://huurscout.nl/amsterdam',
  selector: '.listing-item, .property-card, div[class*="listing"], div[class*="property"], article[class*="listing"], [data-testid*="listing"]',
  expectedMin: 100,
  options: {
    waitForSelector: '.listing-item, .property-card',
    timeout: 45000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8'
    }
  }
};

/**
 * All platform configurations
 */
export const platformConfigs: ScraperConfig[] = [
  fundaConfig,
  parariusConfig,
  kamernetConfig,
  huurscoutConfig
];

/**
 * Get configuration by platform name
 * @param name - Platform name
 * @returns Scraper configuration or undefined
 */
export function getConfigByName(name: string): ScraperConfig | undefined {
  return platformConfigs.find(config => config.name.toLowerCase() === name.toLowerCase());
}

