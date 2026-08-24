import { SubmissionQueue } from './queue/submission-queue.js';
import { AdapterRegistry } from './adapters/index.js';
import { CaptchaDetector } from './captcha/captcha-detector.js';
import { ProofScreenshotCapture } from './proof/screenshot-capture.js';

export class WorkerService {
  private queue: SubmissionQueue;

  constructor(concurrency: number = 10) {
    this.queue = new SubmissionQueue({ concurrency });
    this.bindEvents();
  }

  private bindEvents(): void {
    this.queue.on('job:started', ({ submissionId }) => {
      console.log(`[Worker] Started job ${submissionId}`);
    });

    this.queue.on('job:progress', ({ submissionId, percentage, step }) => {
      console.log(`[Worker] Job ${submissionId} [${percentage}%] - ${step}`);
    });

    this.queue.on('job:completed', ({ submissionId, result }) => {
      console.log(`[Worker] Job ${submissionId} COMPLETED -> ${result.listingUrl}`);
    });

    this.queue.on('job:failed', ({ submissionId, error }) => {
      console.error(`[Worker] Job ${submissionId} FAILED: ${error}`);
    });

    this.queue.on('job:action_required', ({ submissionId, payload }) => {
      console.warn(`[Worker] Job ${submissionId} ACTION REQUIRED:`, payload);
    });
  }

  public getQueue(): SubmissionQueue {
    return this.queue;
  }
}

export {
  SubmissionQueue,
  AdapterRegistry,
  CaptchaDetector,
  ProofScreenshotCapture,
};
