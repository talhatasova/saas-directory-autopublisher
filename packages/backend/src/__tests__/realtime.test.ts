import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RealtimeService } from '../services/index.js';

describe('Realtime Service Suite', () => {
  it('emits status changes and logs across event listeners', async () => {
    const realtime = new RealtimeService();

    await new Promise<void>((resolve) => {
      realtime.on('realtime:event', (event) => {
        if (event.type === 'STATUS_CHANGE') {
          assert.strictEqual(event.payload.submissionId, 'sub-1');
          assert.strictEqual(event.payload.status, 'in_progress');
          resolve();
        }
      });

      realtime.emitStatusChange('sub-1', 'proj-1', 'uneed', 'in_progress');
    });
  });

  it('broadcasts intervention signals correctly', async () => {
    const realtime = new RealtimeService();

    await new Promise<void>((resolve) => {
      realtime.on('realtime:event', (event) => {
        if (event.type === 'INTERVENTION_REQUIRED') {
          assert.strictEqual(event.payload.submissionId, 'sub-2');
          assert.strictEqual(event.payload.actionRequired.type, 'recaptcha');
          resolve();
        }
      });

      realtime.emitIntervention('sub-2', 'proj-1', 'saashub', {
        type: 'recaptcha',
        prompt: 'Please solve the captcha challenge',
      });
    });
  });
});
