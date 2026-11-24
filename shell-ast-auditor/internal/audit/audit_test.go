package audit

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func fixture(t *testing.T) *Store {
	t.Helper()
	s := &Store{Root: t.TempDir()}
	if e := os.MkdirAll(filepath.Join(s.Root, "testsets", "basic"), 0755); e != nil {
		t.Fatal(e)
	}
	c := Case{ID: "one", Input: Input{Command: "echo hi", Dialect: "bash", Profile: "bash-5.2"}, Expect: Expectation{Syntax: "valid", GradeCeiling: "opaque", ContainsCalls: []string{"echo"}}}
	b, _ := json.Marshal(c)
	if e := os.WriteFile(filepath.Join(s.Root, "testsets", "basic", "bash.jsonl"), b, 0644); e != nil {
		t.Fatal(e)
	}
	if e := atomicJSON(filepath.Join(s.Root, "testsets", "basic", "testset.json"), Testset{ID: "basic", SchemaVersion: 1, Version: "1", Files: []string{"bash.jsonl"}}); e != nil {
		t.Fatal(e)
	}
	return s
}
func raw(syntax, word string) json.RawMessage {
	b, _ := json.Marshal(map[string]interface{}{"consumer": "diagnostic", "status": Status{Syntax: syntax, Grade: "exact", Classification: "not-run"}, "execPoints": []interface{}{map[string]interface{}{"words": []interface{}{map[string]interface{}{"value": map[string]string{"text": word}}}}}})
	return b
}
func waitRun(t *testing.T, s *Store, id string) Run {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		r, e := s.Run(id)
		if e != nil {
			t.Fatal(e)
		}
		if r.State != "running" {
			return r
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("run did not finish")
	return Run{}
}
func TestCatalogAndReferences(t *testing.T) {
	s := fixture(t)
	dir := filepath.Join(s.Root, "testsets", "ref")
	if e := atomicJSON(filepath.Join(dir, "testset.json"), Testset{SchemaVersion: 1, ID: "ref", Version: "1", References: []Reference{{TestsetID: "basic", CaseIDs: []string{"one"}}}}); e != nil {
		t.Fatal(e)
	}
	set, e := s.Testset("ref")
	if e != nil || len(set.Cases) != 1 || set.Cases[0].Command != "echo hi" {
		t.Fatalf("%+v %v", set, e)
	}
	if _, e = s.Testset("../basic"); e == nil {
		t.Fatal("path traversal allowed")
	}
	if e = atomicJSON(filepath.Join(dir, "testset.json"), Testset{SchemaVersion: 1, ID: "ref", Version: "1", References: []Reference{{TestsetID: "ref", CaseIDs: []string{"one"}}}}); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Testset("ref"); e == nil {
		t.Fatal("cycle allowed")
	}
}
func TestDuplicateIDsRejected(t *testing.T) {
	s := fixture(t)
	p := filepath.Join(s.Root, "testsets", "basic", "bash.jsonl")
	b, _ := os.ReadFile(p)
	_ = os.WriteFile(p, append(append(b, '\n'), b...), 0644)
	if _, e := s.Testset("basic"); e == nil {
		t.Fatal("duplicate accepted")
	}
}
func TestExpectations(t *testing.T) {
	c := Case{Expect: Expectation{Syntax: "invalid", GradeCeiling: "opaque", ContainsCalls: []string{"echo"}}}
	if c := CheckReport(c, raw("invalid", "echo")); c.Verdict != "match" {
		t.Fatal(c)
	}
	if c := CheckReport(c, raw("invalid", "other")); c.Verdict != "mismatch" {
		t.Fatal(c)
	}
	if c := CheckReport(c, json.RawMessage(`{}`)); c.Verdict != "error" {
		t.Fatal(c)
	}
}
func TestKnownDifferenceDoesNotHideNewFailures(t *testing.T) {
	c := Case{Expect: Expectation{Syntax: "valid", GradeCeiling: "opaque", ContainsCalls: []string{"echo"}}, KnownDifference: &KnownDifference{Syntax: "invalid", Grade: "exact", DiagnosticCodes: []string{}}}
	if x := CheckReport(c, raw("invalid", "echo")); x.Verdict != "known-difference" {
		t.Fatal(x)
	}
	if x := CheckReport(c, raw("invalid", "other")); x.Verdict != "mismatch" {
		t.Fatal(x)
	}
	var r map[string]interface{}
	_ = json.Unmarshal(raw("invalid", "echo"), &r)
	r["diagnostics"] = []interface{}{map[string]string{"code": "new_error"}}
	b, _ := json.Marshal(r)
	if x := CheckReport(c, b); x.Verdict != "mismatch" {
		t.Fatal(x)
	}
}
func TestRunPersistsReportsAndSnapshot(t *testing.T) {
	s := fixture(t)
	runner := &Runner{Store: s, Validate: func(Input) error { return nil }, Parse: func(context.Context, Input) (json.RawMessage, int, error) { return raw("valid", "echo"), 0, nil }}
	start, e := runner.Start("basic", nil)
	if e != nil {
		t.Fatal(e)
	}
	run := waitRun(t, s, start.ID)
	if run.Counts["match"] != 1 {
		t.Fatal(run)
	}
	r, e := s.Result(run.ID, "one")
	if e != nil || len(r.Report) == 0 {
		t.Fatalf("%+v %v", r, e)
	}
	if _, e = s.Comparison("expectations-" + run.ID); e != nil {
		time.Sleep(10 * time.Millisecond)
		if _, e = s.Comparison("expectations-" + run.ID); e != nil {
			t.Fatal(e)
		}
	}
	p := filepath.Join(s.Root, "testsets", "basic", "bash.jsonl")
	b, _ := os.ReadFile(p)
	_ = os.WriteFile(p, []byte(strings.ReplaceAll(string(b), "echo hi", "echo changed")), 0644)
	saved, e := s.Run(run.ID)
	if e != nil || saved.Cases[0].Command != "echo hi" {
		t.Fatal("snapshot changed", e)
	}
	reopened := &Store{Root: s.Root}
	if _, e = reopened.Result(run.ID, "one"); e != nil {
		t.Fatal("restart lost report", e)
	}
}
func TestCancelAndRecovery(t *testing.T) {
	s := fixture(t)
	runner := &Runner{Store: s, Validate: func(Input) error { return nil }, Parse: func(ctx context.Context, _ Input) (json.RawMessage, int, error) {
		<-ctx.Done()
		return nil, 0, ctx.Err()
	}}
	start, e := runner.Start("basic", nil)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = runner.Start("basic", nil); e == nil {
		t.Fatal("concurrent run accepted")
	}
	if e = runner.Cancel(start.ID); e != nil {
		t.Fatal(e)
	}
	run := waitRun(t, s, start.ID)
	if run.State != "cancelled" || run.Counts["not-run"] != 1 {
		t.Fatal(run)
	}
	s.mu.Lock()
	run.State = "running"
	_ = s.saveRun(run)
	s.mu.Unlock()
	other := &Runner{Store: s}
	if e = other.Recover(); e != nil {
		t.Fatal(e)
	}
	saved, _ := s.Run(run.ID)
	if saved.State != "interrupted" {
		t.Fatal(saved)
	}
}
func TestCompareRunsIncludesInputChangeAndMissing(t *testing.T) {
	c := Case{ID: "one", Input: Input{Command: "echo hi"}}
	res := Result{State: "done", Check: Check{Verdict: "match"}}
	a := Run{ID: "a", Cases: []Case{c}, Results: map[string]Result{"one": res}}
	b := a
	b.ID = "b"
	reports := map[string]json.RawMessage{"one": raw("valid", "echo")}
	x := CompareRuns(a, b, reports, reports)
	if x.Counts["unchanged"] != 1 {
		t.Fatal(x)
	}
	x = CompareRuns(a, b, reports, map[string]json.RawMessage{"one": raw("invalid", "echo")})
	if x.Counts["changed"] != 1 || x.Rows[0].ChangedFields[0] != "status" {
		t.Fatal(x)
	}
	b.Cases = []Case{{ID: "one", Input: Input{Command: "other"}}, {ID: "two"}}
	x = CompareRuns(a, b, reports, reports)
	if x.Counts["input-changed"] != 1 || x.Counts["added"] != 1 {
		t.Fatal(x)
	}
	b = a
	b.Results = map[string]Result{}
	x = CompareRuns(a, b, reports, reports)
	if x.Counts["not-comparable"] != 1 {
		t.Fatal(x)
	}
}
func TestBundledTestsets(t *testing.T) {
	s := &Store{Root: "../.."}
	sets, e := s.Testsets()
	if e != nil {
		t.Fatal(e)
	}
	if len(sets) != 14 {
		t.Fatal(len(sets))
	}
	core, e := s.Testset("shell-core")
	if e != nil || len(core.Cases) != 233 {
		t.Fatal(len(core.Cases), e)
	}
	for _, c := range core.Cases {
		if len(c.Source) == 0 {
			t.Fatal("missing provenance", c.ID)
		}
	}
	smoke, e := s.Testset("smoke")
	if e != nil || len(smoke.Cases) != 5 {
		t.Fatal(len(smoke.Cases), e)
	}
}

func TestPolicyModesAndExpectations(t *testing.T) {
	c := Case{Input: Input{Review: &ReviewOptions{Mode: "classification"}}, Expect: Expectation{Syntax: "valid", GradeCeiling: "opaque", Policy: &PolicyExpectation{Mode: "classification"}}}
	r := Report{Consumer: "diagnostic", Status: Status{Syntax: "valid", Grade: "exact", Classification: "platform-review"}, Policy: &Policy{Mode: "classification", Categories: []string{"bash-opaque-command"}}}
	check := func() Check { b, _ := json.Marshal(r); return CheckReport(c, b) }
	if x := check(); x.Verdict != "match" {
		t.Fatal(x)
	}
	r.Policy.Decision = &PolicyDecision{Value: "allow"}
	if x := check(); x.Verdict != "mismatch" {
		t.Fatal("classification invented decision", x)
	}
	c.Review = &ReviewOptions{Mode: "evaluation", AccessLevel: "auto_approve"}
	c.Expect.Policy = &PolicyExpectation{Mode: "evaluation", AccessLevel: "auto_approve", Decision: "auto_approved"}
	r.Policy = &Policy{Mode: "evaluation", AccessLevel: "auto_approve", Decision: &PolicyDecision{Value: "auto_approved"}}
	if x := check(); x.Verdict != "match" {
		t.Fatal(x)
	}
	r.Policy.AccessLevel = "full_access"
	if x := check(); x.Verdict != "mismatch" {
		t.Fatal("wrong access level accepted", x)
	}
	c.Review = nil
	if x := check(); x.Verdict != "error" {
		t.Fatal("policy accepted by syntax-only case", x)
	}
}

func TestManualAndWholeSetRunKinds(t *testing.T) {
	s := fixture(t)
	runner := &Runner{Store: s, Validate: func(Input) error { return nil }, Parse: func(context.Context, Input) (json.RawMessage, int, error) { return raw("valid", "echo"), 0, nil }}
	if _, e := runner.StartWithKind("basic", nil, nil, "manual"); e == nil {
		t.Fatal("manual mode accepted full-set selector")
	}
	start, e := runner.StartWithKind("basic", []string{"one"}, nil, "manual")
	if e != nil {
		t.Fatal(e)
	}
	run := waitRun(t, s, start.ID)
	if run.Kind != "manual" {
		t.Fatal(run.Kind)
	}
}

func TestWholeSetBatchRejectsSubsetButManualAllowsSelection(t *testing.T) {
	s := fixture(t)
	path := filepath.Join(s.Root, "testsets", "basic", "bash.jsonl")
	first, _ := os.ReadFile(path)
	var c Case
	_ = json.Unmarshal(first, &c)
	c.ID = "two"
	second, _ := json.Marshal(c)
	_ = os.WriteFile(path, append(append(first, '\n'), second...), 0644)
	runner := &Runner{Store: s, Validate: func(Input) error { return nil }, Parse: func(context.Context, Input) (json.RawMessage, int, error) { return raw("valid", "echo"), 0, nil }}
	if _, e := runner.StartWithKind("basic", []string{"one"}, nil, "batch"); e == nil {
		t.Fatal("whole-set batch accepted subset")
	}
	start, e := runner.StartWithKind("basic", []string{"one", "two"}, nil, "manual")
	if e != nil {
		t.Fatal(e)
	}
	run := waitRun(t, s, start.ID)
	if run.Kind != "manual" || len(run.Results) != 2 {
		t.Fatal(run.Kind, len(run.Results))
	}
}
