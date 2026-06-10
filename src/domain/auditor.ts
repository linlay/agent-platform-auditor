import type { AuditIssue, AuditResult, AuditSummary, JsonObject, JsonValue, ParsedRecord, Strictness, TimelineEntry } from "./types";
import { EVENT_PAYLOAD_SCHEMAS, STREAM_EVENT_TYPES, TERMINAL_EVENTS, WS_FRAMES } from "./schema";
import { evaluateJsonl } from "./rulesEngine";
import { validateJsonl } from "./schemaValidator";
import { compactText, hasValue, isPlainObject, makeIssue, shortJson } from "./utils";

export function auditRecords(records: ParsedRecord[], options: { strictness?: Strictness; parseIssues?: AuditIssue[] } = {}): AuditResult {
  const strictness = options.strictness ?? "balanced";
  const issues: AuditIssue[] = [];
  const normalizedRecords: ParsedRecord[] = [];
  const timeline: TimelineEntry[] = [];

  records.forEach((rec, i) => {
    if (rec.parseError) {
      normalizedRecords.push(rec);
      return;
    }

    if (rec.kind === "jsonl") auditJSONLRecord(rec, issues, strictness);
    if (rec.kind === "sse") auditSSERecord(rec, i, issues, records);
    if (rec.kind === "ws") auditWSRecord(rec, issues, strictness);
    if (rec.kind === "live-events") auditLiveEventRecord(rec, i, issues, records, strictness);

    normalizedRecords.push(rec);
    const entry = buildTimelineEntry(rec);
    if (entry) timeline.push(entry);
  });

  issues.push(...evaluateJsonl(records, strictness));
  crossRecordValidation(records, issues);

  timeline.sort((a, b) => timestampValue(a.time) - timestampValue(b.time));
  const summary = buildSummary(records, issues);
  const allIssues = [...(options.parseIssues ?? []), ...issues];
  return { summary, issues, allIssues, normalizedRecords, timeline };
}

function auditJSONLRecord(rec: ParsedRecord, issues: AuditIssue[], strictness: Strictness): void {
  if (!isPlainObject(rec.data)) return;
  const type = stringValue(rec.data._type) || "unknown";
  rec.lineType = type;
  issues.push(...validateJsonl(rec, strictness));
}

function auditSSERecord(rec: ParsedRecord, idx: number, issues: AuditIssue[], allRecords: ParsedRecord[]): void {
  if (rec.lineType === "done") return;
  if (!isPlainObject(rec.data)) return;
  const data = rec.data;

  if (data.seq === undefined) {
    issues.push(makeIssue("error", "MISSING_SEQ", "SSE 事件缺少 seq", idx, "seq", "number (必需)", "undefined", "SSE 事件帧应包含 seq 字段"));
  } else if (typeof data.seq !== "number") {
    issues.push(makeIssue("error", "TYPE_MISMATCH", "seq 类型错误", idx, "seq", "number", typeof data.seq, "seq 应为数字"));
  }

  if (data.type === undefined) {
    issues.push(makeIssue("error", "MISSING_TYPE", "SSE 事件缺少 type", idx, "type", "string (必需)", "undefined", "SSE 事件帧应包含 type 字段"));
  } else if (typeof data.type === "string" && !STREAM_EVENT_TYPES.includes(data.type as never)) {
    issues.push(makeIssue("warning", "UNKNOWN_EVENT_TYPE", "未知 event type", idx, "type", STREAM_EVENT_TYPES.join(", "), JSON.stringify(data.type), `event type '${data.type}' 不在已知 stream event type 中`));
  }

  if (data.timestamp === undefined) {
    issues.push(makeIssue("warning", "MISSING_TIMESTAMP", "SSE 事件缺少 timestamp", idx, "timestamp", "number (推荐)", "undefined", "建议包含 timestamp 字段"));
  }

  if (typeof data.seq === "number") {
    const prevMaxSeq = maxPriorSeq(allRecords, idx, (record) => record.kind === "sse" ? record.data : null);
    if (data.seq < prevMaxSeq) {
      issues.push(makeIssue("error", "SEQ_DECREASE", "seq 非递增", idx, "seq", `≥ ${prevMaxSeq}`, JSON.stringify(data.seq), `seq 从 ${prevMaxSeq} 降到 ${data.seq}`));
    }
  }

  if (typeof data.type === "string" && TERMINAL_EVENTS.includes(data.type as never)) rec.isTerminal = true;
}

