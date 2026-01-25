import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';

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
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!client || !fromNumber) {
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

    const message = await client.messages.create({
      body: `Hi ${customerName}! Your ${serviceName} appointment with ${companyName} is confirmed for ${formattedDate} at ${formattedTime}. We'll see you then!`,
      to: formatPhone(to),
      from: fromNumber,
    });

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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseInstance;
}

// Calculate end time based on start time and duration
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      companyId,
      serviceId,
      serviceName,
      scheduledDate,
      scheduledTimeStart,
      durationMinutes,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerState,
      customerZip,
      notes,
    } = body;

    // Validate required fields
    if (!companyId || !serviceName || !scheduledDate || !scheduledTimeStart || !customerName || !customerEmail || !customerPhone || !customerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Calculate end time
    const scheduledTimeEnd = calculateEndTime(scheduledTimeStart, durationMinutes || 60);

    // Check if the time slot is still available
    const { data: existingJobs, error: checkError } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', companyId)
      .eq('scheduled_date', scheduledDate)
      .eq('scheduled_time_start', scheduledTimeStart)
      .neq('status', 'cancelled')
      .limit(1);

    if (checkError) {
      console.error('Error checking availability:', checkError);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    if (existingJobs && existingJobs.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select a different time.' },
        { status: 409 }
      );
    }

    // Check if customer already exists
    let customerId = null;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', customerEmail)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;

      // Update customer info
      await supabase
        .from('customers')
        .update({
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          city: customerCity,
          state: customerState,
          zip: customerZip,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          company_id: companyId,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress,
          city: customerCity,
          state: customerState,
          zip: customerZip,
          source: 'online_booking',
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return NextResponse.json(
          { error: 'Failed to create customer record' },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // Create the job (booking)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        title: serviceName,
        description: notes || `Online booking for ${serviceName}`,
        address: customerAddress,
        city: customerCity,
        state: customerState,
        zip: customerZip,
        scheduled_date: scheduledDate,
        scheduled_time_start: scheduledTimeStart,
        scheduled_time_end: scheduledTimeEnd,
        status: 'scheduled',
        priority: 'normal',
        notes: notes || null,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Also create a lead for tracking
    await supabase
      .from('leads')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
        service_requested: serviceName,
        message: notes || `Booked ${serviceName} for ${scheduledDate}`,
        source: 'online_booking',
        status: 'won', // Already converted to a booking
      });

    // Get company name for SMS
    let companyName = 'Our team';
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
    if (company?.name) {
      companyName = company.name;
    }

    // Send confirmation SMS (non-blocking)
    const smsResult = await sendConfirmationSMS({
      to: customerPhone,
      customerName,
      serviceName,
      date: scheduledDate,
      time: scheduledTimeStart,
      companyName,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: job.id,
        service: serviceName,
        date: scheduledDate,
        time: scheduledTimeStart,
        customer: customerName,
      },
      smsStatus: smsResult.sent ? 'sent' : 'not_sent',
    });

  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Failed to process booking', details: error.message },
      { status: 500 }
    );
  }
}
