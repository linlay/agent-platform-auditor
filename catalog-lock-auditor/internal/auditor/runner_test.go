package auditor

import (
	"context"
	"encoding/json"
	"runtime"
	"strings"
	"testing"
	"time"

	"catalog-lock-auditor/internal/monitor"
	"catalog-lock-auditor/internal/targetbuild"
)

func TestRunnerPollingAndComparePersistence(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	runner := NewRunner(store, targetbuild.NewManager(t.TempDir()), nil)
	var ids []string
	for _, info := range ListScenarios() {
		ids = append(ids, info.ID)
	}
	cfg := RunConfig{
		Engine:           EngineBuiltin,
		ScenarioIDs:      ids,
		StressRounds:     3,
		ScaleProfile:     "small",
		PollIntervalMs:   30,
		ReloadDebounceMs: 40,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	cmp, err := runner.RunCompare(ctx, cfg)
	if err != nil {
		t.Fatalf("RunCompare: %v", err)
	}
	if len(cmp.PollingRun.Results) != 9 || len(cmp.WatcherRun.Results) != 9 {
		t.Fatal("all nine scenarios must run for both modes")
	}
	for _, result := range cmp.PollingRun.Results {
		assertScenarioOutcome(t, result, false)
	}
	for _, result := range cmp.WatcherRun.Results {
		if result.ID == "all-catalog-categories" {
			if result.Status != "failed" || len(result.Steps) == 0 || !strings.HasPrefix(result.Steps[len(result.Steps)-1].Name, "tools ") {
				t.Errorf("missing-root watcher limitation not identified: %+v", result)
			}
			continue
		}
		assertScenarioOutcome(t, result, true)
	}

	list, err := store.ListComparisons()
	if err != nil || len(list) != 1 || list[0].ID != cmp.ID {
		t.Fatalf("ListComparisons=%+v err=%v", list, err)
	}
	if _, err := store.GetComparison("../escape"); err == nil {
		t.Fatal("expected traversal rejection")
	}
}

// This tests the auditor's verdict: Polling must pass cleanly offline, while
// Watcher on Windows may fail external directory operations (5/32/33). Any such
// run MUST stay marked failed in the report, never retried to green.
func assertScenarioOutcome(t *testing.T, result ScenarioResult, allowWindowsLockFailure bool) {
	t.Helper()
	failed := 0
	for _, step := range result.Steps {
		if step.OK {
			continue
		}
		failed++
		if !allowWindowsLockFailure || runtime.GOOS != "windows" || (step.SystemError != 5 && step.SystemError != 32 && step.SystemError != 33) {
			data, _ := json.Marshal(result)
			t.Errorf("unexpected scenario failure: %s", data)
			return
		}
	}
	if failed == 0 {
		if result.Status != "passed" || !result.ReloadDetected || result.Operations == 0 {
			t.Errorf("invalid successful result: %+v", result)
		}
	} else if result.Status != "failed" {
		t.Errorf("filesystem failure was reported as passed: %+v", result)
	} else {
		t.Logf("%s/%s correctly reported filesystem failure", result.Mode, result.ID)
	}
}

func TestRunnerRejectsUnbuiltPlatformEngine(t *testing.T) {
	store, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	runner := NewRunner(store, targetbuild.NewManager(t.TempDir()), nil)
	if _, err := runner.RunCompare(context.Background(), RunConfig{Engine: EnginePlatform}); err == nil {
		t.Fatal("expected error when real platform binaries are not built")
	}
}

func TestSandboxLifecycleAndActions(t *testing.T) {
	sb := NewSandboxManager(targetbuild.NewManager(t.TempDir()), nil)
	state, err := sb.Start(monitor.ModePolling, EngineBuiltin, 40, "")
	if err != nil {
		t.Fatalf("sandbox start: %v", err)
	}
	if !state.Active || state.Mode != monitor.ModePolling || state.Engine != EngineBuiltin {
		t.Fatalf("unexpected sandbox state: %+v", state)
	}
	for _, action := range []string{"rename-skill", "edit-skill", "replace-connector", "write-staging"} {
		st, err := sb.Action(action)
		if err != nil {
			t.Fatalf("action %s error: %v", action, err)
		}
		if st.LockErrors != 0 {
			t.Fatalf("polling sandbox lock error on %s: %+v", action, st)
		}
	}
	if err := sb.Stop(); err != nil {
		t.Fatalf("sandbox stop: %v", err)
	}
	if st := sb.State(); st.Active {
		t.Fatal("expected sandbox inactive after stop")
	}
}
