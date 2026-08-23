import {
  Directory,
  PricingModel,
  Project,
  ProjectMetadata,
  Submission,
  SubmissionStatus,
} from './entities.types.js';

export interface ScrapedMetadata {
  url: string;
  name: string;
  tagline: string;
  description: string;
  shortDescription: string;
  descriptionPitch80: string;
  descriptionSummary250: string;
  descriptionReview500: string;
  category: string;
  tags: string[];
  pricingModel: PricingModel;
  logoUrl?: string;
  faviconUrl?: string;
  heroImageUrl?: string;
  screenshotUrls: string[];
  metadata: ProjectMetadata;
  extractionTimeMs: number;
}

export interface ExtractMetadataRequest {
  url: string;
}

export interface ExtractMetadataResponse {
  success: boolean;
  data: ScrapedMetadata;
}

export interface CreateProjectRequest {
  name: string;
  url: string;
  tagline: string;
  description: string;
  shortDescription?: string;
  category?: string;
  tags?: string[];
  pricingModel?: PricingModel;
  logoUrl?: string;
  screenshotUrls?: string[];
  metadata?: ProjectMetadata;
}

export interface UpdateProjectRequest {
  name?: string;
  url?: string;
  tagline?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  tags?: string[];
  pricingModel?: PricingModel;
  logoUrl?: string;
  screenshotUrls?: string[];
  metadata?: ProjectMetadata;
}

export interface GetDirectoriesQuery {
  category?: string;
  submissionType?: string;
  minDr?: number;
  status?: string;
}

export interface GetDirectoriesResponse {
  directories: Directory[];
  total: number;
}

export interface LaunchSubmissionsRequest {
  projectId: string;
  directoryIds: string[];
}

export interface LaunchSubmissionsResponse {
  projectId: string;
  enqueuedCount: number;
  submissions: Submission[];
}

export interface GetSubmissionsQuery {
  projectId?: string;
  directoryId?: string;
  status?: SubmissionStatus;
  limit?: number;
  offset?: number;
}

export interface GetSubmissionsResponse {
  submissions: Submission[];
  total: number;
}

export interface RetrySubmissionResponse {
  success: boolean;
  submission: Submission;
}

export interface ResolveActionRequest {
  captchaToken?: string;
  twoFactorCode?: string;
  resolutionType: 'captcha_solved' | '2fa_entered' | 'manual_confirmed' | 'field_updated';
  customPayload?: Record<string, unknown>;
}

export interface ResolveActionResponse {
  success: boolean;
  status: 'resumed' | 'completed' | 'failed';
  message?: string;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    timestamp: string;
  };
}
