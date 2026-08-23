# Project: SaaS Directory Auto-Publisher

## Architecture

The SaaS Directory Auto-Publisher is an enterprise-grade full-stack platform designed for SaaS founders and indie hackers to automatically scrape, enrich, and asynchronously publish listings across top SaaS directories and launch communities.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     Frontend Layer                                     │
│  Angular 19+ Standalone · Angular Signals · Tailwind CSS · Awwwards Glassmorphic UI    │
│  (Hero URL Bar -> Metadata Review Modal -> Directory Selector -> Live Status Matrix)   │
└───────────────────┬─────────────────────────────────────────────────▲──────────────────┘
                    │ REST / OAuth / SSE                              │ Supabase Realtime
                    ▼                                                 │ (Postgres Changes)
┌───────────────────────────────────────────────────────┐  ┌──────────┴──────────────────┐
│                      Backend API                      │  │       Supabase Postgres     │
│  Node.js + TypeScript · REST Endpoints · WebSocket/SSE│  │  - users                    │
│  - Metadata Scraper & JSON-LD / Copy Generator Engine │  │  - projects                 │
│  - Directory Catalog & Submission Dispatcher          │  │  - directories              │
└───────────────────┬───────────────────────────────────┘  │  - submissions              │
                    │ Enqueue Jobs                         │  - RLS Policies & Pub/Sub   │
                    ▼                                      └──────────▲──────────────────┘
