import {
  buildExportFilename,
  buildPairedComparison,
  engineLabel,
  formatRefPreview,
  formatSignedDelta,
  refKindBadge,
  resolveRefBuildState,
  scaleProfileLabel,
} from "../domain/compare.js";
import type {
  AuditEngine,
  ComparisonRecord,
  GitRefOption,
  GitRefsResponse,
  LogEntry,
  MonitorMode,
  RunConfig,
  RunRecord,
  SandboxState,
  ScaleProfile,
  ScenarioInfo,
  ScenarioResult,
  TargetStatus,
} from "../domain/types.js";

type ActiveTab = "compare" | "sandbox";
type InspectorTab = "steps" | "logs";
type LogFilter = "all" | "error" | "reload" | "build";
type NoticeKind = "idle" | "ok" | "error" | "warn" | "running";

interface TransientNotice {
  kind: Exclude<NoticeKind, "idle">;
  message: string;
}

interface AppState {
  activeTab: ActiveTab;
  inspectorTab: InspectorTab;
  engine: AuditEngine;
  scenarios: ScenarioInfo[];
  comparisons: ComparisonRecord[];
  activeComparison: ComparisonRecord | null;
  selectedScenarioId: string | null;
  busy: boolean;
  buildingTargets: boolean;
  targetStatus: TargetStatus | null;
  gitRefs: GitRefOption[];
  gitRefsWarning: string;
  transientNotice: TransientNotice | null;
  logs: LogEntry[];
  logFilter: LogFilter;
  autoScrollLogs: boolean;
  drawerOpen: boolean;
  sandbox: SandboxState | null;
}

const state: AppState = {
  activeTab: "compare",
  inspectorTab: "steps",
  engine: "platform",
  scenarios: [],
  comparisons: [],
  activeComparison: null,
  selectedScenarioId: null,
  busy: false,
  buildingTargets: false,
  targetStatus: null,
  gitRefs: [],
  gitRefsWarning: "",
  transientNotice: null,
  logs: [],
  logFilter: "all",
  autoScrollLogs: true,
  drawerOpen: false,
  sandbox: null,
};

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element #${id}`);
  }
  return node as T;
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatClock(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function apiGet<T>(url: string): Promise<T> {
  const resp = await fetch(url, { cache: "no-store" });
  const text = await resp.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!resp.ok) {
    throw new Error(data.error ?? `HTTP ${resp.status}`);
  }
  return data;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!resp.ok) {
    throw new Error(data.error ?? `HTTP ${resp.status}`);
  }
  return data;
}

function renderNoticeBar(kind: NoticeKind | "hidden", message: string): void {
  const banner = el<HTMLDivElement>("status-banner");
  if (kind === "hidden") {
    banner.className = "notice-bar is-hidden";
    banner.textContent = "";
    return;
  }
  banner.className = "notice-bar";
  if (kind === "ok") {
    banner.classList.add("is-ok");
  } else if (kind === "error") {
    banner.classList.add("is-error");
  } else if (kind === "warn") {
    banner.classList.add("is-warn");
  } else if (kind === "running") {
    banner.classList.add("is-running");
  }
  banner.textContent = message;
}

function setBanner(kind: NoticeKind, message: string): void {
  state.transientNotice = kind === "idle" || !message ? null : { kind, message };
  syncStatusBanner();
}

function syncStatusBanner(): void {
  const selectedCount = readSelectedScenarioIds().length;
  const scenariosRendered = document.querySelectorAll("#scenario-checks input[type=checkbox]").length > 0;
  const watcherVal = el<HTMLInputElement>("cfg-watcher-ref").value.trim();
  const pollingVal = el<HTMLInputElement>("cfg-polling-ref").value.trim();
  const roundsRaw = Number(el<HTMLInputElement>("cfg-rounds").value);
  const pollRaw = Number(el<HTMLInputElement>("cfg-poll").value);

  const noScenarios = scenariosRendered && selectedCount === 0;
  const missingWatcher = state.engine === "platform" && !watcherVal;
  const missingPolling = state.engine === "platform" && !pollingVal;
  const invalidRounds = Number.isNaN(roundsRaw) || roundsRaw < 10 || roundsRaw > 500;
  const invalidPoll = state.engine === "builtin" && (Number.isNaN(pollRaw) || pollRaw < 100 || pollRaw > 10000);

  const compareDisabled =
    state.busy || noScenarios || missingWatcher || missingPolling || invalidRounds || invalidPoll;
  el<HTMLButtonElement>("btn-compare").disabled = compareDisabled;
  el<HTMLButtonElement>("btn-empty-compare").disabled = compareDisabled;
  el<HTMLButtonElement>("btn-run-watcher").disabled =
    state.busy || noScenarios || missingWatcher || invalidRounds || invalidPoll;
  el<HTMLButtonElement>("btn-run-polling").disabled =
    state.busy || noScenarios || missingPolling || invalidRounds || invalidPoll;

  if (state.transientNotice) {
    renderNoticeBar(state.transientNotice.kind, state.transientNotice.message);
    return;
  }

  if (noScenarios) {
    renderNoticeBar("warn", "未勾选任何测试场景：请展开「测试参数」至少选择 1 项场景。");
    return;
  }
  if (missingWatcher || missingPolling) {
    renderNoticeBar("warn", "真实 Platform 模式需指定 Watcher 与 Polling 分支（支持分支名、Tag 或 Commit Hash）。");
    return;
  }
  if (invalidRounds) {
    renderNoticeBar("warn", "压测轮数需设置在 10 到 500 之间。");
    return;
  }
  if (invalidPoll) {
    renderNoticeBar("warn", "内置引擎轮询间隔需设置在 100ms 到 10000ms 之间。");
    return;
  }
  if (state.engine === "platform" && watcherVal === pollingVal) {
    renderNoticeBar("warn", `Watcher 与 Polling 均指向同一分支「${watcherVal}」，建议选择两个不同分支进行 A/B 对照。`);
    return;
  }
  if (state.engine === "platform" && state.targetStatus?.lastError) {
    renderNoticeBar("error", `目标构建异常：${state.targetStatus.lastError}`);
    return;
  }
  if (state.engine === "platform") {
    const wState = resolveRefBuildState(state.gitRefs, state.targetStatus, "watcher", watcherVal);
    const pState = resolveRefBuildState(state.gitRefs, state.targetStatus, "polling", pollingVal);
    if (wState.state === "needs-build" || pState.state === "needs-build") {
      renderNoticeBar("warn", "当前所选分支尚未命中本地缓存，点击「运行 A/B 对照」时将自动触发只读构建。");
      return;
    }
  }
  if (!state.activeComparison) {
    renderNoticeBar("idle", "参数已就绪，点击右上角「运行 A/B 对照」开始测试。");
    return;
  }
  renderNoticeBar("hidden", "");
}

function setBusy(busy: boolean): void {
  state.busy = busy;
  el<HTMLDivElement>("run-spinner").classList.toggle("is-hidden", !busy);
  syncStatusBanner();
}

