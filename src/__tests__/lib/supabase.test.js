/**
 * Tests for src/lib/supabase.ts
 * Validates configuration detection and client creation
 */

describe('supabase configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('detects when Supabase is properly configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key-123';

    const { isSupabaseConfigured } = require('@/lib/supabase');
    expect(isSupabaseConfigured).toBe(true);
  });

  it('detects when Supabase URL is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    const { isSupabaseConfigured } = require('@/lib/supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('detects when Supabase key is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    const { isSupabaseConfigured } = require('@/lib/supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('rejects placeholder URLs', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    const { isSupabaseConfigured } = require('@/lib/supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('rejects non-https URLs', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    const { isSupabaseConfigured } = require('@/lib/supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('exports a supabase client instance', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    const { supabase } = require('@/lib/supabase');
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('getCurrentUser returns null when not configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    const { getCurrentUser } = require('@/lib/supabase');
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('getSession returns null when not configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    const { getSession } = require('@/lib/supabase');
    const session = await getSession();
    expect(session).toBeNull();
  });
});
