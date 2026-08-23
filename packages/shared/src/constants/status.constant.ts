import {
  DirectoryStatus,
  PricingModel,
  SubmissionStatus,
  SubmissionType,
  UserPlan,
} from '../types/database.types.js';

export const SUBMISSION_STATUSES: readonly SubmissionStatus[] = [
  'queued',
  'in_progress',
  'published',
  'action_required',
  'failed',
  'cancelled',
] as const;

export const SUBMISSION_TYPES: readonly SubmissionType[] = [
  'form_automation',
  'direct_api',
  'assisted',
  'manual',
] as const;

export const PRICING_MODELS: readonly PricingModel[] = [
  'free',
  'freemium',
  'paid',
  'subscription',
  'one-time',
  'contact',
] as const;

export const USER_PLANS: readonly UserPlan[] = [
  'free',
  'pro',
  'enterprise',
] as const;

export const DIRECTORY_STATUSES: readonly DirectoryStatus[] = [
  'active',
  'maintenance',
  'deprecated',
] as const;

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  SCRAPER_TIMEOUT: 'SCRAPER_TIMEOUT',
  SCRAPER_FAILED: 'SCRAPER_FAILED',
  ERR_SELECTOR_CHANGED: 'ERR_SELECTOR_CHANGED',
  ERR_RATE_LIMIT: 'ERR_RATE_LIMIT',
  ERR_CAPTCHA_DETECTED: 'ERR_CAPTCHA_DETECTED',
  ERR_AUTH_REQUIRED: 'ERR_AUTH_REQUIRED',
  ERR_NETWORK: 'ERR_NETWORK',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
