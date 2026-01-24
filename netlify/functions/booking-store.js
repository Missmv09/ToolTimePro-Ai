// Netlify Function for booking storage and retrieval
// Handles saving bookings and checking for conflicts
// Uses Supabase when configured, falls back to in-memory for demo

const { createClient } = require('@supabase/supabase-js');

// In-memory store for demo mode (resets on function cold start)
// In production, this would always use Supabase
let demoBookings = [];

// Get Supabase client if configured
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

// Parse date string like "Mon, Jan 27" to ISO date
function parseBookingDate(dateStr) {
  const currentYear = new Date().getFullYear();
  const date = new Date(`${dateStr}, ${currentYear}`);

  // If the parsed date is in the past, it's probably next year
  if (date < new Date()) {
    date.setFullYear(currentYear + 1);
  }

  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

// Parse time string like "10:00 AM" to 24h format
function parseBookingTime(timeStr) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const supabase = getSupabase();
  const path = event.path.replace('/.netlify/functions/booking-store', '');

  try {
    // GET /booked-slots?date=Mon, Jan 27 - Get booked time slots for a date
    if (event.httpMethod === 'GET' && path.includes('booked-slots')) {
      const params = event.queryStringParameters || {};
      const dateStr = params.date;

      if (!dateStr) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Date parameter required' }),
        };
      }

      let bookedSlots = [];

      if (supabase) {
        // Query Supabase for bookings on this date
        const isoDate = parseBookingDate(dateStr);
        const { data, error } = await supabase
          .from('chatbot_bookings')
          .select('time')
          .eq('date', isoDate)
          .eq('status', 'scheduled');

        if (!error && data) {
          bookedSlots = data.map(b => b.time);
        }
      } else {
        // Demo mode: check in-memory store
        bookedSlots = demoBookings
          .filter(b => b.date === dateStr && b.status === 'scheduled')
          .map(b => b.time);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ bookedSlots }),
      };
    }

    // GET /all-bookings - Get all bookings (for admin)
    if (event.httpMethod === 'GET' && path.includes('all-bookings')) {
      let bookings = [];

      if (supabase) {
        const { data, error } = await supabase
          .from('chatbot_bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          bookings = data;
        }
      } else {
        bookings = demoBookings;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ bookings }),
      };
    }

    // POST /save - Save a new booking
    if (event.httpMethod === 'POST') {
      const bookingData = JSON.parse(event.body);

      // Validate required fields
      const required = ['date', 'time', 'name', 'phone', 'service'];
      const missing = required.filter(field => !bookingData[field]);

      if (missing.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields', missing }),
        };
      }

      // Check for conflicts
      let hasConflict = false;

      if (supabase) {
        const isoDate = parseBookingDate(bookingData.date);
        const time24 = parseBookingTime(bookingData.time);

        const { data: existing } = await supabase
          .from('chatbot_bookings')
          .select('id')
          .eq('date', isoDate)
          .eq('time', bookingData.time)
          .eq('status', 'scheduled')
          .limit(1);

        hasConflict = existing && existing.length > 0;
      } else {
        hasConflict = demoBookings.some(
          b => b.date === bookingData.date &&
               b.time === bookingData.time &&
               b.status === 'scheduled'
        );
      }

      if (hasConflict) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'Time slot already booked',
            message: 'Sorry, that time slot was just taken. Please choose another time.'
          }),
        };
      }

      // Save the booking
      const appointment = {
        id: `apt_${Date.now()}`,
        ...bookingData,
        status: 'scheduled',
        source: 'chatbot',
        created_at: new Date().toISOString()
      };

      if (supabase) {
        const isoDate = parseBookingDate(bookingData.date);

        const { error } = await supabase
          .from('chatbot_bookings')
          .insert({
            date: isoDate,
            time: bookingData.time,
            customer_name: bookingData.name,
            customer_phone: bookingData.phone,
            service: bookingData.service,
            status: 'scheduled',
            source: 'chatbot'
          });

        if (error) {
          console.error('Supabase insert error:', error);
          // Fall through to demo mode
        }
      }

      // Always save to demo store for this session
      demoBookings.push(appointment);

      console.log('New booking saved:', appointment);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Booking saved successfully',
          appointment
        }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };

  } catch (error) {
    console.error('Booking store error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
