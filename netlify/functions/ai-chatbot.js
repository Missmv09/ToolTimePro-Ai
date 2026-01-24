// Netlify Function for AI Chatbot conversations
// Uses OpenAI to power real conversations for service businesses
// Includes in-chat booking flow for seamless appointment scheduling

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
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
    const { message, conversationHistory, businessType, businessName, bookingState } = JSON.parse(event.body);

    // Detect booking intent from user message
    const bookingIntent = detectBookingIntent(message, conversationHistory);

    // Handle booking flow if active
    if (bookingState || bookingIntent.wantsToBook) {
      return await handleBookingFlow(message, conversationHistory, bookingState, bookingIntent, businessName, headers);
    }

    // Build the system prompt for a service business chatbot
    const systemPrompt = `You are a friendly, helpful AI assistant for ${businessName || 'a local service business'} (${businessType || 'home services'}).

Your job is to:
1. Answer questions about services, pricing, and availability
2. Capture leads by collecting name, phone, and service needs
3. Help schedule appointments
4. Be warm, professional, and concise

Business Info:
- Services: Lawn care ($45-85/visit), landscaping (custom), tree trimming ($100-300), yard cleanup ($65-120)
- Service area: Local metro area, within 25 miles
- Hours: Mon-Sat 7am-6pm
- Response time: Same-day quotes, next-day service available

Guidelines:
- Keep responses under 3 sentences unless listing info
- Always try to move toward booking or getting contact info
- Use emojis sparingly (1-2 max per message)
- If they share a phone number, confirm you've captured it and someone will call soon
- Suggest quick follow-up actions
- When someone wants to book, encourage them to use the booking feature

Never make up specific appointment times - guide them to use the booking option instead.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'AI service error' }),
      };
    }

    const data = await response.json();
    const reply = data.choices[0].message.content.trim();

    // Check if a lead was captured (phone number mentioned)
    const phonePattern = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10}/;
    const leadCaptured = phonePattern.test(message);

    // Generate quick reply suggestions based on context
    let quickReplies = [];
    const lowerReply = reply.toLowerCase();
    const lowerMessage = message.toLowerCase();

    if (lowerReply.includes('quote') || lowerReply.includes('price')) {
      quickReplies = ['Yes, get me a quote', 'What\'s included?', 'Book appointment'];
    } else if (lowerReply.includes('call') || lowerReply.includes('contact')) {
      quickReplies = ['Yes, call me', 'I\'ll call you instead', 'Book online instead'];
    } else if (lowerReply.includes('schedule') || lowerReply.includes('appointment') || lowerReply.includes('book')) {
      quickReplies = ['Book now', 'This week works', 'Next week'];
    } else if (leadCaptured) {
      quickReplies = ['Thanks!', 'Book appointment'];
    } else {
      quickReplies = ['Get a quote', 'Learn more', 'Book now'];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: reply,
        quickReplies: quickReplies,
        leadCaptured: leadCaptured,
        bookingState: null
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Detect if user wants to book an appointment
function detectBookingIntent(message, history) {
  const lowerMessage = message.toLowerCase();

  const bookingKeywords = [
    'book', 'schedule', 'appointment', 'available', 'availability',
    'book now', 'book an appointment', 'schedule a visit', 'when can you come',
    'set up', 'arrange', 'reserve', 'slot', 'time slot', 'book online'
  ];

  const wantsToBook = bookingKeywords.some(keyword => lowerMessage.includes(keyword));

  return {
    wantsToBook,
    keyword: bookingKeywords.find(k => lowerMessage.includes(k)) || null
  };
}

// Handle the booking flow state machine
async function handleBookingFlow(message, conversationHistory, bookingState, bookingIntent, businessName, headers) {
  const lowerMessage = message.toLowerCase();

  // Initialize booking state if starting fresh
  if (!bookingState) {
    bookingState = { step: 'select_date' };
  }

  let reply = '';
  let quickReplies = [];
  let newBookingState = { ...bookingState };
  let bookingComplete = false;
  let bookingData = null;

  switch (bookingState.step) {
    case 'select_date':
      // Generate available dates (next 7 business days)
      const availableDates = getAvailableDates();
      reply = `Great! Let's get you scheduled. 📅\n\nPlease select a date that works for you:`;
      quickReplies = availableDates;
      newBookingState = { step: 'awaiting_date', availableDates };
      break;

    case 'awaiting_date':
      // Check if user selected a valid date
      const selectedDate = parseSelectedDate(message, bookingState.availableDates);
      if (selectedDate) {
        // Fetch already booked slots for this date
        const bookedSlots = await fetchBookedSlots(selectedDate);
        const availableSlots = await getAvailableTimeSlots(selectedDate, bookedSlots);

        if (availableSlots.length === 0) {
          reply = `Sorry, ${selectedDate} is fully booked. 😔\n\nPlease choose another date:`;
          quickReplies = bookingState.availableDates.filter(d => d !== selectedDate);
          newBookingState = bookingState;
        } else {
          reply = `Perfect! ${selectedDate} works great. ⏰\n\nWhat time would you prefer?`;
          quickReplies = availableSlots;
          newBookingState = {
            step: 'awaiting_time',
            selectedDate,
            availableSlots,
            bookedSlots
          };
        }
      } else {
        reply = `I didn't catch that date. Please select from the available options:`;
        quickReplies = bookingState.availableDates;
        newBookingState = bookingState;
      }
      break;

    case 'awaiting_time':
      // Check if user selected a valid time
      const selectedTime = parseSelectedTime(message, bookingState.availableSlots);
      if (selectedTime) {
        reply = `Excellent! ${bookingState.selectedDate} at ${selectedTime}. 👍\n\nNow I just need your name to complete the booking:`;
        quickReplies = [];
        newBookingState = {
          step: 'awaiting_name',
          selectedDate: bookingState.selectedDate,
          selectedTime
        };
      } else {
        reply = `Please select a time from the available slots:`;
        quickReplies = bookingState.availableSlots;
        newBookingState = bookingState;
      }
      break;

    case 'awaiting_name':
      // Capture name
      const name = message.trim();
      if (name.length >= 2) {
        reply = `Thanks, ${name}! 📱\n\nLastly, what's the best phone number to reach you?`;
        quickReplies = [];
        newBookingState = {
          step: 'awaiting_phone',
          selectedDate: bookingState.selectedDate,
          selectedTime: bookingState.selectedTime,
          customerName: name
        };
      } else {
        reply = `Please enter your full name:`;
        quickReplies = [];
        newBookingState = bookingState;
      }
      break;

    case 'awaiting_phone':
      // Capture phone
      const phonePattern = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10}/;
      const phoneMatch = message.match(phonePattern);
      if (phoneMatch) {
        const phone = phoneMatch[0];
        reply = `What service would you like to book?`;
        quickReplies = ['Lawn Care', 'Landscaping', 'Tree Trimming', 'Yard Cleanup'];
        newBookingState = {
          step: 'awaiting_service',
          selectedDate: bookingState.selectedDate,
          selectedTime: bookingState.selectedTime,
          customerName: bookingState.customerName,
          customerPhone: phone
        };
      } else {
        reply = `Please enter a valid phone number (e.g., 555-123-4567):`;
        quickReplies = [];
        newBookingState = bookingState;
      }
      break;

    case 'awaiting_service':
      // Capture service type
      const services = ['lawn care', 'landscaping', 'tree trimming', 'yard cleanup'];
      const selectedService = services.find(s => lowerMessage.includes(s)) ||
                              (lowerMessage.length > 2 ? message.trim() : null);

      if (selectedService) {
        bookingComplete = true;
        bookingData = {
          date: bookingState.selectedDate,
          time: bookingState.selectedTime,
          name: bookingState.customerName,
          phone: bookingState.customerPhone,
          service: selectedService
        };

        reply = `🎉 Booking Confirmed!\n\n` +
                `📅 ${bookingState.selectedDate}\n` +
                `⏰ ${bookingState.selectedTime}\n` +
                `👤 ${bookingState.customerName}\n` +
                `📱 ${bookingState.customerPhone}\n` +
                `🔧 ${selectedService.charAt(0).toUpperCase() + selectedService.slice(1)}\n\n` +
                `You'll receive a confirmation text shortly. We look forward to serving you!`;
        quickReplies = ['Thanks!', 'I have another question'];
        newBookingState = null; // Reset booking state
      } else {
        reply = `What type of service do you need?`;
        quickReplies = ['Lawn Care', 'Landscaping', 'Tree Trimming', 'Yard Cleanup'];
        newBookingState = bookingState;
      }
      break;

    default:
      // Reset if unknown state
      newBookingState = null;
      reply = `I'm sorry, something went wrong. Would you like to start booking again?`;
      quickReplies = ['Book now', 'Talk to someone'];
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      reply,
      quickReplies,
      bookingState: newBookingState,
      bookingComplete,
      bookingData,
      leadCaptured: bookingComplete
    }),
  };
}

