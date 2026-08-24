import { Injectable } from '@angular/core';
import {
  Directory,
  ExtractMetadataResponse,
  Project,
  Submission,
} from '@saas-autopublisher/shared';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://localhost:3001/api/v1';

  public async extractMetadata(url: string): Promise<ExtractMetadataResponse> {
    const res = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to extract metadata from URL');
    }
    return res.json();
  }

  public async getDirectories(): Promise<Directory[]> {
    const res = await fetch(`${this.baseUrl}/directories`);
    if (!res.ok) {
      throw new Error('Failed to load directory catalog');
    }
    const data = await res.json();
    return data.directories || data;
  }

  public async createProject(projectData: Partial<Project>): Promise<Project> {
    const res = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });
    if (!res.ok) {
      throw new Error('Failed to create project record');
    }
    const data = await res.json();
    return data.project || data;
  }

  public async launchSubmissions(
    projectId: string,
    directoryIds: string[]
  ): Promise<{ projectId: string; enqueuedCount: number; submissions: Submission[] }> {
    const res = await fetch(`${this.baseUrl}/submissions/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, directoryIds }),
    });
    if (!res.ok) {
      throw new Error('Failed to launch batch directory submission');
    }
    return res.json();
  }

  public async getSubmissions(projectId: string): Promise<Submission[]> {
    const res = await fetch(`${this.baseUrl}/submissions?projectId=${projectId}`);
    if (!res.ok) {
      throw new Error('Failed to fetch submission records');
    }
    const data = await res.json();
    return data.submissions || data;
  }
}
