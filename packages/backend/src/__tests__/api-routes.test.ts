import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';

describe('Backend API Server & REST Routes Integration Suite', () => {
  let server: FastifyInstance;
  let createdProjectId: string;
  let createdSubmissionId: string;

  before(async () => {
    server = await buildServer();
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  describe('Health Endpoints', () => {
    it('GET /health returns 200 OK with server stats', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/health',
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.status, 'ok');
      assert.strictEqual(json.version, '1.0.0');
    });

    it('GET /api/v1/health returns 200 OK', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.status, 'ok');
    });
  });

  describe('POST /api/v1/extract', () => {
    it('extracts metadata from submitted HTML payload in <100ms', async () => {
      const sampleHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>FastMock SaaS — Automated SEO Engine</title>
            <meta name="description" content="Instant SEO audit and backlink optimizer for modern websites.">
            <meta property="og:title" content="FastMock SaaS">
            <meta property="og:description" content="Instant SEO audit and backlink optimizer.">
            <meta property="og:image" content="https://fastmock.io/og.png">
            <link rel="icon" href="/favicon.ico">
          </head>
          <body>
            <h1>Welcome to FastMock</h1>
          </body>
        </html>
      `;

      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/extract',
        payload: {
          url: 'https://fastmock.io',
          html: sampleHtml,
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.name.includes('FastMock'));
      assert.ok(json.data.descriptionPitch80.length <= 80);
      assert.strictEqual(json.data.category, 'Marketing');
    });

    it('returns 400 validation error for invalid URL', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/extract',
        payload: {
          url: 'not-a-valid-url',
        },
      });

      assert.strictEqual(res.statusCode, 400);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.error.code, 'VALIDATION_FAILED');
    });
  });

  describe('Directory Registry Endpoints', () => {
    it('GET /api/v1/directories returns directory catalog', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/directories',
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.ok(json.directories.length >= 7);
      assert.strictEqual(json.total, json.directories.length);
    });

    it('GET /api/v1/directories/:id returns single directory or 404', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/directories/uneed',
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.directory.id, 'uneed');

      const notFoundRes = await server.inject({
        method: 'GET',
        url: '/api/v1/directories/nonexistent_dir',
      });
      assert.strictEqual(notFoundRes.statusCode, 404);
    });
  });

  describe('Project Management Endpoints', () => {
    it('POST /api/v1/projects creates a new project record (201 Created)', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'EchoMetrics',
          url: 'https://echometrics.io',
          tagline: 'Real-time telemetry and revenue tracker',
          description: 'Comprehensive financial dashboard for modern bootstrapped founders.',
          category: 'Analytics',
          tags: ['saas', 'analytics', 'stripe'],
          pricingModel: 'freemium',
          logoUrl: 'https://echometrics.io/logo.png',
        },
      });

      assert.strictEqual(res.statusCode, 201);
      const json = JSON.parse(res.body);
      assert.ok(json.project.id);
      assert.strictEqual(json.project.name, 'EchoMetrics');
      createdProjectId = json.project.id;
    });

    it('GET /api/v1/projects lists projects', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/projects',
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.ok(json.projects.length >= 1);
    });

    it('GET /api/v1/projects/:id returns project details', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${createdProjectId}`,
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.project.id, createdProjectId);
      assert.ok(Array.isArray(json.submissions));
    });

    it('PUT /api/v1/projects/:id updates project fields', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: `/api/v1/projects/${createdProjectId}`,
        payload: {
          name: 'EchoMetrics Pro',
          pricingModel: 'subscription',
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.project.name, 'EchoMetrics Pro');
      assert.strictEqual(json.project.pricingModel, 'subscription');
    });
  });

  describe('Submissions & Launch Endpoints', () => {
    it('POST /api/v1/projects/:id/launch enqueues directory submissions', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${createdProjectId}/launch`,
        payload: {
          directoryIds: ['uneed', 'toolify'],
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.projectId, createdProjectId);
      assert.strictEqual(json.enqueuedCount, 2);
      assert.strictEqual(json.submissions.length, 2);
      createdSubmissionId = json.submissions[0].id;
    });

    it('GET /api/v1/projects/:id/submissions retrieves project submissions', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${createdProjectId}/submissions`,
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.total, 2);
      assert.ok(json.submissions[0].directory.name);
    });

    it('GET /api/v1/submissions/:id retrieves individual submission', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/submissions/${createdSubmissionId}`,
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.submission.id, createdSubmissionId);
    });

    it('POST /api/v1/submissions/:id/resolve handles challenge resolution', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/api/v1/submissions/${createdSubmissionId}/resolve`,
        payload: {
          resolutionType: 'captcha_solved',
          captchaToken: 'token_mock_abc',
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.status, 'resumed');
    });

    it('POST /api/v1/submissions/:id/retry re-enqueues submission', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/api/v1/submissions/${createdSubmissionId}/retry`,
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.submission.status, 'queued');
    });
  });

  describe('Cleanup & Teardown', () => {
    it('DELETE /api/v1/projects/:id removes project', async () => {
      const res = await server.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${createdProjectId}`,
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.success, true);

      const checkRes = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${createdProjectId}`,
      });
      assert.strictEqual(checkRes.statusCode, 404);
    });
  });
});
