package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"shell-ast-auditor/internal/audit"
	"slices"
	"strings"
	"testing"
)

func TestValidation(t *testing.T) {
	for _, q := range []Request{{Dialect: "bash", Profile: "pwsh-7.6"}, {Command: strings.Repeat("x", 65537), Dialect: "bash", Profile: "bash-5.2"}, {Command: "a\x00", Dialect: "bash", Profile: "bash-5.2"}} {
		if validate(q) == nil {
			t.Fatal("accepted invalid input")
		}
	}
	if validate(Request{Command: "$(touch /tmp/never)", Dialect: "bash", Profile: "bash-5.2"}) != nil {
		t.Fatal("parse-only text rejected")
	}
}
func TestAPIRejectsUnknownFields(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/parse", strings.NewReader(`{"execute":true}`))
	handler("missing").ServeHTTP(w, r)
	if w.Code != 400 {
		t.Fatal(w.Code)
	}
}
func TestOutputCap(t *testing.T) {
	b := &capped{limit: 2}
	if _, e := b.Write([]byte("123")); e == nil || b.Len() != 0 {
		t.Fatal("output not bounded")
	}
}

func TestSyntaxOnlyArgsAndPolicyRejection(t *testing.T) {
	q := Request{Dialect: "bash", Profile: "bash-3.2", Command: "rm -rf build; $(touch sentinel)"}
	latest := parserArgs(q, true)
	legacy := parserArgs(q, false)
	if !slices.Contains(latest, "--syntax-only") || slices.Contains(legacy, "--syntax-only") {
		t.Fatal(latest, legacy)
	}
	for _, args := range [][]string{latest, legacy} {
		if slices.Contains(args, q.Command) {
			t.Fatal("input leaked into command argv")
		}
	}
	if e := syntaxContract(json.RawMessage(`{"consumer":"diagnostic","status":{"classification":"not-run"}}`)); e != nil {
		t.Fatal(e)
	}
	for _, report := range []string{`{"consumer":"diagnostic","status":{"classification":"platform-review"}}`, `{"consumer":"diagnostic","status":{"classification":"not-run"},"policy":{"decision":"allow"}}`} {
		if syntaxContract(json.RawMessage(report)) == nil {
			t.Fatal("policy result accepted as syntax-only", report)
		}
	}
}
func TestDuplicateServerIdentity(t *testing.T) {
	h := healthInfo{App: "shell-ast-auditor", ProjectRoot: "/project", PID: 123, Consumer: "diagnostic"}
	if !sameServer(h, "/project") {
		t.Fatal("own service not identified")
	}
	if sameServer(h, "/another-project") {
		t.Fatal("another checkout was reused")
	}
	h.App = "other-service"
	if sameServer(h, "/project") {
		t.Fatal("unrelated service was reused")
	}
}

func TestPolicyFlagsAreExplicit(t *testing.T) {
	q := Request{Dialect: "bash", Profile: "bash-3.2", Review: &audit.ReviewOptions{Mode: "classification"}}
	args := parserArgs(q, true)
	if slices.Contains(args, "--access-level") || slices.Contains(args, "--syntax-only") {
		t.Fatal(args)
	}
	q.Review = &audit.ReviewOptions{Mode: "evaluation", AccessLevel: "auto_approve", Workspace: "/project space", CWD: "/project space"}
	args = parserArgs(q, true)
	if !slices.Contains(args, "--access-level") || !slices.Contains(args, "auto_approve") || !slices.Contains(args, "/project space") {
		t.Fatal(args)
	}
	for _, review := range []*audit.ReviewOptions{{Mode: "classification", AccessLevel: "auto_approve"}, {Mode: "evaluation"}, {Mode: "syntax-only", AccessLevel: "full_access"}} {
		q.Review = review
		if validate(q) == nil {
			t.Fatal("ambiguous review options accepted", review)
		}
	}
}

func TestPowerShellCoreCLIProfileCompatibility(t *testing.T) {
	for _, tc := range []struct {
		help string
		want string
	}{
		{"Profiles: windows-powershell-5.1/pwsh-7.4+", "pwsh-7.4+"},
		{"Profiles: windows-powershell-5.1/pwsh-7.6", "pwsh-7.6"},
		{"Profiles: windows-powershell-5.1/pwsh-7.4+/pwsh-7.6", "pwsh-7.6"},
		{"Profiles: windows-powershell-5.1", "pwsh-7.6"},
	} {
		p := parserAdapter{powerShellCoreProfile: advertisedPowerShellCoreProfile([]byte(tc.help))}
		q := Request{Dialect: "powershell", Profile: "pwsh-7.6"}
		args := p.args(q)
		if i := slices.Index(args, "--profile"); i == -1 || args[i+1] != tc.want || q.Profile != "pwsh-7.6" {
			t.Fatalf("%s: args=%q, stored profile=%q", tc.help, args, q.Profile)
		}
		q.Profile = "windows-powershell-5.1"
		args = p.args(q)
		if i := slices.Index(args, "--profile"); i == -1 || args[i+1] != q.Profile {
			t.Fatalf("Desktop 5.1 profile changed: %q", args)
		}
	}
}
