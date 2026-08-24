import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../state/auth.store.js';
import { SubmissionStore } from '../../state/submission.store.js';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="sticky top-0 z-40 w-full border-b border-white/5 bg-dark-900/80 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-glow text-white font-black text-xl">
            ⚡
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-lg tracking-tight text-white font-display">LaunchAuto</span>
              <span class="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">AutoPublisher</span>
            </div>
            <p class="text-[11px] text-slate-400 hidden sm:block">Automate SaaS Directory Publishing</p>
          </div>
        </div>

        <!-- Right Menu: Metrics & Auth -->
        <div class="flex items-center gap-4">
          @if (submissionStore.totalCount() > 0) {
            <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/80 border border-white/5 text-xs">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-slate-300">{{ submissionStore.completedCount() }}/{{ submissionStore.totalCount() }} Published</span>
            </div>
          }

          <!-- Google Auth / User Dropdown -->
          @if (authStore.user(); as u) {
            <div class="flex items-center gap-3 pl-2">
              <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800 border border-white/10 hover:border-brand-500/30 transition-all">
                <img [src]="u.avatarUrl" alt="Avatar" class="w-6 h-6 rounded-full object-cover ring-1 ring-brand-500/40">
                <span class="text-xs font-medium text-slate-200 hidden sm:inline">{{ u.name }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-bold uppercase">{{ u.plan }}</span>
              </div>
              <button (click)="authStore.logout()" class="text-xs text-slate-400 hover:text-slate-200 transition-colors p-1.5">
                Sign Out
              </button>
            </div>
          } @else {
            <button 
              (click)="authStore.loginWithGoogle()"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-dark-900 font-semibold text-xs hover:bg-slate-100 transition-all shadow-sm">
              <svg class="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          }
        </div>

      </div>
    </header>
  `,
})
export class NavbarComponent {
  public authStore = inject(AuthStore);
  public submissionStore = inject(SubmissionStore);
}
