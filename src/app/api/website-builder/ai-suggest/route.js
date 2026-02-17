import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  try {
    const { businessName, trade, services, serviceArea } = await request.json();

    if (!businessName && !trade) {
      return NextResponse.json({ error: 'Provide at least a business name or trade' }, { status: 400 });
    }

    const tradeLabel = trade || 'service';
    const servicesList = services?.length ? services.join(', ') : '';

    const prompt = `Generate 4 short, catchy taglines for a ${tradeLabel} business${businessName ? ` called "${businessName}"` : ''}${servicesList ? ` that offers ${servicesList}` : ''}${serviceArea ? ` in ${serviceArea}` : ''}.

Each tagline should be:
- Maximum 8 words
- Memorable, professional, and unique
- Focused on customer trust, quality, or results
- Suitable as a website hero subtitle

Return ONLY a JSON array of 4 strings. Example: ["Tagline 1", "Tagline 2", "Tagline 3", "Tagline 4"]`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a marketing copywriter for small service businesses. You write concise, punchy taglines. Always return valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      console.error('[AI Suggest] OpenAI error:', await res.text());
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.choices[0].message.content.trim();

    let suggestions;
    try {
      suggestions = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[.*\]/s);
      suggestions = match ? JSON.parse(match[0]) : [raw];
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[AI Suggest] Error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
