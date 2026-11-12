import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { assistantText, assertCompleted, consumeSSE, SSEDecoder } from '../src/platform/sse.js';
import type { Obj } from '../src/types.js';

const event = (type: string, extra: Obj = {}): Obj => ({ type, ...extra });
describe('SSE framing', () => {
  it('handles a complete frame', () => expect(new SSEDecoder().push('data: hello\n\n')).toEqual(['hello']));
  it('handles split CRLF without inventing an empty line', () => {
    const parser = new SSEDecoder(); expect(parser.push('data: hello\r')).toEqual([]);
    expect(parser.push('\n\r')).toEqual([]); expect(parser.push('\n')).toEqual(['hello']);
  });
  it('combines multiple data lines', () => expect(new SSEDecoder().push('data: first\ndata: second\n\n')).toEqual(['first\nsecond']));
  it('ignores comments and non-data fields', () => expect(new SSEDecoder().push(': ping\nevent: message\nid: 1\ndata: ok\n\n')).toEqual(['ok']));
  it('removes only one leading data space', () => expect(new SSEDecoder().push('data:  preserved\n\n')).toEqual([' preserved']));
  it('does not dispatch an incomplete frame', () => expect(new SSEDecoder().push('data: truncated', true)).toEqual([]));
  it('handles many frames in one chunk', () => expect(new SSEDecoder().push('data: a\n\ndata: b\n\n')).toEqual(['a', 'b']));
  it('streams UTF-8 split at every byte', async () => {
    const fixture = await readFile(new URL('fixtures/success.sse', import.meta.url));
    const stream = new ReadableStream<Uint8Array>({ start(controller) { for (const byte of fixture) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
    const events: Obj[] = [];
    await consumeSSE(new Response(stream, { headers: { 'content-type': 'text/event-stream' } }), e => events.push(e));
    expect(events).toHaveLength(6); expect(assistantText(events)).toBe('中文🧪'); expect(assertCompleted(events).runId).toBe('run_fixture');
  });
  it('rejects HTML masquerading as SSE', async () => expect(consumeSSE(new Response('<html/>'), () => undefined)).rejects.toThrow('text/event-stream'));
  it('rejects malformed JSON', async () => expect(consumeSSE(new Response('data: broken\n\n', { headers: { 'content-type': 'text/event-stream' } }), () => undefined)).rejects.toThrow('Invalid SSE JSON'));
  it('rejects SSE EOF without DONE', async () => expect(consumeSSE(new Response('data: {"type":"run.complete"}\n\n', { headers: { 'content-type': 'text/event-stream' } }), () => undefined)).rejects.toThrow('without [DONE]'));
  it('rejects events after DONE in same frame batch', async () => expect(consumeSSE(new Response('data: [DONE]\n\ndata: {}\n\n', { headers: { 'content-type': 'text/event-stream' } }), () => undefined)).rejects.toThrow('after [DONE]'));
});
describe('final content and terminal state', () => {
  it('does not mistake DONE alone for completed Run', () => expect(() => assertCompleted([])).toThrow('one terminal'));
  it('does not accept error as success', () => expect(() => assertCompleted([event('run.error')])).toThrow('did not complete'));
  it('does not accept cancel as success', () => expect(() => assertCompleted([event('run.cancel')])).toThrow('did not complete'));
  it('rejects duplicate terminals', () => expect(() => assertCompleted([event('run.complete'), event('run.complete')])).toThrow('one terminal'));
  it('excludes reasoning, tools and delegated content', () => expect(assistantText([
    event('reasoning.delta', { delta: 'private' }), event('tool.output', { delta: 'process' }),
    event('content.delta', { taskId: 'child', delta: 'child' }), event('content.delta', { contentId: 'main', delta: 'answer' })
  ])).toBe('answer'));
  it('snapshot replaces accumulated deltas without duplication', () => expect(assistantText([
    event('content.delta', { contentId: 'c1', delta: 'par' }), event('content.snapshot', { contentId: 'c1', text: 'complete' })
  ])).toBe('complete'));
});
