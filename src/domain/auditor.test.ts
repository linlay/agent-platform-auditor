import { describe, expect, test, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { auditRecords, buildTimelineEntry } from "./auditor";
import { parseInput } from "./parsers";
import { hydrateSchemaRegistry, resetSchemaRegistryForTest } from "./schemaRegistry";
import type { JsonObject, ParsedRecord } from "./types";

const root = path.resolve(__dirname, "../..");
const legacyActualContextSizeKey = ["actual", "Size"].join("");
const legacyEstimatedContextSizeKey = ["estimated", "Size"].join("");
const legacyCachedTokensKey = ["cached", "Tokens"].join("");
const legacyPromptCacheHitTokensKey = ["promptCacheHit", "Tokens"].join("");
const legacyPromptCacheMissTokensKey = ["promptCacheMiss", "Tokens"].join("");

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

  test("query accepts raw messages and nested system LLM request metadata", () => {
    const validIssues = auditRaw(JSON.stringify(queryRecord("run-query-valid", "hello")));
    expect(validIssues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(validIssues.filter((issue) => issue.severity === "warning")).toHaveLength(0);

    const automationIssues = auditRaw(JSON.stringify(queryRecord("run-query-automation", "scheduled task", "automation")));
    expect(automationIssues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(automationIssues.filter((issue) => issue.severity === "warning")).toHaveLength(0);

    const complete = queryRecord("run-query-missing", "hello");
    const { messages, ...missingRecord } = complete;
    expect(messages).toBeDefined();

    const missingIssues = auditRaw(JSON.stringify(missingRecord));
    expect(missingIssues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "messages")).toBe(true);
    expect(missingIssues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "toolChoice")).toBe(false);
    expect(missingIssues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "requestOptions")).toBe(false);

    const nestedMetadataRecord = queryRecord("run-query-nested-metadata", "hello");

    const nestedIssues = auditRaw(JSON.stringify(nestedMetadataRecord));
    expect(nestedIssues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(nestedIssues.filter((issue) => issue.severity === "warning")).toHaveLength(0);

    const invalidIssues = auditRaw(JSON.stringify({
      ...queryRecord("run-query-invalid", "hello"),
      messages: [
        { role: "bot", content: "hello" },
        { role: "user", content: 42 }
      ],
      systems: [{
        toolChoice: "manual",
        requestOptions: {
          stream: "true",
          stream_options: { include_usage: "true" },
          temperature: "0"
        }
      }]
    }));

    expect(invalidIssues.some((issue) => issue.code === "INVALID_ENUM" && issue.path === "messages.0.role")).toBe(true);
    expect(invalidIssues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "messages.1.content")).toBe(true);
    expect(invalidIssues.some((issue) => issue.code === "INVALID_ENUM" && issue.path === "systems.0.toolChoice")).toBe(true);
    expect(invalidIssues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "systems.0.requestOptions.stream")).toBe(true);
    expect(invalidIssues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "systems.0.requestOptions.stream_options.include_usage")).toBe(true);
    expect(invalidIssues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "systems.0.requestOptions.temperature")).toBe(true);
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
          promptTokens: 19737,
          promptTokensDetails: {
            cacheHitTokens: 10240,
            cacheMissTokens: 9497
          },
          toolCallCount: 3,
          totalTokens: 19884,
          estimatedCost: {
            currency: "CNY",
            inputCacheHit: 0,
            inputCacheMiss: 0.014451,
            output: 0.001158,
            total: 0.015609
          }
        },
        contextWindow: {
          maxSize: 1048576,
          currentSize: 19737,
          estimatedNextCallSize: 19884
        },
        modelKey: "th-deepseek-v4-pro",
        reasoningEffort: "HIGH",
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
          currentSize: 3,
          maxSize: 10
        },
        _type: "react",
        seq: 2
      })
    ].join("\n"));

    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(issues.filter((issue) => issue.severity === "warning")).toHaveLength(0);
  });

  test("react-tool accepts tool messages without usage or contextWindow when seq matches previous react", () => {
    const issues = auditRaw([
      JSON.stringify(reactRecord("run-react-tool", 1, 6)),
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-tool",
        updatedAt: 1780837894331,
        liveSeq: 2,
        _type: "submit",
        submit: { ok: true }
      }),
      JSON.stringify(reactToolRecord("run-react-tool", 3, 6))
    ].join("\n"));

    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(issues.filter((issue) => issue.severity === "warning")).toHaveLength(0);
  });

  test("react-tool accepts non-negative tool message durationMs in milliseconds", () => {
    const validIssues = auditRaw([
      JSON.stringify(reactRecord("run-react-tool-duration", 1, 6)),
      JSON.stringify(reactToolRecord("run-react-tool-duration", 2, 6, { durationMs: 3 }))
    ].join("\n"));

    expect(validIssues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(validIssues.filter((issue) => issue.severity === "warning")).toHaveLength(0);

    const invalidIssues = auditRaw([
      JSON.stringify(reactRecord("run-react-tool-negative-duration", 1, 6)),
      JSON.stringify(reactToolRecord("run-react-tool-negative-duration", 2, 6, { durationMs: -1 }))
    ].join("\n"));

    expect(invalidIssues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "messages.0.durationMs")).toBe(true);
  });

  test("react-tool seq must match the previous react in the same run", () => {
    const issues = auditRaw([
      JSON.stringify(reactRecord("run-react-tool-mismatch", 1, 6)),
      JSON.stringify(reactToolRecord("run-react-tool-mismatch", 2, 5))
    ].join("\n"));

    expect(issues.some((issue) => issue.code === "REACT_TOOL_SEQ_MISMATCH" && issue.path === "seq" && issue.recordIndex === 1)).toBe(true);
  });

  test("react-tool requires a previous react in the same run", () => {
    const issues = auditRaw(JSON.stringify(reactToolRecord("run-react-tool-orphan", 1, 1)));

    expect(issues.some((issue) => issue.code === "REACT_TOOL_SEQ_MISMATCH" && issue.path === "seq" && issue.recordIndex === 0)).toBe(true);
  });

  test("react-tool missing liveSeq is reported by existing liveSeq rule", () => {
    const issues = auditRaw([
      JSON.stringify(reactRecord("run-react-tool-missing-live", 1, 1)),
      JSON.stringify(reactToolRecord("run-react-tool-missing-live", undefined, 1))
    ].join("\n"));

    expect(issues.some((issue) => issue.code === "MISSING_LIVESEQ" && issue.path === "liveSeq" && issue.recordIndex === 1)).toBe(true);
    expect(issues.some((issue) => issue.code === "REACT_TOOL_SEQ_MISMATCH")).toBe(false);
  });

  test("plan-execute usage accepts final details and rejects old aliases through the common schema", () => {
    const issues = auditRaw(JSON.stringify({
      chatId: "chat-1",
      runId: "run-plan-usage",
      updatedAt: 1780837895831,
      liveSeq: 1,
      messages: [{ role: "assistant", content: [] }],
      usage: {
        promptTokens: 1,
        promptTokensDetails: {
          cacheHitTokens: 0.5,
          cacheMissTokens: 0.5
        },
        completionTokens: 2,
        completionTokensDetails: {
          reasoningTokens: 1
        },
        totalTokens: 3,
        estimatedCost: {
          currency: "CNY",
          inputCacheHit: 0.00012480000000000002,
          inputCacheMiss: 0.0192,
          output: 0.001158,
          total: 0.0204828
        }
      },
      modelKey: "th-deepseek-v4-pro",
      reasoningEffort: "HIGH",
      _type: "plan-execute",
      stage: "plan",
      seq: 1
    }));

    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(issues.filter((issue) => issue.severity === "warning")).toHaveLength(0);

    const aliasIssues = auditRaw(JSON.stringify({
      chatId: "chat-1",
      runId: "run-plan-usage-alias",
      updatedAt: 1780837895831,
      liveSeq: 1,
      messages: [{ role: "assistant", content: [] }],
      usage: {
        promptTokens: 1,
        promptTokensDetails: {
          [legacyCachedTokensKey]: 1
        },
        completionTokens: 2,
        totalTokens: 3,
        [legacyPromptCacheHitTokensKey]: 1,
        [legacyPromptCacheMissTokensKey]: 0
      },
      _type: "plan-execute",
      stage: "plan",
      seq: 1
    }));

    expect(aliasIssues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === `usage.promptTokensDetails.${legacyCachedTokensKey}`)).toBe(true);
    expect(aliasIssues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === `usage.${legacyPromptCacheHitTokensKey}`)).toBe(true);
    expect(aliasIssues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === `usage.${legacyPromptCacheMissTokensKey}`)).toBe(true);
  });

  test("react requires top-level usage and contextWindow plus core nested fields", () => {
    const issues = auditRaw([
      JSON.stringify({
        chatId: "chat-1",
        runId: "run-react-required",
        updatedAt: 1780837893831,
        liveSeq: 1,
        messages: [{ role: "assistant", content: [] }],
        contextWindow: { currentSize: 1, maxSize: 10 },
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
        contextWindow: { currentSize: 3 },
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
          llmChatCompletionCount: -1,
          estimatedCost: {
            currency: "CNY",
            inputCacheHit: -0.01,
            inputCacheMiss: "0.01",
            output: 0,
            total: 0
          }
        },
        contextWindow: {
          currentSize: "3",
          estimatedNextCallSize: 2.5,
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
          modelKey: "th-deepseek-v4-pro",
          promptTokens: 1,
          promptTokensDetails: { cacheHitTokens: 1, extraPromptDetail: true },
          completionTokens: 2,
          completionTokensDetails: { reasoningTokens: 1, extraCompletionDetail: true },
          reasoningEffort: "HIGH",
          estimatedCost: {
            currency: "CNY",
            inputCacheHit: 0,
            inputCacheMiss: 0,
            output: 0,
            total: 0,
            extraField: true
          },
          totalTokens: 3,
          extraUsage: true
        },
        contextWindow: {
          currentSize: 3,
          maxSize: 10,
          [legacyActualContextSizeKey]: 3,
          [legacyEstimatedContextSizeKey]: 4,
          modelKey: "th-deepseek-v4-pro",
          reasoningEffort: "HIGH",
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
    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "usage.estimatedCost.inputCacheHit")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "usage.estimatedCost.inputCacheMiss")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "contextWindow.currentSize")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "contextWindow.estimatedNextCallSize")).toBe(true);
    expect(issues.some((issue) => issue.code === "VALUE_OUT_OF_RANGE" && issue.path === "contextWindow.maxSize")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.extraUsage")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.modelKey")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.reasoningEffort")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.estimatedCost.extraField")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.promptTokensDetails.extraPromptDetail")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "usage.completionTokensDetails.extraCompletionDetail")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === `contextWindow.${legacyActualContextSizeKey}`)).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === `contextWindow.${legacyEstimatedContextSizeKey}`)).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "contextWindow.modelKey")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_FIELD" && issue.path === "contextWindow.reasoningEffort")).toBe(true);
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
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "awaiting.0.questions")).toBe(true);
    expect(issues.some((issue) => issue.code === "NESTED_LIVESEQ")).toBe(true);
    expect(issues.some((issue) => issue.code === "LIVESEQ_DUPLICATE")).toBe(true);
    expect(issues.some((issue) => issue.code === "LIVESEQ_DECREASE")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_LIVESEQ")).toBe(true);
  });

  test("awaiting plan payload validates through JSON Schema", () => {
    const issues = auditRaw(JSON.stringify(reactRecordWithAwaiting({
      awaitingId: "mq97x6ji_coder_plan_confirm_1",
      mode: "plan",
      type: "awaiting.ask",
      runId: "mq97x6ji",
      agentKey: "coder-1780997036997",
      timestamp: 1781165515440,
      timeout: 0,
      viewportType: "builtin",
      viewportKey: "plan",
      plan: {
        id: "confirm",
        title: "实施此计划？",
        planningFile: "/Users/linlay/Project/zenmind/zenmind-env/chats/fd04b06a-57e8-4a46-8aa7-0b312ed8c5d1/.tools/plans/mq97x6ji_planning_1.md",
        planningId: "mq97x6ji_planning_1",
        options: [
          { decision: "approve", label: "是，实施此计划" },
          {
            decision: "reject",
            label: "否，请告知如何调整",
            input: {
              placeholder: "请告知如何调整",
              required: false,
              type: "text"
            }
          }
        ]
      }
    })));

    expect(issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(issues.filter((issue) => issue.severity === "warning")).toHaveLength(0);
  });

  test("awaiting plan payload schema reports invalid plan shapes", () => {
    const issues = auditRaw([
      JSON.stringify(reactRecordWithAwaiting({
        awaitingId: "await-missing-plan",
        mode: "plan",
        type: "awaiting.ask",
        runId: "run-awaiting-schema",
        agentKey: "coder",
        timestamp: 1780837893831,
        timeout: 60,
        viewportType: "builtin",
        viewportKey: "plan"
      }, 1)),
      JSON.stringify(reactRecordWithAwaiting({
        awaitingId: "await-options-type",
        mode: "plan",
        type: "awaiting.ask",
        runId: "run-awaiting-schema",
        agentKey: "coder",
        timestamp: 1780837894831,
        timeout: 60,
        viewportType: "builtin",
        viewportKey: "plan",
        plan: {
          id: "confirm",
          title: "实施此计划？",
          options: "approve"
        }
      }, 2)),
      JSON.stringify(reactRecordWithAwaiting({
        awaitingId: "await-option-required",
        mode: "plan",
        type: "awaiting.ask",
        runId: "run-awaiting-schema",
        agentKey: "coder",
        timestamp: 1780837895831,
        timeout: 60,
        viewportType: "builtin",
        viewportKey: "plan",
        plan: {
          id: "confirm",
          title: "实施此计划？",
          options: [
            { label: "是，实施此计划" },
            { decision: "reject" }
          ]
        }
      }, 3))
    ].join("\n"));

    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "awaiting.0.plan")).toBe(true);
    expect(issues.some((issue) => issue.code === "TYPE_MISMATCH" && issue.path === "awaiting.0.plan.options")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "awaiting.0.plan.options.0.decision")).toBe(true);
    expect(issues.some((issue) => issue.code === "MISSING_REQUIRED" && issue.path === "awaiting.0.plan.options.1.label")).toBe(true);
  });

  test("awaiting mode and event type are schema enums", () => {
    const issues = auditRaw([
      JSON.stringify(reactRecordWithAwaiting({
        awaitingId: "await-invalid-mode",
        mode: "review",
        type: "awaiting.ask",
        runId: "run-awaiting-schema",
        agentKey: "coder",
        timestamp: 1780837893831,
        timeout: 60,
        viewportType: "chat",
        viewportKey: "main",
        questions: []
      }, 1)),
      JSON.stringify(reactRecordWithAwaiting({
        awaitingId: "await-invalid-type",
        mode: "question",
        type: "awaiting.answer",
        runId: "run-awaiting-schema",
        agentKey: "coder",
        timestamp: 1780837894831,
        timeout: 60,
        viewportType: "chat",
        viewportKey: "main",
        questions: []
      }, 2))
    ].join("\n"));

    expect(issues.some((issue) => issue.code === "INVALID_ENUM" && issue.path === "awaiting.0.mode")).toBe(true);
    expect(issues.some((issue) => issue.code === "INVALID_ENUM" && issue.path === "awaiting.0.type")).toBe(true);
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
      contextWindow: { currentSize: 3, maxSize: 10 },
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

  test("react-tool exposes seq, liveSeq, type label, and message summary", () => {
    const record = recordFrom(reactToolRecord("run-react-tool-timeline", 11, 6));

    const entry = buildTimelineEntry(record)!;
    expect(entry.seq).toBe("6");
    expect(entry.liveSeq).toBe("11");
    expect(entry.typeLabel).toBe("react-tool");
    expect(entry.summary).toContain("messages 1");
    expect(entry.summary).toContain("tool x1");
    expect(entry.summary).toContain("ask_user_question");
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

function queryRecord(runId: string, message: string, role = "user"): JsonObject {
  return {
    chatId: "chat-1",
    runId,
    updatedAt: 1780837893831,
    liveSeq: 1,
    query: {
      requestId: `req-${runId}`,
      chatId: "chat-1",
      role,
      message,
      runId,
      agentKey: "coder",
      accessLevel: "default",
      stream: true
    },
    messages: [{ role: "user", content: message }],
    systems: [{
      cacheKey: "react:main",
      fingerprint: "sha256:test",
      systemMessage: { role: "system", content: "You are helpful" },
      tools: [],
      model: { key: "th-minimax", protocol: "OPENAI" },
      toolChoice: "auto",
      requestOptions: {
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0
      }
    }],
    _type: "query"
  };
}

function reactRecordWithAwaiting(awaiting: JsonObject, seq = 1): JsonObject {
  return {
    chatId: "chat-1",
    runId: "run-awaiting-schema",
    updatedAt: 1780837893000 + seq,
    liveSeq: seq,
    messages: [{ role: "assistant", content: [] }],
    usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    contextWindow: { currentSize: 3, maxSize: 10 },
    awaiting: [awaiting],
    _type: "react",
    seq
  };
}

function reactRecord(runId: string, liveSeq: number, seq: number): JsonObject {
  return {
    chatId: "chat-1",
    runId,
    updatedAt: 1780837893831 + liveSeq,
    liveSeq,
    messages: [{ role: "assistant", content: [{ type: "text", text: "working" }] }],
    usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    contextWindow: { currentSize: 3, maxSize: 10 },
    _type: "react",
    seq
  };
}

function reactToolRecord(runId: string, liveSeq: number | undefined, seq: number, messageExtras: JsonObject = {}): JsonObject {
  return {
    chatId: "chat-1",
    runId,
    updatedAt: 1780837894831 + (liveSeq ?? 0),
    ...(liveSeq === undefined ? {} : { liveSeq }),
    messages: [
      {
        role: "tool",
        content: [{ type: "text", text: "[{\"id\":\"q1\",\"answers\":[\"测试指南\",\"Schema 架构说明\",\"审计错误码参考\"]}]" }],
        name: "ask_user_question",
        tool_call_id: "call_00_i2x6JApYatZaE9JdLMKn9423",
        ts: 1780837894831,
        ...messageExtras,
        _toolId: "call_00_i2x6JApYatZaE9JdLMKn9423"
      }
    ],
    _type: "react-tool",
    seq
  };
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