function syncEngineUI(): void {
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="audit-engine"]');
  for (const radio of radios) {
    radio.checked = radio.value === state.engine;
  }
  const isPlatform = state.engine === "platform";
  el<HTMLElement>("target-build-panel").classList.toggle("is-hidden", !isPlatform);

  const pollInput = el<HTMLInputElement>("cfg-poll");
  const pollHint = el<HTMLSpanElement>("poll-hint");
  pollInput.disabled = isPlatform;
  pollHint.textContent = isPlatform
    ? "真实 Platform 模式下由目标进程内置参数控制"
    : "内置引擎下可自由调整轮询周期";

  updateAdvancedSummary();
  updateEmptyLaunchMeta();
  syncStatusBanner();
}

function updateEmptyLaunchMeta(): void {
  const node = document.getElementById("empty-launch-meta");
  if (!node) {
    return;
  }
  const total = state.scenarios.length;
  const hasBoxes = document.querySelectorAll("#scenario-checks input[type=checkbox]").length > 0;
  const checked = hasBoxes ? readSelectedScenarioIds().length : total;
  const rounds = el<HTMLInputElement>("cfg-rounds").value || "50";
  const scale = el<HTMLSelectElement>("cfg-scale").value as ScaleProfile;
  if (state.engine === "platform") {
    const wRef = el<HTMLInputElement>("cfg-watcher-ref").value.trim() || "未指定";
    const pRef = el<HTMLInputElement>("cfg-polling-ref").value.trim() || "未指定";
    node.textContent = `真实 Platform · Watcher (${wRef}) vs Polling (${pRef}) · 已选 ${checked}/${total || 9} 场景 · 压测 ${rounds} 轮 · ${scale}`;
  } else {
    const poll = el<HTMLInputElement>("cfg-poll").value || "500";
    node.textContent = `内置 Go 引擎 · 轮询 ${poll}ms · 已选 ${checked}/${total || 9} 场景 · 压测 ${rounds} 轮 · ${scale}`;
  }
}

function enterNewCompareMode(): void {
  if (state.activeTab !== "compare") {
    switchTab("compare");
  }
  state.activeComparison = null;
  state.selectedScenarioId = null;
  state.transientNotice = null;
  renderHistory();
  renderComparison(null);
  syncStatusBanner();
}

function readSelectedScenarioIds(): string[] {
  const checks = document.querySelectorAll<HTMLInputElement>("#scenario-checks input[type=checkbox]");
  const selected: string[] = [];
  for (const box of checks) {
    if (box.checked) {
      selected.push(box.value);
    }
  }
  return selected;
}

function updateAdvancedSummary(): void {
  const total = state.scenarios.length;
  const hasBoxes = document.querySelectorAll("#scenario-checks input[type=checkbox]").length > 0;
  const checked = hasBoxes ? readSelectedScenarioIds().length : total;
  const rounds = el<HTMLInputElement>("cfg-rounds").value || "50";
  const scale = el<HTMLSelectElement>("cfg-scale").value as ScaleProfile;
  const poll = el<HTMLInputElement>("cfg-poll").value || "500";
  const pollPart = state.engine === "platform" ? "内置轮询" : `轮询 ${poll}ms`;
  el<HTMLSpanElement>("advanced-summary-text").textContent =
    `${checked}/${total || 8} 场景 · 压测 ${rounds} 轮 · ${scale} 规模 · ${pollPart}`;
}

function readConfig(mode?: MonitorMode): RunConfig {
  const rounds = Math.max(10, Math.min(500, Number(el<HTMLInputElement>("cfg-rounds").value) || 50));
  const pollIntervalMs = Math.max(100, Math.min(10000, Number(el<HTMLInputElement>("cfg-poll").value) || 500));
  const scaleProfile = el<HTMLSelectElement>("cfg-scale").value as ScaleProfile;
  const selectedIds = readSelectedScenarioIds();
  const watcherRef = el<HTMLInputElement>("cfg-watcher-ref").value.trim();
  const pollingRef = el<HTMLInputElement>("cfg-polling-ref").value.trim();

  const cfg: RunConfig = {
    engine: state.engine,
    scenarioIds: selectedIds.length > 0 ? selectedIds : state.scenarios.map((s) => s.id),
    stressRounds: rounds,
    scaleProfile,
    pollIntervalMs,
    reloadDebounceMs: 250,
  };
  if (mode) {
    cfg.mode = mode;
  }
  if (watcherRef) {
    cfg.watcherRef = watcherRef;
  }
  if (pollingRef) {
    cfg.pollingRef = pollingRef;
  }
  return cfg;
}

