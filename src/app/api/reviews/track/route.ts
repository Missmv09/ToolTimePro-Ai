import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — Track click and return review URL
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Server error' }, { status: 500 });

  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  try {
    // Find review request by tracking token
    const { data: reviewRequest } = await (supabase as any)
      .from('review_requests')
      .select('id, company_id, review_link, status, customer_name')
      .eq('tracking_token', token)
      .single();

    if (!reviewRequest) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Mark as clicked (only if not already reviewed)
    if (reviewRequest.status !== 'reviewed') {
      await (supabase as any)
        .from('review_requests')
        .update({
          status: 'clicked',
          clicked_at: new Date().toISOString(),
        })
        .eq('id', reviewRequest.id);
    }

    // Get company name and review link
    const { data: company } = await supabase
      .from('companies')
      .select('name, google_review_link')
      .eq('id', reviewRequest.company_id)
      .single();

    // Use the review_link from the request, or fall back to company's Google link
    const reviewUrl = reviewRequest.review_link ||
      (company as any)?.google_review_link ||
      null;

    return NextResponse.json({
      companyName: (company as any)?.name || '',
      reviewUrl,
    });
  } catch (err) {
    console.error('Review track error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
