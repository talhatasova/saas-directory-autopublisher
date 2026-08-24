import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../state/project.store.js';

@Component({
  selector: 'app-hero-url-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-10">
      <div class="max-w-4xl mx-auto px-4 text-center">
        
        <!-- Tagline -->
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
          <span>⚡ Automated SaaS Publishing Engine</span>
        </div>

        <h1 class="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          Automate Directory Submissions for Your SaaS
        </h1>
        <p class="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mb-6 font-normal">
          Enter your website URL. Our automation engine extracts your product metadata, generates directory pitches, and publishes your SaaS across high-DR directories.
        </p>

        <!-- Main Input Container -->
        <div class="max-w-2xl mx-auto">
          <div class="flex flex-col sm:flex-row items-stretch gap-2 p-2 bg-white rounded-xl border border-slate-300 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            
            <div class="flex items-center gap-2 flex-1 px-3">
              <span class="text-slate-400 text-sm">🔗</span>
              <input 
                type="url"
                [(ngModel)]="inputUrl"
                (keyup.enter)="handleSubmit()"
                placeholder="https://yourproduct.com"
                [disabled]="projectStore.isExtracting()"
                class="w-full text-slate-900 placeholder-slate-400 text-sm focus:outline-none bg-transparent py-1.5"
              />
            </div>

            <button
              (click)="handleSubmit()"
              [disabled]="!inputUrl() || projectStore.isExtracting()"
              class="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wide shadow-sm transition-all disabled:opacity-50 shrink-0">
              @if (projectStore.isExtracting()) {
                <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Scraping Website...</span>
              } @else {
                <span>✨ Auto-Publish (1-Click)</span>
              }
            </button>
          </div>

          <!-- Quick Try Samples -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-500">
            <span>Quick try:</span>
            <button (click)="setSample('https://supabase.com')" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors">supabase.com</button>
            <button (click)="setSample('https://linear.app')" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors">linear.app</button>
            <button (click)="setSample('https://resend.com')" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors">resend.com</button>
          </div>
        </div>

      </div>
    </section>
  `,
})
export class HeroUrlBarComponent {
  public projectStore = inject(ProjectStore);
  public inputUrl = signal<string>('');

  public setSample(url: string): void {
    this.inputUrl.set(url);
    this.handleSubmit();
  }

  public handleSubmit(): void {
    const val = this.inputUrl().trim();
    if (val) {
      this.projectStore.extract(val);
    }
  }
}
