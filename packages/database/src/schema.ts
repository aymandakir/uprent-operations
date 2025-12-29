/**
 * Drizzle ORM Schema
 * Database schema definitions using Drizzle ORM
 */

import { pgTable, uuid, text, integer, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Platform monitors table
 */
export const platformMonitors = pgTable('platform_monitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  url: text('url').notNull(),
  selector: text('selector').notNull(),
  expectedMinListings: integer('expected_min_listings').default(10).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  platformType: varchar('platform_type', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Scrape logs table (updated structure)
 */
export const scrapeLogs = pgTable('scrape_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformId: uuid('platform_id').references(() => platformMonitors.id, { onDelete: 'cascade' }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  success: boolean('success').default(false).notNull(),
  errorMessage: text('error_message'),
  listingsFound: integer('listings_found').default(0).notNull(),
  htmlHash: varchar('html_hash', { length: 64 }),
  responseTime: integer('response_time'), // in milliseconds
  scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Listings table
 */
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformId: uuid('platform_id').references(() => platformMonitors.id, { onDelete: 'set null' }),
  url: text('url').unique().notNull(),
  title: text('title'),
  price: integer('price'), // in euros
  city: text('city'),
  bedrooms: integer('bedrooms'),
  squareMeters: integer('square_meters'),
  description: text('description'),
  imageUrl: text('image_url'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Platform alerts table
 */
export const platformAlerts = pgTable('platform_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformId: uuid('platform_id').references(() => platformMonitors.id, { onDelete: 'cascade' }).notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  message: text('message').notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// Export types
export type PlatformMonitor = typeof platformMonitors.$inferSelect;
export type NewPlatformMonitor = typeof platformMonitors.$inferInsert;
export type ScrapeLog = typeof scrapeLogs.$inferSelect;
export type NewScrapeLog = typeof scrapeLogs.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type PlatformAlert = typeof platformAlerts.$inferSelect;
export type NewPlatformAlert = typeof platformAlerts.$inferInsert;

