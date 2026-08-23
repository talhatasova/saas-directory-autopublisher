import { Database, Json } from '../types/database.types.js';
import {
  ActionRequiredPayload,
  Directory,
  DirectoryConfig,
  Project,
  ProjectMetadata,
  Submission,
  SubmissionLogLevel,
  User,
} from '../types/entities.types.js';
import { TypedSupabaseClient } from './client.js';

type UserRow = Database['public']['Tables']['users']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type DirectoryRow = Database['public']['Tables']['directories']['Row'];
type SubmissionRow = Database['public']['Tables']['submissions']['Row'];

/**
 * Maps database User row to domain User entity
 */
export function mapUserRowToEntity(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    plan: row.plan,
    submissionsQuota: row.submissions_quota,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps database Project row to domain Project entity
 */
export function mapProjectRowToEntity(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    url: row.url,
    tagline: row.tagline,
    description: row.description,
    shortDescription: row.short_description,
    category: row.category,
    tags: row.tags,
    pricingModel: row.pricing_model,
    logoUrl: row.logo_url,
    screenshotUrls: row.screenshot_urls,
    metadata: (row.metadata || {}) as ProjectMetadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps domain Project entity or partial to database Insert/Update row
 */
export function mapProjectEntityToRow(
  project: Partial<Project> & { userId?: string }
): Partial<Database['public']['Tables']['projects']['Insert']> {
  const row: Partial<Database['public']['Tables']['projects']['Insert']> = {};
  if (project.id !== undefined) row.id = project.id;
  if (project.userId !== undefined) row.user_id = project.userId;
  if (project.name !== undefined) row.name = project.name;
  if (project.url !== undefined) row.url = project.url;
  if (project.tagline !== undefined) row.tagline = project.tagline;
  if (project.description !== undefined) row.description = project.description;
  if (project.shortDescription !== undefined) row.short_description = project.shortDescription;
  if (project.category !== undefined) row.category = project.category;
  if (project.tags !== undefined) row.tags = project.tags;
  if (project.pricingModel !== undefined) row.pricing_model = project.pricingModel;
  if (project.logoUrl !== undefined) row.logo_url = project.logoUrl;
  if (project.screenshotUrls !== undefined) row.screenshot_urls = project.screenshotUrls;
  if (project.metadata !== undefined) row.metadata = project.metadata as unknown as Json;
  return row;
}

/**
 * Maps database Directory row to domain Directory entity
 */
export function mapDirectoryRowToEntity(row: DirectoryRow): Directory {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    category: row.category,
    domainRating: row.domain_rating,
    submissionType: row.submission_type,
    status: row.status,
    requiresAuth: row.requires_auth,
    estimatedTimeSec: row.estimated_time_sec,
    config: (row.config || {}) as DirectoryConfig,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps database Submission row to domain Submission entity
 */
export function mapSubmissionRowToEntity(row: SubmissionRow): Submission {
  return {
    id: row.id,
    projectId: row.project_id,
    directoryId: row.directory_id,
    userId: row.user_id,
    status: row.status,
    jobId: row.job_id,
    listingUrl: row.listing_url,
    proofScreenshotUrl: row.proof_screenshot_url,
    logs: (Array.isArray(row.logs) ? (row.logs as unknown as SubmissionLogLevel[]) : []),
    errorMessage: row.error_message,
    errorCode: row.error_code,
    retryCount: row.retry_count,
    actionRequiredPayload: (row.action_required_payload || null) as unknown as ActionRequiredPayload | null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Database Helper Class for strongly typed queries
 */
export class SupabaseDbService {
  constructor(private client: TypedSupabaseClient) {}

  /**
   * Fetches user profile by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return mapUserRowToEntity(data);
  }

  /**
   * Fetches projects for a given user
   */
  async getProjects(userId: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapProjectRowToEntity);
  }

  /**
   * Fetches single project by ID
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) return null;
    return mapProjectRowToEntity(data);
  }

  /**
   * Inserts a new project
   */
  async createProject(
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    const row = mapProjectEntityToRow(projectData);
    const { data, error } = await this.client
      .from('projects')
      .insert(row as Database['public']['Tables']['projects']['Insert'])
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create project: ${error?.message}`);
    }
    return mapProjectRowToEntity(data);
  }

  /**
   * Updates an existing project
   */
  async updateProject(
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Project> {
    const row = mapProjectEntityToRow(updates);
    const { data, error } = await this.client
      .from('projects')
      .update(row as Database['public']['Tables']['projects']['Update'])
      .eq('id', projectId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update project: ${error?.message}`);
    }
    return mapProjectRowToEntity(data);
  }

  /**
   * Deletes a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const { error } = await this.client.from('projects').delete().eq('id', projectId);
    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Fetches all active directories
   */
  async getActiveDirectories(): Promise<Directory[]> {
    const { data, error } = await this.client
      .from('directories')
      .select('*')
      .eq('status', 'active')
      .order('domain_rating', { ascending: false });

    if (error || !data) return [];
    return data.map(mapDirectoryRowToEntity);
  }

  /**
   * Fetches submissions for a project
   */
  async getSubmissionsByProjectId(projectId: string): Promise<Submission[]> {
    const { data, error } = await this.client
      .from('submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapSubmissionRowToEntity);
  }

  /**
   * Fetches single submission by ID
   */
  async getSubmissionById(submissionId: string): Promise<Submission | null> {
    const { data, error } = await this.client
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error || !data) return null;
    return mapSubmissionRowToEntity(data);
  }

  /**
   * Creates a submission job record
   */
  async createSubmission(
    submission: Omit<Submission, 'id' | 'createdAt' | 'updatedAt' | 'logs'> & {
      logs?: SubmissionLogLevel[];
    }
  ): Promise<Submission> {
    const { data, error } = await this.client
      .from('submissions')
      .insert({
        project_id: submission.projectId,
        directory_id: submission.directoryId,
        user_id: submission.userId,
        status: submission.status,
        job_id: submission.jobId,
        listing_url: submission.listingUrl,
        proof_screenshot_url: submission.proofScreenshotUrl,
        logs: (submission.logs || []) as unknown as Json,
        error_message: submission.errorMessage,
        error_code: submission.errorCode,
        retry_count: submission.retryCount ?? 0,
        action_required_payload: (submission.actionRequiredPayload || null) as unknown as Json,
        started_at: submission.startedAt,
        completed_at: submission.completedAt,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create submission: ${error?.message}`);
    }
    return mapSubmissionRowToEntity(data);
  }

  /**
   * Updates submission status and outcome
   */
  async updateSubmissionStatus(
    submissionId: string,
    status: Submission['status'],
    details?: {
      listingUrl?: string;
      proofScreenshotUrl?: string;
      errorMessage?: string;
      errorCode?: string;
      startedAt?: string;
      completedAt?: string;
      actionRequiredPayload?: ActionRequiredPayload | null;
    }
  ): Promise<Submission> {
    const updatePayload: Database['public']['Tables']['submissions']['Update'] = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (details?.listingUrl !== undefined) updatePayload.listing_url = details.listingUrl;
    if (details?.proofScreenshotUrl !== undefined)
      updatePayload.proof_screenshot_url = details.proofScreenshotUrl;
    if (details?.errorMessage !== undefined) updatePayload.error_message = details.errorMessage;
    if (details?.errorCode !== undefined) updatePayload.error_code = details.errorCode;
    if (details?.startedAt !== undefined) updatePayload.started_at = details.startedAt;
    if (details?.completedAt !== undefined) updatePayload.completed_at = details.completedAt;
    if (details?.actionRequiredPayload !== undefined) {
      updatePayload.action_required_payload = details.actionRequiredPayload as unknown as Json;
    }

    const { data, error } = await this.client
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update submission status: ${error?.message}`);
    }
    return mapSubmissionRowToEntity(data);
  }

  /**
   * Appends a log entry to submission logs array
   */
  async appendSubmissionLog(
    submissionId: string,
    logEntry: SubmissionLogLevel
  ): Promise<void> {
    const sub = await this.getSubmissionById(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const updatedLogs = [...sub.logs, logEntry];
    const { error } = await this.client
      .from('submissions')
      .update({
        logs: updatedLogs as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) {
      throw new Error(`Failed to append log: ${error.message}`);
    }
  }
}
