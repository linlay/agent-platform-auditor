export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type Strictness = "balanced" | "strict" | "exploratory";
export type RecordKind = "jsonl" | "sse" | "ws" | "live-events";
export type DetectedMode = RecordKind | "unknown";
export type Severity = "error" | "warning" | "info";

export interface SourceRange {
  startLine: number;
  endLine: number;
}

export interface ParsedRecord {
  kind: RecordKind;
  index: number;
  sourceRange: SourceRange;
  raw: string;
  data: JsonValue | null;
  lineType?: string | null;
  normalizedType?: string;
  eventType?: string | null;
  frame?: string | null;
  parseError?: boolean;
  legacy?: boolean;
  event?: JsonValue;
  isTerminal?: boolean;
  wsDirection?: string | null;
  wsOpcode?: number | null;
  wsTime?: number | null;
  wsEntryIndex?: number;
  wsMessageIndex?: number;
}

export interface AuditIssue {
  severity: Severity;
  code: string;
  title: string;
  recordIndex: number;
  path: string;
  expected: string;
  actual: string;
  message: string;
}

export interface ParseResult {
  records: ParsedRecord[];
  parseIssues: AuditIssue[];
  detectedMode: DetectedMode;
}

export interface TimelineEntry {
  recordIndex: number;
  time: number | string | null;
  seq: string | null;
  liveSeq: string | null;
  typeLabel: string;
  summary: string;
  kind: RecordKind;
  runId: string | null;
  chatId: string | null;
  wsDirection?: string | null;
  wsFrame?: string | null;
  wsType?: string | null;
  wsId?: string | null;
}

export interface AuditSummary {
  totalRecords: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  bySeverity: Record<Severity, number>;
  byKind: Record<string, number>;
  byIssueCode: Record<string, number>;
}

export interface AuditResult {
  summary: AuditSummary;
  issues: AuditIssue[];
  allIssues: AuditIssue[];
  normalizedRecords: ParsedRecord[];
  timeline: TimelineEntry[];
}
