import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { projectService, submissionService } from '../services/index.js';

describe('Submission Service Suite', () => {
  let projectId: string;

  beforeEach(async () => {
    projectService.clear();
    submissionService.clear();

    const project = await projectService.createProject('user-1', {
      name: 'PulseMetrics',
      url: 'https://pulsemetrics.io',
      tagline: 'Real-time SaaS analytics',
      description: 'Comprehensive financial dashboard for indie founders.',
    });
    projectId = project.id;
  });

  it('enqueues batch submissions across selected directories', async () => {
    const batch = await submissionService.launchBatch(projectId, ['uneed', 'saashub', 'toolify']);

    assert.strictEqual(batch.projectId, projectId);
    assert.strictEqual(batch.enqueuedCount, 3);
    assert.strictEqual(batch.submissions.length, 3);

    for (const sub of batch.submissions) {
      assert.strictEqual(sub.status, 'queued');
      assert.ok(sub.jobId);
      assert.strictEqual(sub.logs.length, 1);
    }
  });

  it('retrieves submissions with directory metadata', async () => {
    await submissionService.launchBatch(projectId, ['uneed', 'toolify']);

    const enriched = await submissionService.getSubmissionsByProject(projectId);
    assert.strictEqual(enriched.length, 2);
    assert.ok(enriched[0]?.directory.name);
    assert.ok(enriched[0]?.directory.domainRating);
  });

  it('updates submission status and result URLs', async () => {
    const batch = await submissionService.launchBatch(projectId, ['toolify']);
    const subId = batch.submissions[0]!.id;

    const updated = await submissionService.updateSubmission(subId, {
      status: 'published',
      listingUrl: 'https://www.toolify.ai/tool/pulsemetrics',
      proofScreenshotUrl: 'https://storage.supabase.co/proofs/toolify.png',
    });

    assert.ok(updated);
    assert.strictEqual(updated.status, 'published');
    assert.strictEqual(updated.listingUrl, 'https://www.toolify.ai/tool/pulsemetrics');
    assert.strictEqual(updated.proofScreenshotUrl, 'https://storage.supabase.co/proofs/toolify.png');
  });

  it('retries failed submission', async () => {
    const batch = await submissionService.launchBatch(projectId, ['uneed']);
    const subId = batch.submissions[0]!.id;

    await submissionService.updateSubmission(subId, {
      status: 'failed',
      errorMessage: 'Network timeout',
    });

    const retried = await submissionService.retrySubmission(subId);
    assert.ok(retried);
    assert.strictEqual(retried.status, 'queued');
    assert.strictEqual(retried.errorMessage, null);
    assert.strictEqual(retried.retryCount, 1);
  });

  it('resolves action_required challenge intervention', async () => {
    const batch = await submissionService.launchBatch(projectId, ['saashub']);
    const subId = batch.submissions[0]!.id;

    await submissionService.updateSubmission(subId, {
      status: 'action_required',
      actionRequiredPayload: {
        type: 'turnstile',
        message: 'Cloudflare turnstile challenge detected',
      },
    });

    const resolution = await submissionService.resolveAction(subId, {
      resolutionType: 'captcha_solved',
      captchaToken: 'token_sample_123',
    });

    assert.strictEqual(resolution.success, true);
    assert.strictEqual(resolution.status, 'resumed');

    const sub = await submissionService.getSubmissionById(subId);
    assert.ok(sub);
    assert.strictEqual(sub.status, 'in_progress');
    assert.strictEqual(sub.actionRequiredPayload, null);
  });
});
