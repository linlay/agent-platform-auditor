package targetbuild

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"catalog-lock-auditor/internal/monitor"
)

const (
	DefaultWatcherRef = "main"
	DefaultPollingRef = "origin/codex/windows-catalog-polling"
)

// TargetBinaryInfo describes one built agent-platform executable stored under bin/targets/cache/.
type TargetBinaryInfo struct {
	Role       monitor.Mode `json:"role"`
	Ref        string       `json:"ref"`
	Commit     string       `json:"commit"`
	BinaryPath string       `json:"binaryPath"`
	SHA256     string       `json:"sha256"`
	BuiltAt    time.Time    `json:"builtAt"`
	Exists     bool         `json:"exists"`
	CacheHit   bool         `json:"cacheHit,omitempty"`
}

// TargetManifest records the active Watcher and Polling target binaries.
type TargetManifest struct {
	SourceDir string           `json:"sourceDir"`
	GoVersion string           `json:"goVersion"`
	BuiltAt   time.Time        `json:"builtAt"`
	Watcher   TargetBinaryInfo `json:"watcher"`
	Polling   TargetBinaryInfo `json:"polling"`
}

// BuildRequest configures a read-only build from an adjacent agent-platform git repository.
type BuildRequest struct {
	SourceDir  string `json:"sourceDir,omitempty"`
	WatcherRef string `json:"watcherRef,omitempty"`
	PollingRef string `json:"pollingRef,omitempty"`
}

// Status summarizes target availability, commit cache state, and build status for the UI/API.
type Status struct {
	Ready             bool            `json:"ready"`
	Building          bool            `json:"building"`
	LastError         string          `json:"lastError,omitempty"`
	DefaultSourceDir  string          `json:"defaultSourceDir"`
	DefaultWatcherRef string          `json:"defaultWatcherRef"`
	DefaultPollingRef string          `json:"defaultPollingRef"`
	CachedCommits     []string        `json:"cachedCommits"`
	Manifest          *TargetManifest `json:"manifest,omitempty"`
}

// Manager builds, caches by commit SHA, and tracks isolated real agent-platform target binaries.
type Manager struct {
	projectDir string
	mu         sync.Mutex
	building   bool
	lastError  string
	logFn      func(level, source, msg string)
}

// NewManager creates a targetbuild.Manager rooted at projectDir.
func NewManager(projectDir string) *Manager {
	return &Manager{projectDir: projectDir}
}

// SetLogger registers an optional live log callback.
func (m *Manager) SetLogger(fn func(level, source, msg string)) {
	m.mu.Lock()
	m.logFn = fn
	m.mu.Unlock()
}

func (m *Manager) log(level, msg string) {
	m.mu.Lock()
	fn := m.logFn
	m.mu.Unlock()
	if fn != nil {
		fn(level, "build", msg)
	}
}

func (m *Manager) targetsDir() string {
	return filepath.Join(m.projectDir, "bin", "targets")
}

func (m *Manager) cacheDir() string {
	return filepath.Join(m.targetsDir(), "cache")
}

func (m *Manager) manifestPath() string {
	return filepath.Join(m.targetsDir(), "manifest.json")
}

func binaryFilename(role monitor.Mode) string {
	name := "agent-platform-" + string(role)
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return name
}

func cachedBinaryFilename(commit string) string {
	name := "agent-platform-" + commit
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return name
}

func (m *Manager) listCachedCommits() []string {
	entries, err := os.ReadDir(m.cacheDir())
	if err != nil {
		return []string{}
	}
	suffix := ""
	if runtime.GOOS == "windows" {
		suffix = ".exe"
	}
	var commits []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasPrefix(name, "agent-platform-") {
			continue
		}
		if suffix != "" && !strings.HasSuffix(name, suffix) {
			continue
		}
		commit := strings.TrimPrefix(name, "agent-platform-")
		if suffix != "" {
			commit = strings.TrimSuffix(commit, suffix)
		}
		if len(commit) >= 7 {
			commits = append(commits, commit)
		}
	}
	sort.Strings(commits)
	return commits
}

