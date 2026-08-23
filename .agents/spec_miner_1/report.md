# SaaS Directory Auto-Publisher — Authoritative Specification & Architecture Document

**Document Version:** 1.0.0  
**Status:** Completed & Authoritative  
**Target Environments:** Development, Staging, Production  
**Primary Tech Stack:** Angular 19+ Standalone (Signals + Tailwind CSS), Node.js + TypeScript (Express/Fastify + BullMQ + Playwright), Supabase Postgres (Auth, RLS, Realtime).

---

## 1. Executive Summary & System Overview

The **SaaS Directory Auto-Publisher** is a high-performance, full-stack automation platform engineered for indie hackers, solopreneurs, and SaaS founders. It eliminates the manual, time-consuming grind of submitting SaaS products to dozens of software directories, AI aggregators, and launch communities.

### Core Workflow
1. **URL Ingestion & Auto-Scraping**: User enters their SaaS landing page URL.
2. **Metadata Extraction & AI Copy Enrichment**: In under 3 seconds, the backend extracts OpenGraph metadata, JSON-LD schemas, favicon/logo, hero images, and generates directory-optimized copy (short pitch 80 chars, summary 250 chars, detailed review 500+ chars, tags).
3. **Interactive Review & Customization**: User inspects and refines the extracted fields, pricing model, and asset previews via a sleek, modern glassmorphic interface.
4. **Directory Selection & One-Click Launch**: User selects target directories from a rich catalog (filtered by category, Domain Rating, submission type) and triggers publishing.
5. **Asynchronous Execution Pipeline**: A resilient queue runner (BullMQ + Playwright) orchestrates headless browser automation and direct API submissions with rate-limiting, retry backoffs, and CAPTCHA detection.
6. **Real-time Live Sync & Verification**: Supabase Realtime and WebSocket/SSE streams push instant status updates, live worker execution logs, direct listing URLs, and visual proof-of-submission screenshots to the dashboard.

---

## 2. Features Discovered & Requirement Mapping

