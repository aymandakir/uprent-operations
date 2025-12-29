/**
 * API Route: Calculate gaps between expected and actual listings
 * Includes competitor analysis (UPRENT vs HuurScout)
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const platformType = searchParams.get('platformType');
    const hours = parseInt(searchParams.get('hours') || '24');

    // Mock platform data - replace with real Supabase query
    const platforms = [
      { name: "Pararius Amsterdam", expected: 400, found: 32, gap: 368, gapPct: 92, city: "Amsterdam", type: "pararius" },
      { name: "Funda Amsterdam", expected: 500, found: 0, gap: 500, gapPct: 100, city: "Amsterdam", type: "funda" },
      { name: "Kamernet Amsterdam", expected: 300, found: 0, gap: 300, gapPct: 100, city: "Amsterdam", type: "kamernet" },
      { name: "Pararius Rotterdam", expected: 250, found: 45, gap: 205, gapPct: 82, city: "Rotterdam", type: "pararius" },
      { name: "Funda Rotterdam", expected: 350, found: 12, gap: 338, gapPct: 96.6, city: "Rotterdam", type: "funda" },
      { name: "Kamernet Rotterdam", expected: 200, found: 8, gap: 192, gapPct: 96, city: "Rotterdam", type: "kamernet" },
      { name: "Pararius Utrecht", expected: 180, found: 28, gap: 152, gapPct: 84.4, city: "Utrecht", type: "pararius" },
      { name: "Funda Utrecht", expected: 220, found: 15, gap: 205, gapPct: 93.2, city: "Utrecht", type: "funda" },
    ];

    // Apply filters
    let filteredPlatforms = platforms;
    if (city && city !== 'all') {
      filteredPlatforms = filteredPlatforms.filter(p => p.city.toLowerCase() === city.toLowerCase());
    }
    if (platformType && platformType !== 'all') {
      filteredPlatforms = filteredPlatforms.filter(p => p.type === platformType);
    }

    // Calculate totals
    const totalExpected = filteredPlatforms.reduce((sum, p) => sum + p.expected, 0);
    const totalFound = filteredPlatforms.reduce((sum, p) => sum + p.found, 0);
    const totalGap = filteredPlatforms.reduce((sum, p) => sum + p.gap, 0);
    const totalGapPercent = totalExpected > 0 ? Math.round((totalGap / totalExpected) * 100 * 10) / 10 : 0;
    const coverage = totalExpected > 0 ? Math.round(((totalFound / totalExpected) * 100) * 10) / 10 : 0;

    // Format gaps for response
    const formattedGaps = filteredPlatforms.map((p, index) => ({
      platformId: `platform-${index}`,
      platformName: p.name,
      platformType: p.type,
      city: p.city,
      expected: p.expected,
      actual: p.found,
      gap: p.gap,
      gapPercent: p.gapPct,
      coverage: p.found > 0 ? Math.round(((p.found / p.expected) * 100) * 10) / 10 : 0,
      lastScrape: new Date().toISOString(),
      success: true,
    }));

    // Sort by gap (largest first)
    const sortedGaps = formattedGaps.sort((a, b) => b.gap - a.gap);
    const topGaps = sortedGaps.slice(0, 5);

    // Generate trend data (last 7 days)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trendData.push({
        date: date.toISOString().split('T')[0],
        expected: totalExpected,
        actual: totalFound + Math.floor(Math.random() * 50),
        gap: totalGap - Math.floor(Math.random() * 20),
        gapPercent: totalGapPercent - Math.floor(Math.random() * 5),
      });
    }

    // Fetch competitor analysis for all cities
    const cities = ['amsterdam', 'rotterdam', 'utrecht'];
    const competitorAnalysis = await Promise.all(
      cities.map(async (cityName) => {
        try {
          const scraperEngineUrl = process.env.SCRAPER_ENGINE_URL || 'http://localhost:3001';
          const response = await fetch(`${scraperEngineUrl}/api/competitor-analysis/${cityName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Timeout after 60 seconds
            signal: AbortSignal.timeout(60000)
          });
          
          if (!response.ok) {
            console.error(`Failed to fetch competitor data for ${cityName}:`, response.statusText);
            return null;
          }
          
          return await response.json();
        } catch (error) {
          console.error(`Error fetching competitor data for ${cityName}:`, error);
          return null;
        }
      })
    );

    // Filter out null results
    const validCompetitorData = competitorAnalysis.filter((data): data is NonNullable<typeof data> => data !== null);

    return NextResponse.json({
      summary: {
        totalExpected,
        totalActual: totalFound,
        totalGap,
        totalGapPercent,
        coverageScore: coverage,
        newListings24h: totalFound,
        gapListings24h: totalGap,
      },
      topGaps,
      allGaps: sortedGaps,
      trendData,
      competitorAnalysis: validCompetitorData,
      filters: {
        city: city || 'all',
        platformType: platformType || 'all',
        hours,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/gaps:', error);
    return NextResponse.json(
      { 
        error: 'API error', 
        details: error?.message || String(error),
        message: 'Failed to calculate gaps'
      },
      { status: 500 }
    );
  }
}
