package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"shell-ast-auditor/internal/audit"
	"sort"
	"strings"
	"time"
)

type parserAdapter struct {
	bin                   string
	info                  audit.ParserInfo
	powerShellCoreProfile string
}

func parserArgs(q Request, supportsSyntaxOnly bool) []string {
	args := []string{"--shell", q.Dialect, "--profile", q.Profile, "--format", "json", "--view", "both", "--stdin"}
	if audit.ReviewMode(q) == "syntax-only" {
		if supportsSyntaxOnly {
			args = append(args, "--syntax-only")
		}
		return args
	}
	r := q.Review
	if r.Mode == "evaluation" {
		args = append(args, "--access-level", r.AccessLevel)
	}
	if r.Workspace != "" {
		args = append(args, "--workspace", r.Workspace)
	}
	if r.CWD != "" {
		args = append(args, "--cwd", r.CWD)
	}
	if r.Editing != nil {
		args = append(args, fmt.Sprintf("--editing=%t", *r.Editing))
	}
	return args
}
func (p *parserAdapter) args(q Request) []string {
	// Preserve the fixture profile in the run; only map the diagnostic CLI flag.
	if q.Dialect == "powershell" && q.Profile == "pwsh-7.6" && p.powerShellCoreProfile != "" {
		q.Profile = p.powerShellCoreProfile
	}
	return parserArgs(q, p.info.Mode == "syntax-only")
}

func advertisedPowerShellCoreProfile(help []byte) string {
	if bytes.Contains(help, []byte("pwsh-7.6")) {
		return "pwsh-7.6"
	}
	if bytes.Contains(help, []byte("pwsh-7.4+")) {
		return "pwsh-7.4+"
	}
	return ""
}

func reportContract(raw json.RawMessage, q Request, code int) error {
	if audit.ReviewMode(q) == "syntax-only" {
		return syntaxContract(raw)
	}
	var r audit.Report
	if e := json.Unmarshal(raw, &r); e != nil {
		return e
	}
	if code == 12 && r.Consumer == "diagnostic" && r.Status.Classification == "not-run" && r.Policy == nil {
		return nil
	}
	if r.Consumer != "diagnostic" || r.Status.Classification != "platform-review" || r.Policy == nil || r.Policy.Mode != q.Review.Mode {
		return errors.New("CLI policy mode/report contract mismatch")
	}
	if q.Review.Mode == "classification" && (r.Policy.Decision != nil || r.Policy.AccessLevel != "") {
		return errors.New("classification-only report invented access level or decision")
	}
	if q.Review.Mode == "evaluation" && (r.Policy.Decision == nil || r.Policy.AccessLevel != q.Review.AccessLevel) {
		return errors.New("policy evaluation did not use the requested access level")
	}
	return nil
}

func syntaxContract(raw json.RawMessage) error {
	var r struct {
		Consumer string `json:"consumer"`
		Status   struct {
			Classification string `json:"classification"`
		} `json:"status"`
		Policy json.RawMessage `json:"policy"`
	}
	if json.Unmarshal(raw, &r) != nil || r.Consumer != "diagnostic" || r.Status.Classification != "not-run" || len(r.Policy) > 0 {
		return errors.New("CLI changed parse-only contract: require diagnostic/not-run without policy; rebuild adapter/parser")
	}
	return nil
}
func parserExecutableName(name string) string {
	if runtime.GOOS == "windows" {
		return name + ".exe"
	}
	return name
}