### 2.1 Features Discovered Matrix

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| F-01 | R1: Frontend | Hero URL Ingestion Bar | High-end interactive input bar with URL validation and trigger button | URL string (`https://...`) | Validation feedback, trigger extraction event | Displays inline error badge if invalid URL | `ORIGINAL_REQUEST.md` R1.1 |
| F-02 | R1: Frontend | Metadata Review & Edit Modal | Interactive preview & editing modal for extracted SaaS metadata | `ExtractedMetadata` object | Modified `Project` payload | Field-level validation on character limits | `ORIGINAL_REQUEST.md` R1.2 |
| F-03 | R1: Frontend | Directory Selection Matrix | Filterable directory grid with select-all, DR badges, and submission type tags | Directory list, filter state | Array of selected `directory_id`s | Disables launch button if selection is empty | `ORIGINAL_REQUEST.md` R1.3 |
| F-04 | R1: Frontend | Live Dashboard & Status Matrix | Real-time table/grid displaying status pills, progress bar, listing URLs, proof screenshots | Supabase Realtime stream / WebSocket events | Rendered status rows with live transitions | Shows warning badge on failure/action_required | `ORIGINAL_REQUEST.md` R1.4 |
| F-05 | R1: Frontend | Proof Screenshot Viewer Modal | Full-resolution visual proof viewer for confirmed directory submissions | Screenshot URL / Blob | High-res image modal with zoom & download | Fallback placeholder image if URL broken | `ORIGINAL_REQUEST.md` R1.4, R3.5 |
| F-06 | R1: Frontend | Live Log Stream Drawer | Collapsible terminal-style drawer streaming real-time worker logs | Log event stream (`timestamp`, `level`, `msg`) | Rendered color-coded log lines | Graceful reconnect on stream interruption | `ORIGINAL_REQUEST.md` R1.4, R4 |
| F-07 | R1: Frontend | Supabase Auth Integration | Google OAuth and Email Magic Link / Password authentication | User credentials / OAuth provider | JWT session, user profile state | Toast alert on auth failure | `ORIGINAL_REQUEST.md` R1.5 |
| F-08 | R2: Backend | Metadata Scraper Engine | Automated landing page parser extracting OpenGraph, JSON-LD, favicon, hero images | Target URL string | `RawScrapedMetadata` object | Fallback heuristics on missing tags; 3s timeout | `ORIGINAL_REQUEST.md` R2.2 |
| F-09 | R2: Backend | Copy Enrichment Engine | Generates optimized pitch (80c), summary (250c), review (500c), and tags | `RawScrapedMetadata` | `EnrichedCopy` object | Truncation & heuristic synthesis if AI offline | `ORIGINAL_REQUEST.md` R2.2 |
| F-10 | R2: Backend | Directory Registry Catalog | Pluggable catalog of target directories with DR, category, submission type | Filter query params | Array of `Directory` objects | Empty array on unknown filter | `ORIGINAL_REQUEST.md` R2.3 |
| F-11 | R2: Backend | Project & Submission REST API | Complete CRUD endpoints for projects and batch submission job dispatches | JSON payloads | JSON response + HTTP status codes | Standardized `4xx`/`5xx` error JSON | `ORIGINAL_REQUEST.md` R2.1 |
| F-12 | R2: Backend | Real-time Event Broadcaster | WebSocket/SSE server broadcasting job progress and console logs | Worker event emitters | WebSocket frame / SSE event stream | Automatic heartbeat ping/pong | `ORIGINAL_REQUEST.md` R2.1 |
| F-13 | R3: Automation | BullMQ Job Queue Pipeline | Asynchronous worker queue managing concurrency, rate limits, and retries | Submission job payload | Job execution lifecycle events | 3x exponential backoff on transient errors | `ORIGINAL_REQUEST.md` R3.1 |
| F-14 | R3: Automation | AlternativeTo Adapter | Playwright headless browser form automation for AlternativeTo | Product metadata | Listing URL + proof screenshot | Pauses on CAPTCHA; marks `action_required` | `ORIGINAL_REQUEST.md` R3.2 |
| F-15 | R3: Automation | SaaSHub Adapter | Playwright headless browser form automation for SaaSHub | Product metadata | Listing URL + proof screenshot | Form validation retry on field mismatch | `ORIGINAL_REQUEST.md` R3.2 |
| F-16 | R3: Automation | Toolify Adapter | Direct REST API & form submission for Toolify AI directory | Product metadata | Instant listing URL / ID | 429 rate limit backoff | `ORIGINAL_REQUEST.md` R3.2 |
| F-17 | R3: Automation | Uneed Adapter | Playwright headless form automation for Uneed.best | Product metadata | Submission badge screenshot + URL | Screenshot capture on DOM timeout | `ORIGINAL_REQUEST.md` R3.2 |
| F-18 | R3: Automation | There's An AI For That Adapter | Playwright automation for AI tool submission form | Product metadata | Receipt screenshot + submission ID | Error logged if category not found | `ORIGINAL_REQUEST.md` R3.2 |
| F-19 | R3: Automation | CAPTCHA / 2FA Detection Alert | Detects Cloudflare Turnstile, reCAPTCHA, and notifies client for intervention | DOM inspection during run | `action_required` status + webhook alert | Job kept in waiting state for user resolution | `ORIGINAL_REQUEST.md` R3.4 |
| F-20 | R3: Automation | Proof-of-Submission Capture | Captures visual DOM screenshot upon successful submission or receipt | Browser page context | Uploaded PNG URL in Supabase Storage | Fallback to HTML dump if screenshot fails | `ORIGINAL_REQUEST.md` R3.5 |
| F-21 | R4: Database | Supabase Postgres Schema | Relational schema with UUID keys, constraints, and audit timestamps | DDL migrations | Structured relational tables | Constraint violation errors | `ORIGINAL_REQUEST.md` R4.1 |
| F-22 | R4: Database | Row Level Security (RLS) | Multi-tenant isolation ensuring users only access their own data | Supabase Auth JWT | RLS filtered query results | `403 Forbidden` / empty result on violation | `ORIGINAL_REQUEST.md` R4.2 |
| F-23 | R4: Database | Realtime Publication Setup | Postgres Realtime replication enabled on `submissions` & `projects` | Row change events | WebSocket broadcast to subscribed clients | Client auto-resubscription on disconnect | `ORIGINAL_REQUEST.md` R4.2 |

