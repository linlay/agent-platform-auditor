import { useCallback, useEffect, useRef, useState } from "react";
import { auditRecords } from "./domain/auditor";
import { parseInput } from "./domain/parsers";
import { isSchemaRegistryLoaded, loadSchemaRegistry } from "./domain/schemaRegistry";
import type { AuditResult, DetectedMode, ParsedRecord, Strictness } from "./domain/types";
import { DetailTabs } from "./components/DetailTabs";
import { InputPanel } from "./components/InputPanel";
import { IssuesPanel } from "./components/IssuesPanel";
import { OverviewPanel } from "./components/OverviewPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { TopBar } from "./components/TopBar";

const sampleRaw = [
  JSON.stringify({
    chatId: "c4fd8bcd-1b6a-40e5-a905-829e4a917fca",
    runId: "mq4fzhc3",
    updatedAt: 1780837893831,
    liveSeq: 1,
    query: {
      requestId: "req_mq4fzhc3",
      chatId: "c4fd8bcd-1b6a-40e5-a905-829e4a917fca",
      role: "user",
      message: "Platform Auditor 前端审计器需求",
      runId: "mq4fzhc3",
      agentKey: "coder-1780103862382",
      accessLevel: "default",
      model: { key: "th-deepseek-v4-pro", reasoningEffort: "HIGH" },
      planningMode: true
    },
    messages: [{ role: "user", content: "Platform Auditor 前端审计器需求" }],
    systems: [{
      cacheKey: "react:main",
      fingerprint: "sha256:sample",
      systemMessage: { role: "system", content: "You are helpful" },
      tools: [],
      model: { key: "th-deepseek-v4-pro", reasoningEffort: "HIGH" },
      toolChoice: "auto",
      requestOptions: {
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0
      }
    }],
    _type: "query"
  }),
  JSON.stringify({
    chatId: "c4fd8bcd-1b6a-40e5-a905-829e4a917fca",
    runId: "mq4fzhc3",
    updatedAt: 1780837959517,
    liveSeq: 2,
    messages: [
      { role: "assistant", content: [{ type: "text", text: "Let me analyze..." }], ts: 1780837895908, _reasoningId: "r_1", _msgId: "m_1", _liveSeq: 43 },
      { role: "assistant", content: [{ type: "text", text: "Starting investigation..." }], ts: 1780837896000, _msgId: "m_2", _liveSeq: 64, tool_calls: [{ id: "tc_1", type: "function", function: { name: "file_read", arguments: "{\"file_path\":\"test\"}" } }] }
    ],
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, llmChatCompletionCount: 1 },
    contextWindow: { maxSize: 32000, currentSize: 500, estimatedNextCallSize: 450 },
    modelKey: "th-deepseek-v4-pro",
    reasoningEffort: "HIGH",
    systemRef: { cacheKey: "coder:plan", fingerprint: "sha256:abc123" },
    _type: "react",
    seq: 2
  })
].join("\n");

const modeLabels: Record<DetectedMode, string> = {
  jsonl: "JSONL (聊天记录)",
  sse: "SSE (实时事件流)",
  ws: "WebSocket Frame 日志",
  "live-events": "Live Events",
  unknown: "未识别"
};

export default function App() {
  const [raw, setRaw] = useState("");
  const [detectedMode, setDetectedMode] = useState<DetectedMode>("unknown");
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [strictness, setStrictness] = useState<Strictness>("balanced");
  const [schemaState, setSchemaState] = useState<"loading" | "ready" | "error">("loading");
  const [schemaError, setSchemaError] = useState("");
  const [fileError, setFileError] = useState("");
  const [selectedMode, setSelectedMode] = useState<DetectedMode | "auto">("auto");
  const initializedSample = useRef(false);

  const runParseAndAudit = useCallback((nextRaw: string, nextStrictness: Strictness = strictness, nextMode: DetectedMode | "auto" = selectedMode) => {
    if (!isSchemaRegistryLoaded()) {
      setSchemaState("error");
      setSchemaError("schema registry 尚未加载");
      return;
    }
    if (!nextRaw.trim()) return;
    const parsed = nextMode === "auto" ? parseInput(nextRaw) : parseInput(nextRaw, nextMode);
    const result = auditRecords(parsed.records, { strictness: nextStrictness, parseIssues: parsed.parseIssues });
    setDetectedMode(parsed.detectedMode);
    setRecords(parsed.records);
    setAuditResult(result);
    setSelectedRecordIndex(null);
  }, [strictness, selectedMode]);

  useEffect(() => {
    loadSchemaRegistry({ basePath: import.meta.env.BASE_URL })
      .then(() => {
        setSchemaState("ready");
        setSchemaError("");
        if (!initializedSample.current) {
          initializedSample.current = true;
          setRaw(sampleRaw);
          runParseAndAudit(sampleRaw);
        }
      })
      .catch((error: unknown) => {
        setSchemaState("error");
        setSchemaError(error instanceof Error ? error.message : String(error));
      });
  }, [runParseAndAudit]);

  const selectedRecord = selectedRecordIndex !== null ? records[selectedRecordIndex] ?? null : null;

  const handleParse = () => {
    runParseAndAudit(raw);
  };

  const handleSample = () => {
    setRaw(sampleRaw);
    setFileError("");
    runParseAndAudit(sampleRaw);
  };

  const handleStrictnessChange = (value: Strictness) => {
    setStrictness(value);
    if (records.length > 0) {
      const reparsed = selectedMode === "auto" ? parseInput(raw) : parseInput(raw, selectedMode);
      const result = auditRecords(reparsed.records, { strictness: value, parseIssues: reparsed.parseIssues });
      setRecords(reparsed.records);
      setAuditResult(result);
      setDetectedMode(reparsed.detectedMode);
      setSelectedRecordIndex(null);
    }
  };

  const handleFileText = (text: string) => {
    setRaw(text);
    setFileError("");
    runParseAndAudit(text);
  };

  return (
    <>
      <TopBar
        detectedModeLabel={schemaState === "loading" ? "加载 schema..." : schemaState === "error" ? "schema 加载失败" : modeLabels[detectedMode] || detectedMode}
        detectedMode={schemaState === "ready" ? detectedMode : "unknown"}
        severityFilter={severityFilter}
        onSeverityFilterChange={setSeverityFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        strictness={strictness}
        onStrictnessChange={handleStrictnessChange}
        disabled={schemaState !== "ready"}
      />

      <main className="main-layout">
        <aside className="left-panel">
          <InputPanel
            raw={raw}
            onRawChange={setRaw}
            onParse={handleParse}
            onLoadSample={handleSample}
            onFileText={handleFileText}
            disabled={schemaState !== "ready"}
            fileError={fileError}
            onFileError={setFileError}
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
          />
          <OverviewPanel auditResult={auditResult} schemaState={schemaState} schemaError={schemaError} />
          {auditResult ? (
            <IssuesPanel
              issues={auditResult.allIssues}
              filters={{ severity: severityFilter, searchQuery }}
              onSelectRecord={setSelectedRecordIndex}
            />
          ) : null}
        </aside>

        <section className="middle-panel">
          <TimelinePanel
            timeline={auditResult?.timeline ?? []}
            selectedIndex={selectedRecordIndex}
            onSelect={setSelectedRecordIndex}
          />
        </section>

        <aside className="right-panel">
          <DetailTabs
            record={selectedRecord}
            allIssues={auditResult?.allIssues ?? []}
          />
        </aside>
      </main>
    </>
  );
}
