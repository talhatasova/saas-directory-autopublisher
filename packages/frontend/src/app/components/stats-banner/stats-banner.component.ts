import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectoryStore } from '../../state/directory.store.js';
import { SubmissionStore } from '../../state/submission.store.js';

@Component({
  selector: 'app-stats-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <!-- Stat 1 -->
        <div class="p-4 rounded-2xl glass-card border border-white/5 flex flex-col items-center sm:items-start">
          <span class="text-2xl sm:text-3xl font-extrabold text-white font-display">60+</span>
          <span class="text-xs text-slate-400 mt-0.5">Active Free Directories</span>
        </div>

        <!-- Stat 2 -->
        <div class="p-4 rounded-2xl glass-card border border-white/5 flex flex-col items-center sm:items-start">
          <span class="text-2xl sm:text-3xl font-extrabold text-brand-400 font-display">DR 75+</span>
          <span class="text-xs text-slate-400 mt-0.5">Average Domain Authority</span>
        </div>

        <!-- Stat 3 -->
        <div class="p-4 rounded-2xl glass-card border border-white/5 flex flex-col items-center sm:items-start">
          <span class="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-display">100%</span>
          <span class="text-xs text-slate-400 mt-0.5">Autonomous Playwright Fill</span>
        </div>

        <!-- Stat 4 -->
        <div class="p-4 rounded-2xl glass-card border border-white/5 flex flex-col items-center sm:items-start">
          <span class="text-2xl sm:text-3xl font-extrabold text-indigo-300 font-display">&lt; 3s</span>
          <span class="text-xs text-slate-400 mt-0.5">Metadata Extraction Speed</span>
        </div>

      </div>
    </section>
  `,
})
export class StatsBannerComponent {
  public directoryStore = inject(DirectoryStore);
  public submissionStore = inject(SubmissionStore);
}
