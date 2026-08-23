import { z } from 'zod';
import { PRICING_MODELS, SUBMISSION_STATUSES, SUBMISSION_TYPES, USER_PLANS } from '../constants/status.constant.js';
import { APP_LIMITS } from '../constants/config.constant.js';

export const UrlSchema = z
  .string()
  .max(500, { message: 'URL cannot exceed 500 characters' })
  .url({ message: 'Must be a valid URL format' })
  .refine((url) => /^https?:\/\//i.test(url), {
    message: 'URL must start with http:// or https://',
  });

export const PricingModelSchema = z.enum(
  PRICING_MODELS as unknown as [string, ...string[]]
);

export const SubmissionStatusSchema = z.enum(
  SUBMISSION_STATUSES as unknown as [string, ...string[]]
);

export const SubmissionTypeSchema = z.enum(
  SUBMISSION_TYPES as unknown as [string, ...string[]]
);

export const UserPlanSchema = z.enum(
  USER_PLANS as unknown as [string, ...string[]]
);

export const ExtractMetadataRequestSchema = z.object({
  url: UrlSchema,
});

export const CreateProjectRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(APP_LIMITS.MAX_PROJECT_NAME_LENGTH, `Name must be under ${APP_LIMITS.MAX_PROJECT_NAME_LENGTH} chars`),
  url: UrlSchema,
  tagline: z
    .string()
    .min(1, 'Tagline is required')
    .max(APP_LIMITS.MAX_TAGLINE_LENGTH, `Tagline must be under ${APP_LIMITS.MAX_TAGLINE_LENGTH} chars`),
  description: z
    .string()
    .min(APP_LIMITS.MIN_DESCRIPTION_LENGTH, `Description must be at least ${APP_LIMITS.MIN_DESCRIPTION_LENGTH} chars`),
  shortDescription: z
    .string()
    .max(APP_LIMITS.MAX_SHORT_DESCRIPTION_LENGTH, `Short description must be under ${APP_LIMITS.MAX_SHORT_DESCRIPTION_LENGTH} chars`)
    .optional(),
  category: z.string().default('General SaaS'),
  tags: z.array(z.string()).max(APP_LIMITS.MAX_TAGS_COUNT).default([]),
  pricingModel: PricingModelSchema.default('freemium'),
  logoUrl: z.string().url().optional().or(z.literal('')),
  screenshotUrls: z.array(z.string().url()).max(APP_LIMITS.MAX_SCREENSHOTS_COUNT).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const UpdateProjectRequestSchema = CreateProjectRequestSchema.partial();

export const LaunchSubmissionsRequestSchema = z.object({
  projectId: z.string().uuid('Project ID must be a valid UUID'),
  directoryIds: z
    .array(z.string().min(1))
    .min(1, 'At least one directory must be selected'),
});

export const ResolveActionRequestSchema = z.object({
  captchaToken: z.string().optional(),
  twoFactorCode: z.string().optional(),
  resolutionType: z.enum(['captcha_solved', '2fa_entered', 'manual_confirmed', 'field_updated']),
  customPayload: z.record(z.unknown()).optional(),
});
