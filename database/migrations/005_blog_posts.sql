-- ============================================
-- TOOLTIME PRO — Blog Posts (AI Content Generator)
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES website_sites(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    excerpt TEXT,
    content TEXT NOT NULL,
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords TEXT,
    trade VARCHAR(100),
    location VARCHAR(255),
    topic VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP WITH TIME ZONE,
    word_count INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_company ON blog_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Company members can read their blog posts
DROP POLICY IF EXISTS "Company members can read blog posts" ON blog_posts;
CREATE POLICY "Company members can read blog posts"
    ON blog_posts FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Users can insert blog posts for their company
DROP POLICY IF EXISTS "Users can insert blog posts" ON blog_posts;
CREATE POLICY "Users can insert blog posts"
    ON blog_posts FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Users can update their company blog posts
DROP POLICY IF EXISTS "Users can update blog posts" ON blog_posts;
CREATE POLICY "Users can update blog posts"
    ON blog_posts FOR UPDATE
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Users can delete their company blog posts
DROP POLICY IF EXISTS "Users can delete blog posts" ON blog_posts;
CREATE POLICY "Users can delete blog posts"
    ON blog_posts FOR DELETE
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Public can read published posts (for the live website blog)
DROP POLICY IF EXISTS "Public can read published blog posts" ON blog_posts;
CREATE POLICY "Public can read published blog posts"
    ON blog_posts FOR SELECT
    USING (status = 'published');

-- Trigger
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE! Verify with:
-- SELECT count(*) FROM blog_posts;
-- ============================================