function auditWSRecord(rec: ParsedRecord, issues: AuditIssue[], strictness: Strictness): void {
  if (!isPlainObject(rec.data)) return;
  const data = rec.data;
  const frame = stringValue(data.frame);

  if (!frame) {
    issues.push(makeIssue("error", "MISSING_FRAME", "WS 消息缺少 frame", rec.index, "frame", "request|response|stream|push|error", "undefined", "WebSocket JSON 消息应包含 frame 字段"));
    return;
  }
  if (!WS_FRAMES.includes(frame as never)) {
    issues.push(makeIssue("error", "INVALID_FRAME", "frame 值无效", rec.index, "frame", WS_FRAMES.join(", "), JSON.stringify(frame), `frame '${frame}' 不在合法 frame 类型中`));
    return;
  }

  if ((frame === "request" || frame === "response" || frame === "stream") && !data.id) {
    issues.push(makeIssue("error", "MISSING_ID", `${frame} frame 缺少 id`, rec.index, "id", "string (必需)", "undefined", `${frame} frame 应包含 id 字段`));
  }

  if (frame === "stream") {
    if (!data.streamId) {
      issues.push(makeIssue("warning", "MISSING_STREAM_ID", "stream frame 缺少 streamId", rec.index, "streamId", "string (推荐)", "undefined", "stream frame 建议包含 streamId"));
    }
    if (isPlainObject(data.event)) {
      auditLiveEventData(data.event, rec.index, issues, strictness, true);
    } else if (!data.reason && data.lastSeq === undefined) {
      issues.push(makeIssue("warning", "MISSING_EVENT_OR_TERMINAL", "stream frame 无 event 也无结束标记", rec.index, "event", "event 对象 或 reason/lastSeq", "undefined", "非 terminal stream frame 应包含 event；terminal 应包含 reason/lastSeq"));
    }
    if (data.reason || data.lastSeq !== undefined) rec.isTerminal = true;
  }

  if ((frame === "response" || frame === "error") && data.code === undefined) {
    issues.push(makeIssue("warning", "MISSING_CODE", `${frame} frame 缺少 code`, rec.index, "code", "number (推荐)", "undefined", `${frame} frame 建议包含 code 字段`));
  }
  if ((frame === "response" || frame === "error") && !data.msg) {
    issues.push(makeIssue("warning", "MISSING_MSG", `${frame} frame 缺少 msg`, rec.index, "msg", "string (推荐)", "undefined", `${frame} frame 建议包含 msg`));
  }
}

function auditLiveEventRecord(rec: ParsedRecord, idx: number, issues: AuditIssue[], allRecords: ParsedRecord[], strictness: Strictness): void {
  if (!isPlainObject(rec.data)) return;
  auditLiveEventData(rec.data, idx, issues, strictness, false);
  if (typeof rec.data.seq === "number") {
    const prevMaxSeq = maxPriorSeq(allRecords, idx, (record) => record.data);
    if (rec.data.seq < prevMaxSeq) {
      issues.push(makeIssue("error", "SEQ_DECREASE", "seq 非递增", idx, "seq", `≥ ${prevMaxSeq}`, JSON.stringify(rec.data.seq), `seq 从 ${prevMaxSeq} 降到 ${rec.data.seq}`));
    }
  }
}

