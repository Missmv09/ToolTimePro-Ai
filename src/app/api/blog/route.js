import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - List blog posts for company
export async function GET(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Blog API] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({ posts: data || [] });
  } catch (error) {
    console.error('[Blog API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a blog post
export async function POST(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { companyId, userId, siteId, title, content, excerpt, metaTitle, metaDescription, metaKeywords, trade, location, topic, status, wordCount } = body;

    if (!companyId || !title || !content) {
      return NextResponse.json({ error: 'companyId, title, and content are required' }, { status: 400 });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        company_id: companyId,
        user_id: userId || null,
        site_id: siteId || null,
        title,
        slug,
        content,
        excerpt: excerpt || '',
        meta_title: metaTitle || title.substring(0, 200),
        meta_description: metaDescription || '',
        meta_keywords: metaKeywords || '',
        trade: trade || '',
        location: location || '',
        topic: topic || '',
        status: status || 'draft',
        word_count: wordCount || 0,
        ai_generated: true,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Blog API] Insert error:', error);
      return NextResponse.json({ error: 'Failed to save post' }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('[Blog API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
