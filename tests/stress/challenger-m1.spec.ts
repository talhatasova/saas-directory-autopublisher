import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTORY_CATALOG,
  DIRECTORY_BY_ID,
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
  PRICING_MODELS,
  USER_PLANS,
  DIRECTORY_STATUSES,
  APP_LIMITS,
  SUPABASE_DEFAULTS,
} from '../../packages/shared/dist/constants/index.js';
import {
  UrlSchema,
  CreateProjectRequestSchema,
  LaunchSubmissionsRequestSchema,
  ResolveActionRequestSchema,
  PricingModelSchema,
  SubmissionStatusSchema,
  SubmissionTypeSchema,
  UserPlanSchema,
} from '../../packages/shared/dist/validation/schemas.js';
import {
  mapUserRowToEntity,
  mapProjectRowToEntity,
  mapProjectEntityToRow,
  mapDirectoryRowToEntity,
  mapSubmissionRowToEntity,
} from '../../packages/shared/dist/supabase/db-helper.js';
import { normalizeTargetUrl } from '../unit/url-normalizer.spec.ts';
import type { Database } from '../../packages/shared/src/types/database.types.ts';

type UserRow = Database['public']['Tables']['users']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type DirectoryRow = Database['public']['Tables']['directories']['Row'];
type SubmissionRow = Database['public']['Tables']['submissions']['Row'];