function auditLiveEventData(data: JsonObject, idx: number, issues: AuditIssue[], strictness: Strictness, isNested: boolean): void {
  const prefix = isNested ? "event." : "";
  if (data.type === undefined) {
    issues.push(makeIssue("error", "MISSING_TYPE", "事件缺少 type", idx, `${prefix}type`, "string (必需)", "undefined", "事件应包含 type 字段"));
  } else if (typeof data.type === "string" && !STREAM_EVENT_TYPES.includes(data.type as never)) {
    issues.push(makeIssue("warning", "UNKNOWN_EVENT_TYPE", "未知 event type", idx, `${prefix}type`, STREAM_EVENT_TYPES.join(", "), JSON.stringify(data.type), `event type '${data.type}' 不在已知集合中`));
  }

  if (data.seq === undefined) {
    issues.push(makeIssue("error", "MISSING_SEQ", "事件缺少 seq", idx, `${prefix}seq`, "number (必需)", "undefined", "事件应包含 seq 字段"));
  }
  if (data.timestamp === undefined) {
    issues.push(makeIssue("warning", "MISSING_TIMESTAMP", "事件缺少 timestamp", idx, `${prefix}timestamp`, "number (推荐)", "undefined", "建议包含 timestamp 字段"));
  }

  if (typeof data.type === "string" && EVENT_PAYLOAD_SCHEMAS[data.type]) {
    const allowed = EVENT_PAYLOAD_SCHEMAS[data.type];
    Object.keys(data).forEach((key) => {
      if (key === "seq" || key === "type" || key === "timestamp") return;
      if (allowed[key] !== undefined || strictness === "exploratory") return;
      issues.push(makeIssue(strictness === "strict" ? "error" : "warning", "UNKNOWN_PAYLOAD_FIELD", `事件 payload 未知字段 ${key}`, idx, `${prefix}${key}`, Object.keys(allowed).join(", "), JSON.stringify(data[key]), `事件类型 '${data.type}' 的 payload 中未知字段 '${key}'`));
    });
  }
}

function crossRecordValidation(records: ParsedRecord[], issues: AuditIssue[]): void {
  const runGroups: Record<string, { idx: number; rec: ParsedRecord }[]> = {};
  records.forEach((rec, i) => {
    if (!isPlainObject(rec.data) || rec.parseError || typeof rec.data.runId !== "string") return;
    runGroups[rec.data.runId] ||= [];
    runGroups[rec.data.runId].push({ idx: i, rec });
  });

  Object.entries(runGroups).forEach(([runId, group]) => {
    if (group.length < 2) return;
    const chatIds = new Set<string>();
    group.forEach(({ rec }) => {
      if (isPlainObject(rec.data) && typeof rec.data.chatId === "string") chatIds.add(rec.data.chatId);
    });
    if (chatIds.size > 1) {
      const values = [...chatIds];
      issues.push(makeIssue("error", "CHATID_INCONSISTENT", `runId=${runId} 的 chatId 不一致`, group[0].idx, "chatId", values[0], JSON.stringify(values), `同 runId=${runId} 的记录存在多个 chatId: ${values.join(", ")}`));
    }
  });
}

export function buildTimelineEntry(rec: ParsedRecord): TimelineEntry | null {
  const data = rec.data;
  if (!data) return null;
  const d = isPlainObject(data) ? data : null;
  const type = inferTypeLabel(rec);
  return {
    recordIndex: rec.index,
    time: d ? numberOrString(d.updatedAt) ?? numberOrString(d.timestamp) : null,
    seq: inferSeq(data),
    liveSeq: inferLiveSeq(data),
    typeLabel: type,
    summary: buildTimelineSummary(rec),
    kind: rec.kind,
    runId: d && typeof d.runId === "string" ? d.runId : null,
    chatId: d && typeof d.chatId === "string" ? d.chatId : null
  };
}

function buildTimelineSummary(rec: ParsedRecord): string {
  const data = rec.data;
  if (!isPlainObject(data)) return compactText(data || rec.raw || rec.lineType || rec.kind, 160);

  if (rec.kind === "jsonl") {
    const type = stringValue(data._type) || "?";
    if (type === "query") return compactText(isPlainObject(data.query) ? data.query.message : "query", 160);
    if (type === "react" || type === "plan-execute" || type === "step") return summarizeMessagesRecord(data);
    if (type === "planning") {
      const event = isPlainObject(data.event) ? data.event : {};
      const parts = [stringValue(event.type), stringValue(event.text) ? compactText(event.text, 140) : "", stringValue(event.planningFile) ? `file ${compactText(event.planningFile, 80)}` : ""].filter(Boolean);
      return parts.join(" · ") || summarizeObject(event);
    }
    if (type === "submit") return summarizeObject(isPlainObject(data.submit) ? data.submit : isPlainObject(data.answer) ? data.answer : data, ["status", "message", "error", "answer", "params"]);
    return summarizeObject(data);
  }

  if (rec.kind === "sse") {
    if (rec.lineType === "done") return "stream done";
    return summarizeObject(selectPayloadObject(data));
  }
  if (rec.kind === "ws") {
    if (isPlainObject(data.event)) return summarizeObject(selectPayloadObject(data.event));
    return summarizeObject(data);
  }
  if (rec.kind === "live-events") return summarizeObject(selectPayloadObject(data));
  return summarizeObject(data);
}

