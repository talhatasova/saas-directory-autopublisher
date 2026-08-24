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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        
        <!-- Modal Dialog -->
        <div class="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                ✨
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-base">Extracted SaaS Details & Pitch Copy</h3>
                <p class="text-xs text-slate-500 font-mono">{{ meta.url }}</p>
              </div>
            </div>
            <button 
              (click)="projectStore.closeModal()"
              class="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-200">
              ✕
            </button>
          </div>

          <!-- Content Tabs -->
          <div class="flex border-b border-slate-200 px-6 gap-6 text-xs font-semibold text-slate-500 bg-slate-50/50">
            <button 
              (click)="activeTab.set('general')"
              [class.text-blue-600]="activeTab() === 'general'"
              [class.border-blue-600]="activeTab() === 'general'"
              class="py-3 border-b-2 border-transparent transition-colors">
              Product Overview
            </button>
            <button 
              (click)="activeTab.set('pitches')"
              [class.text-blue-600]="activeTab() === 'pitches'"
              [class.border-blue-600]="activeTab() === 'pitches'"
              class="py-3 border-b-2 border-transparent transition-colors">
              Directory Pitch & Copy
            </button>
            <button 
              (click)="activeTab.set('media')"
              [class.text-blue-600]="activeTab() === 'media'"
              [class.border-blue-600]="activeTab() === 'media'"
              class="py-3 border-b-2 border-transparent transition-colors">
              Media & Logo
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            
            @if (activeTab() === 'general') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">Product Name</label>
                  <input 
                    type="text" 
                    [(ngModel)]="meta.name" 
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">Category</label>
                  <input 
                    type="text" 
                    [(ngModel)]="meta.category" 
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label class="block text-slate-700 font-semibold mb-1">Tagline</label>
                <input 
                  type="text" 
                  [(ngModel)]="meta.tagline" 
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">Pricing Model</label>
                  <select 
                    [(ngModel)]="meta.pricingModel" 
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                    <option value="free">Free</option>
                    <option value="freemium">Freemium</option>
                    <option value="paid">Paid</option>
                    <option value="subscription">Subscription</option>
                    <option value="open_source">Open Source</option>
                  </select>
                </div>

                <div>
                  <label class="block text-slate-700 font-semibold mb-1">Tags (Comma Separated)</label>
                  <input 
                    type="text" 
                    [ngModel]="meta.tags.join(', ')" 
                    (ngModelChange)="updateTags($event)"
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
            }

            @if (activeTab() === 'pitches') {
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-slate-700 font-semibold">Short Pitch (80 chars)</label>
                    <span class="text-[11px] text-slate-400">{{ meta.descriptionPitch80.length }}/80</span>
                  </div>
                  <input 
                    type="text" 
                    [(ngModel)]="meta.descriptionPitch80" 
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-slate-700 font-semibold">Standard Summary (250 chars)</label>
                    <span class="text-[11px] text-slate-400">{{ meta.descriptionSummary250.length }}/250</span>
                  </div>
                  <textarea 
                    rows="3" 
                    [(ngModel)]="meta.descriptionSummary250" 
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"></textarea>
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-slate-700 font-semibold">Detailed Product Review (500+ chars)</label>
                    <span class="text-[11px] text-slate-400">{{ meta.descriptionReview500.length }} chars</span>
                  </div>
                  <textarea 
                    rows="5" 
                    [(ngModel)]="meta.descriptionReview500" 
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"></textarea>
                </div>
              </div>
            }

            @if (activeTab() === 'media') {
              <div class="space-y-4">
                <div>
                  <label class="block text-slate-700 font-semibold mb-1">Logo / Favicon URL</label>
                  <div class="flex items-center gap-3">
                    <img [src]="meta.logoUrl || meta.faviconUrl" alt="Logo" class="w-9 h-9 rounded-lg bg-slate-100 object-cover border border-slate-200 p-1">
                    <input 
                      type="text" 
                      [(ngModel)]="meta.logoUrl" 
                      class="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <label class="block text-slate-700 font-semibold mb-2">Screenshot Previews</label>
                  <div class="grid grid-cols-2 gap-3">
                    @for (img of meta.screenshotUrls; track img) {
                      <div class="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img [src]="img" alt="Screenshot" class="w-full h-28 object-cover">
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button 
              (click)="projectStore.closeModal()"
              class="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-medium text-xs transition-colors">
              Cancel
            </button>

            <button 
              (click)="confirmAndProceed()"
              class="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all">
              <span>Continue to Directory Selection →</span>
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
    const el = document.getElementById('directory-selector-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
