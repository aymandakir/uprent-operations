/**
 * AI Analyzer Service - Main entry point
 * Service for AI-powered scraper health analysis
 */

import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { healScraper } from './heal-scraper';
import { calculateQualityScore } from './quality-score';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Analyze and heal a scraper
 */
app.post('/api/heal/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const result = await healScraper(platformId);
    res.json(result);
  } catch (error) {
    console.error('Error healing scraper:', error);
    res.status(500).json({ 
      error: 'Failed to analyze scraper',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Calculate quality score for a platform
 */
app.get('/api/quality/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const score = await calculateQualityScore(platformId);
    res.json({ platformId, score });
  } catch (error) {
    console.error('Error calculating quality score:', error);
    res.status(500).json({ 
      error: 'Failed to calculate quality score',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 AI Analyzer running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

