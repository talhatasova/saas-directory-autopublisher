-- ============================================================================
-- SaaS Directory Auto-Publisher — Supabase Seed Data
-- Seed Directory Catalog, Sample Demo User, Sample Projects, and Submissions
-- ============================================================================

-- ============================================================================
-- 1. SEED DIRECTORIES CATALOG
-- ============================================================================
INSERT INTO public.directories (id, name, url, category, domain_rating, submission_type, status, requires_auth, estimated_time_sec, config)
VALUES
(
    'alternativeto',
    'AlternativeTo',
    'https://alternativeto.net',
    'General SaaS',
    81,
    'form_automation',
    'active',
    false,
    35,
    '{"form_url": "https://alternativeto.net/software/add/", "requires_license": true, "supports_tags": true, "max_tags": 8}'::jsonb
),
(
    'saashub',
    'SaaSHub',
    'https://www.saashub.com',
    'General SaaS',
    76,
    'form_automation',
    'active',
    false,
    25,
    '{"form_url": "https://www.saashub.com/submit", "requires_pricing": true, "supports_tags": true, "max_tags": 5}'::jsonb
),
(
    'toolify',
    'Toolify.ai',
    'https://www.toolify.ai',
    'AI Tools',
    73,
    'direct_api',
    'active',
    false,
    10,
    '{"api_endpoint": "https://api.toolify.ai/v1/submit", "auth_type": "bearer", "requires_features": true}'::jsonb
),
(
    'uneed',
    'Uneed.best',
    'https://www.uneed.best',
    'Startups & Tools',
    68,
    'form_automation',
    'active',
    false,
    30,
    '{"form_url": "https://www.uneed.best/submit", "supports_tags": true, "max_tags": 5}'::jsonb
),
(
    'theresanaiforthat',
    'There''s An AI For That (TAAFT)',
    'https://theresanaiforthat.com',
    'AI Tools',
    79,
    'form_automation',
    'active',
    false,
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
    false,
    30,
    '{"form_url": "https://www.indiehackers.com/products/new", "requires_pricing": false}'::jsonb
),
(
    'producthunt',
    'Product Hunt Upcoming',
    'https://www.producthunt.com',
    'Launch Platform',
    91,
    'assisted',
    'active',
    true,
    45,
    '{"form_url": "https://www.producthunt.com/posts/new", "requires_oauth": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    url = EXCLUDED.url,
    category = EXCLUDED.category,
    domain_rating = EXCLUDED.domain_rating,
    submission_type = EXCLUDED.submission_type,
    status = EXCLUDED.status,
    requires_auth = EXCLUDED.requires_auth,
    estimated_time_sec = EXCLUDED.estimated_time_sec,
    config = EXCLUDED.config,
    updated_at = timezone('utc'::text, now());

-- ============================================================================
-- 2. SEED DEMO AUTH USER & PUBLIC USER PROFILE (IF NOT EXISTS)
-- ============================================================================
DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- Insert demo user into auth.users if it exists in schema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            demo_user_id,
            'authenticated',
            'authenticated',
            'demo@saasautopublisher.dev',
            crypt('DemoPassword123!', gen_salt('bf')),
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"full_name": "Alex Demo Founder", "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}'::jsonb,
            now(),
            now()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Ensure public.users entry exists
    INSERT INTO public.users (id, email, full_name, avatar_url, plan, submissions_quota)
    VALUES (
        demo_user_id,
        'demo@saasautopublisher.dev',
        'Alex Demo Founder',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        'pro',
        100
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        plan = EXCLUDED.plan,
        submissions_quota = EXCLUDED.submissions_quota;
END $$;

-- ============================================================================
-- 3. SEED SAMPLE PROJECTS
-- ============================================================================
INSERT INTO public.projects (
    id,
    user_id,
    name,
    url,
    tagline,
    description,
    short_description,
    category,
    tags,
    pricing_model,
    logo_url,
    screenshot_urls,
    metadata
)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'EchoPulse AI',
    'https://echopulse.ai',
    'Autonomous Customer Feedback & Sentiment Intelligence Platform',
    'EchoPulse AI connects directly to Discord, Zendesk, Intercom, and Twitter to aggregate, cluster, and prioritize customer feedback using state-of-the-art LLMs, generating actionable product roadmaps in real-time.',
    'AI-powered real-time customer sentiment and feedback clustering for SaaS product teams.',
    'AI Tools',
    ARRAY['ai', 'analytics', 'customer-feedback', 'sentiment-analysis', 'productivity'],
    'freemium',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256',
    ARRAY['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200'],
    '{
        "og_title": "EchoPulse AI — Customer Feedback Intelligence",
        "og_description": "Turn messy customer feedback into high-impact roadmap priorities automatically.",
        "og_image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200",
        "twitter_card": "summary_large_image",
        "extracted_pitch_80": "Automated sentiment analysis and feedback clustering platform for SaaS.",
        "extracted_summary_250": "EchoPulse AI connects to Discord, Intercom, Zendesk and Twitter to cluster and prioritize customer feedback using LLMs, generating automated roadmap actions.",
        "extracted_review_500": "EchoPulse AI provides SaaS founders and product managers with deep visibility into user sentiment and churn risk signals. By continuously analyzing unstructured customer tickets, reviews, and community conversations, EchoPulse identifies top-requested features and recurring bugs without manual triage."
    }'::jsonb
),
(
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'DevMetric Pro',
    'https://devmetric.pro',
    'Engineering Velocity and PR Cycle Time Analytics for GitHub Teams',
    'DevMetric Pro tracks DORA metrics, PR review bottlenecks, code churn, and deployment frequency directly from your Git repositories to empower engineering leads with data-driven sprint insights.',
    'DORA metrics and automated engineering cycle time analytics for GitHub and GitLab.',
    'Developer Tools',
    ARRAY['developer-tools', 'git', 'analytics', 'dora-metrics', 'engineering'],
    'subscription',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=256',
    ARRAY['https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200'],
    '{
        "og_title": "DevMetric Pro — Engineering Intelligence Platform",
        "og_description": "Boost team velocity with continuous DORA metrics and pull request analytics.",
        "og_image": "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200",
        "twitter_card": "summary_large_image"
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    url = EXCLUDED.url,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    pricing_model = EXCLUDED.pricing_model,
    logo_url = EXCLUDED.logo_url,
    screenshot_urls = EXCLUDED.screenshot_urls,
    metadata = EXCLUDED.metadata,
    updated_at = timezone('utc'::text, now());

-- ============================================================================
-- 4. SEED SAMPLE SUBMISSIONS MATRIX (FOR ECHOPULSE AI)
-- ============================================================================
INSERT INTO public.submissions (
    id,
    project_id,
    directory_id,
    user_id,
    status,
    job_id,
    listing_url,
    proof_screenshot_url,
    logs,
    retry_count,
    action_required_payload,
    started_at,
    completed_at
)
VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'alternativeto',
    '00000000-0000-0000-0000-000000000001',
    'published',
    'job_alt_001',
    'https://alternativeto.net/software/echopulse-ai/',
    'https://qxakcsdaixzfttlcmnch.supabase.co/storage/v1/object/public/submission-proofs/proof_echopulse_alternativeto.png',
    '[
        {"timestamp": "2026-08-23T18:00:01.000Z", "level": "info", "message": "Initialized AlternativeTo headless browser session."},
        {"timestamp": "2026-08-23T18:00:05.000Z", "level": "info", "message": "Filled product title, URL, license type, and 5 tags."},
        {"timestamp": "2026-08-23T18:00:12.000Z", "level": "info", "message": "Submitted listing form; confirmed 200 OK receipt."},
        {"timestamp": "2026-08-23T18:00:15.000Z", "level": "info", "message": "Saved confirmation screenshot proof to Supabase Storage."}
    ]'::jsonb,
    0,
    NULL,
    '2026-08-23T18:00:00.000Z',
    '2026-08-23T18:00:15.000Z'
),
(
    'a2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'toolify',
    '00000000-0000-0000-0000-000000000001',
    'published',
    'job_toolify_002',
    'https://www.toolify.ai/tool/echopulse-ai',
    'https://qxakcsdaixzfttlcmnch.supabase.co/storage/v1/object/public/submission-proofs/proof_echopulse_toolify.png',
    '[
        {"timestamp": "2026-08-23T18:01:00.000Z", "level": "info", "message": "Sending direct API payload to Toolify.ai endpoint."},
        {"timestamp": "2026-08-23T18:01:02.000Z", "level": "info", "message": "HTTP 201 Created received from Toolify API."},
        {"timestamp": "2026-08-23T18:01:03.000Z", "level": "info", "message": "Listing published successfully."}
    ]'::jsonb,
    0,
    NULL,
    '2026-08-23T18:01:00.000Z',
    '2026-08-23T18:01:03.000Z'
),
(
    'a3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'saashub',
    '00000000-0000-0000-0000-000000000001',
    'in_progress',
    'job_saashub_003',
    NULL,
    NULL,
    '[
        {"timestamp": "2026-08-23T18:02:00.000Z", "level": "info", "message": "Navigating to SaaSHub multi-step submit form."},
        {"timestamp": "2026-08-23T18:02:06.000Z", "level": "info", "message": "Step 1 completed: Entered title and pitch."},
        {"timestamp": "2026-08-23T18:02:10.000Z", "level": "info", "message": "Step 2 in progress: Selecting alternatives and pricing categories."}
    ]'::jsonb,
    0,
    NULL,
    '2026-08-23T18:02:00.000Z',
    NULL
),
(
    'a4444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'uneed',
    '00000000-0000-0000-0000-000000000001',
    'action_required',
    'job_uneed_004',
    NULL,
    NULL,
    '[
        {"timestamp": "2026-08-23T18:03:00.000Z", "level": "info", "message": "Navigating to Uneed.best submit form."},
        {"timestamp": "2026-08-23T18:03:05.000Z", "level": "info", "message": "Filled product info and uploaded logo."},
        {"timestamp": "2026-08-23T18:03:08.000Z", "level": "warn", "message": "Cloudflare Turnstile challenge detected on submission button."},
        {"timestamp": "2026-08-23T18:03:09.000Z", "level": "warn", "message": "Signaled intervention: awaiting user Turnstile verification."}
    ]'::jsonb,
    0,
    '{
        "type": "turnstile",
        "captcha_type": "turnstile",
        "message": "Cloudflare Turnstile verification required to submit to Uneed.best",
        "screenshot_preview": "https://qxakcsdaixzfttlcmnch.supabase.co/storage/v1/object/public/submission-proofs/turnstile_challenge_uneed.png"
    }'::jsonb,
    '2026-08-23T18:03:00.000Z',
    NULL
),
(
    'a5555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'theresanaiforthat',
    '00000000-0000-0000-0000-000000000001',
    'queued',
    'job_taaft_005',
    NULL,
    NULL,
    '[
        {"timestamp": "2026-08-23T18:04:00.000Z", "level": "info", "message": "Job enqueued in worker queue at position #1."}
    ]'::jsonb,
    0,
    NULL,
    NULL,
    NULL
)
ON CONFLICT (project_id, directory_id) DO UPDATE SET
    status = EXCLUDED.status,
    job_id = EXCLUDED.job_id,
    listing_url = EXCLUDED.listing_url,
    proof_screenshot_url = EXCLUDED.proof_screenshot_url,
    logs = EXCLUDED.logs,
    action_required_payload = EXCLUDED.action_required_payload,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    updated_at = timezone('utc'::text, now());
