/**
 * AI-powered scraper health checker
 * Uses OpenAI GPT-4o to analyze scraper issues and suggest fixes
 */

import OpenAI from 'openai';
import { supabase, TABLES } from '@uprent/database';
import type { HealthCheckResult } from '@uprent/shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyze a scraper's health using AI
 * @param platformId - Platform monitor ID
 * @returns Health check result with AI recommendations
 */
export async function healScraper(platformId: string): Promise<HealthCheckResult> {
  try {
    // Fetch platform monitor and recent scrape logs
    const { data: monitor, error: monitorError } = await supabase
      .from(TABLES.PLATFORM_MONITORS)
      .select('*')
      .eq('id', platformId)
      .single();

    if (monitorError || !monitor) {
      throw new Error(`Monitor not found: ${platformId}`);
    }

    const { data: logs, error: logsError } = await supabase
      .from(TABLES.SCRAPE_LOGS)
      .select('*')
      .eq('platform_id', platformId)
      .order('scraped_at', { ascending: false })
      .limit(10);

    if (logsError) {
      throw logsError;
    }

    // Fetch recent alerts
    const { data: alerts, error: alertsError } = await supabase
      .from(TABLES.PLATFORM_ALERTS)
      .select('*')
      .eq('platform_id', platformId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (alertsError) {
      throw alertsError;
    }

    // Prepare context for AI analysis
    const context = {
      platform: {
        name: monitor.name,
        url: monitor.url,
        selector: monitor.selector,
        expectedMin: monitor.expectedMinListings,
        status: monitor.status
      },
      recentScrapes: logs || [],
      activeAlerts: alerts || []
    };

    // Use OpenAI to analyze the scraper health
    const prompt = `You are a web scraping expert. Analyze the following scraper configuration and recent results:

Platform: ${context.platform.name}
URL: ${context.platform.url}
Selector: ${context.platform.selector}
Expected Minimum Listings: ${context.platform.expectedMin}
Status: ${context.platform.status}

Recent Scrape Results:
${JSON.stringify(context.recentScrapes, null, 2)}

Active Alerts:
${JSON.stringify(context.activeAlerts, null, 2)}

Please provide:
1. A health score from 0-100
2. List of issues found
3. Specific recommendations to fix the issues
4. Whether the selector might be broken or outdated

Respond in JSON format:
{
  "score": number,
  "issues": string[],
  "recommendations": string[],
  "selectorBroken": boolean
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a web scraping expert that helps diagnose and fix scraper issues. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');

    const result: HealthCheckResult = {
      platformId,
      healthy: analysis.score >= 70,
      score: analysis.score || 0,
      issues: analysis.issues || [],
      recommendations: analysis.recommendations || []
    };

    return result;
  } catch (error) {
    console.error('Error in healScraper:', error);
    return {
      platformId,
      healthy: false,
      score: 0,
      issues: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      recommendations: ['Check API keys and database connection']
    };
  }
}

