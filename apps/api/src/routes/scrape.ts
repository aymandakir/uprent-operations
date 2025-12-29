/**
 * Scrape API routes
 */

import { Router } from 'express';
import { db, platformMonitors, scrapeLogs, listings } from '@uprent/database';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const scrapeRouter = Router();

/**
 * POST /api/scrape/batch
 * Batch scrape with limits (for testing without burning credits)
 */
scrapeRouter.post('/batch', async (req, res) => {
  try {
    const { limit = 5 } = req.body;

    // Get active platforms
    const activePlatforms = await db
      .select()
      .from(platformMonitors)
      .where(eq(platformMonitors.status, 'active'))
      .limit(limit);

    if (activePlatforms.length === 0) {
      return res.status(404).json({ error: 'No active platforms found' });
    }

    const results = [];

    for (const platform of activePlatforms) {
      try {
        const startTime = new Date();
        
        // TODO: Call actual scraper here
        // For now, simulate scrape
        const scrapeResult = {
          success: true,
          listingsFound: Math.floor(Math.random() * 20),
          listings: [], // Will be populated by actual scraper
        };

        const finishTime = new Date();

        // Save scrape log
        const [scrapeLog] = await db
          .insert(scrapeLogs)
          .values({
            platformId: platform.id,
            startedAt: startTime,
            finishedAt: finishTime,
            success: scrapeResult.success,
            listingsFound: scrapeResult.listingsFound,
          })
          .returning();

        // Save listings (if any)
        if (scrapeResult.listings.length > 0) {
          await db
            .insert(listings)
            .values(
              scrapeResult.listings.map((listing: any) => ({
                platformId: platform.id,
                url: listing.url,
                title: listing.title,
                price: listing.price,
                city: listing.city,
                bedrooms: listing.bedrooms,
                squareMeters: listing.squareMeters,
                description: listing.description,
                imageUrl: listing.imageUrl,
                postedAt: listing.postedAt,
              }))
            )
            .onConflictDoNothing();
        }

        results.push({
          platform: platform.name,
          success: true,
          listingsFound: scrapeResult.listingsFound,
          scrapeLogId: scrapeLog.id,
        });
      } catch (error) {
        results.push({
          platform: platform.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.json({
      success: true,
      total: activePlatforms.length,
      successful: results.filter((r) => r.success).length,
      results,
    });
  } catch (error) {
    console.error('Error in batch scrape:', error);
    res.status(500).json({
      error: 'Failed to execute batch scrape',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

