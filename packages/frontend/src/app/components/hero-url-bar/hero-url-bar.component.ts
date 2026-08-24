import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../state/project.store.js';

@Component({
  selector: 'app-hero-url-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="relative py-12 md:py-20 overflow-hidden">
      <!-- Glow Gradients -->
      <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 md:w-[600px] h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div class="max-w-4xl mx-auto px-4 text-center relative z-10">
        
        <!-- Badge -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-6">
          <span class="inline-block w-2 h-2 rounded-full bg-brand-400 animate-ping"></span>
          <span>Zero-Effort Backlinks & Directory Submissions</span>
        </div>

        <!-- Heading -->
        <h1 class="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 font-display leading-tight">
          Publish your SaaS to <br class="hidden sm:block">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400">
            50+ Free Directories
          </span> Automatically.
        </h1>

        <!-- Subheading -->
        <p class="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Paste your website URL. Our autonomous workers extract your metadata, optimize platform-specific pitches, and publish your SaaS in seconds.
        </p>

        <!-- Input Bar with Glow and Animation -->
        <div class="relative max-w-2xl mx-auto">
          <div class="relative flex items-center rounded-2xl glass-input p-2 shadow-glow-lg border border-brand-500/30">
            <div class="pl-3 pr-2 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
            </div>
            
            <input 
              type="url"
              [(ngModel)]="inputUrl"
              (keyup.enter)="handleSubmit()"
              placeholder="https://yourapp.com"
              [disabled]="projectStore.isExtracting()"
              class="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none px-2 py-2"
            />

            <button
              (click)="handleSubmit()"
              [disabled]="!inputUrl() || projectStore.isExtracting()"
              class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-glow transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none shrink-0">
              @if (projectStore.isExtracting()) {
                <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Scraping...</span>
              } @else {
                <span>Auto-Publish</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              }
            </button>
          </div>

          <!-- Quick Try Samples -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-400">
            <span>Try sample SaaS:</span>
            <button (click)="setSample('https://linear.app')" class="px-2 py-1 rounded-md bg-dark-800 hover:bg-dark-700 hover:text-white border border-white/5 transition-colors">linear.app</button>
            <button (click)="setSample('https://cursor.com')" class="px-2 py-1 rounded-md bg-dark-800 hover:bg-dark-700 hover:text-white border border-white/5 transition-colors">cursor.com</button>
            <button (click)="setSample('https://postman.com')" class="px-2 py-1 rounded-md bg-dark-800 hover:bg-dark-700 hover:text-white border border-white/5 transition-colors">postman.com</button>
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
