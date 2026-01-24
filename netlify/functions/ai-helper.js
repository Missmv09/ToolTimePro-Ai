// Netlify Function to call OpenAI for AI-assisted content generation
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

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

  try {
    const { type, industry, businessName, currentValue } = JSON.parse(event.body);

    // Build the prompt based on type
    let prompt;
    switch (type) {
      case 'tagline':
        prompt = `Generate 3 short, catchy taglines for a ${industry} business${businessName ? ` called "${businessName}"` : ''}.
Each tagline should be:
- Maximum 6 words
- Memorable and professional
- Focused on customer benefits

Return ONLY a JSON array of 3 strings, no other text. Example: ["Tagline 1", "Tagline 2", "Tagline 3"]`;
        break;

      case 'services':
        prompt = `Suggest 5 common services for a ${industry} business.
Return ONLY a JSON array of 5 short service names (2-4 words each). Example: ["Service 1", "Service 2", "Service 3", "Service 4", "Service 5"]`;
        break;

      case 'description':
        prompt = `Write a brief 1-sentence description for this ${industry} service: "${currentValue}".
Keep it under 15 words, professional, and customer-focused.
Return ONLY the description text, no quotes.`;
        break;

      case 'businessName':
        prompt = `Suggest 3 professional business names for a ${industry} company.
Each name should be:
- Easy to remember
- Professional sounding
- 2-4 words maximum

Return ONLY a JSON array of 3 strings. Example: ["Name 1", "Name 2", "Name 3"]`;
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid type' }),
        };
    }

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
          {
            role: 'system',
            content: 'You are a helpful assistant for small business owners. You provide concise, professional marketing content. Always follow the exact output format requested.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
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
    const content = data.choices[0].message.content.trim();

    // Parse response based on type
    let result;
    if (type === 'description') {
      result = { suggestion: content };
    } else {
      try {
        result = { suggestions: JSON.parse(content) };
      } catch {
        // If parsing fails, try to extract array-like content
        const match = content.match(/\[.*\]/s);
        if (match) {
          result = { suggestions: JSON.parse(match[0]) };
        } else {
          result = { suggestions: [content] };
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
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
