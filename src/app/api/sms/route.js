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
    if (!accountSid || !authToken) {
      return null;
    }
    twilioClient = Twilio(accountSid, authToken);
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

// SMS Templates
const TEMPLATES = {
  booking_confirmation: (data) =>
    `Hi ${data.customerName}! Your ${data.serviceName} appointment with ${data.companyName} is confirmed for ${data.date} at ${data.time}. We'll see you then!`,

  booking_reminder: (data) =>
    `Reminder: Your ${data.serviceName} appointment with ${data.companyName} is tomorrow (${data.date}) at ${data.time}. See you then!`,

  job_complete: (data) =>
    data.reviewLink
      ? `Hi ${data.customerName}! Thanks for choosing ${data.companyName}. We'd love your feedback: ${data.reviewLink}`
      : `Hi ${data.customerName}! Thanks for choosing ${data.companyName}. We hope you're satisfied with our service!`,

  running_late: (data) =>
    `Hi ${data.customerName}, ${data.companyName} here. Our team is running a bit late - estimated arrival: ${data.estimatedArrival}. We apologize for any inconvenience.`,

  worker_assignment: (data) =>
    `Hi ${data.workerName}! New job assigned: ${data.customerName} at ${data.address}, ${data.time}. Check the app for details.`,

  quote_sent: (data) =>
    `Hi ${data.customerName}, your quote from ${data.companyName} is ready! View it here: ${data.quoteLink}`,

  invoice_sent: (data) =>
    `Hi ${data.customerName}, your invoice from ${data.companyName} is ready. Pay here: ${data.invoiceLink}`,

  custom: (data) => data.message,
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, template, data, companyId, customMessage } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    if (!template && !customMessage) {
      return NextResponse.json({ error: 'Template or customMessage required' }, { status: 400 });
    }

    // Get Twilio client
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!client || !fromNumber) {
      return NextResponse.json({ error: 'Twilio SMS service is not configured' }, { status: 500 });
    }

    // Build message from template or custom
    let messageBody;
    if (customMessage) {
      messageBody = customMessage;
    } else if (TEMPLATES[template]) {
      messageBody = TEMPLATES[template](data || {});
    } else {
      return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
    }

    // Send SMS
    const message = await client.messages.create({
      body: messageBody,
      to: formatPhone(to),
      from: fromNumber,
    });

    // Log the SMS if we have a company ID
    if (companyId) {
      const supabase = getSupabase();
      await supabase.from('sms_logs').insert({
        company_id: companyId,
        to_phone: formatPhone(to),
        message: messageBody,
        template: template || 'custom',
        status: 'sent',
        twilio_sid: message.sid,
      }).catch((err) => {
        // Don't fail if logging fails - sms_logs table may not exist yet
        console.log('SMS log insert skipped:', err.message);
      });
    }

    return NextResponse.json({
      success: true,
      messageId: message.sid,
      status: message.status,
    });

  } catch (error) {
    console.error('SMS API error:', error);

    // Handle specific Twilio errors
    if (error.code === 21211) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }
    if (error.code === 21608) {
      return NextResponse.json({ error: 'Phone number not verified for trial account' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to send SMS', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check Twilio configuration status
export async function GET() {
  const configured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );

  return NextResponse.json({
    configured,
    templates: Object.keys(TEMPLATES),
  });
}
