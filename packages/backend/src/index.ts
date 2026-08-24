import { startServer } from './server.js';

export * from './config/env.js';
export * from './config/supabase.js';
export * from './scraper/index.js';
export * from './registry/index.js';
export * from './services/index.js';
export * from './api/index.js';
export * from './server.js';

// Auto-start server when executed
startServer().catch((err) => {
  console.error('[Backend API] Failed to start server:', err);
});
