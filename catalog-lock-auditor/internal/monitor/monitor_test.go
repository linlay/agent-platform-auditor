package monitor

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func TestPollCategorySettleAndAntiStarvation(t *testing.T) {
	var s pollCategory
	base := pollDigest{1}
	s = pollCategory{reported: base, previous: base}

	// First change is unsettled until observed stably on the next scan.
	d1 := pollDigest{2}
	if s.changed(d1) {
		t.Fatal("first changing scan should wait for settle")
	}
	if !s.changed(d1) {
		t.Fatal("second identical scan should trigger reload")
	}
	if s.changed(d1) {
		t.Fatal("unchanged settled digest should not re-trigger")
	}

	// Continuous changes must still emit at maxUnsettledScans.
	triggered := false
	for i := byte(3); i < 3+maxUnsettledScans; i++ {
		if s.changed(pollDigest{i}) {
			triggered = true
			break
		}
	}
	if !triggered {
		t.Fatal("continuous writes starved beyond maxUnsettledScans")
	}
}

func TestComputeNextIntervalBackoff(t *testing.T) {
	if got := computeNextInterval(500*time.Millisecond, 10*time.Millisecond); got != 500*time.Millisecond {
		t.Fatalf("fast scan got %v, want 500ms", got)
	}
	if got := computeNextInterval(500*time.Millisecond, 250*time.Millisecond); got != 2500*time.Millisecond {
		t.Fatalf("slow scan got %v, want 2.5s", got)
	}
	if got := computeNextInterval(500*time.Millisecond, 5*time.Second); got != maxPollBackoff {
		t.Fatalf("extreme scan got %v, want %v", got, maxPollBackoff)
	}
}

func TestManagerDetectsChangesAndIgnoresStagingAcrossModes(t *testing.T) {
	for _, mode := range []Mode{ModePolling, ModeWatcher} {
		t.Run(string(mode), func(t *testing.T) {
			root := t.TempDir()
			skillsDir := filepath.Join(root, "skills-center")
			if err := os.MkdirAll(skillsDir, 0755); err != nil {
				t.Fatal(err)
			}

			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()

			mgr, err := Start(ctx, mode, []Entry{{Path: skillsDir, Reason: "skills"}}, Options{
				PollInterval: 30 * time.Millisecond,
				Debounce:     40 * time.Millisecond,
			})
			if err != nil {
				t.Fatalf("start %s: %v", mode, err)
			}
			defer func() {
				cancel()
				<-mgr.Done()
			}()

			// Staging dir must be ignored.
			staging := filepath.Join(skillsDir, ".skill-import-staging")
			if err := os.MkdirAll(staging, 0755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(staging, "SKILL.md"), []byte("staging"), 0644); err != nil {
				t.Fatal(err)
			}

			select {
			case ev := <-mgr.Events():
				t.Fatalf("unexpected reload from staging dir: %+v", ev)
			case <-time.After(180 * time.Millisecond):
			}

			// Promote staging -> live must emit a skills reload.
			live := filepath.Join(skillsDir, "demo-skill")
			if err := os.Rename(staging, live); err != nil {
				t.Fatalf("promote rename: %v", err)
			}

			select {
			case ev := <-mgr.Events():
				if ev.Reason != "skills" {
					t.Fatalf("got reason %q, want skills", ev.Reason)
				}
			case <-time.After(2 * time.Second):
				t.Fatalf("timed out waiting for reload after promote in %s mode", mode)
			}

			stats := mgr.Stats()
			if mode == ModePolling && stats.WatchedDirs != 0 {
				t.Fatalf("polling watchedDirs=%d, want 0", stats.WatchedDirs)
			}
			if mode == ModeWatcher && stats.WatchedDirs == 0 {
				t.Fatal("watcher should report positive watchedDirs")
			}
		})
	}
}

