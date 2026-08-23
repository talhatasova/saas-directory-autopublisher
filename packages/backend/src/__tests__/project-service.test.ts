import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ProjectService } from '../services/index.js';

describe('Project Service Suite', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    projectService = new ProjectService();
  });

  it('creates project with full validated payload and auto-generated UUID', async () => {
    const project = await projectService.createProject('user-123', {
      name: 'PulseMetrics',
      url: 'https://pulsemetrics.io',
      tagline: 'Real-time SaaS analytics',
      description: 'Comprehensive financial dashboard for indie hackers and bootstrapped founders.',
      category: 'Analytics',
      tags: ['saas', 'stripe'],
      pricingModel: 'freemium',
      logoUrl: 'https://pulsemetrics.io/logo.png',
      screenshotUrls: ['https://pulsemetrics.io/screen.png'],
      metadata: { ogTitle: 'PulseMetrics' },
    });

    assert.ok(project.id);
    assert.strictEqual(project.userId, 'user-123');
    assert.strictEqual(project.name, 'PulseMetrics');
    assert.strictEqual(project.pricingModel, 'freemium');
    assert.strictEqual(project.category, 'Analytics');
    assert.deepStrictEqual(project.tags, ['saas', 'stripe']);
  });

  it('retrieves project by ID and filters projects by user ID', async () => {
    const p1 = await projectService.createProject('user-A', {
      name: 'App Alpha',
      url: 'https://alpha.io',
      tagline: 'Alpha product',
      description: 'Alpha description of software.',
    });

    const p2 = await projectService.createProject('user-B', {
      name: 'App Beta',
      url: 'https://beta.io',
      tagline: 'Beta product',
      description: 'Beta description of software.',
    });

    const retrieved = await projectService.getProject(p1.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.name, 'App Alpha');

    const userAProjects = await projectService.getProjects('user-A');
    assert.strictEqual(userAProjects.length, 1);
    assert.strictEqual(userAProjects[0]?.id, p1.id);

    const allProjects = await projectService.getProjects();
    assert.strictEqual(allProjects.length, 2);
  });

  it('updates project fields partially', async () => {
    const project = await projectService.createProject('user-1', {
      name: 'Original Name',
      url: 'https://original.io',
      tagline: 'Original tagline',
      description: 'Original description here.',
    });

    const updated = await projectService.updateProject(project.id, {
      name: 'Updated Name',
      pricingModel: 'subscription',
      tags: ['new-tag'],
    });

    assert.ok(updated);
    assert.strictEqual(updated.name, 'Updated Name');
    assert.strictEqual(updated.pricingModel, 'subscription');
    assert.deepStrictEqual(updated.tags, ['new-tag']);
    assert.strictEqual(updated.tagline, 'Original tagline');
  });

  it('deletes project by ID', async () => {
    const project = await projectService.createProject('user-1', {
      name: 'To Delete',
      url: 'https://todelete.io',
      tagline: 'Delete me',
      description: 'Description of product to be deleted.',
    });

    const deleted = await projectService.deleteProject(project.id);
    assert.strictEqual(deleted, true);

    const check = await projectService.getProject(project.id);
    assert.strictEqual(check, null);
  });
});
