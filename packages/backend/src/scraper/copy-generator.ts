import { PricingModel } from '@saas-autopublisher/shared';

export interface RawMetadataInput {
  title: string;
  tagline?: string;
  description?: string;
  jsonLd?: Record<string, any>;
  keywords?: string[];
  rawText?: string;
}

export interface GeneratedCopyVariants {
  shortPitch: string;      // Max 80 characters
  summary: string;         // Max 250 characters
  detailedReview: string;  // 500+ characters structured narrative
  category: string;
  tags: string[];
  pricingModel: PricingModel;
}

export class CopyGeneratorEngine {
  public static generate(input: RawMetadataInput): GeneratedCopyVariants {
    const title = (input.title || 'Innovative SaaS Tool').trim();
    const rawTagline = (input.tagline || input.description || '').trim();
    const rawDesc = (input.description || input.rawText || rawTagline).trim();

    // 1. Short Pitch (Max 80 chars)
    const shortPitch = this.synthesizeShortPitch(title, rawTagline, rawDesc);

    // 2. Summary (Max 250 chars)
    const summary = this.synthesizeSummary(title, rawDesc);

    // 3. Detailed Review (500+ chars)
    const detailedReview = this.synthesizeDetailedReview(title, rawTagline, rawDesc, input.keywords);

    // 4. Tags / Keywords
    const tags = this.extractNormalizedTags(title, rawDesc, input.keywords);

    // 5. Category
    const category = this.classifyCategory(title, rawDesc, tags);

    // 6. Pricing Model
    const pricingModel = this.classifyPricing(rawDesc, input.jsonLd);

    return {
      shortPitch,
      summary,
      detailedReview,
      category,
      tags,
      pricingModel,
    };
  }

  private static synthesizeShortPitch(title: string, tagline: string, description: string): string {
    let source = tagline || description || `${title} - Cloud SaaS Platform`;
    // Strip common fluff prefixes
    source = source.replace(/^(Welcome to |The #1 platform for |Discover |Introducing )/i, '').trim();

    if (source.length <= 80) {
      return source;
    }

    // Word boundary truncate at 77 chars + '...'
    const truncated = source.substring(0, 77);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 40) {
      return `${truncated.substring(0, lastSpace)}...`;
    }
    return `${truncated}...`;
  }

  private static synthesizeSummary(title: string, description: string): string {
    let source = description || `${title} is a modern cloud software solution.`;
    if (source.length <= 250) {
      return source;
    }

    const truncated = source.substring(0, 247);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 180) {
      return `${truncated.substring(0, lastSpace)}...`;
    }
    return `${truncated}...`;
  }

