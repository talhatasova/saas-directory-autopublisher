import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../packages/backend/dist/server.js';
import { projectService } from '../../packages/backend/dist/services/project.service.js';
import { submissionService } from '../../packages/backend/dist/services/submission.service.js';
import { realtimeService } from '../../packages/backend/dist/services/realtime.service.js';
import { directoryRegistry } from '../../packages/backend/dist/registry/directory-registry.service.js';

describe('CHALLENGER-M2: Fastify REST, Real-time Streaming, and Endpoint Stress Test Suite', () => {
  let server: FastifyInstance;
  let serverUrl: string;
  let serverPort: number;

  before(async () => {
    projectService.clear();
    submissionService.clear();
    server = await buildServer();
    await server.listen({ port: 0, host: '127.0.0.1' });
    const address = server.server.address() as { address: string; port: number };
    serverPort = address.port;
    serverUrl = `http://127.0.0.1:${serverPort}`;
  });

  after(async () => {
    await server.close();
  });

  // ==========================================================================
  // SUITE 1: FASTIFY REST ENDPOINTS FUZZING, SECURITY & ERROR HANDLING
  // ==========================================================================
  describe('Suite 1: REST Endpoints Security, Input Fuzzing & Error Handling', () => {
    it('handles malformed and non-JSON request bodies gracefully (returns 400 Bad Request)', async () => {
      const endpoints = [
        { method: 'POST', url: '/api/v1/extract' },
        { method: 'POST', url: '/api/v1/projects' },
        { method: 'POST', url: '/api/v1/submissions/batch' },
      ];

      for (const ep of endpoints) {
        // Send invalid JSON text with application/json header
        const res = await server.inject({
          method: ep.method as any,
          url: ep.url,
          headers: { 'content-type': 'application/json' },
          payload: '{ "invalid_json": true, missing_brace',
        });

        assert.strictEqual(res.statusCode, 400, `Expected 400 for malformed JSON at ${ep.url}, got ${res.statusCode}`);
        const body = JSON.parse(res.body);
        assert.ok(body.error, `Missing error object for ${ep.url}`);
      }
    });

    it('rejects primitive types and arrays when an object body is expected', async () => {
      const invalidPayloads = [
        'plain-string',
        12345,
        true,
        ['array', 'of', 'items'],
        null,
      ];

      for (const payload of invalidPayloads) {
        const res = await server.inject({
          method: 'POST',
          url: '/api/v1/extract',
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify(payload),
        });

        assert.strictEqual(res.statusCode, 400, `Expected 400 for payload ${JSON.stringify(payload)}`);
        const json = JSON.parse(res.body);
        assert.strictEqual(json.error.code, 'VALIDATION_FAILED');
      }
    });

    it('resists SQL Injection payloads across params, query strings, and body fields', async () => {
      const sqlInjections = [
        "' OR '1'='1",
        "'; DROP TABLE projects; --",
        "' UNION SELECT null, email, password FROM users --",
        "1; EXEC xp_cmdshell('dir'); --",
      ];

      for (const sqlPayload of sqlInjections) {
        // 1. In Project creation body
        const createRes = await server.inject({
          method: 'POST',
          url: '/api/v1/projects',
          payload: {
            name: `TestApp ${sqlPayload}`,
            url: 'https://valid-saas.com',
            tagline: sqlPayload,
            description: `A valid description with SQL string: ${sqlPayload}`,
            category: 'Developer Tools',
          },
        });

        assert.strictEqual(createRes.statusCode, 201, 'Should safely treat SQL injection string as literal text');
        const createdProject = JSON.parse(createRes.body).project;
        assert.ok(createdProject.id);
        assert.ok(createdProject.name.includes(sqlPayload));

        // 2. In Route parameter ID
        const getRes = await server.inject({
          method: 'GET',
          url: `/api/v1/projects/${encodeURIComponent(sqlPayload)}`,
        });
        assert.strictEqual(getRes.statusCode, 404, 'SQL injection in ID route should return 404 Not Found');

        // 3. In Query parameter
        const listRes = await server.inject({
          method: 'GET',
          url: `/api/v1/submissions?projectId=${encodeURIComponent(sqlPayload)}`,
        });
        assert.strictEqual(listRes.statusCode, 200);
        const listJson = JSON.parse(listRes.body);
        assert.strictEqual(listJson.submissions.length, 0);

        // Cleanup
        await server.inject({
          method: 'DELETE',
          url: `/api/v1/projects/${createdProject.id}`,
        });
      }
    });

    it('sanitizes and safely stores Cross-Site Scripting (XSS) strings without execution vulnerabilities', async () => {
      const xssStrings = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(document.cookie)>',
        '<svg/onload=alert(1)>',
        '"><script>alert(1)</script>',
      ];

      for (const xss of xssStrings) {
        const createRes = await server.inject({
          method: 'POST',
          url: '/api/v1/projects',
          payload: {
            name: `App ${xss}`,
            url: 'https://xss-test-app.com',
            tagline: `Tagline ${xss}`,
            description: `Description long enough to satisfy minimum requirement ${xss}`,
            category: 'Security',
            tags: [xss, 'security'],
          },
        });

        assert.strictEqual(createRes.statusCode, 201);
        const json = JSON.parse(createRes.body);
        assert.ok(json.project.id);
        assert.strictEqual(json.project.name, `App ${xss}`);

        // Cleanup
        await server.inject({
          method: 'DELETE',
          url: `/api/v1/projects/${json.project.id}`,
        });
      }
    });

    it('returns consistent 404 NOT_FOUND error structures for all non-existent resources', async () => {
      const notFoundEndpoints = [
        { method: 'GET', url: '/api/v1/projects/00000000-0000-0000-0000-000000000099' },
        { method: 'PUT', url: '/api/v1/projects/00000000-0000-0000-0000-000000000099', payload: { name: 'New' } },
        { method: 'PATCH', url: '/api/v1/projects/00000000-0000-0000-0000-000000000099', payload: { name: 'New' } },
        { method: 'DELETE', url: '/api/v1/projects/00000000-0000-0000-0000-000000000099' },
        { method: 'GET', url: '/api/v1/projects/00000000-0000-0000-0000-000000000099/submissions' },
        { method: 'GET', url: '/api/v1/submissions/00000000-0000-0000-0000-000000000099' },
        { method: 'POST', url: '/api/v1/submissions/00000000-0000-0000-0000-000000000099/retry' },
        { method: 'GET', url: '/api/v1/directories/nonexistent-directory' },
      ];

      for (const ep of notFoundEndpoints) {
        const res = await server.inject({
          method: ep.method as any,
          url: ep.url,
          payload: (ep as any).payload,
        });

        assert.strictEqual(res.statusCode, 404, `Expected 404 for ${ep.method} ${ep.url}, got ${res.statusCode}`);
        const body = JSON.parse(res.body);
        assert.ok(body.error, `Missing error structure for ${ep.url}`);
        assert.ok(body.error.code.includes('NOT_FOUND'), `Error code should contain NOT_FOUND, got ${body.error.code}`);
      }
    });

    it('returns 404 for undefined routes without crashing', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/undefined-endpoint-xyz',
      });
      assert.strictEqual(res.statusCode, 404);
    });
  });

  // ==========================================================================
  // SUITE 2: /api/v1/extract STRESS, CONCURRENCY & RESILIENCE MATRIX
  // ==========================================================================
  describe('Suite 2: /api/v1/extract Stress, Concurrency & Resilience Matrix', () => {
    it('executes 50 concurrent metadata extractions in parallel without degradation or race conditions', async () => {
      const CONCURRENCY = 50;
      const startTime = performance.now();

      const tasks = Array.from({ length: CONCURRENCY }, async (_, idx) => {
        const sampleHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>App-${idx} — Intelligent Multi-Cloud Metrics</title>
              <meta name="description" content="Instant real-time telemetry and monitoring for App-${idx}.">
              <meta property="og:title" content="App-${idx} Cloud Platform">
              <meta property="og:description" content="Monitoring platform for App-${idx}.">
              <meta property="og:image" content="https://app-${idx}.io/og.png">
              <link rel="icon" href="/favicon.ico">
            </head>
            <body>
              <h1>App-${idx} Heading</h1>
              <p>Multi-cloud observability platform built for modern engineering teams.</p>
            </body>
          </html>
        `;

        const res = await server.inject({
          method: 'POST',
          url: '/api/v1/extract',
          payload: {
            url: `https://app-${idx}.io`,
            html: sampleHtml,
          },
        });

        return { idx, res };
      });

      const results = await Promise.all(tasks);
      const totalDurationMs = performance.now() - startTime;

      assert.strictEqual(results.length, CONCURRENCY);
      for (const { idx, res } of results) {
        assert.strictEqual(res.statusCode, 200, `Request ${idx} failed with status ${res.statusCode}`);
        const json = JSON.parse(res.body);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.name.includes(`App-${idx}`));
        assert.ok(json.data.descriptionPitch80.length <= 80);
        assert.ok(json.data.descriptionSummary250.length <= 250);
        assert.ok(json.data.descriptionReview500.length >= 250);
      }

      // Assert high performance: 50 concurrent extractions completed under 1500ms
      assert.ok(
        totalDurationMs < 1500,
        `50 concurrent extractions took ${totalDurationMs.toFixed(2)}ms (expected < 1500ms)`
      );
    });

    it('robustly processes large HTML payloads (<1MB) and enforces 413 Payload Too Large for oversized bodies (>1MB)', async () => {
      // 1. Valid large HTML payload (~600KB) under Fastify's 1MB limit
      const largeParagraphs = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>\n'.repeat(4000);
      const largeHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>HeavyPayload SaaS — High Volume Data Processing Engine</title>
            <meta name="description" content="Massive scale document and telemetry processor.">
            <meta property="og:title" content="HeavyPayload SaaS">
            <meta property="og:image" content="https://heavy.io/banner.png">
          </head>
          <body>
            <h1>Heavy Payload SaaS Platform</h1>
            ${largeParagraphs}
          </body>
        </html>
      `;

      const byteSize = Buffer.byteLength(largeHtml, 'utf8');
      assert.ok(byteSize > 400_000 && byteSize < 1_000_000, `Payload size ${byteSize} should be between 400KB and 1MB`);

      const startTime = performance.now();
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/extract',
        payload: {
          url: 'https://heavy.io',
          html: largeHtml,
        },
      });

      const elapsed = performance.now() - startTime;
      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.name.includes('HeavyPayload SaaS'));
      assert.ok(json.data.descriptionPitch80.length <= 80);
      assert.ok(elapsed < 2000, `Large HTML extraction took ${elapsed.toFixed(2)}ms (expected < 2000ms)`);

      // 2. Oversized payload (>2MB) correctly triggers Fastify 413 Payload Too Large
      const oversizedParagraphs = '<p>Extra payload chunk for body limit stress testing.</p>\n'.repeat(35000);
      const oversizedRes = await server.inject({
        method: 'POST',
        url: '/api/v1/extract',
        payload: {
          url: 'https://oversized.io',
          html: `<html><body>${oversizedParagraphs}</body></html>`,
        },
      });

      assert.strictEqual(oversizedRes.statusCode, 413, 'Oversized payload >1MB should return 413 Payload Too Large');
    });

    it('robustly handles deeply nested DOM trees (500+ levels) and unclosed tags', async () => {
      let nestedHtml = '<div>'.repeat(500) + '<span>Deeply nested content text</span>' + '</div>'.repeat(500);
      const messyHtml = `
        <title>Deeply Nested App
        <meta name="description" content="Unclosed tags and deep nesting
        <meta property="og:image" content="https://nested.io/image.png">
        <body>
          <h1>Deep App Header
          ${nestedHtml}
      `;

      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/extract',
        payload: {
          url: 'https://nested.io',
          html: messyHtml,
        },
      });

      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.name.includes('Deeply Nested App'));
    });

    it('rejects all malicious or invalid URI schemes with 400 VALIDATION_FAILED', async () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html;base64,PHNjcmlwdD4=',
        'file:///etc/passwd',
        'file:///C:/Windows/win.ini',
        'ftp://ftp.is.co.za/pub/file.txt',
        'tel:+1234567890',
        'mailto:support@saas.com',
        'gopher://gopher.floodgap.com',
        'not_a_valid_url',
        'http://',
        'https://',
        '   ',
        '',
      ];

      for (const badUrl of maliciousUrls) {
        const res = await server.inject({
          method: 'POST',
          url: '/api/v1/extract',
          payload: {
            url: badUrl,
          },
        });

        assert.strictEqual(
          res.statusCode,
          400,
          `Expected 400 for bad URL "${badUrl}", got ${res.statusCode}`
        );
        const json = JSON.parse(res.body);
        assert.strictEqual(json.error.code, 'VALIDATION_FAILED');
      }
    });
  });

  // ==========================================================================
  // SUITE 3: /api/v1/projects/:id/launch CONCURRENCY, RACE CONDITIONS & BATCHES
  // ==========================================================================
  describe('Suite 3: /api/v1/projects/:id/launch Concurrency & Race Condition Stress', () => {
    let testProjectId: string;

    before(async () => {
      const createRes = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'ConcurrentLaunch SaaS',
          url: 'https://launch-test.io',
          tagline: 'High concurrency directory auto publisher test',
          description: 'A test project specifically designed to stress-test concurrent launch endpoints.',
          category: 'Developer Tools',
          tags: ['saas', 'automation'],
        },
      });

      assert.strictEqual(createRes.statusCode, 201);
      testProjectId = JSON.parse(createRes.body).project.id;
    });

    after(async () => {
      if (testProjectId) {
        await server.inject({
          method: 'DELETE',
          url: `/api/v1/projects/${testProjectId}`,
        });
      }
    });

    it('handles 50 concurrent launch requests on the same project idempotently without creating duplicate submissions', async () => {
      const targetDirectories = ['uneed', 'saashub', 'toolify', 'alternativeto', 'theresanaiforthat'];
      const CONCURRENT_LAUNCHES = 50;

      // Blast 50 concurrent launch calls simultaneously
      const launchTasks = Array.from({ length: CONCURRENT_LAUNCHES }, async (_, i) => {
        return server.inject({
          method: 'POST',
          url: `/api/v1/projects/${testProjectId}/launch`,
          payload: {
            directoryIds: targetDirectories,
          },
        });
      });

      const results = await Promise.all(launchTasks);
      assert.strictEqual(results.length, CONCURRENT_LAUNCHES);

      // Verify all requests succeeded with 200 OK
      for (const res of results) {
        assert.strictEqual(res.statusCode, 200, `Launch call returned unexpected status ${res.statusCode}`);
        const json = JSON.parse(res.body);
        assert.strictEqual(json.projectId, testProjectId);
        assert.strictEqual(json.enqueuedCount, targetDirectories.length);
      }

      // Check the final project submissions in the database/store
      const subRes = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${testProjectId}/submissions`,
      });

      assert.strictEqual(subRes.statusCode, 200);
      const subJson = JSON.parse(subRes.body);
      
      // CRITICAL IDEMPOTENCY CHECK: Exactly 5 distinct submissions must exist (1 per directory), NOT 50 x 5 = 250
      assert.strictEqual(
        subJson.submissions.length,
        targetDirectories.length,
        `Expected exactly ${targetDirectories.length} unique submissions for project, found ${subJson.submissions.length}`
      );

      // Verify all submissions are in 'queued' status
      for (const sub of subJson.submissions) {
        assert.strictEqual(sub.status, 'queued');
        assert.ok(targetDirectories.includes(sub.directoryId));
        // Verify logs record the repeated re-enqueue operations safely
        assert.ok(sub.logs.length >= 1);
      }
    });

    it('rejects launch requests with empty directoryIds or missing fields', async () => {
      const invalidBodies = [
        {},
        { directoryIds: [] },
        { directoryIds: 'uneed' }, // not an array
        { directoryIds: null },
      ];

      for (const body of invalidBodies) {
        const res = await server.inject({
          method: 'POST',
          url: `/api/v1/projects/${testProjectId}/launch`,
          payload: body,
        });

        assert.strictEqual(res.statusCode, 400, `Expected 400 for launch body ${JSON.stringify(body)}`);
        const json = JSON.parse(res.body);
        assert.strictEqual(json.error.code, 'VALIDATION_FAILED');
      }
    });

    it('rejects launch requests containing non-existent directory IDs', async () => {
      const res = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${testProjectId}/launch`,
        payload: {
          directoryIds: ['uneed', 'fake_directory_id_that_does_not_exist'],
        },
      });

      assert.ok(
        res.statusCode === 400 || res.statusCode === 404 || res.statusCode === 500,
        `Expected error status for non-existent directory, got ${res.statusCode}`
      );
      const json = JSON.parse(res.body);
      assert.ok(json.error);
    });

    it('rejects launch requests for non-existent project IDs', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000000099/launch',
        payload: {
          directoryIds: ['uneed', 'toolify'],
        },
      });

      assert.ok(
        res.statusCode === 400 || res.statusCode === 404 || res.statusCode === 500,
        `Expected error status for non-existent project launch, got ${res.statusCode}`
      );
      const json = JSON.parse(res.body);
      assert.ok(json.error);
    });
  });

  // ==========================================================================
  // SUITE 4: /api/v1/submissions/:id/resolve CONCURRENCY & INTERVENTIONS
  // ==========================================================================
  describe('Suite 4: /api/v1/submissions/:id/resolve Concurrency & Security Challenges', () => {
    let testProjectId: string;
    let testSubmissionId: string;

    before(async () => {
      const createRes = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'InterventionResolve SaaS',
          url: 'https://intervention-test.io',
          tagline: 'CAPTCHA and 2FA intervention resolution testing',
          description: 'A test project specifically designed to stress-test challenge resolution endpoints.',
          category: 'Developer Tools',
        },
      });

      assert.strictEqual(createRes.statusCode, 201);
      testProjectId = JSON.parse(createRes.body).project.id;

      const launchRes = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${testProjectId}/launch`,
        payload: {
          directoryIds: ['uneed'],
        },
      });

      assert.strictEqual(launchRes.statusCode, 200);
      testSubmissionId = JSON.parse(launchRes.body).submissions[0].id;
    });

    after(async () => {
      if (testProjectId) {
        await server.inject({
          method: 'DELETE',
          url: `/api/v1/projects/${testProjectId}`,
        });
      }
    });

    it('handles 50 concurrent resolve calls for the same submission without race conditions', async () => {
      const CONCURRENT_RESOLVES = 50;

      const resolveTasks = Array.from({ length: CONCURRENT_RESOLVES }, async (_, i) => {
        return server.inject({
          method: 'POST',
          url: `/api/v1/submissions/${testSubmissionId}/resolve`,
          payload: {
            resolutionType: 'captcha_solved',
            captchaToken: `cf_turnstile_token_${i}`,
            customPayload: {
              attempt: i,
              timestamp: new Date().toISOString(),
            },
          },
        });
      });

      const results = await Promise.all(resolveTasks);
      assert.strictEqual(results.length, CONCURRENT_RESOLVES);

      for (const res of results) {
        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(res.body);
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.status, 'resumed');
      }

      // Verify submission state in store
      const subRes = await server.inject({
        method: 'GET',
        url: `/api/v1/submissions/${testSubmissionId}`,
      });

      assert.strictEqual(subRes.statusCode, 200);
      const sub = JSON.parse(subRes.body).submission;
      assert.strictEqual(sub.status, 'in_progress');
      assert.strictEqual(sub.actionRequiredPayload, null);
      assert.ok(sub.logs.length > 1);
    });

    it('rejects invalid resolutionType values with 400 VALIDATION_FAILED', async () => {
      const invalidTypes = [
        'invalid_resolution_type',
        'bypass_security',
        'auto_skip',
        12345,
        null,
        '',
      ];

      for (const badType of invalidTypes) {
        const res = await server.inject({
          method: 'POST',
          url: `/api/v1/submissions/${testSubmissionId}/resolve`,
          payload: {
            resolutionType: badType,
          },
        });

        assert.strictEqual(
          res.statusCode,
          400,
          `Expected 400 for bad resolutionType "${badType}", got ${res.statusCode}`
        );
        const json = JSON.parse(res.body);
        assert.strictEqual(json.error.code, 'VALIDATION_FAILED');
      }
    });

    it('supports all valid resolutionType variants (captcha_solved, 2fa_entered, manual_confirmed, field_updated)', async () => {
      const validTypes = ['captcha_solved', '2fa_entered', 'manual_confirmed', 'field_updated'] as const;

      for (const vType of validTypes) {
        const res = await server.inject({
          method: 'POST',
          url: `/api/v1/submissions/${testSubmissionId}/resolve`,
          payload: {
            resolutionType: vType,
            twoFactorCode: vType === '2fa_entered' ? '123456' : undefined,
            captchaToken: vType === 'captcha_solved' ? 'mock_token' : undefined,
          },
        });

        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(res.body);
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.status, 'resumed');
      }
    });

    it('rejects resolve calls on non-existent submission IDs with error', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/submissions/00000000-0000-0000-0000-000000000099/resolve',
        payload: {
          resolutionType: 'captcha_solved',
          captchaToken: 'mock_token',
        },
      });

      assert.ok(
        res.statusCode === 400 || res.statusCode === 404 || res.statusCode === 500,
        `Expected error for non-existent submission resolve, got ${res.statusCode}`
      );
    });
  });

  // ==========================================================================
  // SUITE 5: REAL-TIME STREAMING (SSE & WEBSOCKET) CONCURRENCY & LOAD STRESS
  // ==========================================================================
  describe('Suite 5: Real-time Streaming (SSE & WebSocket) Concurrency & Load Stress', () => {
    it('establishes 50 concurrent SSE connections and receives initial STATUS_SYNC event', async () => {
      const CLIENT_COUNT = 50;
      const connectedPromises: Promise<{ id: number; initialEvent: any; req: http.ClientRequest }>[] = [];

      for (let i = 0; i < CLIENT_COUNT; i++) {
        const p = new Promise<{ id: number; initialEvent: any; req: http.ClientRequest }>((resolve, reject) => {
          const req = http.get(`${serverUrl}/api/v1/submissions/stream`, (res) => {
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.headers['content-type'], 'text/event-stream');

            res.on('data', (chunk) => {
              const text = chunk.toString();
              if (text.startsWith('data: ')) {
                try {
                  const event = JSON.parse(text.replace(/^data:\s*/, '').trim());
                  resolve({ id: i, initialEvent: event, req });
                } catch (e) {
                  reject(e);
                }
              }
            });
          });

          req.on('error', reject);
        });

        connectedPromises.push(p);
      }

      const connectedClients = await Promise.all(connectedPromises);
      assert.strictEqual(connectedClients.length, CLIENT_COUNT);

      for (const client of connectedClients) {
        assert.strictEqual(client.initialEvent.type, 'STATUS_SYNC');
        assert.ok(client.initialEvent.payload.clientId);
        // Cleanly abort connection
        client.req.destroy();
      }

      // Wait a moment for connection cleanup
      await new Promise((r) => setTimeout(r, 100));
    });

    it('establishes 50 concurrent WebSocket connections and receives initial STATUS_SYNC event', async () => {
      const WS_COUNT = 50;
      const wsUrl = `ws://127.0.0.1:${serverPort}/ws`;

      const wsPromises = Array.from({ length: WS_COUNT }, (_, i) => {
        return new Promise<{ id: number; socket: WebSocket; initialEvent: any }>((resolve, reject) => {
          const socket = new WebSocket(wsUrl);

          socket.on('message', (data) => {
            try {
              const event = JSON.parse(data.toString());
              resolve({ id: i, socket, initialEvent: event });
            } catch (e) {
              reject(e);
            }
          });

          socket.on('error', reject);
        });
      });

      const wsClients = await Promise.all(wsPromises);
      assert.strictEqual(wsClients.length, WS_COUNT);

      for (const client of wsClients) {
        assert.strictEqual(client.initialEvent.type, 'STATUS_SYNC');
        assert.ok(client.initialEvent.payload.clientId);
        client.socket.close();
      }

      await new Promise((r) => setTimeout(r, 100));
    });

    it('broadcasts 500 status and log events to active SSE and WebSocket clients with zero drops', async () => {
      const testProjectA = 'proj-stream-test-a';
      const receivedSseEvents: any[] = [];
      const receivedWsEvents: any[] = [];

      // 1. Connect SSE client
      const sseReq = http.get(`${serverUrl}/api/v1/submissions/stream?projectId=${testProjectA}`, (res) => {
        res.on('data', (chunk) => {
          const lines = chunk.toString().split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.replace(/^data:\s*/, '').trim());
                receivedSseEvents.push(event);
              } catch {
                // Ignore parse chunk split
              }
            }
          }
        });
      });

      // 2. Connect WebSocket client
      const ws = new WebSocket(`ws://127.0.0.1:${serverPort}/ws?projectId=${testProjectA}`);
      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      ws.on('message', (data) => {
        try {
          receivedWsEvents.push(JSON.parse(data.toString()));
        } catch {
          // Ignore
        }
      });

      // Allow connection handshake
      await new Promise((r) => setTimeout(r, 100));

      // 3. Emit 250 status events + 250 log events (500 total)
      const EVENT_COUNT = 250;
      for (let i = 0; i < EVENT_COUNT; i++) {
        realtimeService.emitStatusChange(`sub-${i}`, testProjectA, 'uneed', 'in_progress', { step: i });
        realtimeService.emitLog(`sub-${i}`, testProjectA, 'uneed', 'info', `Processing step #${i}`);
      }

      // Wait for broadcast flush
      await new Promise((r) => setTimeout(r, 300));

      // Close clients
      sseReq.destroy();
      ws.close();

      // Assertions
      // Each client should have received 1 STATUS_SYNC + 500 broadcast events
      assert.ok(
        receivedSseEvents.length >= 500,
        `Expected >= 500 SSE events, received ${receivedSseEvents.length}`
      );
      assert.ok(
        receivedWsEvents.length >= 500,
        `Expected >= 500 WS events, received ${receivedWsEvents.length}`
      );
    });

    it('enforces channel isolation: project-specific clients only receive events for their project', async () => {
      const projA = 'project-alpha';
      const projB = 'project-beta';

      const eventsA: any[] = [];
      const eventsB: any[] = [];

      const wsA = new WebSocket(`ws://127.0.0.1:${serverPort}/ws?projectId=${projA}`);
      const wsB = new WebSocket(`ws://127.0.0.1:${serverPort}/ws?projectId=${projB}`);

      await Promise.all([
        new Promise<void>((r) => wsA.on('open', r)),
        new Promise<void>((r) => wsB.on('open', r)),
      ]);

      wsA.on('message', (data) => {
        const ev = JSON.parse(data.toString());
        if (ev.type !== 'STATUS_SYNC') eventsA.push(ev);
      });

      wsB.on('message', (data) => {
        const ev = JSON.parse(data.toString());
        if (ev.type !== 'STATUS_SYNC') eventsB.push(ev);
      });

      await new Promise((r) => setTimeout(r, 50));

      // Emit 10 events for Project A
      for (let i = 0; i < 10; i++) {
        realtimeService.emitStatusChange(`sub-a-${i}`, projA, 'uneed', 'in_progress');
      }

      // Emit 10 events for Project B
      for (let i = 0; i < 10; i++) {
        realtimeService.emitStatusChange(`sub-b-${i}`, projB, 'toolify', 'published');
      }

      await new Promise((r) => setTimeout(r, 200));

      wsA.close();
      wsB.close();

      // Project A client should ONLY receive Project A events
      assert.strictEqual(eventsA.length, 10);
      for (const ev of eventsA) {
        assert.strictEqual(ev.payload.projectId, projA);
      }

      // Project B client should ONLY receive Project B events
      assert.strictEqual(eventsB.length, 10);
      for (const ev of eventsB) {
        assert.strictEqual(ev.payload.projectId, projB);
      }
    });

    it('resiliently handles abrupt client disconnects during active high-speed broadcasting without crashing or leaking', async () => {
      const activeSockets: WebSocket[] = [];
      const wsUrl = `ws://127.0.0.1:${serverPort}/ws`;

      // Connect 30 WS clients and wait for all to be open
      const connectPromises = Array.from({ length: 30 }, () => {
        return new Promise<WebSocket>((resolve) => {
          const s = new WebSocket(wsUrl);
          s.on('open', () => resolve(s));
          s.on('error', () => {}); // Catch expected connection error on client during abrupt terminate
          activeSockets.push(s);
        });
      });

      await Promise.all(connectPromises);

      // Start emitting high-speed broadcasts while abruptly terminating sockets
      let count = 0;
      const emitInterval = setInterval(() => {
        count++;
        realtimeService.emitStatusChange(`sub-stress-${count}`, 'proj-abrupt', 'uneed', 'in_progress');
      }, 5);

      // Abruptly terminate half the sockets mid-stream
      for (let i = 0; i < 15; i++) {
        try {
          activeSockets[i]?.terminate(); // abrupt TCP RST without clean close
        } catch {
          // Ignore client side terminate throw
        }
      }

      await new Promise((r) => setTimeout(r, 150));
      clearInterval(emitInterval);

      // Close the rest cleanly
      for (let i = 15; i < 30; i++) {
        try {
          activeSockets[i]?.close();
        } catch {
          // Ignore
        }
      }

      await new Promise((r) => setTimeout(r, 100));

      // Verify server is still completely responsive
      const healthRes = await server.inject({
        method: 'GET',
        url: '/health',
      });
      assert.strictEqual(healthRes.statusCode, 200);
    });
  });
});
