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

    // Validate required fields (email & address optional for chatbot bookings)
    if (!companyId || !serviceName || !scheduledDate || !scheduledTimeStart || !customerName || !customerPhone) {
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

    // Check if customer already exists (by email if available, otherwise by phone)
    let customerId = null;
    let existingCustomerQuery = supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId);

    if (customerEmail) {
      existingCustomerQuery = existingCustomerQuery.eq('email', customerEmail);
    } else {
      existingCustomerQuery = existingCustomerQuery.eq('phone', customerPhone);
    }

    const { data: existingCustomer } = await existingCustomerQuery.single();

    if (existingCustomer) {
      customerId = existingCustomer.id;

      // Update customer info (only set fields that are provided)
      const updateData = { name: customerName, phone: customerPhone, updated_at: new Date().toISOString() };
      if (customerAddress) updateData.address = customerAddress;
      if (customerCity) updateData.city = customerCity;
      if (customerState) updateData.state = customerState;
      if (customerZip) updateData.zip = customerZip;

      await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId);
    } else {
      // Create new customer
      const newCustomerRow = {
          company_id: companyId,
          name: customerName,
          phone: customerPhone,
          source: 'online_booking',
        };
      if (customerEmail) newCustomerRow.email = customerEmail;
      if (customerAddress) newCustomerRow.address = customerAddress;
      if (customerCity) newCustomerRow.city = customerCity;
      if (customerState) newCustomerRow.state = customerState;
      if (customerZip) newCustomerRow.zip = customerZip;

      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert(newCustomerRow)
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
    const jobRow = {
        company_id: companyId,
        customer_id: customerId,
        title: serviceName,
        description: notes || `Online booking for ${serviceName}`,
        scheduled_date: scheduledDate,
        scheduled_time_start: scheduledTimeStart,
        scheduled_time_end: scheduledTimeEnd,
        status: 'scheduled',
        priority: 'normal',
        notes: notes || null,
      };
    if (customerAddress) jobRow.address = customerAddress;
    if (customerCity) jobRow.city = customerCity;
    if (customerState) jobRow.state = customerState;
    if (customerZip) jobRow.zip = customerZip;

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert(jobRow)
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Run lead creation and company name fetch in parallel (independent queries)
    const [leadResult, companyResult] = await Promise.all([
      supabase
        .from('leads')
        .insert({
          company_id: companyId,
          customer_id: customerId,
          name: customerName,
          email: customerEmail || null,
          phone: customerPhone,
          address: customerAddress || null,
          service_requested: serviceName,
          message: notes || `Booked ${serviceName} for ${scheduledDate}`,
          source: 'online_booking',
          status: 'new',
        }),
      supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single(),
    ]);

    if (leadResult.error) {
      console.error('Lead insert error:', leadResult.error);
    }

    const companyName = companyResult.data?.name || 'Our team';

    // Await SMS so we can report real status
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
      leadCreated: !leadResult.error,
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
