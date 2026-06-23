// Helpers so Jenny is aware of a customer's existing appointments — prevents
// duplicate bookings and lets her reschedule instead of re-creating.

const { calculateEndTime } = require('./booking-core');

/**
 * Upcoming, non-cancelled appointments for a customer (matched by phone).
 * @returns {Promise<Array<{id, title, scheduled_date, scheduled_time_start}>>}
 */
async function getUpcomingBookings(supabase, companyId, customerPhone) {
  const cleanPhone = String(customerPhone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length < 7) return [];

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('company_id', companyId)
    .ilike('phone', `%${cleanPhone}%`)
    .limit(1)
    .maybeSingle();
  if (!customer?.id) return [];

  const today = new Date().toISOString().split('T')[0];
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, scheduled_date, scheduled_time_start')
    .eq('company_id', companyId)
    .eq('customer_id', customer.id)
    .gte('scheduled_date', today)
    .neq('status', 'cancelled')
    .order('scheduled_date', { ascending: true })
    .limit(10);

  return jobs || [];
}

/** True if any existing booking is at the same date AND time as the request. */
function isDuplicate(existing, date, time) {
  return (existing || []).some(
    (b) => b.scheduled_date === date && b.scheduled_time_start === time
  );
}

/** Move an existing appointment to a new date/time. */
async function rescheduleBooking(supabase, jobId, { date, time, durationMinutes }) {
  const { error } = await supabase
    .from('jobs')
    .update({
      scheduled_date: date,
      scheduled_time_start: time,
      scheduled_time_end: calculateEndTime(time, durationMinutes || 60),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  return { ok: !error, error };
}

module.exports = { getUpcomingBookings, isDuplicate, rescheduleBooking };