---

## 3. Database Schema Specification (Supabase Postgres)

### 3.1 Credentials & Target Configuration
- **Supabase Project Ref**: `qxakcsdaixzfttlcmnch`
- **Supabase URL**: `https://qxakcsdaixzfttlcmnch.supabase.co`
- **Supabase Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWtjc2RhaXh6ZnR0bGNtbmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MDc3NTUsImV4cCI6MjEwMzA4Mzc1NX0.-ZrZQubMRtse3xJTIlP_a9wDI6Kf4rKfDlV_W5GS420`
- **Supabase Publishable Key**: `sb_publishable_zJgRu5FMM_TyKeCAmr44zw_ZrEY4zPu`

### 3.2 Tables & Relationships

```
┌─────────────────────────┐         ┌─────────────────────────┐
│       auth.users        │         │       directories       │
└────────────┬────────────┘         └────────────┬────────────┘
             │ 1:1                               │ 1:N
             ▼                                   │
┌─────────────────────────┐                      │
│      public.users       │                      │
└────────────┬────────────┘                      │
             │ 1:N                               │
             ▼                                   │
┌─────────────────────────┐                      │
│        projects         │                      │
└────────────┬────────────┘                      │
             │ 1:N                               │
             ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                         submissions                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Authoritative SQL DDL & Constraints

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS / PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    submissions_quota INTEGER NOT NULL DEFAULT 50 CHECK (submissions_quota >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- 2. PROJECTS TABLE (Submitted SaaS Products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    url TEXT NOT NULL CHECK (url ~* '^https?://[^\s/$.?#].[^\s]*$'),
    tagline TEXT NOT NULL CHECK (char_length(tagline) <= 120),
    description TEXT NOT NULL CHECK (char_length(description) >= 10),
    short_description TEXT CHECK (char_length(short_description) <= 300),
    category TEXT NOT NULL DEFAULT 'General SaaS',
    tags TEXT[] NOT NULL DEFAULT '{}',
    pricing_model TEXT NOT NULL DEFAULT 'freemium' CHECK (pricing_model IN ('free', 'freemium', 'paid', 'subscription', 'one-time', 'contact')),
    logo_url TEXT,
    screenshot_urls TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- ============================================================================
-- 3. DIRECTORIES TABLE (Pluggable Registry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.directories (
    id TEXT PRIMARY KEY, -- e.g. 'alternativeto', 'saashub', 'toolify', 'uneed', 'theresanaiforthat'
    name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    domain_rating INTEGER NOT NULL CHECK (domain_rating >= 0 AND domain_rating <= 100),
    submission_type TEXT NOT NULL CHECK (submission_type IN ('form_automation', 'direct_api', 'assisted', 'manual')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'deprecated')),
    requires_auth BOOLEAN NOT NULL DEFAULT false,
    estimated_time_sec INTEGER NOT NULL DEFAULT 30,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_directories_status ON public.directories(status);
CREATE INDEX IF NOT EXISTS idx_directories_dr ON public.directories(domain_rating DESC);
CREATE INDEX IF NOT EXISTS idx_directories_category ON public.directories(category);

-- ============================================================================
-- 4. SUBMISSIONS TABLE (Execution Job Matrix)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    directory_id TEXT NOT NULL REFERENCES public.directories(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'published', 'action_required', 'failed', 'cancelled')),
    job_id TEXT,
    listing_url TEXT,
    proof_screenshot_url TEXT,
    logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    action_required_payload JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, directory_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_updated_at ON public.submissions(updated_at DESC);

-- ============================================================================
-- 5. AUTOMATIC TIMESTAMP TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_directories_updated_at BEFORE UPDATE ON public.directories FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_submissions_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 6. USER CREATION TRIGGER ON AUTH SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 3.4 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- USERS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- PROJECTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own projects"
    ON public.projects FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON public.projects FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- DIRECTORIES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public directories are viewable by everyone"
    ON public.directories FOR SELECT
    TO authenticated, anon
    USING (status = 'active');

-- ----------------------------------------------------------------------------
-- SUBMISSIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own submissions"
    ON public.submissions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

### 3.5 Realtime Replication Setup

```sql
-- Ensure full row image is emitted for updates
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'submissions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
    END IF;
END $$;
```

### 3.6 Initial Seed Data (5+ Canonical SaaS Directories)

```sql
INSERT INTO public.directories (id, name, url, category, domain_rating, submission_type, status, estimated_time_sec, config)
VALUES
(
    'alternativeto',
    'AlternativeTo',
    'https://alternativeto.net',
    'General SaaS',
    81,
    'form_automation',
    'active',
    35,
    '{"form_url": "https://alternativeto.net/software/add/", "requires_license": true}'::jsonb
),
(
    'saashub',
    'SaaSHub',
    'https://www.saashub.com',
    'General SaaS',
    76,
    'form_automation',
    'active',
    25,
    '{"form_url": "https://www.saashub.com/submit", "requires_pricing": true}'::jsonb
),
(
    'toolify',
    'Toolify.ai',
    'https://www.toolify.ai',
    'AI Tools',
    73,
    'direct_api',
    'active',
    10,
    '{"api_endpoint": "https://api.toolify.ai/v1/submit", "auth_type": "bearer"}'::jsonb
),
(
    'uneed',
    'Uneed.best',
    'https://www.uneed.best',
    'Startups & Tools',
    68,
    'form_automation',
    'active',
    30,
    '{"form_url": "https://www.uneed.best/submit", "supports_tags": true}'::jsonb
),
(
    'theresanaiforthat',
    'There''s An AI For That (TAAFT)',
    'https://theresanaiforthat.com',
    'AI Tools',
    79,
    'form_automation',
    'active',
    40,
    '{"form_url": "https://theresanaiforthat.com/submit", "requires_features": true}'::jsonb
),
(
    'indiehackers',
    'Indie Hackers Products',
    'https://www.indiehackers.com',
    'Startups',
    83,
    'form_automation',
    'active',
    30,
    '{"form_url": "https://www.indiehackers.com/products/new"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    url = EXCLUDED.url,
    category = EXCLUDED.category,
    domain_rating = EXCLUDED.domain_rating,
    submission_type = EXCLUDED.submission_type,
    config = EXCLUDED.config;
```

---

## 4. API Contract & Communication Protocol

### 4.1 Base URL & Conventions
- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token (`Authorization: Bearer <Supabase_JWT>`)
- **Error Standard**: RFC 7807 Problem Details

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided URL is unreachable or invalid.",
    "details": [
      { "field": "url", "issue": "Invalid URL protocol. Must start with http:// or https://" }
    ],
    "timestamp": "2026-08-23T17:50:00.000Z"
  }
}
```

### 4.2 Endpoint Specifications

#### 1. `POST /api/v1/extract` (Scraper & Enrichment)
- **Description**: Ingests SaaS landing page URL, fetches HTML, parses metadata, and enriches copy.
- **Request Body**:
```json
{
  "url": "https://mysaasapp.com"
}
```
- **Response `200 OK`**:
```json
{
  "url": "https://mysaasapp.com",
  "name": "MySaaSApp",
  "tagline": "The AI-powered Analytics Platform for Modern Engineering Teams",
  "description": "MySaaSApp automates engineering metrics, PR cycle times, and sprint velocity reporting directly from GitHub and GitLab.",
  "short_description": "AI-powered engineering velocity and PR analytics platform.",
  "category": "Developer Tools",
  "pricing_model": "freemium",
  "tags": ["developer-tools", "analytics", "ai", "git", "productivity"],
  "logo_url": "https://mysaasapp.com/assets/logo.png",
  "screenshot_urls": [
    "https://mysaasapp.com/assets/dashboard-preview.png"
  ],
  "metadata": {
    "og_title": "MySaaSApp — Engineering Intelligence",
    "og_description": "Ship faster with automated engineering metrics.",
    "og_image": "https://mysaasapp.com/assets/og.png",
    "twitter_card": "summary_large_image",
    "json_ld": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "MySaaSApp",
      "applicationCategory": "DeveloperApplication"
    }
  },
  "extraction_time_ms": 1420
}
```
- **Status Codes**: `200 OK`, `400 Bad Request`, `422 Unprocessable Entity`, `504 Gateway Timeout`.

#### 2. `GET /api/v1/directories` (Catalog Listing)
- **Description**: Returns all active directories with metadata, category, DR, and submission method.
- **Query Parameters**:
  - `category` (optional, string): Filter by directory category
  - `submission_type` (optional, enum: `form_automation`, `direct_api`, `assisted`)
  - `min_dr` (optional, integer): Minimum Domain Rating filter
- **Response `200 OK`**:
```json
{
  "directories": [
    {
      "id": "alternativeto",
      "name": "AlternativeTo",
      "url": "https://alternativeto.net",
      "category": "General SaaS",
      "domain_rating": 81,
      "submission_type": "form_automation",
      "status": "active",
      "estimated_time_sec": 35
    },
    {
      "id": "toolify",
      "name": "Toolify.ai",
      "url": "https://www.toolify.ai",
      "category": "AI Tools",
      "domain_rating": 73,
      "submission_type": "direct_api",
      "status": "active",
      "estimated_time_sec": 10
    }
  ],
  "total": 6
}
```

#### 3. `POST /api/v1/projects` (Create/Save Project)
- **Description**: Stores enriched SaaS project profile in Supabase.
- **Request Body**:
```json
{
  "name": "MySaaSApp",
  "url": "https://mysaasapp.com",
  "tagline": "The AI-powered Analytics Platform for Modern Engineering Teams",
  "description": "MySaaSApp automates engineering metrics, PR cycle times, and sprint velocity reporting directly from GitHub and GitLab.",
  "short_description": "AI-powered engineering velocity and PR analytics platform.",
  "category": "Developer Tools",
  "pricing_model": "freemium",
  "tags": ["developer-tools", "analytics", "ai", "git"],
  "logo_url": "https://mysaasapp.com/assets/logo.png",
  "screenshot_urls": ["https://mysaasapp.com/assets/dashboard-preview.png"],
  "metadata": {}
}
```
- **Response `201 Created`**: Returns created `Project` entity.

#### 4. `POST /api/v1/submissions/launch` (Trigger Publishing Jobs)
- **Description**: Queues publishing jobs across selected directories for a given project.
- **Request Body**:
```json
{
  "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "directory_ids": ["alternativeto", "saashub", "toolify", "uneed", "theresanaiforthat"]
}
```
- **Response `202 Accepted`**:
```json
{
  "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "enqueued_count": 5,
  "submissions": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "directory_id": "alternativeto",
      "status": "queued",
      "retry_count": 0,
      "created_at": "2026-08-23T17:52:00.000Z"
    }
  ]
}
```

#### 5. `GET /api/v1/submissions` (Query Submissions Matrix)
- **Query Parameters**:
  - `project_id` (required, UUID)
  - `status` (optional, string)
- **Response `200 OK`**: Returns array of submission records with logs and proof URLs.

#### 6. `POST /api/v1/submissions/:id/retry`
- **Description**: Re-queues a failed submission job with reset counters.
- **Response `200 OK`**: Updated submission record.

#### 7. `POST /api/v1/submissions/:id/resolve-action`
- **Description**: Submits manual resolution (e.g. CAPTCHA token or 2FA confirmation) to unblock job.
- **Request Body**:
```json
{
  "captcha_token": "0.AbCdEf123...",
  "resolution_type": "captcha_solved"
}
```
- **Response `200 OK`**: `{ "status": "resumed" }`

---

### 4.3 Real-time WebSocket / SSE Protocol

The platform supports both **Supabase Realtime Postgres CDC** (for database row synchronization) and a lightweight **WebSocket / SSE channel** (for sub-second terminal log streaming and live worker heartbeat).

#### Event Payloads

##### `job:progress`
```json
{
  "event": "job:progress",
  "submission_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "directory_id": "alternativeto",
  "status": "in_progress",
  "step": "filling_form_fields",
  "progress_percentage": 65,
  "timestamp": "2026-08-23T17:52:14.120Z"
}
```

##### `job:log`
```json
{
  "event": "job:log",
  "submission_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "level": "info",
  "message": "[AlternativeToAdapter] Successfully uploaded product logo and filled tagline.",
  "timestamp": "2026-08-23T17:52:15.300Z"
}
```

##### `job:completed`
```json
{
  "event": "job:completed",
  "submission_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "published",
  "listing_url": "https://alternativeto.net/software/mysaasapp/",
  "proof_screenshot_url": "https://qxakcsdaixzfttlcmnch.supabase.co/storage/v1/object/public/submission-proofs/proof_f47ac10b.png",
  "completed_at": "2026-08-23T17:52:28.000Z"
}
```

##### `job:action_required`
```json
{
  "event": "job:action_required",
  "submission_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "action_required",
  "payload": {
    "type": "captcha_detected",
    "captcha_type": "turnstile",
    "screenshot_preview": "https://.../captcha_turnstile_f47ac.png",
    "message": "Cloudflare Turnstile challenge detected. Please solve in UI popup."
  },
  "timestamp": "2026-08-23T17:52:18.000Z"
}
```

---

## 5. Automation Pipeline & Directory Submitter Adapters (R3)

### 5.1 Architecture & Concurrency Model

```
┌────────────────────────────────────────────────────────┐
│               BullMQ Job Queue (Redis)                 │
└──────────────────────────┬─────────────────────────────┘
                           │ (Concurrency: 5, Rate-Limited)
                           ▼
