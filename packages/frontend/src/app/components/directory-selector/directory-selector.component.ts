import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DirectoryStore } from '../../state/directory.store.js';
import { SubmissionStore } from '../../state/submission.store.js';
import { ProjectStore } from '../../state/project.store.js';

@Component({
  selector: 'app-directory-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section id="directory-selector-section" class="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Top Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-3">
            <span>Free Launch Directories</span>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-semibold">
              {{ directoryStore.selectedCount() }} Selected
            </span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">Average Domain Rating: <strong class="text-brand-400">DR {{ directoryStore.avgDomainRating() }}</strong> · Estimated Monthly Exposure: <strong class="text-slate-200">65M+</strong></p>
        </div>

        <!-- Filter & Actions -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Category Chips -->
          <div class="flex items-center gap-1.5 p-1 rounded-xl bg-dark-800/80 border border-white/5 text-xs">
            @for (cat of categories; track cat) {
              <button 
                (click)="directoryStore.selectedCategory.set(cat)"
                [class.bg-brand-600]="directoryStore.selectedCategory() === cat"
                [class.text-white]="directoryStore.selectedCategory() === cat"
                [class.text-slate-400]="directoryStore.selectedCategory() !== cat"
                class="px-2.5 py-1 rounded-lg font-medium transition-all">
                {{ cat }}
              </button>
            }
          </div>

          <!-- Select All Toggle -->
          <button 
            (click)="toggleSelectAll()"
            class="px-3 py-1.5 rounded-xl bg-dark-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-colors">
            {{ allSelected ? 'Deselect All' : 'Select All' }}
          </button>

          <!-- Launch Automation Button -->
          <button
            (click)="handleLaunch()"
            [disabled]="directoryStore.selectedCount() === 0 || submissionStore.isLaunching()"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow transition-all disabled:opacity-50 disabled:pointer-events-none">
            <span>⚡ Launch All ({{ directoryStore.selectedCount() }})</span>
          </button>
        </div>
      </div>

      <!-- Directories Table Card (Style matching user screenshot) -->
      <div class="rounded-2xl glass-card overflow-hidden border border-white/10 shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-dark-800/80 border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th class="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    [checked]="allSelected" 
                    (change)="toggleSelectAll()"
                    class="rounded border-white/20 bg-dark-800 text-brand-500 focus:ring-brand-500" />
                </th>
                <th class="py-4 px-3">Directory</th>
                <th class="py-4 px-3">Category</th>
                <th class="py-4 px-3 text-center">DR</th>
                <th class="py-4 px-3">Link Type</th>
                <th class="py-4 px-3">Est. Traffic</th>
                <th class="py-4 px-3">Submission Flow</th>
                <th class="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              @for (dir of directoryStore.filteredDirectories(); track dir.id) {
                <tr class="hover:bg-white/[0.02] transition-colors group">
                  
                  <!-- Checkbox -->
                  <td class="p-4 text-center">
                    <input 
                      type="checkbox" 
                      [checked]="dir.selected" 
                      (change)="directoryStore.toggleSelection(dir.id)"
                      class="rounded border-white/20 bg-dark-800 text-brand-500 focus:ring-brand-500" />
                  </td>

                  <!-- Name & Icon -->
                  <td class="py-4 px-3 font-semibold text-white">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-dark-800 border border-white/10 flex items-center justify-center text-sm font-bold text-brand-400 group-hover:border-brand-500/40 transition-colors">
                        {{ dir.name.charAt(0) }}
                      </div>
                      <div>
                        <div class="text-slate-100 font-bold text-xs sm:text-sm">{{ dir.name }}</div>
                        <div class="text-[10px] text-slate-500 font-mono">{{ dir.url.replace('https://', '') }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Category Pill -->
                  <td class="py-4 px-3">
                    <span class="inline-block px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[11px] font-medium">
                      {{ dir.category }}
                    </span>
                  </td>

                  <!-- Domain Rating Badge -->
                  <td class="py-4 px-3 text-center">
                    <span class="inline-flex items-center justify-center font-bold text-xs"
                      [class.text-emerald-400]="dir.domainRating >= 80"
                      [class.text-cyan-400]="dir.domainRating >= 70 && dir.domainRating < 80"
                      [class.text-amber-400]="dir.domainRating < 70">
                      {{ dir.domainRating }}
                    </span>
                  </td>

                  <!-- Link Type -->
                  <td class="py-4 px-3">
                    <span class="text-[11px] px-2 py-0.5 rounded bg-dark-800 border border-white/5"
                      [class.text-emerald-300]="dir.linkType === 'Dofollow'"
                      [class.text-slate-400]="dir.linkType !== 'Dofollow'">
                      {{ dir.linkType || 'Dofollow' }}
                    </span>
                  </td>

                  <!-- Est. Traffic -->
                  <td class="py-4 px-3 font-mono font-medium text-slate-300">
                    {{ dir.trafficEst || '500K' }}
                  </td>

                  <!-- Submission Mode -->
                  <td class="py-4 px-3">
                    <div class="flex items-center gap-1.5 text-[11px]">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span class="text-slate-300">Playwright Autonomous</span>
                    </div>
                  </td>

                  <!-- Visit Action Link -->
                  <td class="py-4 px-4 text-right">
                    <a 
                      [href]="dir.url" 
                      target="_blank" 
                      class="inline-flex items-center gap-1 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-dark-800 transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                    </a>
                  </td>

                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </section>
  `,
})
export class DirectorySelectorComponent {
  public directoryStore = inject(DirectoryStore);
  public submissionStore = inject(SubmissionStore);
  public projectStore = inject(ProjectStore);

  public categories = ['All', 'AI Directory', 'Software Catalog', 'Launch Platform', 'Community'];

  public get allSelected(): boolean {
    const list = this.directoryStore.filteredDirectories();
    return list.length > 0 && list.every((d) => d.selected);
  }

  public toggleSelectAll(): void {
    const next = !this.allSelected;
    this.directoryStore.selectAll(next);
  }

  public handleLaunch(): void {
    const selected = this.directoryStore.directories().filter((d) => d.selected);
    const meta = this.projectStore.extractedMetadata();
    const projectName = meta?.name || 'My SaaS Platform';

    this.submissionStore.launchPublishing(selected, projectName);

    // Scroll down to live matrix
    setTimeout(() => {
      const el = document.getElementById('submission-matrix-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 200);
  }
}
