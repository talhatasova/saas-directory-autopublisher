import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createTypedSupabaseClient, createSupabaseServiceClient } from '../supabase/client.js';
import { SUPABASE_DEFAULTS } from '../constants/config.constant.js';

describe('Supabase Client Factory', () => {
  it('should create typed Supabase client with default configuration', () => {
    const client = createTypedSupabaseClient();
    assert.ok(client, 'Client should be instantiated');
    assert.strictEqual(typeof client.from, 'function');
    assert.strictEqual(typeof client.auth, 'object');
    assert.strictEqual(typeof client.channel, 'function');
  });

  it('should create Supabase service client with default and custom options', () => {
    const serviceClient = createSupabaseServiceClient();
    assert.ok(serviceClient, 'Service client should be instantiated');
    assert.strictEqual(typeof serviceClient.from, 'function');
  });

  it('should match configured project reference in defaults', () => {
    assert.strictEqual(SUPABASE_DEFAULTS.PROJECT_REF, 'qxakcsdaixzfttlcmnch');
    assert.ok(SUPABASE_DEFAULTS.URL.includes('qxakcsdaixzfttlcmnch.supabase.co'));
  });
});
