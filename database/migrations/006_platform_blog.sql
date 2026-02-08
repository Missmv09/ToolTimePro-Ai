-- ============================================
-- TOOLTIME PRO — Platform Blog (Marketing Site)
-- Separate from customer blog_posts table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS platform_blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    author_name VARCHAR(255) DEFAULT 'ToolTime Pro Team',
    category VARCHAR(100), -- e.g. 'tips', 'guides', 'industry-news', 'product-updates'
    tags TEXT[], -- array of tags
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    word_count INTEGER DEFAULT 0,
    read_time_minutes INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_blog_status ON platform_blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_platform_blog_slug ON platform_blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_platform_blog_category ON platform_blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_platform_blog_published ON platform_blog_posts(published_at DESC);

-- RLS
ALTER TABLE platform_blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
DROP POLICY IF EXISTS "Public can read published platform posts" ON platform_blog_posts;
CREATE POLICY "Public can read published platform posts"
    ON platform_blog_posts FOR SELECT
    USING (status = 'published');

-- Service role can do everything (admin operations go through API with service key)
-- No INSERT/UPDATE/DELETE policies for anon/authenticated — admin only via service role

-- Trigger
DROP TRIGGER IF EXISTS update_platform_blog_updated_at ON platform_blog_posts;
CREATE TRIGGER update_platform_blog_updated_at
    BEFORE UPDATE ON platform_blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE!
-- ============================================