┌───────────────────────────────────────────────────────┐             │
│            Asynchronous Worker Pipeline               │             │ Storage Uploads
│  BullMQ / In-Memory Queue Runner · Concurrency = 10+  │             │ & Status Updates
│  Pluggable DirectorySubmitter Adapters (5+):          ├─────────────┘
│  1. UneedAdapter (Playwright Form Automation)         │
│  2. SaaSHubAdapter (Playwright Multi-step Form)       │
│  3. AlternativeToAdapter (Playwright Form)            │
│  4. TaaftAdapter (Playwright Form - There's An AI)    │
│  5. ToolifyHttpAdapter (Direct REST API / Webhook)    │
│  + CaptchaDetector (Cloudflare / Recaptcha / 2FA)     │
│  + ProofScreenshotCapture -> Supabase Storage         │
└───────────────────────────────────────────────────────┘
```

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Schema & Migrations | Postgres tables: `users`, `projects`, `directories`, `submissions` with constraints, foreign keys, and indexes | M1 | ORIGINAL_REQUEST §R4 |
| 2 | Supabase RLS & Security | Strict Row Level Security policies per user and service-role bypass for workers | M1 | ORIGINAL_REQUEST §R4 |
| 3 | Realtime Publication Setup | Enable `supabase_realtime` on `projects` and `submissions` with `REPLICA IDENTITY FULL` | M1 | ORIGINAL_REQUEST §R4 |
| 4 | Supabase Client & DB Types | Strongly-typed TypeScript database schema interfaces and client factory | M1 | ORIGINAL_REQUEST §R4 |
| 5 | Metadata Scraper Engine | Sub-3s extraction of title, meta descriptions, OpenGraph, Twitter cards, favicon/logo, hero images, JSON-LD | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Copy Enrichment Engine | Algorithmic copy generator: 80-char pitch, 250-char summary, 500+ char review, keywords/tags, category classifier | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Directory Registry Service | Pluggable directory catalog with category, Domain Rating (DR), submission type, status, and config | M2 | ORIGINAL_REQUEST §R2 |
| 8 | RESTful & SSE API Service | Modular API endpoints for metadata extraction, project CRUD, directory listing, submission dispatch, SSE stream | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Queue & Worker Architecture | BullMQ/In-Memory queue with concurrency control (10+), rate limits, and exponential backoff retry | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Pluggable Adapter Framework | Standardized `DirectorySubmitter` interface with lifecycle hooks (validate, submit, signalIntervention, captureProof) | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Headless Playwright Adapters | Automated form submissions for Uneed, SaaSHub, AlternativeTo, There's An AI For That | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Direct HTTP/REST Adapter | Direct API/Webhook submitter for Toolify / REST directories | M3 | ORIGINAL_REQUEST §R3 |
| 13 | CAPTCHA / 2FA Detection | Automated detection of Cloudflare Turnstile, reCAPTCHA, hCaptcha, OTP with user intervention event dispatch | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Proof-of-Submission System | Automated screenshot proof capture and storage upload linking to submission record | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Angular 19 Standalone Architecture | Zoneless-ready standalone components with Angular Signals (`AuthStore`, `ProjectStore`, `DirectoryStore`, `SubmissionStore`) | M4 | ORIGINAL_REQUEST §R1 |
| 16 | Glassmorphic Design System | Awwwards / 21st.dev / Skiper UI aesthetic, OLED dark & light themes, sleek typography, micro-interactions | M4 | ORIGINAL_REQUEST §R1 |
| 17 | Hero & URL Extraction Flow | Interactive URL bar with instant auto-scraping trigger and status feedback | M4 | ORIGINAL_REQUEST §R1 |
| 18 | Metadata Review Modal | Editable preview modal for title, tagline, description copy tabs, category, tags, logo, and screenshots | M4 | ORIGINAL_REQUEST §R1 |
| 19 | Directory Selection & Launch Action | Filterable directory grid with DR rating badges, category filters, and 1-click batch enqueue action | M4 | ORIGINAL_REQUEST §R1 |
| 20 | Real-Time Live Status Matrix | Live dashboard grid/table with animated status pills, live progress bar, listing URLs, proof lightbox modal | M4 | ORIGINAL_REQUEST §R1 |
| 21 | Supabase Authentication | Google OAuth + Email magic link/password, session persistence, user profile header, submission history | M4 | ORIGINAL_REQUEST §R1 |
| 22 | Tier 1 Unit & Store Tests | Sub-10ms static extractor tests and Angular Signal store unit test suite | M5 | ORIGINAL_REQUEST §Verification |
| 23 | Tier 2 Directory Sandbox Tests | Mock sandbox server testing all 5+ directory submitter adapters without hitting production sites | M5 | ORIGINAL_REQUEST §Verification |
| 24 | Tier 3 Concurrency Stress Test | Load/stress test simulating 10+ concurrent SaaS submissions across 50+ directory jobs | M5 | ORIGINAL_REQUEST §Verification |
| 25 | Tier 4 End-to-End Playwright Tests | Opaque-box E2E test covering Auth -> URL Input -> Metadata Extraction -> Directory Selection -> Queue -> Live Matrix | M5 | ORIGINAL_REQUEST §Verification |
| 26 | Tier 5 Adversarial Coverage Hardening | White-box coverage audit and stress tests for edge cases, network drops, and malformed inputs | M5 | Project Pattern §Phase 2 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Architecture & Core Data Layer | Supabase Postgres schema DDL, RLS policies, Realtime config, TypeScript DB types, Supabase client | None | IN_PROGRESS |
| M2 | Backend API & Metadata Scraper / Enrichment Service | REST/SSE API, Metadata scraper (Cheerio + JSON-LD), Copy generation engine, Directory Registry service, Seed data | M1 | PLANNED |
| M3 | Queue Pipeline & 5+ Directory Submitter Adapters | BullMQ/In-Memory queue runner, DirectorySubmitter interface, 5 distinct adapters (Uneed, SaaSHub, AlternativeTo, Taaft, Toolify), CAPTCHA detection, Screenshot proof capture | M1, M2 | PLANNED |
| M4 | Angular 19 Standalone Glassmorphic Frontend | Standalone components, Signals stores, Tailwind glassmorphic UI, Hero URL bar, Review modal, Directory selector, Live real-time matrix, Supabase Auth | M1, M2, M3 | PLANNED |
| M5 | E2E Testing Suite & Adversarial Hardening | 4-Tier verification suite (Unit, Sandbox adapters, 10+ concurrency stress test, Playwright E2E), TEST_READY.md, Tier 5 Adversarial Hardening | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Backend API ↔ Frontend / Workers

```typescript
// Shared Types
export interface ScrapedMetadata {
  url: string;
  title: string;
  tagline: string;
  descriptionShort: string;      // 80 chars
  descriptionMedium: string;     // 250 chars
  descriptionLong: string;       // 500+ chars
  category: string;
  tags: string[];
  pricingModel: 'free' | 'freemium' | 'paid' | 'subscription' | 'open_source';
  logoUrl?: string;
  faviconUrl?: string;
  heroImageUrl?: string;
  screenshotUrls: string[];
  extractedAt: string;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  description_short?: string;
  description_long?: string;
  category: string;
  tags: string[];
  pricing_model: string;
  logo_url?: string;
  screenshot_urls?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DirectoryRecord {
  id: string;
  name: string;
  url: string;
  category: string;
  domain_rating: number;
  submission_type: 'form_automation' | 'direct_api' | 'assisted';
  is_active: boolean;
  requires_auth: boolean;
  config: Record<string, any>;
}

export type SubmissionStatus = 
  | 'queued' 
  | 'in_progress' 
  | 'published' 
  | 'action_required' 
  | 'failed' 
  | 'cancelled';

export interface SubmissionRecord {
  id: string;
  project_id: string;
  directory_id: string;
  status: SubmissionStatus;
  result_url?: string;
  proof_screenshot_url?: string;
  error_message?: string;
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>;
  action_required_payload?: {
    type: 'captcha' | '2fa_code' | 'email_verification' | 'manual_review';
    prompt?: string;
    captcha_type?: 'turnstile' | 'recaptcha' | 'hcaptcha';
  };
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
```

### Directory Submitter Adapter Contract

```typescript
export interface DirectorySubmitter {
  readonly id: string;
  readonly name: string;
  readonly submissionType: 'form_automation' | 'direct_api' | 'assisted';
  
  validateProject(project: ProjectRecord): { valid: boolean; missingFields: string[] };
  submit(payload: SubmissionJobPayload, context: SubmissionExecutionContext): Promise<SubmissionResult>;
}

export interface SubmissionJobPayload {
  submissionId: string;
  projectId: string;
  directoryId: string;
  project: ProjectRecord;
  directory: DirectoryRecord;
}

export interface SubmissionExecutionContext {
  log: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>;
  updateStatus: (status: SubmissionStatus, partial?: Partial<SubmissionRecord>) => Promise<void>;
  signalIntervention: (payload: NonNullable<SubmissionRecord['action_required_payload']>) => Promise<void>;
  captureProof: (screenshotBuffer: Buffer | string) => Promise<string>; // returns proof URL
}

export interface SubmissionResult {
  success: boolean;
  status: SubmissionStatus;
  resultUrl?: string;
  proofScreenshotUrl?: string;
  errorMessage?: string;
}
```

## Code Layout

```
saas-directory-autopublisher/
├── .agents/                        # Agent metadata & reports (no code)
├── packages/
│   ├── shared/                     # Shared TypeScript interfaces, types, constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/              # DB, API, Scraper, Submitter interfaces
│   │       └── constants/          # Directories catalog, status enums
│   ├── backend/                    # Node.js + TypeScript API & Scraper Service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── api/                # REST Controllers, Routes, Middleware
│   │       ├── scraper/            # Cheerio + JSON-LD Scraper & Copy Generator
│   │       ├── registry/           # Directory Catalog Registry
│   │       ├── db/                 # Supabase client & repository layer
│   │       ├── realtime/           # WebSocket & SSE broadcast engine
│   │       └── server.ts           # Fastify/Express Server entry point
│   ├── worker/                     # Asynchronous Queue Pipeline & Submitter Adapters
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── queue/              # BullMQ / In-Memory Queue Service
│   │       ├── adapters/           # Pluggable Directory Submitter Adapters
│   │       │   ├── base.adapter.ts
│   │       │   ├── uneed.adapter.ts
│   │       │   ├── saashub.adapter.ts
│   │       │   ├── alternativeto.adapter.ts
│   │       │   ├── taaft.adapter.ts
│   │       │   └── toolify-http.adapter.ts
│   │       ├── captcha/            # Captcha & 2FA detector
│   │       ├── proof/              # Proof screenshot capture & upload
│   │       └── worker.ts           # Worker process entry point
│   └── frontend/                   # Angular 19+ Standalone Application
│       ├── package.json
│       ├── angular.json
│       ├── tailwind.config.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/           # Supabase client, API services, guards
│       │   │   ├── state/          # Signals Stores (Auth, Project, Submission)
│       │   │   ├── components/     # Standalone Glassmorphic UI Components
│       │   │   │   ├── hero-url-bar/
│       │   │   │   ├── metadata-modal/
│       │   │   │   ├── directory-selector/
│       │   │   │   ├── submission-matrix/
│       │   │   │   └── proof-modal/
│       │   │   ├── pages/          # Home, Dashboard, History, Auth
│       │   │   └── app.component.ts
│       │   ├── index.html
│       │   └── main.ts
├── supabase/                       # Supabase Postgres Migrations & Config
│   ├── migrations/
│   │   └── 20260823000000_init_schema.sql
│   └── seed.sql
├── tests/                          # Comprehensive Verification Test Suite
│   ├── unit/                       # Scraper & Signal store unit tests
│   ├── sandbox/                    # Directory Adapter Mock Server & Tests
│   ├── stress/                     # 10+ Queue Concurrency Stress Test
│   └── e2e/                        # Playwright E2E Test Suite
├── .env.example
├── package.json                    # Monorepo root workspace config
├── tsconfig.base.json
└── README.md
```
