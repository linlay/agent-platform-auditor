import { Workflow, workflowActions } from './workflows.js';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PlatformClient } from '../platform/client.js';
import { assistantText, assertCompleted } from '../platform/sse.js';
import { assertLiveSequence, persistedQuery } from '../platform/contracts.js';
import { arr, check, obj, str, EnvironmentError, ProtocolError, Skipped, TimeoutError, type Evidence, type CaseDefinition, type CaseResult, type Config, type Json, type Obj, type Status } from '../types.js';

export function classify(error: unknown): Status {
  if (error instanceof Skipped) return 'skipped';
  if (error instanceof EnvironmentError) return 'environment_error';
  if (error instanceof TimeoutError) return 'timeout';
  if (error instanceof ProtocolError) return 'protocol_error';
  return 'failed';
}
export class Runner {
  readonly client: PlatformClient;
  readonly chats = new Set<string>();
  private archived = new Set<string>();
  private authError: string | undefined;
  private agents: Obj[] | undefined;
  private target: string | undefined;
  private baseline: { chatId: string; runId: string; marker: string; events: Obj[]; text: string } | undefined;
  private mail: { chatId: string; runId: string; marker: string; requestId: string; body: Obj; receipt: Obj } | undefined;
  constructor(readonly config: Config, client?: PlatformClient, private readonly progress?: (e:Evidence)=>void) { this.client = client ?? new PlatformClient(config); }
  private id(prefix: string): string { return `${prefix}_${randomUUID().replaceAll('-', '')}`; }
  private newChat(): string { const id = this.id('cv'); this.chats.add(id); return id; }
  async discover(): Promise<Obj[]> {
    if (this.authError) throw new EnvironmentError(this.authError);
    if (this.agents) return this.agents;
    try {
      const data = await this.client.json('/api/agents?includeChats=0');
      // The catalog response is a direct array under envelope.data.
      this.agents = arr(data).map(obj);
      return this.agents;
    } catch (error) {
      if (error instanceof EnvironmentError) this.authError = error.message;
      throw error;
    }
  }
  private async agent(): Promise<string> {
    if (this.target) return this.target;
    const agents = await this.discover();
    const selected = this.config.agentKey
      ? agents.find(a => a.key === this.config.agentKey)
      : agents.find(a => a.mode === 'GENERAL' && a.engine === 'native' && !a.workspaceDir);
    if (!selected) throw new EnvironmentError('No suitable native GENERAL Agent; configure PLATFORM_AGENT_KEY');
    check(selected.engine === 'native' && !['BOT', 'TEAM', 'PROXY', 'CHANNEL'].includes(String(selected.mode)), 'Test Agent must be ordinary native Agent');
    this.target = str(selected.key);
    this.client.evidence.push({ kind: 'target', agentKey: this.target, mode: selected.mode });
    return this.target;
  }
  private async detail(chatId: string): Promise<Obj> { return obj(await this.client.json(`/api/chat?chatId=${encodeURIComponent(chatId)}&includeRawMessages=false`)); }
  private async jsonl(chatId: string): Promise<Obj[]> {
    const reply = await this.client.raw(`/api/chat/jsonl?chatId=${encodeURIComponent(chatId)}`);
    check(reply.status === 200, `JSONL HTTP ${reply.status}`);
    const rows = reply.text.trim().split('\n').filter(Boolean).map(line => obj(JSON.parse(line)));
    this.client.evidence.push({ kind: 'jsonl', chatId, rows });
    return rows;
  }
  private async round(message: string, chatId = this.newChat(), extra: Obj = {}, target?: string): Promise<{chatId: string; runId: string; events: Obj[]; text: string}> {
    const agentKey = target ?? await this.agent();
    const requestId = this.id('request');
    let runId = '';
    try {
      const events = await this.client.query({ requestId, agentKey, chatId, message, accessLevel: 'ask_for_approval', ...extra }, event => {
        if (typeof event.runId === 'string') runId = event.runId;
        if (event.type === 'awaiting.ask') throw new Error('Scenario unexpectedly requires human input');
      });
      const terminal = assertCompleted(events);
      runId = str(terminal.runId);
      const text = assistantText(events);
      check(text.trim(), 'Run completed without assistant content');
      this.client.evidence.push({ kind: 'round', requestId, chatId, runId, message, text, events });
      return { chatId, runId, events, text };
    } catch (error) {
      this.client.evidence.push({ kind: 'round-error', requestId, chatId, runId });
      // A timed-out stream does not prove the Run stopped; send HTTP interrupt
      // with the same principal/transport before eventual chat cleanup.
      if (runId) {
        try { await this.client.json('/api/interrupt', 'POST', { agentKey, runId, chatId, requestId: this.id('cancel'), message: 'chat-validator scenario failed or timed out' }); }
        catch (cancelError) { this.client.evidence.push({ kind: 'interrupt-error', message: String(cancelError) }); }
      }
      throw error;
    }
  }
  private async base() {
    if (!this.baseline) {
      const marker = this.id('CV_MEMORY');
      const result = await this.round(`记住本对话的秘密口令 ${marker}。只原样回复该口令，不要调用工具。`);
      check(result.text.includes(marker), 'Initial answer omitted marker');
      this.baseline = { ...result, marker };
    }
    this.client.evidence.push({ kind: 'fixture', chatId: this.baseline.chatId, runId: this.baseline.runId, marker: this.baseline.marker });
    return this.baseline;
  }
  private async sent() {
    if (!this.mail) {
      const chatId = this.newChat();
      const agentKey = await this.agent();
      const marker = this.id('CV_MAIL');
      const requestId = this.id('mail');
      const body: Obj = { requestId, chatId, agentKey, message: `只回复 ${marker}，不要调用工具。`, accessLevel: 'ask_for_approval' };
      const receipt = obj(await this.client.json('/api/send', 'POST', body));
      check(typeof receipt.mailId === 'string' && receipt.mailId, 'Missing mailId');
      this.client.evidence.push({ kind: 'receipt', requestId, chatId, receipt });
      const result = await this.waitAnswer(chatId, marker);
      this.mail = { chatId, marker, requestId, body, receipt, runId: result.runId };
    }
    this.client.evidence.push({ kind: 'mail-fixture', ...this.mail });
    return this.mail;
  }
  private async waitAnswer(chatId: string, marker: string): Promise<{ runId: string; detail: Obj }> {
    const deadline = Date.now() + this.config.timeoutMs;
    while (Date.now() < deadline) {
      const response = await this.client.raw(`/api/chat?chatId=${encodeURIComponent(chatId)}&includeRawMessages=false`);
      if (response.status === 404) { await delay(250); continue; }
      if (response.status !== 200) throw new Error(`Polling Chat failed: ${response.status}`);
      const detail = obj(obj(response.json).data);
      const events = arr(detail.events).map(obj);
      if (detail.awaiting) throw new Error('Scenario unexpectedly requires human input');
      if (!detail.activeRun && detail.lastRunId) {
        const runId = str(detail.lastRunId);
        const terminals = events.filter(e => e.runId === runId && ['run.complete', 'run.error', 'run.cancel'].includes(String(e.type)));
        assertCompleted(terminals);
        check(str(detail.lastRunContent).includes(marker), 'Final mailbox answer omitted marker');
        this.client.evidence.push({ kind: 'mail-final', chatId, runId, text: detail.lastRunContent, terminals });
        return { runId, detail };
      }
      await delay(350);
    }
    throw new TimeoutError('Mailbox receipt received but no completed final answer before deadline');
  }
  async execute(definition: CaseDefinition): Promise<CaseResult> {
    this.client.evidence = [];
    const started = Date.now();
    let status: Status = 'passed';
    let message: string | undefined;
    try { await this.perform(definition); }
    catch (error) { status = classify(error); message = error instanceof Error ? error.message : String(error); }
    return { id: definition.id, title: definition.title, group: definition.group, status, durationMs: Date.now() - started,
      ...(message ? { message } : {}), evidence: this.client.evidence };
  }
  private async perform(c: CaseDefinition): Promise<void> {
    if (c.action === 'project' && (!this.config.projectAgentKey || !this.config.projectFile || !this.config.projectExpect)) throw new Skipped('Set PLATFORM_PROJECT_AGENT_KEY, PLATFORM_PROJECT_FILE and PLATFORM_PROJECT_EXPECT for a dedicated readonly fixture');
    if (c.action === 'bot' && !this.config.botAgentKey) throw new Skipped('Set PLATFORM_BOT_AGENT_KEY for an isolated BOT test Chat');
    if (c.action === 'health') {
      const reply = await this.client.raw('/healthz', 'GET', undefined, false);
      check(reply.status === 200, `Health HTTP ${reply.status}`);
      const data = obj(obj(reply.json).data);
      check(data.runtime === 'ready', 'Runtime not ready');
      check(obj(data.kbase).required === false, 'Unexpected KBX health contract');
      this.client.evidence.push({ kind: 'health', data });
      return;
    }
    if (c.action === 'unauthenticated') {
      const reply = await this.client.raw('/api/agents', 'GET', undefined, false);
      if (reply.status === 200) throw new Skipped('Platform auth is disabled');
      check(reply.status === 401, `Expected unauthorized, got ${reply.status}`); return;
    }
    await this.discover();
    if (workflowActions.has(c.action)) {
      await new Workflow({client:this.client,config:this.config,agent:()=>this.agent(),newChat:()=>this.newChat(),progress:e=>this.progress?.(e)}).run(c.action); return;
    }
    if (c.action === 'http') {
      let body: Obj | string | undefined = c.raw ?? c.body;
      const mutation = ['/api/query', '/api/send'].includes(c.path?.split('?')[0] ?? '');
      const chatId = mutation ? this.newChat() : '';
      if (typeof body === 'string') {
        // Keep raw duplicate keys intact while still binding the request to an
        // explicit target and owned Chat if a broken server accepts it.
        body = body.replaceAll('{{agentKey}}', JSON.stringify(await this.agent()).slice(1, -1))
          .replaceAll('{{chatId}}', chatId).replaceAll('{{requestId}}', this.id('negative'));
      } else if (body) {
        body = JSON.parse(JSON.stringify(body).replaceAll('{{agentKey}}', await this.agent())) as Obj;
        if (mutation) body = { ...body, chatId };
      }
      const reply = await this.client.raw(c.path!, c.method ?? 'GET', body, c.authenticated ?? true);
      this.client.evidence.push({ kind: 'contract-response', request: body, chatId, response: reply.json ?? reply.text });
      check(reply.status === c.status, `Expected HTTP ${c.status}, got ${reply.status}: ${reply.text.slice(0, 500)}`);
      const envelope = obj(reply.json);
      check(envelope.code !== 0 && envelope.code !== undefined, 'Rejected request must have nonzero envelope code');
      if (c.error) check(new RegExp(c.error, 'i').test(reply.text), `Missing expected error ${c.error}: ${reply.text.slice(0, 500)}`);
      this.client.evidence.push({ kind: 'rejection', response: reply.json }); return;
    }
    if (c.action === 'discovery') {
      const agents = await this.discover();
      check(agents.length > 0, 'Agent catalog empty');
      check(new Set(agents.map(a => a.key)).size === agents.length, 'Duplicate Agent keys');
      await this.agent(); return;
    }
    if (c.action === 'agent-detail') {
      const data = obj(await this.client.json(`/api/agent?agentKey=${encodeURIComponent(await this.agent())}`));
      for (const field of ['definition', 'soulPrompt', 'agentsPrompt', 'source']) check(!(field in data), `Runtime leaks ${field}`);
      for (const field of ['tools', 'skills', 'connectors']) check(arr(data[field]).every(v => typeof v === 'string'), `${field} must be ID array`);
      return;
    }
    if (c.action === 'chat-list' || c.action === 'listed') {
      const base = c.action === 'listed' ? await this.base() : undefined;
      const data = arr(await this.client.json(`/api/chats?agentKey=${encodeURIComponent(await this.agent())}${base ? '' : '&limit=5'}`)).map(obj);
      for (const chat of data) {
        check(typeof chat.pinned === 'boolean' && typeof chat.primary === 'boolean', 'Missing pinned/primary flags');
        check(!('usage' in chat) && !('canContinue' in chat), 'Detail-only fields in list');
      }
      if (base) check(data.some(v => v.chatId === base.chatId), 'Created Chat missing in filtered list');
      return;
    }
    if (c.action === 'chat-order') {
      const data = obj(await this.client.json('/api/chats/order'));
      check(['recent', 'manual'].includes(str(data.sortMode)), 'Invalid sort mode');
      const pinnedIds = arr(data.pinnedChats).map(v => obj(v).chatId);
      check(JSON.stringify(pinnedIds) === JSON.stringify(data.pinnedOrder), 'Pinned ID projection differs'); return;
    }
    if (c.action === 'single') { await this.base(); return; }
    if (c.action === 'memory') {
      const base = await this.base();
      const result = await this.round('本对话前面让你记住的秘密口令是什么？只原样回复，不调用工具。', base.chatId);
      check(result.runId !== base.runId && result.text.includes(base.marker), 'Multi-turn context lost or Run ID reused'); return;
    }
    if (c.action === 'isolation') {
      const base = await this.base();
      const marker = this.id('CV_ISOLATED');
      const result = await this.round(`本对话只使用新口令 ${marker}。只回复该新口令，不要调用工具。`);
      check(result.text.includes(marker) && !result.text.includes(base.marker), 'Context leaked between independent chats');
      const history = JSON.stringify(await this.detail(result.chatId));
      check(!history.includes(base.marker), 'Foreign Chat marker found in persisted events'); return;
    }
    if (c.action === 'nonstream') {
      const marker = this.id('CV_JSON'); const chatId = this.newChat();
      const data = obj(await this.client.json('/api/query', 'POST', { agentKey: await this.agent(), chatId, requestId: this.id('request'), message: `只回复 ${marker}，不要调用工具。`, stream: false, includeUsage: true, includeFullText: true, accessLevel: 'ask_for_approval' }));
      check(str(data.content).includes(marker), 'Non-stream final marker missing');
      check(typeof data.fullText === 'string', 'Missing fullText');
      check(typeof obj(data.usage).totalTokens === 'number', 'Missing token usage');
      check(str((await this.detail(chatId)).lastRunContent) === data.content, 'JSON reply differs from persisted final answer');
      this.client.evidence.push({ kind: 'nonstream', chatId, data }); return;
    }
    if (c.action === 'unicode') {
      const marker = '中文验证🧪🌏'; const result = await this.round(`只原样回复以下文字，不调用工具：${marker}`);
      check(result.text.includes(marker) && !result.text.includes('\ufffd'), 'UTF-8 text corrupted'); return;
    }
    if (c.action === 'json-answer') {
      const marker = this.id('CV_STRUCT'); const result = await this.round(`只回复一个 JSON 对象 {"marker":"${marker}","sum":42}，不要 Markdown 围栏，不调用工具。`);
      const data = obj(JSON.parse(result.text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')));
      check(data.marker === marker && data.sum === 42, 'Structured answer mismatch'); return;
    }
    if (c.action === 'selection') {
      const marker = this.id('CV_REF');
      const result = await this.round('只回复引用材料中的验证码，不调用工具。', undefined, { references: [{ type: 'selection', id: 'cv-selection', text: `验证码：${marker}` }] });
      check(result.text.includes(marker), 'Selection text was not available to model'); return;
    }
    if (c.action === 'role' || c.action === 'editing') {
      const marker = this.id('CV_OPTION'); const extra: Obj = c.action === 'role' ? { role: 'system' } : { editingMode: false };
      const result = await this.round(`只回复 ${marker}，不调用工具。`, undefined, extra);
      check(result.text.includes(marker), 'Option test final marker missing');
      const lines = await this.jsonl(result.chatId);
      const line = persistedQuery(lines, result.runId);
      if (c.action === 'role') { check(obj(line.origin).type === 'user', 'Client role spoofed trusted origin'); check(obj(line.query).role === 'system', 'Original role missing from audit'); }
      else { check(line.editingMode === false && obj(line.query).editingMode === false, 'editingMode=false not preserved'); }
      this.client.evidence.push({ kind: 'persisted-query', line }); return;
    }
    if (c.action === 'sequence') {
      const base = await this.base();
      assertLiveSequence(base.events);
      check(base.events.some(e => e.type === 'request.query') && base.events.some(e => e.type === 'run.start'), 'Missing lifecycle start'); return;
    }
    if (c.action === 'replay') {
      const base = await this.base(); const detail = await this.detail(base.chatId);
      check(detail.chatId === base.chatId && detail.agentKey === await this.agent(), 'Chat owner mismatch');
      check(str(detail.lastRunContent).includes(base.marker), 'History lost marker');
      check(arr(detail.events).some(v => obj(v).type === 'run.complete' && obj(v).runId === base.runId), 'Missing replay terminal');
      check(!detail.activeRun && typeof detail.canContinue === 'boolean', 'Completed Chat still active or lacks continuation state'); return;
    }
    if (c.action === 'raw-query') {
      const base = await this.base(); const lines = await this.jsonl(base.chatId);
      const line = persistedQuery(lines, base.runId);
      const original = obj(line.query);
      check(!('editingMode' in original) && !('origin' in original), 'Platform defaults injected into original query');
      check(typeof line.editingMode === 'boolean' && obj(line.origin).type === 'user', 'Effective fields missing at top level');
      this.client.evidence.push({ kind: 'persisted-query', line }); return;
    }
    if (c.action === 'btw') {
      const base = await this.base(); const before = await this.detail(base.chatId);
      const beforeRows = await this.jsonl(base.chatId);
      const result = obj(await this.client.json('/api/query', 'POST', { agentKey: await this.agent(), chatId: base.chatId, requestId: this.id('btw'), lane: 'btw', stream: false, message: '只回复主对话让你记住的秘密口令，不调用工具。', accessLevel: 'ask_for_approval' }));
      check(str(result.sideId).startsWith('side_') && result.parentChatId === base.chatId, 'Invalid BTW branch identity');
      check(str(result.content).includes(base.marker), 'BTW missing parent context');
      const after = await this.detail(base.chatId);
      check(after.lastRunId === before.lastRunId && after.lastRunContent === before.lastRunContent && after.updatedAt === before.updatedAt, 'BTW changed main summary');
      check(JSON.stringify(beforeRows) === JSON.stringify(await this.jsonl(base.chatId)), 'BTW polluted main JSONL');
      this.client.evidence.push({ kind: 'btw', result }); return;
    }
    if (c.action === 'send') { await this.sent(); return; }
    if (c.action === 'send-idempotent') {
      const mail = await this.sent(); const before = await this.detail(mail.chatId);
      const again = obj(await this.client.json('/api/send', 'POST', mail.body));
      check(again.mailId === mail.receipt.mailId, 'Retry created a different mail');
      await delay(500); const after = await this.detail(mail.chatId);
      check(after.lastRunId === mail.runId && arr(after.runs).length === arr(before.runs).length && !after.activeRun, 'Retry launched duplicate Run'); return;
    }
    if (c.action === 'send-conflict') {
      const mail = await this.sent(); const before = await this.detail(mail.chatId);
      const reply = await this.client.raw('/api/send', 'POST', { ...mail.body, message: 'changed content' });
      this.client.evidence.push({ kind: 'conflict-response', requestId: mail.requestId, response: reply.json });
      // RequestError with no data uses its message in the HTTP envelope; the
      // API does not always expose its internal string code.
      const envelope = obj(reply.json);
      check(reply.status === 409 && envelope.code === 409 && /idempotency_conflict|requestId.*different content/i.test(reply.text), `Expected idempotency conflict: ${reply.status}: ${reply.text}`);
      const after = await this.detail(mail.chatId);
      check(after.lastRunId === before.lastRunId && arr(after.runs).length === arr(before.runs).length && !after.activeRun, 'Conflicting send changed Chat execution'); return;
    }
    if (c.action === 'rename-read') {
      const base = await this.base(); const name = this.id('CV_RENAMED');
      await this.client.json('/api/chat/rename', 'POST', { chatId: base.chatId, chatName: name });
      await this.client.json('/api/read', 'POST', { chatId: base.chatId });
      const detail = await this.detail(base.chatId);
      check(detail.chatName === name && obj(detail.read).isRead === true && obj(detail.read).readRunId === detail.lastRunId, 'Rename or read state not persisted'); return;
    }
    if (c.action === 'archive' || c.action === 'delete') {
      const marker = this.id('CV_LIFECYCLE'); const result = await this.round(`只回复 ${marker}，不调用工具。`);
      check(result.text.includes(marker), 'Lifecycle fixture did not finish');
      if (c.action === 'archive') {
        await this.client.json('/api/chat/archive', 'POST', { chatIds: [result.chatId] });
        this.archived.add(result.chatId);
        const reply = await this.client.raw('/api/query', 'POST', { agentKey: await this.agent(), chatId: result.chatId, message: 'must reject', accessLevel: 'ask_for_approval' });
        check(reply.status >= 400 && reply.status < 500, `Archived Chat accepted query: ${reply.status}`);
        check(/archiv/i.test(reply.text), 'Archived query failed for an unrelated reason');
      } else {
        await this.client.json('/api/chat/delete', 'POST', { chatId: result.chatId }); this.chats.delete(result.chatId);
        const reply = await this.client.raw(`/api/chat?chatId=${result.chatId}`);
        check(reply.status === 404, 'Deleted Chat still readable');
      }
      return;
    }
    if (c.action === 'project') {
      const { projectAgentKey, projectFile, projectExpect } = this.config;
      if (!projectAgentKey || !projectFile || !projectExpect) throw new Skipped('Set PLATFORM_PROJECT_AGENT_KEY, PLATFORM_PROJECT_FILE and PLATFORM_PROJECT_EXPECT for a dedicated readonly fixture');
      const target = (await this.discover()).find(a => a.key === projectAgentKey);
      check(target?.workspaceDir, 'Project target has no Workspace');
      const result = await this.round(`只读文件 ${JSON.stringify(projectFile)}，报告其中的内容。不要修改文件。`, undefined, { editingMode: false }, projectAgentKey);
      check(result.text.includes(projectExpect), 'Project fixture content missing');
      check(result.events.some(e => e.type === 'tool.result'), 'No actual tool result reading Project fixture'); return;
    }
    if (c.action === 'bot') {
      if (!this.config.botAgentKey) throw new Skipped('Set PLATFORM_BOT_AGENT_KEY for an isolated BOT test Chat');
      const target = arr(await this.client.json('/api/agents?includeChats=0')).map(obj).find(a => a.key === this.config.botAgentKey);
      check(target?.mode === 'BOT', 'Configured BOT target is not BOT');
      if (target.primaryChat) throw new Skipped('BOT already has a primary Chat; use a dedicated BOT without one to avoid modifying existing conversations');
      const existing = arr(await this.client.json(`/api/chats?agentKey=${encodeURIComponent(this.config.botAgentKey)}`)).map(v => obj(v).chatId);
      const marker = this.id('CV_BOT');
      const receipt = obj(await this.client.json('/api/send', 'POST', { requestId: this.id('bot'), agentKey: this.config.botAgentKey, primary: true, message: `只回复 ${marker}，不派活，不调用工具。`, accessLevel: 'ask_for_approval' }));
      const chatId = str(receipt.chatId);
      check(!existing.includes(chatId), 'BOT send unexpectedly targeted a pre-existing Chat');
      this.chats.add(chatId);
      this.client.evidence.push({ kind: 'bot-receipt', receipt, chatId });
      await this.waitAnswer(chatId, marker); return;
    }
    throw new ProtocolError(`Unknown scenario action: ${c.action}`);
  }
  async cleanup(): Promise<string[]> {
    if (this.config.keepChats) return [];
    const errors: string[] = [];
    for (const chatId of this.chats) {
      try {
        const endpoint = this.archived.has(chatId) ? '/api/archive/delete' : '/api/chat/delete';
        const response = await this.client.raw(endpoint, 'POST', { chatId });
        if (![200, 404].includes(response.status)) errors.push(`${chatId}: cleanup HTTP ${response.status}`);
        else if (response.status === 200 && obj(response.json).code !== 0) errors.push(`${chatId}: cleanup envelope reports failure`);
      } catch (error) { errors.push(`${chatId}: ${String(error)}`); }
    }
    return errors;
  }
}
