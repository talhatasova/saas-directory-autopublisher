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

  // Title Extraction
  const rawTitle = cleanText($('title').first().text());

  // Headings
  const h1 = cleanText($('h1').first().text()) || undefined;
  const h2 = cleanText($('h2').first().text()) || undefined;

  let ogTitle: string | undefined = undefined;
  let ogDesc: string | undefined = undefined;
  let ogImage: string | undefined = undefined;
  let ogUrl: string | undefined = undefined;
  let twitterTitle: string | undefined = undefined;
  let twitterDesc: string | undefined = undefined;
  let twitterImage: string | undefined = undefined;
  let metaDesc: string | undefined = undefined;
  let metaKeywords: string | undefined = undefined;

  $('meta').each((_, el) => {
    const attribs = el.attribs || {};
    let prop = '';
    let content = '';

    for (const [k, v] of Object.entries(attribs)) {
      const kLower = k.toLowerCase();
      if (kLower === 'property' || kLower === 'name' || kLower === 'http-equiv') {
        prop = (v || '').toLowerCase();
      }
      if (kLower === 'content') {
        content = v || '';
      }
    }

    if (prop && content) {
      if (prop === 'og:title' && !ogTitle) ogTitle = cleanText(content);
      if (prop === 'og:description' && !ogDesc) ogDesc = cleanText(content);
      if ((prop === 'og:image' || prop === 'og:image:secure_url') && !ogImage) ogImage = cleanText(content);
      if (prop === 'og:url' && !ogUrl) ogUrl = cleanText(content);
      if (prop === 'twitter:title' && !twitterTitle) twitterTitle = cleanText(content);
      if (prop === 'twitter:description' && !twitterDesc) twitterDesc = cleanText(content);
      if ((prop === 'twitter:image' || prop === 'twitter:image:src') && !twitterImage) twitterImage = cleanText(content);
      if (prop === 'description' && !metaDesc) metaDesc = cleanText(content);
      if (prop === 'keywords' && !metaKeywords) metaKeywords = cleanText(content);
    }
  });

  let faviconHref: string | undefined = undefined;
  let appleTouchHref: string | undefined = undefined;
  let canonicalHref: string | undefined = undefined;

  $('link').each((_, el) => {
    const attribs = el.attribs || {};
    let rel = '';
    let href = '';
    for (const [k, v] of Object.entries(attribs)) {
      const kLower = k.toLowerCase();
      if (kLower === 'rel') rel = (v || '').toLowerCase();
      if (kLower === 'href') href = v || '';
    }

    if (rel.includes('shortcut icon') || rel === 'icon') {
      if (!faviconHref) faviconHref = href;
    }
    if (rel.includes('apple-touch-icon')) {
      if (!appleTouchHref) appleTouchHref = href;
    }
    if (rel === 'canonical') {
      if (!canonicalHref) canonicalHref = href;
    }
  });

  const canonicalUrl = canonicalHref ? resolveAbsoluteUrl(canonicalHref.trim(), baseUrl) : undefined;
  const resolvedOgUrl = resolveAbsoluteUrl(ogUrl, baseUrl);
  const resolvedOgImage = resolveAbsoluteUrl(ogImage, baseUrl);
  const resolvedTwitterImage = resolveAbsoluteUrl(twitterImage, baseUrl);

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
  if (resolvedOgImage) screenshotCandidates.push(resolvedOgImage);
  if (resolvedTwitterImage && resolvedTwitterImage !== resolvedOgImage) screenshotCandidates.push(resolvedTwitterImage);

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

  const heroImageUrl = resolvedOgImage || resolvedTwitterImage || screenshotCandidates[0];

  // Keywords
  let keywordsList: string[] | undefined = undefined;
  if (metaKeywords) {
    keywordsList = metaKeywords
      .split(',')
      .map((k) => cleanText(k))
      .filter((k) => k.length > 0);
  }

  // JSON-LD structured data
  let jsonLd: Record<string, any> | undefined = undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLd) return;
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
      // Ignore invalid JSON-LD
    }
  });

  // Body text summary
  const bodyParagraphs: string[] = [];
  $('p, article, section').slice(0, 8).each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length > 30) {
      bodyParagraphs.push(text);
    }
  });
  const rawText = bodyParagraphs.join(' ');

  const chosenTitle =
    ogTitle ||
    twitterTitle ||
    rawTitle ||
    ((jsonLd as any)?.name as string | undefined) ||
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
    ((jsonLd as any)?.description as string | undefined) ||
    bodyParagraphs.slice(0, 2).join(' ') ||
    '';

  const duration = performance.now() - startTime;

  return {
    title: chosenTitle,
    tagline: chosenTagline,
    description: chosenDescription,
    canonicalUrl,
    ogTitle,
    ogDescription: ogDesc,
    ogImage: resolvedOgImage,
    ogUrl: resolvedOgUrl,
    twitterTitle,
    twitterDescription: twitterDesc,
    twitterImage: resolvedTwitterImage,
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
