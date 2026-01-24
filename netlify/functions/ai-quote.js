// Netlify Function for AI-powered quote suggestions
// Analyzes job descriptions and suggests services with pricing

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
    const { jobDescription, businessType } = JSON.parse(event.body);

    if (!jobDescription || jobDescription.trim().length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide a more detailed job description' }),
      };
    }

    // Build the prompt for service suggestions
    const systemPrompt = `You are an expert estimator for a ${businessType || 'landscaping/lawn care'} business.
Your job is to analyze customer job descriptions and suggest specific services with fair market pricing.

Available standard services (use these when applicable):
- Lawn Mowing: $45-85 depending on yard size
- Hedge Trimming: $65-150 depending on quantity
- Leaf Cleanup: $85-200 depending on area
- Mulch Installation: $120-300 depending on beds
- Sprinkler Check: $55-100 depending on zones
- Tree Trimming: $150-500 depending on size
- Yard Cleanup: $100-250 general cleanup
- Fertilization: $60-120 per application
- Aeration: $80-150 per lawn
- Weed Control: $50-100 per treatment

Guidelines:
1. Break down the job into individual line items
2. Price each item based on the description details
3. Include labor if it's a larger job
4. Be reasonable with pricing - don't overcharge
5. If the description mentions specific measurements or quantities, factor those in
6. Add a small contingency line item for larger jobs`;

    const userPrompt = `Analyze this job request and suggest services with pricing:

"${jobDescription}"

Return a JSON object with this exact format:
{
  "services": [
    {"name": "Service Name", "price": 123, "reason": "Brief reason for this price"}
  ],
  "estimatedHours": 2.5,
  "notes": "Any important notes for the quote"
}

Return ONLY the JSON, no other text.`;

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
        max_tokens: 500,
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
    const content = data.choices[0].message.content.trim();

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    // Validate the response structure
    if (!result.services || !Array.isArray(result.services)) {
      throw new Error('Invalid response structure');
    }

    // Ensure prices are numbers
    result.services = result.services.map(s => ({
      name: String(s.name),
      price: parseFloat(s.price) || 0,
      reason: s.reason || ''
    }));

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
      body: JSON.stringify({ error: 'Failed to generate suggestions' }),
    };
  }
};
