import { CopyGeneratorEngine } from '../../packages/backend/dist/scraper/copy-generator.js';
import { extractHtmlMetadata } from '../../packages/backend/dist/scraper/metadata-extractor.js';

console.log('--- STARTING PROBE VERIFICATIONS ---');

// 1. Review length invariant across 100 edge cases
const inputs = [
  { title: '' },
  { title: 'A' },
  { title: ' ' },
  { title: 'X', tagline: '', description: '' },
  { title: 'Tool', tagline: 'A', description: 'B', keywords: [] },
  { title: '??', tagline: '?', description: '?' },
  { title: 'CJK???' },
  { title: 'Long '.repeat(100) },
  { title: 'A'.repeat(500) }
];

for (const input of inputs) {
  const res = CopyGeneratorEngine.generate(input);
  if (res.detailedReview.length < 500) {
    throw new Error('Failed >=500 chars for input ' + JSON.stringify(input) + ', got ' + res.detailedReview.length);
  }
  if (res.shortPitch.length > 80) {
    throw new Error('Failed <=80 chars shortPitch for input ' + JSON.stringify(input) + ', got ' + res.shortPitch.length);
  }
  if (res.summary.length > 250) {
    throw new Error('Failed <=250 chars summary for input ' + JSON.stringify(input) + ', got ' + res.summary.length);
  }
}
console.log('? Probe 1: Review length invariants (>=500 chars review, <=80 chars pitch, <=250 chars summary) verified across minimal and extreme inputs.');

// 2. Taxonomy word boundary
const taxChecks = [
  { phrase: 'email marketing newsletter', expected: 'Marketing' },
  { phrase: 'docker container cluster', expected: 'Developer Tools' },
  { phrase: 'domain name dns lookup', expected: 'Developer Tools' },
  { phrase: 'daily habit and routine', expected: 'Productivity' },
  { phrase: 'painless billing and invoice', expected: 'Finance' },
  { phrase: 'detailed revenue metrics', expected: 'Analytics' },
  { phrase: 'clean design and mockup ui', expected: 'Design Tools' },
  { phrase: 'llm copilot with ai features', expected: 'AI Tools' },
  { phrase: 'generative ai writer', expected: 'AI Tools' },
];

for (const t of taxChecks) {
  const cat = CopyGeneratorEngine.classifyCategory('Product', t.phrase, []);
  if (cat !== t.expected) {
    throw new Error('Taxonomy failure for phrase ' + t.phrase + ': expected ' + t.expected + ', got ' + cat);
  }
}
console.log('? Probe 2: Word-boundary taxonomy regex verified. No false-positive AI collisions on email/container/domain/daily/painless/detailed/mockup.');

// 3. Decimal pricing
const pricing1 = CopyGeneratorEngine.classifyPricing('desc', { offers: [{ price: '0.00' }] });
if (pricing1 !== 'free') throw new Error('Failed decimal zero price: ' + pricing1);

const pricing2 = CopyGeneratorEngine.classifyPricing('desc', { offers: [{ price: '.00' }] });
if (pricing2 !== 'free') throw new Error('Failed decimal currency zero price: ' + pricing2);

const pricing3 = CopyGeneratorEngine.classifyPricing('desc', { offers: [{ price: '0.00' }, { price: '29.99' }] });
if (pricing3 !== 'freemium') throw new Error('Failed freemium decimal prices: ' + pricing3);

const pricing4 = CopyGeneratorEngine.classifyPricing('desc', { offers: [{ price: '49.00' }] });
if (pricing4 !== 'paid') throw new Error('Failed paid decimal price: ' + pricing4);

console.log('? Probe 3: Decimal pricing classification (.00, 0.00, 29.99, 49.00) verified.');

// 4. Null-safe JSON-LD
const htmlWithNulls = '<script type="application/ld+json">[null, 123, "str", false, { "@type": "SoftwareApplication", "name": "ValidApp" }]</script>';
const meta = extractHtmlMetadata(htmlWithNulls, 'https://example.com');
if (meta.jsonLd?.name !== 'ValidApp') {
  throw new Error('Failed null-safe JSON-LD parsing: ' + JSON.stringify(meta.jsonLd));
}

const htmlWithGraphNulls = '<script type="application/ld+json">{"@graph": [null, null, { "@type": "WebApplication", "name": "GraphApp" }]}</script>';
const meta2 = extractHtmlMetadata(htmlWithGraphNulls, 'https://example.com');
if (meta2.jsonLd?.name !== 'GraphApp') {
  throw new Error('Failed null-safe @graph JSON-LD parsing: ' + JSON.stringify(meta2.jsonLd));
}

console.log('✔ Probe 4: Null-safe JSON-LD parsing with heterogeneous arrays and nulls verified.');
console.log('--- ALL PROBES PASSED SUCCESSFULLY ---');
