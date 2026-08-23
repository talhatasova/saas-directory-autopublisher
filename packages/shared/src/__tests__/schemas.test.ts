import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  UrlSchema,
  ExtractMetadataRequestSchema,
  CreateProjectRequestSchema,
  LaunchSubmissionsRequestSchema,
  ResolveActionRequestSchema,
} from '../validation/schemas.js';

describe('Validation Schemas', () => {
  describe('UrlSchema', () => {
    it('should accept valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://subdomain.test.org/path?q=1',
        'https://echopulse.ai',
      ];
      for (const url of validUrls) {
        const result = UrlSchema.safeParse(url);
        assert.strictEqual(result.success, true);
      }
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = ['not-a-url', 'ftp://invalid', 'example.com', ''];
      for (const url of invalidUrls) {
        const result = UrlSchema.safeParse(url);
        assert.strictEqual(result.success, false);
      }
    });
  });

  describe('ExtractMetadataRequestSchema', () => {
    it('should validate request with valid URL', () => {
      const result = ExtractMetadataRequestSchema.safeParse({ url: 'https://saashub.com' });
      assert.strictEqual(result.success, true);
    });

    it('should reject request with missing URL', () => {
      const result = ExtractMetadataRequestSchema.safeParse({});
      assert.strictEqual(result.success, false);
    });
  });

  describe('CreateProjectRequestSchema', () => {
    it('should validate a complete and valid project request', () => {
      const payload = {
        name: 'EchoPulse AI',
        url: 'https://echopulse.ai',
        tagline: 'AI Customer Feedback Platform',
        description: 'Deep customer feedback analytics and roadmap prioritizing engine.',
        shortDescription: 'AI feedback clustering for SaaS.',
        category: 'AI Tools',
        tags: ['ai', 'feedback', 'saas'],
        pricingModel: 'freemium',
        logoUrl: 'https://echopulse.ai/logo.png',
        screenshotUrls: ['https://echopulse.ai/screen1.png'],
        metadata: { og_title: 'EchoPulse' },
      };

      const result = CreateProjectRequestSchema.safeParse(payload);
      assert.strictEqual(result.success, true);
    });

    it('should reject project with description less than 10 characters', () => {
      const payload = {
        name: 'Short App',
        url: 'https://short.app',
        tagline: 'Tagline',
        description: 'Short', // < 10 chars
      };

      const result = CreateProjectRequestSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
    });

    it('should reject project with name longer than 100 characters', () => {
      const payload = {
        name: 'A'.repeat(101),
        url: 'https://longname.app',
        tagline: 'Tagline',
        description: 'Valid description that is longer than 10 chars',
      };

      const result = CreateProjectRequestSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
    });
  });

  describe('LaunchSubmissionsRequestSchema', () => {
    it('should accept valid launch request with UUID and directory IDs', () => {
      const payload = {
        projectId: '11111111-1111-1111-1111-111111111111',
        directoryIds: ['alternativeto', 'toolify'],
      };

      const result = LaunchSubmissionsRequestSchema.safeParse(payload);
      assert.strictEqual(result.success, true);
    });

    it('should reject launch request with non-UUID projectId', () => {
      const payload = {
        projectId: 'invalid-id',
        directoryIds: ['alternativeto'],
      };

      const result = LaunchSubmissionsRequestSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
    });

    it('should reject launch request with empty directory array', () => {
      const payload = {
        projectId: '11111111-1111-1111-1111-111111111111',
        directoryIds: [],
      };

      const result = LaunchSubmissionsRequestSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
    });
  });

  describe('ResolveActionRequestSchema', () => {
    it('should validate valid action resolution payload', () => {
      const payload = {
        resolutionType: 'captcha_solved',
        captchaToken: 'mock_turnstile_token_123',
      };

      const result = ResolveActionRequestSchema.safeParse(payload);
      assert.strictEqual(result.success, true);
    });
  });
});