function inferTypeLabel(rec: ParsedRecord): string {
  const d = isPlainObject(rec.data) ? rec.data : null;
  if (rec.kind === "jsonl") return stringValue(d?._type) || "?";
  if (rec.kind === "sse") return rec.lineType === "done" ? "[DONE]" : stringValue(d?.type) || rec.eventType || "sse-event";
  if (rec.kind === "ws") return rec.frame || stringValue(d?.frame) || "ws";
  return stringValue(d?.type) || "live-event";
}

function inferSeq(data: JsonValue): string | null {
  if (!isPlainObject(data)) return null;
  if (hasValue(data.seq)) return String(data.seq);
  if (hasValue(data._seq)) return String(data._seq);
  if (isPlainObject(data.event) && hasValue(data.event.seq)) return String(data.event.seq);
  return null;
}

function inferLiveSeq(data: JsonValue): string | null {
  if (!isPlainObject(data)) return null;
  if (hasValue(data.liveSeq)) return String(data.liveSeq);
  if (isPlainObject(data.query) && hasValue(data.query.liveSeq)) return String(data.query.liveSeq);
  if (isPlainObject(data.event) && hasValue(data.event.liveSeq)) return String(data.event.liveSeq);
  if (isPlainObject(data.submit) && hasValue(data.submit.liveSeq)) return String(data.submit.liveSeq);
  if (isPlainObject(data.answer) && hasValue(data.answer.liveSeq)) return String(data.answer.liveSeq);
  if (!Array.isArray(data.messages)) return null;

  const vals = data.messages.flatMap((msg) => {
    if (!isPlainObject(msg)) return [];
    if (hasValue(msg._liveSeq)) return [String(msg._liveSeq)];
    if (hasValue(msg.liveSeq)) return [String(msg.liveSeq)];
    return [];
  });
  if (vals.length === 0) return null;
  if (vals.length === 1) return vals[0];
  return vals[0] === vals[vals.length - 1] ? vals[0] : `${vals[0]}-${vals[vals.length - 1]}`;
}

function summarizeMessagesRecord(data: JsonObject): string {
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const parts: string[] = [];
  if (messages.length > 0) {
    const roleCounts = summarizeRoleCounts(messages);
    parts.push(`messages ${messages.length}${roleCounts ? ` (${roleCounts})` : ""}`);
    const snippets: string[] = [];
    for (let i = messages.length - 1; i >= 0 && snippets.length < 2; i -= 1) {
      const snippet = summarizeMessage(messages[i]);
      if (snippet) snippets.unshift(snippet);
    }
    if (snippets.length > 0) parts.push(snippets.join(" | "));
  } else {
    parts.push("messages 0");
  }

  const tools = collectToolNames(messages);
  if (tools.length > 0) parts.push(`tools ${tools.slice(0, 4).join(", ")}`);
  if (isPlainObject(data.usage) && hasValue(data.usage.totalTokens)) parts.push(`tokens ${data.usage.totalTokens}`);
  if (isPlainObject(data.contextWindow)) {
    const actual = data.contextWindow.actualSize || data.contextWindow.estimatedSize;
    const max = data.contextWindow.maxSize;
    if (hasValue(actual) && hasValue(max)) parts.push(`ctx ${actual}/${max}`);
    else if (hasValue(actual)) parts.push(`ctx ${actual}`);
  }
  return parts.join(" · ");
}

