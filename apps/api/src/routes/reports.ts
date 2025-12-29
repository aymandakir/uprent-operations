/**
 * Reports API routes
 */

import { Router } from 'express';
import { db, listings, platformMonitors } from '@uprent/database';
import { sql, gte, and, inArray } from 'drizzle-orm';

export const reportsRouter = Router();

/**
 * Platforms HuurScout likely doesn't cover
 */
const nonCompetitorTypes = [
  'facebook_group',
  'facebook',
  'university',
  'studenthousing',
  'housingnet',
  'ssh',
  'duwo',
  'xior',
  'roomspot',
  'urban_key',
  'whatsapp',
  'telegram',
  'linkedin',
  'instagram',
];

/**
 * GET /api/reports/huurscout-gap?hours=24
 * Shows listings HuurScout probably misses
 */
reportsRouter.get('/huurscout-gap', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get all new listings in the time period
    const allNewListings = await db
      .select({
        id: listings.id,
        platformId: listings.platformId,
        platformType: platformMonitors.platformType,
        url: listings.url,
        title: listings.title,
        price: listings.price,
        city: listings.city,
      })
      .from(listings)
      .leftJoin(platformMonitors, sql`${listings.platformId} = ${platformMonitors.id}`)
      .where(gte(listings.scrapedAt, since));

    const totalNewListings24h = allNewListings.length;

    // Filter gap listings (from non-competitor platforms)
    const gapListings = allNewListings.filter(
      (listing) => listing.platformType && nonCompetitorTypes.includes(listing.platformType)
    );

    const gapListings24h = gapListings.length;
    const gapPercentage = totalNewListings24h > 0 
      ? (gapListings24h / totalNewListings24h) * 100 
      : 0;

    // Group by platform type
    const gapByType = gapListings.reduce((acc, listing) => {
      const type = listing.platformType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topGapPlatforms = Object.entries(gapByType)
      .map(([platformType, count]) => ({ platformType, count }))
      .sort((a, b) => b.count - a.count);

    // Get sample gap listings (top 10)
    const sampleGapListings = gapListings
      .slice(0, 10)
      .map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        url: listing.url,
        city: listing.city,
        platformType: listing.platformType,
      }));

    res.json({
      totalNewListings24h,
      gapListings24h,
      gapPercentage: Math.round(gapPercentage * 10) / 10,
      topGapPlatforms,
      sampleGapListings,
      hours,
    });
  } catch (error) {
    console.error('Error generating HuurScout gap report:', error);
    res.status(500).json({
      error: 'Failed to generate gap report',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

