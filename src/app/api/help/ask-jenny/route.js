// Ask Jenny — self-help chat grounded in wiki/*.md
//
// POST { messages: [{role, content}, ...] }
// → { message, fallback, provider, sources: [{slug, title}] }
//
// Knowledge bundle is built at build time by scripts/build-help-knowledge.js
// so the route works in Netlify functions without filesystem access.

const { NextResponse } = require('next/server');
const { aiComplete } = require('@/lib/ai-client');

// Generated file — see scripts/build-help-knowledge.js
let HELP_KNOWLEDGE = { articles: [] };
try {
  // eslint-disable-next-line global-require
  HELP_KNOWLEDGE = require('@/lib/help-knowledge.generated');
} catch {
  // Bundle missing in dev — route will fall back to a generic response.
}

function buildSystemPrompt() {
  const articleIndex = HELP_KNOWLEDGE.articles
    .map((a) => `- ${a.slug}: ${a.title}`)
    .join('\n');

  const articleBodies = HELP_KNOWLEDGE.articles
    .map((a) => `=== ${a.slug} (${a.title}) ===\n${a.content}`)
    .join('\n\n');

  return `You are Ask Jenny, the in-app help assistant for Task Iguana — a field service management SaaS for contractors (landscaping, plumbing, HVAC, etc.).

Your job: answer the user's "how do I…" questions about using Task Iguana, using ONLY the help articles below. Be concrete and short. Prefer numbered steps when explaining a flow.

Rules:
- Ground every answer in the help articles. Do not invent features that aren't documented.
- If the articles don't cover the question, say so plainly and suggest they click "Talk to a human" to open live chat.
- Keep answers under ~150 words unless the user explicitly asks for more detail.
- When relevant, end with one line: "Source: <article-slug>" using the slug from the article header below.

Available help articles:
${articleIndex}

Full article content follows. Treat this as authoritative:

${articleBodies}`;
}

function extractSources(answer) {
  const slugs = HELP_KNOWLEDGE.articles.map((a) => a.slug);
  const cited = new Set();
  for (const slug of slugs) {
    if (answer.includes(slug)) cited.add(slug);
  }
  return Array.from(cited).map((slug) => {
    const article = HELP_KNOWLEDGE.articles.find((a) => a.slug === slug);
    return { slug, title: article?.title || slug };
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const lastUser = (messages[messages.length - 1]?.content || '').trim();
    if (!lastUser) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        message: "Ask Jenny isn't configured on this environment yet. In the meantime, click 'Talk to a human' to open live chat.",
        fallback: true,
        sources: [],
      });
    }

    if (HELP_KNOWLEDGE.articles.length === 0) {
      return NextResponse.json({
        message: "I don't have my help articles loaded yet. Click 'Talk to a human' to open live chat.",
        fallback: true,
        sources: [],
      });
    }

    const apiMessages = messages
      .slice(-10)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content.trim() : '',
      }))
      .filter((m) => m.content.length > 0);

    const result = await aiComplete({
      systemPrompt: buildSystemPrompt(),
      messages: apiMessages,
      maxTokens: 600,
      temperature: 0.3,
      tier: 'fast',
    });

    if (!result || !result.content) {
      return NextResponse.json({
        message: "I couldn't reach the AI service right now. Click 'Talk to a human' to open live chat.",
        fallback: true,
        sources: [],
      });
    }

    return NextResponse.json({
      message: result.content,
      fallback: false,
      provider: result.provider,
      sources: extractSources(result.content),
    });
  } catch (err) {
    console.error('[ask-jenny] error:', err);
    return NextResponse.json({
      message: "Something went wrong on my end. Click 'Talk to a human' to open live chat.",
      fallback: true,
      sources: [],
    });
  }
}
