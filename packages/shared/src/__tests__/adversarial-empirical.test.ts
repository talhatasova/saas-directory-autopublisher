import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  UrlSchema,
  PricingModelSchema,
  SubmissionStatusSchema,
  SubmissionTypeSchema,
  UserPlanSchema,
  ExtractMetadataRequestSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  LaunchSubmissionsRequestSchema,
  ResolveActionRequestSchema,
} from '../validation/schemas.js';
import {
  mapUserRowToEntity,
  mapProjectRowToEntity,
  mapProjectEntityToRow,
  mapDirectoryRowToEntity,
  mapSubmissionRowToEntity,
  SupabaseDbService,
} from '../supabase/db-helper.js';
import {
  DIRECTORY_CATALOG,
  DIRECTORY_BY_ID,
} from '../constants/directories.constant.js';
import {
  ERROR_CODES,
  PRICING_MODELS,
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
  USER_PLANS,
  DIRECTORY_STATUSES,
} from '../constants/status.constant.js';
import { APP_LIMITS, SUPABASE_DEFAULTS } from '../constants/config.constant.js';
import { Database } from '../types/database.types.js';

describe('Adversarial Stress Suite: packages/shared', () => {
  // ==========================================================================
  // 1. URL SCHEMA ADVERSARIAL STRESS TESTS
  // ==========================================================================
  describe('1. UrlSchema Adversarial & Boundary Tests', () => {
    it('accepts valid RFC 3986 URLs across protocols, ports, and subdomains', () => {
      const validCases = [
        'http://example.com',
        'https://example.com',
        'https://app.subdomain.domain.co.uk',
        'https://example.com:8443/path/to/resource?query=1&param=two#section',
        'https://user:password@auth.example.com',
        'http://127.0.0.1:3000/api/v1',
        'https://echopulse.ai',
        'https://test.io/' + 'a'.repeat(200),
      ];

      for (const url of validCases) {
        const parsed = UrlSchema.safeParse(url);
        assert.strictEqual(
          parsed.success,
          true,
          `Expected valid URL to pass: ${url}`
        );
      }
    });

    it('accepts URL at exact boundary limit of 500 characters', () => {
      const base = 'https://example.com/';
      const exact500 = base + 'a'.repeat(500 - base.length);
      assert.strictEqual(exact500.length, 500);

      const parsed = UrlSchema.safeParse(exact500);
      assert.strictEqual(parsed.success, true, '500-char URL should be accepted');
    });

    it('rejects URL exceeding 500 characters limit', () => {
      const base = 'https://example.com/';
      const len501 = base + 'a'.repeat(501 - base.length);
      assert.strictEqual(len501.length, 501);

      const parsed = UrlSchema.safeParse(len501);
      assert.strictEqual(parsed.success, false, '501-char URL must be rejected');
      if (!parsed.success) {
        assert.ok(
          parsed.error.issues.some((i) => i.message.includes('500')),
          'Error issue should mention 500 limit'
        );
      }
    });

    it('rejects security injection attempts, dangerous protocols, and malformed inputs', () => {
      const maliciousAndInvalid = [
        'javascript:alert(document.cookie)',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'file:///etc/passwd',
        'file:///C:/Windows/System32/drivers/etc/hosts',
        'ftp://ftp.example.com/file.txt',
        'ws://realtime.example.com/socket',
        'wss://realtime.example.com/socket',
        '//protocol-relative.com/test',
        'https://',
        'http://',
        'https:// ',
        '   ',
        '',
        'http://??',
        'http://#',
        'not a url at all',
        'mailto:admin@example.com',
      ];

      for (const mal of maliciousAndInvalid) {
        const parsed = UrlSchema.safeParse(mal);
        assert.strictEqual(
          parsed.success,
          false,
          `Expected malicious/invalid URL to be rejected: "${mal}"`
        );
      }
    });

    it('rejects non-string types gracefully', () => {
      const nonStrings = [null, undefined, 12345, true, {}, [], () => {}];
      for (const val of nonStrings) {
        const parsed = UrlSchema.safeParse(val);
        assert.strictEqual(parsed.success, false);
      }
    });
  });

  // ==========================================================================
  // 2. ENUM SCHEMAS INTEGRITY
  // ==========================================================================
  describe('2. Enum Schemas Validation', () => {
    it('validates all canonical PricingModel values and rejects unauthorized strings', () => {
      for (const model of PRICING_MODELS) {
        assert.strictEqual(PricingModelSchema.safeParse(model).success, true);
      }

      const invalidModels = ['FREE', 'Premium', 'tier_based', 'trial', '', null, 99];
      for (const inv of invalidModels) {
        assert.strictEqual(PricingModelSchema.safeParse(inv).success, false);
      }
    });

    it('validates all canonical SubmissionStatus values and rejects invalid statuses', () => {
      for (const status of SUBMISSION_STATUSES) {
        assert.strictEqual(SubmissionStatusSchema.safeParse(status).success, true);
      }

      const invalidStatuses = ['PENDING', 'running', 'error', 'done', '', null];
      for (const inv of invalidStatuses) {
        assert.strictEqual(SubmissionStatusSchema.safeParse(inv).success, false);
      }
    });

    it('validates all canonical SubmissionType values', () => {
      for (const type of SUBMISSION_TYPES) {
        assert.strictEqual(SubmissionTypeSchema.safeParse(type).success, true);
      }
      assert.strictEqual(SubmissionTypeSchema.safeParse('puppeteer').success, false);
    });

    it('validates all canonical UserPlan values', () => {
      for (const plan of USER_PLANS) {
        assert.strictEqual(UserPlanSchema.safeParse(plan).success, true);
      }
      assert.strictEqual(UserPlanSchema.safeParse('ultimate').success, false);
    });
  });

  // ==========================================================================
  // 3. CREATE PROJECT REQUEST SCHEMA ADVERSARIAL BOUNDARIES
  // ==========================================================================
  describe('3. CreateProjectRequestSchema Adversarial Boundaries', () => {
    const validBasePayload = {
      name: 'EchoPulse AI',
      url: 'https://echopulse.ai',
      tagline: 'AI-driven customer feedback aggregator and analysis engine',
      description: 'EchoPulse analyzes sentiment from multiple sources in real time.',
      shortDescription: 'AI feedback engine.',
      category: 'AI Tools',
      tags: ['ai', 'analytics'],
      pricingModel: 'freemium',
      logoUrl: 'https://echopulse.ai/logo.png',
      screenshotUrls: ['https://echopulse.ai/screenshot1.png'],
      metadata: { ogTitle: 'EchoPulse' },
    };

    it('accepts complete valid payload and applies defaults for optional fields', () => {
      const minimalPayload = {
        name: 'A',
        url: 'https://app.io',
        tagline: 'T',
        description: 'Ten letters.', // exactly 11 chars >= 10
      };

      const parsed = CreateProjectRequestSchema.safeParse(minimalPayload);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.category, 'General SaaS');
        assert.deepStrictEqual(parsed.data.tags, []);
        assert.strictEqual(parsed.data.pricingModel, 'freemium');
        assert.deepStrictEqual(parsed.data.screenshotUrls, []);
        assert.deepStrictEqual(parsed.data.metadata, {});
      }
    });

    it('accepts empty string for logoUrl', () => {
      const payload = {
        ...validBasePayload,
        logoUrl: '',
      };
      const parsed = CreateProjectRequestSchema.safeParse(payload);
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.logoUrl, '');
      }
    });

    it('enforces Name boundary limits: [1, 100]', () => {
      // 1 char name: valid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({ ...validBasePayload, name: 'X' }).success,
        true
      );

      // 100 char name: valid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          name: 'N'.repeat(100),
        }).success,
        true
      );

      // 101 char name: invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          name: 'N'.repeat(101),
        }).success,
        false
      );

      // 0 char name (empty string): invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({ ...validBasePayload, name: '' }).success,
        false
      );
    });

    it('enforces Tagline boundary limits: [1, 120]', () => {
      // 1 char tagline: valid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({ ...validBasePayload, tagline: 'T' }).success,
        true
      );

      // 120 char tagline: valid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          tagline: 'T'.repeat(120),
        }).success,
        true
      );

      // 121 char tagline: invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          tagline: 'T'.repeat(121),
        }).success,
        false
      );

      // 0 char tagline: invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({ ...validBasePayload, tagline: '' }).success,
        false
      );
    });

    it('enforces Description boundary minimum: >= 10 chars', () => {
      // 10 char description: valid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          description: '0123456789',
        }).success,
        true
      );

      // 9 char description: invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          description: '012345678',
        }).success,
        false
      );

      // 0 char description: invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({ ...validBasePayload, description: '' }).success,
        false
      );

      // Massive description (10,000 chars): valid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          description: 'Long description '.repeat(600),
        }).success,
        true
      );
    });

    it('enforces ShortDescription boundary: <= 300 chars when provided', () => {
      // 300 chars: valid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          shortDescription: 'S'.repeat(300),
        }).success,
        true
      );

      // 301 chars: invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          shortDescription: 'S'.repeat(301),
        }).success,
        false
      );
    });

    it('enforces Tags count boundary: <= 15 items', () => {
      // 15 tags: valid
      const tags15 = Array.from({ length: 15 }, (_, i) => `tag${i}`);
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({ ...validBasePayload, tags: tags15 }).success,
        true
      );

      // 16 tags: invalid
      const tags16 = Array.from({ length: 16 }, (_, i) => `tag${i}`);
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({ ...validBasePayload, tags: tags16 }).success,
        false
      );
    });

    it('enforces ScreenshotUrls count boundary: <= 10 items and valid URLs', () => {
      // 10 screenshot URLs: valid
      const screens10 = Array.from({ length: 10 }, (_, i) => `https://example.com/s${i}.png`);
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          screenshotUrls: screens10,
        }).success,
        true
      );

      // 11 screenshot URLs: invalid
      const screens11 = Array.from({ length: 11 }, (_, i) => `https://example.com/s${i}.png`);
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          screenshotUrls: screens11,
        }).success,
        false
      );

      // Array containing malformed URL: invalid
      assert.strictEqual(
        CreateProjectRequestSchema.safeParse({
          ...validBasePayload,
          screenshotUrls: ['https://example.com/s1.png', 'not-a-url'],
        }).success,
        false
      );
    });

    it('rejects payload when required fields are missing or null', () => {
      const requiredKeys: Array<keyof typeof validBasePayload> = [
        'name',
        'url',
        'tagline',
        'description',
      ];
      for (const key of requiredKeys) {
        const copy: Record<string, unknown> = { ...validBasePayload };
        delete copy[key];
        assert.strictEqual(
          CreateProjectRequestSchema.safeParse(copy).success,
          false,
          `Missing ${key} should fail`
        );

        const copyWithNull = { ...validBasePayload, [key]: null };
        assert.strictEqual(
          CreateProjectRequestSchema.safeParse(copyWithNull).success,
          false,
          `Null ${key} should fail`
        );
      }
    });
  });

  // ==========================================================================
  // 4. UPDATE PROJECT REQUEST SCHEMA (PARTIAL)
  // ==========================================================================
  describe('4. UpdateProjectRequestSchema (Partial Schema)', () => {
    it('accepts empty object {} as valid partial update', () => {
      const parsed = UpdateProjectRequestSchema.safeParse({});
      assert.strictEqual(parsed.success, true);
    });

    it('accepts valid single-field partial updates', () => {
      assert.strictEqual(
        UpdateProjectRequestSchema.safeParse({ name: 'Updated Name' }).success,
        true
      );
      assert.strictEqual(
        UpdateProjectRequestSchema.safeParse({ pricingModel: 'subscription' }).success,
        true
      );
      assert.strictEqual(
        UpdateProjectRequestSchema.safeParse({
          tags: ['new-tag'],
          screenshotUrls: ['https://example.com/new.png'],
        }).success,
        true
      );
    });

    it('rejects invalid values in partial updates', () => {
      // Name empty string
      assert.strictEqual(
        UpdateProjectRequestSchema.safeParse({ name: '' }).success,
        false
      );
      // Description too short
      assert.strictEqual(
        UpdateProjectRequestSchema.safeParse({ description: 'Short' }).success,
        false
      );
      // Invalid URL
      assert.strictEqual(
        UpdateProjectRequestSchema.safeParse({ url: 'javascript:bad()' }).success,
        false
      );
      // Invalid pricing model
      assert.strictEqual(
        UpdateProjectRequestSchema.safeParse({ pricingModel: 'invalid_price' }).success,
        false
      );
    });
  });

  // ==========================================================================
  // 5. LAUNCH SUBMISSIONS REQUEST SCHEMA ADVERSARIAL
  // ==========================================================================
  describe('5. LaunchSubmissionsRequestSchema Adversarial Tests', () => {
    it('accepts valid UUIDv4 and non-empty directory array', () => {
      const validPayload = {
        projectId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        directoryIds: ['alternativeto', 'saashub', 'toolify'],
      };
      const parsed = LaunchSubmissionsRequestSchema.safeParse(validPayload);
      assert.strictEqual(parsed.success, true);
    });

    it('rejects invalid UUID formats and SQL injection attempts', () => {
      const badUuids = [
        'not-a-uuid',
        '12345',
        '9b1deb4d-3b7d-4bad-9bdd',
        "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'; DROP TABLE submissions; --",
        '',
        null,
        undefined,
      ];

      for (const badId of badUuids) {
        const parsed = LaunchSubmissionsRequestSchema.safeParse({
          projectId: badId,
          directoryIds: ['alternativeto'],
        });
        assert.strictEqual(
          parsed.success,
          false,
          `Expected invalid projectId to be rejected: ${badId}`
        );
      }
    });

    it('rejects empty directory array, array with empty strings, or non-array', () => {
      // Empty array
      assert.strictEqual(
        LaunchSubmissionsRequestSchema.safeParse({
          projectId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          directoryIds: [],
        }).success,
        false
      );

      // Array with empty string
      assert.strictEqual(
        LaunchSubmissionsRequestSchema.safeParse({
          projectId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          directoryIds: ['alternativeto', ''],
        }).success,
        false
      );

      // Non-array
      assert.strictEqual(
        LaunchSubmissionsRequestSchema.safeParse({
          projectId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          directoryIds: 'alternativeto',
        }).success,
        false
      );
    });
  });

  // ==========================================================================
  // 6. RESOLVE ACTION REQUEST SCHEMA
  // ==========================================================================
  describe('6. ResolveActionRequestSchema Adversarial Tests', () => {
    it('validates all supported resolution types with optional payloads', () => {
      const resolutionTypes = [
        'captcha_solved',
        '2fa_entered',
        'manual_confirmed',
        'field_updated',
      ] as const;

      for (const resType of resolutionTypes) {
        const parsed = ResolveActionRequestSchema.safeParse({
          resolutionType: resType,
          captchaToken: 'token_123',
          twoFactorCode: '654321',
          customPayload: { arbitraryKey: 42, nested: { ok: true } },
        });
        assert.strictEqual(parsed.success, true);
      }
    });

    it('rejects invalid resolutionType strings', () => {
      const badTypes = ['bypass_captcha', 'skip', 'resolved', '', null, 123];
      for (const bad of badTypes) {
        const parsed = ResolveActionRequestSchema.safeParse({
          resolutionType: bad,
        });
        assert.strictEqual(parsed.success, false);
      }
    });
  });

  // ==========================================================================
  // 7. DATABASE MAPPER RESILIENCE & EDGE CASES
  // ==========================================================================
  describe('7. Database Helper Mappers Resilience', () => {
    describe('mapUserRowToEntity', () => {
      it('handles null and empty optional fields safely', () => {
        const row: Database['public']['Tables']['users']['Row'] = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'test@example.com',
          full_name: null,
          avatar_url: null,
          plan: 'free',
          submissions_quota: 0,
          created_at: '2026-08-23T00:00:00.000Z',
          updated_at: '2026-08-23T00:00:00.000Z',
        };

        const user = mapUserRowToEntity(row);
        assert.strictEqual(user.id, row.id);
        assert.strictEqual(user.fullName, null);
        assert.strictEqual(user.avatarUrl, null);
        assert.strictEqual(user.submissionsQuota, 0);
      });
    });

    describe('mapProjectRowToEntity and mapProjectEntityToRow', () => {
      it('handles null metadata row by falling back to empty object {}', () => {
        const row: Database['public']['Tables']['projects']['Row'] = {
          id: '11111111-1111-1111-1111-111111111111',
          user_id: '00000000-0000-0000-0000-000000000001',
          name: 'Null Meta Project',
          url: 'https://test.io',
          tagline: 'Tagline',
          description: 'Valid description here',
          short_description: null,
          category: 'General SaaS',
          tags: [],
          pricing_model: 'freemium',
          logo_url: null,
          screenshot_urls: [],
          metadata: null as any,
          created_at: '2026-08-23T00:00:00.000Z',
          updated_at: '2026-08-23T00:00:00.000Z',
        };

        const entity = mapProjectRowToEntity(row);
        assert.deepStrictEqual(entity.metadata, {});
      });

      it('mapProjectEntityToRow strips undefined fields and maps snake_case correctly', () => {
        const partialProject = {
          name: 'Updated Name',
          tagline: 'New Tagline',
          shortDescription: 'Short desc',
          screenshotUrls: ['https://example.com/1.png'],
        };

        const mappedRow = mapProjectEntityToRow(partialProject);
        assert.strictEqual(mappedRow.name, 'Updated Name');
        assert.strictEqual(mappedRow.tagline, 'New Tagline');
        assert.strictEqual(mappedRow.short_description, 'Short desc');
        assert.deepStrictEqual(mappedRow.screenshot_urls, ['https://example.com/1.png']);
        assert.strictEqual(mappedRow.description, undefined);
        assert.strictEqual(mappedRow.url, undefined);
      });
    });

    describe('mapDirectoryRowToEntity', () => {
      it('handles null config row by falling back to empty object {}', () => {
        const row: Database['public']['Tables']['directories']['Row'] = {
          id: 'custom_dir',
          name: 'Custom Directory',
          url: 'https://custom.dir',
          category: 'General SaaS',
          domain_rating: 50,
          submission_type: 'direct_api',
          status: 'active',
          requires_auth: false,
          estimated_time_sec: 15,
          config: null as any,
          created_at: '2026-08-23T00:00:00.000Z',
          updated_at: '2026-08-23T00:00:00.000Z',
        };

        const entity = mapDirectoryRowToEntity(row);
        assert.deepStrictEqual(entity.config, {});
        assert.strictEqual(entity.domainRating, 50);
      });
    });

    describe('mapSubmissionRowToEntity', () => {
      it('handles non-array logs safely by falling back to empty array []', () => {
        const row: Database['public']['Tables']['submissions']['Row'] = {
          id: 'a1111111-1111-1111-1111-111111111111',
          project_id: '11111111-1111-1111-1111-111111111111',
          directory_id: 'alternativeto',
          user_id: '00000000-0000-0000-0000-000000000001',
          status: 'action_required',
          job_id: null,
          listing_url: null,
          proof_screenshot_url: null,
          logs: null as any, // non-array / null log
          error_message: 'CAPTCHA detected',
          error_code: 'ERR_CAPTCHA_DETECTED',
          retry_count: 2,
          action_required_payload: {
            type: 'recaptcha',
            message: 'Solve captcha',
          },
          started_at: '2026-08-23T18:00:00.000Z',
          completed_at: null,
          created_at: '2026-08-23T00:00:00.000Z',
          updated_at: '2026-08-23T18:00:00.000Z',
        };

        const entity = mapSubmissionRowToEntity(row);
        assert.deepStrictEqual(entity.logs, []);
        assert.strictEqual(entity.errorCode, 'ERR_CAPTCHA_DETECTED');
        assert.strictEqual(entity.retryCount, 2);
        assert.ok(entity.actionRequiredPayload);
        assert.strictEqual(entity.actionRequiredPayload?.type, 'recaptcha');
      });
    });
  });

  // ==========================================================================
  // 8. DIRECTORY CATALOG & APP CONFIG INVARIANTS
  // ==========================================================================
  describe('8. Directory Catalog & Config Invariants', () => {
    it('verifies that all 7 canonical directories meet strict schema standards', () => {
      assert.strictEqual(DIRECTORY_CATALOG.length, 7);

      for (const dir of DIRECTORY_CATALOG) {
        // Id is non-empty lowercase alphanumeric / slug
        assert.match(dir.id, /^[a-z0-9_-]+$/);
        // Name is non-empty
        assert.ok(dir.name.length >= 2);
        // URL is valid https URL
        assert.strictEqual(UrlSchema.safeParse(dir.url).success, true);
        // Domain rating is between 0 and 100
        assert.ok(dir.domainRating >= 0 && dir.domainRating <= 100);
        // Submission type is valid
        assert.strictEqual(SubmissionTypeSchema.safeParse(dir.submissionType).success, true);
        // Status is active
        assert.strictEqual(dir.status, 'active');
        // Estimated time is positive
        assert.ok(dir.estimatedTimeSec > 0);
        // Config is an object
        assert.ok(typeof dir.config === 'object' && dir.config !== null);
      }
    });

    it('verifies ERROR_CODES contains all standard error taxonomy', () => {
      const requiredCodes = [
        'VALIDATION_FAILED',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'PROJECT_NOT_FOUND',
        'DIRECTORY_NOT_FOUND',
        'SUBMISSION_NOT_FOUND',
        'QUOTA_EXCEEDED',
        'SCRAPER_TIMEOUT',
        'SCRAPER_FAILED',
        'ERR_SELECTOR_CHANGED',
        'ERR_RATE_LIMIT',
        'ERR_CAPTCHA_DETECTED',
        'ERR_AUTH_REQUIRED',
        'ERR_NETWORK',
        'INTERNAL_ERROR',
      ];

      for (const code of requiredCodes) {
        assert.strictEqual(
          (ERROR_CODES as Record<string, string>)[code],
          code,
          `ERROR_CODES must include ${code}`
        );
      }
    });

    it('verifies APP_LIMITS constants have rational positive bounds', () => {
      assert.strictEqual(APP_LIMITS.MAX_PROJECT_NAME_LENGTH, 100);
      assert.strictEqual(APP_LIMITS.MAX_TAGLINE_LENGTH, 120);
      assert.strictEqual(APP_LIMITS.MIN_DESCRIPTION_LENGTH, 10);
      assert.strictEqual(APP_LIMITS.MAX_SHORT_DESCRIPTION_LENGTH, 300);
      assert.strictEqual(APP_LIMITS.MAX_TAGS_COUNT, 15);
      assert.strictEqual(APP_LIMITS.MAX_SCREENSHOTS_COUNT, 10);
      assert.ok(APP_LIMITS.DEFAULT_SUBMISSION_QUOTA > 0);
      assert.ok(APP_LIMITS.MAX_CONCURRENT_WORKER_JOBS > 0);
    });
  });

  // ==========================================================================
  // 9. SUPABASE DB SERVICE ERROR PATHS & EDGE CASES
  // ==========================================================================
  describe('9. SupabaseDbService Error Paths & Robustness', () => {
    it('returns null when getUser fails or finds nothing', async () => {
      const mockClient: any = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      };

      const service = new SupabaseDbService(mockClient);
      const user = await service.getUser('non-existent-user');
      assert.strictEqual(user, null);
    });

    it('returns empty array [] when getProjects fails or returns null', async () => {
      const mockClient: any = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: null, error: { message: 'DB Error' } }),
              then: (resolve: any) => resolve({ data: null, error: { message: 'DB Error' } }),
            }),
          }),
        }),
      };

      const service = new SupabaseDbService(mockClient);
      const projects = await service.getProjects('user-1');
      assert.deepStrictEqual(projects, []);
    });

    it('throws descriptive error on createProject failure', async () => {
      const mockClient: any = {
        from: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { message: 'violates check constraint' },
              }),
            }),
          }),
        }),
      };

      const service = new SupabaseDbService(mockClient);
      await assert.rejects(
        () =>
          service.createProject({
            userId: 'user-1',
            name: 'P',
            url: 'https://p.com',
            tagline: 'Tag',
            description: 'Description 10+',
            category: 'General SaaS',
            tags: [],
            pricingModel: 'freemium',
            screenshotUrls: [],
            metadata: {},
          }),
        /Failed to create project: violates check constraint/
      );
    });

    it('throws descriptive error on updateProject failure', async () => {
      const mockClient: any = {
        from: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { message: 'record not found' },
                }),
              }),
            }),
          }),
        }),
      };

      const service = new SupabaseDbService(mockClient);
      await assert.rejects(
        () => service.updateProject('invalid-id', { name: 'New Name' }),
        /Failed to update project: record not found/
      );
    });

    it('throws descriptive error on deleteProject failure', async () => {
      const mockClient: any = {
        from: () => ({
          delete: () => ({
            eq: async () => ({ error: { message: 'Foreign key constraint violated' } }),
          }),
        }),
      };

      const service = new SupabaseDbService(mockClient);
      await assert.rejects(
        () => service.deleteProject('project-with-deps'),
        /Failed to delete project: Foreign key constraint violated/
      );
    });

    it('appendSubmissionLog throws when target submission does not exist', async () => {
      const mockClient: any = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      };

      const service = new SupabaseDbService(mockClient);
      await assert.rejects(
        () =>
          service.appendSubmissionLog('sub-999', {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Test log',
          }),
        /Submission sub-999 not found/
      );
    });
  });
});
