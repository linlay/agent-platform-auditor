import type { AuditIssue, DetectedMode, JsonObject, JsonValue, ParsedRecord, ParseResult, RecordKind } from "./types";
import { isPlainObject, makeIssue } from "./utils";

export function detectMode(raw: string): DetectedMode {
  if (!raw.trim()) return "unknown";
  const lines = raw.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return "unknown";

  const first = lines[0].trim();
  if (first.charAt(0) === "{" && /"_type"\s*:/.test(first)) return "jsonl";
  if (/"_webSocketMessages"\s*:/.test(raw)) return "ws";
  if (/"frame"\s*:/.test(first)) return "ws";
  if (lines.some((line) => /^event:/i.test(line.trim()) || /^data:/i.test(line.trim()))) return "sse";

  if (first.charAt(0) === "{") {
    const parsed = tryParseJson(first);
    if (isPlainObject(parsed) && (parsed.seq !== undefined || parsed.type || parsed.timestamp)) {
      return "live-events";
    }
  }

  return "unknown";
}

export function parseInput(raw: string, mode: DetectedMode = detectMode(raw)): ParseResult {
  const records: ParsedRecord[] = [];
  const parseIssues: AuditIssue[] = [];

  switch (mode) {
    case "jsonl":
      parseJSONL(raw, records, parseIssues);
      break;
    case "sse":
      parseSSE(raw, records, parseIssues);
      break;
    case "ws":
      parseWS(raw, records, parseIssues);
      break;
    case "live-events":
      parseLiveEvents(raw, records, parseIssues);
      break;
    default:
      parseIssues.push(
        makeIssue(
          "error",
          "UNKNOWN_FORMAT",
          "无法识别的格式",
          -1,
          "",
          "jsonl / sse / ws / live-events",
          "unknown",
          "输入文本格式无法自动识别"
        )
      );
  }

  return { records, parseIssues, detectedMode: mode };
}

function parseJSONL(raw: string, records: ParsedRecord[], issues: AuditIssue[]): void {
  raw.split("\n").forEach((sourceLine, i) => {
    const line = sourceLine.trim();
    if (!line) return;
    const parsed = tryParseJson(line);
    if (parsed === null) {
      issues.push(
        makeIssue(
          "error",
          "PARSE_JSON",
          "JSON 解析失败",
          records.length,
          "",
          "valid JSON",
          line.substring(0, 80),
          `第 ${i + 1} 行不是合法 JSON`
        )
      );
      records.push(makeRecord("jsonl", records.length, i + 1, i + 1, line, null, { parseError: true, lineType: null }));
      return;
    }

    const data = parsed as JsonObject;
    const type = stringValue(data._type) || "unknown";
    records.push(
      makeRecord("jsonl", records.length, i + 1, i + 1, line, data, {
        lineType: type,
        normalizedType: type === "step" ? stringValue(data._stage) || "step" : type,
        legacy: type === "step"
      })
    );
  });
}

function parseSSE(raw: string, records: ParsedRecord[], issues: AuditIssue[]): void {
  const lines = raw.split("\n");
  let currentEvent: string | null = null;
  let currentData = "";
  let startLine = 1;
  let doneReached = false;

  const flushFrame = (endLine: number) => {
    if (!currentData.trim() && !currentEvent) return;
    const dataParsed = tryParseJson(currentData.trim());
    if (currentData.trim() && dataParsed === null) {
      issues.push(
        makeIssue(
          "error",
          "SSE_INVALID_DATA",
          "SSE data JSON 解析失败",
          records.length,
          "data",
          "valid JSON",
          currentData.substring(0, 80),
          `第 ${startLine}-${endLine} 行 data 不是合法 JSON`
        )
      );
    }
    records.push(
      makeRecord("sse", records.length, startLine, endLine, lines.slice(startLine - 1, endLine).join("\n"), dataParsed ?? currentData.trim(), {
        eventType: currentEvent || "message",
        lineType: doneReached ? "done" : "event"
      })
    );
    currentEvent = null;
    currentData = "";
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^\s*:/.test(line) && !/^:\s/.test(line)) return;

    if (trimmed === "[DONE]") {
      flushFrame(i + 1);
      doneReached = true;
      records.push(makeRecord("sse", records.length, i + 1, i + 1, line, null, { eventType: null, lineType: "done" }));
      return;
    }

    if (trimmed === "") {
      flushFrame(i + 1);
      startLine = i + 2;
      return;
    }

    const eventMatch = trimmed.match(/^event:\s*(.*)/i);
    if (eventMatch) {
      if (!currentEvent) startLine = i + 1;
      currentEvent = eventMatch[1].trim();
      return;
    }

    const dataMatch = trimmed.match(/^data:\s*(.*)/i);
    if (dataMatch) {
      if (!currentData && !currentEvent) startLine = i + 1;
      currentData += `${currentData ? "\n" : ""}${dataMatch[1]}`;
    }
  });

  flushFrame(lines.length);
}

