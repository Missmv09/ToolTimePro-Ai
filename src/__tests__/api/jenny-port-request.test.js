/**
 * @jest-environment node
 */

let mockExistingPort = null;
const mockCreatedPort = { id: 'pr1', phone_number: '+17657895752', status: 'submitted' };
const mockInsert = jest.fn();

jest.mock('@/lib/server-auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({ user: { id: 'u1' } }),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table) => {
      const obj = {};
      obj.select = () => obj;
      obj.insert = (...args) => { mockInsert(table, ...args); return obj; };
      obj.eq = () => obj;
      obj.in = () => obj;
      obj.ilike = () => obj;
      obj.order = () => obj;
      obj.limit = () => obj;
      obj.upsert = () => obj;
      obj.then = (resolve) => resolve({ data: [], error: null }); // for notify's users query
      obj.single = () => {
        if (table === 'users') return Promise.resolve({ data: { company_id: 'c1' } });
        if (table === 'number_port_requests') return Promise.resolve({ data: mockCreatedPort, error: null });
        return Promise.resolve({ data: null, error: null });
      };
      obj.maybeSingle = () => {
        if (table === 'number_port_requests') return Promise.resolve({ data: mockExistingPort });
        return Promise.resolve({ data: null });
      };
      return obj;
    },
  })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';

const { POST } = require('@/app/api/jenny-pro/port-request/route');

function req(body) {
  return new Request('http://localhost/api/jenny-pro/port-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const valid = {
  _authToken: 't',
  phoneNumber: '7657895752',
  authorizedRepName: 'Maria',
  authorizedRepEmail: 'maria@example.com',
  currentCarrier: 'Verizon',
  accountNumber: '12345',
};

describe('/api/jenny-pro/port-request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistingPort = null;
  });

  it('creates a port request from valid input', async () => {
    const res = await POST(req(valid));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.portRequest.status).toBe('submitted');
    expect(mockInsert).toHaveBeenCalledWith('number_port_requests', expect.objectContaining({
      company_id: 'c1',
      phone_number: '+17657895752',
      authorized_rep_email: 'maria@example.com',
    }));
  });

  it('rejects a missing phone number', async () => {
    const { phoneNumber, ...rest } = valid;
    const res = await POST(req(rest));
    expect(res.status).toBe(400);
  });

  it('rejects a missing authorized rep email', async () => {
    const { authorizedRepEmail, ...rest } = valid;
    const res = await POST(req(rest));
    expect(res.status).toBe(400);
  });

  it('is idempotent when a port is already in flight', async () => {
    mockExistingPort = { id: 'pr0', phone_number: '+17657895752', status: 'in_review' };
    const res = await POST(req(valid));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.alreadyInFlight).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
