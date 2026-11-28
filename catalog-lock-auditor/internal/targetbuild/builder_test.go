package targetbuild

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"catalog-lock-auditor/internal/monitor"
)

func TestManagerStatusAndManifest(t *testing.T) {
	dir := t.TempDir()
	mgr := NewManager(dir)

	st := mgr.Status()
	if st.Ready {
		t.Fatal("expected Ready=false before binaries exist")
	}
	if st.DefaultWatcherRef != DefaultWatcherRef || st.DefaultPollingRef != DefaultPollingRef {
		t.Fatalf("unexpected defaults: %+v", st)
	}
	if _, err := mgr.BinaryPath(monitor.ModePolling); err == nil {
		t.Fatal("expected BinaryPath to fail when unbuilt")
	}

	if err := os.MkdirAll(mgr.cacheDir(), 0755); err != nil {
		t.Fatal(err)
	}
	wPath := filepath.Join(mgr.cacheDir(), cachedBinaryFilename("11111111"))
	pPath := filepath.Join(mgr.cacheDir(), cachedBinaryFilename("22222222"))
	if err := os.WriteFile(wPath, []byte("w"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(pPath, []byte("p"), 0755); err != nil {
		t.Fatal(err)
	}
	manifest := TargetManifest{
		SourceDir: filepath.Join(dir, "agent-platform"),
		GoVersion: "go test",
		BuiltAt:   time.Now(),
		Watcher:   TargetBinaryInfo{Role: monitor.ModeWatcher, Ref: DefaultWatcherRef, Commit: "11111111", BinaryPath: wPath, Exists: true},
		Polling:   TargetBinaryInfo{Role: monitor.ModePolling, Ref: DefaultPollingRef, Commit: "22222222", BinaryPath: pPath, Exists: true},
	}
	if err := mgr.writeManifest(manifest); err != nil {
		t.Fatal(err)
	}

	st = mgr.Status()
	if !st.Ready || st.Manifest == nil || !st.Manifest.Watcher.Exists || !st.Manifest.Polling.Exists {
		t.Fatalf("expected Ready=true after manifest & binaries written: %+v", st)
	}
	if len(st.CachedCommits) != 2 {
		t.Fatalf("expected 2 cached commits, got %v", st.CachedCommits)
	}
	gotPath, err := mgr.BinaryPath(monitor.ModeWatcher)
	if err != nil || gotPath != wPath {
		t.Fatalf("BinaryPath got=%q err=%v", gotPath, err)
	}
}

func TestManagerRejectsMissingSourceDir(t *testing.T) {
	mgr := NewManager(t.TempDir())
	_, err := mgr.Build(context.Background(), BuildRequest{SourceDir: filepath.Join(t.TempDir(), "does-not-exist")})
	if err == nil {
		t.Fatal("expected missing source dir error")
	}
}

func TestManagerCacheHitSkipsRebuild(t *testing.T) {
	repoDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(repoDir, "go.mod"), []byte("module dummy\n\ngo 1.25.0\n"), 0644); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{
		{"init"},
		{"config", "user.email", "test@example.com"},
		{"config", "user.name", "Tester"},
		{"add", "go.mod"},
		{"commit", "-m", "init"},
	} {
		cmd := exec.Command("git", append([]string{"-C", repoDir}, args...)...)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v (%s)", args, err, string(out))
		}
	}
	commitBytes, err := exec.Command("git", "-C", repoDir, "rev-parse", "HEAD").Output()
	if err != nil {
		t.Fatal(err)
	}
	commit := strings.TrimSpace(string(commitBytes))

	mgr := NewManager(t.TempDir())
	if err := os.MkdirAll(mgr.cacheDir(), 0755); err != nil {
		t.Fatal(err)
	}
	cacheFile := filepath.Join(mgr.cacheDir(), cachedBinaryFilename(commit))
	if err := os.WriteFile(cacheFile, []byte("precompiled"), 0755); err != nil {
		t.Fatal(err)
	}

	var logs []string
	mgr.SetLogger(func(_, _, msg string) { logs = append(logs, msg) })

	manifest, err := mgr.EnsureBuilt(context.Background(), BuildRequest{
		SourceDir:  repoDir,
		WatcherRef: "HEAD",
		PollingRef: commit,
	})
	if err != nil {
		t.Fatalf("EnsureBuilt cache hit failed: %v", err)
	}
	if !manifest.Watcher.CacheHit || !manifest.Polling.CacheHit {
		t.Fatalf("expected CacheHit=true for both, got watcher=%+v polling=%+v", manifest.Watcher, manifest.Polling)
	}
	if len(logs) < 2 {
		t.Fatalf("expected cache-hit logs, got %v", logs)
	}
}

func TestParseForEachRefOutput(t *testing.T) {
	raw := "" +
		"refs/remotes/origin/HEAD\tabc1234\tsymref\n" +
		"refs/tags/v0.5.71\t5f2b4ec2\tRelease 0.5.71\n" +
		"refs/remotes/origin/codex/windows-catalog-polling\tf83e7d60\tfeat(reload): adaptive polling\n" +
		"refs/heads/main\t5f2b4ec2\tMain branch\n"
	refs := parseForEachRefOutput(raw)
	if len(refs) != 3 {
		t.Fatalf("got %d refs, want 3 (skip HEAD): %+v", len(refs), refs)
	}
	if refs[0].Kind != "branch" || refs[0].Name != "main" {
		t.Fatalf("expected branch first, got %+v", refs[0])
	}
	if refs[1].Kind != "remote" || refs[1].Name != "origin/codex/windows-catalog-polling" {
		t.Fatalf("expected remote second, got %+v", refs[1])
	}
	if refs[2].Kind != "tag" || refs[2].Name != "v0.5.71" {
		t.Fatalf("expected tag third, got %+v", refs[2])
	}
}
