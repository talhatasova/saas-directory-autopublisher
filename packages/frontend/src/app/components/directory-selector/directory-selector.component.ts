import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DirectoryStore, DisplayDirectory } from '../../state/directory.store.js';
import { SubmissionStore } from '../../state/submission.store.js';
import { ProjectStore } from '../../state/project.store.js';

@Component({
  selector: 'app-directory-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section id="directory-selector-section" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Top Filters & Search Toolbar (Matching user photo layout) -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        
        <!-- Left: Search Box -->
        <div class="relative flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input 
            type="text" 
            [ngModel]="directoryStore.searchQuery()"
            (ngModelChange)="directoryStore.searchQuery.set($event)"
            placeholder="Search 61+ directories..." 
            class="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm" />
        </div>

        <!-- Right: Category & Link Type Dropdowns + Submit Action Button -->
        <div class="flex flex-wrap items-center gap-2.5">
          
          <!-- Category Filter -->
          <select 
            [ngModel]="directoryStore.selectedCategory()"
            (ngModelChange)="directoryStore.selectedCategory.set($event)"
            class="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm font-medium">
            <option value="All">All Categories</option>
            <option value="Free">Free</option>
            <option value="Paid">Paid</option>
            <option value="Free + Paid">Free + Paid</option>
            <option value="Community">Community</option>
            <option value="Launch Platform">Launch Platform</option>
            <option value="AI Tools">AI Tools</option>
          </select>

          <!-- Link Type Filter -->
          <select 
            [ngModel]="directoryStore.selectedLinkType()"
            (ngModelChange)="directoryStore.selectedLinkType.set($event)"
            class="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm font-medium">
            <option value="All">All Link Types</option>
            <option value="Dofollow">Dofollow</option>
            <option value="Nofollow">Nofollow</option>
          </select>

          <!-- Select All / Deselect All Toggle -->
          <button 
            (click)="toggleSelectAll()"
            class="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-colors">
            {{ allSelected ? 'Deselect All' : 'Select All' }}
          </button>

          <!-- Primary Launch Button -->
          <button 
            (click)="handleLaunch()"
            [disabled]="directoryStore.selectedCount() === 0 || submissionStore.isLaunching()"
            class="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50">
            <span>⚡ Launch Selected ({{ directoryStore.selectedCount() }})</span>
          </button>

        </div>

      </div>

      <!-- Main Directory Table (Pixel-accurate match to screenshot) -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            
            <!-- Table Header -->
            <thead class="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th class="p-3.5 w-10 text-center">
                  <input 
                    type="checkbox" 
                    [checked]="allSelected" 
                    (change)="toggleSelectAll()"
                    class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th class="py-3.5 px-3">Name</th>
                <th class="py-3.5 px-3">Category</th>
                <th class="py-3.5 px-3 font-bold text-center">DR</th>
                <th class="py-3.5 px-3">Link Type</th>
                <th class="py-3.5 px-3 font-bold">Traffic</th>
                <th class="py-3.5 px-3 w-2/5">Description</th>
                <th class="py-3.5 px-3 text-slate-400">DR Updated</th>
                <th class="py-3.5 px-2 text-center">Bookmark</th>
                <th class="py-3.5 px-3 text-right">Visit</th>
              </tr>
            </thead>

            <!-- Table Body -->
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (dir of directoryStore.filteredDirectories(); track dir.id) {
                <tr class="table-row-hover">
                  
                  <!-- Checkbox -->
                  <td class="p-3.5 text-center">
                    <input 
                      type="checkbox" 
                      [checked]="dir.selected" 
                      (change)="directoryStore.toggleSelection(dir.id)"
                      class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </td>

                  <!-- Name with Brand Icon -->
                  <td class="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    <div class="flex items-center gap-2.5">
                      <div 
                        class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-xs"
                        [style.background-color]="dir.brandColor">
                        {{ dir.iconText }}
                      </div>
                      <span class="font-bold text-slate-900">{{ dir.name }}</span>
                    </div>
                  </td>

                  <!-- Category Badge -->
                  <td class="py-3.5 px-3 whitespace-nowrap">
                    <span 
                      class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      [ngClass]="{
                        'badge-free': dir.pricingType === 'Free',
                        'badge-paid': dir.pricingType === 'Paid',
                        'badge-freepaid': dir.pricingType === 'Free + Paid'
                      }">
                      {{ dir.pricingType }}
                    </span>
                  </td>

                  <!-- Domain Rating (DR in bold green) -->
                  <td class="py-3.5 px-3 text-center whitespace-nowrap">
                    <span class="font-bold text-emerald-600 text-xs sm:text-sm">
                      {{ dir.domainRating }}
                    </span>
                  </td>

                  <!-- Link Type Badge -->
                  <td class="py-3.5 px-3 whitespace-nowrap">
                    <span 
                      class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                      [ngClass]="{
                        'badge-dofollow': dir.linkType === 'Dofollow',
                        'badge-nofollow': dir.linkType === 'Nofollow'
                      }">
                      {{ dir.linkType }}
                    </span>
                  </td>

                  <!-- Traffic -->
                  <td class="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {{ dir.traffic }}
                  </td>

                  <!-- Description -->
                  <td class="py-3.5 px-3 text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {{ dir.description }}
                  </td>

                  <!-- DR Updated -->
                  <td class="py-3.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                    {{ dir.drUpdated }}
                  </td>

                  <!-- Bookmark Button -->
                  <td class="py-3.5 px-2 text-center">
                    <button 
                      (click)="directoryStore.toggleBookmark(dir.id)"
                      class="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-amber-500 transition-colors"
                      [class.text-amber-500]="dir.isBookmarked">
                      <svg class="w-4 h-4" [attr.fill]="dir.isBookmarked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                      </svg>
                    </button>
                  </td>

                  <!-- Visit / Direct Submit Link (Real, Live Non-404 URL) -->
                  <td class="py-3.5 px-3 text-right whitespace-nowrap">
                    <a 
                      [href]="dir.submitUrl" 
                      target="_blank" 
                      title="Open Live Submission Page"
                      class="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                    </a>
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="py-12 text-center text-slate-400">
                    No directories match your filters.
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
    
    const projectData = {
      name: meta?.name || 'My SaaS Platform',
      url: meta?.url || 'https://yourapp.com',
      tagline: meta?.tagline || 'Autonomous AI automation tool',
      description: meta?.description || 'All-in-one software platform.',
    };

    this.submissionStore.launchPublishing(selected, projectData);

    // Scroll down smoothly to live status matrix
    setTimeout(() => {
      const el = document.getElementById('submission-matrix-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  }
}
