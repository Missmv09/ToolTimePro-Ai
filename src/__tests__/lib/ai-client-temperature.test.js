/**
 * Temperature guard on the AI client.
 *
 * Sampling parameters were removed on the Opus 5 / Sonnet 5 family — sending
 * `temperature` returns a 400. callClaude treats any error as a provider
 * failure and falls through to OpenAI, so getting this wrong would not throw:
 * every reasoning call would silently run on the fallback provider while
 * appearing to work.
 */

const { acceptsTemperature, CLAUDE_MODELS } = require('@/lib/ai-client');

describe('acceptsTemperature', () => {
  it.each(['claude-opus-5', 'claude-sonnet-5', 'claude-fable-5', 'claude-opus-4-7', 'claude-opus-4-8'])(
    'omits temperature for %s',
    (model) => {
      expect(acceptsTemperature(model)).toBe(false);
    }
  );

  it.each(['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'])(
    'keeps temperature for %s',
    (model) => {
      expect(acceptsTemperature(model)).toBe(true);
    }
  );

  it('guards whatever model the reasoning tier currently points at', () => {
    // The planner runs on this tier; if it is ever pointed at a model in the
    // no-temperature family, the guard must already cover it.
    expect(CLAUDE_MODELS.reasoning).toBeTruthy();
    expect(acceptsTemperature(CLAUDE_MODELS.reasoning)).toBe(false);
  });
});