function renderScenarios(scenarios: ScenarioInfo[]): void {
  const host = el<HTMLDivElement>("scenario-checks");
  host.innerHTML = "";
  for (const s of scenarios) {
    const label = document.createElement("label");
    label.className = "scenario-check";
    label.title = `${s.description}\n焦点：${s.focus}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = s.id;
    checkbox.checked = s.defaultSelected;
    checkbox.addEventListener("change", () => {
      state.transientNotice = null;
      updateAdvancedSummary();
      syncStatusBanner();
    });

    const text = document.createElement("span");
    text.textContent = s.name;
    label.append(checkbox, text);
    host.append(label);
  }
  updateAdvancedSummary();
}

interface RefComboboxController {
  inputId: string;
  isOpen: () => boolean;
  open: (filterByInput: boolean) => void;
  close: () => void;
  refresh: () => void;
}

const comboboxes: RefComboboxController[] = [];

function filterGitRefs(query: string): GitRefOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return state.gitRefs;
  }
  return state.gitRefs.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.commit.toLowerCase().includes(q) ||
      item.subject.toLowerCase().includes(q)
  );
}

function closeAllRefMenus(exceptId?: string): void {
  for (const box of comboboxes) {
    if (box.inputId !== exceptId) {
      box.close();
    }
  }
}

function bindRefCombobox(inputId: string, onChange?: () => void): RefComboboxController {
  const input = el<HTMLInputElement>(inputId);
  const menu = el<HTMLDivElement>(`${inputId}-menu`);
  const toggleBtn = document.querySelector<HTMLButtonElement>(`[data-ref-toggle="${inputId}"]`);

  let openState = false;
  let filterMode = false;
  let activeIndex = -1;
  let currentList: GitRefOption[] = [];

  const close = (): void => {
    openState = false;
    filterMode = false;
    activeIndex = -1;
    menu.classList.add("is-hidden");
  };

  const renderMenu = (): void => {
    const query = filterMode ? input.value : "";
    currentList = filterGitRefs(query);
    menu.innerHTML = "";

    if (state.gitRefs.length === 0) {
      const hint = state.gitRefsWarning
        ? `分支加载提示: ${state.gitRefsWarning}`
        : "未读取到 Git 分支，可直接输入 Commit Hash";
      menu.innerHTML = `<div class="ref-menu-empty">${escapeHtml(hint)}</div>`;
      return;
    }

    if (currentList.length === 0) {
      menu.innerHTML = '<div class="ref-menu-empty">无匹配分支，可直接按当前输入构建</div>';
      return;
    }

    const currentVal = input.value.trim();
    if (activeIndex < 0) {
      activeIndex = currentList.findIndex((item) => item.name === currentVal);
    }
    if (activeIndex >= currentList.length) {
      activeIndex = currentList.length - 1;
    }

    currentList.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ref-option";
      btn.setAttribute("role", "option");
      const isCurrent = item.name === currentVal;
      if (isCurrent) {
        btn.classList.add("is-selected");
      }
      if (idx === activeIndex) {
        btn.classList.add("is-highlighted");
      }
      btn.setAttribute("aria-selected", String(isCurrent));
      btn.innerHTML = `
        <div class="ref-opt-top">
          <span class="ref-opt-name">${escapeHtml(item.name)}</span>
          <span class="ref-opt-meta">
            <span class="ref-kind-tag">${escapeHtml(refKindBadge(item.kind))}</span>
            <span class="ref-commit">${escapeHtml(item.commit.slice(0, 8))}</span>
          </span>
        </div>
        <div class="ref-opt-sub">${escapeHtml(item.subject || "无提交说明")}</div>
      `;

      const commitSelection = (ev: Event): void => {
        ev.preventDefault();
        ev.stopPropagation();
        input.value = item.name;
        close();
        onChange?.();
        input.focus();
      };

      btn.addEventListener("mousedown", commitSelection);
      btn.addEventListener("click", commitSelection);
      menu.append(btn);
    });
  };

  const open = (shouldFilter: boolean): void => {
    if (input.disabled) {
      return;
    }
    closeAllRefMenus(inputId);
    openState = true;
    filterMode = shouldFilter;
    activeIndex = -1;
    renderMenu();
    menu.classList.remove("is-hidden");
  };

  input.addEventListener("focus", () => {
    open(false);
  });

  input.addEventListener("click", () => {
    if (!openState) {
      open(false);
    }
  });

  input.addEventListener("input", () => {
    onChange?.();
    open(true);
  });

  input.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (openState) {
        event.preventDefault();
        close();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!openState) {
        open(false);
        return;
      }
      if (currentList.length > 0) {
        activeIndex = (activeIndex + 1) % currentList.length;
        renderMenu();
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!openState) {
        open(false);
        return;
      }
      if (currentList.length > 0) {
        activeIndex = activeIndex <= 0 ? currentList.length - 1 : activeIndex - 1;
        renderMenu();
      }
      return;
    }
    if (event.key === "Enter" && openState && activeIndex >= 0) {
      const picked = currentList[activeIndex];
      if (picked) {
        event.preventDefault();
        input.value = picked.name;
        close();
        onChange?.();
      }
    }
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
    });
    toggleBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (openState) {
        close();
      } else {
        open(false);
        input.focus();
      }
    });
  }

  const controller: RefComboboxController = {
    inputId,
    isOpen: () => openState,
    open,
    close,
    refresh: () => {
      if (openState) {
        renderMenu();
      }
    },
  };
  comboboxes.push(controller);
  return controller;
}

function renderGitRefs(): void {
  renderBranchPreviews();
  for (const box of comboboxes) {
    box.refresh();
  }
}

function renderRefStateIcon(node: HTMLElement, stateKind: "ready" | "cached" | "needs-build", label: string): void {
  node.title = label;
  node.setAttribute("aria-label", label);
  if (stateKind === "ready") {
    node.className = "ref-state-icon is-ready";
    node.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M5.6 8.2l1.6 1.6 3.3-3.4"/></svg>';
  } else if (stateKind === "cached") {
    node.className = "ref-state-icon is-cached";
    node.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5L8 3l5 2.5L8 8 3 5.5z"/><path d="M3 8.5L8 11l5-2.5"/><path d="M3 11.2L8 13.7l5-2.5"/></svg>';
  } else {
    node.className = "ref-state-icon is-pending";
    node.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.2"/></svg>';
  }
}

function renderBranchPreviews(): void {
  const watcherVal = el<HTMLInputElement>("cfg-watcher-ref").value.trim();
  const pollingVal = el<HTMLInputElement>("cfg-polling-ref").value.trim();

  el<HTMLDivElement>("watcher-ref-preview").textContent = formatRefPreview(state.gitRefs, watcherVal);
  el<HTMLDivElement>("polling-ref-preview").textContent = formatRefPreview(state.gitRefs, pollingVal);

  const wState = resolveRefBuildState(state.gitRefs, state.targetStatus, "watcher", watcherVal);
  const pState = resolveRefBuildState(state.gitRefs, state.targetStatus, "polling", pollingVal);
  renderRefStateIcon(el<HTMLSpanElement>("watcher-build-icon"), wState.state, `Watcher: ${wState.label}`);
  renderRefStateIcon(el<HTMLSpanElement>("polling-build-icon"), pState.state, `Polling: ${pState.label}`);
  updateEmptyLaunchMeta();
  syncStatusBanner();
}

function renderTargetStatus(status: TargetStatus): void {
  state.targetStatus = status;
  const meta = el<HTMLDivElement>("target-meta");
  const buildBtn = el<HTMLButtonElement>("btn-build-targets");

  const isBuilding = state.buildingTargets || status.building;
  buildBtn.disabled = isBuilding;
  buildBtn.textContent = isBuilding ? "构建中..." : "构建";

  const wInput = el<HTMLInputElement>("cfg-watcher-ref");
  const pInput = el<HTMLInputElement>("cfg-polling-ref");
  if (!wInput.value.trim() && status.defaultWatcherRef) {
    wInput.value = status.defaultWatcherRef;
  }
  if (!pInput.value.trim() && status.defaultPollingRef) {
    pInput.value = status.defaultPollingRef;
  }

  if (status.lastError) {
    meta.className = "config-footnote is-error";
    meta.textContent = `最近构建失败：${status.lastError}`;
    buildBtn.title = `最近构建失败：${status.lastError}`;
  } else if (isBuilding) {
    meta.className = "config-footnote";
    meta.textContent = "正在通过只读 git worktree 编译目标程序...";
    buildBtn.title = "正在构建中";
  } else if (status.ready && status.manifest) {
    meta.className = "config-footnote is-hidden";
    meta.textContent = "";
    const wCommit = status.manifest.watcher.commit.slice(0, 8);
    const pCommit = status.manifest.polling.commit.slice(0, 8);
    const cachedCount = status.cachedCommits?.length ?? 0;
    buildBtn.title = `当前激活: Watcher (${wCommit}) vs Polling (${pCommit}) · 已缓存 ${cachedCount} 个 Commit`;
  } else {
    meta.className = "config-footnote is-hidden";
    meta.textContent = "";
    buildBtn.title = `源码仓库: ${status.defaultSourceDir}`;
  }

  renderBranchPreviews();
}

function renderHistory(): void {
  const host = el<HTMLDivElement>("history-list");
  if (state.comparisons.length === 0) {
    host.innerHTML = '<div class="empty-hint">暂无历史对照记录</div>';
    return;
  }
  host.innerHTML = "";
  for (const cmp of state.comparisons) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    if (state.activeComparison?.id === cmp.id) {
      btn.classList.add("is-selected");
    }
    const label = engineLabel(cmp.engine);
    const wLocks = cmp.summary.watcherLockErrors;
    const pLocks = cmp.summary.pollingLockErrors;
    btn.innerHTML = `
      <div class="history-top">
        <span class="history-engine">${escapeHtml(label)}</span>
        <span class="history-locks"><span class="${wLocks > 0 ? "num-fail" : "num-ok"}">W ${wLocks}</span> / <span class="${pLocks > 0 ? "num-fail" : "num-ok"}">P ${pLocks}</span> 锁</span>
      </div>
      <div class="history-meta">通过 ${cmp.summary.pollingPassed}/${cmp.summary.totalScenarios} · ${escapeHtml(cmp.config.scaleProfile)} · ${escapeHtml(formatClock(cmp.createdAt))}</div>
    `;
    btn.addEventListener("click", () => {
      state.activeComparison = cmp;
      state.transientNotice = null;
      const pResults = cmp.pollingRun.results ?? [];
      const wResults = cmp.watcherRun.results ?? [];
      const first = pResults[0] ?? wResults[0];
      state.selectedScenarioId = first ? first.id : null;
      renderHistory();
      renderComparison(cmp);
      syncStatusBanner();
    });
    host.append(btn);
  }
}

function renderComparison(cmp: ComparisonRecord | null): void {
  const summaryBand = el<HTMLElement>("summary-band");
  const resultsSplit = el<HTMLElement>("results-split");
  const emptyLaunch = el<HTMLElement>("compare-empty-state");
  const newBtn = el<HTMLButtonElement>("btn-new-compare");
  const exportBtn = el<HTMLButtonElement>("btn-export");

  if (!cmp) {
    summaryBand.classList.add("is-hidden");
    resultsSplit.classList.add("is-hidden");
    emptyLaunch.classList.remove("is-hidden");
    newBtn.classList.add("is-active");
    exportBtn.disabled = true;
    updateEmptyLaunchMeta();
    return;
  }

  emptyLaunch.classList.add("is-hidden");
  newBtn.classList.remove("is-active");
  summaryBand.classList.remove("is-hidden");
  resultsSplit.classList.remove("is-hidden");
  exportBtn.disabled = false;

  const paired = buildPairedComparison(cmp);
  const s = cmp.summary;

  const verdictBar = el<HTMLDivElement>("verdict-bar");
  const verdictDot = el<HTMLSpanElement>("verdict-dot");
  const verdictTitle = el<HTMLHeadingElement>("verdict-title");
  const verdictMeta = el<HTMLSpanElement>("verdict-meta");
  const verdictImpact = el<HTMLDivElement>("verdict-impact");

  const cleanVerdict = s.verdict.replace(/^\[[^\]]+\]\s*/, "").trim();
  verdictTitle.textContent = cleanVerdict;
  verdictMeta.textContent = `${engineLabel(cmp.engine)} · ${cmp.config.stressRounds} 轮压测 · ${scaleProfileLabel(cmp.config.scaleProfile)} · ${formatClock(cmp.createdAt)}`;

  const lockClear = s.pollingLockErrors === 0 && s.pollingPassed === s.totalScenarios;
  if (lockClear) {
    verdictBar.className = "verdict-bar is-ok";
    verdictDot.className = "status-dot dot-ok";
    verdictImpact.className = "status-pill pill-ok";
  } else if (s.pollingLockErrors > 0) {
    verdictBar.className = "verdict-bar is-fail";
    verdictDot.className = "status-dot dot-fail";
    verdictImpact.className = "status-pill pill-fail";
  } else {
    verdictBar.className = "verdict-bar is-warn";
    verdictDot.className = "status-dot dot-warn";
    verdictImpact.className = "status-pill pill-warn";
  }

  verdictImpact.textContent =
    paired.lockReductionPct !== null
      ? `锁冲突 ${s.watcherLockErrors} -> ${s.pollingLockErrors} (-${paired.lockReductionPct}%)`
      : `锁冲突 ${s.watcherLockErrors} vs ${s.pollingLockErrors}`;

  const summaryHost = el<HTMLDivElement>("compare-summary");
  const lockDeltaClass = s.pollingLockErrors === 0 ? "num-ok" : "num-fail";
  const watcherLockClass = s.watcherLockErrors > 0 ? "num-fail" : "num-ok";
  const passClass = s.pollingPassed === s.totalScenarios ? "num-ok" : "num-warn";

  summaryHost.innerHTML = `
    <div class="metric-cell">
      <div class="metric-label">文件锁冲突次数</div>
      <div class="metric-value">
        <span class="${watcherLockClass}">${s.watcherLockErrors}</span>
        <span class="metric-vs">vs</span>
        <span class="${lockDeltaClass}">${s.pollingLockErrors}</span>
      </div>
      <div class="metric-note">${paired.lockReductionPct !== null ? `Polling 降低 ${paired.lockReductionPct}%` : "本次未记录已确认的锁冲突；其他失败见步骤"}</div>
    </div>

    <div class="metric-cell">
      <div class="metric-label">场景通过率</div>
      <div class="metric-value">
        <span>${s.watcherPassed}/${s.totalScenarios}</span>
        <span class="metric-vs">vs</span>
        <span class="${passClass}">${s.pollingPassed}/${s.totalScenarios}</span>
      </div>
      <div class="metric-note">左侧 Watcher · 右侧 Polling</div>
    </div>

    <div class="metric-cell">
      <div class="metric-label">${cmp.engine === "platform" ? "子进程句柄采样最大值" : "句柄 / 监听增量"}</div>
      <div class="metric-value">
        <span>${s.watcherMaxHandles}</span>
        <span class="metric-vs">vs</span>
        <span class="${s.pollingMaxHandles <= s.watcherMaxHandles ? "num-ok" : "num-warn"}">${s.pollingMaxHandles}</span>
      </div>
      <div class="metric-note">差值 ${escapeHtml(formatSignedDelta(-paired.handleReduction, "句柄"))}</div>
    </div>

    <div class="metric-cell">
      <div class="metric-label">平均重载延迟</div>
      <div class="metric-value">
        <span>${cmp.watcherRun.summary.avgLatencyMs}ms</span>
        <span class="metric-vs">vs</span>
        <span>${cmp.pollingRun.summary.avgLatencyMs}ms</span>
      </div>
      <div class="metric-note">差值 ${escapeHtml(formatSignedDelta(paired.latencyDeltaMs, "ms"))}</div>
    </div>
  `;

  el<HTMLSpanElement>("matrix-meta").textContent = `共 ${paired.rows.length} 项场景`;

  const tbody = el<HTMLTableSectionElement>("matrix-tbody");
  tbody.innerHTML = "";
  for (const row of paired.rows) {
    const tr = document.createElement("tr");
    tr.className = "matrix-row";
    tr.tabIndex = 0;
    if (state.selectedScenarioId === row.id) {
      tr.classList.add("is-selected");
    }

    const wCell = formatOutcomeBadge(row.watcher);
    const pCell = formatOutcomeBadge(row.polling);
    const wDirs = row.watcher ? `${row.watcher.watchedDirs}` : "-";
    const pDirs = row.polling ? `${row.polling.watchedDirs}` : "-";
    const wHandles = row.watcher ? `${row.watcher.handleDelta}` : "-";
    const pHandles = row.polling ? `${row.polling.handleDelta}` : "-";
    const wLatency = row.watcher?.reloadDetected ? `${row.watcher.reloadLatencyMs}ms` : "-";
    const pLatency = row.polling?.reloadDetected ? `${row.polling.reloadLatencyMs}ms` : "-";

    tr.innerHTML = `
      <td>
        <div class="scenario-title">${escapeHtml(row.name)}</div>
        <div class="scenario-id">${escapeHtml(row.id)}</div>
      </td>
      <td>${wCell}</td>
      <td>${pCell}</td>
      <td class="pair-cell">${wDirs}<span class="pair-sep">/</span>${pDirs}</td>
      <td class="pair-cell">${wHandles}<span class="pair-sep">/</span>${pHandles}</td>
      <td class="pair-cell">${wLatency}<span class="pair-sep">/</span>${pLatency}</td>
    `;

    const selectRow = (): void => {
      state.selectedScenarioId = row.id;
      for (const item of tbody.querySelectorAll("tr")) {
        item.classList.remove("is-selected");
      }
      tr.classList.add("is-selected");
      renderScenarioDetail(cmp, row.id);
    };
    tr.addEventListener("click", selectRow);
    tr.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRow();
      }
    });

    tbody.append(tr);
  }

  const targetId = state.selectedScenarioId ?? paired.rows[0]?.id ?? null;
  if (targetId) {
    state.selectedScenarioId = targetId;
    renderScenarioDetail(cmp, targetId);
  }
}

function formatOutcomeBadge(res: ScenarioResult | null): string {
  if (!res) {
    return '<span class="status-pill pill-neutral">未运行</span>';
  }
  if (res.status === "passed") {
    return `<span class="status-pill pill-ok">通过 · ${res.lockErrors} 锁</span>`;
  }
  return `<span class="status-pill pill-fail">失败 · ${res.lockErrors} 锁</span>`;
}

function renderModeStepsPane(title: string, dotClass: string, paneClass: string, res: ScenarioResult | null): string {
  if (!res) {
    return `
      <div class="mode-pane ${paneClass}">
        <div class="mode-pane-head">
          <span class="mode-pane-title"><span class="mode-dot ${dotClass}"></span>${escapeHtml(title)}</span>
          <span class="status-pill pill-neutral">未执行</span>
        </div>
        <div class="mode-pane-body"><div class="empty-hint">本次对比未运行该模式</div></div>
      </div>
    `;
  }

  const badge =
    res.status === "passed"
      ? `<span class="status-pill pill-ok">通过 · ${res.durationMs}ms</span>`
      : `<span class="status-pill pill-fail">失败 · ${res.lockErrors} 锁</span>`;

  const steps = res.steps ?? [];
  const stepsHtml = steps
    .map((step) => {
      const dot = step.ok ? "dot-ok" : "dot-fail";
      const errBlock = step.error ? `<div class="error-box">${escapeHtml(step.error)}</div>` : "";
      return `
        <div class="step-row">
          <div class="step-row-top">
            <span class="step-name"><span class="status-dot ${dot}"></span>${escapeHtml(step.name)}</span>
            <span class="step-time">${step.durationMs}ms</span>
          </div>
          <div class="step-detail">${escapeHtml(step.detail)}</div>
          ${errBlock}
        </div>
      `;
    })
    .join("");

  const sampleErrors = res.lockErrorSamples ?? [];
  const samplesHtml =
    sampleErrors.length > 0
      ? `<div class="error-box">锁错误样本：\n${sampleErrors.map((item) => escapeHtml(item)).join("\n")}</div>`
      : "";

  return `
    <div class="mode-pane ${paneClass}">
      <div class="mode-pane-head">
        <span class="mode-pane-title"><span class="mode-dot ${dotClass}"></span>${escapeHtml(title)}</span>
        ${badge}
      </div>
      <div class="mode-pane-body">
        ${stepsHtml}
        ${samplesHtml}
      </div>
    </div>
  `;
}

function renderModeLogsPane(title: string, dotClass: string, paneClass: string, res: ScenarioResult | null): string {
  const lines = res?.logs ?? [];
  const body =
    lines.length > 0
      ? `<pre class="console-box">${escapeHtml(lines.join("\n"))}</pre>`
      : `<div class="empty-hint">${res ? "该场景无子进程标准输出" : "本次对比未执行该模式"}</div>`;

  return `
    <div class="mode-pane ${paneClass}">
      <div class="mode-pane-head">
        <span class="mode-pane-title"><span class="mode-dot ${dotClass}"></span>${escapeHtml(title)}</span>
        <span class="panel-meta">${lines.length} 行</span>
      </div>
      <div class="mode-pane-body is-logs">${body}</div>
    </div>
  `;
}

function renderScenarioDetail(cmp: ComparisonRecord, scenarioId: string): void {
  const wResults = cmp.watcherRun.results ?? [];
  const pResults = cmp.pollingRun.results ?? [];
  const watcher = wResults.find((r) => r.id === scenarioId) ?? null;
  const polling = pResults.find((r) => r.id === scenarioId) ?? null;
  const primary = polling ?? watcher;
  if (!primary) {
    return;
  }

  el<HTMLHeadingElement>("detail-title").textContent = primary.name;
  el<HTMLParagraphElement>("detail-subtitle").textContent = `${primary.category} · ${primary.id}`;

  const telemetry = el<HTMLDivElement>("detail-telemetry");
  const wRes = watcher?.resources;
  const pRes = polling?.resources;
  const primaryRes = pRes ?? wRes;
  if (primaryRes) {
    const fmt = (val: number | undefined, unit: string): string =>
      val === undefined ? "—" : `${val}${unit}`;
    telemetry.classList.remove("is-hidden");
    telemetry.innerHTML = `
      <div class="telemetry-item"><span>CPU 耗时</span><strong>W ${fmt(wRes?.idleCpuMs, "ms")} / P ${fmt(pRes?.idleCpuMs, "ms")}</strong></div>
      <div class="telemetry-item"><span>磁盘读取</span><strong>${primaryRes.idleReadOps} 次 (${primaryRes.idleReadKb} KB)</strong></div>
      <div class="telemetry-item"><span>内存采样最大值</span><strong>W ${fmt(wRes?.peakMemoryMb, "MB")} / P ${fmt(pRes?.peakMemoryMb, "MB")}</strong></div>
      <div class="telemetry-item"><span>5 次样本 P50 / P95</span><strong>${primaryRes.latencyP50Ms}ms / ${primaryRes.latencyP95Ms}ms</strong></div>
    `;
  } else {
    telemetry.classList.add("is-hidden");
    telemetry.innerHTML = "";
  }

  const stepBtn = el<HTMLButtonElement>("tab-inspector-steps");
  const logBtn = el<HTMLButtonElement>("tab-inspector-logs");
  stepBtn.classList.toggle("is-active", state.inspectorTab === "steps");
  logBtn.classList.toggle("is-active", state.inspectorTab === "logs");
  stepBtn.setAttribute("aria-selected", String(state.inspectorTab === "steps"));
  logBtn.setAttribute("aria-selected", String(state.inspectorTab === "logs"));

  const content = el<HTMLDivElement>("detail-content");
  if (state.inspectorTab === "logs") {
    content.innerHTML = `
      <div class="compare-columns">
        ${renderModeLogsPane("Watcher 进程日志", "dot-watcher", "pane-watcher", watcher)}
        ${renderModeLogsPane("Polling 进程日志", "dot-polling", "pane-polling", polling)}
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="compare-columns">
      ${renderModeStepsPane("Watcher (fsnotify)", "dot-watcher", "pane-watcher", watcher)}
      ${renderModeStepsPane("Polling (WalkDir)", "dot-polling", "pane-polling", polling)}
    </div>
  `;
}

function renderSandbox(sb: SandboxState): void {
  state.sandbox = sb;
  const pill = el<HTMLSpanElement>("sb-status-pill");
  const startBtn = el<HTMLButtonElement>("btn-sb-start");
  const stopBtn = el<HTMLButtonElement>("btn-sb-stop");
  const engineSel = el<HTMLSelectElement>("sb-engine");
  const modeSel = el<HTMLSelectElement>("sb-mode");
  const refInput = el<HTMLInputElement>("sb-ref");
  const pollInput = el<HTMLInputElement>("sb-poll");
  const actionButtons = document.querySelectorAll<HTMLButtonElement>(".action-item[data-sb-action]");

  startBtn.disabled = sb.active;
  stopBtn.disabled = !sb.active;
  engineSel.disabled = sb.active;
  modeSel.disabled = sb.active;
  refInput.disabled = sb.active;
  pollInput.disabled = sb.active;
  const sbRefToggle = document.querySelector<HTMLButtonElement>('[data-ref-toggle="sb-ref"]');
  if (sbRefToggle) {
    sbRefToggle.disabled = sb.active;
  }
  if (sb.active) {
    closeAllRefMenus();
  }

  for (const btn of actionButtons) {
    btn.disabled = !sb.active;
  }

  if (sb.active) {
    pill.className = "status-pill pill-ok";
    const ver = sb.platformVersion ? ` ${sb.platformVersion}` : "";
    const pid = sb.childPid ? ` · PID ${sb.childPid}` : "";
    const modeText = (sb.mode ?? "polling").toUpperCase();
    pill.textContent = `运行中 · ${engineLabel(sb.engine)} (${modeText})${ver}${pid}`;
  } else {
    pill.className = "status-pill pill-neutral";
    pill.textContent = "未启动";
  }

  const handleValue = sb.active ? `${sb.currentHandles} (${formatSignedDelta(sb.handleDelta, "")})` : "—";
  const handleNote = sb.handleSupported ? `基线 ${sb.baselineHandles}` : "当前系统不支持句柄查询";
  const lockClass = sb.lockErrors > 0 ? "num-fail" : "num-ok";

  el<HTMLDivElement>("sb-metrics").innerHTML = `
    <div class="metric-cell">
      <div class="metric-label">OS 句柄占用</div>
      <div class="metric-value">${escapeHtml(handleValue)}</div>
      <div class="metric-note">${escapeHtml(handleNote)}</div>
    </div>
    <div class="metric-cell">
      <div class="metric-label">累计锁冲突</div>
      <div class="metric-value"><span class="${lockClass}">${sb.lockErrors}</span></div>
      <div class="metric-note">${sb.lockErrors === 0 ? "目录未触发锁拒" : "存在目录占用冲突"}</div>
    </div>
    <div class="metric-cell">
      <div class="metric-label">热重载计数</div>
      <div class="metric-value">${sb.reloadCount}</div>
      <div class="metric-note">最近扫描耗时 ${sb.stats.lastScanMs}ms</div>
    </div>
    <div class="metric-cell">
      <div class="metric-label">监听目录 / 扫描</div>
      <div class="metric-value">${sb.stats.watchedDirs} <span class="metric-vs">/</span> ${sb.stats.scans}</div>
      <div class="metric-note">轮询间隔 ${sb.pollIntervalMs}ms</div>
    </div>
  `;

  el<HTMLDivElement>("sb-workspace").textContent = sb.workspaceDir
    ? `工作目录: ${sb.workspaceDir}${sb.apiUrl ? ` · HTTP ${sb.apiUrl}` : ""}`
    : "工作目录: 尚未创建（点击「启动沙盒」创建独立临时目录）";

  const events = sb.events ?? [];
  const evHost = el<HTMLDivElement>("sb-events");
  if (events.length === 0) {
    evHost.innerHTML = '<div class="empty-state">启动沙盒并执行操作后，此处显示事件记录</div>';
    return;
  }

  evHost.innerHTML = "";
  for (const ev of events) {
    const row = document.createElement("div");
    row.className = ev.ok ? "event-row" : "event-row is-fail";
    const errHtml = ev.error ? `<div class="error-box">${escapeHtml(ev.error)}</div>` : "";
    row.innerHTML = `
      <div class="event-head">
        <span class="event-title">
          <span class="status-dot ${ev.ok ? "dot-ok" : "dot-fail"}"></span>
          <span>${escapeHtml(ev.title)}</span>
        </span>
        <span class="event-meta">${escapeHtml(formatClock(ev.time))} · ${ev.durationMs}ms</span>
      </div>
      <div class="event-detail">${escapeHtml(ev.detail)}</div>
      ${errHtml}
    `;
    evHost.append(row);
  }
}

function matchesLogFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "error") {
    return entry.level === "error" || entry.level === "warn";
  }
  if (filter === "reload") {
    return entry.level === "reload" || entry.level === "ok";
  }
  return entry.source === "build";
}

function renderLogs(): void {
  const entries = state.logs ?? [];
  el<HTMLSpanElement>("log-count-pill").textContent = String(entries.length);
  const body = el<HTMLDivElement>("live-log-body");
  const filtered = entries.filter((entry) => matchesLogFilter(entry, state.logFilter));

  if (filtered.length === 0) {
    body.innerHTML = '<div class="empty-hint" style="color:#9ca3af;">暂无匹配日志</div>';
    return;
  }

  body.innerHTML = filtered
    .slice(-300)
    .map(
      (entry) => `
      <div class="log-row lvl-${escapeHtml(entry.level)}">
        <span class="log-time">${escapeHtml(entry.time)}</span>
        <span class="log-src">[${escapeHtml(entry.source.toUpperCase())}]</span>
        <span class="log-msg">${escapeHtml(entry.message)}</span>
      </div>`
    )
    .join("");

  if (state.autoScrollLogs) {
    body.scrollTop = body.scrollHeight;
  }
}

function setDrawerOpen(open: boolean): void {
  state.drawerOpen = open;
  const drawer = el<HTMLElement>("log-drawer");
  const backdrop = el<HTMLDivElement>("log-backdrop");
  drawer.classList.toggle("is-open", open);
  backdrop.classList.toggle("is-open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  backdrop.setAttribute("aria-hidden", String(!open));
  if (open) {
    renderLogs();
  }
}

function syncSandboxRefVisibility(): void {
  const engine = el<HTMLSelectElement>("sb-engine").value as AuditEngine;
  el<HTMLElement>("sb-ref-wrap").classList.toggle("is-hidden", engine !== "platform");
}

function switchTab(tab: ActiveTab): void {
  state.activeTab = tab;
  el<HTMLElement>("view-compare").classList.toggle("is-hidden", tab !== "compare");
  el<HTMLElement>("view-sandbox").classList.toggle("is-hidden", tab !== "sandbox");

  el<HTMLHeadingElement>("page-title").textContent =
    tab === "compare" ? "A/B 对照测试" : "实时交互沙盒";

  const compareOnlyNodes = document.querySelectorAll<HTMLElement>(".compare-only");
  for (const node of compareOnlyNodes) {
    node.classList.toggle("is-hidden", tab !== "compare");
  }

  const navBtns = document.querySelectorAll<HTMLButtonElement>(".nav-btn[data-tab]");
  for (const btn of navBtns) {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  }
}

function connectLogStream(): void {
  const sseDot = el<HTMLSpanElement>("sse-dot");
  const es = new EventSource("/api/logs/stream");
  es.onopen = () => {
    sseDot.className = "status-dot dot-ok";
  };
  es.onerror = () => {
    sseDot.className = "status-dot dot-warn";
  };
  es.addEventListener("log", (ev: MessageEvent<string>) => {
    try {
      const entry = JSON.parse(ev.data) as LogEntry;
      state.logs.push(entry);
      if (state.logs.length > 600) {
        state.logs = state.logs.slice(-600);
      }
      if (state.drawerOpen) {
        renderLogs();
      } else {
        el<HTMLSpanElement>("log-count-pill").textContent = String(state.logs.length);
      }
    } catch {
      // Ignore malformed SSE payload
    }
  });
}

async function refreshTargets(): Promise<void> {
  const [status, refsResp] = await Promise.all([
    apiGet<TargetStatus>("/api/targets"),
    apiGet<GitRefsResponse>("/api/targets/refs"),
  ]);
  state.gitRefs = refsResp.refs ?? [];
  state.gitRefsWarning = refsResp.warning ?? "";
  renderGitRefs();
  renderTargetStatus(status);
}

async function buildTargetsNow(): Promise<void> {
  if (state.buildingTargets) {
    return;
  }
  state.buildingTargets = true;
  if (state.targetStatus) {
    renderTargetStatus(state.targetStatus);
  }
  setBanner("running", "正在通过只读 git worktree 构建对照二进制...");
  try {
    const watcherRef = el<HTMLInputElement>("cfg-watcher-ref").value.trim();
    const pollingRef = el<HTMLInputElement>("cfg-polling-ref").value.trim();
    const status = await apiPost<TargetStatus>("/api/targets/build", { watcherRef, pollingRef });
    renderTargetStatus(status);
    setBanner("ok", "对比二进制构建完成，已写入本地 Commit 缓存。");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setBanner("error", `构建失败: ${msg}`);
  } finally {
    state.buildingTargets = false;
    if (state.targetStatus) {
      renderTargetStatus(state.targetStatus);
    }
  }
}

async function executeCompare(): Promise<void> {
  if (state.busy) {
    return;
  }
  const cfg = readConfig();
  setBusy(true);
  setBanner("running", `正在使用「${engineLabel(cfg.engine)}」依次执行 Watcher 与 Polling 全量对比...`);
  try {
    const cmp = await apiPost<ComparisonRecord>("/api/compare", cfg);
    state.comparisons.unshift(cmp);
    state.activeComparison = cmp;
    const first = cmp.pollingRun.results[0] ?? cmp.watcherRun.results[0];
    state.selectedScenarioId = first ? first.id : null;
    renderHistory();
    renderComparison(cmp);
    await refreshTargets();
    setBanner("ok", `对照完成：${cmp.summary.verdict}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setBanner("error", `对照失败: ${msg}`);
  } finally {
    setBusy(false);
  }
}

