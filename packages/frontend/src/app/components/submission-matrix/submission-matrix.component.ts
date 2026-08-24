import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionStore, LiveSubmissionItem } from '../../state/submission.store.js';

@Component({
  selector: 'app-submission-matrix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="submission-matrix-section" class="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-3">
            <span>Live Publishing Matrix</span>
            @if (submissionStore.totalCount() > 0) {
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 font-mono">
                {{ submissionStore.overallProgress() }}% Total Progress
              </span>
            }
          </h2>
          <p class="text-xs text-slate-400 mt-1">Autonomous worker agents are currently running background form submissions</p>
        </div>

        <!-- Global Progress Bar -->
        @if (submissionStore.totalCount() > 0) {
          <div class="w-full sm:w-64 bg-dark-800 rounded-full h-3 overflow-hidden border border-white/10 p-0.5">
            <div 
              class="bg-gradient-to-r from-brand-500 via-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-glow"
              [style.width.%]="submissionStore.overallProgress()">
            </div>
          </div>
        }
      </div>

      <!-- Live Table -->
      <div class="rounded-2xl glass-card overflow-hidden border border-white/10 shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-dark-800/80 border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th class="py-4 px-4">Directory</th>
                <th class="py-4 px-3">Category & DR</th>
                <th class="py-4 px-4">Status</th>
                <th class="py-4 px-4 w-1/3">Worker Step & Progress</th>
                <th class="py-4 px-4 text-right">Result & Proof</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              @for (sub of submissionStore.submissions(); track sub.id) {
                <tr class="hover:bg-white/[0.02] transition-colors">
                  
                  <!-- Directory Name -->
                  <td class="py-4 px-4 font-semibold text-white">
                    <div class="flex items-center gap-3">
                      <div class="w-7 h-7 rounded-lg bg-dark-800 border border-white/10 flex items-center justify-center font-bold text-xs text-brand-400">
                        {{ sub.directoryName.charAt(0) }}
                      </div>
                      <span class="text-slate-100 font-bold">{{ sub.directoryName }}</span>
                    </div>
                  </td>

                  <!-- Category & DR -->
                  <td class="py-4 px-3">
                    <div class="flex items-center gap-2">
                      <span class="text-slate-400">{{ sub.category }}</span>
                      <span class="px-1.5 py-0.5 rounded bg-dark-800 text-[10px] font-bold text-emerald-400 border border-white/5">
                        DR {{ sub.domainRating }}
                      </span>
                    </div>
                  </td>

                  <!-- Status Badge -->
                  <td class="py-4 px-4">
                    @switch (sub.status) {
                      @case ('queued') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium">
                          <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Queued
                        </span>
                      }
                      @case ('in_progress') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/30 text-[11px] font-medium animate-pulse">
                          <span class="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping"></span>
                          Submitting...
                        </span>
                      }
                      @case ('published') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold shadow-glow-emerald">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Published ✓
                        </span>
                      }
                      @case ('action_required') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                          Action Needed
                        </span>
                      }
                      @case ('failed') {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[11px] font-medium">
                          <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Failed
                        </span>
                      }
                    }
                  </td>

                  <!-- Worker Step & Progress Bar -->
                  <td class="py-4 px-4">
                    <div>
                      <div class="flex justify-between items-center mb-1 text-[11px]">
                        <span class="text-slate-300 truncate max-w-xs font-mono">{{ sub.currentStep }}</span>
                        <span class="text-slate-400 font-mono font-bold">{{ sub.progressPercent }}%</span>
                      </div>
                      <div class="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          class="h-full rounded-full transition-all duration-300"
                          [class.bg-brand-500]="sub.status === 'in_progress'"
                          [class.bg-emerald-400]="sub.status === 'published'"
                          [class.bg-slate-600]="sub.status === 'queued'"
                          [style.width.%]="sub.progressPercent">
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Result URL & Proof Button -->
                  <td class="py-4 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      @if (sub.listingUrl) {
                        <a 
                          [href]="sub.listingUrl" 
                          target="_blank" 
                          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-colors">
                          <span>Listing</span>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                          </svg>
                        </a>
                      }
                      
                      @if (sub.proofScreenshotUrl) {
                        <button 
                          (click)="submissionStore.openProofModal(sub)"
                          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white border border-white/10 text-[11px] transition-colors">
                          <span>Proof 📸</span>
                        </button>
                      }
                    </div>
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-12 text-center text-slate-500">
                    <div class="max-w-sm mx-auto">
                      <div class="text-3xl mb-2">🚀</div>
                      <p class="font-medium text-slate-400">No active submissions yet</p>
                      <p class="text-xs text-slate-500 mt-1">Enter your SaaS URL above and click "Launch All" to trigger autonomous publishing.</p>
                    </div>
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
