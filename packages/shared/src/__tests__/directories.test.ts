import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DIRECTORY_CATALOG, DIRECTORY_BY_ID } from '../constants/directories.constant.js';
import { SUBMISSION_TYPES, DIRECTORY_STATUSES } from '../constants/status.constant.js';

describe('Directory Catalog Constants', () => {
  it('should contain all required canonical directories', () => {
    const requiredIds = [
      'alternativeto',
      'saashub',
      'toolify',
      'uneed',
      'theresanaiforthat',
      'indiehackers',
      'producthunt',
    ];

    assert.strictEqual(DIRECTORY_CATALOG.length >= 7, true);

    for (const id of requiredIds) {
      const dir = DIRECTORY_BY_ID.get(id);
      assert.ok(dir, `Directory ${id} should exist in DIRECTORY_BY_ID map`);
      assert.strictEqual(dir.id, id);
      assert.ok(dir.name.length > 0, `Directory ${id} must have a name`);
      assert.ok(dir.url.startsWith('https://'), `Directory ${id} URL must start with https://`);
      assert.ok(dir.domainRating >= 0 && dir.domainRating <= 100, `Directory ${id} DR must be 0-100`);
      assert.ok(SUBMISSION_TYPES.includes(dir.submissionType), `Directory ${id} has invalid submissionType`);
      assert.ok(DIRECTORY_STATUSES.includes(dir.status), `Directory ${id} has invalid status`);
      assert.ok(dir.estimatedTimeSec > 0, `Directory ${id} must have positive estimatedTimeSec`);
      assert.ok(typeof dir.config === 'object' && dir.config !== null, `Directory ${id} must have config object`);
    }
  });

  it('should have unique IDs across all catalog entries', () => {
    const ids = DIRECTORY_CATALOG.map((d) => d.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'All directory IDs must be unique');
  });

  it('should map DIRECTORY_BY_ID correctly to catalog items', () => {
    for (const dir of DIRECTORY_CATALOG) {
      const mapped = DIRECTORY_BY_ID.get(dir.id);
      assert.deepStrictEqual(mapped, dir);
    }
  });
});