async function executeSingleRun(mode: MonitorMode): Promise<void> {
  if (state.busy) {
    return;
  }
  const cfg = readConfig(mode);
  setBusy(true);
  setBanner("running", `正在单独执行 ${mode.toUpperCase()}（${engineLabel(cfg.engine)}）...`);
  try {
    const run = await apiPost<RunRecord>("/api/runs", cfg);
    const emptySummary = {
      total: run.summary.total,
      passed: 0,
      failed: 0,
      totalLockErrors: 0,
      maxHandleDelta: 0,
      maxWatchedDirs: 0,
      avgLatencyMs: 0,
      totalDurationMs: 0,
    };
    const emptyRun: RunRecord = {
      id: `${run.id}-empty`,
      mode: mode === "watcher" ? "polling" : "watcher",
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      config: run.config,
      summary: emptySummary,
      results: [],
    };
    if (run.engine) {
      emptyRun.engine = run.engine;
    }

    const wRun = mode === "watcher" ? run : emptyRun;
    const pRun = mode === "polling" ? run : emptyRun;
    const synthetic: ComparisonRecord = {
      id: run.id,
      createdAt: run.finishedAt,
      config: run.config,
      watcherRun: wRun,
      pollingRun: pRun,
      summary: {
        watcherLockErrors: wRun.summary.totalLockErrors,
        pollingLockErrors: pRun.summary.totalLockErrors,
        watcherPassed: wRun.summary.passed,
        pollingPassed: pRun.summary.passed,
        totalScenarios: run.summary.total,
        watcherMaxHandles: wRun.summary.maxHandleDelta,
        pollingMaxHandles: pRun.summary.maxHandleDelta,
        verdict: `单模运行 (${mode.toUpperCase()}) · 锁冲突 ${run.summary.totalLockErrors} 次 · 通过 ${run.summary.passed}/${run.summary.total}`,
      },
    };
    if (run.engine) {
      synthetic.engine = run.engine;
    }

    state.activeComparison = synthetic;
    const first = run.results[0];
    state.selectedScenarioId = first ? first.id : null;
    renderComparison(synthetic);
    setBanner("ok", synthetic.summary.verdict);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setBanner("error", `运行失败: ${msg}`);
  } finally {
    setBusy(false);
  }
}