function summarizeObject(obj: unknown, preferredKeys: string[] = ["message", "text", "delta", "error", "finishReason", "status", "toolName", "toolLabel", "actionName", "description", "query", "sourceCount", "chunkCount", "model", "usage", "contextWindow"]): string {
  if (!isPlainObject(obj)) return compactText(obj, 160);
  const parts: string[] = [];
  const used = new Set<string>();
  const noisy = new Set(["chatId", "runId", "requestId", "submitId", "steerId", "agentKey", "taskId", "timestamp", "updatedAt", "createdAt", "seq", "liveSeq", "_type", "type"]);

  preferredKeys.forEach((key) => {
    if (parts.length >= 3 || !hasValue(obj[key])) return;
    parts.push(`${key}: ${compactText(obj[key], 90)}`);
    used.add(key);
  });
  Object.keys(obj).forEach((key) => {
    if (parts.length >= 3 || used.has(key) || noisy.has(key) || !hasValue(obj[key])) return;
    parts.push(`${key}: ${compactText(obj[key], 90)}`);
  });

  return parts.join(" · ") || compactText(obj, 160) || "no summary fields";
}

function summarizeRoleCounts(messages: JsonValue[]): string {
  const counts: Record<string, number> = {};
  messages.forEach((msg) => {
    const role = isPlainObject(msg) && typeof msg.role === "string" ? msg.role : "message";
    counts[role] = (counts[role] || 0) + 1;
  });
  const order = ["system", "user", "assistant", "tool"];
  return [...order.filter((role) => counts[role]).map((role) => `${role} x${counts[role]}`), ...Object.keys(counts).filter((role) => !order.includes(role)).map((role) => `${role} x${counts[role]}`)].join(", ");
}

function summarizeMessage(msg: JsonValue): string {
  if (!isPlainObject(msg)) return "";
  const role = stringValue(msg.role) || "message";
  const text = extractContentText(msg.content) || extractContentText(msg.reasoning_content);
  if (text) return `${role}: ${text}`;
  const names = collectToolNames([msg]);
  if (names.length > 0) return `${role} tool_calls: ${names.join(", ")}`;
  if (msg.tool_call_id) return `${role}: tool result ${msg.tool_call_id}`;
  return role;
}

function extractContentText(content: unknown): string {
  if (!hasValue(content)) return "";
  if (typeof content === "string") return compactText(content, 160);
  if (!Array.isArray(content)) return compactText(content, 160);
  return compactText(content.map((item) => {
    if (typeof item === "string") return item;
    if (!isPlainObject(item)) return "";
    return item.text ?? item.delta ?? item.content ?? "";
  }).join(" "), 160);
}

function collectToolNames(messages: JsonValue[]): string[] {
  const seen = new Set<string>();
  messages.forEach((msg) => {
    if (!isPlainObject(msg) || !Array.isArray(msg.tool_calls)) return;
    msg.tool_calls.forEach((call) => {
      if (!isPlainObject(call) || !isPlainObject(call.function) || typeof call.function.name !== "string") return;
      seen.add(call.function.name);
    });
  });
  return [...seen];
}

function buildSummary(records: ParsedRecord[], issues: AuditIssue[]): AuditSummary {
  const bySeverity = { error: 0, warning: 0, info: 0 };
  const byIssueCode: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  issues.forEach((issue) => {
    bySeverity[issue.severity] += 1;
    byIssueCode[issue.code] = (byIssueCode[issue.code] || 0) + 1;
  });
  records.forEach((record) => {
    byKind[record.kind] = (byKind[record.kind] || 0) + 1;
  });
  return {
    totalRecords: records.length,
    errorCount: bySeverity.error,
    warningCount: bySeverity.warning,
    infoCount: bySeverity.info,
    bySeverity,
    byKind,
    byIssueCode
  };
}

function selectPayloadObject(data: JsonObject): unknown {
  if (isPlainObject(data.payload)) return data.payload;
  if (isPlainObject(data.data)) return data.data;
  return data;
}

function maxPriorSeq(records: ParsedRecord[], idx: number, selectData: (record: ParsedRecord) => JsonValue | null): number {
  let max = -1;
  for (let i = 0; i < idx; i += 1) {
    const data = selectData(records[i]);
    if (isPlainObject(data) && typeof data.seq === "number" && data.seq > max) max = data.seq;
  }
  return max;
}

function timestampValue(value: number | string | null): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function numberOrString(value: JsonValue | undefined): number | string | null {
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}
