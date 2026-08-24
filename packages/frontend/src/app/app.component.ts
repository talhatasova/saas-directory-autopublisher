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
    <div class="min-h-screen flex flex-col justify-between">
      
      <!-- Top Navigation -->
      <app-navbar></app-navbar>

      <!-- Main Application Experience -->
      <main class="flex-1 pb-16">
        <app-hero-url-bar></app-hero-url-bar>
        <app-stats-banner></app-stats-banner>
        <app-directory-selector></app-directory-selector>
        <app-submission-matrix></app-submission-matrix>
      </main>

      <!-- Dialogs & Lightbox Modals -->
      <app-metadata-modal></app-metadata-modal>
      <app-proof-modal></app-proof-modal>

      <!-- Footer -->
      <footer class="border-t border-white/5 bg-dark-950 py-8 text-center text-xs text-slate-500">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-300">LaunchAuto</span>
            <span>· Built with Angular 19, Supabase & Playwright</span>
          </div>
          <div class="flex items-center gap-4 text-slate-400">
            <span class="text-emerald-400 font-mono">● System Online</span>
            <span>API: Port 3001</span>
            <span>Frontend: Port 4200</span>
          </div>
        </div>
      </footer>

    </div>
  `,
})
export class AppComponent {}
