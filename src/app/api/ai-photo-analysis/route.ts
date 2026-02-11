import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// AI-powered photo analysis endpoint.
//
// When ANTHROPIC_API_KEY is set, uses Claude Vision to analyze property photos
// and recommend services with pricing. Falls back to business-type-aware
// defaults when no API key is available.
// ---------------------------------------------------------------------------

interface ServiceSuggestion {
  name: string;
  description: string;
  quantity: number;
  unit: 'each' | 'hour' | 'sqft' | 'linear_ft' | 'cubic_yard';
  price: number;
  marketRange: { min: number; max: number };
  reason: string;
}

interface UpsellSuggestion {
  name: string;
  description: string;
  price: number;
  value: string;
}

interface AnalysisResult {
  analysis: { propertySize: string; condition: string; challenges: string[] };
  services: ServiceSuggestion[];
  upsells: UpsellSuggestion[];
  notes: string;
}

// Pricing reference for fallback path
const PRICING: Record<string, { price: number; min: number; max: number; unit: string }> = {
  'Lawn Mowing & Edging': { price: 55, min: 35, max: 75, unit: 'each' },
  'Hedge / Shrub Trimming': { price: 80, min: 55, max: 120, unit: 'each' },
  'Tree Trimming': { price: 200, min: 150, max: 400, unit: 'each' },
  'Yard Cleanup & Debris Removal': { price: 90, min: 65, max: 150, unit: 'each' },
  'Pressure Washing': { price: 175, min: 100, max: 300, unit: 'each' },
  'Gutter Cleaning': { price: 120, min: 75, max: 200, unit: 'each' },
  'Fence Repair': { price: 250, min: 150, max: 500, unit: 'each' },
  'Mulch Installation': { price: 195, min: 120, max: 350, unit: 'cubic_yard' },
  'Irrigation Repair': { price: 125, min: 75, max: 250, unit: 'each' },
  'Exterior Painting': { price: 350, min: 200, max: 800, unit: 'each' },
  'Pool Cleaning': { price: 120, min: 80, max: 200, unit: 'each' },
  'Roof Cleaning': { price: 350, min: 200, max: 600, unit: 'each' },
  'Plumbing Repair': { price: 175, min: 100, max: 400, unit: 'hour' },
  'Electrical Repair': { price: 150, min: 100, max: 350, unit: 'hour' },
  'Drywall Repair': { price: 200, min: 100, max: 400, unit: 'each' },
  'Window Cleaning': { price: 150, min: 80, max: 300, unit: 'each' },
};

async function analyzeWithClaude(imageBase64: string, businessType: string): Promise<AnalysisResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const mediaType = cleanBase64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';

  const tradeContext = businessType
    ? `The service provider specializes in: ${businessType}.`
    : 'The service provider handles general home/property services.';

  const prompt = `You are an expert property estimator for a service trade business. Analyze this photo and provide a JSON response with recommended services and pricing.

${tradeContext}

Respond ONLY with valid JSON in this exact format:
{
  "analysis": {
    "propertySize": "description of property size",
    "condition": "overall condition assessment",
    "challenges": ["challenge 1", "challenge 2"]
  },
  "services": [
    {
      "name": "Service Name",
      "description": "What this service involves",
      "quantity": 1,
      "unit": "each",
      "price": 100,
      "marketRange": { "min": 75, "max": 150 },
      "reason": "Why this service is needed based on the photo"
    }
  ],
  "upsells": [
    {
      "name": "Upsell Service",
      "description": "What this add-on involves",
      "price": 50,
      "value": "Why this adds value"
    }
  ]
}

Rules:
- Recommend 2-5 services based on what you actually see in the photo
- Prices should be realistic US market rates
- Each service reason must reference something visible in the photo
- Include 1-2 relevant upsell suggestions
- Unit must be one of: each, hour, sqft, linear_ft, cubic_yard`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: cleanBase64 },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status);
      return null;
    }

    const result = await response.json();
    const textContent = result.content?.find((c: { type: string }) => c.type === 'text');
    if (!textContent?.text) return null;

    // Extract JSON (handle markdown code blocks)
    let jsonStr = textContent.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());

    return {
      analysis: parsed.analysis,
      services: parsed.services || [],
      upsells: parsed.upsells || [],
      notes: 'AI-powered analysis based on your uploaded photo. Review and adjust prices for your local market.',
    };
  } catch (err) {
    console.error('Claude Vision analysis failed:', err);
    return null;
  }
}

