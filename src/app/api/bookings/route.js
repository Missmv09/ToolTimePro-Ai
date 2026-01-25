import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    return NextResponse.json({
      success: true,
      booking: {
        id: job.id,
        service: serviceName,
        date: scheduledDate,
        time: scheduledTimeStart,
        customer: customerName,
      },
    });

  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Failed to process booking', details: error.message },
      { status: 500 }
    );
  }
}
