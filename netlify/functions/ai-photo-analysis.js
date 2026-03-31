// Netlify Function for AI-powered photo analysis of job sites
// Anthropic primary, OpenAI fallback — analyzes photos and suggests services with pricing
const { visionCompletion, isAIConfigured } = require('./lib/ai-client');

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
    const { imageBase64, businessType } = JSON.parse(event.body);

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide an image' }),
      };
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Build the prompt for photo analysis
    const systemPrompt = `You are an expert estimator for a ${businessType || 'landscaping/lawn care'} business.
You specialize in analyzing photos of job sites to identify work needed and provide accurate pricing estimates.

Your expertise includes:
- Lawn care (mowing, edging, fertilization, aeration, overseeding)
- Tree and shrub services (trimming, removal, planting)
- Hardscaping (patios, walkways, retaining walls)
- Landscape design and installation
- Irrigation systems
- Seasonal cleanup (leaf removal, spring/fall prep)
- Pest and weed control
- Mulching and bed maintenance

When analyzing photos, consider:
1. Property size estimates (use visual cues like houses, fences, cars for scale)
2. Current condition of lawn/landscape
3. Types of plants, trees, and features visible
4. Visible problems (overgrowth, dead patches, debris, etc.)
5. Complexity and accessibility of the work area
6. Seasonal factors based on landscape condition`;

    const userPrompt = `Analyze this job site photo and provide a detailed estimate.

Identify ALL visible work that could be done and provide specific line items with pricing.

CRITICAL PRICING RULE:
- The "price" field must ALWAYS be the PER-UNIT price, NOT the total
- Example: For 500 sqft of lawn at $0.05/sqft, use quantity: 500, price: 0.05 (NOT price: 25)
- Example: For 3 hours of labor at $45/hour, use quantity: 3, price: 45 (NOT price: 135)
- The total is calculated as: quantity × price

Return a JSON object with this exact format:
{
  "analysis": {
    "propertySize": "estimated lot/yard size",
    "condition": "current condition assessment",
    "challenges": ["any visible challenges or considerations"]
  },
  "services": [
    {
      "name": "Service Name",
      "description": "Specific description based on what you see",
      "quantity": 1,
      "unit": "each|hour|sqft|linear_ft",
      "price": 45,
      "reason": "Why this service is needed and pricing justification"
    }
  ],
  "upsells": [
    {
      "name": "Additional Service",
      "description": "Why the customer might want this",
      "price": 100
    }
  ],
  "estimatedHours": 2.5,
  "difficultyLevel": "easy|moderate|difficult",
  "notes": "Any important observations about the property"
}

Be thorough - identify EVERY service opportunity visible in the photo.
Return ONLY the JSON, no other text.`;

    const { text: content } = await visionCompletion({
      systemPrompt,
      userPrompt,
      imageBase64: base64Data,
      maxTokens: 1500,
      temperature: 0.5,
    });

    if (!content) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'AI vision service unavailable. Please try again.' }),
      };
    }

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

    // Validate and sanitize the response
    if (!result.services || !Array.isArray(result.services)) {
      result.services = [];
    }

    // Ensure all services have required fields
    result.services = result.services.map(s => ({
      name: String(s.name || 'Service'),
      description: String(s.description || s.name || ''),
      quantity: parseFloat(s.quantity) || 1,
      unit: ['each', 'hour', 'sqft', 'linear_ft'].includes(s.unit) ? s.unit : 'each',
      price: parseFloat(s.price) || 0,
      reason: s.reason || ''
    }));

    // Ensure upsells exist
    if (!result.upsells || !Array.isArray(result.upsells)) {
      result.upsells = [];
    }

    result.upsells = result.upsells.map(u => ({
      name: String(u.name || 'Additional Service'),
      description: String(u.description || ''),
      price: parseFloat(u.price) || 0
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
      body: JSON.stringify({ error: 'Failed to analyze photo' }),
    };
  }
};
