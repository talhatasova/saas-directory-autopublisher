import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component.js';
import { HeroUrlBarComponent } from './components/hero-url-bar/hero-url-bar.component.js';
import { StatsBannerComponent } from './components/stats-banner/stats-banner.component.js';
import { DirectorySelectorComponent } from './components/directory-selector/directory-selector.component.js';
import { SubmissionMatrixComponent } from './components/submission-matrix/submission-matrix.component.js';
import { MetadataModalComponent } from './components/metadata-modal/metadata-modal.component.js';
import { ProofModalComponent } from './components/proof-modal/proof-modal.component.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    HeroUrlBarComponent,
    StatsBannerComponent,
    DirectorySelectorComponent,
    SubmissionMatrixComponent,
    MetadataModalComponent,
    ProofModalComponent,
  ],
  template: `
    <div class="min-h-screen flex flex-col justify-between bg-[#f8fafc]">
      
      <!-- Navbar -->
      <app-navbar></app-navbar>

      <!-- Main Container -->
      <main class="flex-1">
        <app-hero-url-bar></app-hero-url-bar>
        <app-stats-banner></app-stats-banner>
        <app-directory-selector></app-directory-selector>
        <app-submission-matrix></app-submission-matrix>
      </main>

      <!-- Dialogs -->
      <app-metadata-modal></app-metadata-modal>
      <app-proof-modal></app-proof-modal>

      <!-- Footer -->
      <footer class="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800">LaunchDirectories</span>
            <span>· Automated SaaS Submission Platform</span>
          </div>
          <div class="flex items-center gap-4 text-slate-500">
            <span class="text-emerald-600 font-semibold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              All 61+ Directories Live
            </span>
            <span>API: Port 3001</span>
            <span>Frontend: Port 4200</span>
          </div>
        </div>
      </footer>

    </div>
  `,
})
export class AppComponent {}
