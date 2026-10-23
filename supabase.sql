-- ==============================================================================
-- ECHO.TGPCOP CAMPUS MEDIA - SUPABASE DATABASE SCHEMA
-- Project URL: https://gdwfptmtvzdfjcduhcvg.supabase.co
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project ("gdwfptmtvzdfjcduhcvg")
-- 3. Click "SQL Editor" on the left navigation bar
-- 4. Click "New query", paste this entire script, and click "Run" (or Ctrl + Enter)
-- ==============================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE: reviews (Wall of Love / Testimonials)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT DEFAULT 'Student',
    text VARCHAR(240) NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast ordering and filtering
CREATE INDEX IF NOT EXISTS idx_reviews_approved_created ON public.reviews (approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone (authenticated or public/anon) can view approved reviews
CREATE POLICY "Public can view approved reviews"
    ON public.reviews
    FOR SELECT
    USING (approved = TRUE);

-- RLS Policy: Users can view their own reviews (even if not yet approved)
CREATE POLICY "Users can view own reviews"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policy: Authenticated users can insert their own review (pending approval)
CREATE POLICY "Authenticated users can submit review"
    ON public.reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own review
CREATE POLICY "Users can delete own review"
    ON public.reviews
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ==============================================================================
-- 3. TABLE: collab_requests (Work With Us / Collaboration Form)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.collab_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    org TEXT NOT NULL,
    need TEXT NOT NULL,
    event_date DATE,
    details TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_collab_user_id ON public.collab_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_collab_created ON public.collab_requests (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.collab_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can insert their collaboration request
CREATE POLICY "Authenticated users can submit collab request"
    ON public.collab_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can view their own submitted requests
CREATE POLICY "Users can view own collab requests"
    ON public.collab_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);


-- ==============================================================================
-- 4. SEED DATA (Initial Approved Reviews for Wall of Love)
-- ==============================================================================
INSERT INTO public.reviews (name, role, text, approved)
VALUES
    ('Campus Student', 'Student', 'Echo captures every fest so perfectly. The photos are always the best part of the day!', TRUE),
    ('Faculty Member', 'Teacher', 'Professional, creative and always on time. Proud of this student team.', TRUE),
    ('Club Member', 'Student', 'Their reels make our events go viral on campus. Love the Echo style!', TRUE)
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- 5. TABLE: student_submissions (Student Performance Showcase - Photo/Video)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_name TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Dance',
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    instagram_handle TEXT,
    approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.student_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.student_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON public.student_submissions (media_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view approved submissions
CREATE POLICY "Public can view approved showcase"
    ON public.student_submissions FOR SELECT
    USING (approved = TRUE OR (auth.uid() = user_id));

-- Policy 2: Logged-in students can upload their submissions
CREATE POLICY "Logged in students can upload"
    ON public.student_submissions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Student can only delete their own submission
CREATE POLICY "Student can delete own submission"
    ON public.student_submissions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE BUCKET SETUP INSTRUCTIONS:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Click "New bucket" -> Name it "student_media"
-- 3. Toggle "Public bucket" to ON (Enabled)
-- 4. Save bucket
-- ==============================================================================