func newParser(bin string) (*parserAdapter, error) {
	b, e := os.ReadFile(bin)
	if e != nil {
		return nil, fmt.Errorf("parser unavailable; run npm run parser:build: %w", e)
	}
	digest := fmt.Sprintf("%x", sha256.Sum256(b))
	// Pin the bytes used for every run. Rebuilding the CLI cannot silently
	// change a running server's parser while leaving the recorded hash unchanged.
	archive := filepath.Join("bin", "parsers", parserExecutableName("shell-ast-"+digest))
	if e = os.MkdirAll(filepath.Dir(archive), 0755); e != nil {
		return nil, e
	}
	existing, e := os.ReadFile(archive)
	if e != nil || fmt.Sprintf("%x", sha256.Sum256(existing)) != digest {
		tmp, e := os.CreateTemp(filepath.Dir(archive), ".parser-*")
		if e != nil {
			return nil, e
		}
		name := tmp.Name()
		defer os.Remove(name)
		if _, e = tmp.Write(b); e != nil {
			tmp.Close()
			return nil, e
		}
		if e = tmp.Chmod(0755); e != nil {
			tmp.Close()
			return nil, e
		}
		if e = tmp.Close(); e != nil {
			return nil, e
		}
		if e = os.Rename(name, archive); e != nil {
			return nil, e
		}
	}
	archive, _ = filepath.Abs(archive)
	p := &parserAdapter{bin: archive, info: audit.ParserInfo{SHA256: digest, Mode: "legacy-syntax"}}
	manifest, e := os.ReadFile(filepath.Join(filepath.Dir(bin), "parser-build.json"))
	if e == nil {
		var info audit.ParserInfo
		if json.Unmarshal(manifest, &info) == nil && info.SHA256 == digest {
			p.info = info
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, archive, "--help")
	help := &capped{limit: 128 << 10}
	cmd.Stdout = help
	cmd.Stderr = help
	if e = cmd.Run(); e != nil {
		return nil, fmt.Errorf("CLI capability discovery failed: %w", e)
	}
	p.powerShellCoreProfile = advertisedPowerShellCoreProfile(help.Bytes())
	if bytes.Contains(help.Bytes(), []byte("-syntax-only")) {
		p.info.Mode = "syntax-only"
		p.info.SupportsPolicy = bytes.Contains(help.Bytes(), []byte("-access-level"))
	} else if bytes.Contains(help.Bytes(), []byte("-access-level")) {
		return nil, errors.New("CLI exposes policy mode without --syntax-only; refusing implicit policy review")
	} else {
		p.info.Mode = "legacy-syntax"
	}
	return p, nil
}
func makeRunner(bin string) *audit.Runner {
	p, e := newParser(bin)
	r := &audit.Runner{Store: &audit.Store{Root: "."}, Validate: validate, Prepare: prepareInput}
	if e != nil {
		r.Parse = func(context.Context, audit.Input) (json.RawMessage, int, error) { return nil, 0, e }
		return r
	}
	r.ParserSHA256 = p.info.SHA256
	r.Parser = &p.info
	r.Parse = p.parse
	return r
}

type Request = audit.Input
type capped struct {
	bytes.Buffer
	limit int
}

func (b *capped) Write(p []byte) (int, error) {
	if len(p) > b.limit-b.Len() {
		return 0, errors.New("parser output budget exceeded")
	}
	return b.Buffer.Write(p)
}

var slots = make(chan struct{}, 2)
var profiles = map[string]string{"bash-3.2": "bash", "bash-5.2": "bash", "sh-dash": "sh", "sh-busybox-ash": "sh", "sh-bash-posix": "sh", "zsh-5.9": "zsh", "windows-powershell-5.1": "powershell", "pwsh-7.6": "powershell", "cmd-command": "cmd", "cmd-batch": "cmd"}

func validate(q Request) error {
	if len(q.ProjectDir) > 4096 || strings.ContainsRune(q.ProjectDir, 0) {
		return errors.New("invalid projectDir")
	}
	if r := q.Review; r != nil {
		switch r.Mode {
		case "syntax-only":
			if r.AccessLevel != "" || r.Workspace != "" || r.CWD != "" || r.Editing != nil {
				return errors.New("syntax-only cannot include policy context")
			}
		case "classification":
			if r.AccessLevel != "" {
				return errors.New("classification must omit accessLevel")
			}
		case "evaluation":
			if r.AccessLevel != "ask_for_approval" && r.AccessLevel != "auto_approve" && r.AccessLevel != "full_access" {
				return errors.New("evaluation requires a supported accessLevel")
			}
		default:
			return errors.New("unsupported review mode")
		}
		if len(r.Workspace) > 4096 || len(r.CWD) > 4096 || strings.ContainsRune(r.Workspace+r.CWD, 0) {
			return errors.New("invalid workspace/cwd")
		}
	}

	if len(q.Command) > 65536 || strings.ContainsRune(q.Command, 0) {
		return errors.New("input must be NUL-free and at most 64 KiB")
	}
	if profiles[q.Profile] != q.Dialect || q.Dialect == "" {
		return errors.New("unsupported dialect/profile combination")
	}
	if len(q.Options) > 20 {
		return errors.New("too many options")
	}
	for k := range q.Options {
		if len(k) > 64 || strings.ContainsAny(k, "=\x00\n") {
			return errors.New("invalid option")
		}
	}
	return nil
}
func (p *parserAdapter) parse(ctx context.Context, q Request) (json.RawMessage, int, error) {
	select {
	case slots <- struct{}{}:
		defer func() { <-slots }()
	case <-ctx.Done():
		return nil, 0, ctx.Err()
	}
	if audit.ReviewMode(q) != "syntax-only" && !p.info.SupportsPolicy {
		return nil, 0, errors.New("configured CLI has no policy support; rebuild from current agent-platform")
	}
	args := p.args(q)
	keys := []string{}
	for k := range q.Options {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		v := "off"
		if q.Options[k] {
			v = "on"
		}
		args = append(args, "--option", k+"="+v)
	}
	cmd := exec.CommandContext(ctx, p.bin, args...)
	cmd.Stdin = strings.NewReader(q.Command)
	out := &capped{limit: 32 << 20}
	errout := &capped{limit: 16 << 10}
	cmd.Stdout = out
	cmd.Stderr = errout
	err := cmd.Run()
	code := 0
	if err != nil {
		var e *exec.ExitError
		if errors.As(err, &e) {
			code = e.ExitCode()
		} else {
			return nil, 0, err
		}
	}
	if ctx.Err() != nil {
		return nil, code, ctx.Err()
	}
	if !json.Valid(out.Bytes()) {
		return nil, code, fmt.Errorf("CLI exit %d: %s %v", code, errout.String(), err)
	}
	if code != 0 && code != 10 && code != 11 && code != 12 {
		return nil, code, fmt.Errorf("CLI exit %d: %s", code, errout.String())
	}
	if err := reportContract(out.Bytes(), q, code); err != nil {
		return nil, code, err
	}
	return out.Bytes(), code, nil
}
