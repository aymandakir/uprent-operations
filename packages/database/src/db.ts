/**
 * Drizzle database connection
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 
  process.env.SUPABASE_DB_URL || 
  (process.env.SUPABASE_URL 
    ? `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@${process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432/postgres`
    : '');

if (!connectionString) {
  throw new Error('Missing DATABASE_URL or SUPABASE_DB_URL environment variable');
}

// Create postgres connection
const client = postgres(connectionString, {
  max: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from './schema';

