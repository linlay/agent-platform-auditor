import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, validateReport } from '../backend/server.mjs';

test('report input rejects malformed and oversized data', () => {
  for (const value of [null, [], {}, { input: ' ', text: 'report' }, { input: 'a'.repeat(9001), text: 'report' }, { input: 'valid', text: 'r'.repeat(24001) }]) {
    assert.throws(() => validateReport(value));
  }
});

test('concurrent saves remain durable and history keeps only the latest 20', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'auditor-reports-'));
  const server = createServer(directory);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const invalid = await fetch(base + '/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(invalid.status, 400);
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => fetch(base + '/api/reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: `input ${i}`, text: `report ${i}`, runId: `run-${i}` })
    })));
    assert.ok(results.every((response) => response.status === 201));
    const { items } = await (await fetch(base + '/api/reports')).json();
    assert.equal(items.length, 20);
    assert.equal(new Set(items.map((item) => item.id)).size, 20);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'reports.json'), 'utf8')), items);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true });
  }
});
