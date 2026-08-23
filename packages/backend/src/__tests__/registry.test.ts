import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DirectoryRegistryService } from '../registry/index.js';
import { Directory } from '@saas-autopublisher/shared';

describe('Directory Registry Service Suite', () => {
  const registry = new DirectoryRegistryService();

  it('loads canonical catalog with at least 7 high-authority directories', () => {
    const directories = registry.getDirectories();
    assert.ok(directories.length >= 7, `Expected >= 7 directories, got ${directories.length}`);
  });

  it('retrieves individual directory by ID', () => {
    const uneed = registry.getDirectoryById('uneed');
    assert.ok(uneed);
    assert.strictEqual(uneed.name, 'Uneed.best');
    assert.strictEqual(uneed.submissionType, 'form_automation');
    assert.ok(uneed.domainRating > 0);

    const nonExistent = registry.getDirectoryById('unknown_dir');
    assert.strictEqual(nonExistent, undefined);
  });

  it('filters directories by category', () => {
    const aiDirs = registry.getDirectories({ category: 'AI' });
    assert.ok(aiDirs.length > 0);
    assert.ok(aiDirs.every((d) => d.category.toLowerCase().includes('ai')));
  });

  it('filters directories by minimum Domain Rating (DR)', () => {
    const highDrDirs = registry.getDirectories({ minDr: 80 });
    assert.ok(highDrDirs.length > 0);
    assert.ok(highDrDirs.every((d) => d.domainRating >= 80));
  });

  it('filters directories by submission type', () => {
    const apiDirs = registry.getDirectories({ submissionType: 'direct_api' });
    assert.ok(apiDirs.length > 0);
    assert.ok(apiDirs.every((d) => d.submissionType === 'direct_api'));
  });

  it('allows registering custom directories dynamically', () => {
    const customDir: Directory = {
      id: 'custom_launch',
      name: 'Custom Launch Community',
      url: 'https://customlaunch.co',
      category: 'Startups',
      domainRating: 65,
      submissionType: 'direct_api',
      status: 'active',
      requiresAuth: false,
      estimatedTimeSec: 20,
      config: { apiEndpoint: 'https://customlaunch.co/api/submit' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    registry.registerDirectory(customDir);
    const retrieved = registry.getDirectoryById('custom_launch');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.name, 'Custom Launch Community');
  });

  it('extracts unique categories list', () => {
    const categories = registry.getCategories();
    assert.ok(categories.length >= 3);
    assert.ok(categories.includes('AI Tools'));
  });
});
