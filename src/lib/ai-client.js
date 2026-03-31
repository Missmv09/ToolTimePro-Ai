// Centralized AI Client — Claude (primary) + OpenAI (fallback)
// All AI routes should use this instead of calling APIs directly.
//
// Environment variables:
//   ANTHROPIC_API_KEY  — required for Claude (primary)
//   OPENAI_API_KEY     — required for OpenAI (fallback)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Map task types to optimal Claude models
const CLAUDE_MODELS = {
  // Complex reasoning, vision, compliance, content generation
  high: 'claude-sonnet-4-6',
  // Fast tasks: chatbot, helper, review responses
  fast: 'claude-haiku-4-5-20251001',
};

// OpenAI fallback models
const OPENAI_MODELS = {
  high: 'gpt-4o',
  fast: 'gpt-4o-mini',
};

/**
 * Call Claude API (Anthropic Messages API)
 * @param {object} options
 * @param {string} options.systemPrompt - System prompt
 * @param {Array} options.messages - Array of {role, content} messages
 * @param {number} options.maxTokens - Max tokens for response
 * @param {number} options.temperature - Temperature (0-1)
 * @param {string} options.tier - 'high' or 'fast'
 * @returns {Promise<{content: string, provider: string} | null>}
 */
async function callClaude({ systemPrompt, messages, maxTokens = 1024, temperature = 0.5, tier = 'high' }) {
  if (!ANTHROPIC_API_KEY) return null;

  const model = CLAUDE_MODELS[tier] || CLAUDE_MODELS.high;

  // Convert messages to Anthropic format
  // Anthropic uses system as a top-level param, not in messages array
  const apiMessages = messages.map((m) => {
    // Handle vision messages (content as array with image_url)
    if (Array.isArray(m.content)) {
      return {
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content.map((part) => {
          if (part.type === 'text') return part;
          if (part.type === 'image_url') {
            // Convert OpenAI image format to Anthropic format
            const url = part.image_url.url;
            const base64Match = url.match(/^data:(image\/\w+);base64,(.+)$/);
            if (base64Match) {
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: base64Match[1],
                  data: base64Match[2],
                },
              };
            }
            // URL-based image
            return {
              type: 'image',
              source: {
                type: 'url',
                url: url,
              },
            };
          }
          return part;
        }),
      };
    }
    return {
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    };
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Client] Claude error (${response.status}):`, errText);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return null;

    return { content: text, provider: 'claude', model };
  } catch (err) {
    console.error('[AI Client] Claude request failed:', err.message);
    return null;
  }
}

/**
 * Call OpenAI API (Chat Completions)
 * @param {object} options
 * @param {string} options.systemPrompt - System prompt
 * @param {Array} options.messages - Array of {role, content} messages
 * @param {number} options.maxTokens - Max tokens for response
 * @param {number} options.temperature - Temperature (0-1)
 * @param {string} options.tier - 'high' or 'fast'
 * @returns {Promise<{content: string, provider: string} | null>}
 */
async function callOpenAI({ systemPrompt, messages, maxTokens = 1024, temperature = 0.5, tier = 'high' }) {
  if (!OPENAI_API_KEY) return null;

  const model = OPENAI_MODELS[tier] || OPENAI_MODELS.high;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Client] OpenAI error (${response.status}):`, errText);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    return { content: text, provider: 'openai', model };
  } catch (err) {
    console.error('[AI Client] OpenAI request failed:', err.message);
    return null;
  }
}

/**
 * Unified AI completion — Claude first, OpenAI fallback.
 *
 * @param {object} options
 * @param {string} options.systemPrompt - System instruction
 * @param {Array}  options.messages     - [{role: 'user'|'assistant', content: string|array}]
 * @param {number} [options.maxTokens=1024]
 * @param {number} [options.temperature=0.5]
 * @param {string} [options.tier='high'] - 'high' (complex reasoning/vision) or 'fast' (simple tasks)
 * @returns {Promise<{content: string, provider: string, model: string}>}
 * @throws {Error} if both providers fail
 */
async function aiComplete({ systemPrompt, messages, maxTokens = 1024, temperature = 0.5, tier = 'high' }) {
  // Try Claude first
  const claudeResult = await callClaude({ systemPrompt, messages, maxTokens, temperature, tier });
  if (claudeResult) return claudeResult;

  // Fallback to OpenAI
  const openaiResult = await callOpenAI({ systemPrompt, messages, maxTokens, temperature, tier });
  if (openaiResult) return openaiResult;

  throw new Error('All AI providers unavailable. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
}

/**
 * Parse JSON from AI response content, with fallback regex extraction.
 * @param {string} content - Raw AI response text
 * @returns {object} Parsed JSON object
 * @throws {Error} if JSON cannot be extracted
 */
function parseAIJson(content) {
  // Strip markdown fences if present
  const cleaned = content.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse AI response as JSON');
  }
}

module.exports = {
  aiComplete,
  callClaude,
  callOpenAI,
  parseAIJson,
  CLAUDE_MODELS,
  OPENAI_MODELS,
};