function exportActiveComparison(): void {
  if (!state.activeComparison) {
    return;
  }
  const blob = new Blob([JSON.stringify(state.activeComparison, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildExportFilename(state.activeComparison.id);
  a.click();
  URL.revokeObjectURL(url);
}

async function startSandbox(): Promise<void> {
  const engine = el<HTMLSelectElement>("sb-engine").value as AuditEngine;
  const mode = el<HTMLSelectElement>("sb-mode").value as MonitorMode;
  const ref = el<HTMLInputElement>("sb-ref").value.trim();
  const pollIntervalMs = Number(el<HTMLInputElement>("sb-poll").value) || 500;
  try {
    const sb = await apiPost<SandboxState>("/api/sandbox/start", {
      engine,
      mode,
      pollIntervalMs,
      ref,
    });
    renderSandbox(sb);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setBanner("error", `沙盒启动失败: ${msg}`);
  }
}

async function triggerSandboxAction(action: string): Promise<void> {
  try {
    const sb = await apiPost<SandboxState>("/api/sandbox/action", { action });
    renderSandbox(sb);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setBanner("error", `沙盒动作失败: ${msg}`);
  }
}

async function stopSandbox(): Promise<void> {
  try {
    const sb = await apiPost<SandboxState>("/api/sandbox/stop", {});
    renderSandbox(sb);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setBanner("error", `停止沙盒失败: ${msg}`);
  }
}

function bindEvents(): void {
  const navBtns = document.querySelectorAll<HTMLButtonElement>(".nav-btn[data-tab]");
  for (const btn of navBtns) {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab === "sandbox" ? "sandbox" : "compare");
    });
  }

  const engineRadios = document.querySelectorAll<HTMLInputElement>('input[name="audit-engine"]');
  for (const radio of engineRadios) {
    radio.addEventListener("change", () => {
      state.transientNotice = null;
      state.engine = radio.value === "builtin" ? "builtin" : "platform";
      syncEngineUI();
    });
  }

  bindRefCombobox("cfg-watcher-ref", () => {
    state.transientNotice = null;
    renderBranchPreviews();
  });
  bindRefCombobox("cfg-polling-ref", () => {
    state.transientNotice = null;
    renderBranchPreviews();
  });
  bindRefCombobox("sb-ref");

  document.addEventListener("click", (ev: MouseEvent) => {
    const target = ev.target as Node | null;
    if (!target) {
      return;
    }
    const inside = target instanceof Element ? target.closest(".ref-combobox") : null;
    if (!inside) {
      closeAllRefMenus();
    }
  });

  const onParamEdit = (): void => {
    state.transientNotice = null;
    updateAdvancedSummary();
    updateEmptyLaunchMeta();
    syncStatusBanner();
  };
  el<HTMLInputElement>("cfg-rounds").addEventListener("input", onParamEdit);
  el<HTMLSelectElement>("cfg-scale").addEventListener("change", onParamEdit);
  el<HTMLInputElement>("cfg-poll").addEventListener("input", onParamEdit);

  el<HTMLButtonElement>("btn-new-compare").addEventListener("click", enterNewCompareMode);
  el<HTMLButtonElement>("btn-empty-compare").addEventListener("click", () => {
    void executeCompare();
  });
  el<HTMLButtonElement>("btn-empty-params").addEventListener("click", () => {
    el<HTMLDetailsElement>("advanced-drawer").open = true;
  });

  el<HTMLButtonElement>("btn-refresh-refs").addEventListener("click", () => {
    void refreshTargets();
  });
  el<HTMLButtonElement>("btn-build-targets").addEventListener("click", () => {
    void buildTargetsNow();
  });

  el<HTMLButtonElement>("btn-compare").addEventListener("click", () => {
    void executeCompare();
  });
  el<HTMLButtonElement>("btn-run-watcher").addEventListener("click", () => {
    void executeSingleRun("watcher");
  });
  el<HTMLButtonElement>("btn-run-polling").addEventListener("click", () => {
    void executeSingleRun("polling");
  });
  el<HTMLButtonElement>("btn-export").addEventListener("click", exportActiveComparison);

  const inspectorTabBtns = document.querySelectorAll<HTMLButtonElement>("[data-inspector-tab]");
  for (const btn of inspectorTabBtns) {
    btn.addEventListener("click", () => {
      state.inspectorTab = btn.dataset.inspectorTab === "logs" ? "logs" : "steps";
      if (state.activeComparison && state.selectedScenarioId) {
        renderScenarioDetail(state.activeComparison, state.selectedScenarioId);
      }
    });
  }

  el<HTMLButtonElement>("btn-toggle-logs").addEventListener("click", () => {
    setDrawerOpen(!state.drawerOpen);
  });
  el<HTMLButtonElement>("btn-close-logs").addEventListener("click", () => {
    setDrawerOpen(false);
  });
  el<HTMLDivElement>("log-backdrop").addEventListener("click", () => {
    setDrawerOpen(false);
  });

  window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && state.drawerOpen) {
      setDrawerOpen(false);
    }
  });

  const chips = document.querySelectorAll<HTMLButtonElement>(".filter-chip[data-log-filter]");
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const f = chip.dataset.logFilter as LogFilter | undefined;
      state.logFilter = f ?? "all";
      for (const item of chips) {
        item.classList.toggle("is-active", item === chip);
      }
      renderLogs();
    });
  }

  el<HTMLInputElement>("chk-autoscroll").addEventListener("change", (ev) => {
    state.autoScrollLogs = (ev.target as HTMLInputElement).checked;
  });

  el<HTMLButtonElement>("btn-clear-logs").addEventListener("click", async () => {
    await apiPost<{ ok: boolean }>("/api/logs/clear", {});
    state.logs = [];
    renderLogs();
  });

  el<HTMLSelectElement>("sb-engine").addEventListener("change", syncSandboxRefVisibility);
  el<HTMLButtonElement>("btn-sb-start").addEventListener("click", () => {
    void startSandbox();
  });
  el<HTMLButtonElement>("btn-sb-stop").addEventListener("click", () => {
    void stopSandbox();
  });
  const sbBtns = document.querySelectorAll<HTMLButtonElement>(".action-item[data-sb-action]");
  for (const btn of sbBtns) {
    btn.addEventListener("click", () => {
      const action = btn.dataset.sbAction;
      if (action) {
        void triggerSandboxAction(action);
      }
    });
  }
}

