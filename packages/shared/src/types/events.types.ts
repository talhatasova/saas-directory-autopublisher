import { ActionRequiredPayload, SubmissionLogLevel, SubmissionStatus } from './entities.types.js';

export type JobEventType =
  | 'job:queued'
  | 'job:started'
  | 'job:progress'
  | 'job:log'
  | 'job:action_required'
  | 'job:completed'
  | 'job:failed'
  | 'job:cancelled';

export interface JobProgressEvent {
  event: 'job:progress';
  submissionId: string;
  projectId: string;
  directoryId: string;
  status: SubmissionStatus;
  step: string;
  progressPercentage: number;
  timestamp: string;
}

export interface JobLogEvent {
  event: 'job:log';
  submissionId: string;
  projectId: string;
  directoryId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface JobActionRequiredEvent {
  event: 'job:action_required';
  submissionId: string;
  projectId: string;
  directoryId: string;
  status: 'action_required';
  payload: ActionRequiredPayload;
  timestamp: string;
}

export interface JobCompletedEvent {
  event: 'job:completed';
  submissionId: string;
  projectId: string;
  directoryId: string;
  status: 'published';
  listingUrl?: string;
  proofScreenshotUrl?: string;
  completedAt: string;
}

export interface JobFailedEvent {
  event: 'job:failed';
  submissionId: string;
  projectId: string;
  directoryId: string;
  status: 'failed';
  errorMessage: string;
  errorCode?: string;
  failedAt: string;
}

export type JobStreamEvent =
  | JobProgressEvent
  | JobLogEvent
  | JobActionRequiredEvent
  | JobCompletedEvent
  | JobFailedEvent;