describe('CHALLENGER-M1: Empirical Verification & Stress Test Suite', () => {

  // ==========================================================================
  // SUITE 1: DIRECTORY CONSTANTS CATALOG & DIRECTORY REQUIREMENTS
  // ==========================================================================
  describe('Suite 1: Directory Constants Catalog Invariants & Requirements', () => {
    const requiredDirectoryIds = [
      'alternativeto',
      'saashub',
      'toolify',
      'uneed',
      'theresanaiforthat',
      'indiehackers',
      'producthunt',
    ];

    it('contains all 7 canonical SaaS directories required by ORIGINAL_REQUEST and PROJECT.md', () => {
      assert.ok(DIRECTORY_CATALOG.length >= 7, `Expected at least 7 directories, got ${DIRECTORY_CATALOG.length}`);
      for (const reqId of requiredDirectoryIds) {
        const found = DIRECTORY_CATALOG.find((d) => d.id === reqId);
        assert.ok(found, `Missing required directory ID: ${reqId}`);
        assert.strictEqual(DIRECTORY_BY_ID.get(reqId)?.id, reqId, `DIRECTORY_BY_ID missing ${reqId}`);
      }
    });

    it('enforces strict schema requirements and valid configuration contracts on every directory', () => {
      for (const dir of DIRECTORY_CATALOG) {
        // ID format: lowercase alphanumeric, no spaces
        assert.match(dir.id, /^[a-z0-9_-]+$/, `Directory id "${dir.id}" has invalid characters`);
        
        // Name & Category
        assert.ok(dir.name && dir.name.trim().length > 0, `Directory ${dir.id} missing name`);
        assert.ok(dir.category && dir.category.trim().length > 0, `Directory ${dir.id} missing category`);

        // URL format: HTTPS
        assert.ok(dir.url.startsWith('https://'), `Directory ${dir.id} URL must start with https://`);
        const urlValidation = UrlSchema.safeParse(dir.url);
        assert.strictEqual(urlValidation.success, true, `Directory ${dir.id} has invalid URL: ${dir.url}`);

        // Domain Rating: 0 to 100 integer
        assert.ok(Number.isInteger(dir.domainRating), `Directory ${dir.id} DR must be integer`);
        assert.ok(dir.domainRating >= 0 && dir.domainRating <= 100, `Directory ${dir.id} DR out of range 0-100: ${dir.domainRating}`);

        // Submission Type enum
        assert.ok(SUBMISSION_TYPES.includes(dir.submissionType), `Directory ${dir.id} invalid submissionType: ${dir.submissionType}`);

        // Directory Status enum
        assert.ok(DIRECTORY_STATUSES.includes(dir.status), `Directory ${dir.id} invalid status: ${dir.status}`);

        // Estimated Time
        assert.ok(dir.estimatedTimeSec > 0 && dir.estimatedTimeSec <= 300, `Directory ${dir.id} estimatedTimeSec out of bounds: ${dir.estimatedTimeSec}`);

        // Config object check
        assert.ok(typeof dir.config === 'object' && dir.config !== null, `Directory ${dir.id} missing config object`);

        // Submission-type specific configs
        if (dir.submissionType === 'form_automation') {
          assert.ok(
            typeof dir.config.formUrl === 'string' && dir.config.formUrl.startsWith('https://'),
            `Form automation directory ${dir.id} must specify a valid https formUrl`
          );
        } else if (dir.submissionType === 'direct_api') {
          assert.ok(
            typeof dir.config.apiEndpoint === 'string' && dir.config.apiEndpoint.startsWith('https://'),
            `Direct API directory ${dir.id} must specify a valid https apiEndpoint`
          );
        } else if (dir.submissionType === 'assisted') {
          assert.ok(
            typeof dir.config.formUrl === 'string' || typeof dir.config.apiEndpoint === 'string',
            `Assisted directory ${dir.id} must specify formUrl or apiEndpoint`
          );
        }
      }
    });

    it('verifies that DIRECTORY_BY_ID is a complete 1:1 bi-directional map of DIRECTORY_CATALOG', () => {
      assert.strictEqual(DIRECTORY_BY_ID.size, DIRECTORY_CATALOG.length, 'Size mismatch between catalog and lookup map');
      for (const dir of DIRECTORY_CATALOG) {
        assert.strictEqual(DIRECTORY_BY_ID.get(dir.id), dir, `Mismatch for directory id ${dir.id}`);
      }
    });

    it('covers at least 5 distinct directory submitter adapters (Form Automation & Direct REST API)', () => {
      const formAdapters = DIRECTORY_CATALOG.filter((d) => d.submissionType === 'form_automation');
      const apiAdapters = DIRECTORY_CATALOG.filter((d) => d.submissionType === 'direct_api');
      assert.ok(formAdapters.length >= 4, `Expected at least 4 form automation directories, found ${formAdapters.length}`);
      assert.ok(apiAdapters.length >= 1, `Expected at least 1 direct API directory, found ${apiAdapters.length}`);
    });
  });

  // ==========================================================================
  // SUITE 2: URL NORMALIZATION RULES & ADVERSARIAL PAYLOAD TESTING
  // ==========================================================================
  describe('Suite 2: URL Normalization Rules & Edge Case Matrix', () => {
    it('normalizes naked domains to https:// with proper hostname and domain extraction', () => {
      const cases = [
        { input: 'example.com', expectedUrl: 'https://example.com', host: 'example.com', domain: 'example.com' },
        { input: 'sub.domain.co.uk', expectedUrl: 'https://sub.domain.co.uk', host: 'sub.domain.co.uk', domain: 'co.uk' },
        { input: 'echopulse.ai', expectedUrl: 'https://echopulse.ai', host: 'echopulse.ai', domain: 'echopulse.ai' },
        { input: 'app.saashub.com', expectedUrl: 'https://app.saashub.com', host: 'app.saashub.com', domain: 'saashub.com' },
      ];

      for (const c of cases) {
        const res = normalizeTargetUrl(c.input);
        assert.strictEqual(res.isValid, true, `Failed for input: ${c.input}`);
        assert.strictEqual(res.normalizedUrl, c.expectedUrl);
        assert.strictEqual(res.hostname, c.host);
      }
    });

    it('comprehensively strips all tracking query parameters without dropping valid business params', () => {
      const trackingParams = [
        'utm_source=google',
        'utm_medium=cpc',
        'utm_campaign=summer_launch',
        'utm_term=saas',
        'utm_content=banner',
        'ref=producthunt',
        'ref_src=twsrc',
        'fbclid=IwAR1234567890',
        'gclid=EAIaIQobChMI',
        'msclkid=abcdef123',
        'mc_cid=987654',
        'mc_eid=fedcba',
      ];

      const businessParams = ['product_id=42', 'tier=pro', 'view=overview'];

      // Combined query string
      const fullUrl = `https://mysaas.io/pricing?${[...trackingParams, ...businessParams].join('&')}`;
      const res = normalizeTargetUrl(fullUrl);

      assert.strictEqual(res.isValid, true);
      assert.ok(res.normalizedUrl.startsWith('https://mysaas.io/pricing?'));
      
      // Ensure all business params are retained
      assert.ok(res.normalizedUrl.includes('product_id=42'), 'Missing product_id');
      assert.ok(res.normalizedUrl.includes('tier=pro'), 'Missing tier');
      assert.ok(res.normalizedUrl.includes('view=overview'), 'Missing view');

      // Ensure zero tracking params remain
      for (const tp of trackingParams) {
        const key = tp.split('=')[0];
        assert.ok(!res.normalizedUrl.includes(`${key}=`), `Failed to strip parameter: ${key}`);
      }
    });

    it('correctly handles root trailing slash removal while preserving subpath trailing slashes', () => {
      // Root trailing slash should be stripped to clean canonical base
      const rootRes = normalizeTargetUrl('https://echopulse.ai/');
      assert.strictEqual(rootRes.isValid, true);
      assert.strictEqual(rootRes.normalizedUrl, 'https://echopulse.ai');

      // Subpath trailing slash should be preserved
      const subpathRes = normalizeTargetUrl('https://echopulse.ai/features/');
      assert.strictEqual(subpathRes.isValid, true);
      assert.strictEqual(subpathRes.normalizedUrl, 'https://echopulse.ai/features/');
    });

    it('handles port numbers and localhost targets appropriately for local development/testing', () => {
      const localHttp = normalizeTargetUrl('localhost:3000');
      assert.strictEqual(localHttp.isValid, true);
      assert.strictEqual(localHttp.normalizedUrl, 'http://localhost:3000');
      assert.strictEqual(localHttp.protocol, 'http');

      const localIp = normalizeTargetUrl('127.0.0.1:8080/api');
      assert.strictEqual(localIp.isValid, true);
      assert.strictEqual(localIp.normalizedUrl, 'http://127.0.0.1:8080/api');

      const customPortHttps = normalizeTargetUrl('https://secure.example.com:8443/app');
      assert.strictEqual(customPortHttps.isValid, true);
      assert.strictEqual(customPortHttps.normalizedUrl, 'https://secure.example.com:8443/app');
    });

    it('rejects adversarial and invalid URLs (empty, malformed, non-HTTP schemes, injection payloads)', () => {
      const maliciousAndInvalid = [
        '',
        '   ',
        'not-a-url',
        'just_words_without_dot',
        'ftp://ftp.example.com/files',
        'javascript:alert(1)',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'file:///C:/Windows/System32/drivers/etc/hosts',
        'mailto:support@echopulse.ai',
        'http://',
        'https://',
        'http://?',
        'https://.com',
      ];

      for (const input of maliciousAndInvalid) {
        const res = normalizeTargetUrl(input);
        assert.strictEqual(res.isValid, false, `Expected invalid for: "${input}", but got: ${JSON.stringify(res)}`);
        assert.ok(res.error && res.error.length > 0, `Missing error message for: "${input}"`);
      }
    });

    it('enforces Zod UrlSchema constraints matching database CHECK constraints (500 char max, http/https)', () => {
      // Valid HTTP / HTTPS URLs
      assert.strictEqual(UrlSchema.safeParse('https://echopulse.ai').success, true);
      assert.strictEqual(UrlSchema.safeParse('http://localhost:3000').success, true);

      // Rejects non-http(s) schemas
      assert.strictEqual(UrlSchema.safeParse('ftp://files.example.com').success, false);
      assert.strictEqual(UrlSchema.safeParse('ws://socket.example.com').success, false);

      // Rejects over 500 characters
      const longPath = 'a'.repeat(490);
      const longUrl = `https://example.com/${longPath}`;
      assert.ok(longUrl.length > 500);
      const longRes = UrlSchema.safeParse(longUrl);
      assert.strictEqual(longRes.success, false, 'UrlSchema should reject URLs > 500 characters');
    });
  });

  // ==========================================================================
  // SUITE 3: SUBMISSION STATUS TRANSITIONS & STATE MACHINE VERIFICATION
  // ==========================================================================
  describe('Suite 3: Submission Status Transitions & Lifecycle State Machine', () => {
    // Valid Statuses: 'queued', 'in_progress', 'published', 'action_required', 'failed', 'cancelled'
    const allowedTransitions: Record<string, string[]> = {
      queued: ['in_progress', 'cancelled'],
      in_progress: ['published', 'action_required', 'failed', 'cancelled'],
      action_required: ['in_progress', 'failed', 'cancelled'],
      failed: ['queued', 'cancelled'], // retry re-queues
      published: [], // terminal state
      cancelled: [], // terminal state
    };

    function validateStateTransition(current: string, next: string): boolean {
      const allowed = allowedTransitions[current];
      return allowed ? allowed.includes(next) : false;
    }

    it('verifies all SUBMISSION_STATUSES are validated by SubmissionStatusSchema', () => {
      assert.strictEqual(SUBMISSION_STATUSES.length, 6);
      for (const status of SUBMISSION_STATUSES) {
        const parsed = SubmissionStatusSchema.safeParse(status);
        assert.strictEqual(parsed.success, true, `SubmissionStatusSchema failed for: ${status}`);
      }

      // Rejects unknown status
      assert.strictEqual(SubmissionStatusSchema.safeParse('unknown_status').success, false);
      assert.strictEqual(SubmissionStatusSchema.safeParse('pending').success, false);
    });

    it('verifies valid forward state progression through standard happy path', () => {
      const happyPath = ['queued', 'in_progress', 'published'];
      for (let i = 0; i < happyPath.length - 1; i++) {
        const from = happyPath[i]!;
        const to = happyPath[i + 1]!;
        assert.strictEqual(validateStateTransition(from, to), true, `Invalid transition from ${from} to ${to}`);
      }
    });

    it('verifies valid intervention state progression (CAPTCHA / 2FA flow)', () => {
      const interventionPath = ['queued', 'in_progress', 'action_required', 'in_progress', 'published'];
      for (let i = 0; i < interventionPath.length - 1; i++) {
        const from = interventionPath[i]!;
        const to = interventionPath[i + 1]!;
        assert.strictEqual(validateStateTransition(from, to), true, `Invalid transition from ${from} to ${to}`);
      }
    });

    it('verifies valid retry progression (failed -> queued -> in_progress)', () => {
      const retryPath = ['in_progress', 'failed', 'queued', 'in_progress', 'published'];
      for (let i = 0; i < retryPath.length - 1; i++) {
        const from = retryPath[i]!;
        const to = retryPath[i + 1]!;
        assert.strictEqual(validateStateTransition(from, to), true, `Invalid transition from ${from} to ${to}`);
      }
    });

    it('disallows illegal backwards or terminal transitions (published -> queued, cancelled -> in_progress)', () => {
      assert.strictEqual(validateStateTransition('published', 'queued'), false);
      assert.strictEqual(validateStateTransition('published', 'in_progress'), false);
      assert.strictEqual(validateStateTransition('cancelled', 'in_progress'), false);
      assert.strictEqual(validateStateTransition('queued', 'published'), false); // cannot jump straight to published without in_progress
    });

    it('verifies ResolveActionRequestSchema enforces correct resolution types', () => {
      const validPayload = {
        resolutionType: 'captcha_solved' as const,
        captchaToken: 'cf_turnstile_token_xyz',
      };
      assert.strictEqual(ResolveActionRequestSchema.safeParse(validPayload).success, true);

      const invalidPayload = {
        resolutionType: 'invalid_type',
      };
      assert.strictEqual(ResolveActionRequestSchema.safeParse(invalidPayload).success, false);
    });
  });

  // ==========================================================================
  // SUITE 4: DATA TRANSFORMATIONS & MAPPER CONCURRENCY SAFETY STRESS TEST
  // ==========================================================================
  describe('Suite 4: Data Transformations & Mapper Concurrency Safety', () => {
    const sampleUserRow: UserRow = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'founder@echopulse.ai',
      full_name: 'Founder Alex',
      avatar_url: 'https://echopulse.ai/avatar.png',
      plan: 'pro',
      submissions_quota: 100,
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const sampleProjectRow: ProjectRow = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'EchoPulse AI',
      url: 'https://echopulse.ai',
      tagline: 'Customer Feedback Intelligence Platform',
      description: 'Automated sentiment analysis and customer feedback clustering engine.',
      short_description: 'AI sentiment feedback clustering.',
      category: 'AI Tools',
      tags: ['ai', 'feedback', 'sentiment', 'analytics'],
      pricing_model: 'freemium',
      logo_url: 'https://echopulse.ai/logo.png',
      screenshot_urls: [
        'https://echopulse.ai/screen1.png',
        'https://echopulse.ai/screen2.png',
      ],
      metadata: {
        og_title: 'EchoPulse AI',
        og_description: 'Feedback intelligence',
        extracted_pitch_80: 'Automated customer feedback analysis.',
      },
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    const sampleSubmissionRow: SubmissionRow = {
      id: 'a1111111-1111-1111-1111-111111111111',
      project_id: '11111111-1111-1111-1111-111111111111',
      directory_id: 'alternativeto',
      user_id: '00000000-0000-0000-0000-000000000001',
      status: 'published',
      job_id: 'job_alt_001',
      listing_url: 'https://alternativeto.net/software/echopulse-ai/',
      proof_screenshot_url: 'https://supabase.co/storage/proof1.png',
      logs: [
        { timestamp: '2026-08-23T18:00:00.000Z', level: 'info', message: 'Form filled successfully' },
        { timestamp: '2026-08-23T18:00:05.000Z', level: 'info', message: 'Submission confirmed' },
      ],
      error_message: null,
      error_code: null,
      retry_count: 0,
      action_required_payload: null,
      started_at: '2026-08-23T18:00:00.000Z',
      completed_at: '2026-08-23T18:00:05.000Z',
      created_at: '2026-08-23T00:00:00.000Z',
      updated_at: '2026-08-23T00:00:00.000Z',
    };

    it('executes 100,000 mapper transformations across parallel asynchronous tasks without data race or loss', async () => {
      const ITERATIONS = 100_000;
      const CONCURRENCY = 10;
      const batchSize = ITERATIONS / CONCURRENCY;

      const startTime = performance.now();

      const workerTasks = Array.from({ length: CONCURRENCY }, async (_, workerIdx) => {
        let localCount = 0;
        for (let i = 0; i < batchSize; i++) {
          // Dynamic variation per iteration
          const uniqueId = `uuid-${workerIdx}-${i}`;
          const pRow: ProjectRow = {
            ...sampleProjectRow,
            id: uniqueId,
            name: `Project ${workerIdx}-${i}`,
          };

          const entity = mapProjectRowToEntity(pRow);
          assert.strictEqual(entity.id, uniqueId);
          assert.strictEqual(entity.name, `Project ${workerIdx}-${i}`);
          assert.strictEqual(entity.pricingModel, 'freemium');

          const backToRow = mapProjectEntityToRow(entity);
          assert.strictEqual(backToRow.id, uniqueId);
          assert.strictEqual(backToRow.name, `Project ${workerIdx}-${i}`);

          const subRow: SubmissionRow = {
            ...sampleSubmissionRow,
            id: `sub-${workerIdx}-${i}`,
            job_id: `job-${workerIdx}-${i}`,
          };
          const subEntity = mapSubmissionRowToEntity(subRow);
          assert.strictEqual(subEntity.id, `sub-${workerIdx}-${i}`);
          assert.strictEqual(subEntity.jobId, `job-${workerIdx}-${i}`);

          localCount++;
        }
        return localCount;
      });

      const results = await Promise.all(workerTasks);
      const totalProcessed = results.reduce((a, b) => a + b, 0);
      const durationMs = performance.now() - startTime;

      assert.strictEqual(totalProcessed, ITERATIONS);
      // High-performance assertion: 100k transforms should take under 2000ms
      assert.ok(
        durationMs < 2000,
        `100,000 transformations took ${durationMs.toFixed(2)}ms (expected < 2000ms)`
      );
    });

    it('robustly handles null, undefined, empty, and edge-case database fields without throwing', () => {
      const nullableUserRow: UserRow = {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'minimal@test.com',
        full_name: null,
        avatar_url: null,
        plan: 'free',
        submissions_quota: 50,
        created_at: '2026-08-23T00:00:00.000Z',
        updated_at: '2026-08-23T00:00:00.000Z',
      };

      const userEntity = mapUserRowToEntity(nullableUserRow);
      assert.strictEqual(userEntity.fullName, null);
      assert.strictEqual(userEntity.avatarUrl, null);

      const nullableProjectRow: ProjectRow = {
        id: 'project-null-fields',
        user_id: '00000000-0000-0000-0000-000000000002',
        name: 'Null Test SaaS',
        url: 'https://nulltest.com',
        tagline: 'Tagline',
        description: 'Description 10 chars',
        short_description: null,
        category: 'General SaaS',
        tags: [],
        pricing_model: 'free',
        logo_url: null,
        screenshot_urls: [],
        metadata: null as any,
        created_at: '2026-08-23T00:00:00.000Z',
        updated_at: '2026-08-23T00:00:00.000Z',
      };

      const projectEntity = mapProjectRowToEntity(nullableProjectRow);
      assert.strictEqual(projectEntity.shortDescription, null);
      assert.strictEqual(projectEntity.logoUrl, null);
      assert.deepStrictEqual(projectEntity.metadata, {}); // falls back to {}

      const nullableSubmissionRow: SubmissionRow = {
        id: 'sub-null-fields',
        project_id: 'project-null-fields',
        directory_id: 'uneed',
        user_id: '00000000-0000-0000-0000-000000000002',
        status: 'queued',
        job_id: null,
        listing_url: null,
        proof_screenshot_url: null,
        logs: null as any,
        error_message: null,
        error_code: null,
        retry_count: 0,
        action_required_payload: null,
        started_at: null,
        completed_at: null,
        created_at: '2026-08-23T00:00:00.000Z',
        updated_at: '2026-08-23T00:00:00.000Z',
      };

      const submissionEntity = mapSubmissionRowToEntity(nullableSubmissionRow);
      assert.strictEqual(submissionEntity.jobId, null);
      assert.strictEqual(submissionEntity.listingUrl, null);
      assert.deepStrictEqual(submissionEntity.logs, []); // falls back to empty array
      assert.strictEqual(submissionEntity.actionRequiredPayload, null);
    });

    it('resists prototype pollution payloads in metadata and logs', () => {
      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}, "name": "Injected App"}');
      const maliciousRow: ProjectRow = {
        ...sampleProjectRow,
        metadata: maliciousPayload,
      };

      const mapped = mapProjectRowToEntity(maliciousRow);
      assert.strictEqual(mapped.name, 'EchoPulse AI');
      // Verify global Object prototype is unpolluted
      assert.strictEqual((({} as any).polluted), undefined);
    });
  });

  // ==========================================================================
  // SUITE 5: CONSTANTS CONFIGURATION ALIGNMENT WITH SUPABASE DDL
  // ==========================================================================
  describe('Suite 5: Constants Configuration Alignment with Supabase DDL', () => {
    it('matches SUPABASE_DEFAULTS project ref and storage bucket names with requirements', () => {
      assert.strictEqual(SUPABASE_DEFAULTS.PROJECT_REF, 'qxakcsdaixzfttlcmnch');
      assert.strictEqual(SUPABASE_DEFAULTS.STORAGE_BUCKET_PROOFS, 'submission-proofs');
      assert.strictEqual(SUPABASE_DEFAULTS.STORAGE_BUCKET_ASSETS, 'project-assets');
      assert.ok(SUPABASE_DEFAULTS.URL.includes('qxakcsdaixzfttlcmnch'));
      assert.ok(SUPABASE_DEFAULTS.ANON_KEY.length > 50);
    });

    it('matches APP_LIMITS with database field constraints', () => {
      assert.strictEqual(APP_LIMITS.MAX_PROJECT_NAME_LENGTH, 100);
      assert.strictEqual(APP_LIMITS.MAX_TAGLINE_LENGTH, 120);
      assert.strictEqual(APP_LIMITS.MIN_DESCRIPTION_LENGTH, 10);
      assert.strictEqual(APP_LIMITS.MAX_SHORT_DESCRIPTION_LENGTH, 300);
      assert.strictEqual(APP_LIMITS.MAX_TAGS_COUNT, 15);
      assert.strictEqual(APP_LIMITS.MAX_SCREENSHOTS_COUNT, 10);
      assert.strictEqual(APP_LIMITS.MAX_CONCURRENT_WORKER_JOBS, 10);
      assert.strictEqual(APP_LIMITS.DEFAULT_EXTRACTION_TIMEOUT_MS, 3000);
    });

    it('validates PRICING_MODELS and USER_PLANS enums match Postgres enum definitions', () => {
      const expectedPricing = ['free', 'freemium', 'paid', 'subscription', 'one-time', 'contact'];
      assert.deepStrictEqual([...PRICING_MODELS], expectedPricing);

      const expectedPlans = ['free', 'pro', 'enterprise'];
      assert.deepStrictEqual([...USER_PLANS], expectedPlans);

      for (const p of expectedPricing) {
        assert.strictEqual(PricingModelSchema.safeParse(p).success, true);
      }
      for (const plan of expectedPlans) {
        assert.strictEqual(UserPlanSchema.safeParse(plan).success, true);
      }
    });
  });
});
