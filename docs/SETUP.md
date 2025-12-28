# Setup Guide

## Prerequisites

Before setting up the Uprent Operations monitoring system, ensure you have:

1. **Node.js 18+** and npm installed
2. **Supabase account** with a project created
3. **ScrapingBee API key** (sign up at https://www.scrapingbee.com/)
4. **OpenAI API key** (optional, for AI features - sign up at https://platform.openai.com/)

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Navigate to the project directory
cd uprent-operations

# Install all dependencies
npm install
```

### 2. Supabase Setup

1. **Create a Supabase project**:
   - Go to https://supabase.com/
   - Create a new project
   - Note your project URL and API keys

2. **Run the database schema**:
   - Open the Supabase SQL Editor
   - Copy and paste the contents of `packages/database/schema.sql`
   - Execute the SQL to create tables, indexes, and policies

3. **Verify tables**:
   - Go to Table Editor in Supabase
   - You should see three tables: `platform_monitors`, `scrape_logs`, `platform_alerts`

### 3. Environment Variables

1. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials**:
   ```env
   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # ScrapingBee
   SCRAPINGBEE_API_KEY=your-scrapingbee-key

   # OpenAI (optional)
   OPENAI_API_KEY=your-openai-key

   # Slack (optional)
   SLACK_WEBHOOK_URL=your-slack-webhook
   ```

3. **For the dashboard** (required for the monitoring UI), create `.env.local` in `apps/dashboard/`:
   ```bash
   cd apps/dashboard
   cp .env.local.example .env.local
   ```
   
   Then fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   
   **Important**: The dashboard requires `NEXT_PUBLIC_` prefixed variables to access them in the browser. After creating this file, restart your Next.js dev server.

### 4. Initialize Platform Monitors

You need to add platform monitors to the database. You can do this via:

**Option A: Supabase Dashboard**
- Go to Table Editor → `platform_monitors`
- Click "Insert row" and add:
  ```json
  {
    "name": "Funda",
    "url": "https://www.funda.nl/huur/amsterdam/",
    "selector": "[data-test-id=\"search-result-item\"]",
    "expected_min_listings": 10,
    "status": "active"
  }
  ```

**Option B: SQL**
```sql
INSERT INTO platform_monitors (name, url, selector, expected_min_listings, status)
VALUES 
  ('Funda', 'https://www.funda.nl/huur/amsterdam/', '[data-test-id="search-result-item"]', 10, 'active'),
  ('Pararius', 'https://www.pararius.com/apartments/amsterdam', '.property-list-item', 15, 'active'),
  ('Kamernet', 'https://kamernet.nl/en/for-rent/room-amsterdam', '.room-card', 20, 'active');
```

### 5. Start Development Servers

**Option A: Start all services**
```bash
npm run dev
```

**Option B: Start individually**

Terminal 1 - Dashboard:
```bash
cd apps/dashboard
npm run dev
```

Terminal 2 - Scraper Engine:
```bash
cd apps/scraper-engine
npm run dev
```

Terminal 3 - AI Analyzer:
```bash
cd apps/ai-analyzer
npm run dev
```

### 6. Verify Installation

1. **Dashboard**: Open http://localhost:3000
   - You should see the monitoring dashboard
   - If no data, you'll see empty states

2. **Scraper Engine**: Test the health endpoint
   ```bash
   curl http://localhost:3001/health
   ```

3. **AI Analyzer**: Test the health endpoint
   ```bash
   curl http://localhost:3002/health
   ```

### 7. Run Your First Scrape

**Via API**:
```bash
# Get all monitors
curl http://localhost:3001/api/monitors

# Trigger scrape for all platforms
curl -X POST http://localhost:3001/api/scrape/all
```

**Via Dashboard**:
- Navigate to http://localhost:3000/monitoring
- The dashboard will automatically fetch and display data

## Troubleshooting

### Common Issues

1. **"Missing Supabase credentials" error in dashboard**
   - This error appears when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set
   - Create `apps/dashboard/.env.local` file (copy from `.env.local.example`)
   - Add your Supabase credentials with `NEXT_PUBLIC_` prefix
   - **Restart your Next.js dev server** after creating/updating `.env.local`
   - For other services, ensure `.env` file exists in the root directory

2. **"Monitor not found"**
   - Make sure you've added platform monitors to the database
   - Check the `platform_monitors` table in Supabase

3. **Scraping fails**
   - Verify your ScrapingBee API key is correct
   - Check that the platform URLs and selectors are still valid
   - Review ScrapingBee API usage limits

4. **Dashboard shows no data**
   - Ensure Supabase RLS policies allow read access
   - Check browser console for errors
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

5. **TypeScript errors**
   - Run `npm run type-check` to see all type errors
   - Ensure all packages are installed: `npm install`

### Database Connection Issues

If you're having trouble connecting to Supabase:

1. Verify your project URL and keys in Supabase dashboard
2. Check that RLS policies are correctly set up
3. For server-side operations, use `SUPABASE_SERVICE_ROLE_KEY`
4. For client-side operations, use `SUPABASE_ANON_KEY`

### ScrapingBee Issues

If scraping is failing:

1. Check your ScrapingBee account balance
2. Verify the API key is correct
3. Test the URL manually in ScrapingBee dashboard
4. Check if the platform has changed their HTML structure (selector might be outdated)

## Next Steps

1. **Configure Monitoring Schedule**: Set up cron jobs or scheduled tasks to run scrapes automatically
2. **Set Up Alerts**: Configure Slack webhooks for real-time notifications
3. **Customize Selectors**: Update selectors if platforms change their HTML
4. **Add More Platforms**: Extend `packages/scrapers/src/platform-configs.ts` with new platforms

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in environment variables
2. Build all packages: `npm run build`
3. Use process managers like PM2 for Node.js services
4. Deploy Next.js dashboard to Vercel or similar
5. Set up proper monitoring and logging
6. Configure CI/CD pipelines
7. Set up database backups

## Support

For issues or questions:
- Check the documentation in `docs/`
- Review the architecture in `docs/ARCHITECTURE.md`
- Check TypeScript types in `packages/shared/src/types.ts`

