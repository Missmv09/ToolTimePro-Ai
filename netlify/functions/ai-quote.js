// Netlify Function for AI-powered quote suggestions
// Analyzes job descriptions, voice transcripts, and generates tiered pricing

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
    const {
      jobDescription,
      businessType,
      inputType = 'text', // 'text', 'voice', or 'description'
      generateTiers = false,
      customerAddress = '',
      existingItems = []
    } = JSON.parse(event.body);

    if (!jobDescription || jobDescription.trim().length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide a more detailed job description' }),
      };
    }

    // Build context-aware system prompt
    const systemPrompt = `You are an expert estimator for a ${businessType || 'landscaping/lawn care'} business.
You excel at understanding customer requests (whether typed, spoken, or described) and creating accurate, competitive quotes.

Your expertise includes analyzing:
- Lawn care (mowing, edging, fertilization, aeration, overseeding, dethatching)
- Tree and shrub services (trimming, shaping, removal, stump grinding, planting)
- Landscape maintenance (mulching, bed cleanup, leaf removal, seasonal prep)
- Hardscaping (patios, walkways, retaining walls, drainage)
- Irrigation (sprinkler repair, winterization, new installations)
- Specialty services (pool service, gutter cleaning, pressure washing, window cleaning)
- Pest and weed control
- Snow removal (if seasonal)

Pricing Guidelines (2024 market rates):
- Lawn Mowing: $35-100 based on lot size (1/4 acre = $45, 1/2 acre = $65, 1 acre = $95)
- Edging/Trimming: $15-35 add-on
- Hedge Trimming: $3-6 per linear foot, minimum $65
- Tree Trimming: $75-500 per tree based on size and complexity
- Mulch Installation: $75-125 per cubic yard installed
- Leaf Cleanup: $150-400 based on property size
- Gutter Cleaning: $100-250 based on linear feet
- Pressure Washing: $0.15-0.40 per sq ft
- Aeration: $0.02-0.04 per sq ft, minimum $80
- Fertilization: $0.01-0.02 per sq ft, minimum $60

IMPORTANT:
- When processing voice transcripts, interpret natural speech patterns and extract the intended services
- Always include quantity and unit where appropriate
- Factor in complexity, access difficulty, and property size when mentioned
- Be thorough but fair with pricing`;

    // Different prompts based on input type
    let userPrompt;

    if (inputType === 'voice') {
      userPrompt = `The following is a VOICE TRANSCRIPT from a contractor describing a job.
Natural speech may include filler words, corrections, or informal descriptions.
Extract all services mentioned and create professional line items with accurate pricing.

Voice Transcript:
"${jobDescription}"

${customerAddress ? `Customer Location: ${customerAddress}` : ''}
${existingItems.length > 0 ? `\nExisting quote items to consider: ${JSON.stringify(existingItems)}` : ''}`;
    } else {
      userPrompt = `Analyze this job request and create a detailed quote:

"${jobDescription}"

${customerAddress ? `Customer Location: ${customerAddress}` : ''}
${existingItems.length > 0 ? `\nExisting quote items: ${JSON.stringify(existingItems)}` : ''}`;
    }

    // Add tier generation if requested
    if (generateTiers) {
      userPrompt += `

Also generate Good/Better/Best pricing tiers with specific differences:
- Good: Essential services only, basic execution
- Better: Standard service with added value (recommended tier)
- Best: Premium service with extras, priority scheduling, and comprehensive coverage`;
    }

    userPrompt += `

Return a JSON object with this exact format:
{
  "services": [
    {
      "name": "Service Name",
      "description": "Detailed description of the service",
      "quantity": 1,
      "unit": "each|hour|sqft|linear_ft|cubic_yard",
      "price": 123,
      "marketRange": { "min": 100, "max": 150 },
      "reason": "Brief pricing justification"
    }
  ],
  "upsells": [
    {
      "name": "Additional Service",
      "description": "Why they might want this",
      "price": 100,
      "value": "Benefit to customer"
    }
  ],
  ${generateTiers ? `"tiers": {
    "good": {
      "name": "Essential",
      "description": "Basic service package",
      "services": ["list of service names included"],
      "multiplier": 1.0,
      "savings": null
    },
    "better": {
      "name": "Standard",
      "description": "Recommended package with added value",
      "services": ["list of service names included"],
      "multiplier": 1.35,
      "extras": ["Additional services included"]
    },
    "best": {
      "name": "Premium",
      "description": "Comprehensive full-service package",
      "services": ["list of service names included"],
      "multiplier": 1.7,
      "extras": ["Premium additions"]
    }
  },` : ''}
  "estimatedHours": 2.5,
  "difficulty": "easy|moderate|challenging",
  "notes": "Professional notes about the job",
  "warnings": ["Any concerns or things to verify with customer"]
}

Return ONLY the JSON, no other text.`;

    // Call OpenAI with GPT-4o for better understanding
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.5,
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
      result.services = [];
    }

    // Ensure services have required fields
    result.services = result.services.map(s => ({
      name: String(s.name || 'Service'),
      description: String(s.description || s.name || ''),
      quantity: parseFloat(s.quantity) || 1,
      unit: ['each', 'hour', 'sqft', 'linear_ft', 'cubic_yard'].includes(s.unit) ? s.unit : 'each',
      price: parseFloat(s.price) || 0,
      marketRange: s.marketRange || null,
      reason: s.reason || ''
    }));

    // Ensure upsells exist
    if (!result.upsells || !Array.isArray(result.upsells)) {
      result.upsells = [];
    }

    // Ensure warnings exist
    if (!result.warnings || !Array.isArray(result.warnings)) {
      result.warnings = [];
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
      body: JSON.stringify({ error: 'Failed to generate suggestions' }),
    };
  }
};
