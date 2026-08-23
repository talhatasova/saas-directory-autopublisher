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
    const cleanTitle = (title || 'Innovative SaaS Platform').trim();

    // Paragraph 1: Overview & Strategic Value Proposition
    const p1 = `${cleanTitle} is a modern, high-performance software platform purposefully engineered to accelerate workflows, optimize operational efficiency, and empower indie hackers, digital creators, founders, and scaling development teams.`;

    // Paragraph 2: Core Capabilities & Feature Set
    const p2 = tagline && tagline.trim().length > 0
      ? `Core Focus: ${tagline.trim().replace(/\.$/, '')}. The solution eliminates tedious manual bottlenecks and provides out-of-the-box automation, intuitive user interfaces, and granular control designed to maximize business velocity with minimal setup friction.`
      : `Key Capabilities: It delivers robust, enterprise-grade infrastructure right out of the box, featuring intuitive dashboards, actionable real-time telemetry, workflow automation, and collaborative team tools that streamline complex processes.`;

    // Paragraph 3: Architecture, Integration & Scalability
    const p3 = description && description.trim().length > 0
      ? `Architecture & Feature Highlights: ${description.trim()} Built with scalable cloud-native standards, the platform provides seamless RESTful APIs, secure data handling, lightning-fast response times, and robust modularity to support growing workloads effortlessly.`
      : `Architecture & Scalability: Built with modern cloud-native standards, the platform provides seamless RESTful APIs, secure data handling, lightning-fast response times, and robust modularity to support growing workloads effortlessly.`;

    // Paragraph 4: Strategic Fit, Keyword Alignment & Summary
    const p4 = keywords && keywords.length > 0
      ? `Strategic Fit & Use Cases: Optimized for ${keywords.slice(0, 5).join(', ')}, ${cleanTitle} stands out as a dependable, highly versatile solution that helps modern teams scale operations efficiently, maintain competitive agility, and drive tangible business outcomes.`
      : `Strategic Fit & Summary: Whether launching a new venture, automating daily operations, or expanding existing capabilities, ${cleanTitle} stands out as a dependable, highly versatile solution built for sustainable long-term success.`;

    let review = `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;

    // Deterministic safety guard ensuring >= 500 characters invariant under any edge condition
    if (review.length < 500) {
      const pFallback = `Deployment & Governance: Designed with zero-downtime scalability, international compliance protocols, and rigorous data protection standards to ensure uninterrupted enterprise reliability.`;
      review = `${review}\n\n${pFallback}`;
    }

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

    // 1. AI Tools: Strict word-boundary matching to prevent false positives with 'email', 'domain', 'container', 'daily', etc.
    if (
      /\b(ai|gpt|gpt-4|gpt-3|llm|llms|copilot|genai|openai|claude|gemini|artificial\s+intelligence|machine\s+learning|deep\s+learning|neural|nlp)\b/i.test(
        combined
      )
    ) {
      return 'AI Tools';
    }

    // 2. Developer Tools: Matches developer terms, containers, dns/domains, databases, git, code, cli
    if (
      /\b(developer|developers|devtool|devtools|code|coding|api|apis|git|github|gitlab|sdk|sdks|cli|terminal|ide|compiler|debugger|docker|kubernetes|container|containers|devops|backend|database|sql|postgres|mongodb|redis|dns|domain\s+name|domain\s+search)\b/i.test(
        combined
      )
    ) {
      return 'Developer Tools';
    }

    // 3. Finance: Matches billing, invoicing, payments, stripe, accounting, tax, payroll, bookkeeping
    if (
      /\b(finance|financial|invoice|invoicing|invoices|payment|payments|stripe|paddle|paypal|billing|accounting|bookkeeping|tax|taxes|payroll)\b/i.test(
        combined
      )
    ) {
      return 'Finance';
    }

    // 4. Analytics: Matches analytics, metrics, telemetry, churn, mrr, arr, dashboard, bi
    if (
      /\b(analytic|analytics|metric|metrics|telemetry|mrr|arr|churn|revenue|dashboard|bi|business\s+intelligence|visitor\s+tracking)\b/i.test(
        combined
      )
    ) {
      return 'Analytics';
    }

    // 5. Marketing: Matches marketing, seo, outreach, campaign, newsletter, email marketing, growth, leads
    if (
      /\b(marketing|marketer|market|seo|outreach|campaign|campaigns|lead|leads|leadgen|growth|newsletter|email|social\s+media|ad\s+campaign|conversion|funnel)\b/i.test(
        combined
      )
    ) {
      return 'Marketing';
    }

    // 6. Design Tools: Strict word-boundary matching to prevent collisions with 'quick', 'build', 'guide', etc.
    if (
      /\b(design|designer|designers|ui|ux|figma|sketch|wireframe|mockup|prototype|prototyping|css|tailwind|vector|typography|icon|icons|illustration)\b/i.test(
        combined
      )
    ) {
      return 'Design Tools';
    }

    // 7. Productivity: Matches task management, notes, workflow, docs, habits, routine, calendar
    if (
      /\b(task|tasks|todo|notes|note|workflow|workflows|doc|docs|documentation|productivity|notion|kanban|calendar|scheduling|collaboration|habit|habits|routine|routines|project\s+management)\b/i.test(
        combined
      )
    ) {
      return 'Productivity';
    }

    return 'General SaaS';
  }

  public static classifyPricing(description: string, jsonLd?: Record<string, any>): PricingModel {
    if (jsonLd?.offers) {
      const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers : [jsonLd.offers];
      const isExplicitFreemium = offers.some(
        (o: any) =>
          o &&
          typeof o === 'object' &&
          (o.category?.toLowerCase() === 'freemium' ||
            o.name?.toLowerCase() === 'freemium' ||
            o.title?.toLowerCase() === 'freemium')
      );
      if (isExplicitFreemium) return 'freemium';

      const isFreeOffer = (o: any): boolean => {
        if (!o || typeof o !== 'object') return false;
        if (o.price === 0 || o.price === '0' || o.price === '0.00' || o.price === '0.0') return true;
        if (typeof o.price === 'string') {
          const clean = o.price.trim().replace(/[$€£¥]/g, '');
          const val = parseFloat(clean);
          if (!isNaN(val) && val === 0) return true;
        }
        if (typeof o.price === 'number' && o.price === 0) return true;
        if (typeof o.priceType === 'string' && o.priceType.toLowerCase() === 'free') return true;
        if (typeof o.category === 'string' && o.category.toLowerCase() === 'free') return true;
        if (typeof o.name === 'string' && o.name.toLowerCase().includes('free')) return true;
        return false;
      };

      const isPaidOffer = (o: any): boolean => {
        if (!o || typeof o !== 'object') return false;
        if (typeof o.price === 'number' && o.price > 0) return true;
        if (typeof o.price === 'string') {
          const clean = o.price.trim().replace(/[$€£¥]/g, '');
          const val = parseFloat(clean);
          if (!isNaN(val) && val > 0) return true;
        }
        return false;
      };

      const hasFree = offers.some(isFreeOffer);
      const hasPaid = offers.some(isPaidOffer);
      if (hasFree && hasPaid) return 'freemium';
      if (hasFree && !hasPaid) return 'free';
      if (hasPaid) return 'paid';
    }

    const lower = description.toLowerCase();
    if (lower.includes('open source') || lower.includes('open-source') || lower.includes('github.com')) {
      return 'free';
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
