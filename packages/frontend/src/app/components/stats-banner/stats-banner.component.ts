import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectoryStore } from '../../state/directory.store.js';

@Component({
  selector: 'app-stats-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            📂
          </div>
          <div>
            <div class="text-base sm:text-lg font-bold text-slate-900 leading-none">61+</div>
            <div class="text-[11px] text-slate-500 font-medium mt-0.5">Free Directories</div>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            📈
          </div>
          <div>
            <div class="text-base sm:text-lg font-bold text-emerald-600 leading-none">DR 78+</div>
            <div class="text-[11px] text-slate-500 font-medium mt-0.5">Average Authority</div>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <div>
            <div class="text-base sm:text-lg font-bold text-purple-600 leading-none">100% Free</div>
            <div class="text-[11px] text-slate-500 font-medium mt-0.5">Automated Listings</div>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            🚀
          </div>
          <div>
            <div class="text-base sm:text-lg font-bold text-amber-600 leading-none">65M+</div>
            <div class="text-[11px] text-slate-500 font-medium mt-0.5">Monthly Reach</div>
          </div>
        </div>

      </div>
    </section>
  `,
})
export class StatsBannerComponent {
  public directoryStore = inject(DirectoryStore);
}
