import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - List published platform blog posts (public) or all (admin)
export async function GET(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const admin = searchParams.get('admin') === 'true';
    const category = searchParams.get('category');
    const slug = searchParams.get('slug');

    let query = supabase.from('platform_blog_posts').select('*');

    if (slug) {
      query = query.eq('slug', slug).eq('status', 'published').single();
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      return NextResponse.json({ post: data });
    }

    if (!admin) {
      query = query.eq('status', 'published');
    }

    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('published_at', { ascending: false, nullsFirst: false });

    const { data, error } = await query;
    if (error) {
      console.error('[Platform Blog] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({ posts: data || [] });
  } catch (error) {
    console.error('[Platform Blog] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create platform blog post (admin only)
export async function POST(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { title, content, excerpt, category, tags, metaTitle, metaDescription, metaKeywords, status, authorName, coverImage } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    const { data, error } = await supabase
      .from('platform_blog_posts')
      .insert({
        title,
        slug,
        content,
        excerpt: excerpt || '',
        category: category || 'tips',
        tags: tags || [],
        meta_title: metaTitle || title.substring(0, 200),
        meta_description: metaDescription || '',
        meta_keywords: metaKeywords || '',
        status: status || 'draft',
        author_name: authorName || 'ToolTime Pro Team',
        cover_image: coverImage || null,
        word_count: wordCount,
        read_time_minutes: readTime,
        ai_generated: true,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Platform Blog] Insert error:', error);
      return NextResponse.json({ error: 'Failed to save post: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('[Platform Blog] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update platform blog post
export async function PATCH(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('platform_blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Platform Blog] Update error:', error);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('[Platform Blog] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete platform blog post
export async function DELETE(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('platform_blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Platform Blog] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Platform Blog] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
