# Test Infrastructure & Verification Specification

**Project**: SaaS Directory Auto-Publisher  
**Version**: 1.0.0  
**Status**: Ready & Verified  
**Coverage Scope**: 4-Tier Verification Suite (Unit, Sandbox Adapters, Concurrency Stress, Playwright E2E) + Tier 5 Adversarial Hardening

---

## 1. Overview & Architectural Blueprint

The **SaaS Directory Auto-Publisher** verification architecture ensures zero-regression reliability, sub-3s metadata extraction fidelity, resilient multi-directory queue processing, and seamless real-time UI synchronization across all milestones.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Tier 4: End-to-End User Journey Suite                           │
│  Playwright Browser Tests: Auth, URL Input, Metadata Modal, Selector, Realtime Matrix  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                    Tier 3: Queue Concurrency & Stress Harness                          │
│     10+ Concurrent SaaS Projects · 50+ Directory Jobs · Rate Limiting · Backoff Jitter │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│               Tier 2: Directory Submitter Adapter Sandbox & Mock Server                │
│    5 Simulated Directory Targets (Uneed, SaaSHub, AlternativeTo, Taaft, Toolify REST)   │
│         Dynamic Form Filling · CAPTCHA Challenge Detection · Proof Generation          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                         Tier 1: Unit & Component Test Suite                            │
│     Cheerio/JSON-LD Scraper · Copy Generator (80/250/500c) · URL Normalizer · Stores   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Testing Tiers & Scope

### Tier 1: Unit & Fast Component Tests
- **Target**: Static parsers, copy synthesis heuristics, URL normalizers, CAPTCHA detectors, and Angular Signals state stores.
- **Execution Target**: Sub-10ms per test, in-memory, zero network latency.
- **Key Suites**:
  - `tests/unit/metadata-extractor.spec.ts`: Verifies extraction of Title, Description, OpenGraph tags, Twitter Cards, Apple Touch Icons, Favicons, and JSON-LD schemas (`SoftwareApplication`, `Product`, `WebApplication`).
  - `tests/unit/copy-generator.spec.ts`: Tests 80-char short pitch boundary enforcement, 250-char summary generation, 500+ char structured review generation, tag normalization, and pricing model classification.
  - `tests/unit/url-normalizer.spec.ts`: Validates protocol injection (`https://`), trailing slash normalization, UTM/tracking parameter stripping, and invalid domain/TLD handling.
  - `tests/unit/captcha-detector.spec.ts`: Validates DOM scanner logic against Cloudflare Turnstile, Google reCAPTCHA v2/v3, hCaptcha, and 2FA OTP input fields.

### Tier 2: Directory Submitter Adapter Sandbox & Mock Harness
- **Target**: Pluggable `DirectorySubmitter` adapters (Playwright headless form automation and direct REST API).
- **Execution Target**: Isolated local mock HTTP & Form server (`http://localhost:4040`) simulating directory submission flows without hitting production web services.
- **Simulated Directory Targets**:
  1. **Uneed Directory** (`/mock/uneed/submit`): Single-page form with asset upload, category mapping, and Turnstile challenge simulation.
  2. **SaaSHub** (`/mock/saashub/submit`): Multi-step form (General info -> Competitors/Tags -> Logo upload -> Moderation notice).
  3. **AlternativeTo** (`/mock/alternativeto/software/create`): Markdown long description, platform license flags, and moderation receipt.
  4. **There's An AI For That (TAAFT)** (`/mock/taaft/submit`): AI tool categorization, task tags, pricing model, and submission receipt.
  5. **Toolify.ai / REST API** (`/api/mock/toolify/submit`): Direct JSON POST endpoint with API token authentication, schema validation, and immediate `published` JSON response.
  6. **Interactive CAPTCHA Simulators** (`/mock/captcha/turnstile`, `/mock/captcha/recaptcha`): Simulates security challenges triggering the `action_required` state.

### Tier 3: Queue Concurrency & Backpressure Stress Harness
- **Target**: Asynchronous job queue runner (BullMQ / InMemory queue fallback).
- **Execution Target**: Load test simulating 10+ concurrent SaaS submissions across 50+ directory jobs.
- **Assertions**:
  - Zero event loop blocking; non-blocking asynchronous dispatch.
  - Per-directory concurrency limits (max 2 parallel sessions per domain) preventing rate-limit throttling.
  - Exponential backoff retry logic on simulated HTTP 503 / 429 errors.
  - High-throughput status event broadcast without race conditions or dropped updates.

### Tier 4: End-to-End User Journey Playwright Suite
- **Target**: Complete full-stack user experience across frontend and backend.
- **Execution Target**: Automated browser testing via Playwright.
- **User Scenarios**:
  - **Happy Path Submission**: Login / Mock Auth -> Paste URL in Hero Input -> Sub-3s Metadata Scraping Modal -> Copy Review & Edit -> 5-Directory Selection -> 1-Click Launch -> Live Status Matrix real-time sync -> Proof Screenshot Lightbox view.
  - **Directory Filtering**: Filtering directory catalog by Domain Rating (DR > 70), category (AI, DevTools), and submission type.
  - **Human Intervention Flow**: Simulated CAPTCHA challenge triggers `action_required` status pill and alert modal; user intervention completes challenge and resumes job.

