package audit

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLegacyDetailsCompareFrozenExpectationsWithoutRewritingHistory(t *testing.T) {
	s := fixture(t)
	set, err := s.Testset("basic")
	if err != nil {
		t.Fatal(err)
	}
	c := set.Cases[0]
	c.Review = &ReviewOptions{Mode: "evaluation", AccessLevel: "ask_for_approval"}
	c.Expect.Policy = &PolicyExpectation{Mode: "evaluation", AccessLevel: "ask_for_approval", Decision: "requires_approval"}
	var report Report
	if err = json.Unmarshal(raw("valid", "echo"), &report); err != nil {
		t.Fatal(err)
	}
	report.Status.Classification = "platform-review"
	report.Policy = &Policy{Mode: "evaluation", AccessLevel: "ask_for_approval", Decision: &PolicyDecision{Value: "allow"}}
	rawReport, _ := json.Marshal(report)
	run := Run{ID: "legacy", State: "completed", Cases: []Case{c}, Results: map[string]Result{c.ID: {State: "done", Check: Check{"mismatch", []string{"old combined verdict"}}}}}
	if err = s.saveRun(run); err != nil {
		t.Fatal(err)
	}
	if err = atomicJSON(filepath.Join(s.Root, "results", "runs", run.ID, "reports", c.ID+".json"), json.RawMessage(rawReport)); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(s.Root, "results", "runs", run.ID, "run.json")
	before, _ := os.ReadFile(file)
	// Current definitions must not replace the historical frozen expectation.
	if err = os.WriteFile(filepath.Join(s.Root, "testsets", "basic", "bash.jsonl"), []byte("{}"), 0600); err != nil {
		t.Fatal(err)
	}
	result, err := s.Result(run.ID, c.ID)
	if err != nil || result.Checks == nil {
		t.Fatal(result, err)
	}
	if result.Checks.Parsing.Verdict != "match" || result.Checks.Approval.Verdict != "mismatch" {
		t.Fatal(result.Checks)
	}
	after, _ := os.ReadFile(file)
	if string(before) != string(after) {
		t.Fatal("reading legacy checks rewrote history")
	}
}

func TestIndependentParsingAndApprovalChecks(t *testing.T) {
	yes := true
	c := Case{Input: Input{Review: &ReviewOptions{Mode: "evaluation", AccessLevel: "ask_for_approval"}}, Expect: Expectation{Syntax: "valid", GradeCeiling: "opaque", ContainsCalls: []string{"echo"}, Policy: &PolicyExpectation{Mode: "evaluation", AccessLevel: "ask_for_approval", Decision: "requires_approval", RequiresHITL: &yes}}}
	var report Report
	if err := json.Unmarshal(raw("valid", "echo"), &report); err != nil {
		t.Fatal(err)
	}
	report.Status.Classification = "platform-review"
	report.Policy = &Policy{Mode: "evaluation", AccessLevel: "ask_for_approval", Decision: &PolicyDecision{Value: "requires_approval", RequiresHITL: true}}
	compare := func() *Checks { b, _ := json.Marshal(report); return CheckReportParts(c, b) }
	checks := compare()
	if checks.Parsing.Verdict != "match" || checks.Approval.Verdict != "match" {
		t.Fatal(checks)
	}
	// A policy regression must not change the parsing verdict.
	report.Policy.Decision = &PolicyDecision{Value: "allow"}
	checks = compare()
	if checks.Parsing.Verdict != "match" || checks.Approval.Verdict != "mismatch" || CombineChecks(checks).Verdict != "mismatch" {
		t.Fatal(checks)
	}
	report.Policy.Decision = &PolicyDecision{Value: "requires_approval", RequiresHITL: true}
	report.Status.Syntax = "invalid"
	checks = compare()
	if checks.Parsing.Verdict != "mismatch" || checks.Approval.Verdict != "match" {
		t.Fatal(checks)
	}
	// A hard block can itself be the correct expected outcome.
	report.Status.Syntax = "valid"
	c.Expect.Policy.Decision, c.Expect.Policy.RequiresHITL = "block", nil
	report.Policy.Decision = &PolicyDecision{Value: "block", Blocked: true}
	if checks = compare(); checks.Approval.Verdict != "match" {
		t.Fatal(checks)
	}
	// Never invent an approval expectation from the actual result.
	c.Expect.Policy = nil
	if checks = compare(); checks.Approval.Verdict != "not-set" || checks.Parsing.Verdict != "match" {
		t.Fatal(checks)
	}
	// Missing policy still fails the requested report contract independently.
	report.Policy = nil
	if checks = compare(); checks.Approval.Verdict != "error" || checks.Parsing.Verdict != "match" {
		t.Fatal(checks)
	}
	c.Review = nil
	report.Status.Classification = "not-run"
	if checks = compare(); checks.Approval.Verdict != "not-set" || CombineChecks(checks).Verdict != "match" {
		t.Fatal(checks)
	}
}

