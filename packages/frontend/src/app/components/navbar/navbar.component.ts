import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../state/auth.store.js';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Left: Brand Logo & Title (matching screenshot) -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-sm">
            🚀
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-base sm:text-lg text-slate-900 tracking-tight">LaunchDirectories</span>
            </div>
            <p class="text-[11px] text-slate-500 font-medium">Find where to launch & automate submissions</p>
          </div>
        </div>

        <!-- Right: Action Tabs & Submit Button (matching screenshot) -->
        <div class="flex items-center gap-2 sm:gap-3">
          
          <button class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors">
            <span>⭐</span>
            <span>Top 10</span>
          </button>

          <button class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors">
            <span>🔖</span>
            <span>Bookmarks</span>
          </button>

          <button class="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors">
            <span>📊</span>
            <span>Analytics</span>
          </button>

          <!-- Active Directory Count Badge -->
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>61+ Directories</span>
          </div>

          <!-- Google Auth / Submit Button -->
          @if (authStore.user(); as u) {
            <div class="flex items-center gap-2 pl-1">
              <img [src]="u.avatarUrl" alt="Avatar" class="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300">
              <span class="text-xs font-medium text-slate-700 hidden sm:inline">{{ u.name }}</span>
            </div>
          } @else {
            <button 
              (click)="authStore.loginWithGoogle()"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-sm transition-all">
              <span>Sign in</span>
            </button>
          }

        </div>

      </div>
    </header>
  `,
})
export class NavbarComponent {
  public authStore = inject(AuthStore);
}
