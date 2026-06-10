import { describe, expect, test, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { auditRecords, buildTimelineEntry } from "./auditor";
import { parseInput } from "./parsers";
import { hydrateSchemaRegistry, resetSchemaRegistryForTest } from "./schemaRegistry";
import type { JsonObject, ParsedRecord } from "./types";

const root = path.resolve(__dirname, "../..");

beforeEach(() => {
  resetSchemaRegistryForTest();
  hydrateTestSchemas();
});

describe("JSONL auditing", () => {
  test("valid JSONL fixtures compile and produce no error/warning issues", () => {
    const issues = auditFixture("valid-all-types.jsonl");
    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(issues.filter((issue) => issue.severity === "warning")).toHaveLength(0);
    expect(issues.filter((issue) => issue.code === "LEGACY_STEP").length).toBeGreaterThanOrEqual(1);
  });

  test("react usage and contextWindow accept complete and minimal core shapes", () => {
    const issues = auditRaw([
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-usage",
        updatedAt: 1780837893831,
        liveSeq: 1,
        messages: [{ role: "assistant", content: [] }],
        usage: {
          completionTokens: 147,
          completionTokensDetails: { reasoningTokens: 38 },
          llmChatCompletionCount: 1,
          modelKey: "th-deepseek-v4-pro",
          promptTokens: 19737,
          promptTokensDetails: {
            cacheHitTokens: 10240,
            cacheMissTokens: 9497
          },
          reasoningEffort: "HIGH",
          toolCallCount: 3,
          totalTokens: 19884
        },
        contextWindow: {
          actualSize: 19737,
          estimatedSize: 19884,
          maxSize: 1048576,
          modelKey: "th-deepseek-v4-pro",
          reasoningEffort: "HIGH"
        },
        _type: "react",
        seq: 1
      }),
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-usage",
        updatedAt: 1780837894831,
        liveSeq: 2,
        messages: [{ role: "assistant", content: [] }],
        usage: {
          promptTokens: 1,
          completionTokens: 2,
          totalTokens: 3
        },
        contextWindow: {
          actualSize: 3,
          maxSize: 10
        },
        _type: "react",
        seq: 2
      })
    ].join("\n"));

    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(issues.filter((issue) => issue.severity === "warning")).toHaveLength(0);
  });

  test("react requires top-level usage and contextWindow plus core nested fields", () => {
    const issues = auditRaw([
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-required",
        updatedAt: 1780837893831,
        liveSeq: 1,
        messages: [{ role: "assistant", content: [] }],
        contextWindow: { actualSize: 1, maxSize: 10 },
        _type: "react",
        seq: 1
      }),
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-required",
        updatedAt: 1780837894831,
        liveSeq: 2,
        messages: [{ role: "assistant", content: [] }],
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
        _type: "react",
        seq: 2
      }),
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-required",
        updatedAt: 1780837895831,
        liveSeq: 3,
        messages: [{ role: "assistant", content: [] }],
        usage: { promptTokens: 1, completionTokens: 2 },
        contextWindow: { actualSize: 3 },
        _type: "react",
        seq: 3
      })
    ].join("\n"));

    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "usage")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "contextWindow")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "usage.totalTokens")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "contextWindow.maxSize")).toBe(true);
  });

  test("react usage and contextWindow reject invalid numbers and unknown fields", () => {
    const issues = auditRaw([
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-invalid",
        updatedAt: 1780837893831,
        liveSeq: 1,
        messages: [{ role: "assistant", content: [] }],
        usage: {
          promptTokens: -1,
          completionTokens: 1.5,
          totalTokens: "2",
          llmChatCompletionCount: -1
        },
        contextWindow: {
          actualSize: "3",
          estimatedSize: 2.5,
          maxSize: 0
        },
        _type: "react",
        seq: 1
      }),
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-invalid",
        updatedAt: 1780837894831,
        liveSeq: 2,
        messages: [{ role: "assistant", content: [] }],
        usage: {
          promptTokens: 1,
          promptTokensDetails: { cacheHitTokens: 1, extraPromptDetail: true },
          completionTokens: 2,
          completionTokensDetails: { reasoningTokens: 1, extraCompletionDetail: true },
          totalTokens: 3,
          extraUsage: true
        },
        contextWindow: {
          actualSize: 3,
          maxSize: 10,
          extraContext: true
        },
        _type: "react",
        seq: 2
      })
    ].join("\n"));

    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "usage.promptTokens")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "usage.completionTokens")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "usage.totalTokens")).toBe(true);
    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "usage.llmChatCompletionCount")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "contextWindow.actualSize")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "contextWindow.estimatedSize")).toBe(true);
    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "contextWindow.maxSize")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.extraUsage")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.promptTokensDetails.extraPromptDetail")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.completionTokensDetails.extraCompletionDetail")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "contextWindow.extraContext")).toBe(true);
  });

  test("schema validation reports required, type, enum, and unknown-field issues", () => {
    const issues = auditFixture("invalid-schema.jsonl", "balanced");
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "runId")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "updatedAt")).toBe(true);
    expect(issues.some((issue) => issue.code === "INVALID_ENUM" && issue.path === "query.role")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "extraTop" && issue.severity === "error")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "query.extraNested" && issue.severity === "error")).toBe(true);

    const exploratoryIssues = auditFixture("invalid-schema.jsonl", "exploratory");
    expect(exploratoryIssues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "extraTop" && issue.severity === "error")).toBe(true);
  });

  test("JSONL rules report usage, context, awaiting, and liveSeq issues", () => {
    const issues = auditFixture("invalid-rules.jsonl", "balanced");
    expect(issues.some((issue) => issue.code === "USAGE_TOKEN_SUM")).toBe(true);
    expect(issues.some((issue) => issue.code === "CONTEXT_OVERFLOW")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "awaiting[0].questions")).toBe(true);
    expect(issues.some((issue) => issue.code === "NESTED_LIVESEQ")).toBe(true);
    expect(issues.some((issue) => issue.code === "LIVESEQ_DUPLICATE")).toBe(true);
    expect(issues.some((issue) => issue.code === "LIVESEQ_DECREASE")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_LIVESEQ")).toBe(true);
  });

  test("JSONL routing requires top-level _type and ignores top-level type fallback", () => {
    const issues = auditRaw(JSON.stringify({
      chatId: "chat-1",
      runId: "run-type-only",
      updatedAt: 1780837893831,
      liveSeq: 1,
      type: "query",
      query: {
        requestId: "req-1",
        chatId: "chat-1",
        role: "user",
        message: "hello",
        runId: "run-type-only"
      }
    }));

    expect(issues.some((issue) => issue.code === "INVALID_TYPE" && issue.path === "_type")).toBe(true);
  });

  test("event and steer JSONL records use envelope schemas", () => {
    const issues = auditFixture("invalid-event-steer.jsonl", "balanced");
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "event")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "steer")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "type" && issue.severity === "error")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "extraTop" && issue.severity === "error")).toBe(true);
  });

  test("liveSeq missing is enforced by _type even when the run has no liveSeq", () => {
    const issues = auditFixture("missing-liveseq-by-type.jsonl", "balanced");
    const missingLiveSeq = issues.filter((issue) => issue.code === "MISSING_LIVESEQ");
    expect(missingLiveSeq.map((issue) => issue.recordIndex).sort()).toEqual([0, 1, 2, 3]);
  });

  test("cursor fields require positive integers", () => {
    const issues = auditRaw(JSON.stringify({
      chatId: "chat-1",
      runId: "run-cursors",
      updatedAt: 1780837893831,
      liveSeq: 0,
      messages: [{ role: "assistant", content: [], _liveSeq: 0 }],
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      contextWindow: { actualSize: 3, maxSize: 10 },
      _type: "react",
      seq: 1.5
    }));

    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "liveSeq")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "seq")).toBe(true);
    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "messages.0._liveSeq")).toBe(true);
  });
});

