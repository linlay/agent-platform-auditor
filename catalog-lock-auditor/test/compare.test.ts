import { describe, expect, it } from "vitest";
import {
  buildExportFilename,
  buildPairedComparison,
  engineLabel,
  formatRefPreview,
  formatSignedDelta,
  refKindBadge,
  resolveRefBuildState,
  scaleProfileLabel,
} from "../src/domain/compare.js";
import type { ComparisonRecord, RunRecord, ScenarioResult } from "../src/domain/types.js";

function makeScenario(overrides: Partial<ScenarioResult>): ScenarioResult {
  return {
    id: "skill-dir-rename-delete",
    name: "技能目录外部重命名与删除",
    category: "skills",
    mode: "watcher",
    status: "passed",
    lockErrors: 0,
    operations: 3,
    reloadDetected: true,
    reloadLatencyMs: 180,
    durationMs: 420,
    handleDelta: 0,
    handleSupported: true,
    watchedDirs: 0,
    scanCount: 0,
    lastScanMs: 0,
    steps: [],
    ...overrides,
  };
}

function makeRun(mode: "watcher" | "polling", results: ScenarioResult[]): RunRecord {
  const totalLockErrors = results.reduce((acc, item) => acc + item.lockErrors, 0);
  const maxHandleDelta = Math.max(0, ...results.map((item) => item.handleDelta));
  const maxWatchedDirs = Math.max(0, ...results.map((item) => item.watchedDirs));
  const passed = results.filter((item) => item.status === "passed").length;
  return {
    id: `${mode}-1`,
    mode,
    startedAt: "2026-11-28T15:00:00Z",
    finishedAt: "2026-11-28T15:00:05Z",
    config: {
      mode,
      stressRounds: 20,
      scaleProfile: "small",
      pollIntervalMs: 250,
      reloadDebounceMs: 150,
    },
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      totalLockErrors,
      maxHandleDelta,
      maxWatchedDirs,
      avgLatencyMs: mode === "watcher" ? 180 : 620,
      totalDurationMs: 2000,
    },
    results,
  };
}

describe("catalog comparison domain logic", () => {
  it("computes lock reduction, handle reduction, and per-scenario rows", () => {
    const cmp: ComparisonRecord = {
      id: "cmp-20261128",
      createdAt: "2026-11-28T15:00:10Z",
      config: {
        stressRounds: 20,
        scaleProfile: "small",
        pollIntervalMs: 250,
        reloadDebounceMs: 150,
      },
      watcherRun: makeRun("watcher", [
        makeScenario({
          mode: "watcher",
          status: "failed",
          lockErrors: 4,
          handleDelta: 12,
          watchedDirs: 10,
        }),
      ]),
      pollingRun: makeRun("polling", [
        makeScenario({
          mode: "polling",
          status: "passed",
          lockErrors: 0,
          handleDelta: 0,
          watchedDirs: 0,
          reloadLatencyMs: 620,
        }),
      ]),
      summary: {
        watcherLockErrors: 4,
        pollingLockErrors: 0,
        watcherPassed: 0,
        pollingPassed: 1,
        totalScenarios: 1,
        watcherMaxHandles: 12,
        pollingMaxHandles: 0,
        verdict: "Polling 彻底消除了文件锁冲突且全场景通过",
      },
    };

    const view = buildPairedComparison(cmp);
    expect(view.lockReductionPct).toBe(100);
    expect(view.handleReduction).toBe(12);
    expect(view.watchedDirReduction).toBe(10);
    expect(view.latencyDeltaMs).toBe(440);
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0]?.lockDiff).toBe(-4);
    expect(view.rows[0]?.handleDiff).toBe(-12);
  });

  it("formats signed deltas, scale labels, and export filenames cleanly", () => {
    expect(formatSignedDelta(-3, "次")).toBe("-3 次");
    expect(formatSignedDelta(120, "ms")).toBe("+120 ms");
    expect(formatSignedDelta(0, "个")).toBe("0 个");
    expect(scaleProfileLabel("large")).toContain("1500");
    expect(scaleProfileLabel("xlarge")).toContain("4800");
    expect(engineLabel("platform")).toBe("真实 Platform");
    expect(engineLabel("builtin")).toBe("内置引擎");
    expect(refKindBadge("remote")).toBe("远端分支");
    expect(
      formatRefPreview(
        [{ name: "origin/codex/windows-catalog-polling", kind: "remote", commit: "f83e7d60", subject: "feat(reload)" }],
        "origin/codex/windows-catalog-polling",
      ),
    ).toBe("[远端分支] f83e7d60 · feat(reload)");
    expect(formatRefPreview([], "main~1")).toContain("自定义 Git 引用");
    expect(
      resolveRefBuildState(
        [{ name: "main", kind: "branch", commit: "5f2b4ec2", subject: "" }],
        {
          ready: true,
          building: false,
          defaultSourceDir: "",
          defaultWatcherRef: "main",
          defaultPollingRef: "origin/codex/windows-catalog-polling",
          cachedCommits: ["f83e7d601234"],
          manifest: {
            sourceDir: "",
            goVersion: "go1.26",
            builtAt: "",
            watcher: {
              role: "watcher",
              ref: "main",
              commit: "5f2b4ec2abcdef",
              binaryPath: "w.exe",
              sha256: "abc",
              builtAt: "",
              exists: true,
            },
            polling: {
              role: "polling",
              ref: "origin/codex/windows-catalog-polling",
              commit: "f83e7d601234",
              binaryPath: "p.exe",
              sha256: "def",
              builtAt: "",
              exists: true,
            },
          },
        },
        "watcher",
        "main",
      ).state,
    ).toBe("ready");
    expect(
      resolveRefBuildState(
        [{ name: "codex/windows-catalog-polling", kind: "branch", commit: "f83e7d60", subject: "" }],
        {
          ready: true,
          building: false,
          defaultSourceDir: "",
          defaultWatcherRef: "main",
          defaultPollingRef: "origin/codex/windows-catalog-polling",
          cachedCommits: ["f83e7d601234"],
        },
        "polling",
        "codex/windows-catalog-polling",
      ).state,
    ).toBe("cached");
    expect(buildExportFilename("cmp/bad:id")).toBe("catalog-lock-audit-cmp_bad_id.json");
  });
});
