# Original User Request

## 2026-08-23T17:56:55Z

<USER_REQUEST>
Build a full-stack SaaS Directory Auto-Publisher platform that allows indie hackers and SaaS founders to enter their product URL, automatically scrape and enrich product metadata (title, tagline, description, category, logo, screenshots), and asynchronously publish listings across top free SaaS directories and launch communities using a scalable job runner pipeline.

Working directory: c:/Users/tasov/Desktop/Projects/saas-directory-autopublisher
Integrity mode: development

## Infrastructure & Supabase Configuration
- Supabase Project Ref: qxakcsdaixzfttlcmnch
- Supabase URL: https://qxakcsdaixzfttlcmnch.supabase.co
- Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWtjc2RhaXh6ZnR0bGNtbmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDc3NTUsImV4cCI6MjEwMzA4Mzc1NX0.-ZrZQubMRtse3xJTIlP_a9wDI6Kf4rKfDlV_W5GS420
- Supabase Publishable Key: sb_publishable_zJgRu5FMM_TyKeCAmr44zw_ZrEY4zPu

## Requirements

### R1. Frontend Architecture & Design (Angular Standalone + Tailwind CSS)
- Build a responsive web application in latest Angular using standalone components, Angular Signals, and Tailwind CSS.
- Design theme inspired by high-end modern SaaS / Awwwards aesthetic (dark/light themes, sleek typography, micro-interactions, clean glassmorphic cards, human-crafted component feel via 21st.dev/Skiper UI/Vengeance UI style primitives).
- Core User Flows:
  1. Landing & Input Flow: Hero section with an interactive URL input bar.
  2. Metadata Review Modal / Step: Upon pasting a URL, automatically fetch & preview extracted metadata (Title, Tagline, Detailed Description, Category, Feature Highlights, Logo, Screenshot previews) allowing quick editing before launching.
  3. Launch Automation Action: One-click trigger to enqueue publishing jobs to selected directories.
  4. Live Dashboard & Status Matrix: Real-time table / grid showing each target directory (name, category, Domain Rating, status: Queued, In Progress, Published, Action Required, Failed), live progress bar, direct listing URL, and screenshot proof of submission.
  5. Authentication: Supabase Auth (Google OAuth + Email magic link/password) with user profile and submission history.

### R2. Backend API & Metadata Extraction Service (Node.js & TypeScript)
- Fast and modular Node.js/TypeScript backend providing clean RESTful endpoints and WebSocket/SSE for real-time progress updates.
- Scraper & Enrichment Engine:
  - Automatically fetches the target SaaS landing page.
  - Extracts OpenGraph tags, meta descriptions, favicon/logo, hero images, and structured JSON-LD.
  - Generates optimized directory-specific copy (short pitch 80 chars, summary 250 chars, detailed review 500+ chars, relevant tags/keywords).
- Directory Registry Service:
  - Pluggable catalog of free directories (e.g. AlternativeTo, SaaSHub, Toolify, Uneed, There's An AI For That, IndieHackers, ProductHunt, Reddit r/SideProject, etc.) with metadata on submission type (Form automation, Direct POST API, or Assisted).

### R3. Scalable Asynchronous Automation Pipeline (BullMQ / Playwright)
- Queue-based worker architecture designed for concurrency, rate-limiting, and error recovery.
- Pluggable Directory Automation Adapter Pattern (DirectorySubmitter interface):
  - Headless browser automation via Playwright for dynamic form submissions.
  - Direct HTTP/REST client for API/webhook submissions.
  - Automated field filling (app name, URL, short description, pricing model, logo upload, tags).
  - CAPTCHA / 2FA / verification code detection with webhook / UI alert for user intervention if needed.
  - Automated proof-of-submission screenshot capture and status callback.

### R4. Supabase Database & Real-time Integration
- Initialize and configure Supabase Postgres schema:
  - users: User profiles and settings.
  - projects: Submitted SaaS apps (name, url, description, logo_url, category, pricing, metadata).
  - directories: Registry of directories with category, DR, submission_type, status, config.
  - submissions: Job records linking project + directory with status, logs, result_url, proof_screenshot_url, error_message, timestamps.
- Supabase Row Level Security (RLS) policies and real-time subscriptions for live dashboard status sync.

## Verification Plan & Mechanisms

### Programmatic Verification
1. Metadata Extractor Tests: Unit & integration tests asserting correct extraction and enrichment from sample SaaS URLs (OG tags, JSON-LD, logo).
2. Directory Submitter Adapter Suite: Mock and sandbox test suite verifying each directory adapter's form fill logic, payload construction, and response parsing.
3. Queue & Concurrency Verification: Load/stress test simulating 10+ concurrent SaaS submissions across multiple simulated directory targets to verify non-blocking execution and queue handling.
4. End-to-End Test (Playwright / Cypress): Automated browser test covering: Google login / mock auth -> URL input -> metadata extraction -> directory selection -> queue trigger -> dashboard real-time updates.

## Acceptance Criteria

### Submission & Automation
- [ ] Submitting a SaaS URL successfully extracts product title, description, category, and screenshots in under 3 seconds.
- [ ] At least 5 distinct directory submitter adapters are implemented and tested (covering both Playwright headless form automation and direct HTTP submission).
- [ ] Worker queue handles job dispatching, concurrency control, exponential backoff retries, and job status reporting.
- [ ] Screenshot proof or response confirmation is captured and attached to each completed submission.

### Frontend UI & Experience
- [ ] Standalone Angular application builds cleanly with zero errors.
- [ ] Awwwards/21st.dev-inspired UI with smooth transitions, animated status pills, and responsive layout.
- [ ] Real-time dashboard immediately reflects live worker status without requiring page refresh.
- [ ] Supabase authentication (Google OAuth) is fully integrated.

### Database & Backend Architecture
- [ ] Supabase database migrations/schema cleanly define all tables, relationships, and RLS policies.
- [ ] Clean modular architecture with separation of concerns: API layer, Queue worker, Directory adapters, and Scraper service.
- [ ] Environment configuration documented in .env.example with setup scripts for quick local or cloud deployment.
</USER_REQUEST>
