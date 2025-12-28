# Architecture Documentation

## System Overview

The Uprent Operations monitoring system is designed as a microservices architecture within a Turborepo monorepo. It provides comprehensive monitoring, alerting, and analysis capabilities for rental platform scrapers.

## Core Components

### 1. Dashboard (Next.js 15)

**Location**: `apps/dashboard`

**Purpose**: Web-based monitoring interface for viewing scraper status, historical data, and alerts.

**Key Features**:
- Real-time data visualization using Recharts
- Platform status overview
- Historical scrape logs
- Alert management interface
- Responsive design with Tailwind CSS

**Technology**:
- Next.js 15 with App Router
- React 18
- TypeScript (strict mode)
- Tailwind CSS for styling
- Recharts for data visualization
- Supabase client for data fetching

### 2. Scraper Engine (Node.js)

**Location**: `apps/scraper-engine`

**Purpose**: Service responsible for executing scrapes across configured rental platforms.

**Key Features**:
- RESTful API for triggering scrapes
- Platform-specific scraper implementations
- ScrapingBee API integration
- Automatic alert generation
- Scrape result logging

**Technology**:
- Node.js with Express
- TypeScript
- Axios for HTTP requests
- Cheerio for HTML parsing
- ScrapingBee API for reliable scraping

**Architecture**:
```
scraper-engine/
├── src/
│   ├── index.ts              # Express server
│   ├── scrapers/
│   │   ├── base-scraper.ts   # Base scraper class
│   │   ├── funda-scraper.ts  # Funda implementation
│   │   ├── pararius-scraper.ts
│   │   └── kamernet-scraper.ts
│   └── services/
│       └── scrape-service.ts  # Business logic
```

### 3. AI Analyzer (Node.js)

**Location**: `apps/ai-analyzer`

**Purpose**: AI-powered service for analyzing scraper health and providing recommendations.

**Key Features**:
- GPT-4o integration for intelligent analysis
- Health scoring algorithm
- Quality metrics calculation
- Automated issue detection
- Recommendation generation

**Technology**:
- Node.js with Express
- TypeScript
- OpenAI SDK (GPT-4o)
- Custom scoring algorithms

**Architecture**:
```
ai-analyzer/
├── src/
│   ├── index.ts              # Express server
│   ├── heal-scraper.ts       # AI health analysis
│   └── quality-score.ts      # Quality scoring
```

### 4. Database Package

**Location**: `packages/database`

**Purpose**: Database schema, migrations, and Supabase client setup.

**Schema**:
- `platform_monitors`: Platform configurations
- `scrape_logs`: Historical scrape results
- `platform_alerts`: Generated alerts

**Features**:
- Row Level Security (RLS) policies
- Automatic timestamp updates
- Indexed queries for performance
- Foreign key relationships

### 5. Scrapers Package

**Location**: `packages/scrapers`

**Purpose**: Platform-specific scraper configurations.

**Supported Platforms**:
- Funda.nl
- Pararius.nl
- Kamernet.nl

**Configuration Structure**:
```typescript
{
  name: string;
  url: string;
  selector: string;
  expectedMin: number;
  options?: {
    waitForSelector?: string;
    timeout?: number;
    headers?: Record<string, string>;
  };
}
```

### 6. Shared Package

**Location**: `packages/shared`

**Purpose**: Shared TypeScript types and utility functions used across all packages.

**Contents**:
- Type definitions (PlatformMonitor, ScrapeLog, etc.)
- Utility functions (hashing, date formatting, retry logic)

## Data Flow

### Scrape Execution Flow

1. **Trigger**: Dashboard or scheduled job triggers scrape via Scraper Engine API
2. **Configuration**: Scraper Engine fetches platform monitor configuration from database
3. **Scraping**: Scraper Engine calls ScrapingBee API with platform URL and selector
4. **Processing**: HTML is parsed using Cheerio to count listings
5. **Storage**: Results are logged to `scrape_logs` table
6. **Alerting**: Service checks results and creates alerts if thresholds are breached
7. **Visualization**: Dashboard fetches and displays updated data

### AI Analysis Flow

1. **Request**: Dashboard or scheduled job requests health analysis
2. **Data Collection**: AI Analyzer fetches recent scrape logs and alerts
3. **AI Analysis**: GPT-4o analyzes the data and generates recommendations
4. **Scoring**: Quality score is calculated based on multiple metrics
5. **Response**: Results are returned with health score, issues, and recommendations

## Database Schema

### platform_monitors

Stores configuration for each rental platform to monitor.

**Fields**:
- `id` (UUID): Primary key
- `name` (VARCHAR): Platform name (unique)
- `url` (TEXT): Base URL to scrape
- `selector` (TEXT): CSS selector for listings
- `expected_min_listings` (INTEGER): Minimum expected listings
- `status` (VARCHAR): 'active', 'paused', or 'error'
- `created_at`, `updated_at` (TIMESTAMP): Timestamps

### scrape_logs

Stores historical scrape results.

**Fields**:
- `id` (UUID): Primary key
- `platform_id` (UUID): Foreign key to platform_monitors
- `listings_found` (INTEGER): Number of listings found
- `success` (BOOLEAN): Whether scrape succeeded
- `html_hash` (VARCHAR): SHA-256 hash of HTML for change detection
- `scraped_at` (TIMESTAMP): When scrape was executed
- `error_message` (TEXT): Error message if failed
- `response_time` (INTEGER): Response time in milliseconds

### platform_alerts

Stores alerts generated when issues are detected.

**Fields**:
- `id` (UUID): Primary key
- `platform_id` (UUID): Foreign key to platform_monitors
- `alert_type` (VARCHAR): 'no_listings', 'low_listings', 'scrape_failure', 'selector_broken'
- `message` (TEXT): Alert message
- `resolved` (BOOLEAN): Whether alert is resolved
- `created_at`, `resolved_at` (TIMESTAMP): Timestamps

## Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Service Role Key**: Used for server-side operations
- **Anon Key**: Used for client-side dashboard queries
- **Environment Variables**: Sensitive keys stored in `.env` files

## Scalability Considerations

- **Stateless Services**: All services are stateless and can be horizontally scaled
- **Database Indexing**: Key fields are indexed for performance
- **Caching**: Consider adding Redis for frequently accessed data
- **Rate Limiting**: ScrapingBee API handles rate limiting
- **Error Handling**: Comprehensive error handling and retry logic

## Future Enhancements

- Scheduled scraping via cron jobs
- Slack/email notifications
- Automated selector updates
- Multi-region support
- Advanced analytics and ML predictions
- Webhook integrations

