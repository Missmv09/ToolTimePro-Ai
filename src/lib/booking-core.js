// Shared booking core — turns a captured request into a job + customer + lead.
//
// Used by:
//   - POST /api/bookings        (web + chatbot online booking)
//   - Jenny Pro SMS agent       (text → booked job)
//   - Jenny Pro voice receptionist (call → booked job)
//
// This module ONLY touches the database. Sending confirmations (SMS/voice) is
// the caller's responsibility, so each channel can localize its own messaging.

const {
  resolveBusinessHours,
  getDayHours,
  slotsForDay,
  nextOpenDate,
} = require('./business-hours');

// Calculate end time based on start time and duration
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + (durationMinutes || 60);
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Create a booking (job + customer + lead) for a company.
 *
 * @param {object} supabase - An initialized Supabase client (service role).
 * @param {object} params
 * @returns {Promise<{ ok: boolean, status?: number, error?: string, booking?: object, companyName?: string, customerId?: string, leadCreated?: boolean }>}
 */
async function createBooking(supabase, params) {
  const {
    companyId,
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
    smsConsent,
    source,
    // When true, a conflicting slot auto-advances to the next opening instead
    // of failing. Defaults to chatbot/agent behavior when the note marks it.
    autoAdvance,
  } = params;

  if (!companyId || !serviceName || !scheduledDate || !scheduledTimeStart || !customerName || !customerPhone) {
    return { ok: false, status: 400, error: 'Missing required fields' };
  }

  const isFlexibleBooking =
    autoAdvance === true || (notes && notes.includes('booked via Jenny AI'));

  let finalDate = scheduledDate;
  let finalTimeStart = scheduledTimeStart;

  // Tenant context: display name for confirmations, and the business hours
  // configured in Settings (drives auto-advance slot selection below).
  const { data: companyRow } = await supabase
    .from('companies')
    .select('name, business_hours')
    .eq('id', companyId)
    .single();
  const companyName = companyRow?.name || 'Our team';
  const businessHours = resolveBusinessHours(companyRow?.business_hours);

  // Get all booked slots for the requested date
  const { data: existingJobs, error: checkError } = await supabase
    .from('jobs')
    .select('scheduled_time_start')
    .eq('company_id', companyId)
    .eq('scheduled_date', scheduledDate)
    .neq('status', 'cancelled');

  if (checkError) {
    console.error('[booking-core] Error checking availability:', checkError);
    return { ok: false, status: 500, error: 'Failed to check availability' };
  }

  const bookedTimes = new Set((existingJobs || []).map((j) => j.scheduled_time_start));

  if (bookedTimes.has(finalTimeStart)) {
    if (!isFlexibleBooking) {
      return {
        ok: false,
        status: 409,
        error: 'This time slot is no longer available. Please select a different time.',
      };
    }

    // Flexible bookings: find the next open hourly slot within the tenant's
    // configured hours for that day.
    const slots = slotsForDay(getDayHours(businessHours, scheduledDate));
    const nextOpen = slots.find((s) => !bookedTimes.has(s));

    if (nextOpen) {
      finalTimeStart = nextOpen;
    } else {
      // Entire day full (or closed that day) — first slot of the next open day.
      const nextDate = nextOpenDate(businessHours, scheduledDate);
      if (nextDate) {
        finalDate = nextDate;
        finalTimeStart = slotsForDay(getDayHours(businessHours, nextDate))[0] || finalTimeStart;
      }
    }
  }

  const scheduledTimeEnd = calculateEndTime(finalTimeStart, durationMinutes);

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

    const updateData = {
      name: customerName,
      phone: customerPhone,
      updated_at: new Date().toISOString(),
    };
    if (customerAddress) updateData.address = customerAddress;
    if (customerCity) updateData.city = customerCity;
    if (customerState) updateData.state = customerState;
    if (customerZip) updateData.zip = customerZip;
    if (smsConsent) {
      updateData.sms_consent = true;
      updateData.sms_consent_date = new Date().toISOString();
    }

    await supabase.from('customers').update(updateData).eq('id', customerId);
  } else {
    const newCustomerRow = {
      company_id: companyId,
      name: customerName,
      phone: customerPhone,
      source: source || 'online_booking',
      sms_consent: !!smsConsent,
      sms_consent_date: smsConsent ? new Date().toISOString() : null,
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
      console.error('[booking-core] Error creating customer:', customerError);
      return { ok: false, status: 500, error: 'Failed to create customer record' };
    }

    customerId = newCustomer.id;
  }

  // Create the job (booking)
  const jobRow = {
    company_id: companyId,
    customer_id: customerId,
    title: serviceName,
    description: notes || `Booking for ${serviceName}`,
    scheduled_date: finalDate,
    scheduled_time_start: finalTimeStart,
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
    console.error('[booking-core] Error creating job:', jobError);
    return { ok: false, status: 500, error: 'Failed to create booking' };
  }

  // Run lead creation and company name fetch in parallel (independent queries)
  const [leadResult] = await Promise.all([
    supabase.from('leads').insert({
      company_id: companyId,
      customer_id: customerId,
      name: customerName,
      email: customerEmail || null,
      phone: customerPhone,
      address: customerAddress || null,
      service_requested: serviceName,
      message: notes || `Booked ${serviceName} for ${finalDate}`,
      source: source || 'online_booking',
      status: 'new',
    }),
  ]);

  if (leadResult.error) {
    console.error('[booking-core] Lead insert error:', leadResult.error);
  }

  return {
    ok: true,
    booking: {
      id: job.id,
      service: serviceName,
      date: finalDate,
      time: finalTimeStart,
      customer: customerName,
      customerId,
    },
    companyName,
    customerId,
    leadCreated: !leadResult.error,
  };
}

module.exports = { createBooking, calculateEndTime };
