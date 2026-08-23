export type {
  DirectoryStatus,
  PricingModel,
  SubmissionStatus,
  SubmissionType,
  UserPlan,
} from './database.types.js';

import type {
  DirectoryStatus,
  PricingModel,
  SubmissionStatus,
  SubmissionType,
  UserPlan,
} from './database.types.js';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  plan: UserPlan;
  submissionsQuota: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  shortDescription?: string | null;
  category: string;
  tags: string[];
  pricingModel: PricingModel;
  logoUrl?: string | null;
  screenshotUrls: string[];
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMetadata {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  jsonLd?: Record<string, unknown>;
  extractedAt?: string;
  extractedPitch80?: string;
  extractedSummary250?: string;
  extractedReview500?: string;
  [key: string]: unknown;
}

export interface DirectoryConfig {
  formUrl?: string;
  apiEndpoint?: string;
  authType?: 'none' | 'bearer' | 'basic' | 'session' | 'oauth';
  requiresLicense?: boolean;
  requiresPricing?: boolean;
  requiresFeatures?: boolean;
  supportsTags?: boolean;
  maxTags?: number;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Directory {
  id: string;
  name: string;
  url: string;
  category: string;
  domainRating: number;
  submissionType: SubmissionType;
  status: DirectoryStatus;
  requiresAuth: boolean;
  estimatedTimeSec: number;
  config: DirectoryConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionLogLevel {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export type ActionRequiredType =
  | 'captcha_detected'
  | 'turnstile'
  | 'recaptcha'
  | 'hcaptcha'
  | '2fa_code'
  | 'email_verification'
  | 'manual_review'
  | 'field_validation_failed';

export interface ActionRequiredPayload {
  type: ActionRequiredType;
  prompt?: string;
  captchaType?: 'turnstile' | 'recaptcha' | 'hcaptcha';
  screenshotPreview?: string;
  message?: string;
  fields?: string[];
  expiresAt?: string;
  [key: string]: unknown;
}

export interface Submission {
  id: string;
  projectId: string;
  directoryId: string;
  userId: string;
  status: SubmissionStatus;
  jobId: string | null;
  listingUrl: string | null;
  proofScreenshotUrl: string | null;
  logs: SubmissionLogLevel[];
  errorMessage: string | null;
  errorCode: string | null;
  retryCount: number;
  actionRequiredPayload: ActionRequiredPayload | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionWithDirectory extends Submission {
  directory: Directory;
}

export interface ProjectWithSubmissions extends Project {
  submissions: SubmissionWithDirectory[];
}
