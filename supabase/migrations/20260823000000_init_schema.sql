-- ============================================================================
-- SaaS Directory Auto-Publisher — Database Schema Initial Migration
-- Target Supabase Project Ref: qxakcsdaixzfttlcmnch
-- Version: 1.0.0
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. USERS / PROFILES TABLE
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

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- 3. PROJECTS TABLE (Submitted SaaS Products)
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

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- ============================================================================
-- 4. DIRECTORIES TABLE (Pluggable Registry Catalog)
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
    estimated_time_sec INTEGER NOT NULL DEFAULT 30 CHECK (estimated_time_sec >= 0),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for directories
CREATE INDEX IF NOT EXISTS idx_directories_status ON public.directories(status);
CREATE INDEX IF NOT EXISTS idx_directories_dr ON public.directories(domain_rating DESC);
CREATE INDEX IF NOT EXISTS idx_directories_category ON public.directories(category);

-- ============================================================================
-- 5. SUBMISSIONS TABLE (Execution Job Matrix)
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

-- Indexes for submissions
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_updated_at ON public.submissions(updated_at DESC);

-- ============================================================================
-- 6. AUTOMATIC TIMESTAMP TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_projects_updated_at ON public.projects;
CREATE TRIGGER tr_projects_updated_at 
    BEFORE UPDATE ON public.projects 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_directories_updated_at ON public.directories;
CREATE TRIGGER tr_directories_updated_at 
    BEFORE UPDATE ON public.directories 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_submissions_updated_at ON public.submissions;
CREATE TRIGGER tr_submissions_updated_at 
    BEFORE UPDATE ON public.submissions 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 7. USER CREATION TRIGGER ON AUTH SIGNUP
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- USERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- PROJECTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
    ON public.projects FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
CREATE POLICY "Users can create their own projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects"
    ON public.projects FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- DIRECTORIES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public directories are viewable by everyone" ON public.directories;
CREATE POLICY "Public directories are viewable by everyone"
    ON public.directories FOR SELECT
    TO authenticated, anon
    USING (status = 'active');

-- ----------------------------------------------------------------------------
-- SUBMISSIONS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;
CREATE POLICY "Users can view their own submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own submissions" ON public.submissions;
CREATE POLICY "Users can create their own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own submissions" ON public.submissions;
CREATE POLICY "Users can update their own submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own submissions" ON public.submissions;
CREATE POLICY "Users can delete their own submissions"
    ON public.submissions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- 9. REALTIME REPLICATION CONFIGURATION
-- ============================================================================
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;

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
