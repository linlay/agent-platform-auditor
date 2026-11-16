import { CompactSelect } from "./CompactSelect";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Case,
  Result,
  Run,
  Testset,
  Comparison,
  Health,
  ReviewOptions,
  describeCheck,
} from "./domain";
import "./style.css";
import { api, download, downloadFile } from "./api";
import { ExportMenu } from "./ExportMenu";
import { BatchVersion } from "./BatchVersion";
import { collectReportData, ExportKind, loadReportEvidence, rawReport } from "./report-data";
import { feedbackEvidenceKeys, feedbackZip } from "./report-feedback";
import { humanReport } from "./report-html";
import { ReviewControls } from "./ReviewControls";
import { label } from "./ui-labels";
import { judgments } from "./judgments";
import { JudgmentBadge } from "./JudgmentBadge";
import {
  Workspaces,
  workspaceKey,
  decodeWorkspaces,
  encodeWorkspaces,
  mergeWorkspace,
  restoreWorkspace,
  taggedResults,
} from "./workspace";
import { Inspector } from "./Inspector";
import { ComparisonPanel } from "./ComparisonPanel";
function App() {
  const directoryDialog = useRef<HTMLDialogElement>(null);
  const navigation = useRef(0);
  const clearEpoch = useRef(0);
  const cache = useRef<Workspaces | null>(null);
  if (cache.current === null) {
    try {
      cache.current = decodeWorkspaces(localStorage.getItem(workspaceKey));
    } catch {
      cache.current = {};
    }
  }
  const definitions = useRef<Case[]>([]);
  const [workMode, setWorkMode] = useState<"single" | "batch">("single");
  const [manualReview, setManualReview] = useState<ReviewOptions>({
    mode: "classification",
  });
  const [initializing, setInitializing] = useState(true);
  const [loadingSet, setLoadingSet] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState("解析判断");
  const [cases, setCases] = useState<Case[]>([]),
    [active, setActive] = useState(""),
    [results, setResults] = useState<Record<string, Result>>({}),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState<Record<string, string>>({}),
    [fatal, setFatal] = useState(""),
    [custom, setCustom] = useState("node --version"),
    [profile, setProfile] = useState("bash-3.2");
  const [reviewOverride, setReviewOverride] = useState<ReviewOptions>();
  const [customReview, setCustomReview] = useState<ReviewOptions>({
    mode: "classification",
  });
  const [exporting, setExporting] = useState(false);
  const [health, setHealth] = useState<Health>();
  const [projectDir, setProjectDir] = useState<string | undefined>(() => {
    try { return localStorage.getItem("shell-ast-auditor.project-dir.v1") ?? undefined; }
    catch { return undefined; }
  });
  const mappedProjectDir = projectDir ?? health?.projectRoot ?? "";
  const [testsets, setTestsets] = useState<Testset[]>([]),
    [testsetId, setTestsetId] = useState("shell-core"),
    [runs, setRuns] = useState<Run[]>([]),
    [runId, setRunId] = useState(""),
    [currentRun, setCurrentRun] = useState<Run>(),
    [mode, setMode] = useState("测试集"),
    [starting, setStarting] = useState(false),
    [comparisons, setComparisons] = useState<Comparison[]>([]),
    [comparison, setComparison] = useState<Comparison>(),
    [baseId, setBaseId] = useState(""),
    [targetId, setTargetId] = useState(""),
    [customBusy, setCustomBusy] = useState(false);
  const busy =
    loadingSet || starting || currentRun?.state === "running" || customBusy;
  const progress = {
    done: Object.keys(currentRun?.results ?? {}).length,
    total: currentRun?.cases?.length ?? 0,
  };
  function updateProjectDir(value: string) {
    setProjectDir(value);
    try { localStorage.setItem("shell-ast-auditor.project-dir.v1", value); }
    catch { setFatal("目录配置保存失败；当前页面仍可使用。"); }
  }
  function saveCache() {
    try {
      localStorage.setItem(workspaceKey, encodeWorkspaces(cache.current ?? {}));
    } catch {
      setFatal("浏览器保存失败；当前页面仍保留结果，刷新前请先导出。");
    }
  }
  function remember(
    id: string,
    snapshots: Case[],
    updates: Record<string, Result>,
  ) {
    const workspace = mergeWorkspace(
      cache.current?.[id] ?? {},
      snapshots,
      updates,
    );
    cache.current = { ...cache.current, [id]: workspace };
    saveCache();
    return Object.fromEntries(
      Object.entries(workspace).map(([key, value]) => [key, value.result]),
    );
  }
  function clearResults() {
    if (busy) return;
    clearEpoch.current++;
    navigation.current++;
    const next = { ...cache.current };
    delete next[testsetId];
    cache.current = next;
    saveCache();
    setRunId("");
    setCurrentRun(undefined);
    setResults({});
    setCases(definitions.current);
    setActive(
      definitions.current.some((c) => c.id === active)
        ? active
        : (definitions.current[0]?.id ?? ""),
    );
    setFilters({});
    setQuery("");
    setFatal("");
    setDetailTab("解析判断");
    setSelected(new Set());
  }
  async function refresh() {
    const [r, c] = await Promise.all([
      api<Run[]>("/api/runs"),
      api<Comparison[]>("/api/comparisons"),
    ]);
    setRuns(r);
    setComparisons(c);
  }
  async function loadSet(id: string, target: "single" | "batch" = workMode) {
    const ticket = ++navigation.current;
    setWorkMode(target);
    setLoadingSet(true);
    try {
      const set = await api<Testset>("/api/testsets/" + id);
      if (ticket !== navigation.current) return;
      definitions.current = set.cases;
      setTestsetId(id);
      setWorkMode(target);
      const restored =
        target === "single"
          ? restoreWorkspace(set.cases, cache.current?.[id] ?? {})
          : { cases: set.cases, results: {} };
      setCases(restored.cases);
      setActive(
        set.cases.some((c) => c.id === active)
          ? active
          : (set.cases[0]?.id ?? ""),
      );
      setResults(restored.results);
      setRunId(
        target === "single"
          ? (Object.values(restored.results).find(
              (r) => r.state === "running" && r.runId,
            )?.runId ?? "")
          : "",
      );
      setCurrentRun(undefined);

      setMode("测试集");
      setSelected(new Set());
    } catch (e) {
      setFatal(String(e));
    } finally {
      if (ticket === navigation.current) setLoadingSet(false);
    }
  }
  useEffect(() => {
    api<Health>("/api/health")
      .then(setHealth)
      .catch((e) => setFatal(String(e)));
    api<Testset[]>("/api/testsets")
      .then(setTestsets)
      .catch((e) => setFatal(String(e)));
    void loadSet("shell-core", "single").finally(() => setInitializing(false));
    void refresh().catch((e) => setFatal(String(e)));
  }, []);
  useEffect(() => {
    if (!runId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const r = await api<Run>("/api/runs/" + runId);
        if (stopped) return;
        setCurrentRun(r);
        const incoming = taggedResults(r);
        if (workMode === "single" && r.kind === "manual")
          setResults(remember(r.testsetId, r.cases ?? [], incoming));
        else
          setResults((old) =>
            Object.fromEntries(
              Object.entries(incoming).map(([id, value]) => [
                id,
                {
                  ...value,
                  ...(old[id]?.runId === value.runId && old[id]?.report
                    ? { report: old[id].report }
                    : {}),
                },
              ]),
            ),
          );
        if (r.state === "running") timer = setTimeout(poll, 400);
        else void refresh().catch((e) => setFatal(String(e)));
      } catch (e) {
        if (!stopped) setFatal(String(e));
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [runId, workMode]);
  const c = cases.find((x) => x.id === active),
    result = results[active],
    report = result?.report;
  useEffect(() => {
    const source = result?.runId;
    if (!source || result?.state !== "done" || report) return;
    let stopped = false;
    const epoch = clearEpoch.current;
    api<Result>("/api/runs/" + source + "/cases/" + encodeURIComponent(active))
      .then((r) => {
        if (!stopped && epoch === clearEpoch.current) {
          const full = { ...r, runId: source };
          if (workMode === "single" && c)
            remember(testsetId, [c], { [active]: full });
          setResults((s) => ({ ...s, [active]: full }));
        }
      })
      .catch((e) => setFatal(String(e)));
    return () => {
      stopped = true;
    };
  }, [result?.runId, active, result?.state, report, workMode]);
  async function openRun(
    id: string,
    options?: {
      inPlace?: boolean;
      selectedId?: string;
      previousCases?: Case[];
    },
  ) {
    if (!id) return;
    const ticket = ++navigation.current;
    try {
      const r = await api<Run>("/api/runs/" + id);
      if (ticket !== navigation.current) return;
      const snapshots = new Map((r.cases ?? []).map((c) => [c.id, c]));
      setCases(
        options?.inPlace
          ? (options.previousCases ?? r.cases ?? []).map(
              (c) => snapshots.get(c.id) ?? c,
            )
          : (r.cases ?? []),
      );
      setActive(options?.selectedId ?? r.cases?.[0]?.id ?? "");
      const incoming = taggedResults(r);
      if (options?.inPlace)
        setResults(remember(r.testsetId, r.cases ?? [], incoming));
      else setResults(incoming);
      if (!options?.inPlace) setWorkMode("batch");
      setCurrentRun(r);
      setTestsetId(r.testsetId);
      setRunId(id);
      setMode(options?.inPlace ? "测试集" : "运行结果");
    } catch (e) {
      setFatal(String(e));
    }
  }
  const status = (id: string) =>
    results[id]?.status ?? results[id]?.report?.status;
  const shown = cases.filter(
    (x) =>
      [x.id, x.command, ...x.tags]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      Object.entries(filters).every(
        ([k, v]) =>
          !v ||
          (k === "attention"
            ? v === "red"
              ? judgments(x, results[x.id]).hasRed
              : v === "expectation-red"
                ? judgments(x, results[x.id]).parsing.tone === "red"
                : judgments(x, results[x.id]).approval.tone === "red"
            : k === "platform"
              ? x.platforms.includes(v)
              : k === "syntax"
                ? (status(x.id)?.syntax ?? "未运行") === v
                : k === "grade"
                  ? (status(x.id)?.grade ?? "未运行") === v
                  : k === "expected"
                    ? x.expect.syntax === v
                    : k === "difference"
                      ? String(!!x.knownDifference) === v
                      : x.profile === v),
      ),
  );
  async function run(list: Case[]) {
    if (busy || !list.length) return;
    setFatal("");
    setStarting(true);
    const selectedId = list.some((c) => c.id === active) ? active : list[0].id;
    setActive(selectedId);
    setDetailTab("解析判断");
    setMode("测试集");
    setRunId("");
    setCurrentRun(undefined);
    const pending: Record<string, Result> = {};
    for (const c of list) pending[c.id] = { state: "running" };
    setResults((s) => (workMode === "single" ? { ...s, ...pending } : pending));
    try {
      if (list[0].id === "custom") {
        navigation.current++;
        setDetailTab(
          list[0].review?.mode === "syntax-only" ? "执行面" : "审批判断",
        );
        setCustomBusy(true);
        setRunId("");
        setCurrentRun(undefined);
        setResults((s) => ({ ...s, custom: { state: "running" } }));
        const data = await api<Result>("/api/parse", {
          command: list[0].command,
          dialect: list[0].dialect,
          profile: list[0].profile,
          options: {},
          review: list[0].review,
          projectDir: mappedProjectDir,
        });
        setResults((s) => ({ ...s, custom: { ...data, state: "done" } }));
        return;
      }
      const r = await api<Run>("/api/runs", {
        testsetId,
        caseIds: list.map((x) => x.id),
        review: workMode === "single" ? manualReview : reviewOverride,
        kind: workMode === "single" ? "manual" : "batch",
        projectDir: mappedProjectDir,
      });
      await openRun(r.id, {
        inPlace: workMode === "single",
        selectedId,
        previousCases: cases,
      });
    } catch (e) {
      setFatal(String(e));
      const failures: Record<string, Result> = Object.fromEntries(
        list.map((c) => [c.id, { state: "error" as const, error: String(e) }]),
      );
      if (workMode === "single")
        setResults(remember(testsetId, list, failures));
      else setResults((s) => ({ ...s, ...failures }));
    } finally {
      setStarting(false);
      setCustomBusy(false);
    }
  }
  async function makeComparison() {
    try {
      const c = await api<Comparison>("/api/comparisons", {
        baseRunId: baseId,
        targetRunId: targetId,
      });
      setComparison(c);
      await refresh();
    } catch (e) {
      setFatal(String(e));
    }
  }
  async function exportReport(kind: ExportKind) {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await collectReportData({
        scope: mode === "结果对比" ? "comparison" : workMode === "single" ? "accumulated" : "batch",
        testsetId, testsetTitle: testsets.find(s => s.id === testsetId)?.title ?? testsetId,
        cases, results, runId: currentRun?.id, comparison: mode === "结果对比" ? comparison : undefined,
      }, id => api<Run>("/api/runs/" + encodeURIComponent(id)));
      const name = [data.testsetId, data.scope === "batch" ? data.items[0]?.runId : data.scope === "comparison" ? data.comparison?.id : "accumulated", data.generatedAt.replace(/[:.]/g, "-")].join("-");
      if (kind === "human") {
        downloadFile(new Blob([humanReport(data)], { type: "text/html;charset=utf-8" }), name + "-report.html");
      } else {
        const keys = kind === "raw" ? new Set([...data.items, ...data.baseline].map(i => i.key)) : feedbackEvidenceKeys(data);
        await loadReportEvidence(data, keys, (run, id) => api<Result>(`/api/runs/${encodeURIComponent(run)}/cases/${encodeURIComponent(id)}`));
        if (kind === "raw") download(rawReport(data), name + "-full.json");
        else downloadFile(new Blob([new Uint8Array(feedbackZip(data))], { type: "application/zip" }), name + "-feedback.zip");
      }
    } catch (e) {
      setFatal("报告导出失败：" + String(e));
    } finally {
      setExporting(false);
    }
  }
  const exportControl = <ExportMenu onExport={exportReport} busy={exporting} disabled={busy || (mode === "结果对比" ? !comparison : workMode === "single" ? Object.keys(results).length === 0 : !currentRun)} />;
  const choices: Record<string, string[]> = {
    attention: ["red", "expectation-red", "approval-red"],
    platform: ["macos", "windows", "linux"],
    profile: [...new Set(cases.map((x) => x.profile))],
    expected: ["valid", "invalid"],
    syntax: ["未运行", "valid", "invalid"],
    grade: ["未运行", "exact", "partial", "opaque"],
    difference: ["true", "false"],
  };
  function renderFilter(k: string, values: string[]) {
    const name = (
      {
        attention: "筛选",
        platform: "平台",
        profile: "Shell 环境",
        expected: "预期语法",
        syntax: "实际语法",
        grade: "解析程度",
        difference: "已知差异",
      } as Record<string, string>
    )[k];
    return (
      <label key={k} className="filter-field">
        {name}
        <CompactSelect
          aria-label={k}
          title={filters[k] || name}
          value={filters[k] ?? ""}
          onChange={(e) => setFilters((s) => ({ ...s, [k]: e.target.value }))}
        >
          <option value="">全部</option>
          {values.map((v) => (
            <option value={v} key={v}>
              {k === "attention"
                ? (
                    {
                      red: "有红点",
                      "expectation-red": "解析不符预期",
                      "approval-red": "审批不符预期",
                    } as Record<string, string>
                  )[v]
                : k === "difference"
                  ? v === "true"
                    ? "有已知差异"
                    : "无已知差异"
                  : label(v)}
            </option>
          ))}
        </CompactSelect>
      </label>
    );
  }
  return (
    <>
      <header className="app-header">
        <h1>Shell 命令审计</h1>{" "}
        <nav className="sections">
          <button
            disabled={initializing || busy}
            className={workMode === "single" ? "chosen" : ""}
            onClick={() => void loadSet(testsetId, "single")}
          >
            单用例测试
          </button>
          <button
            disabled={initializing || busy}
            className={workMode === "batch" ? "chosen" : ""}
            onClick={() => void loadSet(testsetId, "batch")}
          >
            整集测试
          </button>
        </nav>
        <span className="safety-note">仅分析，不执行命令</span>
        <button
          className={"directory-settings" + (mappedProjectDir ? " primary is-configured" : "")}
          data-configured={Boolean(mappedProjectDir)}
          title={mappedProjectDir ? `已设置：${mappedProjectDir}` : "未设置：保留用例中的 /project 原文"}
          aria-haspopup="dialog"
          disabled={busy || !health}
          onClick={() => directoryDialog.current?.showModal()}
        >设置用例内目录</button>
          <details className="parser-info">
            <summary>版本信息</summary>
            <div>
              <p>测试集：testsets/{testsetId}/</p>
              {health?.parser && (
                <>
                  <p>
                    解析器：
                    {health.parser.sourceCommit?.slice(0, 8) ?? "外部版本"}
                    {health.parser.sourceDirty ? "（含未提交修改）" : ""}
                  </p>
                  <p>二进制摘要：{health.parser.sha256}</p>
                  <p>
                    {health.parser.supportsPolicy
                      ? "支持分类与审批预审"
                      : "仅支持语法解析"}
                  </p>
                </>
              )}
            </div>
          </details>
        <details className="app-help">
          <summary>使用说明</summary>
          <div>
            <p>选择测试集和模式，解析当前命令或批量运行，再查看结果。</p>
            <p>
              只看分类时不设权限，也不产生审批决定；审批预审使用你选择的权限档位。
            </p>
            <p>
              语法解析程度不等于执行许可。此应用不执行命令，不替换生产审查；Windows
              原生验收尚未完成。Bash 的精确结果仅限已验证的语法范围。
            </p>
          </div>
        </details>
      </header>
      <dialog ref={directoryDialog} className="directory-dialog" aria-labelledby="directory-dialog-title">
        <h2 id="directory-dialog-title">设置用例内目录</h2>
        <label>
          用例中的 /project 对应目录
          <input
            aria-label="用例 /project 映射目录"
            value={mappedProjectDir}
            disabled={busy}
            placeholder="留空则保留 /project 原文"
            onChange={(e) => updateProjectDir(e.target.value)}
          />
        </label>
        <p>统一用于后续单条、整集和自定义解析。工作区和工作目录留空时也使用此目录。修改后需重新解析，已有结果保留当时配置。</p>
        <p>只替换完整的 /project 路径及其子路径，保留测试集原文，不执行命令。目录须真实存在，暂不支持空白及 Shell 特殊字符；留空可关闭替换。</p>
        <form method="dialog">
          <button
            type="button"
            className="directory-clear"
            disabled={busy || !mappedProjectDir}
            onClick={() => {
              updateProjectDir("");
              directoryDialog.current?.querySelector("input")?.focus();
            }}
          >清空</button>
          <button className="primary">完成</button>
        </form>
      </dialog>
      <main>
        {" "}
        {fatal && <p role="alert">{fatal}</p>}
        {cases.some(c => !c.expect.policyByLevel && definitions.current.some(d => d.id === c.id && d.expect.policyByLevel)) && (
          <p className="active-filter-note">当前结果保留的是旧版用例预期。三档预期已补齐，请重新运行以使用新版预期；历史记录不会被改写。</p>
        )}
        <section className="dataset">
          <label>
            测试集{" "}
            <CompactSelect
              aria-label="测试集"
              title={
                testsets.find((s) => s.id === testsetId)?.title ?? testsetId
              }
              disabled={busy}
              value={testsetId}
              onChange={(e) => void loadSet(e.target.value)}
            >
              {testsets.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.title} ({s.cases.length})
                </option>
              ))}
            </CompactSelect>
          </label>
          {mode !== "结果对比" &&
            (workMode === "single" ? (
              <ReviewControls
                scope="manual"
                projectDir={mappedProjectDir}
                value={manualReview}
                onChange={(v) =>
                  setManualReview(v ?? { mode: "classification" })
                }
                disabled={busy}
              />
            ) : (
              <ReviewControls
                value={reviewOverride}
                projectDir={mappedProjectDir}
                onChange={setReviewOverride}
                inherit
                disabled={busy}
              />
            ))}
          {mode !== "结果对比" && (
            <>
              {" "}
              <section className="actions">
                {workMode === "single" ? (
                  <>
                    <button
                      className="primary"
                      disabled={busy}
                      aria-busy={busy}
                      onClick={() => run(c ? [c] : [])}
                    >
                      解析当前
                    </button>
                    <button
                      disabled={busy || selected.size === 0}
                      onClick={() =>
                        run(
                          cases.filter(
                            (c) => selected.has(c.id) && c.id !== "custom",
                          ),
                        )
                      }
                    >
                      解析选中 ({selected.size})
                    </button>
                  </>
                ) : mode === "测试集" ? (
                  <button
                    className="primary"
                    disabled={busy}
                    aria-busy={busy}
                    onClick={() => run(definitions.current)}
                  >
                    运行整个测试集
                  </button>
                ) : null}
                <button
                  disabled={!busy}
                  onClick={() => {
                    if (runId)
                      void api("/api/runs/" + runId + "/cancel", {}).catch(
                        (e) => setFatal(String(e)),
                      );
                  }}
                >
                  取消
                </button>
                {exportControl}
                {workMode === "single" && (
                  <button
                    className="clear-results"
                    disabled={busy || Object.keys(results).length === 0}
                    title="清空当前测试集的累计结果，不删除已保存批次文件"
                    onClick={clearResults}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                    </svg>
                    清空结果
                  </button>
                )}
                <span>
                  {workMode === "single"
                    ? `已保留 ${Object.values(results).filter((r) => r.state !== "running").length} 条${busy ? ` · 解析中 ${progress.done}/${progress.total}` : ""}`
                    : busy
                      ? "解析中"
                      : ""}
                </span>
              </section>
            </>
          )}

        </section>
        {workMode === "batch" && (
          <section className="history batch-line">
            <h2 title={currentRun?.id}>
              {currentRun ? "批次号：" + currentRun.id : "整集测试"}
            </h2>
            <CompactSelect
              aria-label="已保存批次"
              title={runId || "选择已保存批次"}
              value={runId}
              onChange={(e) => void openRun(e.target.value)}
            >
              <option value="">已保存批次</option>
              {[
                ...(currentRun && !runs.some((r) => r.id === currentRun.id)
                  ? [currentRun]
                  : []),
                ...runs.filter((r) => r.kind !== "manual"),
              ].map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.testsetId} · {label(r.state)}
                </option>
              ))}
            </CompactSelect>
            {currentRun && (
              <>
                <span className="batch-summary">
                  {label(currentRun.state)}{" "}
                  {Object.keys(currentRun.results ?? {}).length}/
                  {currentRun.cases?.length ?? 0}
                </span>
                <button
                  disabled={currentRun.state === "running"}
                  onClick={() =>
                    api<Comparison>(
                      "/api/comparisons/expectations-" + currentRun.id,
                    )
                      .then((c) => {
                        setComparison(c);
                        setMode("结果对比");
                      })
                      .catch((e) => setFatal(String(e)))
                  }
                >
                  查看本批次报告
                </button>
                <BatchVersion run={currentRun} />
              </>
            )}
            {mode !== "测试集" && (
              <button
                disabled={busy}
                onClick={() => void loadSet(testsetId, "batch")}
              >
                新建批次
              </button>
            )}
            <button
              className={mode === "结果对比" ? "chosen" : ""}
              onClick={() =>
                setMode(mode === "结果对比" ? "运行结果" : "结果对比")
              }
            >
              {mode === "结果对比" ? "返回明细" : "比较批次"}
            </button>
          </section>
        )}
        {mode === "结果对比" ? (
          <ComparisonPanel
            runs={runs}
            baseId={baseId}
            setBaseId={setBaseId}
            targetId={targetId}
            setTargetId={setTargetId}
            comparisons={comparisons}
            comparison={comparison}
            setComparison={setComparison}
            makeComparison={makeComparison}
            exportControl={exportControl}
            setFatal={setFatal}
            onCase={(runId, caseId) => {
              setQuery("");
              setFilters({});
              setDetailTab("解析判断");
              void openRun(runId, { selectedId: caseId });
            }}
          />
        ) : (
          <>
            <progress max={progress.total || 1} value={progress.done} />
            {fatal && <p role="alert">{fatal}</p>}
            {c && !shown.some((x) => x.id === active) && (
              <p className="active-filter-note">
                当前命令不在筛选结果中，右侧仍显示它的详情。
                <button
                  onClick={() => {
                    setFilters({});
                    setQuery("");
                  }}
                >
                  清空筛选
                </button>
              </p>
            )}
            <div className="workspace">
              <aside>
                <div className="aside-header">
                  {" "}
                  <section className="toolbar">
                    <label className="search-field">
                      <span className="sr-only">搜索用例</span>
                      <input
                        aria-label="搜索用例"
                        placeholder="搜索命令、用例或标签"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    {["attention"].map((k) => renderFilter(k, choices[k]))}
                    <details className="more-filters">
                      <summary aria-label="更多筛选条件" title="更多筛选条件">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          aria-hidden="true"
                        >
                          <path d="M4 6h16M4 12h16M4 18h16" />
                          <circle cx="9" cy="6" r="2" />
                          <circle cx="15" cy="12" r="2" />
                          <circle cx="9" cy="18" r="2" />
                        </svg>
                      </summary>
                      <div>
                        {[
                          "attention",
                          "platform",
                          "profile",
                          "expected",
                          "syntax",
                          "grade",
                          "difference",
                        ].map((k) => renderFilter(k, choices[k]))}
                      </div>
                    </details>
                    {Object.values(filters).some(Boolean) && (
                      <button onClick={() => setFilters({})}>清空条件</button>
                    )}
                  </section>
                  {workMode === "batch" && (
                    <div className="list-count">
                      <span>用例</span>
                      <span className="list-total">
                        {shown.filter((x) => x.id !== "custom").length} /{" "}
                        {cases.filter((x) => x.id !== "custom").length}
                      </span>
                    </div>
                  )}
                  {workMode === "single" && (
                    <label className="selectall">
                      <input
                        aria-label="全选当前列表"
                        type="checkbox"
                        checked={
                          shown.filter((c) => c.id !== "custom").length > 0 &&
                          shown
                            .filter((c) => c.id !== "custom")
                            .every((c) => selected.has(c.id))
                        }
                        onChange={(e) =>
                          setSelected((old) => {
                            const next = new Set(old);
                            for (const c of shown)
                              if (c.id !== "custom") {
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                              }
                            return next;
                          })
                        }
                      />
                      <span className="selection-label">
                        全选当前列表 · 已选 {selected.size} 条
                      </span>
                      <span className="list-total" title="当前显示 / 全部用例">
                        {shown.filter((x) => x.id !== "custom").length} /{" "}
                        {cases.filter((x) => x.id !== "custom").length}
                      </span>
                    </label>
                  )}
                </div>
                {shown.map((x) => (
                  <article
                    key={x.id}
                    className={active === x.id ? "active" : ""}
                  >
                    {workMode === "single" && (
                      <label className="case-check">
                        <input
                          aria-label={"选择 " + x.id}
                          disabled={x.id === "custom"}
                          type="checkbox"
                          checked={selected.has(x.id)}
                          onChange={(e) =>
                            setSelected((old) => {
                              const next = new Set(old);
                              if (e.target.checked) next.add(x.id);
                              else next.delete(x.id);
                              return next;
                            })
                          }
                        />
                        <span className="sr-only">选择用例</span>
                      </label>
                    )}
                    <button
                      className="case"
                      data-case-id={x.id}
                      aria-current={active === x.id ? "true" : undefined}
                      onClick={() => {
                        setActive(x.id);
                      }}
                    >
                      <span className="case-heading">
                        <b title={x.id}>{x.id}</b>
                        <small
                          className="case-environment"
                          title={`${x.platforms.map(label).join(" / ")} · ${x.dialect} · ${label(x.profile)}`}
                        >
                          {label(x.profile)}
                        </small>
                      </span>
                      <code title={x.command}>{x.command}</code>
                      <div className="item-judgments">
                        <JudgmentBadge
                          kind="解析"
                          value={judgments(x, results[x.id]).parsing}
                        />
                        <JudgmentBadge
                          kind="审批"
                          value={judgments(x, results[x.id]).approval}
                        />
                      </div>
                    </button>
                  </article>
                ))}
              </aside>
              <Inspector
                key={active + runId}
                c={c}
                result={result}
                defaultTab={detailTab}
              />
            </div>
            {workMode === "single" && (
              <section className="custom">
                <h2>自定义命令</h2>
                <ReviewControls
                  value={customReview}
                  projectDir={mappedProjectDir}
                  onChange={(v) =>
                    setCustomReview(v ?? { mode: "classification" })
                  }
                  disabled={busy}
                />
                <CompactSelect
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                >
                  {choices.profile.map((p) => (
                    <option key={p} value={p}>
                      {label(p)}
                    </option>
                  ))}
                </CompactSelect>
                <textarea
                  aria-label="自定义命令"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
                <button
                  disabled={busy}
                  onClick={() => {
                    const dialect = profile.startsWith("bash")
                      ? "bash"
                      : profile.startsWith("sh-")
                        ? "sh"
                        : profile.startsWith("zsh")
                          ? "zsh"
                          : profile.startsWith("cmd")
                            ? "cmd"
                            : "powershell";
                    const x: Case = {
                      review: customReview,
                      id: "custom",
                      command: custom,
                      dialect,
                      profile,
                      platforms: [],
                      tags: ["custom"],
                      expect: { syntax: "valid", gradeCeiling: "opaque" },
                      source:
                        "user input; expectation is editable only via fixed corpus",
                    };
                    setCases((s) => [...s.filter((c) => c.id !== "custom"), x]);
                    setActive(x.id);
                    setMode("测试集");
                    void run([x]);
                  }}
                >
                  解析自定义
                </button>
                <small>
                  临时输入不保存到测试集。预审结果与权限档位及运行环境有关。
                </small>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