async function bootstrap(): Promise<void> {
  bindEvents();
  syncEngineUI();
  syncSandboxRefVisibility();
  connectLogStream();

  try {
    const [scenariosResp, cmpResp, sbState, logResp] = await Promise.all([
      apiGet<{ scenarios: ScenarioInfo[] }>("/api/scenarios"),
      apiGet<{ comparisons: ComparisonRecord[] }>("/api/comparisons"),
      apiGet<SandboxState>("/api/sandbox"),
      apiGet<{ entries: LogEntry[] }>("/api/logs"),
    ]);

    state.scenarios = scenariosResp.scenarios ?? [];
    renderScenarios(state.scenarios);

    state.comparisons = cmpResp.comparisons ?? [];
    const latest = state.comparisons[0] ?? null;
    state.activeComparison = latest;
    const pResults = latest?.pollingRun.results ?? [];
    const wResults = latest?.watcherRun.results ?? [];
    const firstScenario = pResults[0] ?? wResults[0];
    state.selectedScenarioId = firstScenario ? firstScenario.id : null;
    renderHistory();
    renderComparison(latest);
    syncStatusBanner();

    state.logs = logResp.entries ?? [];
    renderLogs();
    renderSandbox(sbState);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setBanner("error", `初始化失败: ${msg}`);
  }

  try {
    await refreshTargets();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.gitRefsWarning = msg;
    renderBranchPreviews();
  }
}

void bootstrap();

