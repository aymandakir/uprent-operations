/**
 * Calculate quality score for scrape results
 * Combines multiple metrics into a single score
 */

import { supabase, TABLES } from '@uprent/database';
import type { PlatformMonitor } from '@uprent/shared';

/**
 * Calculate quality score for a platform based on recent scrape results
 * @param platformId - Platform monitor ID
 * @returns Quality score from 0-100
 */
export async function calculateQualityScore(platformId: string): Promise<number> {
  try {
    // Fetch platform monitor
    const { data: monitor, error: monitorError } = await supabase
      .from(TABLES.PLATFORM_MONITORS)
      .select('*')
      .eq('id', platformId)
      .single();

    if (monitorError || !monitor) {
      throw new Error(`Monitor not found: ${platformId}`);
    }

    // Fetch last 24 hours of scrape logs
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: logs, error: logsError } = await supabase
      .from(TABLES.SCRAPE_LOGS)
      .select('*')
      .eq('platform_id', platformId)
      .gte('scraped_at', twentyFourHoursAgo.toISOString())
      .order('scraped_at', { ascending: false });

    if (logsError) {
      throw logsError;
    }

    if (!logs || logs.length === 0) {
      return 0; // No data = no score
    }

    // Calculate metrics
    const totalScrapes = logs.length;
    const successfulScrapes = logs.filter(log => log.success).length;
    const successRate = (successfulScrapes / totalScrapes) * 100;

    // Average listings found
    const avgListings = logs.reduce((sum, log) => sum + log.listings_found, 0) / totalScrapes;
    const listingsScore = Math.min((avgListings / monitor.expectedMinListings) * 100, 100);

    // Consistency score (variance in listings found)
    const variance = logs.reduce((sum, log) => {
      const diff = log.listings_found - avgListings;
      return sum + (diff * diff);
    }, 0) / totalScrapes;
    const consistencyScore = Math.max(100 - (variance / avgListings) * 100, 0);

    // Response time score (faster is better, max 30s)
    const avgResponseTime = logs.reduce((sum, log) => sum + (log.response_time || 0), 0) / totalScrapes;
    const responseTimeScore = Math.max(100 - (avgResponseTime / 30000) * 100, 0);

    // Weighted final score
    const finalScore = (
      successRate * 0.4 +           // 40% weight on success rate
      listingsScore * 0.3 +         // 30% weight on listings found
      consistencyScore * 0.2 +      // 20% weight on consistency
      responseTimeScore * 0.1       // 10% weight on response time
    );

    return Math.round(Math.max(0, Math.min(100, finalScore)));
  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 0;
  }
}

