/**
 * Reading Claude's response content.
 *
 * This pins a bug that cost a full planner run. The old code read
 * `data.content[0].text`, which works only when the first block happens to be
 * text. Claude Opus 5 runs extended thinking by default, so the first block is
 * a `thinking` block with no `.text` field — the answer was discarded, reported
 * as "empty response", and the request fell through to the other provider.
 *
 * The failure is silent by construction: callClaude returns an error object
 * rather than throwing, so nothing surfaces until someone reads a log.
 */

// The module reads ANTHROPIC_API_KEY at load time and callClaude returns null
// without it, so this has to be set before the require, not in a beforeEach.
const originalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = 'test-key';

const { callClaude } = require('@/lib/ai-client');

const originalFetch = global.fetch;

/** Stubs one Claude API response body. */
const respondWith = (body) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  });
};

const call = (overrides = {}) =>
  callClaude({
    systemPrompt: 'sys',
    messages: [{ role: 'user', content: 'hi' }],
    tier: 'reasoning',
    ...overrides,
  });

afterAll(() => {
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
  global.fetch = originalFetch;
});

describe('callClaude response parsing', () => {
  it('reads the text block when a thinking block comes first', async () => {
    respondWith({
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: 'considering the funnel numbers' },
        { type: 'text', text: '{"tasks": []}' },
      ],
    });
    await expect(call()).resolves.toMatchObject({
      content: '{"tasks": []}',
      provider: 'claude',
    });
  });

  it('still reads a plain text-first response', async () => {
    respondWith({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'hello' }] });
    await expect(call()).resolves.toMatchObject({ content: 'hello' });
  });

  it('joins multiple text blocks rather than taking only the first', async () => {
    respondWith({
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: '...' },
        { type: 'text', text: 'part one ' },
        { type: 'text', text: 'part two' },
      ],
    });
    await expect(call()).resolves.toMatchObject({ content: 'part one part two' });
  });

  it('names truncation rather than calling it empty', async () => {
    // Thinking tokens draw from max_tokens, so a low ceiling can consume the
    // whole budget before any text is produced. That is a different fix from
    // a refusal or a malformed response, so it must read differently.
    respondWith({
      stop_reason: 'max_tokens',
      content: [{ type: 'thinking', thinking: 'long reasoning that never finished' }],
    });
    const result = await call({ maxTokens: 4000 });
    expect(result.content).toBeUndefined();
    expect(result.error).toMatch(/4000-token limit/);
  });

  it('names a refusal and its category', async () => {
    respondWith({
      stop_reason: 'refusal',
      stop_details: { type: 'refusal', category: 'cyber' },
      content: [],
    });
    const result = await call();
    expect(result.error).toMatch(/declined/i);
    expect(result.error).toContain('cyber');
  });

  it('reports the block types it did get when no text is present', async () => {
    respondWith({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'x' }] });
    const result = await call();
    expect(result.error).toContain('thinking');
    expect(result.error).toContain('end_turn');
  });
});
