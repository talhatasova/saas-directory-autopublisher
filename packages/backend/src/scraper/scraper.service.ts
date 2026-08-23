import { ScrapedMetadata } from '@saas-autopublisher/shared';
import { normalizeUrl } from './url-normalizer.js';
import { extractHtmlMetadata } from './metadata-extractor.js';
import { CopyGeneratorEngine } from './copy-generator.js';
import { config } from '../config/env.js';

export class ScraperService {
  private timeoutMs: number;

  constructor(timeoutMs?: number) {
    this.timeoutMs = timeoutMs ?? config.scraperTimeoutMs;
  }

  /**
   * Scrapes a live SaaS URL and enriches product metadata within the sub-3s SLA.
   */
  public async extract(targetUrl: string): Promise<ScrapedMetadata> {
    const startTime = performance.now();
    const normalized = normalizeUrl(targetUrl);

    let html = '';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(normalized, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (SaaS-AutoPublisher-Bot/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${normalized}: HTTP status ${response.status} ${response.statusText}`);
      }

      html = await response.text();
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`Scraper timeout: Extraction exceeded ${this.timeoutMs}ms limit for ${normalized}`);
      }
      throw new Error(`Scraper request failed: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    return this.extractFromHtml(html, normalized, startTime);
  }

  /**
   * Parses and enriches raw HTML content directly.
   */
  public extractFromHtml(html: string, baseUrl: string, customStartTime?: number): ScrapedMetadata {
    const startTime = customStartTime ?? performance.now();
    const raw = extractHtmlMetadata(html, baseUrl);

    const enriched = CopyGeneratorEngine.generate({
      title: raw.title,
      tagline: raw.tagline,
      description: raw.description,
      jsonLd: raw.jsonLd,
      keywords: raw.keywords,
      rawText: raw.rawText,
    });

    const elapsed = Math.round(performance.now() - startTime);

    const logoCandidate = raw.appleTouchIconUrl || raw.faviconUrl || raw.ogImage;

    return {
      url: baseUrl,
      name: raw.title,
      tagline: enriched.shortPitch,
      description: enriched.summary,
      shortDescription: enriched.shortPitch,
      descriptionPitch80: enriched.shortPitch,
      descriptionSummary250: enriched.summary,
      descriptionReview500: enriched.detailedReview,
      category: enriched.category,
      tags: enriched.tags,
      pricingModel: enriched.pricingModel,
      logoUrl: logoCandidate,
      faviconUrl: raw.faviconUrl,
      heroImageUrl: raw.heroImageUrl || raw.ogImage,
      screenshotUrls: raw.screenshotUrls,
      metadata: {
        ogTitle: raw.ogTitle,
        ogDescription: raw.ogDescription,
        ogImage: raw.ogImage,
        twitterCard: raw.twitterDescription,
        jsonLd: raw.jsonLd,
        extractedAt: new Date().toISOString(),
        extractedPitch80: enriched.shortPitch,
        extractedSummary250: enriched.summary,
        extractedReview500: enriched.detailedReview,
      },
      extractionTimeMs: elapsed,
    };
  }
}

export const scraperService = new ScraperService();
