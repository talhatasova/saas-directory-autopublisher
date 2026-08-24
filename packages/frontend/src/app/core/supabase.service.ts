import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qxakcsdaixzfttlcmnch.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWtjc2RhaXh6ZnR0bGNtbmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDc3NTUsImV4cCI6MjEwMzA4Mzc1NX0.-ZrZQubMRtse3xJTIlP_a9wDI6Kf4rKfDlV_W5GS420';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  public client: SupabaseClient;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  public async signInWithGoogle(): Promise<void> {
    await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  public async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  public async getCurrentUser(): Promise<SupabaseAuthUser | null> {
    const { data } = await this.client.auth.getUser();
    return data.user;
  }
}
