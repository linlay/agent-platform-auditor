package auditor

import (
	"time"

	"catalog-lock-auditor/internal/monitor"
)

const (
	EngineBuiltin  = "builtin"
	EnginePlatform = "platform"
)

// ScenarioInfo describes a selectable audit test scenario.
type ScenarioInfo struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Category        string `json:"category"`
	Description     string `json:"description"`
	Focus           string `json:"focus"`
	DefaultSelected bool   `json:"defaultSelected"`
	EstimatedTime   string `json:"estimatedTime,omitempty"`
}

// ResourceMetrics captures Windows process CPU, disk read I/O, memory, and latency percentiles.
type ResourceMetrics struct {
	IdleCPUMs    int64   `json:"idleCpuMs"`
	IdleReadOps  uint64  `json:"idleReadOps"`
	IdleReadKB   uint64  `json:"idleReadKb"`
	PeakMemoryMB float64 `json:"peakMemoryMb"`
	LatencyP50Ms int64   `json:"latencyP50Ms"`
	LatencyP95Ms int64   `json:"latencyP95Ms"`
}

// RunConfig captures parameters for a single run or an A/B comparison.
type RunConfig struct {
	Engine           string       `json:"engine,omitempty"` // builtin | platform
	Mode             monitor.Mode `json:"mode,omitempty"`
	WatcherRef       string       `json:"watcherRef,omitempty"`
	PollingRef       string       `json:"pollingRef,omitempty"`
	ScenarioIDs      []string     `json:"scenarioIds,omitempty"`
	StressRounds     int          `json:"stressRounds"`
	ScaleProfile     string       `json:"scaleProfile"` // small | medium | large
	PollIntervalMs   int          `json:"pollIntervalMs"`
	ReloadDebounceMs int          `json:"reloadDebounceMs"`
}

// StepLog captures one discrete step inside a scenario execution.
type StepLog struct {
	Name        string `json:"name"`
	OK          bool   `json:"ok"`
	DurationMs  int64  `json:"durationMs"`
	Detail      string `json:"detail"`
	Error       string `json:"error,omitempty"`
	SystemError uint64 `json:"systemError,omitempty"`
}

// ScenarioResult summarizes the outcome and lock/performance metrics of a scenario.
type ScenarioResult struct {
	ID               string           `json:"id"`
	Name             string           `json:"name"`
	Category         string           `json:"category"`
	Engine           string           `json:"engine"`
	Mode             string           `json:"mode"`
	Status           string           `json:"status"` // passed | failed
	LockErrors       int              `json:"lockErrors"`
	Operations       int              `json:"operations"`
	LockErrorSamples []string         `json:"lockErrorSamples,omitempty"`
	ReloadDetected   bool             `json:"reloadDetected"`
	ReloadLatencyMs  int64            `json:"reloadLatencyMs"`
	DurationMs       int64            `json:"durationMs"`
	HandleDelta      int              `json:"handleDelta"`
	HandleMetricKind string           `json:"handleMetricKind,omitempty"` // delta | process-total
	HandleSupported  bool             `json:"handleSupported"`
	ChildPID         int              `json:"childPid,omitempty"`
	PlatformVersion  string           `json:"platformVersion,omitempty"`
	WatchedDirs      int              `json:"watchedDirs"`
	ScanCount        int              `json:"scanCount"`
	LastScanMs       int64            `json:"lastScanMs"`
	Resources        *ResourceMetrics `json:"resources,omitempty"`
	Steps            []StepLog        `json:"steps"`
	Logs             []string         `json:"logs,omitempty"`
}

// RunSummary aggregates metrics across all scenarios in a run.
type RunSummary struct {
	Total           int   `json:"total"`
	Passed          int   `json:"passed"`
	Failed          int   `json:"failed"`
	TotalLockErrors int   `json:"totalLockErrors"`
	MaxHandleDelta  int   `json:"maxHandleDelta"`
	MaxWatchedDirs  int   `json:"maxWatchedDirs"`
	AvgLatencyMs    int64 `json:"avgLatencyMs"`
	TotalDurationMs int64 `json:"totalDurationMs"`
}

// RunRecord represents one saved Watcher or Polling audit run.
type RunRecord struct {
	ID         string           `json:"id"`
	Engine     string           `json:"engine"`
	Mode       monitor.Mode     `json:"mode"`
	StartedAt  time.Time        `json:"startedAt"`
	FinishedAt time.Time        `json:"finishedAt"`
	Config     RunConfig        `json:"config"`
	Summary    RunSummary       `json:"summary"`
	Results    []ScenarioResult `json:"results"`
}

// ComparisonSummary captures side-by-side improvements between Watcher and Polling.
type ComparisonSummary struct {
	WatcherLockErrors int    `json:"watcherLockErrors"`
	PollingLockErrors int    `json:"pollingLockErrors"`
	WatcherPassed     int    `json:"watcherPassed"`
	PollingPassed     int    `json:"pollingPassed"`
	TotalScenarios    int    `json:"totalScenarios"`
	WatcherMaxHandles int    `json:"watcherMaxHandles"`
	PollingMaxHandles int    `json:"pollingMaxHandles"`
	Verdict           string `json:"verdict"`
}

// ComparisonRecord pairs a Watcher run and a Polling run executed under identical settings.
type ComparisonRecord struct {
	ID         string            `json:"id"`
	Engine     string            `json:"engine"`
	CreatedAt  time.Time         `json:"createdAt"`
	Config     RunConfig         `json:"config"`
	WatcherRun RunRecord         `json:"watcherRun"`
	PollingRun RunRecord         `json:"pollingRun"`
	Summary    ComparisonSummary `json:"summary"`
}

// SandboxEvent records a user filesystem action or a monitor reload reaction.
type SandboxEvent struct {
	Time       time.Time `json:"time"`
	Kind       string    `json:"kind"` // action | reload | system
	Title      string    `json:"title"`
	OK         bool      `json:"ok"`
	DurationMs int64     `json:"durationMs"`
	Detail     string    `json:"detail"`
	Error      string    `json:"error,omitempty"`
}

// SandboxState describes the active interactive sandbox workspace.
type SandboxState struct {
	Active          bool           `json:"active"`
	Engine          string         `json:"engine,omitempty"`
	Mode            monitor.Mode   `json:"mode,omitempty"`
	PollIntervalMs  int            `json:"pollIntervalMs"`
	WorkspaceDir    string         `json:"workspaceDir,omitempty"`
	ChildPID        int            `json:"childPid,omitempty"`
	PlatformVersion string         `json:"platformVersion,omitempty"`
	APIURL          string         `json:"apiUrl,omitempty"`
	StartedAt       *time.Time     `json:"startedAt,omitempty"`
	BaselineHandles int            `json:"baselineHandles"`
	CurrentHandles  int            `json:"currentHandles"`
	HandleDelta     int            `json:"handleDelta"`
	HandleSupported bool           `json:"handleSupported"`
	Stats           monitor.Stats  `json:"stats"`
	LockErrors      int            `json:"lockErrors"`
	ReloadCount     int            `json:"reloadCount"`
	Events          []SandboxEvent `json:"events"`
}
