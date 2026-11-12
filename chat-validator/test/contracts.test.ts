import { describe, expect, it } from 'vitest';
import { assertLiveSequence, persistedQuery } from '../src/platform/contracts.js';
import { loadCases } from '../src/cases.js';
import { PlatformClient } from '../src/platform/client.js';
import { Runner } from '../src/scenarios/runner.js';
import { type Config, type Obj } from '../src/types.js';

const timestamp = 1794412800000;
const config: Config = { baseUrl: 'http://127.0.0.1:11949', timeoutMs: 1000, keepChats: false };
const success = (data: unknown) => new Response(JSON.stringify({ code: 0, msg: 'success', data }));

describe('current persisted and live contracts', () => {
  it('reads JSONL _type independently from live event type', () => {
    const row: Obj = { _type: 'query', runId: 'r', query: { message: 'hello' } };
    expect(persistedQuery([row], 'r')).toBe(row);
    expect(() => persistedQuery([{ type: 'query', runId: 'r', query: {} }], 'r')).toThrow('missing');
  });
  it('ignores storage-only system snapshot rows with no original query', () => {
    const row: Obj = { _type: 'query', runId: 'r', query: {} };
    expect(persistedQuery([{ _type: 'query', runId: 'r', system: {} }, row], 'r')).toBe(row);
  });
  it('does not select another Run query', () => expect(() => persistedQuery([{ _type: 'query', runId: 'other', query: {} }], 'r')).toThrow('missing'));
  it('accepts seq=0 activities and filtered public sequence gaps', () => expect(() => assertLiveSequence([
    { type: 'run.start', seq: 1, timestamp }, { type: 'run.activity', seq: 0, timestamp },
    { type: 'content.delta', seq: 8, timestamp }, { type: 'run.activity', seq: 0, timestamp },
    { type: 'run.complete', seq: 12, timestamp }
  ])).not.toThrow());
  it('still rejects seq=0 for ordinary events', () => expect(() => assertLiveSequence([{ type: 'content.delta', seq: 0, timestamp }])).toThrow('sequence'));
  it('still rejects duplicate public sequence', () => expect(() => assertLiveSequence([{ type: 'content.start', seq: 2, timestamp }, { type: 'content.delta', seq: 2, timestamp }])).toThrow('sequence'));
  it('rejects sequenced progress activities', () => expect(() => assertLiveSequence([{ type: 'run.activity', seq: 1, timestamp }])).toThrow('seq=0'));
  it('validates epoch milliseconds even on unsequenced activities', () => expect(() => assertLiveSequence([{ type: 'run.activity', seq: 0, timestamp: 1700000000 }])).toThrow('milliseconds'));
});

describe('fixture boundaries', () => {
  it('keeps duplicate keys intact and targets an owned Chat', async () => {
    let raw = '';
    const client = new PlatformClient(config, async (input, init) => {
      const url = String(input);
      if (url.includes('/api/agents')) return success([{ key: 'general', mode: 'GENERAL', engine: 'native' }]);
      if (url.includes('/api/send')) { raw = String(init?.body); return new Response('{"code":400,"msg":"invalid request body","data":{}}', { status: 400 }); }
      return success({ deleted: true });
    });
    const runner = new Runner(config, client);
    const result = await runner.execute((await loadCases()).find(c => c.id === 'P17')!);
    expect(result.status).toBe('passed');
    expect(raw.match(/"message"/g)).toHaveLength(2);
    const body = JSON.parse(raw) as Obj;
    expect(body.agentKey).toBe('general');
    expect(String(body.chatId)).toMatch(/^cv_/);
    expect(runner.chats.has(String(body.chatId))).toBe(true);
    expect(await runner.cleanup()).toEqual([]);
  });
  it('skips a BOT with an existing primary instead of sending to it', async () => {
    const calls: string[] = [];
    const client = new PlatformClient({ ...config, botAgentKey: 'bot' }, async input => {
      calls.push(String(input));
      return success([{ key: 'bot', mode: 'BOT', engine: 'native', primaryChat: { chatId: 'existing' } }]);
    });
    const runner = new Runner({ ...config, botAgentKey: 'bot' }, client);
    const result = await runner.execute((await loadCases()).find(c => c.id === 'X02')!);
    expect(result.status).toBe('skipped');
    expect(calls.every(url => url.includes('/api/agents'))).toBe(true);
    expect(runner.chats.size).toBe(0);
  });
});
