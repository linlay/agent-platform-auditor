package auditor

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"catalog-lock-auditor/internal/monitor"
)

// A check describes the expected state independently of the notification backend.
type stateCheck func(context.Context) error

func filesEqual(want map[string]string, absent ...string) stateCheck {
	return func(ctx context.Context) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		for path, content := range want {
			got, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			if string(got) != content {
				return fmt.Errorf("文件内容不符: %s", path)
			}
		}
		for _, path := range absent {
			_, err := os.Stat(path)
			if !errors.Is(err, os.ErrNotExist) {
				return fmt.Errorf("应已删除 %s，实际错误: %v", path, err)
			}
		}
		return nil
	}
}

func checks(all ...stateCheck) stateCheck {
	return func(ctx context.Context) error {
		for _, check := range all {
			if check != nil {
				if err := check(ctx); err != nil {
					return err
				}
			}
		}
		return nil
	}
}

// getData requires a well-formed successful API envelope. A 200 error envelope,
// invalid JSON or a missing data field must never satisfy an absence assertion.
func (p *platformProcess) getData(ctx context.Context, endpoint string, dst any) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.apiURL+endpoint, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	const limit = 8 << 20
	body, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return err
	}
	if len(body) > limit {
		return fmt.Errorf("%s 响应过大", endpoint)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%s HTTP %d", endpoint, resp.StatusCode)
	}
	var envelope struct {
		Code    *int            `json:"code"`
		Success *bool           `json:"success"`
		Data    json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return fmt.Errorf("%s JSON: %w", endpoint, err)
	}
	if envelope.Success != nil && !*envelope.Success {
		return fmt.Errorf("%s success=false", endpoint)
	}
	if envelope.Code != nil && *envelope.Code != 0 && *envelope.Code != 200 {
		return fmt.Errorf("%s code=%d", endpoint, *envelope.Code)
	}
	if len(envelope.Data) == 0 || string(envelope.Data) == "null" {
		return fmt.Errorf("%s 缺少 data", endpoint)
	}
	if err := json.Unmarshal(envelope.Data, dst); err != nil {
		return fmt.Errorf("%s data: %w", endpoint, err)
	}
	return nil
}