// DefaultSourceDir resolves PLATFORM_SOURCE or probes adjacent ../agent-platform paths.
func (m *Manager) DefaultSourceDir() string {
	if env := strings.TrimSpace(os.Getenv("PLATFORM_SOURCE")); env != "" {
		return filepath.Clean(env)
	}
	for _, rel := range []string{
		filepath.Join("..", "..", "agent-platform"),
		filepath.Join("..", "agent-platform"),
	} {
		candidate := filepath.Clean(filepath.Join(m.projectDir, rel))
		if info, err := os.Stat(filepath.Join(candidate, "go.mod")); err == nil && !info.IsDir() {
			return candidate
		}
	}
	return filepath.Clean(filepath.Join(m.projectDir, "..", "..", "agent-platform"))
}

// Status inspects manifest.json, lists commit cache, and verifies executables exist on disk.
func (m *Manager) Status() Status {
	m.mu.Lock()
	building := m.building
	lastErr := m.lastError
	m.mu.Unlock()

	st := Status{
		Building:          building,
		LastError:         lastErr,
		DefaultSourceDir:  m.DefaultSourceDir(),
		DefaultWatcherRef: DefaultWatcherRef,
		DefaultPollingRef: DefaultPollingRef,
		CachedCommits:     m.listCachedCommits(),
	}

	manifest, err := m.readManifest()
	if err != nil {
		return st
	}
	manifest.Watcher.Exists = fileExists(manifest.Watcher.BinaryPath)
	manifest.Polling.Exists = fileExists(manifest.Polling.BinaryPath)
	st.Manifest = &manifest
	st.Ready = manifest.Watcher.Exists && manifest.Polling.Exists
	return st
}

// BinaryPath returns the verified target binary path for role, or a clear error if unbuilt.
func (m *Manager) BinaryPath(role monitor.Mode) (string, error) {
	if m == nil {
		return "", errors.New("target build manager is not configured")
	}
	if role != monitor.ModeWatcher && role != monitor.ModePolling {
		return "", fmt.Errorf("unsupported role %q", role)
	}
	manifest, err := m.readManifest()
	if err != nil {
		path := filepath.Join(m.targetsDir(), binaryFilename(role))
		if fileExists(path) {
			return path, nil
		}
		return "", fmt.Errorf("尚未构建真实 Platform 二进制 (%s)，请先在界面点击“构建对比版本”或运行 npm run target:build", role)
	}
	var info TargetBinaryInfo
	if role == monitor.ModeWatcher {
		info = manifest.Watcher
	} else {
		info = manifest.Polling
	}
	if !fileExists(info.BinaryPath) {
		return "", fmt.Errorf("未找到 %s 二进制: %s，请重新构建", role, info.BinaryPath)
	}
	return info.BinaryPath, nil
}

// EnsureBuilt resolves refs and prepares both target binaries, reusing cached commits in milliseconds.
func (m *Manager) EnsureBuilt(ctx context.Context, req BuildRequest) (TargetManifest, error) {
	return m.Build(ctx, req)
}

// Build checks out read-only detached worktrees (on cache miss) for WatcherRef and PollingRef from sourceDir,
// compiles ./cmd/agent-platform with CGO_ENABLED=0, caches by commit SHA, and updates bin/targets/manifest.json.
func (m *Manager) Build(ctx context.Context, req BuildRequest) (TargetManifest, error) {
	m.mu.Lock()
	if m.building {
		m.mu.Unlock()
		return TargetManifest{}, errors.New("目标二进制正在构建中，请稍候")
	}
	m.building = true
	m.lastError = ""
	m.mu.Unlock()

	defer func() {
		m.mu.Lock()
		m.building = false
		m.mu.Unlock()
	}()

	sourceDir := strings.TrimSpace(req.SourceDir)
	if sourceDir == "" {
		sourceDir = m.DefaultSourceDir()
	}
	sourceDir = filepath.Clean(sourceDir)
	if !fileExists(filepath.Join(sourceDir, "go.mod")) {
		err := fmt.Errorf("未找到有效的 agent-platform 源码目录: %s", sourceDir)
		m.setError(err)
		m.log("error", err.Error())
		return TargetManifest{}, err
	}

	watcherRef := strings.TrimSpace(req.WatcherRef)
	if watcherRef == "" {
		watcherRef = DefaultWatcherRef
	}
	pollingRef := strings.TrimSpace(req.PollingRef)
	if pollingRef == "" {
		pollingRef = DefaultPollingRef
	}

	if err := os.MkdirAll(m.cacheDir(), 0755); err != nil {
		m.setError(err)
		return TargetManifest{}, err
	}

	wInfo, err := m.buildOne(ctx, sourceDir, monitor.ModeWatcher, watcherRef)
	if err != nil {
		m.setError(err)
		m.log("error", err.Error())
		return TargetManifest{}, err
	}
	pInfo, err := m.buildOne(ctx, sourceDir, monitor.ModePolling, pollingRef)
	if err != nil {
		m.setError(err)
		m.log("error", err.Error())
		return TargetManifest{}, err
	}

	goVerBytes, _ := exec.CommandContext(ctx, "go", "version").Output()
	manifest := TargetManifest{
		SourceDir: sourceDir,
		GoVersion: strings.TrimSpace(string(goVerBytes)),
		BuiltAt:   time.Now(),
		Watcher:   wInfo,
		Polling:   pInfo,
	}
	if err := m.writeManifest(manifest); err != nil {
		m.setError(err)
		return TargetManifest{}, err
	}
	return manifest, nil
}

