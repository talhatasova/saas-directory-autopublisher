import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  corsOrigin: string;
  scraperTimeoutMs: number;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl:
    process.env.SUPABASE_URL ||
    'https://qxakcsdaixzfttlcmnch.supabase.co',
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWtjc2RhaXh6ZnR0bGNtbmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDc3NTUsImV4cCI6MjEwMzA4Mzc1NX0.-ZrZQubMRtse3xJTIlP_a9wDI6Kf4rKfDlV_W5GS420',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  scraperTimeoutMs: parseInt(process.env.SCRAPER_TIMEOUT_MS || '3000', 10),
};
