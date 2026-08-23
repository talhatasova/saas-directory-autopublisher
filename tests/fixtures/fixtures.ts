import * as fs from 'node:fs';
import * as path from 'node:path';

export const FIXTURES_DIR = path.resolve(__dirname);

export type FixtureName =
  | 'clean-saas-complete.html'
  | 'spa-shell-minimal.html'
  | 'messy-legacy-markup.html'
  | 'missing-og-tags.html'
  | 'ai-devtool-saas.html'
  | 'ecommerce-saas.html';

/**
 * Loads a fixture file's raw content as a UTF-8 string.
 */
export function loadFixture(name: FixtureName): string {
  const filePath = path.join(FIXTURES_DIR, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Returns the absolute file path to a fixture file.
 */
export function getFixturePath(name: FixtureName): string {
  return path.join(FIXTURES_DIR, name);
}

/**
 * Returns mock SaaS project payload for testing directory submitters.
 */
export function getSampleProjectData() {
  return {
    id: 'proj-sample-001',
    name: 'PulseMetrics',
    url: 'https://pulsemetrics.io',
    tagline: 'Real-time SaaS analytics and automated directory auto-publisher',
    description: 'PulseMetrics tracks live MRR from Stripe and publishes listings across 50+ SaaS directories in one click.',
    reviewText: 'PulseMetrics is an automated directory submission and financial intelligence engine for bootstrapped founders. It features Stripe live MRR sync, automated publishing, and backlink monitoring.',
    category: 'Developer Tools',
    tags: ['saas', 'analytics', 'directory-publisher', 'indie-hackers', 'stripe'],
    pricingModel: 'freemium' as const,
    logoUrl: 'https://pulsemetrics.io/favicon.svg',
    screenshotUrl: 'https://pulsemetrics.io/assets/hero-dashboard.png',
    contactEmail: 'founder@pulsemetrics.io'
  };
}
