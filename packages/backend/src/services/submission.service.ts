import { randomUUID } from 'node:crypto';
import {
  GetSubmissionsQuery,
  LaunchSubmissionsRequestSchema,
  ResolveActionRequest,
  ResolveActionRequestSchema,
  Submission,
  SubmissionWithDirectory,
} from '@saas-autopublisher/shared';
import { directoryRegistry } from '../registry/directory-registry.service.js';
import { projectService } from './project.service.js';
import { realtimeService } from './realtime.service.js';

export class SubmissionService {
  private memoryStore: Map<string, Submission> = new Map();

  /**
   * Enqueues batch submissions for a given project across selected directories.
   */
  public async launchBatch(
    projectId: string,
    rawDirectoryIds: string[],
    userId?: string
  ): Promise<{ projectId: string; enqueuedCount: number; submissions: Submission[] }> {
    const validated = LaunchSubmissionsRequestSchema.parse({
      projectId,
      directoryIds: rawDirectoryIds,
    });

    const project = await projectService.getProject(validated.projectId);
    if (!project) {
      throw new Error(`Project not found with ID "${validated.projectId}"`);
    }

    const effectiveUserId = userId || project.userId || '00000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    const createdSubmissions: Submission[] = [];

    for (const directoryId of validated.directoryIds) {
      const directory = directoryRegistry.getDirectoryById(directoryId);
      if (!directory) {
        throw new Error(`Directory not found with ID "${directoryId}"`);
      }

      // Check if submission already exists for this project + directory
      const existing = Array.from(this.memoryStore.values()).find(
        (s) => s.projectId === projectId && s.directoryId === directoryId
      );

      if (existing) {
        // Reset existing submission to queued
        existing.status = 'queued';
        existing.errorMessage = null;
        existing.errorCode = null;
        existing.actionRequiredPayload = null;
        existing.updatedAt = now;
        existing.logs.push({
          timestamp: now,
          level: 'info',
          message: `Re-enqueued submission job for directory ${directory.name}`,
        });
        this.memoryStore.set(existing.id, existing);
        createdSubmissions.push(existing);

        realtimeService.emitStatusChange(existing.id, projectId, directoryId, 'queued');
      } else {
        const id = randomUUID();
        const submission: Submission = {
          id,
          projectId,
          directoryId,
          userId: effectiveUserId,
          status: 'queued',
          jobId: `job_${id.substring(0, 8)}`,
          listingUrl: null,
          proofScreenshotUrl: null,
          logs: [
            {
              timestamp: now,
              level: 'info',
              message: `Job enqueued for directory ${directory.name} (${directory.submissionType})`,
            },
          ],
          errorMessage: null,
          errorCode: null,
          retryCount: 0,
          actionRequiredPayload: null,
          startedAt: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };

        this.memoryStore.set(id, submission);
        createdSubmissions.push(submission);

        realtimeService.emitStatusChange(id, projectId, directoryId, 'queued');
      }
    }

    return {
      projectId,
      enqueuedCount: createdSubmissions.length,
      submissions: createdSubmissions,
    };
  }

  /**
   * Retrieves submissions with optional filters.
   */
  public async getSubmissions(
    query?: GetSubmissionsQuery
  ): Promise<{ submissions: Submission[]; total: number }> {
    let result = Array.from(this.memoryStore.values());

    if (query?.projectId) {
      result = result.filter((s) => s.projectId === query.projectId);
    }

    if (query?.directoryId) {
      result = result.filter((s) => s.directoryId === query.directoryId);
    }

    if (query?.status) {
      result = result.filter((s) => s.status === query.status);
    }

    const total = result.length;

    // Apply pagination
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? 50;
    result = result.slice(offset, offset + limit);

    return { submissions: result.map((s) => ({ ...s })), total };
  }

  /**
   * Retrieves a single submission by ID.
   */
  public async getSubmissionById(id: string): Promise<Submission | null> {
    const sub = this.memoryStore.get(id);
    return sub ? { ...sub } : null;
  }

  /**
   * Retrieves all submissions for a project, enriched with Directory metadata.
   */
  public async getSubmissionsByProject(projectId: string): Promise<SubmissionWithDirectory[]> {
    const subs = Array.from(this.memoryStore.values()).filter((s) => s.projectId === projectId);
    const enriched: SubmissionWithDirectory[] = [];

    for (const sub of subs) {
      const dir = directoryRegistry.getDirectoryById(sub.directoryId);
      if (dir) {
        enriched.push({
          ...sub,
          directory: { ...dir },
        });
      }
    }

    return enriched;
  }

  /**
   * Updates a submission record status and emits events.
   */
  public async updateSubmission(id: string, partial: Partial<Submission>): Promise<Submission | null> {
    const existing = this.memoryStore.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Submission = {
      ...existing,
      ...partial,
      updatedAt: now,
    };

    this.memoryStore.set(id, updated);

    if (partial.status && partial.status !== existing.status) {
      realtimeService.emitStatusChange(id, updated.projectId, updated.directoryId, partial.status, {
        resultUrl: updated.listingUrl,
        proofScreenshotUrl: updated.proofScreenshotUrl,
      });
    }

    return { ...updated };
  }

  /**
   * Retries a failed or action-required submission.
   */
  public async retrySubmission(id: string): Promise<Submission | null> {
    const existing = this.memoryStore.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    existing.status = 'queued';
    existing.errorMessage = null;
    existing.errorCode = null;
    existing.actionRequiredPayload = null;
    existing.retryCount += 1;
    existing.updatedAt = now;
    existing.logs.push({
      timestamp: now,
      level: 'info',
      message: `Manual retry requested (Attempt #${existing.retryCount})`,
    });

    this.memoryStore.set(id, existing);
    realtimeService.emitStatusChange(id, existing.projectId, existing.directoryId, 'queued');

    return { ...existing };
  }

  /**
   * Resolves an action_required security challenge or verification code.
   */
  public async resolveAction(
    id: string,
    rawData: ResolveActionRequest
  ): Promise<{ success: boolean; status: 'resumed' | 'completed' | 'failed'; message?: string }> {
    const validated = ResolveActionRequestSchema.parse(rawData);
    const existing = this.memoryStore.get(id);

    if (!existing) {
      throw new Error(`Submission not found with ID "${id}"`);
    }

    const now = new Date().toISOString();
    existing.status = 'in_progress';
    existing.actionRequiredPayload = null;
    existing.updatedAt = now;
    existing.logs.push({
      timestamp: now,
      level: 'info',
      message: `User intervention resolved: ${validated.resolutionType}`,
      context: validated.customPayload,
    });

    this.memoryStore.set(id, existing);
    realtimeService.emitStatusChange(id, existing.projectId, existing.directoryId, 'in_progress', {
      resolutionType: validated.resolutionType,
    });

    return {
      success: true,
      status: 'resumed',
      message: `Challenge resolved via ${validated.resolutionType}. Submission resuming.`,
    };
  }

  /**
   * Appends a log line to a submission and emits realtime log event.
   */
  public async appendLog(
    id: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    const existing = this.memoryStore.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    const logItem = { timestamp: now, level, message, context };
    existing.logs.push(logItem);
    existing.updatedAt = now;

    this.memoryStore.set(id, existing);
    realtimeService.emitLog(id, existing.projectId, existing.directoryId, level, message, context);
  }

  /**
   * Clears all submissions (for test isolation).
   */
  public clear(): void {
    this.memoryStore.clear();
  }
}

export const submissionService = new SubmissionService();
