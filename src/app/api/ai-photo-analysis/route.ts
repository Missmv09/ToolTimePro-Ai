import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, businessType = 'landscaping/lawn care' } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'imageBase64 is required' },
        { status: 400 },
      );
    }

    // If no OpenAI key, return smart defaults
    if (!OPENAI_API_KEY) {
      return NextResponse.json(getFallbackAnalysis());
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemPrompt = `You are an expert estimator for a ${businessType} business.
You specialize in analyzing photos of job sites to identify work needed and provide accurate pricing estimates.

When analyzing photos, consider:
1. Property size estimates (use visual cues like houses, fences, cars for scale)
2. Current condition of lawn/landscape
3. Types of plants, trees, and features visible
4. Visible problems (overgrowth, dead patches, debris, etc.)
5. Complexity and accessibility of the work area`;

    const userPrompt = `Analyze this job site photo and provide a detailed estimate.

Identify ALL visible work that could be done and provide specific line items with pricing.

CRITICAL PRICING RULE:
- The "price" field must ALWAYS be the PER-UNIT price, NOT the total
- Example: For 500 sqft of lawn at $0.05/sqft, use quantity: 500, price: 0.05
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
  "notes": "Any important observations about the property"
}

Be thorough - identify EVERY service opportunity visible in the photo.
Return ONLY the JSON, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Vision error:', errorText);
      // Fall back to defaults on API error
      return NextResponse.json(getFallbackAnalysis());
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
        console.error('Could not parse AI response:', content);
        return NextResponse.json(getFallbackAnalysis());
      }
    }

    // Validate and sanitize services
    if (!result.services || !Array.isArray(result.services)) {
      result.services = [];
    }

    result.services = result.services.map((s: Record<string, unknown>) => ({
      name: String(s.name || 'Service'),
      description: String(s.description || s.name || ''),
      quantity: parseFloat(String(s.quantity)) || 1,
      unit: ['each', 'hour', 'sqft', 'linear_ft'].includes(String(s.unit)) ? s.unit : 'each',
      price: parseFloat(String(s.price)) || 0,
      reason: s.reason || '',
    }));

    // Validate upsells
    if (!result.upsells || !Array.isArray(result.upsells)) {
      result.upsells = [];
    }

    result.upsells = result.upsells.map((u: Record<string, unknown>) => ({
      name: String(u.name || 'Additional Service'),
      description: String(u.description || ''),
      price: parseFloat(String(u.price)) || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('ai-photo-analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to process photo analysis request' },
      { status: 500 },
    );
  }
}

function getFallbackAnalysis() {
  return {
    analysis: {
      propertySize: 'Medium residential lot (est. 1/4 - 1/2 acre)',
      condition: 'Fair -- some maintenance needed',
      challenges: [
        'Overgrown areas detected',
        'Possible debris or leaf buildup',
        'Edges and borders may need attention',
      ],
    },
    services: [
      {
        name: 'Lawn Mowing & Edging',
        description: 'Full lawn mowing with string-trim edging along walkways and beds',
        quantity: 1,
        unit: 'each',
        price: 55,
        reason: 'Standard mowing for a medium residential lot',
      },
      {
        name: 'Hedge / Shrub Trimming',
        description: 'Trim and shape hedges and ornamental shrubs',
        quantity: 1,
        unit: 'each',
        price: 80,
        reason: 'Common service when overgrown areas are present',
      },
      {
        name: 'Yard Cleanup & Debris Removal',
        description: 'Rake, blow, and haul away leaves and yard debris',
        quantity: 1,
        unit: 'each',
        price: 90,
        reason: 'Debris cleanup based on visible buildup',
      },
    ],
    upsells: [
      {
        name: 'Mulch Refresh',
        description: 'Add fresh mulch to landscape beds',
        price: 195,
      },
      {
        name: 'Lawn Fertilization',
        description: 'Seasonal fertilizer treatment for a greener lawn',
        price: 60,
      },
    ],
    notes: 'Set OPENAI_API_KEY in your environment to enable real AI-powered photo analysis. These are default recommendations.',
  };
}
