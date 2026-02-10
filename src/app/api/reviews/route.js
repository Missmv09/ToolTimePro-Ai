import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';

export const dynamic = 'force-dynamic';

// Lazy initialization
let twilioClient = null;
let supabaseInstance = null;

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken) {
      twilioClient = Twilio(accountSid, authToken);
    }
  }
  return twilioClient;
}

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

// Format phone to E.164
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// Send review request SMS
async function sendReviewSMS({ to, customerName, companyName, reviewLink }) {
  try {
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!client || !fromNumber) {
      return { sent: false, reason: 'twilio_not_configured' };
    }

    const message = await client.messages.create({
      body: `Hi ${customerName}! Thanks for choosing ${companyName}. We'd love to hear about your experience! Please leave us a review: ${reviewLink}`,
      to: formatPhone(to),
      from: fromNumber,
    });

    return { sent: true, messageId: message.sid };
  } catch (error) {
    console.error('Review SMS error:', error);
    return { sent: false, error: error.message };
  }
}

// POST - Send a review request
export async function POST(request) {
  try {
    const body = await request.json();
    const { companyId, jobId, customerId, customerName, customerPhone, customerEmail, reviewLink } = body;

    if (!companyId || !customerId || !customerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get company name and review link if not provided
    let companyName = 'Our team';
    let finalReviewLink = reviewLink;

    const { data: company } = await supabase
      .from('companies')
      .select('name, google_review_link, yelp_review_link')
      .eq('id', companyId)
      .single();

    if (company) {
      companyName = company.name;
      if (!finalReviewLink) {
        finalReviewLink = company.google_review_link || company.yelp_review_link;
      }
    }

    // Use a generic review message if no link
    if (!finalReviewLink) {
      finalReviewLink = ''; // Will send without link
    }

    // Try to log the review request (table may not exist)
    let reviewRequestId = null;
    try {
      const { data: reviewRequest } = await supabase
        .from('review_requests')
        .insert({
          company_id: companyId,
          job_id: jobId || null,
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          customer_email: customerEmail || null,
          review_link: finalReviewLink || null,
          status: 'pending',
          channel: customerPhone ? 'sms' : 'email',
        })
        .select('id')
        .single();

      if (reviewRequest) {
        reviewRequestId = reviewRequest.id;
      }
    } catch (err) {
      console.log('Review requests table may not exist:', err.message);
    }

    // Send SMS if phone provided
    let smsResult = { sent: false, reason: 'no_phone' };
    if (customerPhone) {
      const messageText = finalReviewLink
        ? `Hi ${customerName}! Thanks for choosing ${companyName}. We'd love to hear about your experience! Please leave us a review: ${finalReviewLink}`
        : `Hi ${customerName}! Thanks for choosing ${companyName}. We hope you're satisfied with our service. Your feedback means the world to us!`;

      const client = getTwilioClient();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (client && fromNumber) {
        try {
          const message = await client.messages.create({
            body: messageText,
            to: formatPhone(customerPhone),
            from: fromNumber,
          });
          smsResult = { sent: true, messageId: message.sid };

          // Update review request status
          if (reviewRequestId) {
            await supabase
              .from('review_requests')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', reviewRequestId);
          }
        } catch (smsError) {
          smsResult = { sent: false, error: smsError.message };
        }
      } else {
        smsResult = { sent: false, reason: 'twilio_not_configured' };
      }
    }

    return NextResponse.json({
      success: true,
      reviewRequestId,
      smsStatus: smsResult,
    });

  } catch (error) {
    console.error('Review request error:', error);
    return NextResponse.json(
      { error: 'Failed to send review request', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get review requests for a company
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Try to get review requests
    try {
      const { data: reviewRequests, error } = await supabase
        .from('review_requests')
        .select(`
          *,
          customer:customers(name, email, phone),
          job:jobs(title, scheduled_date)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Calculate stats
      const stats = {
        total: reviewRequests?.length || 0,
        sent: reviewRequests?.filter(r => r.status === 'sent').length || 0,
        clicked: reviewRequests?.filter(r => r.status === 'clicked').length || 0,
        reviewed: reviewRequests?.filter(r => r.status === 'reviewed').length || 0,
      };

      return NextResponse.json({
        reviewRequests: reviewRequests || [],
        stats,
      });

    } catch (err) {
      // Table doesn't exist yet - return empty data
      console.log('Review requests table may not exist');
      return NextResponse.json({
        reviewRequests: [],
        stats: { total: 0, sent: 0, clicked: 0, reviewed: 0 },
        tableNotReady: true,
      });
    }

  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to get review requests', details: error.message },
      { status: 500 }
    );
  }
}
