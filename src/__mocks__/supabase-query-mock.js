// Chainable supabase-js query builder stub for route/lib tests.
//
//   const sb = createQueryMock(({ table, op, payload, filters }) => ({ data, error }))
//   sb.from('invoices').select('*').eq('id', 'x').single()   -> handler(state)
//
// Every terminal (await, .single(), .maybeSingle()) calls the handler with the
// accumulated state and records it in sb.calls so tests can assert on writes.
function createQueryMock(handler) {
  const calls = [];
  const from = jest.fn((table) => {
    const state = { table, op: 'select', payload: null, filters: [], columns: null, opts: null, single: false };
    const q = {};
    const chain = (name) => (...args) => {
      state.filters.push({ name, args });
      return q;
    };
    q.select = (cols, opts) => {
      if (state.op === 'select') {
        state.columns = cols;
        state.opts = opts || null;
      } else {
        state.returning = cols;
      }
      return q;
    };
    q.insert = (payload) => { state.op = 'insert'; state.payload = payload; return q; };
    q.update = (payload) => { state.op = 'update'; state.payload = payload; return q; };
    q.delete = () => { state.op = 'delete'; return q; };
    ['eq', 'neq', 'in', 'is', 'or', 'lte', 'gte', 'lt', 'gt', 'not', 'order', 'limit'].forEach((n) => { q[n] = chain(n); });
    const exec = () => {
      calls.push(state);
      return Promise.resolve(handler(state) || { data: null, error: null });
    };
    q.single = () => { state.single = true; return exec(); };
    q.maybeSingle = () => { state.single = true; return exec(); };
    q.then = (onFulfilled, onRejected) => exec().then(onFulfilled, onRejected);
    return q;
  });
  return { from, calls };
}

/** First filter value for a name, e.g. filterValue(state, 'eq', 'id'). */
function filterValue(state, name, column) {
  const f = state.filters.find((x) => x.name === name && (column === undefined || x.args[0] === column));
  return f ? f.args[column === undefined ? 0 : 1] : undefined;
}

module.exports = { createQueryMock, filterValue };
