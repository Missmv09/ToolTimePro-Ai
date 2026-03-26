import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendQuoteFollowUpDigestEmail } from '@/lib/email';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

// Schedule: Daily at 8:00 AM PT via external cron
// Endpoint: GET /api/quote-reminders
// Auth: Authorization: Bearer <CRON_SECRET>

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface QuoteRow {
  id: string;
  quote_number: string | null;
  title: string | null;
  total: number;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  valid_until: string | null;
  follow_up_date: string | null;
  last_followed_up_at: string | null;
  customer: { name: string; phone: string | null; email: string | null } | null;
}

interface ClassifiedQuote {
  quoteNumber: string;
  customerName: string;
  customerPhone: string | null;
  total: number;
  daysSinceSent: number;
  priority: 'hot' | 'warm' | 'stale' | 'expiring';
  action: string;
  validUntil?: string;
}

function classifyQuotes(quotes: QuoteRow[], staleDays: number): ClassifiedQuote[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const classified: ClassifiedQuote[] = [];

  for (const q of quotes) {
    const sentDate = q.sent_at ? new Date(q.sent_at) : new Date(q.sent_at || now);
    const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
    const base = {
      quoteNumber: q.quote_number || q.id.slice(0, 8),
      customerName: q.customer?.name || 'Unknown',
      customerPhone: q.customer?.phone || null,
      total: q.total,
      daysSinceSent,
    };

    // HOT: Overdue follow-up date OR high-value viewed but not approved
    if (q.follow_up_date && q.follow_up_date < today) {
      classified.push({ ...base, priority: 'hot', action: 'Follow-up is overdue — call today' });
      continue;
    }
    if (q.total >= 1000 && q.viewed_at && q.status === 'viewed') {
      const viewedDate = new Date(q.viewed_at);
      const hoursSinceViewed = (now.getTime() - viewedDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceViewed >= 24) {
        classified.push({ ...base, priority: 'hot', action: 'Viewed but not approved — call now' });
        continue;
      }
    }

    // WARM: Follow-up due today OR recently viewed with no action
    if (q.follow_up_date && q.follow_up_date === today) {
      classified.push({ ...base, priority: 'warm', action: 'Follow-up is due today' });
      continue;
    }
    if (q.viewed_at && !q.follow_up_date) {
      const viewedDate = new Date(q.viewed_at);
      const hoursSinceViewed = (now.getTime() - viewedDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceViewed >= 24 && hoursSinceViewed < 72) {
        classified.push({ ...base, priority: 'warm', action: 'Viewed but no response yet' });
        continue;
      }
    }

    // EXPIRING: valid_until within 3 days
    if (q.valid_until) {
      const expiresDate = new Date(q.valid_until);
      const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 3) {
        classified.push({ ...base, priority: 'expiring' as const, action: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`, validUntil: q.valid_until });
        continue;
      }
    }

    // STALE: Sent stale_days+ ago, never viewed, no follow-up date
    if (!q.viewed_at && !q.follow_up_date && daysSinceSent >= staleDays) {
      classified.push({ ...base, priority: 'stale', action: 'Never opened — resend or verify email' });
      continue;
    }

    // STALE: Viewed long ago but no follow-up set
    if (q.viewed_at && !q.follow_up_date && daysSinceSent >= staleDays * 2) {
      classified.push({ ...base, priority: 'stale', action: `Viewed ${daysSinceSent}d ago — needs follow-up` });
    }
  }

  return classified;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    emailsSent: [] as string[],
    smsSent: [] as string[],
    skipped: [] as string[],
    errors: [] as string[],
  };

  try {
    const supabase = getSupabaseAdmin();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tooltimepro.com';

    // Get all companies (reminders enabled by default)
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('id, name, phone, quote_reminder_settings');

    if (compError) {
      return NextResponse.json({ error: compError.message }, { status: 500 });
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: 'No companies to process', results });
    }

    for (const company of companies) {
      const settings = (company.quote_reminder_settings as Record<string, unknown>) || {};
      if (settings.enabled === false) {
        results.skipped.push(company.name);
        continue;
      }

      const staleDays = (settings.stale_days as number) || 3;
      const emailEnabled = settings.email_enabled !== false;
      const smsEnabled = settings.sms_enabled === true;
      const smsPhone = (settings.sms_phone as string) || company.phone;

      // Fetch open quotes with customer info
      const { data: quotes, error: qError } = await supabase
        .from('quotes')
        .select('id, quote_number, title, total, status, sent_at, viewed_at, valid_until, follow_up_date, last_followed_up_at, customer:customers(name, phone, email)')
        .eq('company_id', company.id)
        .in('status', ['sent', 'viewed']);

      if (qError || !quotes || quotes.length === 0) {
        if (qError) results.errors.push(`${company.name}: ${qError.message}`);
        else results.skipped.push(company.name);
        continue;
      }

      const classified = classifyQuotes(quotes as unknown as QuoteRow[], staleDays);

      if (classified.length === 0) {
        results.skipped.push(company.name);
        continue;
      }

      // Get company owner
      const { data: owner } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('company_id', company.id)
        .eq('role', 'owner')
        .single();

      if (!owner) {
        results.errors.push(`${company.name}: No owner found`);
        continue;
      }

      const hot = classified.filter(q => q.priority === 'hot');
      const warm = classified.filter(q => q.priority === 'warm');
      const stale = classified.filter(q => q.priority === 'stale');
      const expiring = classified.filter(q => q.priority === 'expiring');

      // Send digest email
      if (emailEnabled) {
        try {
          await sendQuoteFollowUpDigestEmail({
            to: owner.email,
            ownerName: owner.full_name?.split(' ')[0] || 'there',
            companyName: company.name,
            hotQuotes: hot,
            warmQuotes: warm,
            staleQuotes: stale,
            expiringQuotes: expiring,
            dashboardLink: `${baseUrl}/dashboard/quotes`,
          });
          results.emailsSent.push(owner.email);
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : 'Unknown error';
          results.errors.push(`${company.name} email: ${msg}`);
        }
      }

      // Send SMS for HOT quotes only
      if (smsEnabled && smsPhone && hot.length > 0) {
        try {
          const highestValue = Math.max(...classified.map(q => q.total));
          await sendSMS({
            to: smsPhone,
            body: `ToolTime Pro: ${hot.length} urgent quote${hot.length !== 1 ? 's' : ''} need follow-up (${classified.length} total). Highest value: $${highestValue.toLocaleString()}. View: ${baseUrl}/dashboard/quotes`,
          });
          results.smsSent.push(smsPhone);
        } catch (smsErr) {
          const msg = smsErr instanceof Error ? smsErr.message : 'Unknown error';
          results.errors.push(`${company.name} sms: ${msg}`);
        }
      }
    }

    return NextResponse.json({ message: 'Quote reminders processed', results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
