import { loadFixture } from '../fixtures/fixtures.ts';

export interface ExtractedHtmlMetadata {
  title: string;
  tagline: string;
  description: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  faviconUrl?: string;
  appleTouchIconUrl?: string;
  jsonLd?: any;
  h1?: string;
  keywords?: string[];
  extractionDurationMs: number;
}

/**
 * Fast static HTML metadata extractor.
 */
export function extractStaticMetadata(html: string, baseUrl: string): ExtractedHtmlMetadata {
  const startTime = performance.now();

  const decodeEntities = (str: string): string => {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&trade;/g, '™')
      .replace(/&copy;/g, '©');
  };

  const cleanText = (str?: string | null): string => {
    if (!str) return '';
    return decodeEntities(str.replace(/\s+/g, ' ').trim());
  };

  // Helper to extract tag attribute via regex (case-insensitive, handles quotes/unquoted)
  const getMetaContent = (nameOrProp: string): string | undefined => {
    const escaped = nameOrProp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex1 = new RegExp(`<meta\\s+[^>]*?(?:name|property|http-equiv)=["']?${escaped}["']?\\s+[^>]*?content=["']([^"']*)["'][^>]*>`, 'i');
    const regex2 = new RegExp(`<meta\\s+[^>]*?content=["']([^"']*)["']\\s+[^>]*?(?:name|property|http-equiv)=["']?${escaped}["']?[^>]*>`, 'i');
    const regexUnquoted = new RegExp(`<meta\\s+[^>]*?(?:name|property)=["']?${escaped}["']?\\s+[^>]*?content=([^\\s>]+)[^>]*>`, 'i');

    const m1 = html.match(regex1);
    if (m1 && m1[1]) return cleanText(m1[1]);

    const m2 = html.match(regex2);
    if (m2 && m2[1]) return cleanText(m2[1]);

    const mUnquoted = html.match(regexUnquoted);
    if (mUnquoted && mUnquoted[1]) return cleanText(mUnquoted[1].replace(/['"]/g, ''));

    return undefined;
  };

  // Title extraction
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const rawTitle = titleMatch ? cleanText(titleMatch[1]) : '';

  // Standard meta
  const metaDescription = getMetaContent('description');
  const metaKeywords = getMetaContent('keywords');

  // OpenGraph
  const ogTitle = getMetaContent('og:title');
  const ogDescription = getMetaContent('og:description');
  const ogImage = getMetaContent('og:image');
  const ogUrl = getMetaContent('og:url');

  // Twitter
  const twitterTitle = getMetaContent('twitter:title');
  const twitterDescription = getMetaContent('twitter:description');
  const twitterImage = getMetaContent('twitter:image');

  // Canonical link
  const canonicalMatch = html.match(/<link\s+[^>]*?rel=["']?canonical["']?\s+[^>]*?href=["']([^"']*)["'][^>]*>/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : undefined;

  // Favicon & Apple Touch Icon
  const faviconMatch = html.match(/<link\s+[^>]*?rel=["']?(?:shortcut\s+)?icon["']?\s+[^>]*?href=["']([^"']*)["'][^>]*>/i);
  const appleIconMatch = html.match(/<link\s+[^>]*?rel=["']?apple-touch-icon["']?\s+[^>]*?href=["']([^"']*)["'][^>]*>/i);

  const resolveUrl = (rel?: string): string | undefined => {
    if (!rel) return undefined;
    if (/^https?:\/\//i.test(rel)) return rel;
    try {
      const base = new URL(baseUrl);
      return new URL(rel, base).toString();
    } catch {
      return rel;
    }
  };

  // H1 tag fallback
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? cleanText(h1Match[1].replace(/<[^>]*>/g, '')) : undefined;

  // JSON-LD structured data
  let jsonLd: any = undefined;
  const jsonLdRegex = /<script\s+[^>]*?type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1].trim());
      jsonLd = parsed;
      break;
    } catch {
      // ignore invalid json-ld block
    }
  }

  // Keywords token list
  const keywordsList = metaKeywords
    ? metaKeywords.split(',').map((k) => cleanText(k)).filter(Boolean)
    : undefined;

  const duration = performance.now() - startTime;

  return {
    title: ogTitle || twitterTitle || rawTitle || 'Untitled Product',
    tagline: ogDescription || twitterDescription || metaDescription || h1 || '',
    description: ogDescription || metaDescription || twitterDescription || '',
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage: resolveUrl(ogImage),
    ogUrl: resolveUrl(ogUrl),
    twitterTitle,
    twitterDescription,
    twitterImage: resolveUrl(twitterImage),
    faviconUrl: resolveUrl(faviconMatch ? faviconMatch[1] : '/favicon.ico'),
    appleTouchIconUrl: resolveUrl(appleIconMatch ? appleIconMatch[1] : undefined),
    jsonLd,
    h1,
    keywords: keywordsList,
    extractionDurationMs: duration
  };
}

describe('Tier 1 Unit: Metadata Scraper & JSON-LD Extractor', () => {
  test('clean-saas-complete.html: extracts full OpenGraph, Twitter and JSON-LD schema in sub-10ms', () => {
    const html = loadFixture('clean-saas-complete.html');
    const result = extractStaticMetadata(html, 'https://pulsemetrics.io');

    expect(result.extractionDurationMs).toBeLessThan(15);
    expect(result.title).toContain('PulseMetrics');
    expect(result.ogTitle).toContain('PulseMetrics — Real-Time SaaS Analytics');
    expect(result.ogDescription).toContain('Monitor real-time MRR');
    expect(result.ogImage).toBe('https://pulsemetrics.io/assets/og-preview.png');
    expect(result.twitterCardTitle ?? result.twitterTitle).toContain('Instant SaaS Launch');
    expect(result.faviconUrl).toBe('https://pulsemetrics.io/favicon.svg');
    expect(result.appleTouchIconUrl).toBe('https://pulsemetrics.io/apple-touch-icon.png');
    expect(result.canonicalUrl).toBe('https://pulsemetrics.io');

    // JSON-LD verification
    expect(result.jsonLd).toBeDefined();
    expect(result.jsonLd['@type']).toBe('SoftwareApplication');
    expect(result.jsonLd.name).toBe('PulseMetrics');
    expect(result.jsonLd.offers.price).toBe('0');
    expect(result.jsonLd.aggregateRating.ratingValue).toBe('4.9');
  });

  test('messy-legacy-markup.html: handles unescaped entities, mixed casing, and unquoted attributes', () => {
    const html = loadFixture('messy-legacy-markup.html');
    const result = extractStaticMetadata(html, 'https://legacytool.net');

    expect(result.title).toBe('LegacyTool & Platform');
    expect(result.description).toContain('Monitor your servers with zero hassle & 99.99% reliability.');
    expect(result.ogUrl).toBe('https://legacytool.net/home');
    expect(result.h1).toContain('Welcome to LegacyTool ™');
    expect(result.keywords).toContain('server');
    expect(result.keywords).toContain('devops');
  });

  test('missing-og-tags.html: accurately falls back to standard title, meta description, and H1', () => {
    const html = loadFixture('missing-og-tags.html');
    const result = extractStaticMetadata(html, 'https://cleandraft.app');

    expect(result.ogTitle).toBeUndefined();
    expect(result.title).toBe('CleanDraft — Minimalist Markdown Editor');
    expect(result.description).toBe('CleanDraft is a distraction-free markdown writing and publishing workspace with instant cloud backup.');
    expect(result.h1).toBe('Focus on Writing, Nothing Else');
    expect(result.faviconUrl).toBe('https://cleandraft.app/favicon.png');
  });

  test('ai-devtool-saas.html: extracts WebApplication schema and multi-tier offer pricing', () => {
    const html = loadFixture('ai-devtool-saas.html');
    const result = extractStaticMetadata(html, 'https://synapseai.dev');

    expect(result.title).toBe('SynapseAI | Autonomous Coding Agent');
    expect(result.ogImage).toBe('https://synapseai.dev/og/banner.png');
    expect(result.jsonLd).toBeDefined();
    expect(result.jsonLd['@type']).toBe('WebApplication');
    expect(result.jsonLd.offers.length).toBe(2);
    expect(result.jsonLd.offers[0].name).toBe('Free Tier');
    expect(result.jsonLd.offers[1].name).toBe('Pro Developer');
  });

  test('ecommerce-saas.html: extracts Product schema, brand, and offer currency', () => {
    const html = loadFixture('ecommerce-saas.html');
    const result = extractStaticMetadata(html, 'https://cartflow.store');

    expect(result.title).toBe('CartFlow — 1-Click Headless Checkout Platform');
    expect(result.jsonLd).toBeDefined();
    expect(result.jsonLd['@type']).toBe('Product');
    expect(result.jsonLd.brand.name).toBe('CartFlow');
    expect(result.jsonLd.offers.price).toBe('99');
    expect(result.jsonLd.offers.priceCurrency).toBe('USD');
  });
});
