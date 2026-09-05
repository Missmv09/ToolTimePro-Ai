/**
 * @jest-environment node
 */

// The sandbox Supabase project paused in August 2026 because this function
// treated an unconfigured sandbox as a skip: it pinged production, returned
// `success: true`, and said nothing about the project that had gone a week
// without a query. These tests pin the behaviour that makes that impossible —
// an unpinged target must be visible in the response, not inferred from its
// absence.

import handler from '../supabase-keepalive-cron';

const PROD_URL = 'https://prod.supabase.co';
const SANDBOX_URL = 'https://sbx.supabase.co';

const ENV_KEYS = [
  'SUPABASE_KEEPALIVE_URL',
  'SUPABASE_KEEPALIVE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SANDBOX_URL',
  'SUPABASE_SANDBOX_KEY',
  'SUPABASE_SANDBOX_KEEPALIVE',
];

let fetchMock: jest.Mock;

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.SUPABASE_KEEPALIVE_URL = PROD_URL;
  process.env.SUPABASE_KEEPALIVE_KEY = 'prod-anon-key';

  fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => '[]',
  });
  global.fetch = fetchMock as unknown as typeof fetch;

  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function runHandler() {
  const response = await handler();
  return { response, body: await response.json() };
}

function pingedHosts() {
  return fetchMock.mock.calls.map((call) => new URL(call[0] as string).host);
}

describe('supabase keep-alive cron', () => {
  it('pings production and sandbox when both are configured', async () => {
    process.env.SUPABASE_SANDBOX_URL = SANDBOX_URL;
    process.env.SUPABASE_SANDBOX_KEY = 'sandbox-anon-key';

    const { response, body } = await runHandler();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.problems).toEqual([]);
    expect(pingedHosts()).toEqual(['prod.supabase.co', 'sbx.supabase.co']);
  });

  it('fails loudly when the sandbox target is not configured at all', async () => {
    const { response, body } = await runHandler();

    // Production is still pinged — one broken target must not strand the other.
    expect(pingedHosts()).toEqual(['prod.supabase.co']);

    // ...but the run does NOT report success, and names what is missing.
    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.problems).toHaveLength(1);
    expect(body.problems[0].label).toBe('sandbox');
    expect(body.problems[0].problem).toContain('SUPABASE_SANDBOX_URL');
    expect(body.problems[0].problem).toContain('SUPABASE_SANDBOX_KEY');
  });

  it('names the one missing var when the sandbox is half-configured', async () => {
    process.env.SUPABASE_SANDBOX_URL = SANDBOX_URL;

    const { response, body } = await runHandler();

    expect(response.status).toBe(502);
    expect(body.problems[0].problem).toContain('SUPABASE_SANDBOX_KEY');
    expect(body.problems[0].problem).not.toContain('SUPABASE_SANDBOX_URL');
  });

  it('stays green when the sandbox is deliberately opted out', async () => {
    process.env.SUPABASE_SANDBOX_KEEPALIVE = 'off';

    const { response, body } = await runHandler();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.problems).toEqual([]);
    expect(pingedHosts()).toEqual(['prod.supabase.co']);
  });

  it('reports the response body when a ping fails, so the cause is readable', async () => {
    process.env.SUPABASE_SANDBOX_URL = SANDBOX_URL;
    process.env.SUPABASE_SANDBOX_KEY = 'sandbox-anon-key';
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('sbx')
        ? { ok: false, status: 503, text: async () => 'Project is paused' }
        : { ok: true, status: 200, text: async () => '[]' }
    );

    const { response, body } = await runHandler();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    const sandbox = body.results.find((r: { label: string }) => r.label === 'sandbox');
    expect(sandbox.ok).toBe(false);
    expect(sandbox.status).toBe(503);
    expect(sandbox.body).toBe('Project is paused');
  });

  it('strips a trailing slash or /rest/v1 suffix from a configured URL', async () => {
    process.env.SUPABASE_SANDBOX_URL = `${SANDBOX_URL}/rest/v1`;
    process.env.SUPABASE_SANDBOX_KEY = 'sandbox-anon-key';

    await runHandler();

    expect(fetchMock.mock.calls[1][0]).toBe(
      `${SANDBOX_URL}/rest/v1/companies?select=id&limit=1`
    );
  });
});