┌────────────────────────────────────────────────────────┐
│            Directory Submission Worker Pool            │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Playwright   │    │ Direct HTTP  │    │ Assisted/API │
│ Form Adapter │    │ REST Adapter │    │   Adapter    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ▼                   ▼                   ▼
[AlternativeTo]      [Toolify.ai]           [Uneed]
 [SaaSHub.com]     [IndieHackers]        [TAAFT AI]
```

### 5.2 Pluggable Adapter Interface Specification

```typescript
export interface SubmissionPayload {
  projectId: string;
  submissionId: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  shortDescription?: string;
  category: string;
  tags: string[];
  pricingModel: 'free' | 'freemium' | 'paid' | 'subscription' | 'one-time' | 'contact';
  logoUrl?: string;
  screenshotUrls?: string[];
  metadata?: Record<string, any>;
}

export interface SubmissionContext {
  logger: (level: 'info' | 'warn' | 'error', message: string, details?: any) => void;
  updateProgress: (percentage: number, step: string) => Promise<void>;
  captureProofScreenshot: (page: any, namePrefix: string) => Promise<string>;
  requestUserAction: (actionType: string, payload: any) => Promise<any>;
}

export interface SubmissionResult {
  status: 'published' | 'action_required' | 'failed';
  listingUrl?: string;
  proofScreenshotUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  actionPayload?: Record<string, any>;
}

