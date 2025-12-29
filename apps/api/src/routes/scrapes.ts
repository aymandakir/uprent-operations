/**
 * Scrapes API routes
 */

import { Router } from 'express';
import { db, scrapeLogs, platformMonitors } from '@uprent/database';
import { desc, eq } from 'drizzle-orm';

export const scrapesRouter = Router();

/**
 * GET /api/scrapes/recent?limit=100
 * Recent scrape attempts (for debugging)
 */
scrapesRouter.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const recentScrapes = await db
      .select({
        id: scrapeLogs.id,
        platformId: scrapeLogs.platformId,
        platformName: platformMonitors.name,
        startedAt: scrapeLogs.startedAt,
        finishedAt: scrapeLogs.finishedAt,
        success: scrapeLogs.success,
        listingsFound: scrapeLogs.listingsFound,
        errorMessage: scrapeLogs.errorMessage,
        responseTime: scrapeLogs.responseTime,
      })
      .from(scrapeLogs)
      .leftJoin(platformMonitors, eq(scrapeLogs.platformId, platformMonitors.id))
      .orderBy(desc(scrapeLogs.startedAt))
      .limit(limit);

    res.json({
      scrapes: recentScrapes,
      count: recentScrapes.length,
    });
  } catch (error) {
    console.error('Error fetching recent scrapes:', error);
    res.status(500).json({
      error: 'Failed to fetch recent scrapes',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