type catalogRow struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Key         string `json:"key"`
	File        string `json:"file"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Version     string `json:"version"`
	Status      string `json:"status"`
	Error       string `json:"error"`
	HasView     bool   `json:"hasView"`
}

func expectRow(rows []catalogRow, field, id, valueField, value string, absent bool) error {
	count := 0
	for _, row := range rows {
		key := row.ID
		switch field {
		case "name":
			key = row.Name
		case "key":
			key = row.Key
		case "file":
			key = row.Category + "/" + row.File
		}
		if key != id {
			continue
		}
		count++
		if absent {
			return fmt.Errorf("API 仍包含已删除对象 %s", id)
		}
		if field != "name" && row.Status != "ready" {
			return fmt.Errorf("%s status=%s: %s", id, row.Status, row.Error)
		}
		actual := row.Description
		if valueField == "version" {
			actual = row.Version
		}
		if valueField != "" && actual != value {
			return fmt.Errorf("%s %s=%q，期望 %q", id, valueField, actual, value)
		}
	}
	if !absent && count != 1 {
		return fmt.Errorf("API 对象 %s 数量=%d，期望 1", id, count)
	}
	return nil
}

// These are management API projections, not evidence that every runtime consumer
// has refreshed its cache. Reload completion is checked separately.
func apiRow(mon activeMonitor, category, id, field, value string, absent bool) stateCheck {
	p := mon.PlatformProcess()
	if p == nil {
		return nil
	} // builtin tests filesystem notifications only
	return func(ctx context.Context) error {
		endpoint := "/api/admin/" + category
		wantedID := id
		key := "id"
		list := category
		if category == "agents" {
			endpoint = "/api/admin/agents/detail?agentKey=bot-a"
			list = "privateSkills"
		}
		if category == "providers" || category == "models" {
			endpoint = "/api/admin/registries"
			list = "items"
			key = "file"
			wantedID = category + "/" + strings.TrimPrefix(id, category+"/")
		}
		if category == "tools" {
			key = "name"
			var rows []catalogRow
			if err := p.getData(ctx, endpoint, &rows); err != nil {
				return err
			}
			return expectRow(rows, key, id, field, value, absent)
		}
		var data map[string]json.RawMessage
		if err := p.getData(ctx, endpoint, &data); err != nil {
			return err
		}
		if category == "agents" {
			var status string
			if err := json.Unmarshal(data["status"], &status); err != nil || status != "ready" {
				return fmt.Errorf("Agent bot-a 未就绪: %q (%v)", status, err)
			}
		}
		raw, ok := data[list]
		if !ok || string(raw) == "null" {
			return fmt.Errorf("%s 缺少 %s 数组", endpoint, list)
		}
		var rows []catalogRow
		if err := json.Unmarshal(raw, &rows); err != nil {
			return err
		}
		if category == "connectors" {
			// The platform omits status on valid connector summaries; invalid
			// summaries explicitly carry status/error and no validated hasView.
			for i := range rows {
				if rows[i].Status == "" && rows[i].Error == "" && rows[i].HasView {
					rows[i].Status = "ready"
				}
			}
		}
		return expectRow(rows, key, wantedID, field, value, absent)
	}
}

func apiScaleSeed(mon activeMonitor, packages int) stateCheck {
	p := mon.PlatformProcess()
	if p == nil {
		return nil
	}
	return func(ctx context.Context) error {
		var skills struct {
			Skills []catalogRow `json:"skills"`
		}
		var connectors struct {
			Connectors []catalogRow `json:"connectors"`
		}
		if err := p.getData(ctx, "/api/admin/skills", &skills); err != nil {
			return err
		}
		if err := p.getData(ctx, "/api/admin/connectors", &connectors); err != nil {
			return err
		}
		for i := range connectors.Connectors {
			row := &connectors.Connectors[i]
			if row.Status == "" && row.Error == "" && row.HasView {
				row.Status = "ready"
			}
		}
		for i := 0; i < packages; i++ {
			id := fmt.Sprintf("pkg-%03d", i)
			var err error
			if i%2 == 0 {
				err = expectRow(skills.Skills, "id", id, "description", "scale-v0", false)
			} else {
				err = expectRow(connectors.Connectors, "id", id, "version", "1.0.0", false)
			}
			if err != nil {
				return err
			}
		}
		return nil
	}
}

func pause(ctx context.Context, delay time.Duration) error {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

// observe counts the whole window, and distinguishes silence from cancellation
// and a dead producer. Only a completed observation window can prove silence.
func observe(ctx context.Context, events <-chan monitor.ReloadEvent, duration time.Duration) (map[string]int, error) {
	counts := make(map[string]int)
	timer := time.NewTimer(duration)
	defer timer.Stop()
	for {
		if err := ctx.Err(); err != nil {
			return counts, err
		}
		select {
		case <-ctx.Done():
			return counts, ctx.Err()
		case <-timer.C:
			return counts, nil
		case event, ok := <-events:
			if !ok {
				return counts, errors.New("重载事件流提前关闭")
			}
			counts[event.Reason]++
		}
	}
}

func quietWindow(cfg RunConfig) time.Duration {
	if cfg.Engine == EnginePlatform {
		return 1200 * time.Millisecond
	}
	return max(150*time.Millisecond, time.Duration(3*cfg.PollIntervalMs+cfg.ReloadDebounceMs)*time.Millisecond)
}

// Await a genuine quiet boundary before each independent mutation, so pending
// events from a previous step cannot make a later, missed mutation pass.
func awaitQuiet(ctx context.Context, events <-chan monitor.ReloadEvent, quiet, limit time.Duration) error {
	ctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()
	for {
		counts, err := observe(ctx, events, quiet)
		if err != nil {
			return err
		}
		if len(counts) == 0 {
			return nil
		}
	}
}

type scenarioCheck struct {
	ctx       context.Context
	mon       activeMonitor
	cfg       RunConfig
	mode      monitor.Mode
	res       *ScenarioResult
	emit      func(string, string, string)
	latencies []int64
}

func (s *scenarioCheck) step(name string, err error, detail string, start time.Time) bool {
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	var code syscall.Errno
	errors.As(err, &code)
	s.res.Steps = append(s.res.Steps, StepLog{Name: name, OK: err == nil, Error: msg, SystemError: uint64(code), Detail: detail, DurationMs: time.Since(start).Milliseconds()})
	return err == nil
}

func (s *scenarioCheck) quiet() error {
	return awaitQuiet(s.ctx, s.mon.Events(), quietWindow(s.cfg), reloadTimeout(s.cfg)+2*quietWindow(s.cfg))
}

// change measures from the mutation's start, not from when the consumer happens
// to read an already queued notification. State is rechecked until the deadline.
func (s *scenarioCheck) change(name, reason string, action func() error, check stateCheck) bool {
	return s.changeAfter(name, reason, func() (time.Time, error) {
		return time.Now(), action()
	}, check)
}

func (s *scenarioCheck) changeAfter(name, reason string, action func() (time.Time, error), check stateCheck) bool {
	start := time.Now()
	if err := s.quiet(); err != nil {
		return s.step(name, err, "变更前等待静默失败", start)
	}
	start = time.Now()
	s.res.Operations++
	after, err := action()
	if err != nil {
		addLockError(s.res, s.emit, s.mode, name, err)
		return s.step(name, err, "文件操作失败", start)
	}
	if after.IsZero() {
		after = start
	}
	err = waitVerified(s.ctx, s.mon.Events(), reason, after, reloadTimeout(s.cfg), check)
	lat := time.Since(start).Milliseconds()
	if err == nil {
		s.latencies = append(s.latencies, lat)
	}
	detail := "已验证本次变更的重载通知与磁盘结果（内置模式）"
	if s.mon.PlatformProcess() != nil {
		detail = "已验证本次重载完成日志、磁盘结果与管理 API 投影"
	}
	if err != nil {
		detail = "本次变更校验未通过"
	}
	return s.step(name, err, fmt.Sprintf("%s；耗时 %dms", detail, lat), start)
}

func waitVerified(ctx context.Context, events <-chan monitor.ReloadEvent, reason string, after time.Time, timeout time.Duration, check stateCheck) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	ticker := time.NewTicker(25 * time.Millisecond)
	defer ticker.Stop()
	seen := false
	var lastErr error
	for {
		if err := ctx.Err(); err != nil {
			return fmt.Errorf("%s 验证未完成（本次重载=%t，状态=%v）: %w", reason, seen, lastErr, err)
		}
		if seen {
			err := check(ctx)
			if ctx.Err() == nil || lastErr == nil {
				lastErr = err
			}
			if err == nil && ctx.Err() == nil {
				return nil
			}
		}
		select {
		case <-ctx.Done():
		case <-ticker.C:
		case event, ok := <-events:
			if !ok {
				return errors.New("重载事件流提前关闭")
			}
			if event.Reason == reason && !event.Timestamp.Before(after) {
				seen = true
			}
		}
	}
}

func (s *scenarioCheck) silent(name string, duration time.Duration, check stateCheck) bool {
	start := time.Now()
	counts, err := observe(s.ctx, s.mon.Events(), duration)
	if err == nil && len(counts) > 0 {
		err = fmt.Errorf("静默期间发生重载: %v", counts)
	}
	if err == nil && check != nil {
		err = check(s.ctx)
	}
	return s.step(name, err, fmt.Sprintf("完整观察 %s；重载次数 %v", duration, counts), start)
}

func (s *scenarioCheck) finish() {
	s.res.ReloadDetected = len(s.latencies) > 0
	if len(s.latencies) > 0 {
		var total int64
		for _, lat := range s.latencies {
			total += lat
		}
		s.res.ReloadLatencyMs = total / int64(len(s.latencies))
	}
}

// Same save sequence used by platform skill upload / connector definition writes.
func replaceFile(path, content string) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(content), 0644); err != nil {
		return err
	}
	defer os.Remove(tmp)
	return os.Rename(tmp, path)
}

func seed(res *ScenarioResult, files map[string]string) bool {
	for path, content := range files {
		if err := writeFileMkdir(path, content); err != nil {
			res.Steps = append(res.Steps, StepLog{Name: "准备测试文件", OK: false, Error: err.Error()})
			return false
		}
	}
	return true
}

func skillCheck(mon activeMonitor, path, name, body string, absent ...string) stateCheck {
	return checks(filesEqual(map[string]string{path: validSkillMarkdown(name, body)}, absent...), apiRow(mon, "skills", filepath.Base(filepath.Dir(path)), "description", body, false))
}

func apiSkillFiles(mon activeMonitor, id, root string, want map[string]string) stateCheck {
	p := mon.PlatformProcess()
	if p == nil {
		return nil
	}
	return func(ctx context.Context) error {
		var data struct {
			FileManifest struct {
				Entries []struct {
					Path   string `json:"path"`
					Kind   string `json:"kind"`
					SHA256 string `json:"sha256"`
				} `json:"entries"`
			} `json:"fileManifest"`
		}
		if err := p.getData(ctx, "/api/admin/skills/detail?id="+url.QueryEscape(id), &data); err != nil {
			return err
		}
		actual := map[string]string{}
		for _, entry := range data.FileManifest.Entries {
			if entry.Kind == "file" {
				actual[entry.Path] = entry.SHA256
			}
		}
		if len(actual) != len(want) {
			return fmt.Errorf("技能文件清单数量=%d，期望 %d", len(actual), len(want))
		}
		for path, content := range want {
			rel, err := filepath.Rel(root, path)
			if err != nil {
				return err
			}
			rel = filepath.ToSlash(rel)
			if actual[rel] != fmt.Sprintf("%x", sha256.Sum256([]byte(content))) {
				return fmt.Errorf("技能文件清单内容不符: %s", rel)
			}
		}
		return nil
	}
}