describe("WebSocket auditing", () => {
  test("HAR websocket messages parse only business data frames", () => {
    const raw = fs.readFileSync(path.join(root, "test/fixtures/ws/har-websocket.json"), "utf8");
    const parsed = parseInput(raw);
    expect(parsed.detectedMode).toBe("ws");
    expect(parsed.parseIssues).toHaveLength(0);
    expect(parsed.records.map((record) => record.frame)).toEqual(["request", "push", "response", "stream", "stream"]);
    expect(parsed.records).toHaveLength(5);
    expect(parsed.records[0].data).toMatchObject({
      frame: "request",
      type: "/api/query",
      id: "req-1",
      payload: { message: "hello" }
    });
    expect(parsed.records[0].wsDirection).toBe("send");
    expect(parsed.records[0].wsOpcode).toBe(1);
    expect(parsed.records[0].wsTime).toBe(1781103136100);
    expect(parsed.records[0].wsEntryIndex).toBe(0);
    expect(parsed.records[0].wsMessageIndex).toBe(1);

    const result = auditRecords(parsed.records, { parseIssues: parsed.parseIssues });
    expect(result.allIssues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(result.timeline.map((entry) => entry.typeLabel)).toEqual(["request", "push", "response", "stream", "stream"]);
    expect(result.timeline[0].time).toBe(1781103136100);
  });

  test("HAR websocket data parse errors are parse issues and non-business frames are skipped", () => {
    const raw = JSON.stringify({
      log: {
        entries: [
          {
            _webSocketMessages: [
              { type: "receive", time: 1, opcode: 1, data: "{\"type\":\"hot\"}" },
              { type: "receive", time: 2, opcode: 1, data: "{bad json" },
              { type: "receive", time: 3, opcode: 1, data: "{\"frame\":\"push\",\"type\":\"connected\",\"data\":{}}" }
            ]
          }
        ]
      }
    });

    const parsed = parseInput(raw);
    expect(parsed.detectedMode).toBe("ws");
    expect(parsed.records.map((record) => record.frame)).toEqual(["push"]);
    expect(parsed.parseIssues).toHaveLength(1);
    expect(parsed.parseIssues[0]).toMatchObject({ code: "WS_DATA_PARSE_JSON", path: "data" });
  });

  test("WS schema reports frame and core request payload problems", () => {
    const raw = [
      JSON.stringify({ frame: "bogus", type: "/api/query", id: "bad-frame" }),
      JSON.stringify({ frame: "response", type: "/api/query", id: "missing-msg", code: 0 }),
      JSON.stringify({ frame: "request", type: "/api/submit", id: "bad-submit", payload: { runId: "run-1", agentKey: "coder", awaitingId: "await-1", params: { answer: "nope" } } }),
      JSON.stringify({ frame: "request", type: "/api/access-level", id: "bad-access", payload: { runId: "run-1", agentKey: "coder", accessLevel: "admin" } })
    ].join("\n");

    const issues = auditAnyRaw(raw);
    expect(issues.some((issue) => issue.code === "INVALID_FRAME" && issue.path === "frame")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "msg")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "payload.params")).toBe(true);
    expect(issues.some((issue) => issue.code === "INVALID_ENUM" && issue.path === "payload.accessLevel")).toBe(true);
  });

  test("bare websocket arrays remain supported", () => {
    const parsed = parseInput(JSON.stringify([{ frame: "push", type: "connected", data: { sessionId: "ws_1" } }]), "ws");
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].frame).toBe("push");
  });
});

