/**
 * API Server - Main entry point
 * Express API for ops dashboard and reports
 */

import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { platformsRouter } from './routes/platforms';
import { scrapesRouter } from './routes/scrapes';
import { reportsRouter } from './routes/reports';
import { scrapeRouter } from './routes/scrape';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/platforms', platformsRouter);
app.use('/api/scrapes', scrapesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/scrape', scrapeRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

