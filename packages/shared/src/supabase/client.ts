import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types.js';
import { SUPABASE_DEFAULTS } from '../constants/config.constant.js';

export interface SupabaseClientOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  auth?: {
    persistSession?: boolean;
    autoRefreshToken?: boolean;
    detectSessionInUrl?: boolean;
  };
}

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Creates a strongly typed Supabase client for client-side or backend use.
 */
export function createTypedSupabaseClient(
  options: SupabaseClientOptions = {}
): TypedSupabaseClient {
  const url =
    options.supabaseUrl ||
    (typeof process !== 'undefined' && process.env?.['SUPABASE_URL']) ||
    SUPABASE_DEFAULTS.URL;

  const key =
    options.supabaseKey ||
    (typeof process !== 'undefined' && process.env?.['SUPABASE_ANON_KEY']) ||
    SUPABASE_DEFAULTS.ANON_KEY;

  return createClient<Database>(url, key, {
    auth: {
      persistSession: options.auth?.persistSession ?? true,
      autoRefreshToken: options.auth?.autoRefreshToken ?? true,
      detectSessionInUrl: options.auth?.detectSessionInUrl ?? true,
    },
  });
}

/**
 * Creates an administrative Supabase client using the service role key (backend / worker only).
 */
export function createSupabaseServiceClient(
  serviceRoleKey?: string,
  supabaseUrl?: string
): TypedSupabaseClient {
  const url =
    supabaseUrl ||
    (typeof process !== 'undefined' && process.env?.['SUPABASE_URL']) ||
    SUPABASE_DEFAULTS.URL;

  const key =
    serviceRoleKey ||
    (typeof process !== 'undefined' && process.env?.['SUPABASE_SERVICE_ROLE_KEY']) ||
    SUPABASE_DEFAULTS.ANON_KEY;

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
