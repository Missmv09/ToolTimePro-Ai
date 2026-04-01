import { NextResponse } from 'next/server';
import { aiComplete, parseAIJson } from '@/lib/ai-client';

export async function POST(request) {
  try {
    const body = await request.json();
    const { topic, category, audience } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });
    }

    // Check AI keys are configured
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment variables.' },
        { status: 503 },
      );
    }

    const systemPrompt = `You are an expert content writer for ToolTime Pro, a SaaS platform that helps home service businesses (painters, plumbers, electricians, HVAC, landscapers, cleaners, roofers, etc.) manage their operations.

You write blog posts for the ToolTime Pro marketing site that:
- Target home service business owners and contractors
- Are SEO-optimized for terms contractors search (e.g. "best plumbing software", "how to price painting jobs")
- Are helpful, actionable, and build trust in ToolTime Pro as a thought leader
- Include practical tips and real-world examples
- Naturally mention how ToolTime Pro helps (without being overly promotional)
- Use H2 and H3 subheadings for structure
- Are 800-1200 words
- End with a subtle CTA about trying ToolTime Pro

Return your response as a JSON object with these fields:
{
  "title": "SEO-optimized blog post title",
  "excerpt": "2-3 sentence preview for blog listing",
  "content": "Full blog post in Markdown format",
  "metaTitle": "SEO meta title (under 60 chars)",
  "metaDescription": "SEO meta description (under 160 chars)",
  "metaKeywords": "comma-separated SEO keywords",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}

Return ONLY valid JSON. No markdown code fences.`;

    const userPrompt = `Write a blog post for the ToolTime Pro marketing blog.

Topic: ${topic}
Category: ${category || 'tips'}
Target audience: ${audience || 'Home service business owners and contractors'}

The post should provide genuine value to contractors and business owners while positioning ToolTime Pro as the go-to platform for managing their business.`;

    const aiResult = await aiComplete({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2500,
      temperature: 0.7,
      tier: 'high',
    });

    let parsed;
    try {
      parsed = parseAIJson(aiResult.content);
    } catch {
      parsed = {
        title: topic,
        excerpt: '',
        content: aiResult.content,
        metaTitle: topic.substring(0, 60),
        metaDescription: '',
        metaKeywords: '',
        suggestedTags: [],
      };
    }

    const wordCount = (parsed.content || '').split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      ...parsed,
      wordCount,
      category: category || 'tips',
    });
  } catch (error) {
    console.error('[Platform Blog AI] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate blog post.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
