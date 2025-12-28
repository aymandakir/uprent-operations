# Uprent Operations

Production-grade monitoring system for rental platform scrapers.

## Overview

This monorepo contains a comprehensive monitoring system for tracking and analyzing rental platform scrapers. It includes:

- **Dashboard**: Next.js 15 monitoring dashboard with real-time visualizations
- **Scraper Engine**: Node.js service for executing scrapes across multiple platforms
- **AI Analyzer**: AI-powered health checker using OpenAI GPT-4o
- **Database**: Supabase schemas and migrations for data persistence
- **Scrapers**: Platform-specific configurations (Funda, Pararius, Kamernet)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Monitoring Dashboard                     │
│                    (Next.js 15 App Router)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Real-time   │  │   Charts &   │  │    Alerts    │     │
│  │  Monitoring  │  │  Analytics   │  │  Management  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Database                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Monitors   │  │ Scrape Logs  │  │   Alerts     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
         │                              │
┌────────┴────────┐          ┌─────────┴──────────┐
│ Scraper Engine  │          │   AI Analyzer      │
│  (Node.js)      │          │   (Node.js)        │
│                 │          │                    │
│ ┌────────────┐  │          │ ┌──────────────┐  │
│ │  Scrapers  │  │          │ │ Health Check │  │
│ │  (Funda,   │  │          │ │ Quality Score│  │
│ │ Pararius,  │  │          │ │ GPT-4o AI    │  │
│ │ Kamernet)  │  │          │ └──────────────┘  │
│ └────────────┘  │          └────────────────────┘
└─────────────────┘
         │
         │ ScrapingBee API
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Rental Platforms (Funda, etc.)                  │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Monorepo**: Turborepo
- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Scraping**: ScrapingBee API
- **AI**: OpenAI GPT-4o
- **Visualization**: Recharts

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- ScrapingBee API key
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
- `SCRAPINGBEE_API_KEY` - Your ScrapingBee API key
- `OPENAI_API_KEY` - Your OpenAI API key (for AI analyzer)

3. **Set up the database:**

Run the SQL schema in `packages/database/schema.sql` in your Supabase SQL editor.

4. **Start development servers:**

```bash
# Start all services
npm run dev

# Or start individually:
# Dashboard (port 3000)
cd apps/dashboard && npm run dev

# Scraper Engine (port 3001)
cd apps/scraper-engine && npm run dev

# AI Analyzer (port 3002)
cd apps/ai-analyzer && npm run dev
```

5. **Access the dashboard:**

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
uprent-operations/
├── apps/
│   ├── dashboard/              # Next.js monitoring dashboard
│   ├── scraper-engine/         # Node.js scraper service
│   └── ai-analyzer/            # AI health checker service
├── packages/
│   ├── database/               # Supabase schemas & migrations
│   ├── scrapers/               # Platform-specific scraper configs
│   ├── shared/                 # Shared utilities & types
│   └── tsconfig/               # Shared TypeScript configs
├── automations/
│   └── make-scenarios/         # Make.com workflow exports
├── docs/
│   ├── ARCHITECTURE.md
│   └── SETUP.md
└── README.md
```

## Available Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all packages and apps
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages
- `npm run clean` - Clean all build artifacts

## API Endpoints

### Scraper Engine (port 3001)

- `GET /health` - Health check
- `GET /api/monitors` - Get all active monitors
- `POST /api/scrape/:platformId` - Trigger scrape for specific platform
- `POST /api/scrape/all` - Trigger scrapes for all active platforms

### AI Analyzer (port 3002)

- `GET /health` - Health check
- `POST /api/heal/:platformId` - Analyze and heal a scraper
- `GET /api/quality/:platformId` - Get quality score for a platform

## Platform Configurations

The system supports monitoring multiple rental platforms:

- **Funda.nl**: `packages/scrapers/src/platform-configs.ts`
- **Pararius.nl**: `packages/scrapers/src/platform-configs.ts`
- **Kamernet.nl**: `packages/scrapers/src/platform-configs.ts`

Add new platforms by extending the `ScraperConfig` interface and adding configurations.

## Monitoring Features

- Real-time scrape monitoring
- Historical data visualization
- Alert management
- Quality scoring
- AI-powered health analysis
- Platform comparison charts

## Development

This is a Turborepo monorepo. Each package and app can be developed independently:

```bash
# Work on a specific package
cd packages/shared
npm run type-check

# Work on the dashboard
cd apps/dashboard
npm run dev
```

## License

Private - Uprent Operations