// Generate available dates (next 7 business days, Mon-Sat)
function getAvailableDates() {
  const dates = [];
  const today = new Date();
  let daysAdded = 0;
  let currentDate = new Date(today);

  // Start from tomorrow
  currentDate.setDate(currentDate.getDate() + 1);

  while (daysAdded < 6) {
    const dayOfWeek = currentDate.getDay();
    // Skip Sunday (0)
    if (dayOfWeek !== 0) {
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      dates.push(currentDate.toLocaleDateString('en-US', options));
      daysAdded++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// Get available time slots for a given date (checks against booked slots)
async function getAvailableTimeSlots(date, bookedSlots = []) {
  const allSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
  ];

  // Filter out already booked slots
  const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

  return availableSlots;
}

// Fetch booked slots from booking store
async function fetchBookedSlots(date) {
  try {
    // Use internal function URL or environment-configured URL
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const response = await fetch(
      `${baseUrl}/.netlify/functions/booking-store/booked-slots?date=${encodeURIComponent(date)}`
    );

    if (response.ok) {
      const data = await response.json();
      return data.bookedSlots || [];
    }
  } catch (error) {
    console.log('Could not fetch booked slots, using empty list:', error.message);
  }
  return [];
}

// Parse user's date selection
function parseSelectedDate(message, availableDates) {
  const lowerMessage = message.toLowerCase();

  // Direct match
  const directMatch = availableDates.find(d =>
    lowerMessage.includes(d.toLowerCase())
  );
  if (directMatch) return directMatch;

  // Partial match (e.g., "Monday" or "the 15th")
  for (const date of availableDates) {
    const parts = date.toLowerCase().split(' ');
    if (parts.some(p => lowerMessage.includes(p) && p.length > 2)) {
      return date;
    }
  }

  // First option selection
  if (lowerMessage.includes('first') || lowerMessage.includes('earliest') || lowerMessage === '1') {
    return availableDates[0];
  }

  return null;
}

// Parse user's time selection
function parseSelectedTime(message, availableSlots) {
  const lowerMessage = message.toLowerCase().replace(/\s+/g, ' ').trim();

  // Direct match
  const directMatch = availableSlots.find(t =>
    lowerMessage.includes(t.toLowerCase().replace(/\s+/g, ' '))
  );
  if (directMatch) return directMatch;

  // Partial match (e.g., "8" or "8am" or "morning")
  for (const slot of availableSlots) {
    const hour = slot.split(':')[0];
    const period = slot.includes('AM') ? 'am' : 'pm';

    if (lowerMessage.includes(hour) ||
        lowerMessage.includes(`${hour}${period}`) ||
        lowerMessage.includes(`${hour} ${period}`)) {
      return slot;
    }
  }

  // Morning/afternoon preferences
  if (lowerMessage.includes('morning') || lowerMessage.includes('early')) {
    return availableSlots.find(s => s.includes('AM'));
  }
  if (lowerMessage.includes('afternoon') || lowerMessage.includes('later')) {
    return availableSlots.find(s => s.includes('PM'));
  }

  // First/earliest selection
  if (lowerMessage.includes('first') || lowerMessage.includes('earliest') || lowerMessage === '1') {
    return availableSlots[0];
  }

  return null;
}
