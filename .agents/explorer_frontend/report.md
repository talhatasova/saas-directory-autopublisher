# Frontend & Test Harness Architecture Report

**Project**: SaaS Directory Auto-Publisher  
**Architect**: 	eamwork_preview_explorer_2 (Frontend & Test Harness Architect)  
**Date**: 2026-08-23  
**Status**: Completed Architectural Blueprint  

---

## Executive Summary

The SaaS Directory Auto-Publisher frontend is designed as a premier, high-performance single-page application built on the latest **Angular 19+ Standalone Components** ecosystem, fully leveraging **Angular Signals** (signal, computed, effect, linkedSignal, esource), **Tailwind CSS**, and modern UI design primitives inspired by high-end design systems (**Awwwards, 21st.dev, Skiper UI, Vengeance UI**). 

The platform provides indie hackers and SaaS founders with an effortless 1-click launch experience: from entering a product landing page URL, through instant sub-3s metadata scraping and interactive enrichment, to a real-time live submission matrix tracking automated publishing across top SaaS directories (AlternativeTo, SaaSHub, Uneed, There's An AI For That, Toolify, etc.).

This document specifies the complete frontend system, component tree, signal stores, UI/UX design tokens, glassmorphic layout primitives, Supabase Auth & Realtime synchronization, and an exhaustive 4-Tier Verification Test Harness (Unit, Submitter Sandbox, Queue Concurrency Stress, and Playwright E2E).

---

## 1. Angular 19+ Standalone & Signals Architecture

### 1.1 Core Architecture Principles
1. **100% Standalone & Zoneless-Ready**:
   - Zero NgModule declarations.
   - provideExperimentalZonelessChangeDetection() and ChangeDetectionStrategy.OnPush throughout all components.
   - Minimal bundle overhead, instant hydration, and peak runtime performance.

2. **Signals-First Reactive State**:
   - Direct reactive primitive signal<T>() for local and feature state.
   - Derived values via computed(() => ...) ensuring fine-grained, glitch-free dependency tracking.
   - Side effects managed through effect() and lifecycle cleanup.
   - Angular 19 linkedSignal() for editable state derived from source signals (e.g. metadata extraction overrides).
   - Angular 19 esource() / xResource() for declarative async data fetching with built-in loading/error/value states.

3. **Supabase Client Architecture**:
   - Single initialized @supabase/supabase-js client injected via Angular dependency injection token SUPABASE_CLIENT.
   - Native Supabase Auth handling session persistence in browser localStorage with reactive user$ / userSignal.
   - Realtime channel subscriptions with automatic reconnection and fallback to Backend Server-Sent Events (SSE).

### 1.2 Frontend Project Layout Blueprint

`
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts         # Supabase Auth client wrapper & token management
│   │   │   │   ├── auth.store.ts           # Signal-based AuthStore (user, session, loading, isAuthenticated)
│   │   │   │   └── auth.guard.ts           # Functional CanActivateFn guard protecting private routes
│   │   │   ├── supabase/
│   │   │   │   ├── supabase.service.ts     # Supabase client factory & DI token
│   │   │   │   └── realtime.service.ts     # Supabase Realtime channel manager & event dispatcher
│   │   │   ├── api/
│   │   │   │   ├── api.service.ts          # Base HTTP client with typed interceptors & error handling
│   │   │   │   ├── extractor.service.ts    # REST client for /api/v1/extract endpoint
│   │   │   │   ├── project.service.ts      # REST client for /api/v1/projects CRUD
│   │   │   │   ├── directory.service.ts    # REST client for /api/v1/directories registry
│   │   │   │   └── submission.service.ts   # REST client for /api/v1/submissions & /api/v1/launch
│   │   │   └── models/
│   │   │       ├── project.model.ts        # Project, ExtractedMetadata, CopyVariants interfaces
│   │   │       ├── directory.model.ts      # DirectoryCatalog, SubmissionType, Status interfaces
│   │   │       ├── submission.model.ts     # SubmissionRecord, LogEntry, ProofArtifact interfaces
│   │   │       └── user.model.ts           # UserProfile, QuotaLimits, AuthState interfaces
│   │   ├── state/
│   │   │   ├── project.store.ts            # Signal store: activeProject, metadata, isExtracting, projectHistory
│   │   │   ├── directory.store.ts          # Signal store: directoryList, selectedIds, filters (DR, Type, Category)
│   │   │   └── submission.store.ts         # Signal store: submissionsMap, activeJobs, liveProgress, matrixFilter
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── navbar/                 # Sleek glass navbar with user profile, project switcher, theme toggle
│   │   │   │   ├── footer/                 # Modern minimalist footer with links & live system status
│   │   │   │   ├── button/                 # Glowing gradient button, ghost button, icon button
│   │   │   │   ├── input/                  # Glowing input field with floating label & validation states
│   │   │   │   ├── modal/                  # Glassmorphism backdrop modal container with escape/click-outside
│   │   │   │   ├── status-pill/            # Animated status badge (Queued, In Progress, Published, Alert, Failed)
│   │   │   │   ├── progress-bar/           # High-precision linear and circular SVG progress bars with glow
│   │   │   │   ├── glass-card/             # Reusable card primitive with radial gradient hover spotlight
│   │   │   │   └── screenshot-modal/       # High-res proof viewer modal with zoom, timestamp & copy link
│   │   │   ├── pipes/
│   │   │   │   ├── time-ago.pipe.ts        # Human-readable relative timestamp formatting
│   │   │   │   └── dr-color.pipe.ts        # Domain Rating color pill class mapper
│   │   │   └── directives/
│   │   │       ├── spotlight.directive.ts  # 21st.dev mouse-follow radial gradient spotlight directive
│   │   │       └── auto-focus.directive.ts # Smooth autofocus on modal opens
│   │   ├── features/
│   │   │   ├── landing/
│   │   │   │   ├── landing.component.ts    # Main landing page orchestration
│   │   │   │   ├── hero-url-bar/           # Hero section with interactive glowing URL input bar
│   │   │   │   ├── live-counter/           # Real-time directory & submission count ticker
│   │   │   │   ├── features-grid/          # Glassmorphic feature highlight cards
│   │   │   │   └── testimonials-banner/    # Social proof & founder reviews
│   │   │   ├── extractor/
│   │   │   │   ├── metadata-modal.component.ts    # Main review modal wrapping extraction step
│   │   │   │   ├── metadata-form.component.ts     # Editable title, taglines, category, tags, pricing
│   │   │   │   ├── copy-variant-tabs.component.ts # Pitch (80c), Summary (250c), Detailed (500c) copy tabs
│   │   │   │   └── screenshot-gallery.component.ts# Logo preview, hero screenshot & file upload dropzone
│   │   │   ├── directory-selection/
│   │   │   │   ├── directory-selector.component.ts# Catalog grid with filter pills & select-all presets
│   │   │   │   └── directory-card.component.ts    # Individual directory selection card with DR badge
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.component.ts         # Main submission monitoring dashboard
│   │   │   │   ├── submission-stats.component.ts  # Top KPI stats bar (Total, Published, In Progress, Failed)
│   │   │   │   ├── submission-matrix.component.ts # Real-time table / grid of directory submission statuses
│   │   │   │   ├── submission-row.component.ts    # Individual directory submission row with live animations
│   │   │   │   ├── captcha-alert-banner.component.ts # Interactive human intervention modal / banner
│   │   │   │   └── export-report-modal.component.ts  # CSV / JSON export trigger & download
│   │   │   └── auth/
│   │   │       ├── login-modal.component.ts       # Glassmorphic OAuth + Magic Link login dialog
│   │   │       └── auth-callback.component.ts     # Supabase OAuth redirect & PKCE exchange handler
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── styles.css                                 # Tailwind base, components, utilities & custom animations
│   └── index.html
├── tailwind.config.js                             # Custom theme, colors, glows, keyframes, glass blurs
├── tsconfig.json
├── package.json
└── angular.json
`

---

## 2. High-End SaaS UI/UX Design System (21st.dev / Skiper UI / Vengeance UI Style)

### 2.1 Aesthetic Philosophy
The visual direction combines the razor-sharp minimalism of **Linear / Vercel** with the fluid, luminous micro-interactions of **21st.dev, Skiper UI, and Vengeance UI**. 

- **Color Foundation**:
  - **Dark Mode (Default)**: Pure OLED-leaning background (#090A0F) with deep obsidian card layers (#11131F, #16192B), highlighted by ultra-subtle white alpha borders (order-white/10).
  - **Light Mode**: Crisp porcelain canvas (#FAFAFC) with pristine elevated cards (#FFFFFF) and soft slate contours (order-slate-200/80).
  - **Brand Primary Accent**: Electric Indigo / Violet gradient (#6366F1 -> #8B5CF6 -> #A855F7) paired with a luminous radial glow (ox-shadow: 0 0 35px -5px rgba(99, 102, 241, 0.35)).
  - **Semantic Status Palette**:
    - **Queued**: Luminous Amber (#F59E0B, bg: gba(245, 158, 11, 0.12), text: #FBBF24, pulse: subtle glow).
    - **In Progress**: Vivid Cyan / Blue (#3B82F6, bg: gba(59, 130, 246, 0.15), text: #60A5FA, pulse: animated radar wave).
    - **Published / Success**: Vibrant Emerald (#10B981, bg: gba(16, 185, 129, 0.15), text: #34D399, static glow).
    - **Action Required / CAPTCHA**: Electric Rose / Coral (#F43F5E, bg: gba(244, 63, 94, 0.18), text: #FB7185, strobe alert pulse).
    - **Failed**: Crimson Red (#EF4444, bg: gba(239, 68, 68, 0.12), text: #F87171, border: order-red-500/30).

### 2.2 Tailwind CSS Configuration & Tokens

`javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#090A0F',
          darkCard: '#11131F',
          darkElevated: '#16192B',
          light: '#FAFAFC',
          lightCard: '#FFFFFF',
          lightElevated: '#F1F3F9'
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          glow: '#7C3AED'
        },
        status: {
          queued: '#F59E0B',
          inProgress: '#3B82F6',
          published: '#10B981',
          actionRequired: '#F43F5E',
          failed: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'glass-glow': '0 0 25px -3px rgba(99, 102, 241, 0.25)',
        'hero-input': '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'card-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 20px -2px rgba(99, 102, 241, 0.15)',
        'pill-active': '0 0 12px 0 currentColor'
      },
      animation: {
        'radar-pulse': 'radarPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'alert-pulse': 'alertPulse 1.2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow-line': 'glowLine 3s ease-in-out infinite'
      },
      keyframes: {
        radarPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.15)' }
        },
        alertPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.08)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        glowLine: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        }
      }
    }
  }
};
`

### 2.3 Glassmorphism CSS Utilities

`css
/* src/styles.css - Glass & Glow Primitives */
@layer utilities {
  .glass-panel {
    background: rgba(17, 19, 31, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  .glass-panel-light {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 8px 30px 0 rgba(0, 0, 0, 0.04);
  }

  .glass-card-interactive {
    @apply transition-all duration-300 ease-out hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-card-hover;
  }

  .radial-spotlight {
    background: radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(99, 102, 241, 0.08), transparent 40%);
  }

  .gradient-border-glow {
    position: relative;
  }
  .gradient-border-glow::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899, #6366F1);
    background-size: 300% 300%;
    animation: glowLine 6s ease infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}
`

---

## 3. Complete User Flows & Component Specifications

### 3.1 Flow 1: Landing & Hero with Interactive URL Input Bar
- **Objective**: Instantly capture the SaaS URL with zero friction, validating format in real time and providing an immediate high-tech scan animation.
- **Component**: HeroUrlBarComponent (Standalone)
- **Key Features**:
  - Auto-paste detection on focus / clipboard button.
  - Client-side URL normalization (https:// prepending, invalid TLD checking).
  - Multi-state action button: Extract & Review -> Analyzing [Cheerio + Playwright]... -> Launching Modal.
  - Directory live ticker badge (50+ Directories | Average DR 72 | 100% Free).
- **Interactive State Machine**:
  `
  [Empty / Idle] ──(Input/Paste URL)──> [Valid URL Ready] 
          │                                     │ (Click/Enter)
          ▼                                     ▼
  [URL Invalid Error Alert]            [Scraping Progress Spinner] 
                                                │ (Sub-3s Response)
                                                ▼
                                    [Open Metadata Review Modal]
  `

### 3.2 Flow 2: Instant Metadata Extraction & Review Modal
- **Objective**: Present extracted OpenGraph, JSON-LD, and synthesized copy in an editable, elegant dialog allowing founders to fine-tune listings before dispatch.
- **Component**: MetadataModalComponent (Standalone)
- **Form Controls & Enrichments**:
  1. **Product Identity**:
     - Logo / Favicon (Live thumbnail preview + replacement file uploader).
     - Product Name / Title (with 50-character limit counter).
     - Website URL & Pricing Model (Free, Freemium, Paid, Open Source).
  2. **Multi-Length Copy Variants (Tabbed Review)**:
     - **Short Pitch (80 chars)**: For Twitter/X directory snippets & tagline badges.
     - **Standard Summary (250 chars)**: For directory overview listings (Uneed, SaaSHub).
     - **Detailed Review (500+ chars)**: Formatted markdown narrative detailing features & use cases.
     - *AI Regenerate button* per tab to re-synthesize copy instantly.
  3. **Classification & Taxonomy**:
     - Primary Category (Dropdown with auto-detected category preselected: AI, DevTools, Productivity, Marketing, Finance).
     - Tags / Keywords (Interactive chip pill editor with suggested tags based on landing page keywords).
  4. **Screenshot Proof Gallery**:
     - Displays auto-captured landing page screenshot.
     - Add extra feature screenshots via drag-and-drop.
  5. **Actions**:
     - Discard / Reset
     - Continue to Directory Selection ->

### 3.3 Flow 3: Directory Selection & Automation Launcher
- **Objective**: Allow granular or 1-click batch selection of target submission platforms with clear Domain Rating (DR) transparency and submission type indicators.
- **Component**: DirectorySelectorComponent (Standalone)
- **Selection Capabilities**:
  - **Smart Presets**:
    - Select All Free (Default) (All 15+ verified free directories)
    - High Authority (DR 70+) (AlternativeTo, SaaSHub, Toolify)
    - AI Directories Only (There's An AI For That, Toolify, Futurepedia)
    - Fast API Submissions Only
  - **Directory Matrix Card**:
    - Directory Logo & Name.
    - Submission Type Pill: Automated Form (Playwright) (Purple) vs Direct REST API (Cyan) vs Assisted Submission (Slate).
    - Domain Rating Badge (DR 84 in emerald gradient for 80+, DR 65 in blue for 60-79).
    - Estimated Time Indicator (~15 sec via API vs ~45 sec via Browser).
    - Toggle checkbox with smooth spring animation.
  - **Launch Action Bar**:
    - Sticky bottom bar showing Ready to launch 5 directories, estimated completion time (~2 minutes), and glowing Launch Auto-Publisher Now 🚀 trigger.

### 3.4 Flow 4: Real-time Live Status Matrix & Dashboard
- **Objective**: Deliver a real-time command center where founders watch publishing jobs execute concurrently across directories with zero page reloads.
- **Component**: DashboardComponent & SubmissionMatrixComponent (Standalone)
- **Live UI Elements**:
  1. **Top Metric Bar (KPIs)**:
     - Total Submissions Target (e.g. 12)
     - Successfully Published (8 with animated counter)
     - In Progress (3 with pulsing radar dot)
     - Action Required (1 with red attention badge)
     - Overall Completion Progress Bar (0% -> 100% with smooth gradient fill & glowing head).
  2. **Submission Matrix Table / Grid**:
     - **Directory**: Name, category, and direct external link icon.
     - **Domain Rating**: Pill with color scale based on SEO authority.
     - **Type**: Headless Playwright vs Direct REST API.
     - **Status Badge**:
       - Queued: Clock icon, soft amber glow.
       - In Progress: Spinner icon, vivid blue radar wave animation.
       - Published: Checkmark icon, emerald badge, listing link button (View Live ↗).
       - Action Required / CAPTCHA: Warning triangle, flashing rose pill with Solve / Authorize button.
       - Failed: Exclamation icon, red badge with tooltip displaying error reason and Retry button.
     - **Live Activity Log / Step**: E.g. Filling form step 2/3, Uploading logo asset, Awaiting listing verification.
     - **Proof Artifact**: Clickable thumbnail linking to high-res submission confirmation screenshot.
  3. **High-Res Screenshot Proof Lightbox Modal**:
     - Modal displaying the full-page Playwright confirmation screenshot.
     - Metadata panel showing: Directory Name, Submission Timestamp (ISO & Local), Listing URL, Confirmation ID, and Copy Proof Link / Download Screenshot buttons.
  4. **Human Intervention Modal (CAPTCHA / 2FA Alert)**:
     - Automatically pops up or docks if a worker encounters Cloudflare Turnstile or email OTP.
     - Provides interactive iframe/stream or instructions to complete authorization, resuming worker execution immediately.

### 3.5 Flow 5: Supabase Auth & Multi-Project Session Management
- **Objective**: Secure user data, manage multiple SaaS product profiles, and ensure session continuity across devices.
- **Components**: LoginModalComponent, AuthCallbackComponent, NavbarComponent
- **Authentication Methods**:
  - Google OAuth (1-click popup/redirect with Supabase PKCE flow).
  - Magic Link / Email & Password with automatic token refresh.
- **Multi-Project Management**:
  - Project Switcher dropdown in the top navigation bar.
  - Ability to create a new project by entering a new SaaS URL at any time.
  - History view showing all previously launched SaaS apps and their lifetime directory backlink status.

---

## 4. Signal State Management & Data Flow Architecture

### 4.1 Signal Store Pattern
Rather than bulky third-party libraries, the frontend implements the idiomatic **Angular Signals Service-with-Signals** pattern. State is strictly encapsulated: read-only signals are exposed externally, while mutation methods operate on private writable signals.

### 4.2 ProjectStore Implementation Specification

`	ypescript
// src/app/state/project.store.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { ExtractorApiService } from '../core/api/extractor.service';
import { ProjectApiService } from '../core/api/project.service';
import { Project, ExtractedMetadata, CreateProjectPayload } from '../core/models/project.model';

export interface ProjectState {
  currentProject: Project | null;
  extractedDraft: ExtractedMetadata | null;
  isExtracting: boolean;
  isSaving: boolean;
  extractionError: string | null;
  recentProjects: Project[];
}

@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private extractorApi = inject(ExtractorApiService);
  private projectApi = inject(ProjectApiService);

  // Private state signals
  private readonly _state = signal<ProjectState>({
    currentProject: null,
    extractedDraft: null,
    isExtracting: false,
    isSaving: false,
    extractionError: null,
    recentProjects: []
  });

  // Public readonly computed signals
  readonly currentProject = computed(() => this._state().currentProject);
  readonly extractedDraft = computed(() => this._state().extractedDraft);
  readonly isExtracting = computed(() => this._state().isExtracting);
  readonly isSaving = computed(() => this._state().isSaving);
  readonly extractionError = computed(() => this._state().extractionError);
  readonly recentProjects = computed(() => this._state().recentProjects);
  readonly hasDraft = computed(() => !!this._state().extractedDraft);

  // Actions
  async extractMetadata(url: string): Promise<ExtractedMetadata> {
    this._state.update(s => ({ ...s, isExtracting: true, extractionError: null }));
    try {
      const metadata = await this.extractorApi.extractUrl(url);
      this._state.update(s => ({
        ...s,
        extractedDraft: metadata,
        isExtracting: false
      }));
      return metadata;
    } catch (err: any) {
      const message = err.message || 'Failed to extract website metadata. Please check the URL.';
      this._state.update(s => ({
        ...s,
        isExtracting: false,
        extractionError: message
      }));
      throw err;
    }
  }

  updateDraft(partial: Partial<ExtractedMetadata>): void {
    this._state.update(s => {
      if (!s.extractedDraft) return s;
      return {
        ...s,
        extractedDraft: { ...s.extractedDraft, ...partial }
      };
    });
  }

  clearDraft(): void {
    this._state.update(s => ({ ...s, extractedDraft: null, extractionError: null }));
  }

  async saveAndActivateProject(payload: CreateProjectPayload): Promise<Project> {
    this._state.update(s => ({ ...s, isSaving: true }));
    try {
      const project = await this.projectApi.createProject(payload);
      this._state.update(s => ({
        ...s,
        currentProject: project,
        recentProjects: [project, ...s.recentProjects.filter(p => p.id !== project.id)],
        isSaving: false,
        extractedDraft: null
      }));
      return project;
    } catch (err: any) {
      this._state.update(s => ({ ...s, isSaving: false }));
      throw err;
    }
  }

  setCurrentProject(project: Project): void {
    this._state.update(s => ({ ...s, currentProject: project }));
  }
}
`

### 4.3 SubmissionStore Implementation Specification

`	ypescript
// src/app/state/submission.store.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { SubmissionApiService } from '../core/api/submission.service';
import { RealtimeService } from '../core/supabase/realtime.service';
import { Submission, SubmissionStatus, LaunchPayload } from '../core/models/submission.model';

export interface SubmissionState {
  submissions: Record<string, Submission>; // key = submission.id
  activeProjectId: string | null;
  isLoading: boolean;
  filterStatus: SubmissionStatus | 'ALL';
  searchQuery: string;
  selectedProofSubmission: Submission | null;
  activeCaptchaIntervention: Submission | null;
}

@Injectable({ providedIn: 'root' })
export class SubmissionStore {
  private submissionApi = inject(SubmissionApiService);
  private realtime = inject(RealtimeService);

  private readonly _state = signal<SubmissionState>({
    submissions: {},
    activeProjectId: null,
    isLoading: false,
    filterStatus: 'ALL',
    searchQuery: '',
    selectedProofSubmission: null,
    activeCaptchaIntervention: null
  });

  // Selectors
  readonly allSubmissions = computed(() => Object.values(this._state().submissions));
  readonly filteredSubmissions = computed(() => {
    const { submissions, filterStatus, searchQuery } = this._state();
    return Object.values(submissions).filter(sub => {
      const matchesStatus = filterStatus === 'ALL' || sub.status === filterStatus;
      const matchesSearch = !searchQuery || 
        sub.directory_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.directory_category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  });

  readonly stats = computed(() => {
    const list = this.allSubmissions();
    const total = list.length;
    const published = list.filter(s => s.status === 'published').length;
    const inProgress = list.filter(s => s.status === 'in_progress').length;
    const queued = list.filter(s => s.status === 'queued').length;
    const actionRequired = list.filter(s => s.status === 'action_required').length;
    const failed = list.filter(s => s.status === 'failed').length;
    const progressPercent = total > 0 ? Math.round((published / total) * 100) : 0;

    return { total, published, inProgress, queued, actionRequired, failed, progressPercent };
  });

  readonly selectedProof = computed(() => this._state().selectedProofSubmission);
  readonly activeIntervention = computed(() => this._state().activeCaptchaIntervention);
  readonly isLoading = computed(() => this._state().isLoading);

  // Realtime subscription setup
  listenToProjectSubmissions(projectId: string): () => void {
    this._state.update(s => ({ ...s, activeProjectId: projectId, isLoading: true }));

    // Fetch initial state
    this.submissionApi.getProjectSubmissions(projectId).then(items => {
      const map: Record<string, Submission> = {};
      for (const item of items) map[item.id] = item;
      this._state.update(s => ({ ...s, submissions: map, isLoading: false }));
    });

    // Subscribe to Supabase Realtime channel
    const unsubscribe = this.realtime.subscribeToSubmissions(projectId, (updatedSub) => {
      this.handleRealtimeUpdate(updatedSub);
    });

    return unsubscribe;
  }

  handleRealtimeUpdate(sub: Submission): void {
    this._state.update(s => {
      const existing = s.submissions[sub.id];
      const merged = existing ? { ...existing, ...sub } : sub;
      const intervention = merged.status === 'action_required' ? merged : 
        (s.activeCaptchaIntervention?.id === merged.id ? null : s.activeCaptchaIntervention);

      return {
        ...s,
        submissions: { ...s.submissions, [sub.id]: merged },
        activeCaptchaIntervention: intervention
      };
    });
  }

  async launchSubmissions(payload: LaunchPayload): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true }));
    try {
      const initiated = await this.submissionApi.launchBatch(payload);
      this._state.update(s => {
        const newMap = { ...s.submissions };
        for (const item of initiated) newMap[item.id] = item;
        return { ...s, submissions: newMap, isLoading: false };
      });
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false }));
      throw err;
    }
  }

  setFilter(status: SubmissionStatus | 'ALL'): void {
    this._state.update(s => ({ ...s, filterStatus: status }));
  }

  setSearch(query: string): void {
    this._state.update(s => ({ ...s, searchQuery: query }));
  }

  openProofModal(sub: Submission): void {
    this._state.update(s => ({ ...s, selectedProofSubmission: sub }));
  }

  closeProofModal(): void {
    this._state.update(s => ({ ...s, selectedProofSubmission: null }));
  }

  dismissIntervention(): void {
    this._state.update(s => ({ ...s, activeCaptchaIntervention: null }));
  }
}
`

---

## 5. Real-Time Synchronization Architecture

### 5.1 Dual-Channel Realtime Engine (Supabase + SSE Fallback)
To ensure 100% resilient live matrix updates across diverse network topologies, the frontend features a hybrid realtime dispatcher:

1. **Primary: Supabase Postgres Changes Channel**:
   - Uses Supabase JS Client Realtime Websocket (supabase.channel('public:submissions')).
   - Listens to INSERT and UPDATE events on the submissions table filtered by project_id=eq.{projectId}.
   - Latency: < 150ms from worker status update to UI animation.

2. **Secondary: Backend Server-Sent Events (SSE) Fallback**:
   - If Supabase WebSocket connection drops or encounters proxy firewall restrictions, the frontend automatically initiates an SSE stream to /api/v1/submissions/stream?projectId={projectId}.
   - Seamlessly reconciles incoming events into SubmissionStore using unique submission ID keys.

`	ypescript
// src/app/core/supabase/realtime.service.ts
import { Injectable, inject, NgZone } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Submission } from '../models/submission.model';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private supabase = inject(SupabaseService).client;
  private ngZone = inject(NgZone);

  subscribeToSubmissions(projectId: string, onUpdate: (sub: Submission) => void): () => void {
    const channelName = submissions-project-;
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: project_id=eq.
        },
        (payload) => {
          this.ngZone.run(() => {
            const updated = payload.new as Submission;
            onUpdate(updated);
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log([Realtime] Subscribed to submissions for project );
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] WebSocket error, fallback to SSE polling if needed');
        }
      });

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}
`

---

## 6. Comprehensive 4-Tier Test Harness & Verification Suite

A bulletproof verification plan is architected across four distinct testing tiers to guarantee that every component, adapter, queue worker, and user flow is verifiable both locally and in automated CI pipelines.

`
┌─────────────────────────────────────────────────────────────┐
│                 Tier 4: End-to-End Suite                    │
│    (Playwright Browser Tests: Auth, Flow, Live Matrix, E2E) │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│           Tier 3: Queue Concurrency & Stress Harness        │
│   (10+ Concurrent SaaS Launches, Backpressure, Retry Logic) │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│      Tier 2: Submitter Adapter Sandbox & Mock Harness       │
│    (Simulated Directory HTTP & Headless Playwright Forms)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             Tier 1: Unit & Component Test Suite             │
│    (Extractor Parsers, Signals Stores, UI Form Validation)  │
└─────────────────────────────────────────────────────────────┘
`

### 6.1 Tier 1: Unit & Component Test Suite
- **Scope**:
  1. ExtractorParser: Unit tests validating OpenGraph tag parsing, JSON-LD (SoftwareApplication, Product) extraction, Twitter card fallback, and canonical URL sanitization.
  2. ProjectStore & SubmissionStore: Testing Signal state transitions, computed selectors, draft updates, and filter behaviors.
  3. HeroUrlBarComponent: Testing input validation regex, keyboard Enter triggers, and error message rendering.

`	ypescript
// tests/unit/extractor.spec.ts
import { parseHtmlMetadata } from '../../src/app/core/utils/metadata-parser';

describe('Metadata Extractor Parser Unit Tests', () => {
  const mockHtml = 
    <!DOCTYPE html>
    <html>
      <head>
        <title>SuperTool — AI Copilot for Developers</title>
        <meta name= description content=Boost developer velocity by 10x with intelligent AI autocomplete. />
        <meta property=og:title content=SuperTool AI />
        <meta property=og:description content=The next-generation developer AI assistant. />
        <meta property=og:image content=https://supertool.io/og-image.png />
        <link rel=icon href=/favicon.ico />
        <script type=application/ld+json>
          {
            @context: https://schema.org,
            @type: SoftwareApplication,
            name: SuperTool,
            applicationCategory: DeveloperApplication,
            offers: { @type: Offer, price: 0 }
          }
        </script>
      </head>
      <body><h1>Welcome to SuperTool</h1></body>
    </html>
  ;

  it('should parse OpenGraph and JSON-LD schema correctly in under 10ms', () => {
    const start = performance.now();
    const result = parseHtmlMetadata(mockHtml, 'https://supertool.io');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
    expect(result.title).toBe('SuperTool AI');
    expect(result.description).toBe('The next-generation developer AI assistant.');
    expect(result.category).toBe('DeveloperApplication');
    expect(result.logo_url).toBe('https://supertool.io/favicon.ico');
    expect(result.pricing_model).toBe('Free');
  });
});
`

### 6.2 Tier 2: Submitter Adapter Sandbox & Mock Harness
- **Scope**:
  - Local sandbox environment providing mock directory form pages and HTTP endpoints.
  - Ensures each of the 5+ directory submitter adapters (UneedAdapter, SaaSHubAdapter, AlternativeToAdapter, TaaftAdapter, ToolifyHttpAdapter) can be thoroughly executed without hitting live third-party production servers.
  - Tests: Form filling, multi-step navigation, file upload simulation, CAPTCHA trigger detection, and proof screenshot capture.
- **Architecture**:
  - Local Mock Server (	ests/sandbox/mock-server.ts) running on port 4040.
  - Serves static mock directory HTML fixtures with dynamic form submission handlers.
  - Returns synthetic success confirmation pages with generated listing URLs.

`	ypescript
// tests/sandbox/adapter-sandbox.spec.ts
import { test, expect } from '@playwright/test';
import { SaaSHubAdapter } from '../../backend/src/adapters/saashub.adapter';
import { UneedAdapter } from '../../backend/src/adapters/uneed.adapter';
import { ToolifyHttpAdapter } from '../../backend/src/adapters/toolify-http.adapter';

test.describe('Submitter Adapter Sandbox Suite', () => {
  const sampleProject = {
    id: 'proj-123',
    name: 'SaaS Pulse',
    url: 'https://saaspulse.dev',
    tagline: 'Real-time SaaS analytics dashboard',
    description: 'Monitor SaaS revenue and directory backlinks in real-time.',
    category: 'Analytics',
    tags: ['saas', 'analytics', 'dashboard'],
    pricing_model: 'Freemium',
    logo_url: 'http://localhost:4040/fixtures/logo.png',
    screenshot_url: 'http://localhost:4040/fixtures/screenshot.png'
  };

  test('SaaSHubAdapter should complete multi-step form and return proof screenshot', async ({ page }) => {
    const adapter = new SaaSHubAdapter({ baseUrl: 'http://localhost:4040/mock/saashub' });
    const result = await adapter.submit(page, sampleProject);

    expect(result.status).toBe('published');
    expect(result.listing_url).toContain('saashub/products/saas-pulse');
    expect(result.proof_screenshot_buffer).toBeDefined();
  });

  test('ToolifyHttpAdapter should execute direct REST submission cleanly', async () => {
    const adapter = new ToolifyHttpAdapter({ apiUrl: 'http://localhost:4040/api/mock/toolify/submit' });
    const result = await adapter.submitDirect(sampleProject);

    expect(result.status).toBe('published');
    expect(result.listing_url).toContain('toolify.ai/tool/saas-pulse');
  });

  test('UneedAdapter should trigger action_required signal when CAPTCHA is simulated', async ({ page }) => {
    const adapter = new UneedAdapter({ baseUrl: 'http://localhost:4040/mock/uneed-captcha' });
    const result = await adapter.submit(page, sampleProject);

    expect(result.status).toBe('action_required');
    expect(result.error_message).toContain('CAPTCHA detected');
  });
});
`

### 6.3 Tier 3: Queue Concurrency & Load Stress Harness
- **Scope**:
  - Simulates 10+ concurrent SaaS submissions (dispatching 50–100 simultaneous directory publishing jobs).
  - Asserts that the worker pipeline:
    1. Does not block the Node.js event loop or REST API.
    2. Respects per-directory concurrency limits (e.g. max 2 parallel browser sessions per directory target).
    3. Handles BullMQ job retries with exponential backoff on simulated 503 network hiccups.
    4. Accurately dispatches status events across all 50+ submission records without race conditions.
- **Stress Test Runner Specification**:

`	ypescript
// tests/stress/queue-stress-runner.ts
import { QueueWorkerEngine } from '../../backend/src/queue/worker.engine';

export async function runConcurrencyBenchmark(concurrentProjects = 10, directoriesPerProject = 5) {
  console.log(Starting Concurrency Benchmark:  projects x  directories ( jobs)...);
  
  const startTime = Date.now();
  const jobs: Promise<any>[] = [];

  for (let i = 1; i <= concurrentProjects; i++) {
    const projectPayload = {
      projectId: stress-proj-,
      name: Stress Test App ,
      url: https://app.example.com,
      directoryIds: ['saashub', 'uneed', 'toolify', 'alternativeto', 'taaft']
    };

    jobs.push(QueueWorkerEngine.enqueueProjectLaunch(projectPayload));
  }

  const results = await Promise.all(jobs);
  const totalElapsed = (Date.now() - startTime) / 1000;

  console.log(Benchmark Finished:  jobs dispatched in s);
  return { totalJobs: results.length * 5, elapsedSeconds: totalElapsed };
}
`

### 6.4 Tier 4: End-to-End (E2E) Test Suite (Playwright Test)
- **Scope**:
  Full browser automation exercising user flows from end-to-end against live staging or localized integration server.

`	ypescript
// tests/e2e/specs/01-happy-path-submission.spec.ts
import { test, expect } from '@playwright/test';

test.describe('E2E: Happy Path SaaS Submission Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to frontend app
    await page.goto('http://localhost:4200');
  });

  test('Complete flow: URL input -> Scraping Modal -> 5-Directory Multi-Launch -> Live Status Matrix', async ({ page }) => {
    // 1. Enter SaaS URL in Hero Bar
    const urlInput = page.getByPlaceholder(/Enter your SaaS or product URL/i);
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://fastai-builder.dev');
    await page.getByRole('button', { name: /Extract & Review/i }).click();

    // 2. Metadata Review Modal
    const modal = page.locator('.glass-modal-container');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/Product Title/i)).toHaveValue(/FastAI Builder/i);

    // Edit short pitch
    const pitchInput = page.getByLabel(/Short Pitch/i);
    await pitchInput.fill('Launch AI apps in 5 minutes with zero boilerplate.');

    // Continue to Directory Selection
    await page.getByRole('button', { name: /Select Directories/i }).click();

    // 3. Directory Selection
    await expect(page.getByText(/Select Target Directories/i)).toBeVisible();
    await page.getByRole('button', { name: /Select All Free/i }).click();

    // Launch trigger
    const launchButton = page.getByRole('button', { name: /Launch Auto-Publisher Now/i });
    await expect(launchButton).toBeEnabled();
    await launchButton.click();

    // 4. Live Dashboard Status Matrix
    await expect(page).toHaveURL(/.*dashboard/);
    const matrix = page.locator('.submission-matrix-grid');
    await expect(matrix).toBeVisible();

    // Assert initial queued/in_progress state
    const firstRow = matrix.locator('.submission-row').first();
    await expect(firstRow).toContainText(/Queued|In Progress/i);

    // Assert Realtime transition to Published (within 12s sandbox time)
    await expect(matrix.getByText(/Published/i).first()).toBeVisible({ timeout: 12000 });

    // 5. High-Res Proof Lightbox
    const proofButton = firstRow.getByRole('button', { name: /View Proof/i });
    if (await proofButton.isVisible()) {
      await proofButton.click();
      await expect(page.locator('.screenshot-lightbox-modal')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
`

---

## 7. Implementation Roadmap & Verification Checklist

| Milestone | Key Deliverables | Verification Command |
|---|---|---|
| **M1: Angular 19 Core & Design System** | Tailwind configuration, glassmorphism tokens, navbar, footer, shared buttons, inputs, modals, status pills. | 
pm run build & 
px ng test --include=shared/**/*.spec.ts |
| **M2: Landing & Scraper Integration** | Hero URL Bar, Instant Extraction API service, Metadata Review Modal with copy variant tabs and logo preview. | 
px ng test --include=features/extractor/**/*.spec.ts |
| **M3: Directory Selection & Launcher** | Directory catalog selector grid, filter presets (All Free, High DR, AI), batch launch trigger. | 
px ng test --include=features/directory-selection/**/*.spec.ts |
| **M4: Realtime Matrix & Live Dashboard** | Supabase Realtime subscription, submission matrix grid, animated status pills, live progress bar, proof lightbox modal. | 
px ng test --include=features/dashboard/**/*.spec.ts |
| **M5: Supabase Auth & Multi-Project** | Google OAuth, session state store (AuthStore), project switcher, protected route guards. | 
px ng test --include=core/auth/**/*.spec.ts |
| **M6: Verification & Test Harness** | 4-Tier verification test suite (Unit, Submitter Sandbox, Queue Concurrency Load, Playwright E2E). | 
px playwright test |

---