  private static synthesizeDetailedReview(
    title: string,
    tagline: string,
    description: string,
    keywords?: string[]
  ): string {
    const p1 = `${title} is a comprehensive software platform designed to streamline workflows and boost productivity for indie hackers, founders, and modern development teams.`;
    const p2 = tagline
      ? `At its core, ${tagline.toLowerCase().replace(/\.$/, '')}. It eliminates repetitive manual effort and delivers high-impact results with minimal setup.`
      : `It delivers robust features and reliable infrastructure right out of the box.`;
    const p3 = description
      ? `Key capabilities include: ${description}`
      : `Users benefit from intuitive dashboards, real-time analytics, automated workflows, and instant collaboration features.`;
    const p4 =
      keywords && keywords.length > 0
        ? `Optimized for ${keywords.slice(0, 4).join(', ')}, ${title} represents a compelling solution for scaling operations efficiently.`
        : `${title} is engineered for seamless scalability, modern security standards, and high team velocity.`;

    const review = `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
    return review;
  }

  public static extractNormalizedTags(title: string, description: string, keywords?: string[]): string[] {
    const rawTokens: string[] = [];
    if (keywords && Array.isArray(keywords)) {
      rawTokens.push(...keywords);
    }

    const textToScan = `${title} ${description}`.toLowerCase();
    const commonTechTags = [
      'saas',
      'ai',
      'analytics',
      'automation',
      'productivity',
      'devtools',
      'marketing',
      'stripe',
      'finance',
      'developer',
      'no-code',
      'indie-hackers',
      'seo',
      'database',
      'api',
      'ecommerce',
    ];

    for (const tag of commonTechTags) {
      if (textToScan.includes(tag)) {
        rawTokens.push(tag);
      }
    }

    const cleanSet = new Set<string>();
    for (const item of rawTokens) {
      const normalized = item.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();
      if (normalized.length >= 2 && normalized.length <= 25) {
        cleanSet.add(normalized);
      }
    }

    if (cleanSet.size === 0) {
      cleanSet.add('saas');
      cleanSet.add('productivity');
    }

    return Array.from(cleanSet).slice(0, 8);
  }

  public static classifyCategory(title: string, description: string, tags: string[] = []): string {
    const combined = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
    if (
      combined.includes('ai') ||
      combined.includes('gpt') ||
      combined.includes('llm') ||
      combined.includes('copilot') ||
      combined.includes('artificial intelligence') ||
      combined.includes('machine learning')
    ) {
      return 'AI Tools';
    }
    if (
      combined.includes('developer') ||
      combined.includes('code') ||
      combined.includes('api') ||
      combined.includes('git') ||
      combined.includes('sdk') ||
      combined.includes('devtool')
    ) {
      return 'Developer Tools';
    }
    if (
      combined.includes('analytic') ||
      combined.includes('metric') ||
      combined.includes('mrr') ||
      combined.includes('revenue') ||
      combined.includes('tracking')
    ) {
      return 'Analytics';
    }
    if (
      combined.includes('market') ||
      combined.includes('seo') ||
      combined.includes('email') ||
      combined.includes('lead') ||
      combined.includes('growth')
    ) {
      return 'Marketing';
    }
    if (
      combined.includes('finance') ||
      combined.includes('invoice') ||
      combined.includes('payment') ||
      combined.includes('stripe') ||
      combined.includes('accounting')
    ) {
      return 'Finance';
    }
    if (
      combined.includes('design') ||
      combined.includes('ui') ||
      combined.includes('ux') ||
      combined.includes('figma') ||
      combined.includes('css')
    ) {
      return 'Design Tools';
    }
    if (
      combined.includes('task') ||
      combined.includes('note') ||
      combined.includes('workflow') ||
      combined.includes('doc') ||
      combined.includes('productivity')
    ) {
      return 'Productivity';
    }
    return 'General SaaS';
  }

  public static classifyPricing(description: string, jsonLd?: Record<string, any>): PricingModel {
    if (jsonLd?.offers) {
      const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers : [jsonLd.offers];
      const hasFree = offers.some(
        (o: any) => o.price === '0' || o.price === 0 || o.category?.toLowerCase() === 'freemium' || o.priceType?.toLowerCase() === 'free'
      );
      const hasPaid = offers.some((o: any) => Number(o.price) > 0 || (typeof o.price === 'string' && parseFloat(o.price) > 0));
      if (hasFree && hasPaid) return 'freemium';
      if (hasFree && !hasPaid) return 'free';
      if (hasPaid) return 'paid';
    }

    const lower = description.toLowerCase();
    if (lower.includes('open source') || lower.includes('open-source') || lower.includes('github.com')) {
      return 'open_source';
    }
    if (lower.includes('freemium') || (lower.includes('free plan') && lower.includes('pro')) || (lower.includes('free tier') && lower.includes('paid'))) {
      return 'freemium';
    }
    if (lower.includes('100% free') || lower.includes('completely free') || lower.includes('free forever')) {
      return 'free';
    }
    if (lower.includes('/month') || lower.includes('subscription') || lower.includes('per month') || lower.includes('recurring')) {
      return 'subscription';
    }
    if (lower.includes('paid') || lower.includes('one-time payment') || lower.includes('pricing starts at')) {
      return 'paid';
    }

    return 'freemium';
  }
}
