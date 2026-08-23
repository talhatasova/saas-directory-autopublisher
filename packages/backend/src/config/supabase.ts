import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@saas-autopublisher/shared';
import { config } from './env.js';

let anonClient: SupabaseClient<Database> | null = null;
let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAnonClient(): SupabaseClient<Database> {
  if (!anonClient) {
    anonClient = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return anonClient;
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    const key = config.supabaseServiceRoleKey || config.supabaseAnonKey;
    adminClient = createClient<Database>(config.supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}

export function createSupabaseUserClient(jwt: string): SupabaseClient<Database> {
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}
