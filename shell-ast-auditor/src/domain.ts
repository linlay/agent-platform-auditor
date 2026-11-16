export type J = null | boolean | number | string | J[] | { [key: string]: J };
export interface ReviewOptions {
  mode: "syntax-only" | "classification" | "evaluation";
  accessLevel?: "ask_for_approval" | "auto_approve" | "full_access";
  workspace?: string;
  cwd?: string;
  editing?: boolean;
}
export interface Policy {
  mode: string;
  accessLevel?: string;
  categories: string[];
  classifications?: J;
  context: string;
  syntaxSource: string;
  engine: string;
  decision?: {
    value: string;
    disposition: string;
    requiresHITL: boolean;
    blocked: boolean;
    autoApproved: boolean;
    reason: string;
  };
  [key: string]: unknown;
}
export interface Case {
  expectedEvidence?: string;
  mode?: string;
	projectDir?: string;
	templateCommand?: string;
  review?: ReviewOptions;
  id: string;
  command: string;
  dialect: string;
  profile: string;
  platforms: string[];
  tags: string[];
  expect: {
    policyByLevel?: Record<string, PolicyExpectation>;
    policyBasis?: string;
    syntax: string;
    gradeCeiling: string;
    containsCalls?: string[];
    containsArgv?: string[][];
    policy?: {
      mode: string;
      accessLevel?: string;
      decision?: string;
      requiresHITL?: boolean;
      categories?: string[];
    };
  };
  knownDifference?: {
    syntax: string;
    grade: string;
    recovered: boolean;
    diagnosticCodes: string[];
    reason: string;
  };
  source: J;
  options?: Record<string, boolean>;
  adaptedFrom?: string;
}
export interface PolicyExpectation {
  mode: string;
  accessLevel?: string;
  decision?: string;
  requiresHITL?: boolean;
  categories?: string[];
}
export const approvalLevels = ["ask_for_approval", "auto_approve", "full_access"] as const;
export function expectedPolicy(c: Case): PolicyExpectation | undefined {
  if (c.review?.mode === "evaluation" && c.expect.policyByLevel)
    return c.expect.policyByLevel[c.review.accessLevel ?? ""];
  return c.expect.policy;
}
export interface Status {
  syntax: string;
  grade: string;
  recovered: boolean;
  profile: string;
  coverage: string;
  classification: string;
}
export interface Report {
  policy?: Policy;
  status: Status;
  structure?: J;
  nativeTree?: J;
  execPoints?: J[];
  relations?: J[];
  opaque?: J[];
  diagnostics?: J[];
  [key: string]: unknown;
}
export interface Check {
  verdict: string;
  issues: string[];
}
export interface Result {
  checks?: { parsing: Check; approval: Check };
  input?: { command: string; templateCommand?: string; projectDir?: string; review?: ReviewOptions; dialect?: string; profile?: string; options?: Record<string, boolean> };
  parser?: ParserInfo;
  host?: string;
  parsedAt?: string;
  runId?: string;
  policy?: Policy;
  report?: Report;
  status?: Status;
  exitCode?: number;
  durationMs?: number;
  error?: string;
  state: "running" | "done" | "cancelled" | "error";
  check?: Check;
}
export interface Testset {
  id: string;
  title: string;
  version: string;
  description: string;
  cases: Case[];
}
export interface ParserInfo {
  supportsPolicy: boolean;
  sha256: string;
  mode: string;
  sourceCommit?: string;
  sourceDirty: boolean;
  sourceFingerprint?: string;
  builtAt?: string;
  goVersion?: string;
}
export interface Health {
	projectRoot: string;
  app: string;
  pid: number;
  parserAvailable: boolean;
  parser?: ParserInfo;
}
export interface Run {
  kind?: string;
  reviewOverride?: ReviewOptions;
  parser?: ParserInfo;
  id: string;
  testsetId: string;
  testsetVersion: string;
  testsetHash: string;
  parserSha256: string;
  host: string;
  state: string;
  startedAt: string;
  cases?: Case[];
  results: Record<string, Result>;
  counts: Record<string, number>;
}
export interface Comparison {
  id: string;
  kind: string;
  baseRunId?: string;
  targetRunId: string;
  counts: Record<string, number>;
  rows: {
    caseId: string;
    command: string;
    expected?: Case["expect"];
    verdict: string;
    changedFields?: string[];
    before?: Result;
    after?: Result;
  }[];
}
export const obj = (v: J | undefined): { [key: string]: J } =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v : {};
export function describeCheck(c: Check) {
  return (
    (
      {
        match: "符合预期",
        "known-difference": "已知差异",
        mismatch: "不符合预期",
        error: "解析或报告错误",
        "not-run": "未运行",
      } as Record<string, string>
    )[c.verdict] + (c.issues.length ? " · " + c.issues.join("; ") : "")
  );
}
export function byteSlice(text: string, start: number, end?: number) {
  return new TextDecoder().decode(
    new TextEncoder().encode(text).slice(start, end),
  );
}
