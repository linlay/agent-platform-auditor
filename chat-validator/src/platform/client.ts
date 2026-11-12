import { readFile } from 'node:fs/promises';
import { consumeSSE } from './sse.js';
import { obj, EnvironmentError, ProtocolError, TimeoutError, type Config, type Obj, type Evidence } from '../types.js';

export interface Reply { status: number; text: string; headers: Headers; json: unknown }
export class PlatformClient {
  evidence: Evidence[] = [];
  constructor(readonly config: Config, private readonly transport: typeof fetch = fetch) {}
  private async headers(authenticated: boolean): Promise<Headers> {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (authenticated) {
      let token = this.config.token;
      if (this.config.tokenFile) {
        try { token = (await readFile(this.config.tokenFile, 'utf8')).trim(); }
        catch { throw new EnvironmentError('Cannot read PLATFORM_TOKEN_FILE'); }
      }
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
  private async request<T>(path: string, method: string, body: Obj | string | undefined, authenticated: boolean, handle: (r: Response) => Promise<T>): Promise<T> {
    const start = Date.now();
    const signal = AbortSignal.timeout(this.config.timeoutMs);
    try {
      const response = await this.transport(new URL(path, this.config.baseUrl), {
        method, headers: await this.headers(authenticated), signal,
        ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        redirect: 'error'
      });
      this.evidence.push({ kind: 'http', method, path, status: response.status, durationMs: Date.now() - start });
      return await handle(response);
    } catch (error) {
      if (signal.aborted) throw new TimeoutError(`Request exceeded ${this.config.timeoutMs}ms: ${method} ${path}`);
      if (error instanceof TypeError) throw new EnvironmentError(`Network request failed: ${method} ${path}`);
      throw error;
    }
  }
  async raw(path: string, method = 'GET', body?: Obj | string, authenticated = true): Promise<Reply> {
    return this.request(path, method, body, authenticated, async response => {
      const text = await response.text();
      let json: unknown;
      try { json = JSON.parse(text); } catch { json = undefined; }
      return { status: response.status, headers: response.headers, text, json };
    });
  }
  async json(path: string, method = 'GET', body?: Obj): Promise<Obj | import('../types.js').Json[]> {
    const response = await this.raw(path, method, body);
    if ([401, 403].includes(response.status)) throw new EnvironmentError(`API authentication/authorization failed (${response.status})`);
    const envelope = obj(response.json);
    if (response.status !== 200 || envelope.code !== 0) throw new Error(`API ${response.status}: ${response.text.slice(0, 500)}`);
    if (Array.isArray(envelope.data)) return envelope.data;
    return obj(envelope.data);
  }
  async query(body: Obj, onEvent?: (event: Obj) => unknown): Promise<Obj[]> {
    return this.request('/api/query', 'POST', body, true, async response => {
      if ([401, 403].includes(response.status)) throw new EnvironmentError(`Query authentication/authorization failed (${response.status})`);
      if (response.status !== 200) throw new Error(`Query ${response.status}: ${(await response.text()).slice(0, 500)}`);
      const events: Obj[] = [];
      await consumeSSE(response, async event => { events.push(event); await onEvent?.(event); });
      if (!events.length) throw new ProtocolError('Empty event stream');
      return events;
    });
  }
  async attach(runId: string, agentKey: string): Promise<Obj[]> {
    return this.request('/api/attach?runId='+encodeURIComponent(runId)+'&agentKey='+encodeURIComponent(agentKey), 'GET', undefined, true, async response => {
      if(response.status!==200) throw new Error('Attach '+response.status+': '+(await response.text()).slice(0,300));
      const events: Obj[]=[];
      await consumeSSE(response,e=>{events.push(e);});
      return events;
    });
  }

}
