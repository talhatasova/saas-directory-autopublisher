# Backend & Automation Architecture Report: SaaS Directory Auto-Publisher

**Author**: Backend & Automation Architect (`teamwork_preview_explorer_1`)  
**Date**: 2026-08-23  
**Status**: Completed  
**Target Systems**: Node.js 20+ / TypeScript, Supabase (Postgres, Auth, Storage, Realtime), BullMQ + Redis (with In-Memory Fallback), Playwright Automation Engine.

---

## Table of Contents
1. [Executive Summary & Architectural Blueprint](#1-executive-summary--architectural-blueprint)
2. [Backend Framework & Modular API Architecture](#2-backend-framework--modular-api-architecture)
3. [Scraper & Metadata Enrichment Engine](#3-scraper--metadata-enrichment-engine)
4. [Queue-Based Asynchronous Worker Pipeline](#4-queue-based-asynchronous-worker-pipeline)
5. [Pluggable Directory Submitter Adapter System](#5-pluggable-directory-submitter-adapter-system)
6. [5 Distinct Directory Submitter Adapters Specification](#6-5-distinct-directory-submitter-adapters-specification)
7. [CAPTCHA/2FA Detection, Intervention Protocol & Proof Capture](#7-captcha2fa-detection-intervention-protocol--proof-capture)
8. [Error Handling, Retry Policies & Observability](#8-error-handling-retry-policies--observability)
9. [Supabase Schema Contract & API Endpoints](#9-supabase-schema-contract--api-endpoints)
10. [Implementation Roadmap & Verification Strategy](#10-implementation-roadmap--verification-strategy)

---

## 1. Executive Summary & Architectural Blueprint

The **SaaS Directory Auto-Publisher** backend is engineered as a high-throughput, resilient, and extensible micro-service architecture capable of:
1. Extracting rich metadata from arbitrary SaaS landing pages in `< 3.0 seconds` using a dual-tier scraping engine (Cheerio static extraction + Playwright dynamic fallback).
2. Synthesizing directory-optimized copy (80-char short pitch, 250-char summary, 500+ char review, keywords, categories, and pricing model).
3. Managing distributed job queues via BullMQ backed by Redis with a seamless in-memory fallback for zero-dependency local testing.
4. Executing multi-directory automated publishing via a pluggable `DirectorySubmitter` adapter interface supporting both headless Playwright browser automation and direct REST/Webhook APIs.
5. Emitting real-time progress events via Server-Sent Events (SSE) / WebSockets and Supabase Realtime CDC.
6. Safeguarding submissions with automated CAPTCHA/2FA detection, interactive human-in-the-loop intervention signals, and tamper-proof screenshot proof capture.

```
 +---------------------------------------------------------------------------------------+
 |                                  Angular 19+ Client                                   |
 +-------------------+-----------------------------------------------+-------------------+
                     | HTTP REST / SSE                               | Supabase Realtime
                     v                                               v
 +---------------------------------------------------------------------------------------+
 |                           Backend API Gateway (Fastify/Express)                       |
 |  - Auth Middleware (Supabase JWT)           - Scraper Route (/api/scrape)              |
 |  - Project Management (/api/projects)       - Submission Dispatcher (/api/submissions) |
 |  - Directory Registry (/api/directories)    - Real-Time Event Stream (/api/events/:id) |
 +-------------------+-----------------------------------------------+-------------------+
                     |                                               |
        +------------+------------+                     +------------+------------+
        |                         |                     |                         |
        v                         v                     v                         v
+---------------+         +---------------+     +---------------+         +---------------+
| Static Scraper|         | Dynamic SPA   |     | BullMQ Redis  |         | Memory Queue  |
|  (Cheerio/OG) |         |  (Playwright) |     |  (Production) |         |  (Dev/Tests)  |
+---------------+         +---------------+     +-------+-------+         +-------+-------+
        |                         |                     |                         |
        +------------+------------+                     +------------+------------+
                     v                                               v
        +-------------------------+                     +-------------------------+
        | Copy Generation Engine  |                     | Queue Worker Processor  |
        |  (Rule-based / AI-LLM)  |                     | (Concurrency & Jitter)  |
        +-------------------------+                     +------------+------------+
                                                                     |
                     +-----------------------------------------------+-------------------+
                     |                                                                   |
                     v                                                                   v
     +--------------------------------+                                 +--------------------------------+
     | Playwright Headless Adapters   |                                 | Direct HTTP / REST Adapters    |
     | - Uneed Submitter              |                                 | - Toolify API Submitter        |
     | - SaaSHub Submitter            |                                 | - Webhook Directory Submitter  |
     | - AlternativeTo Submitter      |                                 +--------------------------------+
     | - There's An AI For That       |
     +---------------+----------------+
                     |
                     v
     +--------------------------------+
     | Proof Capture & CAPTCHA Alerts |
     | - Supabase Storage (Screenshots)
     | - Action Required Intervention |
     +--------------------------------+
```

---

## 2. Backend Framework & Modular API Architecture

### 2.1 Framework Selection: Fastify with TypeScript
- **Selected Engine**: **Fastify** (or Express with TypeScript strict mode). Fastify is selected for its low overhead (2-3x faster JSON serialization than Express), built-in schema validation via TypeBox/Zod, native HTTP/2 support, and robust plugin encapsulation.
- **TypeScript Configuration**: Strict mode enabled (`"strict": true`, `"noImplicitAny": true`, `"exactOptionalPropertyTypes": true`).

### 2.2 Modular Codebase Structure
```
backend/
├── src/
│   ├── api/                           # API Layer (Controllers & Routes)
│   │   ├── controllers/
│   │   │   ├── scraper.controller.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── directory.controller.ts
│   │   │   ├── submission.controller.ts
│   │   │   └── sse.controller.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # Supabase JWT validator
│   │   │   ├── rate-limit.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   └── v1/
│   │   └── schemas/                   # Zod/TypeBox Request/Response Schemas
│   │       ├── project.schema.ts
│   │       └── submission.schema.ts
│   ├── services/                      # Domain Business Logic
│   │   ├── scraper/
│   │   │   ├── static-extractor.ts    # Cheerio / OG / JSON-LD parser
│   │   │   ├── dynamic-extractor.ts   # Playwright fallback & screenshot
│   │   │   ├── icon-resolver.ts       # High-res favicon/logo finder
│   │   │   ├── copy-generator.ts      # Multi-length pitch synthesizer
│   │   │   └── scraper.service.ts
│   │   ├── queue/
│   │   │   ├── queue.interface.ts     # IQueueService abstraction
│   │   │   ├── bullmq-queue.ts        # Redis-backed BullMQ implementation
│   │   │   ├── memory-queue.ts        # In-memory EventEmitter fallback
│   │   │   └── queue.factory.ts
│   │   ├── directory/
│   │   │   ├── registry.service.ts    # Catalog of all registered directories
│   │   │   └── directory.service.ts
│   │   └── storage/
│   │       └── supabase-storage.ts    # Asset & screenshot uploader
│   ├── adapters/                      # Pluggable Directory Adapters
│   │   ├── base/
│   │   │   ├── directory-submitter.interface.ts
│   │   │   ├── playwright-submitter.base.ts
│   │   │   └── http-submitter.base.ts
│   │   ├── uneed/
│   │   │   └── uneed.adapter.ts
│   │   ├── saashub/
│   │   │   └── saashub.adapter.ts
│   │   ├── alternativeto/
│   │   │   └── alternativeto.adapter.ts
│   │   ├── taaft/
│   │   │   └── taaft.adapter.ts
│   │   └── toolify/
│   │       └── toolify.adapter.ts
│   ├── workers/                       # Background Job Processors
│   │   ├── submission.worker.ts       # Execution loop, jitter, retry logic
│   │   └── worker.manager.ts
│   ├── config/
│   │   ├── env.ts                     # Validated environment configuration
│   │   └── supabase.ts                # Supabase Admin/Anon Clients
│   ├── utils/
│   │   ├── logger.ts                  # Pino structured logger
│   │   ├── retry.ts                   # Exponential backoff with jitter
│   │   └── captcha-detector.ts        # Turnstile / reCAPTCHA / hCaptcha scanner
│   └── index.ts                       # Application Entrypoint
├── tests/                             # Unit, Integration, and Mock Adapter Tests
│   ├── scraper/
│   ├── adapters/
│   ├── queue/
│   └── e2e/
├── tsconfig.json
└── package.json
```

### 2.3 Supabase Client Integration
The backend initializes two Supabase client instances:
1. **Public/User-Context Client**: Uses the incoming User JWT in headers (`Authorization: Bearer <token>`) to strictly enforce Postgres Row-Level Security (RLS) for data read/writes requested by the client.
2. **Service Role Admin Client**: Uses `SUPABASE_SERVICE_ROLE_KEY` exclusively for trusted worker operations (updating submission statuses, capturing system logs, uploading proof screenshots to secured Supabase Storage buckets).

---

## 3. Scraper & Metadata Enrichment Engine

### 3.1 Dual-Tier Scraping Architecture
To meet the acceptance criterion of **sub-3.0 second extraction**, the engine uses a tiered execution pattern:

```
 Incoming SaaS URL
        │
        ▼
 [ Tier 1: Static Fast Fetch (<500ms) ] ─────────► [ Status 200 & Has OG Meta? ]
        │                                                    │
     (Failed / SPA Empty / Timeout)                          ├─── YES ──► [ Complete Enrichment ]
        │                                                    │
        ▼                                                    └─── NO  ──► [ Trigger Tier 2 ]
 [ Tier 2: Dynamic Playwright Headless (<2.0s) ]
        │
        ├── Render DOM with JS Evaluation
        ├── Extract Hydrated Content & Schema
        └── Capture Hero & Viewport Screenshot
```

#### Tier 1: Fast Static Extractor (`Cheerio` + `Axios`/`undici`)
- Performs an HTTP `GET` with standard browser user-agent and accept headers.
- Parses HTML using `cheerio`.
- Extracts:
  - **OpenGraph Metadata**: `og:title`, `og:description`, `og:image`, `og:image:secure_url`, `og:site_name`, `og:type`, `og:url`.
  - **Twitter Card Metadata**: `twitter:title`, `twitter:description`, `twitter:image`, `twitter:card`, `twitter:creator`.
  - **Standard Meta & HTML tags**: `<title>`, `<meta name="description">`, `<meta name="keywords">`, `<meta name="author">`, `<link rel="canonical">`.
  - **JSON-LD Schema Markup**: Evaluates all `<script type="application/ld+json">` tags to extract `SoftwareApplication`, `WebApplication`, `Product`, and `Organization` entities (including `applicationCategory`, `offers.price`, `aggregateRating`, `featureList`).

#### Tier 2: Playwright Dynamic Fallback
- Activated if:
  1. Static HTML contains fewer than 100 characters of text (typical for empty SPA shells like React `#root` or Angular `app-root`).
  2. No valid title or description is present in metadata.
  3. Explicit high-resolution screenshot of the live viewport is requested.
- Playwright launches a lightweight Chromium context with resource-blocking (blocks video/font bloat for speed, permits images and stylesheets), waits for `'domcontentloaded'`, queries the DOM, and captures a clean 1280x800 desktop hero screenshot.

### 3.2 Icon & Logo High-Resolution Resolver
The `IconResolver` checks multiple candidates in order of quality:
1. OpenGraph/Twitter Image (`og:image` / `twitter:image`).
2. High-res Apple Touch Icons (`<link rel="apple-touch-icon" sizes="180x180">`).
3. Standard SVG / PNG favicons (`<link rel="icon" type="image/svg+xml">` or `sizes="32x32"`).
4. Root fallback: `https://<domain>/favicon.ico` and Google Favicon V2 API (`https://www.google.com/s2/favicons?domain=<domain>&sz=256`).
5. Validates image accessibility via `HEAD`/`GET` probe and caches the asset.

### 3.3 Multi-Length Copy Generator & Tag Synthesizer
Directories enforce strict character limits and formatting rules. The copy generation engine produces normalized text variants using rule-based algorithmic heuristics (with an optional AI/LLM fallback):

| Field | Length / Target | Purpose & Directory Mapping |
|---|---|---|
| **Short Pitch** | Max 80 chars | Hero tagline for directories like ProductHunt, Uneed, Toolify |
| **Summary** | Max 250 chars | Search preview card description for SaaSHub, AlternativeTo |
| **Detailed Review** | 500 – 1,000 chars | Comprehensive product narrative, features, problem/solution, audience |
| **Category** | Canonical Slug | Standardized taxonomy (e.g. `ai-tools`, `developer-tools`, `productivity`) |
| **Tags / Keywords** | 5 – 10 tags | Normalized lower-case tags (e.g. `["saas", "ai", "automation", "no-code"]`) |
| **Pricing Model** | Enum | `'free' \| 'freemium' \| 'free_trial' \| 'paid' \| 'open_source'` |

#### Algorithmic Heuristic Synthesis Rules:
1. **Pitch**: Cleans tagline of marketing buzzwords (e.g., strips "The #1 platform for...", "Welcome to..."), extracts the primary verb and benefit, and truncates cleanly at word boundaries with an ellipsis if `> 80 chars`.
2. **Detailed Review**: Assembles a structured 4-paragraph review:
   - *Paragraph 1*: Problem statement & core value proposition.
   - *Paragraph 2*: Key functional capabilities and architecture.
   - *Paragraph 3*: Ideal customer profile / target users.
   - *Paragraph 4*: Pricing model and getting started guidance.

---

## 4. Queue-Based Asynchronous Worker Pipeline

### 4.1 Hybrid Queue Architecture (`BullMQ` + `InMemoryFallback`)
To provide enterprise scalability in production while ensuring instantaneous out-of-the-box local developer experience and unit test execution without mandatory external Redis instances, we specify an `IQueueService` contract:

```typescript
export interface EnqueueOptions {
  jobId?: string;
  delayMs?: number;
  priority?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface IQueueService {
  enqueue<T>(queueName: string, data: T, options?: EnqueueOptions): Promise<string>;
  process<T, R>(queueName: string, concurrency: number, handler: (data: T, jobId: string) => Promise<R>): void;
  getJobStatus(queueName: string, jobId: string): Promise<'queued' | 'active' | 'completed' | 'failed' | 'unknown'>;
  close(): Promise<void>;
}
```

```
                     ┌─────────────────────────────┐
                     │     QueueFactory.create()   │
                     └──────────────┬──────────────┘
                                    │
                     Is REDIS_URL configured & reachable?
                                    │
                    ┌───────────────┴───────────────┐
                    │ YES                           │ NO (or test env)
                    ▼                               ▼
       ┌─────────────────────────┐     ┌─────────────────────────┐
       │   BullMQQueueService    │     │   MemoryQueueService    │
       │   - Redis / Dragonfly   │     │   - EventEmitter Async  │
       │   - Distributed Workers │     │   - In-Process Jitter   │
       │   - Dead Letter Queues  │     │   - 100% Mock Safe      │
       └─────────────────────────┘     └─────────────────────────┘
```

### 4.2 Queue Worker Execution Lifecycle
Each directory submission job follows a state machine:

```
 [ SUBMIT_REQUESTED ]
          │
          ▼
   [ QUEUED ] (Job added to BullMQ/Memory queue with unique key: `${projectId}:${directoryId}`)
          │
          ▼
 [ IN_PROGRESS ] ──► (Worker picks up job, initial log recorded, status emitted via SSE/Supabase)
          │
          ├── Pre-flight check (Validation, target directory health)
          ├── Execute DirectorySubmitter.submit(context)
          │     ├── Playwright Headless Navigation / API POST
          │     ├── Form Field Fill & Asset Upload
          │     ├── CAPTCHA / 2FA Scan
          │     │     └── If Detected: Status -> [ ACTION_REQUIRED ] (Pause & notify user)
          │     ├── Submit Form / Commit Request
          │     └── Capture Proof Screenshot & Extract Direct Listing URL
          │
          ├── Success ──► Status: [ PUBLISHED ] (Save proof_screenshot_url, result_url)
          │
          └── Error / Timeout ──►
                ├── Is Transient? ──► Retry with Exponential Backoff (Attempt N+1)
                └── Exceeded Max Retries ──► Status: [ FAILED ] (Record error_message, stack trace)
```

### 4.3 Concurrency Control & Anti-Ban Rate Limiting
- **Global Concurrency**: Configurable (default: 5 concurrent workers per worker process).
- **Per-Directory Domain Rate-Limiting**: Enforces minimum delay between submissions to the same domain (e.g., minimum 5.0 seconds between submissions to `saashub.com`) to prevent rate-limit throttling and Cloudflare IP blocks.
- **Typing Jitter**: Playwright automation simulates natural human typing speeds (randomized 30ms–90ms delay per keystroke) and random mouse movements between input fields.

---

## 5. Pluggable Directory Submitter Adapter System

### 5.1 The `DirectorySubmitter` Core Interface
All directory adapters implement a strict, lifecycle-driven TypeScript interface:

```typescript
export interface DirectoryFieldRequirement {
  name: string;
  type: 'text' | 'textarea' | 'url' | 'select' | 'file' | 'tags';
  required: boolean;
  maxLength?: number;
  options?: string[];
}

export interface SaaSProjectData {
  id: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  reviewText?: string;
  category: string;
  pricingModel: 'free' | 'freemium' | 'free_trial' | 'paid' | 'open_source';
  logoUrl?: string;
  logoBuffer?: Buffer;
  screenshotUrl?: string;
  tags: string[];
  contactEmail: string;
}

export interface SubmissionContext {
  submissionId: string;
  project: SaaSProjectData;
  config: Record<string, unknown>;
  logger: SubmitterLogger;
  signalIntervention: (challengeType: 'captcha' | '2fa' | 'email_verify', metadata: Record<string, unknown>) => Promise<void>;
  captureProof: (screenshotBuffer: Buffer) => Promise<string>;
}

export interface SubmissionResult {
  success: boolean;
  status: 'published' | 'action_required' | 'failed';
  resultUrl?: string;
  proofScreenshotUrl?: string;
  directoryListingId?: string;
  message?: string;
  error?: string;
  executionTimeMs: number;
}

export interface DirectorySubmitter {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly submissionType: 'playwright' | 'http_api' | 'assisted';
  readonly domainRating: number;
  readonly category: string;
  readonly requiredFields: DirectoryFieldRequirement[];

  validateProject(project: SaaSProjectData): { valid: boolean; errors: string[] };
  submit(ctx: SubmissionContext): Promise<SubmissionResult>;
}
```

---

## 6. 5 Distinct Directory Submitter Adapters Specification

### 6.1 Adapter 1: Uneed Directory Submitter (`UneedAdapter` — Playwright)
- **Directory**: [Uneed.best](https://www.uneed.best) (High-authority curated tool directory, DR 62)
- **Submission Type**: `playwright`
- **Target URL**: `https://www.uneed.best/submit`
- **Execution Flow**:
  1. Initialize stealth Chromium browser context with randomized viewport (`1366x768`).
  2. Navigate to `https://www.uneed.best/submit` with `networkidle` wait condition.
  3. Dismiss cookie consent banner (`button:has-text("Accept")`, `button:has-text("Got it")`).
  4. Fill input `#name` with `project.name`.
  5. Fill input `#url` with `project.url`.
  6. Fill input `#tagline` with `project.tagline` (validated `< 80 chars`).
  7. Fill textarea `#description` with `project.description` (`< 250 chars`).
  8. Select pricing model from dropdown `#pricing` (maps `freemium` -> `Freemium`, `free` -> `Free`, etc.).
  9. Select primary category from combobox `#category` (maps taxonomy).
  10. Upload logo asset using `page.setInputFiles('input[type="file"][accept*="image"]', project.logoPath)`.
  11. Fill tags in tag input `#tags` (adds top 3 tags).
  12. Check for Turnstile/CAPTCHA box. If detected, call `ctx.signalIntervention()`.
  13. Click submit button: `button[type="submit"]:has-text("Submit Product")`.
  14. Wait for confirmation container or URL redirection (`/tool/`, `/success`, or confirmation modal).
  15. Take proof screenshot, upload to Supabase Storage via `ctx.captureProof()`, and return result with listing URL.

### 6.2 Adapter 2: SaaSHub Submitter (`SaaSHubAdapter` — Playwright)
- **Directory**: [SaaSHub.com](https://www.saashub.com) (Software alternatives & directory, DR 78)
- **Submission Type**: `playwright`
- **Target URL**: `https://www.saashub.com/submit`
- **Execution Flow**:
  1. Navigate to SaaSHub submission form.
  2. Fill Step 1 (General Information):
     - Product Name: `input[name="service[name]"]`
     - Website URL: `input[name="service[website_url]"]`
     - Short Tagline: `input[name="service[short_description]"]`
     - Detailed Description: `textarea[name="service[description]"]` (`500+ chars`)
  3. Fill Step 2 (Classification & Competitors):
     - Category multi-select: match closest categories.
     - Competitor alternatives / tags: `input[name="service[alternatives]"]`.
     - License / Pricing Model dropdown.
  4. Upload high-res logo: `input[name="service[logo]"]`.
  5. Scan page for Google reCAPTCHA v2 / hCaptcha frame. If present, evaluate token or request manual pass.
  6. Submit form and parse verification notice: `"Your submission is under review"`.
  7. Capture viewport screenshot of the submission confirmation receipt.

### 6.3 Adapter 3: AlternativeTo Submitter (`AlternativeToAdapter` — Playwright)
- **Directory**: [AlternativeTo.net](https://alternativeto.net) (Global software crowdsourcing, DR 84)
- **Submission Type**: `playwright`
- **Target URL**: `https://alternativeto.net/software/create/`
- **Execution Flow**:
  1. Navigate to item creation page.
  2. Populate Title: `input[name="Name"]`.
  3. Populate Homepage: `input[name="Url"]`.
  4. Set License/Platform tags: Select Web / SaaS / Cloud.
  5. Fill Long Description in Markdown-supported textarea: `textarea[name="Description"]`.
  6. Upload Icon / Logo: `input[type="file"][id*="icon"]`.
  7. Upload Product Screenshots (if available): `input[type="file"][id*="screenshot"]`.
  8. Click `"Preview & Submit"`.
  9. Capture final confirmation card screenshot and extract pending moderation ticket URL.

### 6.4 Adapter 4: There's An AI For That Submitter (`TaaftAdapter` — Playwright)
- **Directory**: [TheresAnAIForThat.com](https://theresanaiforthat.com) (Premier AI aggregator, DR 74)
- **Submission Type**: `playwright`
- **Target URL**: `https://theresanaiforthat.com/submit/`
- **Execution Flow**:
  1. Navigate to TAAFT submission portal.
  2. Enter AI Tool Name: `input[name="tool_name"]`.
  3. Enter Target URL: `input[name="tool_url"]`.
  4. Describe the specific tasks the AI performs (maps `project.tags` and `project.tagline`).
  5. Select Pricing model (Free / Freemium / Paid / API Pricing).
  6. Set Launch Date / Status (Live / Beta).
  7. Upload Logo (PNG/JPG): `input[name="tool_logo"]`.
  8. Trigger submit action, detect confirmation dialogue, capture proof image.

### 6.5 Adapter 5: Toolify.ai / Webhook REST API Submitter (`ToolifyHttpAdapter` — HTTP/REST)
- **Directory**: [Toolify.ai](https://www.toolify.ai) / Direct Webhook Directory API (High-velocity AI directory, DR 71)
- **Submission Type**: `http_api`
- **API Endpoint**: `POST https://api.toolify.ai/v1/apps/submit` (or configured directory webhook endpoint)
- **Authentication**: Bearer API Token or Partner Signature (`X-Directory-Key`).
- **Payload Construction**:
  ```json
  {
    "app_name": "SaaS Pulse",
    "website_url": "https://saaspulse.io",
    "tagline": "Real-time revenue & analytics dashboard for indie founders",
    "description": "Comprehensive SaaS metric tracker featuring instant Stripe integration...",
    "category": "analytics",
    "pricing_type": "freemium",
    "logo_url": "https://qxakcsdaixzfttlcmnch.supabase.co/storage/v1/object/public/logos/saas-pulse.png",
    "tags": ["saas", "analytics", "stripe", "indie-hackers"],
    "submitter_email": "founder@saaspulse.io"
  }
  ```
- **Execution Flow**:
  1. Validate project fields against API schema.
  2. Ensure logo is hosted at an accessible public HTTPS URL (via Supabase Storage).
  3. Dispatch `fetch` / `axios` POST request with `timeout: 10000` and `Idempotency-Key` header.
  4. Parse JSON response:
     ```json
     {
       "success": true,
       "listing_id": "tool_982341",
       "status": "published",
       "listing_url": "https://www.toolify.ai/tool/saas-pulse",
       "created_at": "2026-08-23T18:00:00Z"
     }
     ```
  5. Generate synthetic digital proof badge / render confirmation receipt into buffer, store proof to Supabase Storage, and return `published` status with immediate direct listing URL.

---

## 7. CAPTCHA/2FA Detection, Intervention Protocol & Proof Capture

### 7.1 Automated CAPTCHA & Security Challenge Scanner
The `CaptchaDetector` operates inside the Playwright page execution context before and after form actions:

```typescript
export class CaptchaDetector {
  static async scan(page: Page): Promise<{ detected: boolean; type?: 'cloudflare_turnstile' | 'recaptcha' | 'hcaptcha' | '2fa_prompt' | 'email_otp' }> {
    // 1. Cloudflare Turnstile
    const turnstile = await page.$('iframe[src*="challenges.cloudflare.com"], .cf-turnstile');
    if (turnstile) return { detected: true, type: 'cloudflare_turnstile' };

    // 2. Google reCAPTCHA
    const recaptcha = await page.$('iframe[src*="google.com/recaptcha"], .g-recaptcha, #g-recaptcha-response');
    if (recaptcha) return { detected: true, type: 'recaptcha' };

    // 3. hCaptcha
    const hcaptcha = await page.$('iframe[src*="hcaptcha.com"], .h-captcha');
    if (hcaptcha) return { detected: true, type: 'hcaptcha' };

    // 4. 2FA / Verification code input
    const twoFactor = await page.$('input[name*="otp"], input[name*="code"], input[placeholder*="verification code" i]');
    if (twoFactor) return { detected: true, type: '2fa_prompt' };

    return { detected: false };
  }
}
```

### 7.2 Interactive Human-in-the-Loop Protocol
When a challenge is detected:
1. The worker marks the submission status as `action_required` in the database.
2. An event is dispatched over SSE / WebSockets to the client dashboard:
   ```json
   {
     "type": "INTERVENTION_REQUIRED",
     "submissionId": "sub_4091",
     "directoryName": "SaaSHub",
     "challengeType": "recaptcha",
     "message": "CAPTCHA challenge detected on SaaSHub submission. Please solve in the live modal or provide verification code."
   }
   ```
3. The job worker holds the browser context alive in a suspended state for up to 180 seconds, listening on an intervention channel.
4. Once solved by the user or solver hook, execution resumes automatically.

### 7.3 Screenshot Proof Capture & Supabase Storage
- At the conclusion of every submission (both success and action-required states), Playwright takes a full viewport screenshot (`1280x800` PNG).
- The screenshot buffer is uploaded via the Supabase Admin client to the `submission-proofs` bucket under `proofs/${projectId}/${directoryId}-${Date.now()}.png`.
- The public/signed CDN URL is written to `submissions.proof_screenshot_url` and sent to the client.

---

## 8. Error Handling, Retry Policies & Observability

### 8.1 Error Classification Matrix
Errors are partitioned into deterministic failure categories:

| Error Category | Examples | Retry Strategy | Final Status |
|---|---|---|---|
| **Transient Network Error** | Socket hang up, DNS resolution timeout, 502/503/504 Bad Gateway | Exponential backoff (3 attempts: 2s, 8s, 32s with random jitter) | If exhausted: `failed` |
| **Rate Limit / 429** | HTTP 429 Too Many Requests | Wait duration from `Retry-After` header or exponential delay | Retry |
| **Validation Error** | Missing required field, logo image rejected (wrong format/size) | **No retry** (fail immediately, record actionable error) | `failed` |
| **Security Challenge** | Cloudflare challenge, reCAPTCHA block | Halt and trigger `signalIntervention()` | `action_required` |
| **Selector Mismatch** | Target directory updated DOM structure | Retry once with generic fallback selectors | If failed: `failed` + alert |

### 8.2 Structured Logging with Pino
All logs include structured context:
```json
{
  "level": "info",
  "time": 1787508000000,
  "pid": 4210,
  "hostname": "worker-1",
  "traceId": "tr_991823ab",
  "submissionId": "sub_8819",
  "projectId": "proj_123",
  "directory": "uneed",
  "adapter": "UneedAdapter",
  "step": "fill_form",
  "msg": "Filled product fields successfully in 840ms"
}
```

---

## 9. Supabase Schema Contract & API Endpoints

### 9.1 Database Schema (PostgreSQL)

```sql
-- 1. Projects Table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  review_text TEXT,
  category VARCHAR(100) NOT NULL,
  pricing_model VARCHAR(50) NOT NULL DEFAULT 'freemium',
  logo_url TEXT,
  screenshot_url TEXT,
  tags TEXT[] DEFAULT '{}',
  contact_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Directories Registry Table
CREATE TABLE public.directories (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  submission_type VARCHAR(50) NOT NULL, -- 'playwright' | 'http_api' | 'assisted'
  domain_rating INTEGER NOT NULL DEFAULT 50,
  category VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Submissions Table (Jobs)
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  directory_id VARCHAR(100) NOT NULL REFERENCES public.directories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued' | 'in_progress' | 'published' | 'action_required' | 'failed'
  result_url TEXT,
  proof_screenshot_url TEXT,
  error_message TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_project_directory UNIQUE (project_id, directory_id)
);

-- 4. Row Level Security Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active directories" ON public.directories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage own submissions" ON public.submissions
  FOR ALL USING (auth.uid() = user_id);
```

### 9.2 RESTful API Endpoints Specification

| Method | Endpoint | Description | Request Body / Query |
|---|---|---|---|
| `POST` | `/api/v1/scrape` | Scrape & enrich SaaS metadata | `{ "url": "https://mysaas.com" }` |
| `GET` | `/api/v1/directories` | List available directory targets | `?category=all&status=active` |
| `POST` | `/api/v1/projects` | Create a new SaaS project | Project payload |
| `GET` | `/api/v1/projects/:id` | Get project details & submissions | None |
| `POST` | `/api/v1/submissions/batch` | Enqueue batch submissions | `{ "projectId": "uuid", "directoryIds": ["uneed", "saashub", "toolify"] }` |
| `GET` | `/api/v1/submissions/:id` | Get submission job status | None |
| `GET` | `/api/v1/events/:projectId` | Real-time SSE event stream | `text/event-stream` |
| `POST` | `/api/v1/submissions/:id/intervention` | Resolve CAPTCHA/2FA challenge | `{ "action": "continue", "token": "..." }` |

---

## 10. Implementation Roadmap & Verification Strategy

### 10.1 Key Implementation Deliverables for Backend Milestone
1. **Core Package & Dependencies**: Setup Fastify / Express, `@supabase/supabase-js`, `bullmq`, `playwright`, `cheerio`, `zod`, `pino`.
2. **Scraper & Synthesis Module**: Unit-tested with mock HTML pages and real SaaS targets (extracting title, OG image, JSON-LD in `< 3.0s`).
3. **Queue Service & Worker**: In-memory + BullMQ queue with retry and rate-limiting policies.
4. **5 Submitter Adapters**: Full test suite with sandbox Playwright browser and mock HTTP server verifying form fill, CAPTCHA detection, and proof upload.
5. **Supabase Schema & RLS**: Migration files ready for instant deployment.

### 10.2 Verification & Acceptance Matrix

```
  +-------------------------------------+-------------------------------------------------------+
  | Acceptance Requirement              | Verification Test Method                              |
  +-------------------------------------+-------------------------------------------------------+
  | Sub-3s Metadata Extraction          | Jest/Vitest benchmark across 10 diverse landing pages |
  | 5+ Pluggable Directory Adapters     | Vitest adapter suite mocking DOM & HTTP responses     |
  | Queue Concurrency & Backoff         | Load test dispatching 20 parallel submission jobs     |
  | Screenshot Proof & Supabase Storage | Automated test verifying image upload & signed URL    |
  | CAPTCHA Intervention Signal         | Simulated Turnstile DOM triggering Action Required    |
  +-------------------------------------+-------------------------------------------------------+
```

---
*Report concluded. Ready for milestone execution and team handoff.*