function parseWS(raw: string, records: ParsedRecord[], issues: AuditIssue[]): void {
  const trimmed = raw.trim();
  const wholeParsed = tryParseJson(trimmed);
  if (wholeParsed && (Array.isArray(wholeParsed) || isPlainObject(wholeParsed))) {
    const harMessages = extractHarWebSocketMessages(wholeParsed);
    if (harMessages.length > 0) {
      harMessages.forEach((message) => parseHarWebSocketMessage(message, records, issues));
      return;
    }
    if (Array.isArray(wholeParsed)) {
      wholeParsed.forEach((frame, i) => parseOneWSFrame(frame, records, i + 1, i + 1));
      return;
    }
  }

  if (trimmed.charAt(0) === "[") {
    const parsed = tryParseJson(trimmed);
    if (Array.isArray(parsed)) {
      parsed.forEach((frame, i) => parseOneWSFrame(frame, records, i + 1, i + 1));
      return;
    }
  }

  raw.split("\n").forEach((sourceLine, i) => {
    const line = sourceLine.trim();
    if (!line) return;
    const parsed = tryParseJson(line);
    if (parsed === null) {
      issues.push(
        makeIssue(
          "error",
          "WS_PARSE_JSON",
          "WS JSON 解析失败",
          records.length,
          "",
          "valid JSON",
          line.substring(0, 80),
          `第 ${i + 1} 行不是合法 JSON`
        )
      );
      records.push(makeRecord("ws", records.length, i + 1, i + 1, line, null, { frame: null, parseError: true }));
      return;
    }
    parseOneWSFrame(parsed, records, i + 1, i + 1);
  });
}

interface HarWebSocketMessage {
  message: JsonObject;
  entryIndex: number;
  messageIndex: number;
}

function extractHarWebSocketMessages(value: JsonValue): HarWebSocketMessage[] {
  const messages: HarWebSocketMessage[] = [];
  let entryIndex = 0;

  const walk = (node: JsonValue): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isPlainObject(node)) return;

    if (Array.isArray(node._webSocketMessages)) {
      const currentEntryIndex = entryIndex;
      entryIndex += 1;
      node._webSocketMessages.forEach((message, messageIndex) => {
        if (isPlainObject(message)) {
          messages.push({ message, entryIndex: currentEntryIndex, messageIndex });
        }
      });
    }

    Object.keys(node).forEach((key) => {
      if (key === "_webSocketMessages") return;
      walk(node[key]);
    });
  };

  walk(value);
  return messages;
}

function parseHarWebSocketMessage(message: HarWebSocketMessage, records: ParsedRecord[], issues: AuditIssue[]): void {
  const data = message.message.data;
  const rawData = typeof data === "string" ? data.trim() : JSON.stringify(data) ?? "";
  let parsed: JsonValue | null = null;

  if (typeof data === "string") {
    parsed = tryParseJson(data.trim());
  } else if (isPlainObject(data)) {
    parsed = data;
  }

  if (parsed === null) {
    issues.push(
      makeIssue(
        "error",
        "WS_DATA_PARSE_JSON",
        "HAR WS data JSON 解析失败",
        -1,
        "data",
        "valid JSON string",
        rawData.substring(0, 80),
        `第 ${message.entryIndex + 1} 个 _webSocketMessages 数组的第 ${message.messageIndex + 1} 条 data 不是合法 JSON`
      )
    );
    return;
  }

  if (!isPlainObject(parsed) || parsed.frame === undefined) return;

  parseOneWSFrame(parsed, records, 1, 1, rawData, {
    wsDirection: stringValue(message.message.type),
    wsOpcode: numberValue(message.message.opcode),
    wsTime: normalizeWsTime(numberValue(message.message.time)),
    wsEntryIndex: message.entryIndex,
    wsMessageIndex: message.messageIndex
  });
}

function parseOneWSFrame(value: JsonValue, records: ParsedRecord[], startLine: number, endLine: number, rawValue?: string, extras: Partial<ParsedRecord> = {}): void {
  const frame = isPlainObject(value) && typeof value.frame === "string" ? value.frame : "unknown";
  records.push(
    makeRecord("ws", records.length, startLine, endLine, rawValue ?? JSON.stringify(value), value, {
      frame,
      event: isPlainObject(value) && frame === "stream" ? value.event : undefined,
      ...extras
    })
  );
}

function parseLiveEvents(raw: string, records: ParsedRecord[], issues: AuditIssue[]): void {
  raw.split("\n").forEach((sourceLine, i) => {
    const line = sourceLine.trim();
    if (!line) return;
    const parsed = tryParseJson(line);
    if (parsed === null) {
      issues.push(
        makeIssue(
          "error",
          "LIVE_PARSE_JSON",
          "Live event JSON 解析失败",
          records.length,
          "",
          "valid JSON",
          line.substring(0, 80),
          `第 ${i + 1} 行不是合法 JSON`
        )
      );
      return;
    }
    const eventType = isPlainObject(parsed) && typeof parsed.type === "string" ? parsed.type : "unknown";
    records.push(makeRecord("live-events", records.length, i + 1, i + 1, line, parsed, { eventType }));
  });
}

function makeRecord(
  kind: RecordKind,
  index: number,
  startLine: number,
  endLine: number,
  raw: string,
  data: JsonValue | null,
  extras: Partial<ParsedRecord> = {}
): ParsedRecord {
  return {
    kind,
    index,
    sourceRange: { startLine, endLine },
    raw,
    data,
    ...extras
  };
}

function tryParseJson(value: string): JsonValue | null {
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return null;
  }
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: JsonValue | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeWsTime(value: number | null): number | null {
  if (value === null) return null;
  return value < 1000000000000 ? Math.round(value * 1000) : value;
}
