import * as cheerio from 'cheerio';
import { resolveAbsoluteUrl } from './url-normalizer.js';

export interface RawExtractedMetadata {
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
  heroImageUrl?: string;
  screenshotUrls: string[];
  jsonLd?: Record<string, any>;
  h1?: string;
  h2?: string;
  keywords?: string[];
  rawText?: string;
  extractionDurationMs: number;
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&trade;/g, '™')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#32;/g, ' ')
    .replace(/&nbsp;/g, ' ');
}

export function cleanText(str?: string | null): string {
  if (!str) return '';
  return decodeHtmlEntities(str.replace(/\s+/g, ' ').trim());
}

/**
 * Extracts raw metadata from HTML document using Cheerio and structural fallbacks.
 */
export function extractHtmlMetadata(html: string, baseUrl: string): RawExtractedMetadata {
  const startTime = performance.now();

  const $ = cheerio.load(html, {
    xml: false,
  });

  // 1. Title Extraction
  const rawTitle = cleanText($('title').first().text());
  const ogTitle = cleanText($('meta[property="og:title"]').attr('content') || $('meta[name="og:title"]').attr('content'));
  const twitterTitle = cleanText($('meta[name="twitter:title"]').attr('content') || $('meta[property="twitter:title"]').attr('content'));

  // 2. Headings
  const h1 = cleanText($('h1').first().text()) || undefined;
  const h2 = cleanText($('h2').first().text()) || undefined;

  // 3. Descriptions
  const metaDesc = cleanText(
    $('meta[name="description"]').attr('content') ||
    $('meta[name="Description"]').attr('content') ||
    $('meta[property="description"]').attr('content')
  );
  const ogDesc = cleanText($('meta[property="og:description"]').attr('content') || $('meta[name="og:description"]').attr('content'));
  const twitterDesc = cleanText($('meta[name="twitter:description"]').attr('content') || $('meta[property="twitter:description"]').attr('content'));

  // 4. Canonical & OG URL
  const canonicalHref = $('link[rel="canonical"]').attr('href');
  const canonicalUrl = canonicalHref ? resolveAbsoluteUrl(canonicalHref.trim(), baseUrl) : undefined;
  const rawOgUrl = $('meta[property="og:url"]').attr('content') || $('meta[name="og:url"]').attr('content');
  const ogUrl = resolveAbsoluteUrl(rawOgUrl, baseUrl);

  // 5. Images & Icons
  const rawOgImage = $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:secure_url"]').attr('content') ||
    $('meta[name="og:image"]').attr('content');
  const ogImage = resolveAbsoluteUrl(rawOgImage, baseUrl);

  const rawTwitterImage = $('meta[name="twitter:image"]').attr('content') ||
    $('meta[name="twitter:image:src"]').attr('content') ||
    $('meta[property="twitter:image"]').attr('content');
  const twitterImage = resolveAbsoluteUrl(rawTwitterImage, baseUrl);

  // Favicon candidates
  let faviconHref =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="alternate icon"]').attr('href');

  // Apple touch icon
  const appleTouchHref =
    $('link[rel="apple-touch-icon"]').attr('href') ||
    $('link[rel="apple-touch-icon-precomposed"]').attr('href');

  let faviconUrl = resolveAbsoluteUrl(faviconHref, baseUrl);
  const appleTouchIconUrl = resolveAbsoluteUrl(appleTouchHref, baseUrl);

  if (!faviconUrl) {
    try {
      const parsedBase = new URL(baseUrl);
      faviconUrl = `${parsedBase.protocol}//${parsedBase.host}/favicon.ico`;
    } catch {
      faviconUrl = resolveAbsoluteUrl('/favicon.ico', baseUrl);
    }
  }

  // Hero / Screenshots discovery
  const screenshotCandidates: string[] = [];
  if (ogImage) screenshotCandidates.push(ogImage);
  if (twitterImage && twitterImage !== ogImage) screenshotCandidates.push(twitterImage);

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (!src) return;
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const className = ($(el).attr('class') || '').toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();
    const srcLower = src.toLowerCase();

    if (
      srcLower.includes('hero') ||
      srcLower.includes('screenshot') ||
      srcLower.includes('preview') ||
      srcLower.includes('banner') ||
      srcLower.includes('dashboard') ||
      alt.includes('screenshot') ||
      alt.includes('preview') ||
      alt.includes('dashboard') ||
      className.includes('hero') ||
      id.includes('hero')
    ) {
      const resolved = resolveAbsoluteUrl(src, baseUrl);
      if (resolved && !screenshotCandidates.includes(resolved)) {
        screenshotCandidates.push(resolved);
      }
    }
  });

  const heroImageUrl = ogImage || twitterImage || screenshotCandidates[0];

  // 6. Keywords
  const rawMetaKeywords =
    $('meta[name="keywords"]').attr('content') ||
    $('meta[name="Keywords"]').attr('content') ||
    $('meta[name="news_keywords"]').attr('content');

  let keywordsList: string[] | undefined = undefined;
  if (rawMetaKeywords) {
    keywordsList = rawMetaKeywords
      .split(',')
      .map((k) => cleanText(k))
      .filter((k) => k.length > 0);
  }

  // 7. JSON-LD structured data
  let jsonLd: Record<string, any> | undefined = undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLd) return; // Pick first valid schema
    try {
      const rawJson = $(el).html();
      if (!rawJson) return;
      const parsed = JSON.parse(rawJson.trim());
      if (Array.isArray(parsed)) {
        const matching = parsed.find(
          (p) =>
            p['@type'] === 'SoftwareApplication' ||
            p['@type'] === 'WebApplication' ||
            p['@type'] === 'Product' ||
            p['@type'] === 'Organization'
        );
        jsonLd = matching || parsed[0];
      } else if (parsed && typeof parsed === 'object') {
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          const matching = parsed['@graph'].find(
            (p: any) =>
              p['@type'] === 'SoftwareApplication' ||
              p['@type'] === 'WebApplication' ||
              p['@type'] === 'Product' ||
              p['@type'] === 'Organization'
          );
          jsonLd = matching || parsed['@graph'][0];
        } else {
          jsonLd = parsed;
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks
    }
  });

  // 8. Body text summary for context
  const bodyParagraphs: string[] = [];
  $('p, article, section').slice(0, 8).each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length > 30) {
      bodyParagraphs.push(text);
    }
  });
  const rawText = bodyParagraphs.join(' ');

  // Determine primary title, tagline, description
  const chosenTitle =
    ogTitle ||
    twitterTitle ||
    rawTitle ||
    jsonLd?.name ||
    h1 ||
    'Untitled Product';

  const chosenTagline =
    ogDesc ||
    twitterDesc ||
    metaDesc ||
    h1 ||
    h2 ||
    bodyParagraphs[0] ||
    '';

  const chosenDescription =
    ogDesc ||
    metaDesc ||
    twitterDesc ||
    jsonLd?.description ||
    bodyParagraphs.slice(0, 2).join(' ') ||
    '';

  const duration = performance.now() - startTime;

  return {
    title: chosenTitle,
    tagline: chosenTagline,
    description: chosenDescription,
    canonicalUrl,
    ogTitle: ogTitle || undefined,
    ogDescription: ogDesc || undefined,
    ogImage,
    ogUrl,
    twitterTitle: twitterTitle || undefined,
    twitterDescription: twitterDesc || undefined,
    twitterImage,
    faviconUrl,
    appleTouchIconUrl,
    heroImageUrl,
    screenshotUrls: screenshotCandidates.slice(0, 5),
    jsonLd,
    h1,
    h2,
    keywords: keywordsList,
    rawText: rawText || undefined,
    extractionDurationMs: duration,
  };
}