func TestManagerSuspendAndResume(t *testing.T) {
	root := t.TempDir()
	skillsDir := filepath.Join(root, "skills-center")
	if err := os.MkdirAll(skillsDir, 0755); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	mgr, err := Start(ctx, ModePolling, []Entry{{Path: skillsDir, Reason: "skills"}}, Options{
		PollInterval: time.Hour,
		Debounce:     30 * time.Millisecond,
	})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		cancel()
		<-mgr.Done()
	}()

	resume, err := mgr.Suspend("skills")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(skillsDir, "a.md"), []byte("v1"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := resume(); err != nil {
		t.Fatal(err)
	}

	select {
	case ev := <-mgr.Events():
		if ev.Reason != "skills" {
			t.Fatalf("got reason %q, want skills", ev.Reason)
		}
	case <-time.After(time.Second):
		t.Fatal("expected resume to trigger reconciliation even with long poll interval")
	}
}

func TestProcessHandleCountOnWindows(t *testing.T) {
	count, ok := ProcessHandleCount()
	if runtime.GOOS == "windows" {
		if !ok || count <= 0 {
			t.Fatalf("expected positive Windows handle count, got count=%d ok=%v", count, ok)
		}
	} else if ok {
		t.Fatalf("expected unsupported on %s, got ok=true", runtime.GOOS)
	}
}

func TestProcessHandleCountByPIDOnWindows(t *testing.T) {
	count, ok := ProcessHandleCountByPID(os.Getpid())
	if runtime.GOOS == "windows" {
		if !ok || count <= 0 {
			t.Fatalf("expected positive Windows handle count by PID, got count=%d ok=%v", count, ok)
		}
	} else if ok {
		t.Fatalf("expected unsupported on %s, got ok=true", runtime.GOOS)
	}
}

func TestSampleProcessMetricsOnWindows(t *testing.T) {
	m := SampleProcessMetrics(os.Getpid())
	if runtime.GOOS == "windows" {
		if !m.Supported || m.Handles <= 0 || m.WorkingSetMB <= 0 {
			t.Fatalf("unexpected Windows process metrics: %+v", m)
		}
	} else if m.Supported {
		t.Fatalf("expected unsupported metrics on %s", runtime.GOOS)
	}
}

func TestPollerContentAuditDetectsSameSizeSameMtime(t *testing.T) {
	t.Run("audit enabled", func(t *testing.T) { testContentAudit(t, 150*time.Millisecond) })
	t.Run("audit disabled control", func(t *testing.T) { testContentAudit(t, 0) })
}

func testContentAudit(t *testing.T, auditInterval time.Duration) {
	root := t.TempDir()
	skillsDir := filepath.Join(root, "skills-center")
	skillFile := filepath.Join(skillsDir, "audit-skill", "SKILL.md")
	if err := os.MkdirAll(filepath.Dir(skillFile), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(skillFile, []byte("payload-AAAA"), 0644); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(skillFile)
	if err != nil {
		t.Fatal(err)
	}
	origTime := info.ModTime()
	before, err := scanCatalogMetadata(context.Background(), skillsDir, DefaultIgnore)
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	mgr, err := Start(ctx, ModePolling, []Entry{{Path: skillsDir, Reason: "skills"}}, Options{
		// No metadata scan can run during this test; a passing result must come
		// from the content audit, not a race before Chtimes restores the mtime.
		PollInterval:  time.Hour,
		AuditInterval: auditInterval,
		Debounce:      30 * time.Millisecond,
	})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		cancel()
		<-mgr.Done()
	}()

	// Idle audit must not trigger false reloads.
	select {
	case ev := <-mgr.Events():
		t.Fatalf("unexpected idle audit reload: %+v", ev)
	case <-time.After(350 * time.Millisecond):
	}

	// Overwrite with equal byte length and restored original mtime.
	if err := os.WriteFile(skillFile, []byte("payload-BBBB"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(skillFile, origTime, origTime); err != nil {
		t.Fatal(err)
	}
	after, err := scanCatalogMetadata(context.Background(), skillsDir, DefaultIgnore)
	if err != nil || after != before {
		t.Fatalf("edit did not preserve metadata digest: %v", err)
	}
	if auditInterval == 0 {
		select {
		case event := <-mgr.Events():
			t.Fatalf("control unexpectedly emitted: %+v", event)
		case <-time.After(350 * time.Millisecond):
		}
		return
	}

	select {
	case ev := <-mgr.Events():
		if ev.Reason != "skills" {
			t.Fatalf("got reason %q, want skills", ev.Reason)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("content audit missed equal-size equal-mtime edit")
	}
}
