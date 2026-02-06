import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Placeholder photo analysis endpoint.
//
// In a future update this will use an AI vision model (e.g. GPT-4 Vision) to
// actually inspect the uploaded image. For now it returns a reasonable set of
// common landscaping/property services so that the quoting flow remains fully
// functional while the real integration is built.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, businessType = '' } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'imageBase64 is required' },
        { status: 400 },
      );
    }

    // Placeholder analysis -- in production this would come from a vision model
    const analysis = {
      propertySize: 'Medium residential lot (est. 1/4 - 1/2 acre)',
      condition: 'Fair -- some maintenance needed',
      challenges: [
        'Overgrown areas detected',
        'Possible debris or leaf buildup',
        'Edges and borders may need attention',
      ],
    };

    // Common services a photo inspection would typically surface
    const services = [
      {
        name: 'Lawn Mowing & Edging',
        description: 'Full lawn mowing with string-trim edging along walkways and beds',
        quantity: 1,
        unit: 'each' as const,
        price: 55,
        marketRange: { min: 40, max: 75 },
        reason: 'Standard mowing for a medium residential lot',
      },
      {
        name: 'Hedge / Shrub Trimming',
        description: 'Trim and shape hedges and ornamental shrubs',
        quantity: 1,
        unit: 'each' as const,
        price: 80,
        marketRange: { min: 55, max: 120 },
        reason: 'Common service when overgrown areas are present',
      },
      {
        name: 'Yard Cleanup & Debris Removal',
        description: 'Rake, blow, and haul away leaves and yard debris',
        quantity: 1,
        unit: 'each' as const,
        price: 90,
        marketRange: { min: 65, max: 150 },
        reason: 'Debris cleanup based on visible buildup',
      },
    ];

    const upsells = [
      {
        name: 'Mulch Refresh',
        description: 'Add fresh mulch to landscape beds',
        price: 195,
        value: 'Instantly improves curb appeal',
      },
      {
        name: 'Lawn Fertilization',
        description: 'Seasonal fertilizer treatment for a greener lawn',
        price: 60,
        value: 'Promotes thicker, healthier grass',
      },
    ];

    const notes =
      'Note: Photo analysis will be enhanced with AI vision capabilities in a future update. ' +
      'The suggested services above are common recommendations for a typical residential property. ' +
      'Please review and adjust quantities, descriptions, and prices to match what you observe on-site.';

    return NextResponse.json({
      analysis,
      services,
      upsells,
      notes,
    });
  } catch (error) {
    console.error('ai-photo-analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to process photo analysis request' },
      { status: 500 },
    );
  }
}
