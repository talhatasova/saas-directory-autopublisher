import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionStore } from '../../state/submission.store.js';

@Component({
  selector: 'app-proof-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (submissionStore.activeProofModal(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        
        <div class="w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div>
              <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>📸 Submission Receipt: {{ item.directoryName }}</span>
              </h3>
              <p class="text-[11px] text-slate-500">Captured: {{ item.completedAt || 'Live' }}</p>
            </div>
            <button 
              (click)="submissionStore.closeProofModal()"
              class="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-200">
              ✕
            </button>
          </div>

          <!-- Image Preview -->
          <div class="p-6 bg-slate-100 flex flex-col items-center justify-center">
            @if (item.proofScreenshotUrl) {
              <img 
                [src]="item.proofScreenshotUrl" 
                alt="Submission Proof Screenshot"
                class="rounded-lg border border-slate-300 shadow-sm max-h-72 w-full object-cover">
            }
          </div>

          <!-- Logs -->
          <div class="p-6 bg-white border-t border-slate-200">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Automation Runner Logs</h4>
            <div class="space-y-1 max-h-28 overflow-y-auto font-mono text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
              @for (log of item.logs; track log.timestamp) {
                <div class="flex items-start gap-2 text-slate-700">
                  <span class="text-slate-400 shrink-0">[{{ log.timestamp }}]</span>
                  <span [class.text-emerald-700]="log.level === 'info'" [class.text-amber-700]="log.level === 'warn'">
                    {{ log.message }}
                  </span>
                </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
            <a 
              [href]="item.listingUrl || item.submitUrl" 
              target="_blank" 
              class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              <span>Open Verified Submission Form</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </a>

            <button 
              (click)="submissionStore.closeProofModal()"
              class="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs transition-colors">
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
