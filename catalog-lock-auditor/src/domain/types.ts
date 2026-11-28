export type MonitorMode = "watcher" | "polling";

export type AuditEngine = "builtin" | "platform";

export type ScaleProfile = "small" | "medium" | "large" | "xlarge";

export interface TargetBinaryInfo {
  role: MonitorMode;
  ref: string;
  commit: string;
  binaryPath: string;
  sha256: string;
  builtAt: string;
  exists: boolean;
  cacheHit?: boolean;
}

export interface TargetManifest {
  sourceDir: string;
  goVersion: string;
  builtAt: string;
  watcher: TargetBinaryInfo;
  polling: TargetBinaryInfo;
}

export interface TargetStatus {
  ready: boolean;
  building: boolean;
  lastError?: string;
  defaultSourceDir: string;
  defaultWatcherRef: string;
  defaultPollingRef: string;
  cachedCommits?: string[];
  manifest?: TargetManifest;
}

export interface LogEntry {
  seq: number;
  time: string;
  level: "info" | "ok" | "warn" | "error" | "reload" | "platform";
  source: "build" | "runner" | "watcher" | "polling" | "sandbox";
  message: string;
}

export interface GitRefOption {
  name: string;
  kind: "branch" | "remote" | "tag";
  commit: string;
  subject: string;
}

export interface GitRefsResponse {
  sourceDir: string;
  refs: GitRefOption[];
  warning?: string;
}

export interface HealthInfo {
  app: string;
  os: string;
  arch: string;
  goVersion: string;
  handleCountSupported: boolean;
  currentHandleCount: number;
  defaultPort: number;
  timestamp: string;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  focus: string;
  defaultSelected: boolean;
  estimatedTime?: string;
}

export interface ResourceMetrics {
  idleCpuMs: number;
  idleReadOps: number;
  idleReadKb: number;
  peakMemoryMb: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
}

export interface RunConfig {
  engine?: AuditEngine;
  mode?: MonitorMode;
  watcherRef?: string;
  pollingRef?: string;
  scenarioIds?: string[];
  stressRounds: number;
  scaleProfile: ScaleProfile;
  pollIntervalMs: number;
  reloadDebounceMs: number;
}

export interface StepLog {
  name: string;
  ok: boolean;
  durationMs: number;
  detail: string;
  error?: string;
  systemError?: number;
}

export interface ScenarioResult {
  id: string;
  name: string;
  category: string;
  engine?: AuditEngine;
  mode: string;
  status: "passed" | "failed";
  lockErrors: number;
  operations: number;
  lockErrorSamples?: string[];
  reloadDetected: boolean;
  reloadLatencyMs: number;
  durationMs: number;
  handleDelta: number;
  handleMetricKind?: string;
  handleSupported: boolean;
  childPid?: number;
  platformVersion?: string;
  watchedDirs: number;
  scanCount: number;
  lastScanMs: number;
  resources?: ResourceMetrics;
  steps: StepLog[];
  logs?: string[];
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  totalLockErrors: number;
  maxHandleDelta: number;
  maxWatchedDirs: number;
  avgLatencyMs: number;
  totalDurationMs: number;
}

export interface RunRecord {
  id: string;
  engine?: AuditEngine;
  mode: MonitorMode;
  startedAt: string;
  finishedAt: string;
  config: RunConfig;
  summary: RunSummary;
  results: ScenarioResult[];
}

export interface ComparisonSummary {
  watcherLockErrors: number;
  pollingLockErrors: number;
  watcherPassed: number;
  pollingPassed: number;
  totalScenarios: number;
  watcherMaxHandles: number;
  pollingMaxHandles: number;
  verdict: string;
}

export interface ComparisonRecord {
  id: string;
  engine?: AuditEngine;
  createdAt: string;
  config: RunConfig;
  watcherRun: RunRecord;
  pollingRun: RunRecord;
  summary: ComparisonSummary;
}

export interface MonitorStats {
  mode: MonitorMode | "";
  watchedDirs: number;
  scans: number;
  lastScanMs: number;
  maxScanMs: number;
  currentBackoffMs: number;
  errors: number;
  lastError?: string;
}

export interface SandboxEvent {
  time: string;
  kind: "action" | "reload" | "system";
  title: string;
  ok: boolean;
  durationMs: number;
  detail: string;
  error?: string;
}

export interface SandboxState {
  active: boolean;
  engine?: AuditEngine;
  mode?: MonitorMode;
  pollIntervalMs: number;
  workspaceDir?: string;
  childPid?: number;
  platformVersion?: string;
  apiUrl?: string;
  startedAt?: string;
  baselineHandles: number;
  currentHandles: number;
  handleDelta: number;
  handleSupported: boolean;
  stats: MonitorStats;
  lockErrors: number;
  reloadCount: number;
  events: SandboxEvent[];
}
