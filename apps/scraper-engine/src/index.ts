/**
 * Scraper Engine - Main entry point
 * Express server for scraping rental platforms
 */

import express from 'express';
import cors from 'cors';
import { ScrapeService } from './services/scrape-service';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const scrapeService = new ScrapeService();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Get all active monitors
 */
app.get('/api/monitors', async (req, res) => {
  try {
    const monitors = await scrapeService.getActiveMonitors();
    res.json(monitors);
  } catch (error) {
    console.error('Error fetching monitors:', error);
    res.status(500).json({ error: 'Failed to fetch monitors' });
  }
});

/**
 * Trigger a scrape for a specific platform
 */
app.post('/api/scrape/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const monitors = await scrapeService.getActiveMonitors();
    const monitor = monitors.find(m => m.id === platformId);

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const log = await scrapeService.executeScrape(monitor);
    res.json(log);
  } catch (error) {
    console.error('Error executing scrape:', error);
    res.status(500).json({ error: 'Failed to execute scrape' });
  }
});

/**
 * Trigger scrapes for all active monitors
 */
app.post('/api/scrape/all', async (req, res) => {
  try {
    const monitors = await scrapeService.getActiveMonitors();
    const results = await Promise.allSettled(
      monitors.map(monitor => scrapeService.executeScrape(monitor))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      total: monitors.length,
      successful,
      failed,
      results: results.map(r => 
        r.status === 'fulfilled' ? r.value : { error: r.reason }
      )
    });
  } catch (error) {
    console.error('Error executing scrapes:', error);
    res.status(500).json({ error: 'Failed to execute scrapes' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Scraper Engine running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

