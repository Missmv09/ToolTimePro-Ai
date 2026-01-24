// Netlify Function for AI-powered review response generation
// Analyzes customer reviews and generates professional responses

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
    const { review, rating, platform, businessName, tone } = JSON.parse(event.body);

    if (!review || review.trim().length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide the review text' }),
      };
    }

    // Determine response tone based on rating and user preference
    const isNegative = rating && rating <= 3;
    const responseTone = tone || (isNegative ? 'apologetic' : 'grateful');

    // Build the prompt
    const systemPrompt = `You are a professional review response writer for ${businessName || 'a service business'}.
Your job is to write authentic, personalized responses to customer reviews that can be posted on ${platform || 'review platforms'}.

Guidelines:
1. Keep responses concise (2-4 sentences for positive reviews, 3-5 for negative)
2. Always thank the customer by name if mentioned
3. Reference specific details from their review to show you read it
4. For positive reviews: Express genuine gratitude, reinforce what they liked
5. For negative reviews: Apologize sincerely, take responsibility, offer to make it right
6. End with a forward-looking statement (looking forward to serving again, etc.)
7. Sound human and warm, not corporate or robotic
8. Never be defensive or argumentative with negative reviews
9. Don't use excessive exclamation marks or emojis (1-2 max)
10. Include the owner/manager name signature at the end

Response tone: ${responseTone}
${isNegative ? 'This is a negative review - be empathetic and solution-focused.' : 'This is a positive review - be warm and appreciative.'}`;

    const userPrompt = `Write a response to this ${rating ? rating + '-star' : ''} review:

"${review}"

Platform: ${platform || 'Google'}
Business: ${businessName || 'Pro Landscaping'}

Write ONLY the response text, ready to be copied and pasted. Sign it from "The ${businessName || 'Pro Landscaping'} Team"`;

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.8,
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
    const generatedResponse = data.choices[0].message.content.trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: generatedResponse,
        isNegative: isNegative,
        tone: responseTone
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate response' }),
    };
  }
};
