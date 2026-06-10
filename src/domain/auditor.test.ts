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
      _type: "react",
      seq: 1.5
    }));

    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "liveSeq")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "seq")).toBe(true);
    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "messages.0._liveSeq")).toBe(true);
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

function recordFrom(data: JsonObject): ParsedRecord {
  const parsed = parseInput(JSON.stringify(data), "jsonl");
  return parsed.records[0];
}

function hydrateTestSchemas() {
  const manifest = readJson("public/schemas/manifest.json");
  const schemas = manifest.formats.jsonl.schemaPaths.map((schemaPath: string) => readJson(`public/${schemaPath}`));
  const rules = { jsonl: readJson(`public/${manifest.rules.jsonl}`) };
  hydrateSchemaRegistry(manifest, schemas, rules);
}

function readJson(relPath: string) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}