func TestApprovalMatrixSelectsRequestedLevel(t *testing.T) {
	yes, no := true, false
	c := Case{Input: Input{Review: &ReviewOptions{Mode: "evaluation", AccessLevel: "ask_for_approval"}}, Expect: Expectation{Syntax: "valid", GradeCeiling: "opaque", PolicyByLevel: map[string]PolicyExpectation{
		"ask_for_approval": {Mode: "evaluation", AccessLevel: "ask_for_approval", Decision: "requires_approval", RequiresHITL: &yes},
		"auto_approve":     {Mode: "evaluation", AccessLevel: "auto_approve", Decision: "auto_approved", RequiresHITL: &no},
		"full_access":      {Mode: "evaluation", AccessLevel: "full_access", Decision: "allow", RequiresHITL: &no},
	}}}
	r := Report{Consumer: "diagnostic", Status: Status{Syntax: "valid", Grade: "exact", Classification: "platform-review"}}
	for _, level := range []string{"ask_for_approval", "auto_approve", "full_access"} {
		c.Review.AccessLevel = level
		expected := ExpectedPolicy(c)
		if expected == nil || expected.AccessLevel != level {
			t.Fatal(expected)
		}
		r.Policy = &Policy{Mode: "evaluation", AccessLevel: level, Decision: &PolicyDecision{Value: expected.Decision, RequiresHITL: *expected.RequiresHITL}}
		b, _ := json.Marshal(r)
		if checks := CheckReportParts(c, b); checks.Parsing.Verdict != "match" || checks.Approval.Verdict != "match" {
			t.Fatal(level, checks)
		}
	}
	// An incorrect result level must not select its own convenient expectation.
	c.Review.AccessLevel = "ask_for_approval"
	b, _ := json.Marshal(r)
	if checks := CheckReportParts(c, b); checks.Parsing.Verdict != "match" || checks.Approval.Verdict != "mismatch" {
		t.Fatal(checks)
	}
	c.Review = nil
	r.Policy = nil
	r.Status.Classification = "not-run"
	b, _ = json.Marshal(r)
	if checks := CheckReportParts(c, b); checks.Approval.Verdict != "not-evaluated" || CombineChecks(checks).Verdict != "match" {
		t.Fatal(checks)
	}
}

func TestAllCatalogCasesHaveThreeAuthoredApprovalLevels(t *testing.T) {
	s := &Store{Root: filepath.Join("..", "..")}
	for _, id := range []string{"shell-core", "smoke", "policy-smoke"} {
		set, err := s.Testset(id)
		if err != nil {
			t.Fatal(err)
		}
		for _, c := range set.Cases {
			if len(c.Expect.PolicyByLevel) != 3 || c.Expect.PolicyBasis == "" {
				t.Fatal(c.ID, "missing matrix or basis")
			}
		}
	}
}