function getFallbackAnalysis(businessType: string): AnalysisResult {
  const bt = businessType.toLowerCase();

  let serviceNames: string[];
  let upsells: UpsellSuggestion[];

  if (bt.includes('plumb')) {
    serviceNames = ['Plumbing Repair', 'Irrigation Repair'];
    upsells = [{ name: 'Water Heater Flush', description: 'Flush sediment for better efficiency', price: 120, value: 'Extends water heater life 3-5 years' }];
  } else if (bt.includes('electri')) {
    serviceNames = ['Electrical Repair', 'Exterior Painting'];
    upsells = [{ name: 'Panel Inspection', description: 'Full electrical panel safety inspection', price: 150, value: 'Prevents fire hazards' }];
  } else if (bt.includes('roof')) {
    serviceNames = ['Roof Cleaning', 'Gutter Cleaning', 'Pressure Washing'];
    upsells = [{ name: 'Roof Sealant', description: 'Apply protective roof sealant', price: 400, value: 'Extends roof life by 5+ years' }];
  } else if (bt.includes('pool')) {
    serviceNames = ['Pool Cleaning', 'Pressure Washing'];
    upsells = [{ name: 'Chemical Balancing', description: 'Full water chemistry adjustment', price: 75, value: 'Prevents algae and equipment damage' }];
  } else if (bt.includes('paint')) {
    serviceNames = ['Exterior Painting', 'Pressure Washing', 'Drywall Repair'];
    upsells = [{ name: 'Color Consultation', description: 'Professional color matching', price: 75, value: 'Ensures perfect color selection' }];
  } else {
    serviceNames = ['Lawn Mowing & Edging', 'Hedge / Shrub Trimming', 'Yard Cleanup & Debris Removal'];
    upsells = [
      { name: 'Mulch Refresh', description: 'Add fresh mulch to landscape beds', price: 195, value: 'Instantly improves curb appeal' },
      { name: 'Lawn Fertilization', description: 'Seasonal fertilizer treatment', price: 60, value: 'Promotes thicker, healthier grass' },
    ];
  }

  const services: ServiceSuggestion[] = serviceNames.map((name) => {
    const ref = PRICING[name] || { price: 100, min: 75, max: 150, unit: 'each' };
    return {
      name,
      description: `Professional ${name.toLowerCase()} service`,
      quantity: 1,
      unit: ref.unit as ServiceSuggestion['unit'],
      price: ref.price,
      marketRange: { min: ref.min, max: ref.max },
      reason: `Recommended for typical ${businessType || 'residential property'} needs`,
    };
  });

  return {
    analysis: {
      propertySize: 'Medium residential property (estimated)',
      condition: 'Assessment pending -- review on-site for accuracy',
      challenges: ['Add ANTHROPIC_API_KEY for AI-powered photo analysis', 'Services shown are common recommendations'],
    },
    services,
    upsells,
    notes: 'To enable AI-powered photo analysis, add ANTHROPIC_API_KEY to your environment variables. These are default recommendations based on your trade type.',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, businessType = '' } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    // Try AI-powered analysis first, fall back to defaults
    const aiResult = await analyzeWithClaude(imageBase64, businessType);
    if (aiResult) {
      return NextResponse.json(aiResult);
    }

    return NextResponse.json(getFallbackAnalysis(businessType));
  } catch (error) {
    console.error('ai-photo-analysis API error:', error);
    return NextResponse.json({ error: 'Failed to process photo analysis request' }, { status: 500 });
  }
}