export interface DirectorySubmitter {
  readonly directoryId: string;
  readonly directoryName: string;
  readonly submissionType: 'form_automation' | 'direct_api' | 'assisted';
  
  submit(payload: SubmissionPayload, context: SubmissionContext): Promise<SubmissionResult>;
}
```

### 5.3 Concrete Adapter Implementations

1. **`AlternativeToAdapter`** (`form_automation`):
   - Launches isolated Chromium context with stealth plugins.
   - Navigates to AlternativeTo software submit flow.
   - Populates: Application Title, Website URL, Short Tagline, Long Description, License (Freemium/Proprietary/Open Source), Category tagging.
   - Waits for submission confirmation banner.
   - Snaps full-page screenshot (`proof_alternativeto_{id}.png`), parses generated profile slug.

2. **`SaaSHubAdapter`** (`form_automation`):
   - Opens SaaSHub `/submit` form.
   - Fills: Product Name, Main URL, Pitch (Tagline), Detailed Summary, Pricing Category, Competitor / Alternative tags.
   - Submits form, verifies redirect to pending/live confirmation page, captures screenshot proof.

3. **`ToolifyAdapter`** (`direct_api`):
   - Issues optimized HTTP POST payload to Toolify.ai submission endpoint.
   - Maps category to AI tool taxonomies (e.g. `Productivity`, `Code Assistant`, `Marketing AI`).
   - Parses instant API response for listing ID and public directory URL.

4. **`UneedAdapter`** (`form_automation`):
   - Navigates to Uneed.best tool submission page.
   - Fills: Product Title, Launch Pitch, Markdown Description, Product Link, Logo attachment.
   - Handles animated submit button, confirms success toast, saves screenshot.

5. **`TheresAnAIForThatAdapter`** (`form_automation`):
   - Automates AI aggregator form.
   - Injects tool title, tasks solved, target audience, pricing tiers, and direct URL.
   - Validates submission receipt and takes proof screenshot.

---

## 6. Frontend Architecture & Design Specification (R1)

### 6.1 Design Philosophy (Awwwards / 21st.dev / Glassmorphic SaaS)
- **Aesthetic**: Modern dark-mode-first with high-contrast light mode toggle. Deep slate/zinc canvas (`#090d16` / `#0b0f19`), frosted glass cards with `backdrop-blur-md` and `border-white/10`, subtle glowing purple/cyan gradient accents (`#6366f1` -> `#a855f7` -> `#ec4899`).
- **Typography**: Inter / Plus Jakarta Sans / JetBrains Mono (for live logs and terminal feeds).
- **Micro-Interactions**: Smooth hover lifts, animated gradient borders on focus, pulsating live status indicators, fluid spring modal openings.

