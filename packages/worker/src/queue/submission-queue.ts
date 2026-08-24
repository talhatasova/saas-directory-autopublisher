import { EventEmitter } from 'node:events';
import {
  ActionRequiredPayload,
  SubmissionExecutionContext,
  SubmissionJobPayload,
  SubmissionResult,
  SubmissionStatus,
} from '@saas-autopublisher/shared';
import { AdapterRegistry } from '../adapters/index.js';
import { ProofScreenshotCapture } from '../proof/screenshot-capture.js';

export interface QueueOptions {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class SubmissionQueue extends EventEmitter {
  private concurrency: number;
  private maxRetries: number;
  private retryDelayMs: number;
  private queue: SubmissionJobPayload[] = [];
  private activeJobsCount: number = 0;
  private proofCapture: ProofScreenshotCapture;

  constructor(options: QueueOptions = {}) {
    super();
    this.concurrency = options.concurrency ?? 10;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.proofCapture = new ProofScreenshotCapture();
  }

  public enqueue(payload: SubmissionJobPayload): void {
    payload.retryCount = payload.retryCount ?? 0;
    this.queue.push(payload);
    this.emit('job:queued', { submissionId: payload.submissionId, payload });
    this.processNext();
  }

  public enqueueBatch(payloads: SubmissionJobPayload[]): void {
    for (const p of payloads) {
      this.enqueue(p);
    }
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getActiveCount(): number {
    return this.activeJobsCount;
  }

  private async processNext(): Promise<void> {
    if (this.activeJobsCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const payload = this.queue.shift();
    if (!payload) return;

    this.activeJobsCount++;
    this.emit('job:started', { submissionId: payload.submissionId, payload });

    // Execute job asynchronously
    this.executeJob(payload).finally(() => {
      this.activeJobsCount--;
      this.processNext();
    });

    // Try processing more if concurrency allows
    if (this.activeJobsCount < this.concurrency && this.queue.length > 0) {
      this.processNext();
    }
  }

  private async executeJob(payload: SubmissionJobPayload): Promise<void> {
    const adapter = AdapterRegistry.getAdapter(payload.directoryId) ||
                    AdapterRegistry.getAdapter(payload.directory.id);

    if (!adapter) {
      this.emit('job:failed', {
        submissionId: payload.submissionId,
        error: `No submitter adapter found for directory: ${payload.directoryId}`,
      });
      return;
    }

    const context: SubmissionExecutionContext = {
      log: async (level, message, ctx) => {
        this.emit('job:log', { submissionId: payload.submissionId, level, message, ctx });
      },
      updateStatus: async (status: SubmissionStatus, partial) => {
        this.emit('job:status', { submissionId: payload.submissionId, status, partial });
      },
      signalIntervention: async (actionPayload: ActionRequiredPayload) => {
        this.emit('job:action_required', {
          submissionId: payload.submissionId,
          payload: actionPayload,
        });
      },
      captureProof: async (buf, prefix) => {
        return this.proofCapture.uploadProof(buf, payload.submissionId, prefix);
      },
      updateProgress: async (percentage: number, step: string) => {
        this.emit('job:progress', {
          submissionId: payload.submissionId,
          percentage,
          step,
        });
      },
    };

    try {
      const result: SubmissionResult = await adapter.submit(payload, context);

      if (result.success) {
        this.emit('job:completed', {
          submissionId: payload.submissionId,
          result,
        });
      } else if (result.status === 'action_required') {
        this.emit('job:action_required', {
          submissionId: payload.submissionId,
          payload: result.actionRequiredPayload,
        });
      } else {
        // Retry logic
        const currentRetries = payload.retryCount ?? 0;
        if (currentRetries < this.maxRetries) {
          payload.retryCount = currentRetries + 1;
          const delay = this.retryDelayMs * Math.pow(2, currentRetries);
          await context.log('warn', `Job failed, scheduling retry #${payload.retryCount} in ${delay}ms`);
          setTimeout(() => {
            this.enqueue(payload);
          }, delay);
        } else {
          this.emit('job:failed', {
            submissionId: payload.submissionId,
            error: result.errorMessage || 'Submission failed after maximum retries',
          });
        }
      }
    } catch (err: any) {
      this.emit('job:failed', {
        submissionId: payload.submissionId,
        error: err.message,
      });
    }
  }
}
