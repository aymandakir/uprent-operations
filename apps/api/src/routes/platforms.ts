/**
 * Platforms API routes
 */

import { Router } from 'express';
import { db, platformMonitors, scrapeLogs, listings } from '@uprent/database';
import { desc, sql, eq, gte } from 'drizzle-orm';

export const platformsRouter = Router();

/**
 * GET /api/platforms/overview
 * Returns table data for ops dashboard
 */
platformsRouter.get('/overview', async (_req, res) => {
  try {
    // Get all platforms
    const allPlatforms = await db.select().from(platformMonitors);

    // Get latest scrape for each platform and listing counts
    const platforms = await Promise.all(
      allPlatforms.map(async (platform) => {
        // Get latest scrape
        const latestScrape = await db
          .select()
          .from(scrapeLogs)
          .where(eq(scrapeLogs.platformId, platform.id))
          .orderBy(desc(scrapeLogs.startedAt))
          .limit(1);

        // Get listing count
        const listingCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(listings)
          .where(eq(listings.platformId, platform.id));

        return {
          id: platform.id,
          name: platform.name,
          platformType: platform.platformType,
          expectedMinListings: platform.expectedMinListings,
          status: platform.status,
          lastScrape: latestScrape[0]
            ? {
                startedAt: latestScrape[0].startedAt?.toISOString() || '',
                success: latestScrape[0].success,
                listingsFound: latestScrape[0].listingsFound,
                error: latestScrape[0].errorMessage,
              }
            : null,
          totalListings: Number(listingCount[0]?.count) || 0,
        };
      })
    );

    // Sort by platform type and name
    platforms.sort((a, b) => {
      const typeCompare = (a.platformType || '').localeCompare(b.platformType || '');
      return typeCompare !== 0 ? typeCompare : a.name.localeCompare(b.name);
    });

    // Calculate summary
    const totalPlatforms = platforms.length;
    const failingPlatforms = platforms.filter(
      (p) => p.status === 'error' || (p.lastScrape && !p.lastScrape.success)
    ).length;

    // Calculate average listings in last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentScrapes = await db
      .select({
        listingsFound: scrapeLogs.listingsFound,
      })
      .from(scrapeLogs)
      .where(gte(scrapeLogs.startedAt, last24h));

    const avgListingsLast24h =
      recentScrapes.length > 0
        ? recentScrapes.reduce((sum, s) => sum + s.listingsFound, 0) / recentScrapes.length
        : 0;

    res.json({
      platforms,
      summary: {
        totalPlatforms,
        failingPlatforms,
        avgListingsLast24h: Math.round(avgListingsLast24h * 10) / 10,
      },
    });
  } catch (error) {
    console.error('Error fetching platforms overview:', error);
    res.status(500).json({
      error: 'Failed to fetch platforms overview',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

