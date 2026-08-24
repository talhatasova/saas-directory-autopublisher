import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from '../core/supabase.service.js';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  plan: 'free' | 'pro' | 'enterprise';
}

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  public user = signal<UserProfile | null>({
    id: 'usr_demo_founder',
    email: 'founder@launchauto.ai',
    name: 'Alex Founder',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    plan: 'pro',
  });

  public isAuthenticated = computed(() => !!this.user());

  constructor(private supabase: SupabaseService) {
    this.initSession();
  }

  private async initSession(): Promise<void> {
    try {
      const u = await this.supabase.getCurrentUser();
      if (u) {
        const metadata = u.user_metadata || {};
        this.user.set({
          id: u.id,
          email: u.email || 'user@example.com',
          name: (metadata['full_name'] as string) || u.email?.split('@')[0] || 'SaaS Founder',
          avatarUrl: (metadata['avatar_url'] as string) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
          plan: 'pro',
        });
      }
    } catch {
      // Fall back to default demo user for seamless test experience
    }
  }

  public async loginWithGoogle(): Promise<void> {
    try {
      await this.supabase.signInWithGoogle();
    } catch (err) {
      console.warn('Supabase Google OAuth fallback triggered:', err);
    }
  }

  public async logout(): Promise<void> {
    await this.supabase.signOut();
    this.user.set(null);
  }
}
