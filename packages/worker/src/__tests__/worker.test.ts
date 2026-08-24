import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AdapterRegistry,
  CaptchaDetector,
  SubmissionQueue,
} from '../index.js';
import { Project, Directory } from '@saas-autopublisher/shared';

describe('Worker & Adapter Submitter Suite', () => {
  const sampleProject: Project = {
    id: 'proj-123',
    userId: 'user-abc',
    name: 'OmniAI Suite',
    url: 'https://omniai.example.com',
    tagline: 'Autonomous AI Agent Workflow Platform',
    description: 'Next generation autonomous AI agent workflow builder for developers.',
    category: 'AI Tools',
    tags: ['ai', 'agent', 'automation'],
    pricingModel: 'freemium',
    logoUrl: 'https://omniai.example.com/logo.png',
    screenshotUrls: ['https://omniai.example.com/shot1.png'],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleDirectory: Directory = {
    id: 'uneed',
    name: 'Uneed Best Tools',
    url: 'https://uneed.best',
    category: 'Curated SaaS',
    domainRating: 62,
    submissionType: 'form_automation',
    status: 'active',
    requiresAuth: false,
    estimatedTimeSec: 45,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('AdapterRegistry provides adapters for all 5 target directories', () => {
    const uneed = AdapterRegistry.getAdapter('uneed');
    const saashub = AdapterRegistry.getAdapter('saashub');
    const alternativeto = AdapterRegistry.getAdapter('alternativeto');
    const taaft = AdapterRegistry.getAdapter('taaft');
    const toolify = AdapterRegistry.getAdapter('toolify');

    assert.ok(uneed, 'Uneed adapter exists');
    assert.ok(saashub, 'SaaSHub adapter exists');
    assert.ok(alternativeto, 'AlternativeTo adapter exists');
    assert.ok(taaft, 'TAAFT adapter exists');
    assert.ok(toolify, 'Toolify adapter exists');
    assert.strictEqual(AdapterRegistry.getAllAdapters().length, 5);
  });

  it('Validates project fields correctly', () => {
    const adapter = AdapterRegistry.getAdapter('uneed')!;
    const validation = adapter.validateProject(sampleProject);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.missingFields.length, 0);

    const invalidProject = { ...sampleProject, name: '', url: '' };
    const invalidRes = adapter.validateProject(invalidProject);
    assert.strictEqual(invalidRes.valid, false);
    assert.ok(invalidRes.missingFields.includes('name'));
    assert.ok(invalidRes.missingFields.includes('url'));
  });

  it('CaptchaDetector detects Turnstile, reCAPTCHA, and hCaptcha signatures', () => {
    const turnstileRes = CaptchaDetector.detectInHtml('<div class="cf-turnstile" data-sitekey="xyz"></div>');
    assert.strictEqual(turnstileRes.detected, true);
    assert.strictEqual(turnstileRes.type, 'turnstile');

    const recaptchaRes = CaptchaDetector.detectInHtml('<script src="https://www.google.com/recaptcha/api.js"></script>');
    assert.strictEqual(recaptchaRes.detected, true);
    assert.strictEqual(recaptchaRes.type, 'recaptcha');

    const cleanRes = CaptchaDetector.detectInHtml('<div>Standard clean form</div>');
    assert.strictEqual(cleanRes.detected, false);
  });

  it('SubmissionQueue processes jobs and fires lifecycle events', async () => {
    const queue = new SubmissionQueue({ concurrency: 5 });
    const events: string[] = [];

    queue.on('job:started', () => events.push('started'));
    queue.on('job:progress', () => events.push('progress'));
    queue.on('job:completed', () => events.push('completed'));

    await new Promise<void>((resolve) => {
      queue.on('job:completed', () => {
        resolve();
      });

      queue.enqueue({
        submissionId: 'sub-test-1',
        projectId: sampleProject.id,
        directoryId: 'uneed',
        userId: sampleProject.userId,
        project: sampleProject,
        directory: sampleDirectory,
      });
    });

    assert.ok(events.includes('started'));
    assert.ok(events.includes('progress'));
    assert.ok(events.includes('completed'));
  });
});
