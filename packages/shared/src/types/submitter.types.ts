import {
  ActionRequiredPayload,
  Directory,
  Project,
  SubmissionStatus,
  SubmissionType,
} from './entities.types.js';

export interface AdapterValidationResult {
  valid: boolean;
  missingFields: string[];
  warnings?: string[];
}

export interface SubmissionJobPayload {
  submissionId: string;
  projectId: string;
  directoryId: string;
  userId: string;
  project: Project;
  directory: Directory;
  retryCount?: number;
}

export interface SubmissionExecutionContext {
  log: (level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) => Promise<void>;
  updateStatus: (
    status: SubmissionStatus,
    partial?: {
      listingUrl?: string;
      proofScreenshotUrl?: string;
      errorMessage?: string;
      errorCode?: string;
    }
  ) => Promise<void>;
  signalIntervention: (payload: ActionRequiredPayload) => Promise<void>;
  captureProof: (screenshotBuffer: Buffer | Uint8Array | string, namePrefix?: string) => Promise<string>;
  updateProgress: (percentage: number, step: string) => Promise<void>;
}

export interface SubmissionResult {
  success: boolean;
  status: SubmissionStatus;
  listingUrl?: string;
  proofScreenshotUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  actionRequiredPayload?: ActionRequiredPayload;
}

export interface DirectorySubmitter {
  readonly id: string;
  readonly name: string;
  readonly submissionType: SubmissionType;

  validateProject(project: Project): AdapterValidationResult;
  submit(payload: SubmissionJobPayload, context: SubmissionExecutionContext): Promise<SubmissionResult>;
}
