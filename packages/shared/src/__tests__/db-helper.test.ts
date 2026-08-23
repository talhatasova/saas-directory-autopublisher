import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mapDirectoryRowToEntity,
  mapProjectEntityToRow,
  mapProjectRowToEntity,
  mapSubmissionRowToEntity,
  mapUserRowToEntity,
} from '../supabase/db-helper.js';
import { Database } from '../types/database.types.js';

type UserRow = Database['public']['Tables']['users']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type DirectoryRow = Database['public']['Tables']['directories']['Row'];
type SubmissionRow = Database['public']['Tables']['submissions']['Row'];

describe('Database Helper and Mappers', () => {
  it('should map UserRow to User domain entity correctly', () => {
    const row: UserRow = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'alex@example.com',
      full_name: 'Alex Founder',
      avatar_url: 'https://example.com/avatar.png',
      plan: 'pro',
      submissions_quota: 100,
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const entity = mapUserRowToEntity(row);
    assert.strictEqual(entity.id, row.id);
    assert.strictEqual(entity.email, row.email);
    assert.strictEqual(entity.fullName, row.full_name);
    assert.strictEqual(entity.avatarUrl, row.avatar_url);
    assert.strictEqual(entity.plan, 'pro');
    assert.strictEqual(entity.submissionsQuota, 100);
  });

  it('should map ProjectRow to Project domain entity and vice-versa', () => {
    const row: ProjectRow = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'EchoPulse AI',
      url: 'https://echopulse.ai',
      tagline: 'AI Feedback Analyzer',
      description: 'Automated sentiment analysis for customer feedback.',
      short_description: 'AI sentiment tool',
      category: 'AI Tools',
      tags: ['ai', 'analytics'],
      pricing_model: 'freemium',
      logo_url: 'https://echopulse.ai/logo.png',
      screenshot_urls: ['https://echopulse.ai/screen.png'],
      metadata: { og_title: 'EchoPulse AI' },
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const entity = mapProjectRowToEntity(row);
    assert.strictEqual(entity.id, row.id);
    assert.strictEqual(entity.userId, row.user_id);
    assert.strictEqual(entity.name, row.name);
    assert.strictEqual(entity.tagline, row.tagline);
    assert.strictEqual(entity.shortDescription, row.short_description);
    assert.deepStrictEqual(entity.tags, ['ai', 'analytics']);
    assert.strictEqual(entity.pricingModel, 'freemium');

    const mappedBack = mapProjectEntityToRow(entity);
    assert.strictEqual(mappedBack.id, row.id);
    assert.strictEqual(mappedBack.user_id, row.user_id);
    assert.strictEqual(mappedBack.name, row.name);
    assert.strictEqual(mappedBack.short_description, row.short_description);
    assert.strictEqual(mappedBack.pricing_model, row.pricing_model);
  });

  it('should map DirectoryRow to Directory domain entity correctly', () => {
    const row: DirectoryRow = {
      id: 'alternativeto',
      name: 'AlternativeTo',
      url: 'https://alternativeto.net',
      category: 'General SaaS',
      domain_rating: 81,
      submission_type: 'form_automation',
      status: 'active',
      requires_auth: false,
      estimated_time_sec: 35,
      config: { form_url: 'https://alternativeto.net/software/add/' },
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const entity = mapDirectoryRowToEntity(row);
    assert.strictEqual(entity.id, 'alternativeto');
    assert.strictEqual(entity.domainRating, 81);
    assert.strictEqual(entity.submissionType, 'form_automation');
    assert.strictEqual(entity.estimatedTimeSec, 35);
  });

  it('should map SubmissionRow to Submission domain entity correctly', () => {
    const row: SubmissionRow = {
      id: 'a1111111-1111-1111-1111-111111111111',
      project_id: '11111111-1111-1111-1111-111111111111',
      directory_id: 'alternativeto',
      user_id: '00000000-0000-0000-0000-000000000001',
      status: 'published',
      job_id: 'job_123',
      listing_url: 'https://alternativeto.net/software/echopulse',
      proof_screenshot_url: 'https://supabase.co/storage/proof.png',
      logs: [
        { timestamp: '2026-08-23T18:00:00.000Z', level: 'info', message: 'Form submitted' },
      ],
      error_message: null,
      error_code: null,
      retry_count: 0,
      action_required_payload: null,
      started_at: '2026-08-23T18:00:00.000Z',
      completed_at: '2026-08-23T18:00:15.000Z',
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const entity = mapSubmissionRowToEntity(row);
    assert.strictEqual(entity.id, row.id);
    assert.strictEqual(entity.status, 'published');
    assert.strictEqual(entity.listingUrl, 'https://alternativeto.net/software/echopulse');
    assert.strictEqual(entity.logs.length, 1);
    assert.strictEqual(entity.logs[0]?.message, 'Form submitted');
  });
});
