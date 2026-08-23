import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../../packages/backend/dist/server.js';

describe('Verification Test', () => {
  it('instantiates fastify server', async () => {
    const server = await buildServer();
    assert.ok(server);
    const res = await server.inject({
      method: 'GET',
      url: '/health',
    });
    assert.strictEqual(res.statusCode, 200);
    await server.close();
  });
});
