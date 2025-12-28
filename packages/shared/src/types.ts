/**
 * Shared TypeScript types for the uprent-operations monorepo
 */

/**
 * Platform monitor configuration
 */
export interface PlatformMonitor {
  id: string;
  name: string;
  url: string;
  selector: string;
  expectedMinListings: number;
  status: 'active' | 'paused' | 'error';
  createdAt: string;
  updatedAt: string;
}

/**
 * Scrape log entry
 */
export interface ScrapeLog {
  id: string;
  platformId: string;
  listingsFound: number;
  success: boolean;
  htmlHash: string;
  scrapedAt: string;
  errorMessage?: string;
  responseTime?: number;
}

/**
 * Platform alert
 */
export interface PlatformAlert {
  id: string;
  platformId: string;
  alertType: 'no_listings' | 'low_listings' | 'scrape_failure' | 'selector_broken';
  message: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * Scraper configuration for a platform
 */
export interface ScraperConfig {
  name: string;
  url: string;
  selector: string;
  expectedMin: number;
  options?: {
    waitForSelector?: string;
    timeout?: number;
    headers?: Record<string, string>;
  };
}

/**
 * Scrape result
 */
export interface ScrapeResult {
  success: boolean;
  listingsFound: number;
  htmlHash: string;
  error?: string;
  responseTime: number;
  timestamp: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  platformId: string;
  healthy: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

