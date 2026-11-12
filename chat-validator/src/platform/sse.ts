import { obj, ProtocolError, type Obj } from '../types.js';

// Streaming UTF-8 decoder: handles CRLF split across network chunks, comments,
// multiple data lines, and SSE event/id fields without confusing them with data.
export class SSEDecoder {
  private buffer = '';
  private lines: string[] = [];
  push(text: string, final = false): string[] {
    this.buffer += text;
    const frames: string[] = [];
    while (true) {
      const match = /\r\n|\r|\n/.exec(this.buffer);
      if (!match) break;
      if (!final && match[0] === '\r' && match.index === this.buffer.length - 1) break;
      const line = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      if (!line) {
        if (this.lines.length) frames.push(this.lines.join('\n'));
        this.lines = [];
      } else if (line === 'data' || line.startsWith('data:')) {
        this.lines.push(line === 'data' ? '' : line.slice(5).replace(/^ /, ''));
      }
    }
    // Per SSE, unterminated frames at EOF are discarded, not invented.
    return frames;
  }
}

export async function consumeSSE(response: Response, onEvent: (event: Obj) => unknown): Promise<void> {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) throw new ProtocolError('Expected text/event-stream');
  if (!response.body) throw new ProtocolError('SSE body missing');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEDecoder();
  let doneMarker = false;
  const accept = async (frames: string[]) => {
    for (const frame of frames) {
      if (frame === '[DONE]') { doneMarker = true; continue; }
      if (doneMarker) throw new ProtocolError('SSE event after [DONE]');
      let value: unknown;
      try { value = JSON.parse(frame); } catch { throw new ProtocolError('Invalid SSE JSON'); }
      await onEvent(obj(value));
    }
  };
  try {
    while (!doneMarker) {
      const next = await reader.read();
      if (next.done) { await accept(parser.push(decoder.decode(), true)); break; }
      await accept(parser.push(decoder.decode(next.value, { stream: true })));
    }
    if (!doneMarker) throw new ProtocolError('SSE ended without [DONE]');
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function assistantText(events: Obj[]): string {
  const blocks = new Map<string, string>();
  for (const event of events) {
    if (event.taskId) continue;
    const id = typeof event.contentId === 'string' ? event.contentId : 'main';
    if (event.type === 'content.delta' && typeof event.delta === 'string') blocks.set(id, (blocks.get(id) ?? '') + event.delta);
    if (event.type === 'content.snapshot' && typeof event.text === 'string') blocks.set(id, event.text);
  }
  return [...blocks.values()].join('\n');
}

export function assertCompleted(events: Obj[]): Obj {
  const terminals = events.filter(e => ['run.complete', 'run.error', 'run.cancel'].includes(String(e.type)));
  if (terminals.length !== 1) throw new ProtocolError(`Expected one terminal event, got ${terminals.length}`);
  const terminal = terminals[0]!;
  if (terminal.type !== 'run.complete') throw new Error(`Run did not complete: ${JSON.stringify(terminal)}`);
  return terminal;
}
