/**
 * Platform-specific scraper configurations
 */

import type { ScraperConfig } from '@uprent/shared';

/**
 * Configuration for Funda.nl rental listings
 */
export const fundaConfig: ScraperConfig = {
  name: 'Funda',
  url: 'https://www.funda.nl/huur/amsterdam/',
  selector: '[data-test-id="search-result-item"]',
  expectedMin: 10,
  options: {
    waitForSelector: '[data-test-id="search-result-item"]',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }
};

/**
 * Configuration for Pararius.nl rental listings
 */
export const parariusConfig: ScraperConfig = {
  name: 'Pararius',
  url: 'https://www.pararius.com/apartments/amsterdam',
  selector: '.property-list-item',
  expectedMin: 15,
  options: {
    waitForSelector: '.property-list-item',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }
};

/**
 * Configuration for Kamernet.nl rental listings
 */
export const kamernetConfig: ScraperConfig = {
  name: 'Kamernet',
  url: 'https://kamernet.nl/en/for-rent/room-amsterdam',
  selector: '.room-card',
  expectedMin: 20,
  options: {
    waitForSelector: '.room-card',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }
};

/**
 * All platform configurations
 */
export const platformConfigs: ScraperConfig[] = [
  fundaConfig,
  parariusConfig,
  kamernetConfig
];

/**
 * Get configuration by platform name
 * @param name - Platform name
 * @returns Scraper configuration or undefined
 */
export function getConfigByName(name: string): ScraperConfig | undefined {
  return platformConfigs.find(config => config.name.toLowerCase() === name.toLowerCase());
}