### 6.2 Component Hierarchy & Signal State Architecture

```
AppRoot
├── NavbarComponent (Signals: authState, theme, activeQuota)
├── HeroInputComponent (Signals: inputUrl, isExtracting, extractionError)
├── MetadataReviewModalComponent (Signals: draftProject, isValid, isSaving)
├── DirectoryCatalogComponent (Signals: directories, selectedDirectoryIds, filterCategory, minDR)
├── LiveDashboardComponent (Signals: submissionsList, activeProject, overallProgressPercent)
│   ├── StatsOverviewCards (Total, In Progress, Published, Action Required, Failed)
│   ├── SubmissionMatrixGrid
│   │   └── SubmissionRowComponent (Live Status Pill, Listing Link, Proof Button, Log Toggle)
│   ├── ProofScreenshotModalComponent (Active Screenshot URL, Zoom Level)
│   └── LogViewerDrawerComponent (Realtime Console Stream, Auto-scroll Signal)
└── AuthModalComponent (Google OAuth, Magic Link)
```

---

## 7. Edge Cases, Failure Modes & Resilience Rules

| # | Feature | Input / Condition | Expected / Handled Behavior | Recovery / Fallback |
|---|---|---|---|---|
| E-01 | Scraper | SPA site with empty initial HTML payload | Hydrates page with lightweight browser renderer (Puppeteer/Playwright) if raw fetch has no meta tags | Fallback to page `<title>` and heuristic regex parser |
| E-02 | Scraper | Target URL behind Cloudflare bot protection | Detects 403 / 503 challenge screen; falls back to standard user-agent rotation | If blocked, prompts user to manually fill fields in Review Modal |
| E-03 | Scraper | Missing favicon or hero image | Searches standard locations (`/favicon.ico`, apple-touch-icon) and Clearbit Logo API | Defaults to stylized placeholder gradient icon |
| E-04 | Queue | Redis connection dropped | BullMQ reconnects with exponential backoff; logs warning | Jobs remain safely queued in Redis persistence layer |
| E-05 | Automation | Target directory DOM selector changed | Adapter catches element lookup timeout (15s); logs exact missing selector | Sets status to `failed` with code `ERR_SELECTOR_CHANGED`, notifies engineer |
| E-06 | Automation | CAPTCHA / Cloudflare Turnstile detected | Adapter detects iframe/widget, pauses job, sets status to `action_required` | Broadcasts UI event with screenshot; resumes upon user token submission |
| E-07 | Automation | Rate limit 429 encountered from direct API | Adapter throws retryable error; BullMQ schedules exponential backoff (e.g. 60s delay) | Max 3 retries before marking `failed` with code `ERR_RATE_LIMIT` |
| E-08 | Automation | Duplicate submission detected on directory | Target directory reports "Product already exists" | Sets status to `published` or `action_required` with note "Already listed" |
| E-09 | Frontend | Realtime WebSocket disconnection | Angular signal state detects socket close; shows subtle reconnecting indicator | Seamless exponential backoff auto-reconnect with state catchup |
| E-10 | Database | RLS Unauthorized access attempt | Attempting to fetch another user's project or submission | Supabase RLS returns empty array or `403 Forbidden` |

