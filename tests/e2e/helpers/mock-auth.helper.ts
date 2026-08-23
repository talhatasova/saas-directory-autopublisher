import { Page } from '@playwright/test';

export interface MockUserSession {
  id: string;
  email: string;
  user_metadata: {
    full_name: string;
    avatar_url: string;
  };
  access_token: string;
  refresh_token: string;
}

export const DEFAULT_MOCK_USER: MockUserSession = {
  id: 'usr-founder-001',
  email: 'founder@pulsemetrics.io',
  user_metadata: {
    full_name: 'Alex Founder',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
  },
  access_token: 'mock-sb-access-token-jwt',
  refresh_token: 'mock-sb-refresh-token'
};

/**
 * Injects a mock authenticated Supabase user session into the browser context.
 */
export async function injectMockAuthSession(page: Page, user = DEFAULT_MOCK_USER): Promise<void> {
  const supabaseKey = 'sb-qxakcsdaixzfttlcmnch-auth-token';
  const sessionData = {
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
    token_type: 'bearer',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: user.user_metadata,
      app_metadata: { provider: 'google', providers: ['google'] }
    }
  };

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.localStorage.setItem('supabase.auth.token', JSON.stringify(value));
    },
    { key: supabaseKey, value: sessionData }
  );
}
