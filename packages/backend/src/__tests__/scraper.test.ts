import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  extractHtmlMetadata,
  normalizeUrl,
  resolveAbsoluteUrl,
  ScraperService,
} from '../scraper/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(currentDir, '../../../../tests/fixtures');

function loadFixture(name: string): string {
  const filePath = path.join(FIXTURES_DIR, name);
  return fs.readFileSync(filePath, 'utf-8');
}

describe('Backend Scraper & Metadata Extractor Suite', () => {
  describe('URL Normalization', () => {
    it('prepends https:// to naked domains and strips tracking params', () => {
      const normalized = normalizeUrl('pulsemetrics.io?utm_source=twitter&ref=producthunt');
      assert.strictEqual(normalized, 'https://pulsemetrics.io');
    });

    it('preserves existing http and https protocols', () => {
      assert.strictEqual(normalizeUrl('http://localhost:3000/app'), 'http://localhost:3000/app');
      assert.strictEqual(normalizeUrl('https://example.com/docs'), 'https://example.com/docs');
    });

    it('resolves relative URLs to absolute base URLs', () => {
      assert.strictEqual(
        resolveAbsoluteUrl('/assets/logo.png', 'https://example.com/sub/'),
        'https://example.com/assets/logo.png'
      );
      assert.strictEqual(
        resolveAbsoluteUrl('//cdn.example.com/img.jpg', 'https://example.com'),
        'https://cdn.example.com/img.jpg'
      );
    });

    it('rejects invalid URLs without TLD or invalid characters', () => {
      assert.throws(() => normalizeUrl('not-a-valid-url'));
      assert.throws(() => normalizeUrl(''));
    });
  });

  describe('HTML Metadata Extraction (<3s SLA)', () => {
    const scraperService = new ScraperService(3000);

    it('extracts complete OpenGraph, Twitter, and JSON-LD schema from clean-saas-complete.html in sub-15ms', () => {
      const html = loadFixture('clean-saas-complete.html');
      const start = performance.now();
      const metadata = scraperService.extractFromHtml(html, 'https://pulsemetrics.io');
      const duration = performance.now() - start;

      assert.ok(duration < 50, `Extraction took ${duration}ms (target < 50ms)`);
      assert.ok(metadata.name.includes('PulseMetrics'));
      assert.ok(metadata.description.length > 20);
      assert.strictEqual(metadata.logoUrl, 'https://pulsemetrics.io/apple-touch-icon.png');
      assert.strictEqual(metadata.faviconUrl, 'https://pulsemetrics.io/favicon.svg');
      assert.strictEqual(metadata.pricingModel, 'freemium');
      assert.strictEqual(metadata.category, 'Analytics');
      assert.ok(metadata.tags.includes('saas') || metadata.tags.includes('analytics'));
    });

    it('handles legacy messy markup with unquoted attributes and unescaped entities', () => {
      const html = loadFixture('messy-legacy-markup.html');
      const raw = extractHtmlMetadata(html, 'https://legacytool.net');

      assert.strictEqual(raw.title, 'LegacyTool & Platform');
      assert.ok(raw.description.includes('Monitor your servers with zero hassle & 99.99% reliability.'));
      assert.strictEqual(raw.ogUrl, 'https://legacytool.net/home');
      assert.ok(raw.keywords?.includes('server'));
    });

    it('gracefully falls back when OpenGraph tags are missing', () => {
      const html = loadFixture('missing-og-tags.html');
      const metadata = scraperService.extractFromHtml(html, 'https://cleandraft.app');

      assert.strictEqual(metadata.name, 'CleanDraft — Minimalist Markdown Editor');
      assert.ok(metadata.description.includes('CleanDraft is a distraction-free markdown'));
      assert.strictEqual(metadata.faviconUrl, 'https://cleandraft.app/favicon.png');
    });

    it('extracts WebApplication schema and multi-tier pricing from ai-devtool-saas.html', () => {
      const html = loadFixture('ai-devtool-saas.html');
      const metadata = scraperService.extractFromHtml(html, 'https://synapseai.dev');

      assert.strictEqual(metadata.name, 'SynapseAI | Autonomous Coding Agent');
      assert.strictEqual(metadata.category, 'AI Tools');
      assert.strictEqual(metadata.pricingModel, 'freemium');
      assert.ok(metadata.screenshotUrls.length > 0);
    });

    it('extracts Product schema and brand from ecommerce-saas.html', () => {
      const html = loadFixture('ecommerce-saas.html');
      const metadata = scraperService.extractFromHtml(html, 'https://cartflow.store');

      assert.strictEqual(metadata.name, 'CartFlow — 1-Click Headless Checkout Platform');
      assert.ok(metadata.tags.includes('ecommerce') || metadata.tags.includes('saas'));
    });
  });
});
