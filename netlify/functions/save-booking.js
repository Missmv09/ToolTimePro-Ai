// Netlify Function to save booking from chatbot
// Stores appointment data for the business to follow up

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const bookingData = JSON.parse(event.body);

    // Validate required fields
    const required = ['date', 'time', 'name', 'phone', 'service'];
    const missing = required.filter(field => !bookingData[field]);

    if (missing.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          missing: missing
        }),
      };
    }

    // In production, this would save to Supabase
    // For now, log and return success
    const appointment = {
      id: `apt_${Date.now()}`,
      ...bookingData,
      status: 'scheduled',
      source: 'chatbot',
      created_at: new Date().toISOString()
    };

    console.log('New booking from chatbot:', appointment);

    // TODO: Save to Supabase when connected
    // const { data, error } = await supabase
    //   .from('jobs')
    //   .insert({
    //     title: `${bookingData.service} - ${bookingData.name}`,
    //     scheduled_date: parseDate(bookingData.date),
    //     scheduled_time_start: parseTime(bookingData.time),
    //     status: 'scheduled',
    //     notes: `Booked via chatbot. Phone: ${bookingData.phone}`
    //   });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Booking saved successfully',
        appointment: appointment
      }),
    };

  } catch (error) {
    console.error('Save booking error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save booking' }),
    };
  }
};
