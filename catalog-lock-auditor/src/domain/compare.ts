import type {
  AuditEngine,
  ComparisonRecord,
  GitRefOption,
  MonitorMode,
  ScenarioResult,
  ScaleProfile,
  TargetStatus,
} from "./types.js";

export interface ScenarioPairRow {
  id: string;
  name: string;
  category: string;
  watcher: ScenarioResult | null;
  polling: ScenarioResult | null;
  lockDiff: number;
  handleDiff: number;
}

export interface PairedComparisonView {
  lockReductionPct: number | null;
  handleReduction: number;
  watchedDirReduction: number;
  latencyDeltaMs: number;
  rows: ScenarioPairRow[];
}

/**
 * Pairs matching scenarios across Watcher and Polling runs and calculates
 * per-scenario as well as aggregate lock/handle/latency deltas.
 */
export function buildPairedComparison(cmp: ComparisonRecord): PairedComparisonView {
  const watcherById = new Map<string, ScenarioResult>();
  for (const r of cmp.watcherRun.results) {
    watcherById.set(r.id, r);
  }
  const pollingById = new Map<string, ScenarioResult>();
  for (const r of cmp.pollingRun.results) {
    pollingById.set(r.id, r);
  }

  const orderedIds: string[] = [];
  for (const r of cmp.pollingRun.results) {
    orderedIds.push(r.id);
  }
  for (const r of cmp.watcherRun.results) {
    if (!pollingById.has(r.id)) {
      orderedIds.push(r.id);
    }
  }

  const rows: ScenarioPairRow[] = [];
  for (const id of orderedIds) {
    const watcher = watcherById.get(id) ?? null;
    const polling = pollingById.get(id) ?? null;
    const primary = polling ?? watcher;
    if (!primary) {
      continue;
    }
    const wLocks = watcher ? watcher.lockErrors : 0;
    const pLocks = polling ? polling.lockErrors : 0;
    const wHandles = watcher ? watcher.handleDelta : 0;
    const pHandles = polling ? polling.handleDelta : 0;
    rows.push({
      id,
      name: primary.name,
      category: primary.category,
      watcher,
      polling,
      lockDiff: pLocks - wLocks,
      handleDiff: pHandles - wHandles,
    });
  }

  const wLocksTotal = cmp.watcherRun.summary.totalLockErrors;
  const pLocksTotal = cmp.pollingRun.summary.totalLockErrors;
  const lockReductionPct =
    wLocksTotal > 0
      ? Math.round(((wLocksTotal - pLocksTotal) / wLocksTotal) * 100)
      : null;

  return {
    lockReductionPct,
    handleReduction:
      cmp.watcherRun.summary.maxHandleDelta - cmp.pollingRun.summary.maxHandleDelta,
    watchedDirReduction:
      cmp.watcherRun.summary.maxWatchedDirs - cmp.pollingRun.summary.maxWatchedDirs,
    latencyDeltaMs:
      cmp.pollingRun.summary.avgLatencyMs - cmp.watcherRun.summary.avgLatencyMs,
    rows,
  };
}

export function formatSignedDelta(value: number, unit: string): string {
  if (value === 0) {
    return `0 ${unit}`;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} ${unit}`;
}

export function scaleProfileLabel(profile: ScaleProfile): string {
  switch (profile) {
    case "medium":
      return "中规模 (400 文件 / 100+ 目录)";
    case "large":
      return "大规模 (1500 文件 / 300+ 目录)";
    case "xlarge":
      return "超大规模 (4800 文件 / 800+ 目录)";
    default:
      return "小规模 (60 文件 / 30+ 目录)";
  }
}

export function engineLabel(engine?: AuditEngine): string {
  return engine === "platform" ? "真实 Platform" : "内置引擎";
}

export function refKindBadge(kind: GitRefOption["kind"]): string {
  switch (kind) {
    case "branch":
      return "本地分支";
    case "remote":
      return "远端分支";
    case "tag":
      return "Tag";
  }
}

export function formatRefPreview(refs: GitRefOption[], value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "请输入或选择 Git 分支、Tag 或 Commit Hash";
  }
  const matched = refs.find((r) => r.name === trimmed || r.commit === trimmed);
  if (matched) {
    const subj = matched.subject ? ` · ${matched.subject}` : "";
    return `[${refKindBadge(matched.kind)}] ${matched.commit}${subj}`;
  }
  return "自定义 Git 引用（支持本地/远端分支、Tag、~1 或 Commit Hash）";
}

export interface RefBuildState {
  state: "ready" | "cached" | "needs-build";
  label: string;
}

export function resolveRefBuildState(
  refs: GitRefOption[],
  status: TargetStatus | null,
  role: MonitorMode,
  inputValue: string,
): RefBuildState {
  const trimmed = inputValue.trim();
  const matched = refs.find((r) => r.name === trimmed || r.commit === trimmed);
  const currentInfo = role === "watcher" ? status?.manifest?.watcher : status?.manifest?.polling;

  if (currentInfo?.exists) {
    const sameRef = currentInfo.ref === trimmed;
    const sameCommit = matched ? currentInfo.commit.startsWith(matched.commit) : currentInfo.commit.startsWith(trimmed);
    if (sameRef || (trimmed !== "" && sameCommit)) {
      return { state: "ready", label: "当前已就绪" };
    }
  }

  const cached = status?.cachedCommits ?? [];
  if (matched && cached.some((c) => c.startsWith(matched.commit))) {
    return { state: "cached", label: "命中缓存 · 秒级复用" };
  }
  if (trimmed.length >= 7 && cached.some((c) => c.startsWith(trimmed))) {
    return { state: "cached", label: "命中缓存 · 秒级复用" };
  }

  return { state: "needs-build", label: "新版本 · 运行时自动构建" };
}

export function buildExportFilename(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `catalog-lock-audit-${safe}.json`;
}
