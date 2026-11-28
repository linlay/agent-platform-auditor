package auditor

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"catalog-lock-auditor/internal/monitor"
	"catalog-lock-auditor/internal/targetbuild"
)

// Explicit opt-in: uses already-built binaries, only isolated temporary runtime
// directories, and never builds or modifies the source repository.
func TestPlatformScenarios(t *testing.T) {
	if os.Getenv("AUDITOR_PLATFORM_TEST") != "1" {
		t.Skip("set AUDITOR_PLATFORM_TEST=1 to test built platform binaries")
	}
	root, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}
	targets := targetbuild.NewManager(root)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()
	for _, mode := range []monitor.Mode{monitor.ModeWatcher, monitor.ModePolling} {
		if _, err := targets.BinaryPath(mode); err != nil {
			t.Fatal(err)
		}
		for _, info := range ListScenarios() {
			t.Run(string(mode)+"/"+info.ID, func(t *testing.T) {
				if info.ID == "same-size-mtime-audit" && os.Getenv("AUDITOR_AUDIT_TEST") != "1" {
					t.Skip("set AUDITOR_AUDIT_TEST=1 for full audit cycle")
				}
				res := runScenario(ctx, info, mode, RunConfig{Engine: EnginePlatform, PollIntervalMs: 500, ReloadDebounceMs: 150, StressRounds: 3, ScaleProfile: "small"}, targets, nil)
				t.Logf("%s/%s: %s, operations=%d, locks=%d, version=%s", mode, info.ID, res.Status, res.Operations, res.LockErrors, res.PlatformVersion)
				for _, step := range res.Steps {
					t.Logf("ok=%t %s: %s %s", step.OK, step.Name, step.Detail, step.Error)
				}
				if res.Status != "passed" {
					t.Errorf("%s: failed (see exact step evidence above)", info.ID)
				}
			})
		}
	}
}
