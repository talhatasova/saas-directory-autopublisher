export * from './config/env.js';
export * from './config/supabase.js';
export * from './scraper/index.js';
export * from './registry/index.js';
export * from './services/index.js';
export * from './api/index.js';
export * from './server.js';

// Auto-start if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.env.AUTO_START === 'true') {
  import('./server.js').then((m) => m.startServer());
}
