import assert from 'node:assert';
import { extractHtmlMetadata, decodeHtmlEntities, cleanText } from '../../packages/backend/dist/scraper/metadata-extractor.js';
import { CopyGeneratorEngine } from '../../packages/backend/dist/scraper/copy-generator.js';
import { DirectoryRegistryService } from '../../packages/backend/dist/registry/directory-registry.service.js';
import { RealtimeService } from '../../packages/backend/dist/services/realtime.service.js';
import { ProjectService, projectService } from '../../packages/backend/dist/services/project.service.js';
import { SubmissionService, submissionService } from '../../packages/backend/dist/services/submission.service.js';
import { DIRECTORY_CATALOG } from '../../packages/shared/dist/index.js';

console.log('=== RUNNING INDEPENDENT FORENSIC INTEGRITY PROBES ===\n');

let passedChecks = 0;

// Test 1: HTML Metadata Extractor with various scenarios
{
  console.log('[PROBE 1] Testing HTML Metadata Extractor...');

  // 1.1 Minimal HTML
  const minRes = extractHtmlMetadata('<html><body><p>Hello world</p></body></html>', 'https://minimal.app');
  assert.strictEqual(minRes.title, 'Untitled Product');
  assert.strictEqual(minRes.faviconUrl, 'https://minimal.app/favicon.ico');
  assert.ok(minRes.extractionDurationMs < 50, `Extraction too slow: ${minRes.extractionDurationMs}ms`);

  // 1.2 Rich OpenGraph & JSON-LD
  const richHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>OmniPulse &trade; &mdash; High Velocity Telemetry</title>
        <meta name="description" content="The ultimate telemetry engine for distributed cloud services." />
        <meta name="keywords" content="telemetry, observability, cloud, metrics, devops" />
        <meta property="og:title" content="OmniPulse Telemetry" />
        <meta property="og:description" content="Real-time distributed telemetry at scale." />
        <meta property="og:image" content="/assets/og-hero.png" />
        <meta property="og:url" content="https://omnipulse.io" />
        <link rel="canonical" href="https://omnipulse.io/" />
        <link rel="icon" href="/favicon.svg" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "OmniPulse",
            "offers": [
              { "@type": "Offer", "price": "0.00", "priceCurrency": "USD", "name": "Free Starter" },
              { "@type": "Offer", "price": "49.00", "priceCurrency": "USD", "name": "Pro Team" }
            ]
          }
        </script>
      </head>
      <body>
        <h1>Unified Telemetry Engine</h1>
        <p>OmniPulse provides real-time distributed telemetry and APM monitoring for modern enterprise cloud environments.</p>
        <img src="/img/dashboard-preview.png" alt="Product Dashboard Screenshot" />
      </body>
    </html>
  `;
  const richRes = extractHtmlMetadata(richHtml, 'https://omnipulse.io');
  assert.strictEqual(richRes.title, 'OmniPulse Telemetry');
  assert.strictEqual(richRes.ogDescription, 'Real-time distributed telemetry at scale.');
  assert.strictEqual(richRes.ogImage, 'https://omnipulse.io/assets/og-hero.png');
  assert.strictEqual(richRes.faviconUrl, 'https://omnipulse.io/favicon.svg');
  assert.strictEqual(richRes.canonicalUrl, 'https://omnipulse.io/');
  assert.deepStrictEqual(richRes.keywords, ['telemetry', 'observability', 'cloud', 'metrics', 'devops']);
  assert.ok(richRes.screenshotUrls.includes('https://omnipulse.io/assets/og-hero.png'));
  assert.ok(richRes.screenshotUrls.includes('https://omnipulse.io/img/dashboard-preview.png'));
  assert.strictEqual(richRes.jsonLd?.name, 'OmniPulse');

  // 1.3 Malformed JSON-LD with null elements & syntax error
  const messyHtml = `
    <html>
      <head>
        <script type="application/ld+json">[null, {"@type": "SoftwareApplication", "name": "BrokenArrayApp"}]</script>
        <script type="application/ld+json">{ invalid json here }</script>
      </head>
      <body><h1>Fallback Header</h1></body>
    </html>
  `;
  const messyRes = extractHtmlMetadata(messyHtml, 'https://messy.io');
  assert.strictEqual(messyRes.title, 'BrokenArrayApp');
  assert.strictEqual(messyRes.h1, 'Fallback Header');

  passedChecks++;
  console.log('✓ Metadata Extractor probe passed cleanly.');
}

// Test 2: Copy Generator SLA & Robustness Invariants
{
  console.log('\n[PROBE 2] Testing Copy Generator Invariants...');

  // 2.1 Adversarial random inputs for review length >= 500 chars
  const testInputs = [
    { title: '' },
    { title: 'A' },
    { title: 'App' },
    { title: 'X', tagline: '', description: '' },
    { title: 'Super Tool', tagline: 'Fast.', description: 'Works well.' },
    { title: 'Very Long Title '.repeat(10), tagline: 'A'.repeat(300), description: 'B'.repeat(1000) },
  ];

  for (let i = 0; i < 50; i++) {
    const syntheticTitle = `App_${Math.random().toString(36).substring(2, 8)}`;
    testInputs.push({
      title: syntheticTitle,
      tagline: i % 2 === 0 ? `Fast ${i}` : '',
      description: i % 3 === 0 ? `Desc ${i}` : '',
      keywords: i % 4 === 0 ? ['ai', 'devtools'] : undefined,
    });
  }

  for (const input of testInputs) {
    const copy = CopyGeneratorEngine.generate(input);
    assert.ok(copy.shortPitch.length <= 80, `Short pitch exceeded 80 chars (${copy.shortPitch.length}): "${copy.shortPitch}"`);
    assert.ok(copy.summary.length <= 250, `Summary exceeded 250 chars (${copy.summary.length}): "${copy.summary}"`);
    assert.ok(copy.detailedReview.length >= 500, `Detailed review under 500 chars (${copy.detailedReview.length}) for input: ${JSON.stringify(input)}`);
    assert.ok(copy.tags.length >= 1 && copy.tags.length <= 8, `Tags count invalid: ${copy.tags.length}`);
    assert.ok(['free', 'freemium', 'paid', 'subscription', 'open_source'].includes(copy.pricingModel));
  }

  // 2.2 Strict Word-Boundary Taxonomy Classification
  const taxonomyTests = [
    { title: 'MailBurst', desc: 'automated email marketing and newsletter delivery campaigns', expected: 'Marketing' },
    { title: 'KubeShip', desc: 'docker container orchestration cluster and microservice manager', expected: 'Developer Tools' },
    { title: 'NameNest', desc: 'domain name search and dns registry lookup engine', expected: 'Developer Tools' },
    { title: 'RoutineHero', desc: 'daily habit tracking routine and todo task manager', expected: 'Productivity' },
    { title: 'InvoiceSnap', desc: 'painless billing invoicing and stripe payments tracker', expected: 'Finance' },
    { title: 'PixelCraft', desc: 'vector ui mockup wireframing and design system studio', expected: 'Design Tools' },
    { title: 'MetricPulse', desc: 'saas revenue telemetry churn and analytics dashboard', expected: 'Analytics' },
    { title: 'GenieCode', desc: 'ai code assistant powered by llm openai deep learning', expected: 'AI Tools' },
  ];

  for (const t of taxonomyTests) {
    const cat = CopyGeneratorEngine.classifyCategory(t.title, t.desc, []);
    assert.strictEqual(cat, t.expected, `Taxonomy mismatch for "${t.title}": expected ${t.expected}, got ${cat}`);
  }

  // 2.3 Pricing Decimal & Multi-tier Offer Classifications
  assert.strictEqual(
    CopyGeneratorEngine.classifyPricing('', { offers: [{ price: '0.00' }, { price: '29.00' }] }),
    'freemium'
  );
  assert.strictEqual(
    CopyGeneratorEngine.classifyPricing('', { offers: [{ price: 0 }] }),
    'free'
  );
  assert.strictEqual(
    CopyGeneratorEngine.classifyPricing('', { offers: [{ price: '49.99' }] }),
    'paid'
  );
  assert.strictEqual(
    CopyGeneratorEngine.classifyPricing('Open source MIT licensed hosted on github.com', undefined),
    'free'
  );
  assert.strictEqual(
    CopyGeneratorEngine.classifyPricing('Standard monthly recurring subscription starting at $15/month', undefined),
    'subscription'
  );

  passedChecks++;
  console.log('✓ Copy Generator invariants probe passed cleanly.');
}

// Test 3: Directory Registry Service
{
  console.log('\n[PROBE 3] Testing Directory Registry Service...');
  const registry = new DirectoryRegistryService(DIRECTORY_CATALOG);

  assert.ok(registry.count >= 7, `Expected at least 7 canonical directories, found ${registry.count}`);
  const uneed = registry.getDirectoryById('uneed');
  assert.ok(uneed, 'Uneed directory missing');
  assert.strictEqual(uneed.submissionType, 'form_automation');
  assert.ok(uneed.domainRating >= 60);

  const aiDirs = registry.getDirectories({ category: 'AI' });
  assert.ok(aiDirs.length >= 1);

  const highDrDirs = registry.getDirectories({ minDr: 70 });
  assert.ok(highDrDirs.length >= 1);
  for (const d of highDrDirs) {
    assert.ok(d.domainRating >= 70);
  }

  const formDirs = registry.getDirectories({ submissionType: 'form_automation' });
  assert.ok(formDirs.length >= 4);

  const categories = registry.getCategories();
  assert.ok(categories.length >= 3);

  passedChecks++;
  console.log('✓ Directory Registry probe passed cleanly.');
}

// Test 4: Realtime Broadcasting Service
{
  console.log('\n[PROBE 4] Testing Realtime Service...');
  const rt = new RealtimeService();

  let receivedEvent = null;
  rt.on('realtime:event', (evt) => {
    receivedEvent = evt;
  });

  rt.emitStatusChange('sub-1', 'proj-1', 'uneed', 'in_progress', { step: 'filling_form' });
  assert.ok(receivedEvent);
  assert.strictEqual(receivedEvent.type, 'STATUS_CHANGE');
  assert.strictEqual(receivedEvent.payload.submissionId, 'sub-1');
  assert.strictEqual(receivedEvent.payload.status, 'in_progress');

  rt.emitIntervention('sub-1', 'proj-1', 'uneed', { type: 'captcha', captcha_type: 'turnstile' });
  assert.strictEqual(receivedEvent.type, 'INTERVENTION_REQUIRED');
  assert.strictEqual(receivedEvent.payload.actionRequired.type, 'captcha');

  passedChecks++;
  console.log('✓ Realtime Service probe passed cleanly.');
}

// Test 5: Project and Submission Services Flow
{
  console.log('\n[PROBE 5] Testing Project & Submission Service Flow...');
  projectService.clear();
  submissionService.clear();

  // Create Project
  const project = await projectService.createProject('user-test-123', {
    name: 'IntegrityTestApp',
    url: 'https://integrity-test.app',
    tagline: 'High speed test SaaS app',
    description: 'A comprehensive testing SaaS tool designed for verification.',
    category: 'Developer Tools',
    tags: ['devtools', 'testing'],
    pricingModel: 'freemium',
  });

  assert.ok(project.id);
  assert.strictEqual(project.name, 'IntegrityTestApp');

  // Launch Batch Submissions
  const batch = await submissionSvc.launchBatch(project.id, ['uneed', 'saashub', 'toolify'], 'user-test-123');
  assert.strictEqual(batch.enqueuedCount, 3);
  assert.strictEqual(batch.submissions.length, 3);

  // Update submission status
  const subId = batch.submissions[0].id;
  const updated = await submissionSvc.updateSubmission(subId, {
    status: 'in_progress',
  });
  assert.strictEqual(updated?.status, 'in_progress');

  // Test action required & resolve
  const resolved = await submissionSvc.resolveAction(subId, {
    submissionId: subId,
    resolutionType: 'captcha_solved',
    customPayload: { token: 'tok_abc' },
  });
  assert.strictEqual(resolved.success, true);
  assert.strictEqual(resolved.status, 'resumed');

  // Test retry flow
  const retried = await submissionSvc.retrySubmission(subId);
  assert.strictEqual(retried?.status, 'queued');
  assert.strictEqual(retried?.retryCount, 1);

  passedChecks++;
  console.log('✓ Project & Submission Service probe passed cleanly.');
}

console.log(`\n======================================================`);
console.log(`ALL ${passedChecks} FORENSIC INTEGRITY PROBES PASSED WITH ZERO ERRORS!`);
console.log(`======================================================`);