describe("timeline fields", () => {
  test("query exposes time, seq, liveSeq, type label, and summary separately", () => {
    const record = recordFrom({
      chatId: "chat-1",
      runId: "run-1",
      updatedAt: 1780837893831,
      liveSeq: 1,
      query: {
        requestId: "req-1",
        chatId: "chat-1",
        role: "user",
        message: "hello timeline",
        runId: "run-1"
      },
      _type: "query"
    });

    const entry = buildTimelineEntry(record)!;
    expect(entry.time).toBe(1780837893831);
    expect(entry.seq).toBeNull();
    expect(entry.liveSeq).toBe("1");
    expect(entry.typeLabel).toBe("query");
    expect(entry.summary).toBe("hello timeline");
  });

  test("react exposes seq and message liveSeq range outside the summary", () => {
    const record = recordFrom({
      chatId: "chat-1",
      runId: "run-1",
      updatedAt: 1780837959517,
      messages: [
        { role: "assistant", content: [{ type: "text", text: "first" }], _liveSeq: 17 },
        { role: "tool", tool_call_id: "tc-1", content: [{ type: "text", text: "done" }], _liveSeq: 31 }
      ],
      _type: "react",
      seq: 1
    });

    const entry = buildTimelineEntry(record)!;
    expect(entry.seq).toBe("1");
    expect(entry.liveSeq).toBe("17-31");
    expect(entry.typeLabel).toBe("react");
    expect(entry.summary).not.toContain("seq=1");
    expect(entry.summary).not.toContain("liveSeq");
  });
});

function auditFixture(fixture: string, strictness: "balanced" | "strict" | "exploratory" = "balanced") {
  const raw = fs.readFileSync(path.join(root, "test/fixtures/jsonl", fixture), "utf8");
  return auditRaw(raw, strictness);
}

function auditRaw(raw: string, strictness: "balanced" | "strict" | "exploratory" = "balanced") {
  const parsed = parseInput(raw, "jsonl");
  const result = auditRecords(parsed.records, { strictness, parseIssues: parsed.parseIssues });
  return result.allIssues;
}

function auditAnyRaw(raw: string, strictness: "balanced" | "strict" | "exploratory" = "balanced") {
  const parsed = parseInput(raw);
  const result = auditRecords(parsed.records, { strictness, parseIssues: parsed.parseIssues });
  return result.allIssues;
}

function recordFrom(data: JsonObject): ParsedRecord {
  const parsed = parseInput(JSON.stringify(data), "jsonl");
  return parsed.records[0];
}

function hydrateTestSchemas() {
  const manifest = readJson("public/schemas/manifest.json");
  const schemaPaths = [...new Set(
    Object.values(manifest.formats)
      .flatMap((format: any) => format.schemaPaths ?? [])
  )] as string[];
  const schemas = schemaPaths.map((schemaPath: string) => readJson(`public/${schemaPath}`));
  const rules = { jsonl: readJson(`public/${manifest.rules.jsonl}`) };
  hydrateSchemaRegistry(manifest, schemas, rules);
}

function readJson(relPath: string) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}
