package auditor

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"catalog-lock-auditor/internal/monitor"
)

var reloadLogPattern = regexp.MustCompile(`\[reload\]\s+(agents|skills|models|providers|tools|connectors)\s+reloaded\s+in\s+([^\s]+)`)

type readyFilePayload struct {
	PID             int    `json:"pid"`
	APIURL          string `json:"apiUrl"`
	PlatformVersion string `json:"platformVersion"`
}

// platformProcess launches and supervises a real compiled agent-platform binary
// in isolated standalone mode and turns its [reload] logs into ReloadEvents.
type platformProcess struct {
	mode       monitor.Mode
	binaryPath string
	cmd        *exec.Cmd
	pid        int
	apiURL     string
	version    string
	events     chan monitor.ReloadEvent
	cfgRoot    string
	emit       func(level, source, msg string)

	scanDone chan struct{}
	waitDone chan struct{}

	mu          sync.Mutex
	stopped     bool
	waitErr     error
	watchedDirs int
	reloads     int
	logs        []string
}

func startPlatformProcess(
	ctx context.Context,
	binaryPath string,
	dirs workspaceDirs,
	mode monitor.Mode,
	emit func(level, source, msg string),
) (*platformProcess, error) {
	cfgRoot, err := os.MkdirTemp("", "ap-proc-cfg-*")
	if err != nil {
		return nil, err
	}
	cfgDir := filepath.Join(cfgRoot, "config")
	configsDir := filepath.Join(cfgDir, "configs")
	if err := os.MkdirAll(configsDir, 0755); err != nil {
		_ = os.RemoveAll(cfgRoot)
		return nil, err
	}
	if err := os.WriteFile(filepath.Join(configsDir, "runtime.yml"), []byte("auth:\n  enabled: false\n"), 0644); err != nil {
		_ = os.RemoveAll(cfgRoot)
		return nil, err
	}
	readyPath := filepath.Join(cfgRoot, "ready.json")

	// Start agent-platform on loopback ephemeral port with isolated runtime & config roots.
	cmd := exec.Command(
		binaryPath,
		"--config-dir", cfgDir,
		"--listen", "127.0.0.1:0",
		"--ready-file", readyPath,
		"--parent-pid", fmt.Sprintf("%d", os.Getpid()),
	)
	cmd.Dir = dirs.root
	cmd.Env = filteredPlatformEnv(dirs.root)

	pr, pw, err := os.Pipe()
	if err != nil {
		_ = os.RemoveAll(cfgRoot)
		return nil, err
	}
	cmd.Stdout = pw
	cmd.Stderr = pw

	if err := cmd.Start(); err != nil {
		_ = pr.Close()
		_ = pw.Close()
		_ = os.RemoveAll(cfgRoot)
		return nil, fmt.Errorf("启动真实 agent-platform 失败 (%s): %w", binaryPath, err)
	}
	_ = pw.Close()

	p := &platformProcess{
		mode:       mode,
		binaryPath: binaryPath,
		cmd:        cmd,
		pid:        cmd.Process.Pid,
		events:     make(chan monitor.ReloadEvent, 128),
		cfgRoot:    cfgRoot,
		emit:       emit,
		scanDone:   make(chan struct{}),
		waitDone:   make(chan struct{}),
	}

	go p.readOutput(pr)
	go func() {
		err := cmd.Wait()
		p.mu.Lock()
		p.waitErr = err
		p.mu.Unlock()
		close(p.waitDone)
	}()

	ready, err := p.waitReady(ctx, readyPath, 20*time.Second)
	if err != nil {
		_ = p.Stop()
		return nil, err
	}
	p.apiURL = ready.APIURL
	p.version = ready.PlatformVersion
	if ready.PID > 0 {
		p.pid = ready.PID
	}

	if err := p.checkHealth(ctx); err != nil {
		_ = p.Stop()
		return nil, err
	}

	return p, nil
}

func filteredPlatformEnv(runtimeDir string) []string {
	var env []string
	for _, kv := range os.Environ() {
		idx := strings.IndexByte(kv, '=')
		if idx <= 0 {
			continue
		}
		key := strings.ToUpper(kv[:idx])
		if strings.HasPrefix(key, "AP_RUNTIME_") || key == "AP_CONFIG_DIR" || key == "SERVER_PORT" {
			continue
		}
		env = append(env, kv)
	}
	env = append(env, "AP_RUNTIME_DIR="+runtimeDir)
	return env
}

