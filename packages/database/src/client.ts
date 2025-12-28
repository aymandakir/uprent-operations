/**
 * Supabase client setup
 */

import { createClient } from '@supabase/supabase-js';

// Support both standard and NEXT_PUBLIC_ prefixed environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_ANON_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) or SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Supabase client instance
 * Use service role key for server-side operations, anon key for client-side
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Log connection status (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔌 Supabase client initialized');
  console.log('📍 URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
  console.log('🔑 Key present:', supabaseKey ? 'Yes' : 'No');
}

/**
 * Database table names
 */
export const TABLES = {
  PLATFORM_MONITORS: 'platform_monitors',
  SCRAPE_LOGS: 'scrape_logs',
  PLATFORM_ALERTS: 'platform_alerts'
} as const;

