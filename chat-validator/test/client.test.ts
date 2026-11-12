import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PlatformClient } from '../src/platform/client.js';
import { loadConfig } from '../src/config.js';
import { loadCases, selectCases } from '../src/cases.js';
import { exitCode, redact } from '../src/reporting/report.js';
import { classify, Runner } from '../src/scenarios/runner.js';
import { EnvironmentError, ProtocolError, Skipped, TimeoutError, type CaseResult, type Config, type Obj } from '../src/types.js';

const config: Config = { baseUrl: 'http://127.0.0.1:11949', timeoutMs: 1000, keepChats: false };
const success = (data: unknown) => new Response(JSON.stringify({ code: 0, msg: 'success', data }), { headers: { 'content-type': 'application/json' } });
describe('configuration and case selection', () => {
  it('defaults to requested local Platform', () => expect(loadConfig({}).baseUrl).toBe('http://127.0.0.1:11949'));
  it.each(['file:///tmp/x', 'https://user:pass@example.com', 'http://localhost/path', 'http://localhost/?token=x'])('rejects unsafe origin %s', value => expect(() => loadConfig({ PLATFORM_URL: value })).toThrow());
  it.each(['0', '-1', 'NaN', '1.2', '600001'])('rejects invalid timeout %s', value => expect(() => loadConfig({ PLATFORM_TIMEOUT_MS: value })).toThrow());
  it('loads 20+ distinct real integration scenarios', async () => { const cases = await loadCases(); expect(cases.length).toBeGreaterThan(20); expect(new Set(cases.map(c => c.id)).size).toBe(cases.length); });
  it('selects cases by ID or group', async () => { const cases = await loadCases(); expect(selectCases(cases, 'C01,C02').map(c => c.id)).toEqual(['C01', 'C02']); expect(selectCases(cases, 'chat').length).toBe(20); });
  it('rejects unknown case selector', async () => expect(() => selectCases([], 'bogus')).toThrow('Unknown case'));
});
describe('client contracts', () => {
  it('sends bearer in header, never in URL or evidence', async () => {
    const transport: typeof fetch = async (url, init) => { expect(String(url)).not.toContain('sensitive'); expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sensitive'); return success([]); };
    const client = new PlatformClient({ ...config, token: 'sensitive' }, transport);
    await client.json('/api/agents'); expect(JSON.stringify(client.evidence)).not.toContain('sensitive');
  });
  it('does not authenticate a public health request', async () => {
    const client = new PlatformClient({ ...config, token: 'sensitive' }, async (_url, init) => { expect(new Headers(init?.headers).has('authorization')).toBe(false); return success({}); });
    await client.raw('/healthz', 'GET', undefined, false);
  });
  it('reads rotated token file on every request', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cv-token-')); const file = join(directory, 'token');
    try {
      const seen: (string | null)[] = [];
      const client = new PlatformClient({ ...config, tokenFile: file }, async (_url, init) => { seen.push(new Headers(init?.headers).get('authorization')); return success({}); });
      await writeFile(file, 'first'); await client.json('/api/agents'); await writeFile(file, 'second'); await client.json('/api/agents');
      expect(seen).toEqual(['Bearer first', 'Bearer second']);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it('reports missing token file as environment error', async () => expect(new PlatformClient({ ...config, tokenFile: '/missing/cv-token' }).json('/api/agents')).rejects.toBeInstanceOf(EnvironmentError));
  it('reports 401 as environment error', async () => expect(new PlatformClient(config, async () => new Response('{}', { status: 401 })).json('/api/agents')).rejects.toBeInstanceOf(EnvironmentError));
  it('does not accept HTTP 200 with failed envelope', async () => expect(new PlatformClient(config, async () => new Response('{"code":500,"msg":"failure"}')).json('/api/agents')).rejects.toThrow('API 200'));
  it('rejects invalid JSON envelope', async () => expect(new PlatformClient(config, async () => new Response('not json')).json('/api/agents')).rejects.toBeInstanceOf(ProtocolError));
  it('reports network failure separately', async () => expect(new PlatformClient(config, async () => { throw new TypeError('fetch failed'); }).json('/api/agents')).rejects.toBeInstanceOf(EnvironmentError));
});
describe('runner and reporting', () => {
  it('caches failed auth without repeated attempts', async () => {
    let requests = 0; const client = new PlatformClient(config, async () => { requests++; return new Response('{}', { status: 401 }); });
    const runner = new Runner(config, client); const cases = await loadCases();
    expect((await runner.execute(cases.find(c => c.id === 'P03')!)).status).toBe('environment_error');
    expect((await runner.execute(cases.find(c => c.id === 'C01')!)).status).toBe('environment_error'); expect(requests).toBe(1);
  });
  it('requires a suitable Agent instead of pretending an empty catalog passes', async () => {
    const runner = new Runner(config, new PlatformClient(config, async () => success([])));
    expect((await runner.execute({ id: 'x', group: 'protocol', action: 'discovery', title: 'x' })).status).toBe('failed');
  });
  it('does not accept mailbox receipt without final answer', async () => {
    const transport: typeof fetch = async (url) => {
      if (String(url).includes('/api/agents')) return success([{ key: 'a', mode: 'GENERAL', engine: 'native' }]);
      if (String(url).includes('/api/send')) return success({ mailId: 'm', status: 'queued' });
      return new Response('{}', { status: 404 });
    };
    const runner = new Runner(config, new PlatformClient(config, transport));
    const result = await runner.execute({ id: 'x', group: 'chat', action: 'send', title: 'receipt only' });
    expect(result.status).toBe('timeout'); expect(result.evidence.some(e => e.kind === 'receipt')).toBe(true);
  });
  it('never cleans existing unrelated Chat IDs', async () => {
    const calls: string[] = [];
    const runner = new Runner(config, new PlatformClient(config, async (url, init) => { calls.push(String(url) + String(init?.body)); return success({}); }));
    expect(await runner.cleanup()).toEqual([]); expect(calls).toEqual([]);
    runner.chats.add('cv_own'); expect(await runner.cleanup()).toEqual([]); expect(calls[0]).toContain('cv_own');
  });
  it('records cleanup failures', async () => {
    const runner = new Runner(config, new PlatformClient(config, async () => new Response('{}', { status: 500 })));
    runner.chats.add('cv_own'); expect(await runner.cleanup()).toEqual(['cv_own: cleanup HTTP 500']);
  });
  it('redacts nested credentials, JWT and resource tickets', () => {
    const data = { token: 'secret', nested: [{ authorization: 'Bearer secret', message: 'Bearer another', url: '/api/resource?t=secret' }], text: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature' };
    const text = JSON.stringify(redact(data)); expect(text).not.toContain('secret'); expect(text).not.toContain('another'); expect(text).not.toContain('eyJ');
  });
  it.each([[new Skipped('x'), 'skipped'], [new TimeoutError('x'), 'timeout'], [new EnvironmentError('x'), 'environment_error'], [new ProtocolError('x'), 'protocol_error'], [new Error('x'), 'failed']])('classifies %s', (error, expected) => expect(classify(error)).toBe(expected));
  it('returns nonzero for failed scenario, cleanup error or zero passes', () => {
    const result = (status: CaseResult['status']): CaseResult => ({ id: 'x', group: 'chat', title: 'x', status, durationMs: 0, evidence: [] });
    expect(exitCode([result('passed')], [])).toBe(0); expect(exitCode([result('skipped')], [])).toBe(2);
    expect(exitCode([result('environment_error')], [])).toBe(1); expect(exitCode([result('passed')], ['cleanup failed'])).toBe(1);
  });
});