func (p *platformProcess) readOutput(r io.ReadCloser) {
	defer func() {
		_ = r.Close()
		close(p.scanDone)
	}()
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		p.mu.Lock()
		p.logs = append(p.logs, line)
		if len(p.logs) > 60 {
			p.logs = p.logs[len(p.logs)-60:]
		}
		if strings.Contains(line, "[reload:") && strings.Contains(line, "watching:") {
			p.watchedDirs++
		}
		p.mu.Unlock()

		if m := reloadLogPattern.FindStringSubmatch(line); len(m) >= 2 {
			p.mu.Lock()
			p.reloads++
			p.mu.Unlock()
			if p.emit != nil {
				p.emit("reload", string(p.mode), line)
			}
			select {
			case p.events <- monitor.ReloadEvent{
				Reason:    m[1],
				Timestamp: time.Now(),
				Source:    p.mode,
			}:
			default:
			}
		} else if p.emit != nil {
			lower := strings.ToLower(line)
			switch {
			case strings.Contains(lower, "startup failed") || strings.Contains(lower, "fatal"):
				p.emit("error", string(p.mode), line)
			case strings.Contains(lower, "warning"):
				p.emit("warn", string(p.mode), line)
			case strings.Contains(line, "server ready:") || strings.Contains(line, "background file watchers started") || strings.Contains(line, "watching:"):
				p.emit("ok", string(p.mode), line)
			default:
				p.emit("platform", string(p.mode), line)
			}
		}
	}
}

// RecentLogs returns up to the latest 60 lines emitted by the child agent-platform process.
func (p *platformProcess) RecentLogs() []string {
	p.mu.Lock()
	defer p.mu.Unlock()
	out := make([]string, len(p.logs))
	copy(out, p.logs)
	return out
}

func (p *platformProcess) waitReady(ctx context.Context, readyPath string, timeout time.Duration) (readyFilePayload, error) {
	deadline := time.NewTimer(timeout)
	defer deadline.Stop()
	ticker := time.NewTicker(80 * time.Millisecond)
	defer ticker.Stop()

	for {
		if raw, err := os.ReadFile(readyPath); err == nil {
			var payload readyFilePayload
			if jsonErr := json.Unmarshal(raw, &payload); jsonErr == nil && payload.APIURL != "" {
				return payload, nil
			}
		}
		select {
		case <-ctx.Done():
			return readyFilePayload{}, ctx.Err()
		case <-p.waitDone:
			p.mu.Lock()
			werr := p.waitErr
			tail := strings.Join(p.logs, "\n")
			p.mu.Unlock()
			return readyFilePayload{}, fmt.Errorf("agent-platform 提前退出 (%v)\n%s", werr, tail)
		case <-deadline.C:
			p.mu.Lock()
			tail := strings.Join(p.logs, "\n")
			p.mu.Unlock()
			return readyFilePayload{}, fmt.Errorf("等待 agent-platform ready.json 超时 (%s)\n%s", timeout, tail)
		case <-ticker.C:
		}
	}
}

func (p *platformProcess) checkHealth(ctx context.Context) error {
	reqCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, p.apiURL+"/healthz", nil)
	if err != nil {
		return err
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("healthz 探活失败: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("healthz 返回状态 %s", resp.Status)
	}
	return nil
}

func (p *platformProcess) Events() <-chan monitor.ReloadEvent {
	return p.events
}

func (p *platformProcess) Stats() monitor.Stats {
	p.mu.Lock()
	defer p.mu.Unlock()
	watched := p.watchedDirs
	if p.mode == monitor.ModePolling {
		watched = 0
	}
	return monitor.Stats{
		Mode:        p.mode,
		WatchedDirs: watched,
		Scans:       p.reloads,
	}
}

func (p *platformProcess) HandleCount() (int, bool) {
	return monitor.ProcessHandleCountByPID(p.pid)
}

func (p *platformProcess) Metrics() monitor.ProcessMetrics {
	return monitor.SampleProcessMetrics(p.pid)
}

func (p *platformProcess) Stop() error {
	p.mu.Lock()
	if p.stopped {
		p.mu.Unlock()
		return nil
	}
	p.stopped = true
	p.mu.Unlock()

	if p.cmd != nil && p.cmd.Process != nil {
		err := p.cmd.Process.Kill()
		if err != nil && !errors.Is(err, os.ErrProcessDone) {
			_ = err
		}
	}
	<-p.waitDone
	<-p.scanDone
	close(p.events)
	if p.cfgRoot != "" {
		_ = os.RemoveAll(p.cfgRoot)
	}
	return nil
}
