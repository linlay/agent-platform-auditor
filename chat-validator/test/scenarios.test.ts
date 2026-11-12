import { describe, expect, it } from 'vitest';
import { loadCases } from '../src/cases.js';
import { PlatformClient } from '../src/platform/client.js';
import { Runner } from '../src/scenarios/runner.js';
import { obj, type Config, type Obj } from '../src/types.js';

const config: Config = {
  baseUrl: 'http://127.0.0.1:11949', timeoutMs: 1000, keepChats: false,
  projectAgentKey: 'project', projectFile: 'fixture.txt', projectExpect: 'expected-file-marker', botAgentKey: 'bot'
};
const success = (data: unknown) => new Response(JSON.stringify({ code: 0, msg: 'success', data }), { headers: { 'content-type': 'application/json' } });

// In-memory protocol replay verifies the executor's outgoing requests, not the
// real Platform. In particular, "readonly" is a path policy, not an API level.
function replay() {
  const requests: Obj[] = [];
  const chats = new Map<string, { detail: Obj; row: Obj; archived: boolean }>();
  const mails = new Map<string, { body: string; receipt: Obj }>();
  let runCounter = 0;
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = init?.body ? obj(JSON.parse(String(init.body))) : {};
    if (url.pathname === '/api/agents') return success([
      { key: 'general', mode: 'GENERAL', engine: 'native' },
      { key: 'project', mode: 'CODER', engine: 'native', workspaceDir: '/dedicated-fixture' },
      { key: 'bot', mode: 'BOT', engine: 'native' }
    ]);
    if (url.pathname === '/api/chats') return success([]);
    if (url.pathname === '/api/chat/archive') {
      const ids = body.chatIds as string[];
      chats.get(ids[0]!)!.archived = true;
      return success({ archived: ids });
    }
    if (url.pathname === '/api/chat/delete' || url.pathname === '/api/archive/delete') {
      chats.delete(String(body.chatId)); return success({ deleted: true });
    }
    if (url.pathname === '/api/query' || url.pathname === '/api/send') {
      requests.push(body);
      expect(body.accessLevel).toBe('ask_for_approval');
      if (body.agentKey === 'project') expect(body.editingMode).toBe(false);
      if (url.pathname === '/api/send') {
        const prior = mails.get(String(body.requestId));
        if (prior) return prior.body === JSON.stringify(body) ? success(prior.receipt) : new Response(JSON.stringify({ code: 409, msg: 'requestId already used with different content', data: {} }), { status: 409 });
      }
      if (body.agentKey === 'bot') { expect(body.chatId).toBeUndefined(); expect(body.primary).toBe(true); }
      const chatId = body.agentKey === 'bot' ? 'bot_new' : String(body.chatId);
      const existing = chats.get(chatId);
      if (existing?.archived) return new Response(JSON.stringify({ code: 400, msg: 'chat is archived' }), { status: 400 });
      const runId = `run_${++runCounter}`;
      const marker = String(body.message).match(/CV_[A-Z]+_[a-f0-9]+/)?.[0];
      const content = marker ?? (body.agentKey === 'project' ? 'expected-file-marker' : String(existing?.detail.lastRunContent));
      const timestamp = 1794412800000;
      const events: Obj[] = [
        { type: 'request.query', runId, chatId, seq: 1, timestamp },
        { type: 'run.start', runId, seq: 2, timestamp },
        { type: 'run.activity', runId, seq: 0, timestamp, message: 'waiting' },
        ...(body.agentKey === 'project' ? [{ type: 'tool.result', toolId: 'read', result: 'expected-file-marker', seq: 3, timestamp }] : []),
        { type: 'content.delta', contentId: 'content', delta: content, seq: 4, timestamp },
        { type: 'run.complete', runId, finishReason: 'stop', seq: 5, timestamp }
      ];
      if (body.lane === 'btw') return success({ sideId: 'side_fixture', parentChatId: chatId, runId, content });
      chats.set(chatId, {
        archived: false,
        row: { _type: 'query', chatId, runId, query: body, origin: { type: 'user' }, editingMode: body.editingMode ?? true },
        detail: { chatId, agentKey: body.agentKey ?? null, lastRunId: runId, lastRunContent: content, events, runs: [{ runId }], updatedAt: timestamp }
      });
      if (url.pathname === '/api/send') {
        const receipt = { mailId: 'mail_fixture', chatId, runId, delivery: 'started' };
        mails.set(String(body.requestId), { body: JSON.stringify(body), receipt });
        return success(receipt);
      }
      if (body.stream === false) return success({ content, fullText: content, usage: { totalTokens: 12 } });
      return new Response(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
    }
    if (url.pathname === '/api/chat') return success(chats.get(url.searchParams.get('chatId')!)!.detail);
    if (url.pathname === '/api/chat/jsonl') return new Response(JSON.stringify(chats.get(url.searchParams.get('chatId')!)!.row) + '\n');
    throw new Error(`Unexpected replay route: ${url.pathname}`);
  };
  return { requests, transport, chats };
}

describe('outgoing positive scenario requests match current Platform access contract', () => {
  it.each(['C01', 'C04', 'C08', 'C09', 'C10', 'C12', 'C13', 'C14', 'C15', 'C16', 'C19', 'X01', 'X02'])('%s uses a supported API level', async id => {
    const fixture = replay();
    const runner = new Runner(config, new PlatformClient(config, fixture.transport));
    const definition = (await loadCases()).find(c => c.id === id)!;
    const result = await runner.execute(definition);
    expect(result.message).toBeUndefined();
    expect(result.status).toBe('passed');
    expect(fixture.requests.length).toBeGreaterThan(0);
    expect(await runner.cleanup()).toEqual([]);
    expect(fixture.chats.size).toBe(0);
  });
  it('includes an explicit real-service regression case for invalid readonly input', async () => {
    const definition = (await loadCases()).find(c => c.id === 'P27')!;
    expect(definition.body?.accessLevel).toBe('readonly');
    expect(definition.status).toBe(400);
  });
});
