import test from 'node:test';
import assert from 'node:assert/strict';
import { createReportStore } from '../frontend/report-store.js';

test('static container history persists in browser storage without backend requests', async () => {
  const memory = new Map(); let id = 0;
  const options = { storage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }, uuid: () => String(++id), now: () => id,
    request: () => { throw new Error('static mode must not call the Node report API'); } };
  const store = createReportStore('browser', options);
  for (let i = 0; i < 25; i++) await store.save({ input: 'text ' + i, text: 'report' });
  const restored = createReportStore('browser', options);
  const history = await restored.list();
  assert.equal(history.length, 20);
  assert.equal(history[0].input, 'text 24');
  assert.equal(history.at(-1).input, 'text 5');
});

test('Node-backed mode retains the server report API', async () => {
  const calls = [];
  const store = createReportStore(undefined, { request: async (...args) => { calls.push(args); return { items: [] }; } });
  assert.deepEqual(await store.list(), []);
  await store.save({ input: 'input', text: 'report' });
  assert.equal(calls[1][0], '/api/reports');
  assert.equal(calls[1][1].method, 'POST');
});
