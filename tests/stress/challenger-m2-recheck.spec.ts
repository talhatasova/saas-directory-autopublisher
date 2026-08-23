import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractHtmlMetadata,
  cleanText,
  decodeHtmlEntities,
} from '../../packages/backend/dist/scraper/metadata-extractor.js';
import {
  CopyGeneratorEngine,
  type RawMetadataInput,
} from '../../packages/backend/dist/scraper/copy-generator.js';
import { ScraperService } from '../../packages/backend/dist/scraper/scraper.service.js';

describe('CHALLENGER-M2-RECHECK: Deep Adversarial Empirical Verification Suite', () => {

  // ==========================================================================
  // SECTION 1: MINIMAL TITLE 'A', SPARSE & EXTREME BOUNDARY INPUTS
  // ==========================================================================
  describe('1. Boundary & Minimal Input Verification (Title "A", Empty, Extreme inputs)', () => {
    const minimalCases: { name: string; input: RawMetadataInput }[] = [
      { name: 'Minimal title "A"', input: { title: 'A' } },
      { name: 'Single char title, tagline, desc', input: { title: 'A', tagline: 'B', description: 'C' } },
      { name: 'Title "A" with empty tagline/desc', input: { title: 'A', tagline: '', description: '', keywords: [] } },
      { name: 'Completely empty strings', input: { title: '', tagline: '', description: '', keywords: [] } },
      { name: 'Whitespace only strings', input: { title: '   ', tagline: '\t\n ', description: '   \n' } },
      { name: 'Single digit strings', input: { title: '1', tagline: '2', description: '3' } },
      { name: 'Single emoji title', input: { title: '🚀', tagline: '', description: '' } },
      { name: 'Single CJK character', input: { title: 'あ', tagline: 'い', description: 'う' } },
      { name: 'Single Arabic character', input: { title: 'م', tagline: 'ن', description: 'ص' } },
      { name: 'Special symbols only', input: { title: '!@#$%^&*()', tagline: '<>?:;"', description: '{}|~`' } },
      { name: 'Short 3-char word', input: { title: 'Zap', tagline: 'Do tasks.', description: 'Zap is fast.' } },
      { name: 'SoloApp only title', input: { title: 'SoloApp' } },
      { name: 'Unbreakable 500-char string', input: { title: 'Unbreakable', tagline: 'X'.repeat(200), description: 'Y'.repeat(500) } },
    ];

    for (const tc of minimalCases) {
      it(`evaluates ${tc.name}: review >= 500, pitch <= 80, summary <= 250`, () => {
        const result = CopyGeneratorEngine.generate(tc.input);

        // 1. Detailed Review length invariant
        assert.ok(
          result.detailedReview.length >= 500,
          `Detailed review length (${result.detailedReview.length}) failed >= 500 chars on case "${tc.name}". Preview: "${result.detailedReview.substring(0, 100)}..."`
        );

        // 2. Short Pitch length invariant
        assert.ok(
          result.shortPitch.length <= 80,
          `Short pitch length (${result.shortPitch.length}) exceeded 80 chars on case "${tc.name}". Value: "${result.shortPitch}"`
        );

        // 3. Summary length invariant
        assert.ok(
          result.summary.length <= 250,
          `Summary length (${result.summary.length}) exceeded 250 chars on case "${tc.name}". Value: "${result.summary}"`
        );

        // 4. Content sanity
        assert.ok(!result.detailedReview.includes('undefined'), 'detailedReview contains "undefined"');
        assert.ok(!result.detailedReview.includes('null'), 'detailedReview contains "null"');
        assert.ok(!result.detailedReview.includes('[object Object]'), 'detailedReview contains "[object Object]"');
        assert.ok(!result.shortPitch.includes('undefined'), 'shortPitch contains "undefined"');
        assert.ok(!result.summary.includes('undefined'), 'summary contains "undefined"');

        // 5. Structure
        assert.ok(result.category && result.category.length > 0, 'category is empty');
        assert.ok(Array.isArray(result.tags) && result.tags.length > 0, 'tags array is empty');
        assert.ok(result.pricingModel && typeof result.pricingModel === 'string', 'pricingModel is missing');
      });
    }

    it('runs 100 randomized length fuzzing permutations and guarantees length invariants', () => {
      for (let i = 0; i < 100; i++) {
        const titleLen = Math.floor(Math.random() * 50);
        const taglineLen = Math.floor(Math.random() * 150);
        const descLen = Math.floor(Math.random() * 600);

        const title = 'T'.repeat(titleLen);
        const tagline = 'Tagline '.repeat(Math.floor(taglineLen / 8));
        const desc = 'Sentence about software. '.repeat(Math.floor(descLen / 25));

        const res = CopyGeneratorEngine.generate({ title, tagline, description: desc });
        assert.ok(
          res.detailedReview.length >= 500,
          `Fuzz iteration ${i} failed detailedReview length >= 500 (was ${res.detailedReview.length})`
        );
        assert.ok(
          res.shortPitch.length <= 80,
          `Fuzz iteration ${i} failed shortPitch <= 80 (was ${res.shortPitch.length})`
        );
        assert.ok(
          res.summary.length <= 250,
          `Fuzz iteration ${i} failed summary <= 250 (was ${res.summary.length})`
        );
      }
    });
  });

  // ==========================================================================
  // SECTION 2: SPA SHELL & MALFORMED / MINIMAL HTML SCRAPING
  // ==========================================================================
  describe('2. SPA Shells & Real Scraper Integration Tests', () => {
    const scraper = new ScraperService();

    it('extracts and enriches minimal SPA shell with title "A"', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>A</title>
        </head>
        <body>
          <div id="app"></div>
          <script src="/bundle.js"></script>
        </body>
        </html>
      `;
      const metadata = scraper.extractFromHtml(html, 'https://example-a.com');
      assert.strictEqual(metadata.name, 'A');
      assert.ok(metadata.descriptionReview500.length >= 500, `Review was ${metadata.descriptionReview500.length} chars (expected >= 500)`);
      assert.ok(metadata.descriptionPitch80.length <= 80, `Pitch was ${metadata.descriptionPitch80.length} chars`);
      assert.ok(metadata.descriptionSummary250.length <= 250, `Summary was ${metadata.descriptionSummary250.length} chars`);
      assert.strictEqual(metadata.faviconUrl, 'https://example-a.com/favicon.ico');
    });

    it('extracts and enriches empty SPA shell without title', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head></head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root"></div>
        </body>
        </html>
      `;
      const metadata = scraper.extractFromHtml(html, 'https://spa-blank.io');
      assert.ok(metadata.name && metadata.name.length > 0);
      assert.ok(metadata.descriptionReview500.length >= 500, `Review was ${metadata.descriptionReview500.length} chars (expected >= 500)`);
    });

    it('handles JSON-LD @graph containing null items and extracts valid Application schema', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Graph App</title>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              null,
              {
                "@type": "WebApplication",
                "name": "Graph App",
                "description": "Powerful cloud tool",
                "offers": {
                  "@type": "Offer",
                  "price": "0.00",
                  "priceCurrency": "USD"
                }
              },
              null
            ]
          }
          </script>
        </head>
        <body></body>
        </html>
      `;
      const metadata = scraper.extractFromHtml(html, 'https://graphapp.io');
      assert.strictEqual(metadata.name, 'Graph App');
      assert.strictEqual(metadata.pricingModel, 'free');
      assert.ok(metadata.descriptionReview500.length >= 500);
    });

    it('handles JSON-LD top-level array containing null and primitive values', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Array App</title>
          <script type="application/ld+json">
          [
            null,
            "just a string",
            123,
            {
              "@type": "SoftwareApplication",
              "name": "Array App",
              "offers": [
                { "@type": "Offer", "price": "0.00" },
                { "@type": "Offer", "price": "49.00" }
              ]
            }
          ]
          </script>
        </head>
        <body></body>
        </html>
      `;
      const metadata = scraper.extractFromHtml(html, 'https://arrayapp.io');
      assert.strictEqual(metadata.name, 'Array App');
      assert.strictEqual(metadata.pricingModel, 'freemium');
    });
  });

  // ==========================================================================
  // SECTION 3: PRICING STRINGS '0.00' & MULTI-TIER COMBINATIONS
  // ==========================================================================
  describe('3. Pricing Classification Edge Cases', () => {
    it('classifies single "0.00" decimal price string as free', () => {
      const pricing = CopyGeneratorEngine.classifyPricing('Tool', {
        offers: [{ price: '0.00' }]
      });
      assert.strictEqual(pricing, 'free');
    });

    it('classifies "$0.00" with currency symbol as free', () => {
      const pricing = CopyGeneratorEngine.classifyPricing('Tool', {
        offers: [{ price: '$0.00' }]
      });
      assert.strictEqual(pricing, 'free');
    });

    it('classifies "0.0" and "0" and numeric 0 as free', () => {
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ price: '0.0' }] }), 'free');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ price: '0' }] }), 'free');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ price: 0 }] }), 'free');
    });

    it('classifies priceType "free" or category "free" or name "Free Plan" as free', () => {
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ priceType: 'free' }] }), 'free');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ category: 'free' }] }), 'free');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ name: 'Free Starter Plan' }] }), 'free');
    });

    it('classifies multi-tier "0.00" (Free) + "29.00" (Pro) as freemium', () => {
      const pricing = CopyGeneratorEngine.classifyPricing('Tool', {
        offers: [
          { price: '0.00', name: 'Free Tier' },
          { price: '29.00', name: 'Pro Tier' }
        ]
      });
      assert.strictEqual(pricing, 'freemium');
    });

    it('classifies multi-tier 0 (numeric) + 99 (numeric) as freemium', () => {
      const pricing = CopyGeneratorEngine.classifyPricing('Tool', {
        offers: [
          { price: 0 },
          { price: 99 }
        ]
      });
      assert.strictEqual(pricing, 'freemium');
    });

    it('classifies single paid "29.00" or "$49" as paid', () => {
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ price: '29.00' }] }), 'paid');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ price: '$49.00' }] }), 'paid');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ price: 99 }] }), 'paid');
    });

    it('classifies multi-tier paid only "19.00" + "99.00" as paid', () => {
      const pricing = CopyGeneratorEngine.classifyPricing('Tool', {
        offers: [
          { price: '19.00' },
          { price: '99.00' }
        ]
      });
      assert.strictEqual(pricing, 'paid');
    });

    it('classifies explicit freemium category / name in offers as freemium', () => {
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ category: 'freemium' }] }), 'freemium');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Tool', { offers: [{ name: 'Freemium' }] }), 'freemium');
    });

    it('classifies fallback description keywords correctly', () => {
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Open source git repo on github.com'), 'free');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('100% free forever for all developers'), 'free');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Offers a free plan with pro upgrade options'), 'freemium');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Free tier available alongside paid enterprise plans'), 'freemium');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('Plans start at $29/month subscription billing'), 'subscription');
      assert.strictEqual(CopyGeneratorEngine.classifyPricing('One-time payment of $149 for lifetime access'), 'paid');
    });
  });

  // ==========================================================================
  // SECTION 4: TAXONOMY & WORD BOUNDARIES ("email", "container", "domain", "quick")
  // ==========================================================================
  describe('4. Taxonomy Classification & Word Boundary Collision Tests', () => {

    const testCases: { name: string; title: string; desc: string; tags: string[]; expected: string; forbiddenCategory?: string }[] = [
      // Cases containing 'ai' inside common non-AI words:
      {
        name: 'Word "email" (em[ai]l)',
        title: 'MailBurst',
        desc: 'Transactional email delivery and newsletter marketing campaign automation platform for startups',
        tags: ['email', 'newsletter', 'marketing'],
        expected: 'Marketing',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "container" (cont[ai]ner)',
        title: 'KubeShip',
        desc: 'Docker container cluster manager, kubernetes devops deployment runner and cli tooling',
        tags: ['docker', 'devops', 'kubernetes'],
        expected: 'Developer Tools',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "domain" (dom[ai]n)',
        title: 'DomainHunt',
        desc: 'Domain name search, dns record manager, and whois lookup devtool for engineers',
        tags: ['dns', 'domain-search', 'devtools'],
        expected: 'Developer Tools',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "daily" (d[ai]ly)',
        title: 'RoutineCraft',
        desc: 'Daily habit tracker, routine planner, and personal productivity note taking app',
        tags: ['productivity', 'habits', 'notes'],
        expected: 'Productivity',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "painless" (p[ai]nless)',
        title: 'InvoiceEasy',
        desc: 'Painless stripe invoicing, bookkeeping, tax calculations, and recurring billing for freelancers',
        tags: ['stripe', 'invoicing', 'finance'],
        expected: 'Finance',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "detailed" (det[ai]led)',
        title: 'MetricFlow',
        desc: 'Detailed telemetry analytics dashboard, tracking churn, MRR, ARR, and conversion funnels',
        tags: ['analytics', 'metrics', 'dashboard'],
        expected: 'Analytics',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "straightforward" (str[ai]ghtforward)',
        title: 'FeedbackLite',
        desc: 'Straightforward customer feedback widget and survey collector',
        tags: ['feedback'],
        expected: 'General SaaS',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "maintain" (m[ai]nt[ai]n)',
        title: 'CodeGuard',
        desc: 'Maintain clean code standards with automated git pre-commit hooks and debugger rules',
        tags: ['git', 'code', 'devtools'],
        expected: 'Developer Tools',
        forbiddenCategory: 'AI Tools',
      },
      {
        name: 'Word "tailored" (t[ai]lored)',
        title: 'OutreachPro',
        desc: 'Tailored leadgen, cold outreach campaigns, and social media marketing funnel',
        tags: ['marketing', 'leadgen'],
        expected: 'Marketing',
        forbiddenCategory: 'AI Tools',
      },

      // Cases containing 'ui' inside common non-Design words:
      {
        name: 'Word "quick" (q[ui]ck)',
        title: 'QuickNotes',
        desc: 'Quick note taking and task management workflow app for agile teams',
        tags: ['notes', 'tasks', 'productivity'],
        expected: 'Productivity',
        forbiddenCategory: 'Design Tools',
      },
      {
        name: 'Word "build" (b[ui]ld)',
        title: 'BuildFast',
        desc: 'Fast compiler, terminal cli, and docker devops build engine for backend developers',
        tags: ['compiler', 'cli', 'docker'],
        expected: 'Developer Tools',
        forbiddenCategory: 'Design Tools',
      },
      {
        name: 'Word "guide" (g[ui]de)',
        title: 'DocuGuide',
        desc: 'Team documentation, wiki notes, knowledge base, and workflow docs',
        tags: ['docs', 'documentation', 'notes'],
        expected: 'Productivity',
        forbiddenCategory: 'Design Tools',
      },
      {
        name: 'Word "fluid" (fl[ui]d)',
        title: 'CashFluid',
        desc: 'Cash fluid tracking, expense management, and payroll accounting for businesses',
        tags: ['finance', 'payroll', 'accounting'],
        expected: 'Finance',
        forbiddenCategory: 'Design Tools',
      },
      {
        name: 'Word "fruit" (fr[ui]t)',
        title: 'FruitfulMetrics',
        desc: 'Fruitful analytics, visitor tracking, telemetry, and revenue metrics',
        tags: ['analytics', 'metrics'],
        expected: 'Analytics',
        forbiddenCategory: 'Design Tools',
      },

      // Genuine AI Tools:
      {
        name: 'Genuine AI Tool (GPT-4 / Copilot)',
        title: 'CopyCopilot AI',
        desc: 'AI copywriter powered by GPT-4 and OpenAI for automated blog generation',
        tags: ['ai', 'gpt-4', 'openai'],
        expected: 'AI Tools',
      },
      {
        name: 'Genuine AI Tool (Machine Learning / Neural)',
        title: 'NeuralVision',
        desc: 'Machine learning and deep learning neural network vision model training platform',
        tags: ['machine-learning', 'neural'],
        expected: 'AI Tools',
      },
      {
        name: 'Genuine AI Tool (Claude / LLM / GenAI)',
        title: 'LLM Studio',
        desc: 'Prompt engineering and GenAI workbench supporting Claude, Gemini, and custom LLMs',
        tags: ['llm', 'genai', 'claude'],
        expected: 'AI Tools',
      },

      // Genuine Design Tools:
      {
        name: 'Genuine Design Tool (Figma / UI / UX)',
        title: 'PixelCraft',
        desc: 'Figma UI design component kit, typography tokens, vector icons, and mockup templates',
        tags: ['figma', 'ui', 'design', 'vector'],
        expected: 'Design Tools',
      },
      {
        name: 'Genuine Design Tool (Tailwind CSS / Wireframe)',
        title: 'WireTail',
        desc: 'Tailwind CSS wireframe kit, prototype builder, and illustration library for designers',
        tags: ['tailwind', 'css', 'wireframe', 'design'],
        expected: 'Design Tools',
      },

      // Genuine Developer Tools:
      {
        name: 'Genuine Developer Tool (Postgres / API / SDK)',
        title: 'DBRelay',
        desc: 'Postgres SQL database backend with auto-generated RESTful APIs and TypeScript SDK',
        tags: ['database', 'postgres', 'api', 'sdk'],
        expected: 'Developer Tools',
      },

      // Genuine Finance:
      {
        name: 'Genuine Finance (Stripe / Invoicing / Payroll)',
        title: 'PayLedger',
        desc: 'Stripe payment gateway reconciliation, bookkeeping, and payroll tax compliance',
        tags: ['stripe', 'payments', 'payroll'],
        expected: 'Finance',
      },

      // Genuine Analytics:
      {
        name: 'Genuine Analytics (Telemetry / MRR / Churn)',
        title: 'PulseTelemetry',
        desc: 'Real-time telemetry, visitor tracking, MRR and ARR dashboard for SaaS metrics',
        tags: ['telemetry', 'analytics', 'mrr'],
        expected: 'Analytics',
      },

      // Genuine Marketing:
      {
        name: 'Genuine Marketing (SEO / Outreach / Social)',
        title: 'GrowthPilot',
        desc: 'SEO rank tracker, social media marketing campaigns, and lead generation funnels',
        tags: ['seo', 'marketing', 'social-media'],
        expected: 'Marketing',
      },

      // Genuine Productivity:
      {
        name: 'Genuine Productivity (Kanban / Tasks / Notion)',
        title: 'TaskFlow',
        desc: 'Kanban project management, notion-style docs, calendar scheduling, and team collaboration',
        tags: ['kanban', 'tasks', 'calendar'],
        expected: 'Productivity',
      },
    ];

    for (const tc of testCases) {
      it(`classifies ${tc.name} -> "${tc.expected}"`, () => {
        const actual = CopyGeneratorEngine.classifyCategory(tc.title, tc.desc, tc.tags);
        if (tc.forbiddenCategory) {
          assert.notStrictEqual(
            actual,
            tc.forbiddenCategory,
            `Collision detected: ${tc.name} was incorrectly classified as "${actual}" (${tc.forbiddenCategory} collision!)`
          );
        }
        assert.strictEqual(
          actual,
          tc.expected,
          `Category classification mismatch for ${tc.name}: expected "${tc.expected}", got "${actual}"`
        );
      });
    }

    it('ensures extractNormalizedTags does not extract false positive "ai" or "ui" tags from non-AI/non-UI words', () => {
      const textNoAi = 'email container domain daily painless detailed straightforward maintain';
      const tagsNoAi = CopyGeneratorEngine.extractNormalizedTags('Product', textNoAi, []);
      assert.ok(!tagsNoAi.includes('ai'), `extractNormalizedTags extracted false positive 'ai' from: "${textNoAi}". Got tags: ${JSON.stringify(tagsNoAi)}`);

      const textNoUi = 'quick build guide fluid fruit';
      const tagsNoUi = CopyGeneratorEngine.extractNormalizedTags('Product', textNoUi, []);
      assert.ok(!tagsNoUi.includes('ui'), `extractNormalizedTags extracted false positive 'ui' from: "${textNoUi}". Got tags: ${JSON.stringify(tagsNoUi)}`);

      const textWithAi = 'AI powered GPT-4 copilot for coding';
      const tagsWithAi = CopyGeneratorEngine.extractNormalizedTags('Product', textWithAi, []);
      assert.ok(tagsWithAi.includes('ai'), `extractNormalizedTags missed true 'ai' tag from: "${textWithAi}". Got: ${JSON.stringify(tagsWithAi)}`);
    });
  });
});