---

## 8. Verification & Acceptance Criteria

### 8.1 Verification Plan

```
┌────────────────────────────────────────────────────────┐
│                   Verification Tiers                   │
├────────────────────────────────────────────────────────┤
│ Tier 1: Static Type & Lint Checks                      │
│ - Angular TypeScript typecheck: `ng build`             │
│ - Backend TypeScript compilation: `tsc --noEmit`       │
│                                                        │
│ Tier 2: Unit & Mock Adapter Test Suite                 │
│ - Scraper & Enrichment tests with HTML fixtures        │
│ - 5+ Directory Submitter Adapters in sandbox mode      │
│ - Schema validation & RLS policy rules                 │
│                                                        │
│ Tier 3: Concurrency & Queue Stress Tests               │
│ - 10+ concurrent SaaS submissions load test            │
│ - Rate-limiting and retry backoff verification         │
│                                                        │
│ Tier 4: End-to-End Playwright Automation               │
│ - Full flow: Ingest URL -> Extract -> Review -> Select │
│   -> Publish -> Live Matrix Sync -> Proof Screenshot   │
└────────────────────────────────────────────────────────┘
```

### 8.2 Authoritative Sign-Off Checklist
- [x] Full database schema DDL formulated with constraints, triggers, and RLS policies.
- [x] Realtime publication on `submissions` and `projects` specified.
- [x] Complete REST API endpoints and WebSocket/SSE event protocols documented.
- [x] 5+ Directory submitter adapters designed with clean interfaces and error handling.
- [x] Angular Standalone + Signals + Tailwind CSS frontend architecture detailed.
- [x] Comprehensive edge case taxonomy and verification plan established.
