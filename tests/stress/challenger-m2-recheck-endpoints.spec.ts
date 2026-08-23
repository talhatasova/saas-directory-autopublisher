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

describe('CHALLENGER-M2-RECHECK: Fastify Endpoints, Batch Launch, SSE & WebSocket Concurrency Suite', () => {
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
  // SECTION 1: FASTIFY REST API ENDPOINTS STRESS & BOUNDARY FUZZING
  // ==========================================================================
  describe('1. Fastify API Endpoints Stress & Boundary Fuzzing', () => {
    it('executes 100 concurrent URL / HTML metadata extractions in parallel within SLA', async () => {
      const startTime = performance.now();
      const concurrency = 100;

      const requests = Array.from({ length: concurrency }).map((_, idx) => {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>ParallelApp ${idx} - High Scale Automation</title>
            <meta name="description" content="Parallel App ${idx} provides instant automated cloud workflows for modern software engineers.">
            <meta property="og:title" content="ParallelApp ${idx}">
            <meta property="og:image" content="https://parallel${idx}.io/og-image.png">
          </head>
          <body>
            <h1>ParallelApp ${idx}</h1>
            <p>Full description paragraph ${idx} with features and capabilities.</p>
          </body>
          </html>
        `;
        return server.inject({
          method: 'POST',
          url: '/api/v1/extract',
          payload: {
            url: `https://parallel${idx}.io`,
            html,
          },
        });
      });

      const responses = await Promise.all(requests);
      const totalDuration = performance.now() - startTime;

      assert.strictEqual(responses.length, concurrency);
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        assert.strictEqual(res.statusCode, 200, `Expected 200 at idx ${i}, got ${res.statusCode}`);
        const body = JSON.parse(res.body);
        assert.ok(body.success);
        assert.strictEqual(body.data.name, `ParallelApp ${i}`);
        assert.ok(body.data.descriptionReview500.length >= 500, `Review length was ${body.data.descriptionReview500.length} (expected >= 500)`);
        assert.ok(body.data.descriptionPitch80.length <= 80);
        assert.ok(body.data.descriptionSummary250.length <= 250);
      }

      // Assert SLA: Average time per extract under load should be well under 100ms
      const avgDuration = totalDuration / concurrency;
      assert.ok(avgDuration < 100, `Average extract duration was ${avgDuration.toFixed(2)}ms (expected < 100ms)`);
    });

    it('enforces payload size limits: rejects >1MB with 413 Payload Too Large and accepts ~800KB payload', async () => {
      // 1. Oversized payload (1.5MB)
      const hugeHtml = '<html><head><title>Huge</title></head><body>' + '<div>Chunk</div>'.repeat(120000) + '</body></html>';
      const oversizedRes = await server.inject({
        method: 'POST',
        url: '/api/v1/extract',
        payload: {
          url: 'https://huge-payload.io',
          html: hugeHtml,
        },
      });
      assert.strictEqual(oversizedRes.statusCode, 413, `Expected 413 for >1MB payload, got ${oversizedRes.statusCode}`);

      // 2. Large but valid payload (600KB)
      const validLargeHtml = '<html><head><title>LargeValid</title><meta name="description" content="Valid large body"></head><body>' + '<div>Content block</div>'.repeat(30000) + '</body></html>';
      const validLargeRes = await server.inject({
        method: 'POST',
        url: '/api/v1/extract',
        payload: {
          url: 'https://large-valid.io',
          html: validLargeHtml,
        },
      });
      assert.strictEqual(validLargeRes.statusCode, 200);
      const validLargeBody = JSON.parse(validLargeRes.body);
      assert.strictEqual(validLargeBody.data.name, 'LargeValid');
    });

    it('validates project creation constraints (name length, description length, URL format)', async () => {
      // 1. Missing name -> 400
      const missingName = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          url: 'https://valid.com',
          tagline: 'A valid tagline',
          description: 'A valid description that is long enough.',
        },
      });
      assert.strictEqual(missingName.statusCode, 400);

      // 2. Description too short (< 10 chars) -> 400
      const shortDesc = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'Shorty',
          url: 'https://valid.com',
          tagline: 'Tagline',
          description: 'Too short', // 9 chars
        },
      });
      assert.strictEqual(shortDesc.statusCode, 400);

      // 3. Invalid URL -> 400
      const badUrl = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'Bad URL App',
          url: 'not-a-url',
          tagline: 'Tagline',
          description: 'A valid description that is long enough.',
        },
      });
      assert.strictEqual(badUrl.statusCode, 400);

      // 4. Valid project creation -> 201
      const validRes = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'Valid SaaS Pro',
          url: 'https://validsaas.io',
          tagline: 'Professional SaaS solution for founders',
          description: 'A comprehensive cloud platform automating directory submissions with verified proof.',
          category: 'Developer Tools',
          tags: ['automation', 'saas', 'devtools'],
          pricingModel: 'freemium',
        },
      });
      assert.strictEqual(validRes.statusCode, 201);
      const validBody = JSON.parse(validRes.body);
      assert.ok(validBody.project.id);
      assert.strictEqual(validBody.project.name, 'Valid SaaS Pro');
    });

    it('handles 50 concurrent PATCH operations on the same project without race conditions', async () => {
      const createRes = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'Patch Target SaaS',
          url: 'https://patchtarget.io',
          tagline: 'Initial tagline',
          description: 'Initial description that is sufficiently long.',
          category: 'Productivity',
        },
      });
      const projectId = JSON.parse(createRes.body).project.id;

      const patchRequests = Array.from({ length: 50 }).map((_, idx) => {
        return server.inject({
          method: 'PATCH',
          url: `/api/v1/projects/${projectId}`,
          payload: {
            tagline: `Updated Tagline ${idx}`,
            shortDescription: `Short desc ${idx}`,
          },
        });
      });

      const patchResponses = await Promise.all(patchRequests);
      for (const res of patchResponses) {
        assert.strictEqual(res.statusCode, 200);
      }

      // Verify project still has valid consistent state
      const getRes = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}`,
      });
      assert.strictEqual(getRes.statusCode, 200);
      const project = JSON.parse(getRes.body).project;
      assert.strictEqual(project.id, projectId);
      assert.ok(project.tagline.startsWith('Updated Tagline'));
    });

    it('filters directory catalog across all query parameters (category, minDr, submissionType)', async () => {
      // 1. All directories
      const allRes = await server.inject({ method: 'GET', url: '/api/v1/directories' });
      assert.strictEqual(allRes.statusCode, 200);
      const allData = JSON.parse(allRes.body);
      assert.ok(allData.total >= 7);

      // 2. Filter by minimum Domain Rating (DR >= 80)
      const drRes = await server.inject({ method: 'GET', url: '/api/v1/directories?minDr=80' });
      assert.strictEqual(drRes.statusCode, 200);
      const drData = JSON.parse(drRes.body);
      for (const d of drData.directories) {
        assert.ok(d.domainRating >= 80);
      }

      // 3. Filter by submission type: form_automation
      const formRes = await server.inject({ method: 'GET', url: '/api/v1/directories?submissionType=form_automation' });
      assert.strictEqual(formRes.statusCode, 200);
      const formData = JSON.parse(formRes.body);
      for (const d of formData.directories) {
        assert.strictEqual(d.submissionType, 'form_automation');
      }

      // 4. Filter by submission type: direct_api
      const apiRes = await server.inject({ method: 'GET', url: '/api/v1/directories?submissionType=direct_api' });
      assert.strictEqual(apiRes.statusCode, 200);
      const apiData = JSON.parse(apiRes.body);
      for (const d of apiData.directories) {
        assert.strictEqual(d.submissionType, 'direct_api');
      }
    });
  });

  // ==========================================================================
  // SECTION 2: BATCH LAUNCH DISPATCHER & IDEMPOTENT CONCURRENCY STRESS
  // ==========================================================================
  describe('2. Batch Launch Dispatcher & Concurrency Stress', () => {
    let testProjectId: string;

    before(async () => {
      const p = await projectService.createProject('00000000-0000-0000-0000-000000000001', {
        name: 'Batch Launch SaaS',
        url: 'https://batchlaunch.io',
        tagline: 'Batch launch automated publisher',
        description: 'Comprehensive platform for automated SaaS publishing across directories.',
        category: 'Developer Tools',
      });
      testProjectId = p.id;
    });

    it('deduplicates duplicate directory IDs passed in a single launch request', async () => {
      // Pass duplicate directory IDs: ['uneed', 'uneed', 'saashub', 'saashub']
      const launchRes = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${testProjectId}/launch`,
        payload: {
          directoryIds: ['uneed', 'uneed', 'saashub', 'saashub'],
        },
      });

      assert.strictEqual(launchRes.statusCode, 200);
      const body = JSON.parse(launchRes.body);
      assert.strictEqual(body.projectId, testProjectId);

      // Verify submissions in store for this project
      const subs = await submissionService.getSubmissionsByProject(testProjectId);
      const uneedSubs = subs.filter((s) => s.directoryId === 'uneed');
      const saashubSubs = subs.filter((s) => s.directoryId === 'saashub');
      assert.strictEqual(uneedSubs.length, 1, `Expected 1 uneed submission, got ${uneedSubs.length}`);
      assert.strictEqual(saashubSubs.length, 1, `Expected 1 saashub submission, got ${saashubSubs.length}`);
    });

    it('handles 100 concurrent batch launch calls on the same project idempotently without creating duplicate rows', async () => {
      const targetDirs = ['uneed', 'saashub', 'toolify', 'alternativeto', 'theresanaiforthat'];

      const concurrentLaunches = Array.from({ length: 100 }).map(() => {
        return server.inject({
          method: 'POST',
          url: `/api/v1/projects/${testProjectId}/launch`,
          payload: {
            directoryIds: targetDirs,
          },
        });
      });

      const results = await Promise.all(concurrentLaunches);
      for (const res of results) {
        assert.strictEqual(res.statusCode, 200);
      }

      // Verify total submissions for this project is exactly 5
      const subs = await submissionService.getSubmissionsByProject(testProjectId);
      assert.strictEqual(subs.length, targetDirs.length, `Expected exactly ${targetDirs.length} submissions, got ${subs.length}`);
      const dirSet = new Set(subs.map((s) => s.directoryId));
      assert.strictEqual(dirSet.size, targetDirs.length);
    });

    it('rejects batch launch with empty directory array or non-existent directories', async () => {
      // 1. Empty directory array
      const emptyRes = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${testProjectId}/launch`,
        payload: { directoryIds: [] },
      });
      assert.strictEqual(emptyRes.statusCode, 400);

      // 2. Non-existent directory ID
      const nonExistentDirRes = await server.inject({
        method: 'POST',
        url: `/api/v1/projects/${testProjectId}/launch`,
        payload: { directoryIds: ['fake_directory_id_99999'] },
      });
      assert.ok(nonExistentDirRes.statusCode === 400 || nonExistentDirRes.statusCode === 404);

      // 3. Non-existent project ID
      const nonExistentProjectRes = await server.inject({
        method: 'POST',
        url: '/api/v1/projects/00000000-0000-0000-0000-000000009999/launch',
        payload: { directoryIds: ['uneed'] },
      });
      assert.ok(nonExistentProjectRes.statusCode === 400 || nonExistentProjectRes.statusCode === 404);
    });

    it('handles 50 concurrent resolve and retry operations smoothly', async () => {
      // Get an existing submission
      const subs = await submissionService.getSubmissionsByProject(testProjectId);
      const sub = subs[0];
      assert.ok(sub);

      // Set status to action_required
      await submissionService.updateSubmission(sub.id, {
        status: 'action_required',
        actionRequiredPayload: {
          type: 'captcha',
          captcha_type: 'turnstile',
          prompt: 'Solve Cloudflare Turnstile',
        },
      });

      // Concurrently resolve 50 times
      const resolveRequests = Array.from({ length: 50 }).map(() => {
        return server.inject({
          method: 'POST',
          url: `/api/v1/submissions/${sub.id}/resolve`,
          payload: {
            resolutionType: 'captcha_solved',
            captchaToken: 'token_sample_123',
            customPayload: { verified: true },
          },
        });
      });

      const resolveResponses = await Promise.all(resolveRequests);
      for (const res of resolveResponses) {
        assert.strictEqual(res.statusCode, 200);
        const body = JSON.parse(res.body);
        assert.strictEqual(body.success, true);
        assert.strictEqual(body.status, 'resumed');
      }

      // Concurrently retry 50 times
      const retryRequests = Array.from({ length: 50 }).map(() => {
        return server.inject({
          method: 'POST',
          url: `/api/v1/submissions/${sub.id}/retry`,
        });
      });

      const retryResponses = await Promise.all(retryRequests);
      for (const res of retryResponses) {
        assert.strictEqual(res.statusCode, 200);
        const body = JSON.parse(res.body);
        assert.strictEqual(body.success, true);
      }
    });
  });

  // ==========================================================================
  // SECTION 3: SSE REAL-TIME STREAMING CONCURRENCY & THROUGHPUT STRESS
  // ==========================================================================
  describe('3. Real-Time SSE Streaming Concurrency & Load Stress', () => {
    it('establishes 100 concurrent SSE connections and receives initial STATUS_SYNC events', async () => {
      const clientCount = 100;
      const sseConnections: http.ClientRequest[] = [];
      const syncReceived: Promise<boolean>[] = [];

      for (let i = 0; i < clientCount; i++) {
        let resolveSync: (v: boolean) => void;
        const syncPromise = new Promise<boolean>((resolve) => {
          resolveSync = resolve;
        });
        syncReceived.push(syncPromise);

        const req = http.request(
          `${serverUrl}/api/v1/submissions/stream`,
          { headers: { Accept: 'text/event-stream' } },
          (res) => {
            let buffer = '';
            res.on('data', (chunk) => {
              buffer += chunk.toString();
              if (buffer.includes('STATUS_SYNC')) {
                resolveSync(true);
              }
            });
          }
        );
        req.end();
        sseConnections.push(req);
      }

      const results = await Promise.all(syncReceived);
      assert.strictEqual(results.filter(Boolean).length, clientCount, 'All 100 SSE connections should receive STATUS_SYNC');
      assert.ok(realtimeService.sseClientCount >= clientCount);

      // Clean up connections
      for (const req of sseConnections) {
        req.destroy();
      }
      await new Promise((r) => setTimeout(r, 50));
    });

    it('broadcasts 1000 events to 25 connected SSE clients with zero dropped messages', async () => {
      const clientCount = 25;
      const totalEvents = 1000;
      const sseConnections: http.ClientRequest[] = [];
      const eventCounts = new Array(clientCount).fill(0);

      const readyPromises: Promise<void>[] = [];

      for (let i = 0; i < clientCount; i++) {
        let resolveReady: () => void;
        const readyPromise = new Promise<void>((r) => {
          resolveReady = r;
        });
        readyPromises.push(readyPromise);

        const req = http.request(
          `${serverUrl}/api/v1/submissions/stream`,
          { headers: { Accept: 'text/event-stream' } },
          (res) => {
            let buffer = '';
            res.on('data', (chunk) => {
              buffer += chunk.toString();
              let boundary: number;
              while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                const rawEvent = buffer.substring(0, boundary);
                buffer = buffer.substring(boundary + 2);
                const lines = rawEvent.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const parsed = JSON.parse(line.substring(6));
                      if (parsed.type === 'STATUS_SYNC') {
                        resolveReady();
                      } else if (parsed.type === 'HIGH_SPEED_PROBE') {
                        eventCounts[i]++;
                      }
                    } catch {
                      // ignore parse error
                    }
                  }
                }
              }
            });
          }
        );
        req.end();
        sseConnections.push(req);
      }

      try {
        // Wait for all clients to connect and receive initial sync
        await Promise.all(readyPromises);

        // Fire 1000 events rapidly
        const startTime = performance.now();
        for (let e = 0; e < totalEvents; e++) {
          realtimeService.broadcast({
            type: 'HIGH_SPEED_PROBE',
            payload: { seq: e, timestamp: Date.now() },
          });
        }

        // Wait for delivery
        await new Promise((r) => setTimeout(r, 400));
        const duration = performance.now() - startTime;

        // Verify every client received all 1000 events
        for (let i = 0; i < clientCount; i++) {
          assert.strictEqual(
            eventCounts[i],
            totalEvents,
            `SSE Client ${i} received ${eventCounts[i]}/${totalEvents} events`
          );
        }
      } finally {
        // Clean up
        for (const req of sseConnections) {
          req.destroy();
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    });

    it('enforces project channel isolation on SSE: project-filtered clients only receive events for their project', async () => {
      const projAEvents: any[] = [];
      const projBEvents: any[] = [];
      const globalEvents: any[] = [];

      let resolveReadyA: () => void;
      const readyA = new Promise<void>((r) => (resolveReadyA = r));
      let resolveReadyB: () => void;
      const readyB = new Promise<void>((r) => (resolveReadyB = r));
      let resolveReadyG: () => void;
      const readyG = new Promise<void>((r) => (resolveReadyG = r));

      const reqA = http.request(
        `${serverUrl}/api/v1/events/project-alpha`,
        { headers: { Accept: 'text/event-stream' } },
        (res) => {
          res.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const p = JSON.parse(line.substring(6));
                  if (p.type === 'STATUS_SYNC') resolveReadyA();
                  else projAEvents.push(p);
                } catch {}
              }
            }
          });
        }
      );
      reqA.end();

      const reqB = http.request(
        `${serverUrl}/api/v1/events/project-beta`,
        { headers: { Accept: 'text/event-stream' } },
        (res) => {
          res.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const p = JSON.parse(line.substring(6));
                  if (p.type === 'STATUS_SYNC') resolveReadyB();
                  else projBEvents.push(p);
                } catch {}
              }
            }
          });
        }
      );
      reqB.end();

      const reqG = http.request(
        `${serverUrl}/api/v1/submissions/stream`,
        { headers: { Accept: 'text/event-stream' } },
        (res) => {
          res.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const p = JSON.parse(line.substring(6));
                  if (p.type === 'STATUS_SYNC') resolveReadyG();
                  else globalEvents.push(p);
                } catch {}
              }
            }
          });
        }
      );
      reqG.end();

      await Promise.all([readyA, readyB, readyG]);

      // Emit event targeted to project-alpha
      realtimeService.emitStatusChange('sub-alpha-1', 'project-alpha', 'uneed', 'in_progress');
      // Emit event targeted to project-beta
      realtimeService.emitStatusChange('sub-beta-1', 'project-beta', 'saashub', 'published');

      await new Promise((r) => setTimeout(r, 100));

      // Assertions
      assert.strictEqual(projAEvents.length, 1);
      assert.strictEqual(projAEvents[0].payload.projectId, 'project-alpha');

      assert.strictEqual(projBEvents.length, 1);
      assert.strictEqual(projBEvents[0].payload.projectId, 'project-beta');

      assert.strictEqual(globalEvents.length, 2, 'Global client should receive both events');

      reqA.destroy();
      reqB.destroy();
      reqG.destroy();
      await new Promise((r) => setTimeout(r, 50));
    });

    it('resiliently handles abrupt client disconnects during active high-speed broadcasting without server crashing or leaking', async () => {
      const clientCount = 30;
      const connections: http.ClientRequest[] = [];
      const readyPromises: Promise<void>[] = [];

      for (let i = 0; i < clientCount; i++) {
        let resolveReady: () => void;
        const p = new Promise<void>((r) => (resolveReady = r));
        readyPromises.push(p);

        const req = http.request(
          `${serverUrl}/api/v1/submissions/stream`,
          { headers: { Accept: 'text/event-stream' } },
          (res) => {
            res.on('data', (chunk) => {
              if (chunk.toString().includes('STATUS_SYNC')) {
                resolveReady();
              }
            });
          }
        );
        req.end();
        connections.push(req);
      }

      await Promise.all(readyPromises);

      // Abruptly destroy half the connections mid-broadcast
      for (let i = 0; i < 15; i++) {
        connections[i].destroy();
      }

      // Broadcast 200 events while half the connections are destroyed
      for (let i = 0; i < 200; i++) {
        realtimeService.broadcast({
          type: 'DISCONNECT_STRESS',
          payload: { count: i },
        });
      }

      // Destroy remaining
      for (let i = 15; i < clientCount; i++) {
        connections[i].destroy();
      }

      await new Promise((r) => setTimeout(r, 100));

      // Server must remain healthy
      const healthRes = await server.inject({ method: 'GET', url: '/health' });
      assert.strictEqual(healthRes.statusCode, 200);
      assert.strictEqual(JSON.parse(healthRes.body).status, 'ok');
    });
  });

  // ==========================================================================
  // SECTION 4: WEBSOCKET CHANNELS CONCURRENCY & STREAMING STRESS
  // ==========================================================================
  describe('4. WebSocket Channels Concurrency & Real-Time Stress', () => {
    it('establishes 100 concurrent WebSocket connections and validates STATUS_SYNC handshake', async () => {
      const clientCount = 100;
      const wsClients: WebSocket[] = [];
      const syncPromises: Promise<boolean>[] = [];

      for (let i = 0; i < clientCount; i++) {
        let resolveSync: (v: boolean) => void;
        const p = new Promise<boolean>((r) => (resolveSync = r));
        syncPromises.push(p);

        const ws = new WebSocket(`ws://127.0.0.1:${serverPort}/ws`);
        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === 'STATUS_SYNC') {
              resolveSync(true);
            }
          } catch {}
        });
        wsClients.push(ws);
      }

      const results = await Promise.all(syncPromises);
      assert.strictEqual(results.filter(Boolean).length, clientCount);
      assert.ok(realtimeService.wsClientCount >= clientCount);

      // Close all WS
      for (const ws of wsClients) {
        ws.close();
      }
      await new Promise((r) => setTimeout(r, 100));
    });

    it('broadcasts 1000 events across 25 WebSocket clients with zero message loss', async () => {
      const clientCount = 25;
      const totalEvents = 1000;
      const wsClients: WebSocket[] = [];
      const messageCounts = new Array(clientCount).fill(0);
      const readyPromises: Promise<void>[] = [];

      for (let i = 0; i < clientCount; i++) {
        let resolveReady: () => void;
        const p = new Promise<void>((r) => (resolveReady = r));
        readyPromises.push(p);

        const ws = new WebSocket(`ws://127.0.0.1:${serverPort}/api/v1/submissions/ws`);
        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'STATUS_SYNC') {
              resolveReady();
            } else if (msg.type === 'WS_BURST_PROBE') {
              messageCounts[i]++;
            }
          } catch {}
        });
        wsClients.push(ws);
      }

      await Promise.all(readyPromises);

      // Rapidly broadcast 1000 messages
      for (let e = 0; e < totalEvents; e++) {
        realtimeService.broadcast({
          type: 'WS_BURST_PROBE',
          payload: { index: e, timestamp: Date.now() },
        });
      }

      // Wait for delivery
      await new Promise((r) => setTimeout(r, 400));

      for (let i = 0; i < clientCount; i++) {
        assert.strictEqual(
          messageCounts[i],
          totalEvents,
          `WS Client ${i} received ${messageCounts[i]}/${totalEvents} messages`
        );
      }

      for (const ws of wsClients) {
        ws.close();
      }
      await new Promise((r) => setTimeout(r, 100));
    });

    it('enforces project channel isolation on WebSockets with query parameter', async () => {
      const projAEvents: any[] = [];
      const projBEvents: any[] = [];
      const globalEvents: any[] = [];

      let resolveReadyA: () => void;
      const readyA = new Promise<void>((r) => (resolveReadyA = r));
      let resolveReadyB: () => void;
      const readyB = new Promise<void>((r) => (resolveReadyB = r));
      let resolveReadyG: () => void;
      const readyG = new Promise<void>((r) => (resolveReadyG = r));

      const wsA = new WebSocket(`ws://127.0.0.1:${serverPort}/ws?projectId=proj-ws-alpha`);
      wsA.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'STATUS_SYNC') resolveReadyA();
        else projAEvents.push(msg);
      });

      const wsB = new WebSocket(`ws://127.0.0.1:${serverPort}/ws?projectId=proj-ws-beta`);
      wsB.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'STATUS_SYNC') resolveReadyB();
        else projBEvents.push(msg);
      });

      const wsG = new WebSocket(`ws://127.0.0.1:${serverPort}/ws`);
      wsG.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'STATUS_SYNC') resolveReadyG();
        else globalEvents.push(msg);
      });

      await Promise.all([readyA, readyB, readyG]);

      // Emit targeted status changes
      realtimeService.emitStatusChange('sub-wsa-1', 'proj-ws-alpha', 'uneed', 'in_progress');
      realtimeService.emitStatusChange('sub-wsb-1', 'proj-ws-beta', 'saashub', 'action_required', {
        type: 'captcha',
      });

      await new Promise((r) => setTimeout(r, 100));

      assert.strictEqual(projAEvents.length, 1);
      assert.strictEqual(projAEvents[0].payload.projectId, 'proj-ws-alpha');

      assert.strictEqual(projBEvents.length, 1);
      assert.strictEqual(projBEvents[0].payload.projectId, 'proj-ws-beta');

      assert.strictEqual(globalEvents.length, 2);

      wsA.close();
      wsB.close();
      wsG.close();
      await new Promise((r) => setTimeout(r, 50));
    });

    it('handles abrupt client socket termination (terminate()) mid-broadcast without errors', async () => {
      const clientCount = 30;
      const wsClients: WebSocket[] = [];
      const readyPromises: Promise<void>[] = [];

      for (let i = 0; i < clientCount; i++) {
        let resolveReady: () => void;
        const p = new Promise<void>((r) => (resolveReady = r));
        readyPromises.push(p);

        const ws = new WebSocket(`ws://127.0.0.1:${serverPort}/ws`);
        ws.on('message', (raw) => {
          if (raw.toString().includes('STATUS_SYNC')) {
            resolveReady();
          }
        });
        wsClients.push(ws);
      }

      await Promise.all(readyPromises);

      // Abruptly terminate 15 sockets
      for (let i = 0; i < 15; i++) {
        wsClients[i].terminate();
      }

      // Broadcast 200 events while sockets are abruptly terminated
      for (let i = 0; i < 200; i++) {
        realtimeService.broadcast({
          type: 'TERMINATION_TEST',
          payload: { seq: i },
        });
      }

      // Terminate remaining
      for (let i = 15; i < clientCount; i++) {
        wsClients[i].terminate();
      }

      await new Promise((r) => setTimeout(r, 100));

      // Verify health
      const healthRes = await server.inject({ method: 'GET', url: '/health' });
      assert.strictEqual(healthRes.statusCode, 200);
      assert.strictEqual(JSON.parse(healthRes.body).status, 'ok');
    });
  });

  // ==========================================================================
  // SECTION 5: FULL END-TO-END REACTIVE LIFECYCLE CONCURRENCY INTEGRATION
  // ==========================================================================
  describe('5. Full End-to-End Reactive Lifecycle Concurrency Integration', () => {
    it('executes full reactive lifecycle: concurrent project creation, batch launch, real-time SSE + WS streaming, and intervention resolution', async () => {
      const projectCount = 5;
      const dirsPerProject = ['uneed', 'saashub', 'toolify', 'alternativeto', 'theresanaiforthat', 'indiehackers', 'producthunt'];
      const sseClients: http.ClientRequest[] = [];
      const wsClients: WebSocket[] = [];

      const sseEventsMap = new Map<string, any[]>();
      const wsEventsMap = new Map<string, any[]>();

      // 1. Concurrently create 5 projects
      const createPromises = Array.from({ length: projectCount }).map((_, idx) => {
        return server.inject({
          method: 'POST',
          url: '/api/v1/projects',
          payload: {
            name: `E2E Full Lifecycle SaaS ${idx}`,
            url: `https://e2e-saas-${idx}.io`,
            tagline: `Full lifecycle automation platform ${idx}`,
            description: `A complete SaaS solution for automated distribution and directory submissions ${idx}.`,
            category: 'Developer Tools',
          },
        });
      });

      const createResponses = await Promise.all(createPromises);
      const createdProjects = createResponses.map((res) => JSON.parse(res.body).project);
      assert.strictEqual(createdProjects.length, projectCount);

      // 2. Connect 1 SSE and 1 WS client for each project
      const readyPromises: Promise<void>[] = [];

      for (const proj of createdProjects) {
        sseEventsMap.set(proj.id, []);
        wsEventsMap.set(proj.id, []);

        let resolveSseReady: () => void;
        const sseReady = new Promise<void>((r) => (resolveSseReady = r));
        readyPromises.push(sseReady);

        const sseReq = http.request(
          `${serverUrl}/api/v1/events/${proj.id}`,
          { headers: { Accept: 'text/event-stream' } },
          (res) => {
            res.on('data', (chunk) => {
              const lines = chunk.toString().split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const p = JSON.parse(line.substring(6));
                    if (p.type === 'STATUS_SYNC') resolveSseReady();
                    else sseEventsMap.get(proj.id)?.push(p);
                  } catch {}
                }
              }
            });
          }
        );
        sseReq.end();
        sseClients.push(sseReq);

        let resolveWsReady: () => void;
        const wsReady = new Promise<void>((r) => (resolveWsReady = r));
        readyPromises.push(wsReady);

        const ws = new WebSocket(`ws://127.0.0.1:${serverPort}/ws?projectId=${proj.id}`);
        ws.on('message', (raw) => {
          try {
            const p = JSON.parse(raw.toString());
            if (p.type === 'STATUS_SYNC') resolveWsReady();
            else wsEventsMap.get(proj.id)?.push(p);
          } catch {}
        });
        wsClients.push(ws);
      }

      await Promise.all(readyPromises);

      // 3. Concurrently trigger batch launch across all 5 projects (5 x 7 = 35 submissions)
      const launchPromises = createdProjects.map((proj) => {
        return server.inject({
          method: 'POST',
          url: `/api/v1/projects/${proj.id}/launch`,
          payload: { directoryIds: dirsPerProject },
        });
      });

      const launchResponses = await Promise.all(launchPromises);
      for (const res of launchResponses) {
        assert.strictEqual(res.statusCode, 200);
        const body = JSON.parse(res.body);
        assert.strictEqual(body.enqueuedCount, dirsPerProject.length);
      }

      // 4. Simulate status transitions for all submissions: in_progress -> action_required -> resolve -> published
      for (const proj of createdProjects) {
        const subs = await submissionService.getSubmissionsByProject(proj.id);
        assert.strictEqual(subs.length, dirsPerProject.length);

        for (const sub of subs) {
          // Transition to in_progress
          await submissionService.updateSubmission(sub.id, { status: 'in_progress' });
          await submissionService.appendLog(sub.id, 'info', `Navigating to ${sub.directoryId} form`);

          // Transition to action_required
          await submissionService.updateSubmission(sub.id, {
            status: 'action_required',
            actionRequiredPayload: { type: 'captcha', prompt: 'Solve CAPTCHA' },
          });

          // Resolve action via REST endpoint
          const resolveRes = await server.inject({
            method: 'POST',
            url: `/api/v1/submissions/${sub.id}/resolve`,
            payload: {
              resolutionType: 'captcha_solved',
              captchaToken: 'token_abc_123',
            },
          });
          assert.strictEqual(resolveRes.statusCode, 200);

          // Transition to published
          await submissionService.updateSubmission(sub.id, {
            status: 'published',
            listingUrl: `https://${sub.directoryId}.com/software/${proj.name.toLowerCase().replace(/\s+/g, '-')}`,
            proofScreenshotUrl: `https://storage.supabase.co/proofs/${sub.id}.png`,
          });
        }
      }

      // Wait for all broadcasts to arrive
      await new Promise((r) => setTimeout(r, 300));

      // 5. Assert event delivery across all project streams
      for (const proj of createdProjects) {
        const sseEvents = sseEventsMap.get(proj.id) || [];
        const wsEvents = wsEventsMap.get(proj.id) || [];

        assert.ok(sseEvents.length > 0, `Project ${proj.id} received 0 SSE events`);
        assert.ok(wsEvents.length > 0, `Project ${proj.id} received 0 WS events`);

        // Check that all events in this channel belong exclusively to this project
        for (const ev of sseEvents) {
          assert.strictEqual(ev.payload.projectId, proj.id, `SSE event leaked from another project to ${proj.id}`);
        }
        for (const ev of wsEvents) {
          assert.strictEqual(ev.payload.projectId, proj.id, `WS event leaked from another project to ${proj.id}`);
        }
      }

      // Clean up clients
      for (const req of sseClients) req.destroy();
      for (const ws of wsClients) ws.close();
      await new Promise((r) => setTimeout(r, 100));
    });
  });
});