func (m *Manager) setError(err error) {
	m.mu.Lock()
	if err != nil {
		m.lastError = err.Error()
	}
	m.mu.Unlock()
}

func (m *Manager) buildOne(ctx context.Context, sourceDir string, role monitor.Mode, ref string) (TargetBinaryInfo, error) {
	commitBytes, err := runCmdOutput(ctx, "", "git", "-C", sourceDir, "rev-parse", "--verify", ref+"^{commit}")
	if err != nil {
		return TargetBinaryInfo{}, fmt.Errorf("解析 Git 引用 %q 失败: %w", ref, err)
	}
	commit := strings.TrimSpace(string(commitBytes))
	short := commit
	if len(short) > 8 {
		short = short[:8]
	}

	cachePath := filepath.Join(m.cacheDir(), cachedBinaryFilename(commit))
	if info, statErr := os.Stat(cachePath); statErr == nil && !info.IsDir() {
		digest, err := fileSHA256(cachePath)
		if err == nil {
			m.log("info", fmt.Sprintf("命中本地缓存 [%s] %s (%s)，跳过重复编译", role, ref, short))
			return TargetBinaryInfo{
				Role:       role,
				Ref:        ref,
				Commit:     commit,
				BinaryPath: cachePath,
				SHA256:     digest,
				BuiltAt:    info.ModTime(),
				Exists:     true,
				CacheHit:   true,
			}, nil
		}
	}

	started := time.Now()
	m.log("info", fmt.Sprintf("开始从只读 worktree 编译 [%s] %s (%s)...", role, ref, short))

	wtBase, err := os.MkdirTemp("", "ap-target-wt-*")
	if err != nil {
		return TargetBinaryInfo{}, err
	}
	wtDir := filepath.Join(wtBase, "src")
	defer func() {
		_, _ = runCmdOutput(context.Background(), "", "git", "-C", sourceDir, "worktree", "remove", "--force", wtDir)
		_, _ = runCmdOutput(context.Background(), "", "git", "-C", sourceDir, "worktree", "prune")
		_ = os.RemoveAll(wtBase)
	}()

	if _, err := runCmdOutput(ctx, "", "git", "-C", sourceDir, "worktree", "add", "--detach", wtDir, commit); err != nil {
		return TargetBinaryInfo{}, fmt.Errorf("创建只读临时 worktree (%s) 失败: %w", commit, err)
	}

	tmpPattern := fmt.Sprintf(".build-%s-*.tmp", role)
	if runtime.GOOS == "windows" {
		tmpPattern = fmt.Sprintf(".build-%s-*.exe", role)
	}
	tmpFile, err := os.CreateTemp(m.cacheDir(), tmpPattern)
	if err != nil {
		return TargetBinaryInfo{}, err
	}
	tmpPath := tmpFile.Name()
	_ = tmpFile.Close()
	defer os.Remove(tmpPath)

	cmd := exec.CommandContext(ctx, "go", "build", "-o", tmpPath, "./cmd/agent-platform")
	cmd.Dir = wtDir
	cmd.Env = append(os.Environ(), "CGO_ENABLED=0", "GOWORK=off")
	if out, buildErr := cmd.CombinedOutput(); buildErr != nil {
		return TargetBinaryInfo{}, fmt.Errorf("编译 %s (%s) 失败: %v\n%s", role, commit, buildErr, strings.TrimSpace(string(out)))
	}

	digest, err := fileSHA256(tmpPath)
	if err != nil {
		return TargetBinaryInfo{}, err
	}
	if err := os.Rename(tmpPath, cachePath); err != nil {
		return TargetBinaryInfo{}, err
	}

	m.log("ok", fmt.Sprintf("编译完成 [%s] %s (%s)，耗时 %s", role, ref, short, time.Since(started).Round(time.Millisecond)))

	return TargetBinaryInfo{
		Role:       role,
		Ref:        ref,
		Commit:     commit,
		BinaryPath: cachePath,
		SHA256:     digest,
		BuiltAt:    time.Now(),
		Exists:     true,
		CacheHit:   false,
	}, nil
}

