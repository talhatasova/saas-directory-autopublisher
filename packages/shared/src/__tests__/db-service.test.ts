import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SupabaseDbService } from '../supabase/db-helper.js';
import { TypedSupabaseClient } from '../supabase/client.js';

function createMockSupabaseClient(mockData: {
  selectResult?: any;
  insertResult?: any;
  updateResult?: any;
  deleteError?: any;
}) {
  const queryBuilder: any = {
    select: () => queryBuilder,
    insert: () => queryBuilder,
    update: () => queryBuilder,
    delete: () => queryBuilder,
    eq: () => queryBuilder,
    order: () => queryBuilder,
    single: async () => ({
      data: mockData.insertResult || mockData.updateResult || mockData.selectResult,
      error: null,
    }),
  };

  // Promise resolution for queries without .single()
  queryBuilder.then = (resolve: (val: any) => void) => {
    resolve({
      data: Array.isArray(mockData.selectResult) ? mockData.selectResult : [mockData.selectResult],
      error: mockData.deleteError || null,
    });
  };

  const mockClient: any = {
    from: (_table: string) => queryBuilder,
  };

  return mockClient as TypedSupabaseClient;
}

describe('SupabaseDbService Operations', () => {
  it('should fetch project and map to entity', async () => {
    const mockRow = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'EchoPulse AI',
      url: 'https://echopulse.ai',
      tagline: 'AI Feedback Analyzer',
      description: 'Customer feedback analysis and sentiment engine.',
      short_description: 'AI sentiment tool',
      category: 'AI Tools',
      tags: ['ai', 'analytics'],
      pricing_model: 'freemium' as const,
      logo_url: 'https://echopulse.ai/logo.png',
      screenshot_urls: [],
      metadata: {},
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const client = createMockSupabaseClient({ selectResult: mockRow });
    const service = new SupabaseDbService(client);
    const project = await service.getProjectById('11111111-1111-1111-1111-111111111111');

    assert.ok(project);
    assert.strictEqual(project.name, 'EchoPulse AI');
    assert.strictEqual(project.userId, '00000000-0000-0000-0000-000000000001');
    assert.strictEqual(project.pricingModel, 'freemium');
  });

  it('should create a project and return domain entity', async () => {
    const createdRow = {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'DevMetric Pro',
      url: 'https://devmetric.pro',
      tagline: 'Git DORA Analytics',
      description: 'Git velocity and PR cycle time analytics platform.',
      short_description: null,
      category: 'Developer Tools',
      tags: ['git', 'analytics'],
      pricing_model: 'subscription' as const,
      logo_url: null,
      screenshot_urls: [],
      metadata: {},
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const client = createMockSupabaseClient({ insertResult: createdRow });
    const service = new SupabaseDbService(client);

    const project = await service.createProject({
      userId: '00000000-0000-0000-0000-000000000001',
      name: 'DevMetric Pro',
      url: 'https://devmetric.pro',
      tagline: 'Git DORA Analytics',
      description: 'Git velocity and PR cycle time analytics platform.',
      category: 'Developer Tools',
      tags: ['git', 'analytics'],
      pricingModel: 'subscription',
      screenshotUrls: [],
      metadata: {},
    });

    assert.ok(project);
    assert.strictEqual(project.id, '22222222-2222-2222-2222-222222222222');
    assert.strictEqual(project.name, 'DevMetric Pro');
  });

  it('should create a submission and return domain entity', async () => {
    const submissionRow = {
      id: 'a1111111-1111-1111-1111-111111111111',
      project_id: '11111111-1111-1111-1111-111111111111',
      directory_id: 'alternativeto',
      user_id: '00000000-0000-0000-0000-000000000001',
      status: 'queued' as const,
      job_id: 'job_001',
      listing_url: null,
      proof_screenshot_url: null,
      logs: [],
      error_message: null,
      error_code: null,
      retry_count: 0,
      action_required_payload: null,
      started_at: null,
      completed_at: null,
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const client = createMockSupabaseClient({ insertResult: submissionRow });
    const service = new SupabaseDbService(client);

    const submission = await service.createSubmission({
      projectId: '11111111-1111-1111-1111-111111111111',
      directoryId: 'alternativeto',
      userId: '00000000-0000-0000-0000-000000000001',
      status: 'queued',
      jobId: 'job_001',
      listingUrl: null,
      proofScreenshotUrl: null,
      errorMessage: null,
      errorCode: null,
      retryCount: 0,
      actionRequiredPayload: null,
      startedAt: null,
      completedAt: null,
    });

    assert.ok(submission);
    assert.strictEqual(submission.id, 'a1111111-1111-1111-1111-111111111111');
    assert.strictEqual(submission.status, 'queued');
    assert.strictEqual(submission.directoryId, 'alternativeto');
  });

  it('should update submission status and details', async () => {
    const updatedRow = {
      id: 'a1111111-1111-1111-1111-111111111111',
      project_id: '11111111-1111-1111-1111-111111111111',
      directory_id: 'alternativeto',
      user_id: '00000000-0000-0000-0000-000000000001',
      status: 'published' as const,
      job_id: 'job_001',
      listing_url: 'https://alternativeto.net/software/echopulse',
      proof_screenshot_url: 'https://supabase.co/proof.png',
      logs: [],
      error_message: null,
      error_code: null,
      retry_count: 0,
      action_required_payload: null,
      started_at: '2026-08-23T18:00:00.000Z',
      completed_at: '2026-08-23T18:00:15.000Z',
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T18:00:15.000Z',
    };

    const client = createMockSupabaseClient({ updateResult: updatedRow });
    const service = new SupabaseDbService(client);

    const updated = await service.updateSubmissionStatus(
      'a1111111-1111-1111-1111-111111111111',
      'published',
      {
        listingUrl: 'https://alternativeto.net/software/echopulse',
        proofScreenshotUrl: 'https://supabase.co/proof.png',
        completedAt: '2026-08-23T18:00:15.000Z',
      }
    );

    assert.ok(updated);
    assert.strictEqual(updated.status, 'published');
    assert.strictEqual(updated.listingUrl, 'https://alternativeto.net/software/echopulse');
    assert.strictEqual(updated.proofScreenshotUrl, 'https://supabase.co/proof.png');
  });
});
