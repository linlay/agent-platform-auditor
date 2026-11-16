import { Case, Comparison, Result, Run } from "./domain";
import { taggedResults } from "./workspace";

export type ExportKind = "human" | "feedback" | "raw";
export interface ReportItem {
  key: string;
  side: "current" | "baseline";
  snapshot: Case;
  result?: Result;
  runId?: string;
}
export interface ReportData {
  schemaVersion: "shell-ast-audit-export/v1";
  generatedAt: string;
  scope: "accumulated" | "batch" | "comparison" | "free";
  testsetId: string;
  testsetTitle: string;
  items: ReportItem[];
  baseline: ReportItem[];
  runs: Record<string, Run>;
  comparison?: Comparison;
}
export interface ReportRequest {
  scope: ReportData["scope"];
  testsetId: string;
  testsetTitle: string;
  cases: Case[];
  results: Record<string, Result>;
  runId?: string;
  comparison?: Comparison;
}
export type ReadRun = (id: string) => Promise<Run>;
export type ReadResult = (runId: string, caseId: string) => Promise<Result>;

// Always recover definitions and versions from the original immutable run.
// A missing run fails export rather than attributing it to today's parser.
export async function collectReportData(request: ReportRequest, readRun: ReadRun): Promise<ReportData> {
  const data: ReportData = {
    schemaVersion: "shell-ast-audit-export/v1", generatedAt: new Date().toISOString(),
    scope: request.scope, testsetId: request.testsetId, testsetTitle: request.testsetTitle,
    items: [], baseline: [], runs: {}, comparison: request.comparison,
  };
  const getRun = async (id: string) => {
    if (!data.runs[id]) data.runs[id] = await readRun(id);
    return data.runs[id];
  };
  const runItems = (run: Run, side: ReportItem["side"]) => {
    const results = taggedResults(run);
    return (run.cases ?? []).map(snapshot => ({
      key: `${side}:${run.id}:${snapshot.id}`, side, snapshot,
      result: results[snapshot.id], runId: run.id,
    }));
  };
  if (request.scope === "comparison") {
    if (!request.comparison) throw Error("请先选择或生成对比报告。");
    const target = await getRun(request.comparison.targetRunId);
    data.items = runItems(target, "current");
    data.testsetId = target.testsetId;
    if (target.testsetId !== request.testsetId) data.testsetTitle = target.testsetId;
    if (request.comparison.baseRunId) {
      const base = await getRun(request.comparison.baseRunId);
      data.baseline = runItems(base, "baseline");
    }
  } else if (request.scope === "batch") {
    if (!request.runId) throw Error("请先运行测试集或选择已保存批次。");
    const run = await getRun(request.runId);
    data.items = runItems(run, "current");
    data.testsetId = run.testsetId;
    if (run.testsetId !== request.testsetId) data.testsetTitle = run.testsetId;
  } else {
    for (const current of request.cases) {
      const saved = request.results[current.id];
      if (!saved) continue;
      let snapshot = current, result = saved;
      if (saved.runId) {
        const run = await getRun(saved.runId);
        const frozen = run.cases?.find(c => c.id === current.id);
        if (!frozen) throw Error(`原运行中缺少用例：${saved.runId}/${current.id}`);
        snapshot = frozen;
        result = taggedResults(run)[current.id];
        // A cached raw result is valid only for the same frozen run.
        if (saved.report && saved.state === result.state) result = { ...result, report: saved.report, ...(saved.checks ? { checks: saved.checks } : {}) };
      }
      data.items.push({ key: `current:${saved.runId ?? "local"}:${current.id}`, side: "current", snapshot, result, runId: saved.runId });
    }
  }
  if (data.items.length === 0) throw Error("当前没有可导出的结果。");
  return data;
}

export async function loadReportEvidence(data: ReportData, keys: Set<string>, readResult: ReadResult): Promise<void> {
  for (const item of [...data.items, ...data.baseline]) {
    if (!keys.has(item.key) || item.result?.report || item.result?.state !== "done" || !item.runId) continue;
    const full = await readResult(item.runId, item.snapshot.id);
    if (!full.report) throw Error(`原始证据缺失：${item.runId}/${item.snapshot.id}`);
    item.result = { ...full, runId: item.runId };
  }
}

export function provenance(data: ReportData, item: ReportItem) {
  const run = item.runId ? data.runs[item.runId] : undefined;
  return {
    runId: item.runId ?? null, side: item.side,
    testsetId: run?.testsetId ?? data.testsetId,
    testsetVersion: run?.testsetVersion ?? null, testsetHash: run?.testsetHash ?? null,
    parser: run?.parser ?? item.result?.parser ?? null,
    parserSha256: run?.parserSha256 ?? item.result?.parser?.sha256 ?? null,
    host: run?.host ?? item.result?.host ?? null,
    startedAt: run?.startedAt ?? item.result?.parsedAt ?? null,
  };
}

export function sourceRuns(data: ReportData) {
  return Object.fromEntries(Object.entries(data.runs).map(([id, run]) => {
    const { cases: _cases, results: _results, ...metadata } = run;
    return [id, metadata];
  }));
}

export function exportedCase(snapshot: Case) {
  return snapshot.id === "custom" ? { ...snapshot, expect: null } : snapshot;
}

export function rawReport(data: ReportData) {
  return {
    schemaVersion: data.schemaVersion, generatedAt: data.generatedAt,
    testsetId: data.testsetId, scope: data.scope, sourceRuns: sourceRuns(data),
    cases: data.items.map(i => exportedCase(i.snapshot)),
    results: Object.fromEntries(data.items.map(i => [i.snapshot.id, i.result])),
    baseline: { cases: data.baseline.map(i => exportedCase(i.snapshot)), results: Object.fromEntries(data.baseline.map(i => [i.snapshot.id, i.result])) },
    comparison: data.comparison,
  };
}
