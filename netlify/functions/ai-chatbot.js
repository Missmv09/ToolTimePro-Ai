// Netlify Function for AI Chatbot conversations
// Uses OpenAI to power real conversations for service businesses

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
    const { message, conversationHistory, businessType, businessName } = JSON.parse(event.body);

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

Never make up specific appointment times - say "I can have someone call you to schedule" instead.`;

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
      quickReplies = ['Yes, call me', 'I\'ll call you instead', 'Send me info'];
    } else if (lowerReply.includes('schedule') || lowerReply.includes('appointment')) {
      quickReplies = ['This week works', 'Next week', 'Call me to schedule'];
    } else if (leadCaptured) {
      quickReplies = ['Thanks!', 'Any other questions?'];
    } else {
      quickReplies = ['Get a quote', 'Learn more', 'Book now'];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: reply,
        quickReplies: quickReplies,
        leadCaptured: leadCaptured
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
