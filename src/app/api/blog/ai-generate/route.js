import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Add OPENAI_API_KEY to your environment.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { trade, location, topic, businessName, tone } = body;

    if (!trade || !topic) {
      return NextResponse.json(
        { error: 'Trade and topic are required.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert SEO content writer for home service and trade businesses. You write blog posts that:
- Are optimized for local SEO (naturally include the city/region when provided)
- Are helpful and informative for homeowners
- Build trust and position the business as an expert
- Include a clear call-to-action at the end
- Use H2 and H3 subheadings for structure
- Are 600-900 words
- Sound professional but approachable, not salesy

Return your response as a JSON object with these fields:
{
  "title": "SEO-optimized blog post title",
  "excerpt": "2-3 sentence preview/excerpt for blog listing",
  "content": "Full blog post in Markdown format with ## and ### headings",
  "metaTitle": "SEO meta title (under 60 chars)",
  "metaDescription": "SEO meta description (under 160 chars)",
  "metaKeywords": "comma-separated SEO keywords"
}

Return ONLY valid JSON. No markdown code fences.`;

    const userPrompt = `Write a blog post for a ${trade} business${businessName ? ` called "${businessName}"` : ''}${location ? ` in ${location}` : ''}.

Topic: ${topic}
Tone: ${tone || 'professional and helpful'}

The post should help homeowners understand this topic and encourage them to hire a professional.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Blog AI] OpenAI error:', response.status, errorData);
      return NextResponse.json(
        { error: 'AI generation failed. Please try again.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      return NextResponse.json({ error: 'No content generated.' }, { status: 500 });
    }

    // Parse the JSON response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, wrap the raw content
      parsed = {
        title: topic,
        excerpt: '',
        content: raw,
        metaTitle: topic.substring(0, 60),
        metaDescription: '',
        metaKeywords: trade,
      };
    }

    // Count words
    const wordCount = (parsed.content || '').split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      ...parsed,
      wordCount,
      trade,
      location: location || '',
      topic,
    });
  } catch (error) {
    console.error('[Blog AI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate blog post. Please try again.' },
      { status: 500 }
    );
  }
}
