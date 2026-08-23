import { randomUUID } from 'node:crypto';
import {
  CreateProjectRequest,
  CreateProjectRequestSchema,
  Project,
  UpdateProjectRequest,
  UpdateProjectRequestSchema,
} from '@saas-autopublisher/shared';

export class ProjectService {
  private memoryStore: Map<string, Project> = new Map();

  /**
   * Creates a new SaaS project record.
   */
  public async createProject(userId: string, rawData: CreateProjectRequest): Promise<Project> {
    const validated = CreateProjectRequestSchema.parse(rawData);

    const now = new Date().toISOString();
    const id = randomUUID();

    const project: Project = {
      id,
      userId: userId || '00000000-0000-0000-0000-000000000001',
      name: validated.name,
      url: validated.url,
      tagline: validated.tagline,
      description: validated.description,
      shortDescription: validated.shortDescription || null,
      category: validated.category || 'General SaaS',
      tags: validated.tags || [],
      pricingModel: (validated.pricingModel as any) || 'freemium',
      logoUrl: validated.logoUrl || null,
      screenshotUrls: validated.screenshotUrls || [],
      metadata: validated.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.memoryStore.set(id, project);
    return project;
  }

  /**
   * Retrieves a project by ID.
   */
  public async getProject(id: string): Promise<Project | null> {
    const project = this.memoryStore.get(id);
    return project ? { ...project } : null;
  }

  /**
   * Retrieves all projects, optionally filtered by user ID.
   */
  public async getProjects(userId?: string): Promise<Project[]> {
    const all = Array.from(this.memoryStore.values());
    if (!userId) {
      return all.map((p) => ({ ...p }));
    }
    return all.filter((p) => p.userId === userId).map((p) => ({ ...p }));
  }

  /**
   * Updates an existing project.
   */
  public async updateProject(id: string, rawData: UpdateProjectRequest): Promise<Project | null> {
    const existing = this.memoryStore.get(id);
    if (!existing) {
      return null;
    }

    const validated = UpdateProjectRequestSchema.parse(rawData);
    const now = new Date().toISOString();

    const updated: Project = {
      ...existing,
      name: validated.name ?? existing.name,
      url: validated.url ?? existing.url,
      tagline: validated.tagline ?? existing.tagline,
      description: validated.description ?? existing.description,
      shortDescription:
        validated.shortDescription !== undefined ? validated.shortDescription : existing.shortDescription,
      category: validated.category ?? existing.category,
      tags: validated.tags ?? existing.tags,
      pricingModel: (validated.pricingModel as any) ?? existing.pricingModel,
      logoUrl: validated.logoUrl !== undefined ? validated.logoUrl : existing.logoUrl,
      screenshotUrls: validated.screenshotUrls ?? existing.screenshotUrls,
      metadata: validated.metadata
        ? { ...existing.metadata, ...validated.metadata }
        : existing.metadata,
      updatedAt: now,
    };

    this.memoryStore.set(id, updated);
    return { ...updated };
  }

  /**
   * Deletes a project by ID.
   */
  public async deleteProject(id: string): Promise<boolean> {
    return this.memoryStore.delete(id);
  }

  /**
   * Clears the memory store (used for test isolation).
   */
  public clear(): void {
    this.memoryStore.clear();
  }
}

export const projectService = new ProjectService();