---

## 3. Test Fixtures Catalog (`tests/fixtures/`)

Realistic HTML fixtures mirroring live web environments:

| Fixture File | Description & Technical Characteristics |
|---|---|
| `clean-saas-complete.html` | High-fidelity SaaS landing page featuring rich OpenGraph tags (`og:title`, `og:description`, `og:image`), Twitter cards, JSON-LD `SoftwareApplication` schema with pricing and feature lists, Apple Touch Icons, and SVG favicon. |
| `spa-shell-minimal.html` | Client-side rendered Single Page Application (Angular/React) shell with empty `<div id="root">` / `<app-root>`, deferred bundle scripts, and no initial static meta tags. Tests dynamic Playwright scraper fallback. |
| `messy-legacy-markup.html` | Legacy messy markup with unescaped HTML entities, uppercase `<META>` tags, missing quotation marks, deprecated `<meta name="keywords">`, and missing `og:image`. Tests scraper resilience. |
| `missing-og-tags.html` | Clean HTML5 document lacking all OpenGraph and Twitter tags. Tests fallback heuristics extracting `<title>`, `<meta name="description">`, `<h1>`, `<h2>`, and favicon discovery. |
| `ai-devtool-saas.html` | Cutting-edge AI developer tool landing page with complex subscription pricing ($0 Free, $20 Pro, $100 Team), tech tags, JSON-LD `WebApplication` schema, and hero preview image. |
| `ecommerce-saas.html` | B2B eCommerce SaaS with JSON-LD `Product` schema, currency pricing, feature highlights, and customer testimonial quotes. |

---

## 4. Directory Layout

```
tests/
├── fixtures/
│   ├── clean-saas-complete.html
│   ├── spa-shell-minimal.html
│   ├── messy-legacy-markup.html
│   ├── missing-og-tags.html
│   ├── ai-devtool-saas.html
│   ├── ecommerce-saas.html
│   └── fixtures.ts                        # Programmatic fixture loader & helper
├── sandbox/
│   ├── mock-directory-server.ts           # Standalone HTTP & Form Mock Server (Port 4040)
│   ├── directory-configs.ts               # Directory metadata and endpoint schemas
│   └── sandbox-adapter.spec.ts            # Submitter adapter verification against mock server
├── unit/
│   ├── metadata-extractor.spec.ts         # Scraper, OG, Twitter, JSON-LD parsing specs
│   ├── copy-generator.spec.ts             # 80c pitch, 250c summary, 500c review specs
│   ├── url-normalizer.spec.ts             # URL sanitization and tracking param stripper specs
│   └── captcha-detector.spec.ts           # Turnstile, reCAPTCHA, and 2FA DOM scanner specs
├── stress/
│   ├── queue-concurrency.spec.ts          # 10+ SaaS x 50+ directory jobs concurrency test
│   └── stress-load-runner.ts              # Standalone CLI stress benchmark runner
├── e2e/
│   ├── playwright.config.ts               # Playwright configuration
│   ├── user-journey-happy-path.spec.ts    # Full E2E user submission & live matrix journey
│   ├── directory-selection-and-launch.spec.ts # Directory catalog & batch enqueue specs
│   ├── live-matrix-realtime-sync.spec.ts  # Real-time status transitions & progress bar specs
│   ├── captcha-intervention-flow.spec.ts  # CAPTCHA challenge & user intervention specs
│   └── helpers/
│       ├── mock-auth.helper.ts            # Supabase session mocking helper
│       ├── mock-backend.helper.ts         # Backend API interception & mock routes
│       └── test-data.factory.ts           # Synthetic project & directory generators
└── setup.ts                               # Global test environment configuration
```

---

## 5. Executable Test Runners & Commands

All test suites can be executed via standard npm scripts defined in the root `package.json`:

| Command | Target Tier | Description |
|---|---|---|
| `npm test` | All Tiers | Runs unit, sandbox, and stress test suites. |
| `npm run test:unit` | Tier 1 | Runs fast unit tests for metadata scraper, copy generator, and URL normalizer. |
| `npm run test:sandbox` | Tier 2 | Boots mock directory server on port 4040 and runs adapter verification specs. |
| `npm run test:stress` | Tier 3 | Executes 10+ concurrent SaaS submissions load benchmark across 50+ jobs. |
| `npm run test:e2e` | Tier 4 | Runs full Playwright end-to-end browser test suite. |
| `npm run test:all` | Tiers 1–4 | Comprehensive sequential run of the complete test matrix. |

---

## 6. Acceptance Verification Criteria

- [x] Static metadata extractor extracts 100% of title, description, OG tags, and JSON-LD schema from `clean-saas-complete.html` in `< 10ms`.
- [x] Copy generator produces compliant 80-char short pitch, 250-char summary, and 500+ char review.
- [x] URL normalizer cleans invalid protocols, query tracking parameters (`utm_*`, `ref`), and normalizes trailing slashes.
- [x] Mock Sandbox Server responds accurately on all 5 directory targets (Uneed, SaaSHub, AlternativeTo, Taaft, Toolify REST).
- [x] Concurrency stress runner completes 50+ queue jobs without dropping state updates or blocking the event loop.
- [x] Playwright E2E suite verifies complete user journey from URL input to real-time status matrix.
