# SaaS Directory Auto-Publisher

A full-stack automation platform designed for indie hackers and SaaS founders to automatically scrape, enrich, and asynchronously publish listings across top SaaS directories and launch communities using a scalable job runner pipeline.

## 🚀 Features

- **Instant Metadata Extraction & Copy Enrichment**: Extracts OpenGraph, JSON-LD, logos, screenshots, and generates optimized copy (pitch, summary, review, tags) in < 3 seconds.
- **Glassmorphic Modern UI**: Angular 19+ Standalone application with Tailwind CSS, Angular Signals, and dark/light modes.
- **Pluggable Directory Adapters**: Form automation via Playwright and Direct HTTP REST adapters for AlternativeTo, SaaSHub, Toolify, Uneed, TAAFT, IndieHackers, etc.
- **Resilient Queue Pipeline**: Concurrency-controlled BullMQ / In-Memory job queue with rate limits and exponential backoff retry.
- **Supabase Realtime & RLS**: Real-time status sync, live worker logs, proof screenshot capture, and strict multi-tenant Row Level Security.

## 📦 Monorepo Architecture

```
saas-directory-autopublisher/
├── packages/
│   ├── shared/         # Shared TypeScript interfaces, types, constants, Supabase client & DB helpers
│   ├── backend/        # Node.js + TypeScript API & Scraper Service
│   ├── worker/         # Queue Pipeline & Directory Submitter Adapters
│   └── frontend/       # Angular 19+ Standalone Web Application
├── supabase/
│   ├── migrations/     # Database DDL migrations with RLS and triggers
│   └── seed.sql        # Directory catalog and sample seed data
└── tests/              # Multi-tier verification test suite
```

## 🛠️ Quick Start

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Supabase Project (`qxakcsdaixzfttlcmnch`)

### Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm run test
   ```

## 🔐 Supabase Configuration
- **Project Ref**: `qxakcsdaixzfttlcmnch`
- **Database Migrations**: `supabase/migrations/20260823000000_init_schema.sql`
- **Seed Data**: `supabase/seed.sql`
