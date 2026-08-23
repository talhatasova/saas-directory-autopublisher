import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CopyGeneratorEngine, RawMetadataInput } from '../scraper/index.js';

describe('Copy Generator & Algorithmic Enrichment Engine', () => {
  const sampleInput: RawMetadataInput = {
    title: 'PulseMetrics — Real-Time SaaS Analytics & Directory Auto-Publisher',
    tagline: 'Monitor real-time MRR and publish to 50+ SaaS directories with 1-click.',
    description:
      'PulseMetrics is the all-in-one analytics dashboard and automated directory submission suite for indie hackers and modern SaaS founders.',
    keywords: ['saas analytics', 'directory publisher', 'indie hacker', 'stripe'],
  };

  it('generates short pitch strictly under 80 characters without awkward truncation', () => {
    const copy = CopyGeneratorEngine.generate(sampleInput);
    assert.ok(copy.shortPitch.length <= 80, `Pitch exceeds 80 chars: ${copy.shortPitch.length}`);
    assert.ok(copy.shortPitch.includes('MRR'));
  });

  it('truncates overly long taglines cleanly at word boundary with ellipsis', () => {
    const longInput: RawMetadataInput = {
      title: 'Enterprise Platform',
      tagline:
        'This is an exceptionally long product tagline designed specifically to verify that our algorithmic copy synthesizer properly truncates at word boundaries rather than breaking words in half.',
    };
    const copy = CopyGeneratorEngine.generate(longInput);
    assert.ok(copy.shortPitch.length <= 80);
    assert.ok(copy.shortPitch.endsWith('...'));
  });

  it('generates summary under 250 characters', () => {
    const copy = CopyGeneratorEngine.generate(sampleInput);
    assert.ok(copy.summary.length <= 250, `Summary exceeds 250 chars: ${copy.summary.length}`);
    assert.ok(copy.summary.includes('PulseMetrics'));
  });

  it('generates structured multi-paragraph detailed review >= 500 characters', () => {
    const copy = CopyGeneratorEngine.generate(sampleInput);
    assert.ok(
      copy.detailedReview.length >= 500,
      `Review must be >= 500 chars (got ${copy.detailedReview.length})`
    );
    const paragraphs = copy.detailedReview.split('\n\n');
    assert.ok(paragraphs.length >= 4, 'Must have at least 4 structured paragraphs');
  });

  it('classifies categories accurately across diverse product domains', () => {
    const aiTool = CopyGeneratorEngine.generate({
      title: 'NeuralWriter',
      description: 'AI-driven content generation copilot with LLM models',
    });
    assert.strictEqual(aiTool.category, 'AI Tools');

    const devTool = CopyGeneratorEngine.generate({
      title: 'GitPulse',
      description: 'Developer code review automation and git workflow tracking',
    });
    assert.strictEqual(devTool.category, 'Developer Tools');

    const marketingTool = CopyGeneratorEngine.generate({
      title: 'RankTracker',
      description: 'Automated SEO keyword tracking and marketing outreach platform',
    });
    assert.strictEqual(marketingTool.category, 'Marketing');

    const financeTool = CopyGeneratorEngine.generate({
      title: 'Invoicely',
      description: 'Automated Stripe invoicing, accounting, and recurring payment tracking',
    });
    assert.strictEqual(financeTool.category, 'Finance');
  });

  it('detects pricing models from JSON-LD or text cues', () => {
    const freeTool = CopyGeneratorEngine.generate({
      title: 'FreeTool',
      description: '100% free forever for all developers',
    });
    assert.strictEqual(freeTool.pricingModel, 'free');

    const subTool = CopyGeneratorEngine.generate({
      title: 'SubTool',
      description: 'Subscription based access starting at $19 per month',
    });
    assert.strictEqual(subTool.pricingModel, 'subscription');

    const jsonLdFreemium = CopyGeneratorEngine.generate({
      title: 'HybridTool',
      description: 'Software platform',
      jsonLd: {
        offers: [
          { price: 0, category: 'Free' },
          { price: 49, category: 'Pro' },
        ],
      },
    });
    assert.strictEqual(jsonLdFreemium.pricingModel, 'freemium');
  });
});
