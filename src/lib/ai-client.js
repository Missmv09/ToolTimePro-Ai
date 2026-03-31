// Shared AI client — Anthropic (Claude) primary, OpenAI fallback
// Uses raw fetch (no SDK dependencies) for both providers

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Model tiers — pick the right tool for the job
const MODELS = {
  // Complex reasoning: compliance, HR, insights, vision, tiered quotes, voice transcripts
  advanced: {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
  },
  // Simple tasks: content gen, chatbot, review responses, helper text
  standard: {
    anthropic: 'claude-haiku-4-5-20251001',
    openai: 'gpt-3.5-turbo',
  },
};

/**
 * Send a chat completion request. Tries Anthropic first, falls back to OpenAI.
 *
 * @param {object} opts
 * @param {string} opts.systemPrompt - System instructions
 * @param {Array<{role: string, content: string|Array}>} opts.messages - Conversation messages
 * @param {'advanced'|'standard'} [opts.tier='advanced'] - Model tier
 * @param {number} [opts.maxTokens=800] - Max response tokens
 * @param {number} [opts.temperature=0.4] - Sampling temperature
 * @returns {Promise<{text: string, provider: 'anthropic'|'openai'|null}>}
 */
export async function chatCompletion({
  systemPrompt,
  messages,
  tier = 'advanced',
  maxTokens = 800,
  temperature = 0.4,
}) {
  // Try Anthropic first
  if (ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropic({ systemPrompt, messages, tier, maxTokens, temperature });
      if (result) return { text: result, provider: 'anthropic' };
    } catch (err) {
      console.error('[AI Client] Anthropic error, falling back to OpenAI:', err.message || err);
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const result = await callOpenAI({ systemPrompt, messages, tier, maxTokens, temperature });
      if (result) return { text: result, provider: 'openai' };
    } catch (err) {
      console.error('[AI Client] OpenAI fallback error:', err.message || err);
    }
  }

  // Both failed or no keys configured
  return { text: null, provider: null };
}

/**
 * Send a vision request (image + text). Tries Anthropic first, falls back to OpenAI.
 *
 * @param {object} opts
 * @param {string} opts.systemPrompt - System instructions
 * @param {string} opts.userPrompt - Text prompt accompanying the image
 * @param {string} opts.imageBase64 - Base64-encoded image data (no data URL prefix)
 * @param {string} [opts.mediaType='image/jpeg'] - MIME type of the image
 * @param {number} [opts.maxTokens=1500] - Max response tokens
 * @param {number} [opts.temperature=0.5] - Sampling temperature
 * @returns {Promise<{text: string, provider: 'anthropic'|'openai'|null}>}
 */
export async function visionCompletion({
  systemPrompt,
  userPrompt,
  imageBase64,
  mediaType = 'image/jpeg',
  maxTokens = 1500,
  temperature = 0.5,
}) {
  // Try Anthropic first
  if (ANTHROPIC_API_KEY) {
    try {
      const result = await callAnthropicVision({ systemPrompt, userPrompt, imageBase64, mediaType, maxTokens, temperature });
      if (result) return { text: result, provider: 'anthropic' };
    } catch (err) {
      console.error('[AI Client] Anthropic Vision error, falling back to OpenAI:', err.message || err);
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const result = await callOpenAIVision({ systemPrompt, userPrompt, imageBase64, mediaType, maxTokens, temperature });
      if (result) return { text: result, provider: 'openai' };
    } catch (err) {
      console.error('[AI Client] OpenAI Vision fallback error:', err.message || err);
    }
  }

  return { text: null, provider: null };
}

/**
 * Check if any AI provider is configured.
 */
export function isAIConfigured() {
  return !!(ANTHROPIC_API_KEY || OPENAI_API_KEY);
}

// ── Internal: Anthropic Messages API ────────────────────────────────────────

async function callAnthropic({ systemPrompt, messages, tier, maxTokens, temperature }) {
  const model = MODELS[tier]?.anthropic || MODELS.advanced.anthropic;

  // Convert messages: Anthropic expects {role: 'user'|'assistant', content: string}
  // and system prompt goes in a separate `system` field
  const anthropicMessages = messages.map((m) => ({
    role: m.role === 'system' ? 'user' : m.role,
    content: m.content,
  }));

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() || null;
}

async function callAnthropicVision({ systemPrompt, userPrompt, imageBase64, mediaType, maxTokens, temperature }) {
  const model = MODELS.advanced.anthropic; // Vision always uses advanced model

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic Vision API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() || null;
}

// ── Internal: OpenAI Chat Completions API ───────────────────────────────────

async function callOpenAI({ systemPrompt, messages, tier, maxTokens, temperature }) {
  const model = MODELS[tier]?.openai || MODELS.advanced.openai;

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callOpenAIVision({ systemPrompt, userPrompt, imageBase64, mediaType, maxTokens, temperature }) {
  const model = MODELS.advanced.openai; // Vision always uses advanced model

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Vision API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}
