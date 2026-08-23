import { describe, test, it, before, after, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';

// Export Node test runner primitives globally if not already present
if (!(globalThis as any).describe) {
  (globalThis as any).describe = describe;
  (globalThis as any).test = test;
  (globalThis as any).it = it;
  (globalThis as any).beforeAll = before;
  (globalThis as any).afterAll = after;
  (globalThis as any).beforeEach = beforeEach;
  (globalThis as any).afterEach = afterEach;
}

export function createExpect(actual: any, isNot = false) {
  const matchers = {
    toBe: (expected: any) => {
      if (isNot) {
        assert.notStrictEqual(actual, expected);
      } else {
        assert.strictEqual(actual, expected);
      }
    },
    toEqual: (expected: any) => {
      if (isNot) {
        assert.notDeepStrictEqual(actual, expected);
      } else {
        assert.deepStrictEqual(actual, expected);
      }
    },
    toBeDefined: () => {
      if (isNot) {
        assert.strictEqual(actual, undefined);
      } else {
        assert.notStrictEqual(actual, undefined);
      }
    },
    toBeUndefined: () => {
      if (isNot) {
        assert.notStrictEqual(actual, undefined);
      } else {
        assert.strictEqual(actual, undefined);
      }
    },
    toBeNull: () => {
      if (isNot) {
        assert.notStrictEqual(actual, null);
      } else {
        assert.strictEqual(actual, null);
      }
    },
    toBeTruthy: () => {
      if (isNot) {
        assert.ok(!actual);
      } else {
        assert.ok(actual);
      }
    },
    toBeFalsy: () => {
      if (isNot) {
        assert.ok(actual);
      } else {
        assert.ok(!actual);
      }
    },
    toContain: (item: any) => {
      if (typeof actual === 'string') {
        const contains = actual.includes(item);
        if (isNot) {
          assert.strictEqual(contains, false, `Expected string NOT to contain "${item}", but received:\n${actual}`);
        } else {
          assert.strictEqual(contains, true, `Expected string to contain "${item}", but received:\n${actual}`);
        }
      } else if (Array.isArray(actual)) {
        const contains = actual.includes(item);
        if (isNot) {
          assert.strictEqual(contains, false, `Expected array NOT to contain ${JSON.stringify(item)}`);
        } else {
          assert.strictEqual(contains, true, `Expected array to contain ${JSON.stringify(item)}`);
        }
      } else {
        assert.fail(`toContain requires string or array, received: ${typeof actual}`);
      }
    },
    toHaveLength: (length: number) => {
      if (actual && typeof actual.length === 'number') {
        if (isNot) {
          assert.notStrictEqual(actual.length, length);
        } else {
          assert.strictEqual(actual.length, length);
        }
      } else {
        assert.fail(`toHaveLength requires object with length property, received: ${actual}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (isNot) {
        assert.ok(actual <= expected, `Expected ${actual} NOT to be greater than ${expected}`);
      } else {
        assert.ok(actual > expected, `Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (isNot) {
        assert.ok(actual < expected, `Expected ${actual} NOT to be greater than or equal to ${expected}`);
      } else {
        assert.ok(actual >= expected, `Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toBeLessThan: (expected: number) => {
      if (isNot) {
        assert.ok(actual >= expected, `Expected ${actual} NOT to be less than ${expected}`);
      } else {
        assert.ok(actual < expected, `Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeLessThanOrEqual: (expected: number) => {
      if (isNot) {
        assert.ok(actual > expected, `Expected ${actual} NOT to be less than or equal to ${expected}`);
      } else {
        assert.ok(actual <= expected, `Expected ${actual} to be less than or equal to ${expected}`);
      }
    },
    toThrow: (expectedError?: string | RegExp) => {
      if (typeof actual !== 'function') {
        assert.fail('toThrow requires a function');
      }
      let threw = false;
      let error: any;
      try {
        actual();
      } catch (err: any) {
        threw = true;
        error = err;
      }
      if (isNot) {
        assert.strictEqual(threw, false, `Expected function NOT to throw, but threw: ${error?.message}`);
      } else {
        assert.strictEqual(threw, true, 'Expected function to throw an error');
        if (expectedError) {
          if (typeof expectedError === 'string') {
            assert.ok(error?.message?.includes(expectedError), `Expected error message to include "${expectedError}", but got "${error?.message}"`);
          } else if (expectedError instanceof RegExp) {
            assert.ok(expectedError.test(error?.message || ''), `Expected error message to match ${expectedError}, but got "${error?.message}"`);
          }
        }
      }
    },
    get not() {
      return createExpect(actual, !isNot);
    }
  };

  return matchers;
}

if (!(globalThis as any).expect) {
  (globalThis as any).expect = createExpect;
}
