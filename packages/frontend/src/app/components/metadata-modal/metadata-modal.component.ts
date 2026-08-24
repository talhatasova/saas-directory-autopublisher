import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../state/project.store.js';

@Component({
  selector: 'app-metadata-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (projectStore.isReviewModalOpen() && projectStore.extractedMetadata(); as meta) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-md">
        
        <!-- Modal Card -->
        <div class="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl glass-card border border-brand-500/30 shadow-glow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-dark-800/60">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold text-sm">
                ✨
              </div>
              <div>
                <h3 class="font-bold text-white text-base">Verify & Customize SaaS Details</h3>
                <p class="text-xs text-slate-400">Autonomous scraper extracted these details from {{ meta.url }}</p>
              </div>
            </div>
            <button 
              (click)="projectStore.closeModal()"
              class="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
              ✕
            </button>
          </div>

          <!-- Content Tabs -->
          <div class="flex border-b border-white/5 px-6 gap-6 text-xs font-semibold text-slate-400 bg-dark-800/30">
            <button 
              (click)="activeTab.set('general')"
              [class.text-brand-400]="activeTab() === 'general'"
              [class.border-brand-400]="activeTab() === 'general'"
              class="py-3 border-b-2 border-transparent transition-colors">
              General Info
            </button>
            <button 
              (click)="activeTab.set('pitches')"
              [class.text-brand-400]="activeTab() === 'pitches'"
              [class.border-brand-400]="activeTab() === 'pitches'"
              class="py-3 border-b-2 border-transparent transition-colors">
              Directory Copy & Pitches
            </button>
            <button 
              (click)="activeTab.set('media')"
              [class.text-brand-400]="activeTab() === 'media'"
              [class.border-brand-400]="activeTab() === 'media'"
              class="py-3 border-b-2 border-transparent transition-colors">
              Media & Screenshots
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            
            @if (activeTab() === 'general') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-slate-400 font-medium mb-1">Product Name</label>
                  <input 
                    type="text" 
                    [(ngModel)]="meta.name" 
                    class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs" />
                </div>
                <div>
                  <label class="block text-slate-400 font-medium mb-1">Category</label>
                  <input 
                    type="text" 
                    [(ngModel)]="meta.category" 
                    class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs" />
                </div>
              </div>

              <div>
                <label class="block text-slate-400 font-medium mb-1">Tagline</label>
                <input 
                  type="text" 
                  [(ngModel)]="meta.tagline" 
                  class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs" />
              </div>

              <div>
                <label class="block text-slate-400 font-medium mb-1">Pricing Model</label>
                <select 
                  [(ngModel)]="meta.pricingModel" 
                  class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs bg-dark-800">
                  <option value="free">Free</option>
                  <option value="freemium">Freemium</option>
                  <option value="paid">Paid</option>
                  <option value="subscription">Subscription</option>
                  <option value="open_source">Open Source</option>
                </select>
              </div>

              <div>
                <label class="block text-slate-400 font-medium mb-1">Tags (Comma Separated)</label>
                <input 
                  type="text" 
                  [ngModel]="meta.tags.join(', ')" 
                  (ngModelChange)="updateTags($event)"
                  class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs" />
              </div>
            }

            @if (activeTab() === 'pitches') {
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-slate-400 font-medium">Elevator Pitch (80 chars)</label>
                    <span class="text-[10px] text-slate-500">{{ meta.descriptionPitch80?.length || 0 }}/80</span>
                  </div>
                  <input 
                    type="text" 
                    [(ngModel)]="meta.descriptionPitch80" 
                    class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs" />
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-slate-400 font-medium">Standard Summary (250 chars)</label>
                    <span class="text-[10px] text-slate-500">{{ meta.descriptionSummary250?.length || 0 }}/250</span>
                  </div>
                  <textarea 
                    rows="3" 
                    [(ngModel)]="meta.descriptionSummary250" 
                    class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"></textarea>
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-slate-400 font-medium">Detailed Review & Features (500+ chars)</label>
                    <span class="text-[10px] text-slate-500">{{ meta.descriptionReview500?.length || 0 }} chars</span>
                  </div>
                  <textarea 
                    rows="5" 
                    [(ngModel)]="meta.descriptionReview500" 
                    class="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"></textarea>
                </div>
              </div>
            }

            @if (activeTab() === 'media') {
              <div class="space-y-4">
                <div>
                  <label class="block text-slate-400 font-medium mb-1">Logo / Favicon URL</label>
                  <div class="flex items-center gap-3">
                    <img [src]="meta.logoUrl || meta.faviconUrl" alt="Logo" class="w-10 h-10 rounded-xl bg-dark-800 object-cover border border-white/10 p-1">
                    <input 
                      type="text" 
                      [(ngModel)]="meta.logoUrl" 
                      class="flex-1 px-3 py-2 rounded-xl glass-input text-white text-xs" />
                  </div>
                </div>

                <div>
                  <label class="block text-slate-400 font-medium mb-2">Screenshot Previews</label>
                  <div class="grid grid-cols-2 gap-3">
                    @for (img of meta.screenshotUrls; track img) {
                      <div class="rounded-xl overflow-hidden border border-white/10 bg-dark-800 relative group">
                        <img [src]="img" alt="Screenshot" class="w-full h-28 object-cover">
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-dark-800/60">
            <button 
              (click)="projectStore.closeModal()"
              class="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium text-xs transition-colors">
              Cancel
            </button>

            <button 
              (click)="confirmAndProceed()"
              class="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow transition-all">
              <span>Continue to Directory Selection</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          </div>

        </div>

      </div>
    }
  `,
})
export class MetadataModalComponent {
  public projectStore = inject(ProjectStore);
  public activeTab = signal<'general' | 'pitches' | 'media'>('general');

  public updateTags(val: string): void {
    const tags = val.split(',').map((t) => t.trim()).filter(Boolean);
    this.projectStore.updateDraft({ tags });
  }

  public confirmAndProceed(): void {
    this.projectStore.closeModal();
    // Scroll to directory selector smoothly
    const el = document.getElementById('directory-selector-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
