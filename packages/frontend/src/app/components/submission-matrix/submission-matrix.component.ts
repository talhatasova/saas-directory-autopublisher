import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionStore } from '../../state/submission.store.js';

@Component({
  selector: 'app-submission-matrix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="submission-matrix-section" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <span>Live Automation Pipeline</span>
            @if (submissionStore.totalCount() > 0) {
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold font-mono">
                {{ submissionStore.overallProgress() }}% Done
              </span>
            }
          </h2>
          <p class="text-xs text-slate-500 mt-1">Real-time status of headless Playwright and API submissions</p>
        </div>

        @if (submissionStore.totalCount() > 0) {
          <div class="w-full sm:w-64 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 p-0.5">
            <div 
              class="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-300"
              [style.width.%]="submissionStore.overallProgress()">
            </div>
          </div>
        }
      </div>

      <!-- Live Submissions Table -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4">Directory</th>
                <th class="py-3 px-3">Category & DR</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 w-2/5">Automation Step</th>
                <th class="py-3 px-4 text-right">Verified Link & Proof</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (sub of submissionStore.submissions(); track sub.id) {
                <tr class="table-row-hover">
                  
                  <!-- Directory Name -->
                  <td class="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {{ sub.directoryName }}
                  </td>

                  <!-- Category & DR -->
                  <td class="py-3.5 px-3 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <span class="text-slate-500">{{ sub.category }}</span>
                      <span class="font-bold text-emerald-600">DR {{ sub.domainRating }}</span>
                    </div>
                  </td>

                  <!-- Status Badge -->
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    @switch (sub.status) {
                      @case ('queued') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                          <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Queued
                        </span>
                      }
                      @case ('in_progress') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200 animate-pulse">
                          <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                          Publishing...
                        </span>
                      }
                      @case ('published') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Published ✓
                        </span>
                      }
                      @case ('action_required') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                          Action Needed
                        </span>
                      }
                      @case ('failed') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
                          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Failed
                        </span>
                      }
                    }
                  </td>

                  <!-- Automation Step & Progress Bar -->
                  <td class="py-3.5 px-4">
                    <div>
                      <div class="flex justify-between items-center mb-1 text-[11px]">
                        <span class="text-slate-600 truncate font-mono">{{ sub.currentStep }}</span>
                        <span class="text-slate-500 font-mono font-bold">{{ sub.progressPercent }}%</span>
                      </div>
                      <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          class="h-full rounded-full transition-all duration-300"
                          [class.bg-blue-500]="sub.status === 'in_progress'"
                          [class.bg-emerald-500]="sub.status === 'published'"
                          [class.bg-slate-300]="sub.status === 'queued'"
                          [style.width.%]="sub.progressPercent">
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Result Link & Proof -->
                  <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2">
                      <a 
                        [href]="sub.listingUrl || sub.submitUrl" 
                        target="_blank" 
                        title="Open verified submission portal"
                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors">
                        <span>Open Form</span>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </a>

                      @if (sub.proofScreenshotUrl) {
                        <button 
                          (click)="submissionStore.openProofModal(sub)"
                          class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium transition-colors">
                          Proof 📸
                        </button>
                      }
                    </div>
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-10 text-center text-slate-400">
                    <p class="font-medium text-slate-600">No active publishing jobs yet.</p>
                    <p class="text-xs text-slate-400 mt-1">Enter your SaaS URL above and click "Auto-Publish" to trigger live submissions.</p>
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
export class SubmissionMatrixComponent {
  public submissionStore = inject(SubmissionStore);
}
