import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionStore } from '../../state/submission.store.js';

@Component({
  selector: 'app-proof-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (submissionStore.activeProofModal(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-md">
        
        <div class="w-full max-w-2xl rounded-2xl glass-card border border-white/10 shadow-glow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-dark-800/60">
            <div>
              <h3 class="font-bold text-white text-sm flex items-center gap-2">
                <span>📸 Submission Proof: {{ item.directoryName }}</span>
              </h3>
              <p class="text-[11px] text-slate-400">Captured at {{ item.completedAt || 'Live' }}</p>
            </div>
            <button 
              (click)="submissionStore.closeProofModal()"
              class="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
              ✕
            </button>
          </div>

          <!-- Image Preview -->
          <div class="p-6 bg-dark-950 flex flex-col items-center justify-center">
            @if (item.proofScreenshotUrl) {
              <img 
                [src]="item.proofScreenshotUrl" 
                alt="Submission Proof Screenshot"
                class="rounded-xl border border-white/10 shadow-2xl max-h-80 w-full object-cover">
            }
          </div>

          <!-- Audit Logs -->
          <div class="p-6 bg-dark-900 border-t border-white/5">
            <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Worker Audit Logs</h4>
            <div class="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
              @for (log of item.logs; track log.timestamp) {
                <div class="flex items-start gap-2 text-slate-300">
                  <span class="text-slate-500 shrink-0">[{{ log.timestamp }}]</span>
                  <span [class.text-emerald-400]="log.level === 'info'" [class.text-amber-400]="log.level === 'warn'">
                    {{ log.message }}
                  </span>
                </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-dark-800/60">
            @if (item.listingUrl) {
              <a 
                [href]="item.listingUrl" 
                target="_blank" 
                class="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1">
                <span>Open Verified Live Listing</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            } @else {
              <div></div>
            }

            <button 
              (click)="submissionStore.closeProofModal()"
              class="px-4 py-1.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-white font-medium text-xs transition-colors">
              Close
            </button>
          </div>

        </div>

      </div>
    }
  `,
})
export class ProofModalComponent {
  public submissionStore = inject(SubmissionStore);
}