func (m *Manager) readManifest() (TargetManifest, error) {
	var out TargetManifest
	raw, err := os.ReadFile(m.manifestPath())
	if err != nil {
		return out, err
	}
	err = json.Unmarshal(raw, &out)
	return out, err
}

func (m *Manager) writeManifest(manifest TargetManifest) error {
	raw, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(m.targetsDir(), ".manifest-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.Write(append(raw, '\n')); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, m.manifestPath())
}

func runCmdOutput(ctx context.Context, dir, name string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	if dir != "" {
		cmd.Dir = dir
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return out, fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return out, nil
}

func fileSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func fileExists(path string) bool {
	if strings.TrimSpace(path) == "" {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// RefOption describes one selectable Git branch, remote branch, or tag in the target repo.
type RefOption struct {
	Name    string `json:"name"`
	Kind    string `json:"kind"` // branch | remote | tag
	Commit  string `json:"commit"`
	Subject string `json:"subject"`
}

// RefsResponse returns available Git references from a read-only target repository.
type RefsResponse struct {
	SourceDir string      `json:"sourceDir"`
	Refs      []RefOption `json:"refs"`
	Warning   string      `json:"warning,omitempty"`
}

// ListRefs queries local branches, remote branches, and tags from sourceDir (read-only).
func (m *Manager) ListRefs(ctx context.Context, sourceDir string) RefsResponse {
	resolved := strings.TrimSpace(sourceDir)
	if resolved == "" {
		resolved = m.DefaultSourceDir()
	}
	resolved = filepath.Clean(resolved)

	if !fileExists(filepath.Join(resolved, "go.mod")) {
		return RefsResponse{
			SourceDir: resolved,
			Refs:      []RefOption{},
			Warning:   fmt.Sprintf("未找到有效的 agent-platform 仓库: %s", resolved),
		}
	}

	out, err := runCmdOutput(
		ctx,
		"",
		"git",
		"-C",
		resolved,
		"for-each-ref",
		"--sort=-committerdate",
		"--format=%(refname)%09%(objectname:short)%09%(subject)",
		"refs/heads",
		"refs/remotes",
		"refs/tags",
	)
	if err != nil {
		return RefsResponse{
			SourceDir: resolved,
			Refs:      []RefOption{},
			Warning:   fmt.Sprintf("读取 Git 分支失败: %v", err),
		}
	}
	return RefsResponse{
		SourceDir: resolved,
		Refs:      parseForEachRefOutput(string(out)),
	}
}

func parseForEachRefOutput(raw string) []RefOption {
	var branches, remotes, tags []RefOption
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimRight(line, "\r")
		if strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) < 2 {
			continue
		}
		fullRef := strings.TrimSpace(parts[0])
		commit := strings.TrimSpace(parts[1])
		subject := ""
		if len(parts) >= 3 {
			subject = strings.TrimSpace(parts[2])
		}

		switch {
		case strings.HasPrefix(fullRef, "refs/heads/"):
			name := strings.TrimPrefix(fullRef, "refs/heads/")
			branches = append(branches, RefOption{Name: name, Kind: "branch", Commit: commit, Subject: subject})
		case strings.HasPrefix(fullRef, "refs/remotes/"):
			name := strings.TrimPrefix(fullRef, "refs/remotes/")
			if strings.HasSuffix(name, "/HEAD") {
				continue
			}
			remotes = append(remotes, RefOption{Name: name, Kind: "remote", Commit: commit, Subject: subject})
		case strings.HasPrefix(fullRef, "refs/tags/"):
			name := strings.TrimPrefix(fullRef, "refs/tags/")
			tags = append(tags, RefOption{Name: name, Kind: "tag", Commit: commit, Subject: subject})
		}
	}

	out := make([]RefOption, 0, len(branches)+len(remotes)+len(tags))
	out = append(out, branches...)
	out = append(out, remotes...)
	out = append(out, tags...)
	if len(out) > 80 {
		out = out[:80]
	}
	return out
}
