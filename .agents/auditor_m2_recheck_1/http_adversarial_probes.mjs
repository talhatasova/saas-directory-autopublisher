import assert from 'node:assert';
import { buildServer } from '../../packages/backend/dist/server.js';
import { projectService } from '../../packages/backend/dist/services/project.service.js';
import { submissionService } from '../../packages/backend/dist/services/submission.service.js';

console.log('=== RUNNING FASTIFY API ADVERSARIAL HTTP PROBES ===\n');

const app = await buildServer();
await app.ready();

let checks = 0;

// 1. Health check
{
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.payload);
  assert.strictEqual(data.status, 'ok');
  checks++;
}

// 2. Direct HTML extraction route
{
  const html = `
    <html>
      <head>
        <title>SaaSBot &mdash; Directory Submissions Automated</title>
        <meta name="description" content="Publish your product across 50+ directories in minutes." />
        <meta property="og:title" content="SaaSBot AI" />
        <meta property="og:description" content="Publish your product across 50+ directories in minutes." />
      </head>
      <body><h1>SaaS Launch Automation</h1></body>
    </html>
  `;
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/extract',
    payload: { html, url: 'https://saasbot.dev' },
  });
  assert.strictEqual(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.name, 'SaaSBot AI');
  assert.strictEqual(body.data.category, 'AI Tools');
  assert.ok(body.data.descriptionPitch80.length <= 80);
  assert.ok(body.data.descriptionReview500.length >= 500);
  checks++;
}

// 3. Validation rejection
{
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/extract',
    payload: {},
  });
  assert.strictEqual(res.statusCode, 400);
  const body = JSON.parse(res.payload);
  assert.strictEqual(body.error.code, 'VALIDATION_FAILED');
  checks++;
}

// 4. Directories catalogue
{
  const res = await app.inject({ method: 'GET', url: '/api/v1/directories' });
  assert.strictEqual(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.ok(body.total >= 7);

  const resCat = await app.inject({ method: 'GET', url: '/api/v1/directories/categories' });
  assert.strictEqual(resCat.statusCode, 200);

  const resSingle = await app.inject({ method: 'GET', url: '/api/v1/directories/uneed' });
  assert.strictEqual(resSingle.statusCode, 200);
  checks++;
}

// 5. Full Project and Submission CRUD flow
{
  projectService.clear();
  submissionService.clear();

  // Create
  const createRes = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    payload: {
      name: 'PulseFlow SaaS',
      url: 'https://pulseflow.io',
      tagline: 'High performance streaming telemetry for distributed systems',
      description: 'PulseFlow empowers development teams to monitor real-time event streams with zero latency overhead.',
      category: 'Developer Tools',
      tags: ['telemetry', 'realtime', 'streaming'],
      pricingModel: 'freemium',
    },
  });
  assert.strictEqual(createRes.statusCode, 201);
  const created = JSON.parse(createRes.payload).project;
  assert.ok(created.id);
  const projectId = created.id;

  // Get By ID
  const getRes = await app.inject({ method: 'GET', url: `/api/v1/projects/${projectId}` });
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(JSON.parse(getRes.payload).project.name, 'PulseFlow SaaS');

  // Update
  const updateRes = await app.inject({
    method: 'PATCH',
    url: `/api/v1/projects/${projectId}`,
    payload: {
      tagline: 'Updated high performance streaming telemetry engine',
    },
  });
  assert.strictEqual(updateRes.statusCode, 200);
  assert.strictEqual(JSON.parse(updateRes.payload).project.tagline, 'Updated high performance streaming telemetry engine');

  // Launch Batch
  const launchRes = await app.inject({
    method: 'POST',
    url: `/api/v1/projects/${projectId}/launch`,
    payload: { directoryIds: ['uneed', 'saashub'] },
  });
  assert.strictEqual(launchRes.statusCode, 200);
  const launchData = JSON.parse(launchRes.payload);
  assert.strictEqual(launchData.enqueuedCount, 2);
  const subId = launchData.submissions[0].id;

  // List Submissions
  const subsRes = await app.inject({ method: 'GET', url: `/api/v1/submissions?projectId=${projectId}` });
  assert.strictEqual(subsRes.statusCode, 200);
  assert.strictEqual(JSON.parse(subsRes.payload).total, 2);

  // Retry Submission
  const retryRes = await app.inject({ method: 'POST', url: `/api/v1/submissions/${subId}/retry` });
  assert.strictEqual(retryRes.statusCode, 200);

  // Resolve Intervention
  const resolveRes = await app.inject({
    method: 'POST',
    url: `/api/v1/submissions/${subId}/resolve`,
    payload: {
      submissionId: subId,
      resolutionType: 'captcha_solved',
    },
  });
  assert.strictEqual(resolveRes.statusCode, 200);
  assert.strictEqual(JSON.parse(resolveRes.payload).success, true);

  // Delete Project
  const deleteRes = await app.inject({ method: 'DELETE', url: `/api/v1/projects/${projectId}` });
  assert.strictEqual(deleteRes.statusCode, 200);

  checks++;
}

await app.close();

console.log(`\n======================================================`);
console.log(`ALL ${checks} FASTIFY API HTTP PROBES PASSED WITH ZERO ERRORS!`);
console.log(`======================================================`);
