import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import { createBooking } from '@/lib/booking-core';

// Lazy initialization for Twilio
let twilioClient = null;

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

// Format phone to E.164
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// Send SMS (gracefully fails if Twilio not configured)
async function sendConfirmationSMS({ to, customerName, serviceName, date, time, companyName }) {
  try {
    const client = getTwilioClient();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!client || (!messagingServiceSid && !fromNumber)) {
      console.log('Twilio not configured - skipping SMS');
      return { sent: false, reason: 'not_configured' };
    }

    // Format date for display
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Format time for display
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const formattedTime = `${displayHour}:${minutes} ${ampm}`;

    const smsParams = {
      body: `Hi ${customerName}! Your ${serviceName} appointment with ${companyName} is confirmed for ${formattedDate} at ${formattedTime}. We'll see you then!`,
      to: formatPhone(to),
    };

    if (messagingServiceSid) {
      smsParams.messagingServiceSid = messagingServiceSid;
    } else {
      smsParams.from = fromNumber;
    }

    const message = await client.messages.create(smsParams);

    return { sent: true, messageId: message.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    return { sent: false, error: error.message };
  }
}

// Lazy initialization for Supabase
let supabaseInstance = null;

function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured (SUPABASE_SERVICE_ROLE_KEY is required for bookings)');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseInstance;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const { customerName, customerPhone, smsConsent, notes } = body;

    const supabase = getSupabase();

    // Web bookings are strict about slot conflicts; chatbot/agent bookings
    // (marked in the notes) auto-advance to the next opening.
    const autoAdvance = !!(notes && notes.includes('booked via Jenny AI'));

    const result = await createBooking(supabase, { ...body, autoAdvance });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    const { booking, companyName, leadCreated } = result;

    // Only send SMS if customer consented
    let smsResult = { sent: false, reason: 'no_consent' };
    if (smsConsent) {
      smsResult = await sendConfirmationSMS({
        to: customerPhone,
        customerName,
        serviceName: booking.service,
        date: booking.date,
        time: booking.time,
        companyName,
      });
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        service: booking.service,
        date: booking.date,
        time: booking.time,
        customer: booking.customer,
      },
      leadCreated,
      smsStatus: smsResult.sent ? 'sent' : 'not_sent',
      smsDetail: smsResult.sent ? undefined : (smsResult.reason || smsResult.error),
    });

  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Failed to process booking', details: error.message },
      { status: 500 }
    );
  }
}
