package audit

import (
	"encoding/json"
	"reflect"
	"sort"
)

var grades = map[string]int{"exact": 0, "partial": 1, "opaque": 2}

// CheckReport retains the combined verdict for batch summaries and older API consumers.
func CheckReport(c Case, raw json.RawMessage) Check {
	return CombineChecks(CheckReportParts(c, raw))
}

func CheckReportParts(c Case, raw json.RawMessage) *Checks {
	var r Report
	if json.Unmarshal(raw, &r) != nil || r.Consumer != "diagnostic" {
		failed := Check{"error", []string{"invalid diagnostic report contract"}}
		return &Checks{Parsing: failed, Approval: failed}
	}
	return &Checks{Parsing: checkParsing(c, r), Approval: checkApproval(c, r)}
}

func CombineChecks(checks *Checks) Check {
	issues := append(append([]string{}, checks.Parsing.Issues...), checks.Approval.Issues...)
	for _, verdict := range []string{"error", "mismatch", "known-difference", "not-run"} {
		if checks.Parsing.Verdict == verdict || checks.Approval.Verdict == verdict {
			return Check{verdict, issues}
		}
	}
	return Check{"match", issues}
}

func checkApproval(c Case, r Report) Check {
	issues := []string{}
	expected := ExpectedPolicy(c)
	mode := ReviewMode(c.Input)
	if mode == "syntax-only" {
		if r.Status.Classification != "not-run" || r.Policy != nil {
			return Check{"error", []string{"syntax-only test received policy result"}}
		}
	} else {
		if r.Status.Classification != "platform-review" || r.Policy == nil {
			return Check{"error", []string{"policy report missing"}}
		}
		if r.Policy.Mode != mode {
			issues = append(issues, "policy mode 与请求不同")
		}
		if mode == "classification" && (r.Policy.AccessLevel != "" || r.Policy.Decision != nil) {
			issues = append(issues, "只分类不应生成 access level 或 decision")
		}
		if mode == "evaluation" && (r.Policy.AccessLevel != c.Review.AccessLevel || r.Policy.Decision == nil) {
			issues = append(issues, "权限预审缺少请求的 access level 或 decision")
		}
	}
	if e := expected; e != nil {
		if r.Policy == nil {
			issues = append(issues, "缺少 policy")
		} else {
			p := r.Policy
			if e.Mode != "" && p.Mode != e.Mode {
				issues = append(issues, "policy.mode 与预期不同")
			}
			if p.AccessLevel != e.AccessLevel {
				issues = append(issues, "policy.accessLevel 与预期不同")
			}
			if e.Decision != "" && (p.Decision == nil || p.Decision.Value != e.Decision) {
				issues = append(issues, "policy.decision 与预期不同")
			}
			if e.RequiresHITL != nil && (p.Decision == nil || p.Decision.RequiresHITL != *e.RequiresHITL) {
				issues = append(issues, "policy.HITL 与预期不同")
			}
			categories := map[string]bool{}
			for _, v := range p.Categories {
				categories[v] = true
			}
			for _, v := range e.Categories {
				if !categories[v] {
					issues = append(issues, "缺少分类 "+v)
				}
			}
		}
	}
	if len(issues) > 0 {
		return Check{"mismatch", issues}
	}
	if expected == nil && len(c.Expect.PolicyByLevel) > 0 && mode != "evaluation" {
		return Check{"not-evaluated", issues}
	}
	if expected == nil && len(c.Expect.PolicyByLevel) > 0 {
		return Check{"error", []string{"当前档位缺少已声明的审批预期"}}
	}
	if expected == nil {
		return Check{"not-set", issues}
	}
	return Check{"match", issues}
}

func checkParsing(c Case, r Report) Check {
	issues := []string{}
	if r.Status.Syntax != c.Expect.Syntax {
		issues = append(issues, "syntax 与预期不同")
	}
	calls := map[string]bool{}
	for _, e := range r.ExecPoints {
		if len(e.Words) > 0 {
			calls[e.Words[0].Value.Text] = true
		}
	}
	missing := false
	for _, name := range c.Expect.ContainsCalls {
		if !calls[name] {
			issues = append(issues, "缺少调用 "+name)
			missing = true
		}
	}
	for _, argv := range c.Expect.ContainsArgv {
		found := false
		for _, e := range r.ExecPoints {
			if len(e.Words) != len(argv) {
				continue
			}
			exact := true
			for i, word := range e.Words {
				exact = exact && word.Value.State == "literal" && word.Value.Text == argv[i]
			}
			found = found || exact
		}
		if !found {
			value, _ := json.Marshal(argv)
			issues = append(issues, "缺少精确命令参数 "+string(value))
			missing = true
		}
	}
	grade, ok := grades[r.Status.Grade]
	ceiling := grades[c.Expect.GradeCeiling]
	badGrade := !ok || grade > ceiling
	if badGrade {
		issues = append(issues, "grade 超出预期上限或未知")
	}
	if len(issues) == 0 {
		return Check{"match", issues}
	}
	// A known syntax divergence never excuses a new missing call, diagnostic or grade.
	if k := c.KnownDifference; k != nil && !missing && !badGrade && r.Status.Syntax == k.Syntax && r.Status.Recovered == k.Recovered && r.Status.Grade == k.Grade {
		codes := []string{}
		seen := map[string]bool{}
		for _, d := range r.Diagnostics {
			if !seen[d.Code] {
				codes = append(codes, d.Code)
				seen[d.Code] = true
			}
		}
		sort.Strings(codes)
		expected := append([]string{}, k.DiagnosticCodes...)
		sort.Strings(expected)
		if reflect.DeepEqual(codes, expected) {
			return Check{"known-difference", issues}
		}
	}
	return Check{"mismatch", issues}
}
func stripReport(r Result) Result { r.Report = nil; return r }
func ExpectationComparison(run Run) Comparison {
	c := Comparison{ID: "expectations-" + run.ID, Kind: "expectations", TargetRunID: run.ID, CreatedAt: run.StartedAt, Counts: map[string]int{}, Rows: []ComparisonRow{}}
	for _, tc := range run.Cases {
		r, ok := run.Results[tc.ID]
		v := "not-run"
		if ok {
			v = r.Check.Verdict
		}
		expected := tc.Expect
		row := ComparisonRow{CaseID: tc.ID, Command: tc.Command, Expected: &expected, Verdict: v}
		if ok {
			s := stripReport(r)
			row.After = &s
		}
		c.Rows = append(c.Rows, row)
		c.Counts[v]++
	}
	return c
}
func CompareRuns(base, target Run, baseReports, targetReports map[string]json.RawMessage) Comparison {
	c := Comparison{Kind: "runs", BaseRunID: base.ID, TargetRunID: target.ID, Counts: map[string]int{}, Rows: []ComparisonRow{}}
	old := map[string]Case{}
	next := map[string]Case{}
	ids := map[string]bool{}
	for _, tc := range base.Cases {
		old[tc.ID] = tc
		ids[tc.ID] = true
	}
	for _, tc := range target.Cases {
		next[tc.ID] = tc
		ids[tc.ID] = true
	}
	keys := []string{}
	for id := range ids {
		keys = append(keys, id)
	}
	sort.Strings(keys)
	for _, id := range keys {
		a, aok := old[id]
		b, bok := next[id]
		ar, raok := base.Results[id]
		br, rbok := target.Results[id]
		command := b.Command
		if !bok {
			command = a.Command
		}
		row := ComparisonRow{CaseID: id, Command: command}
		if raok {
			s := stripReport(ar)
			row.Before = &s
		}
		if rbok {
			s := stripReport(br)
			row.After = &s
		}
		switch {
		case !aok:
			row.Verdict = "added"
		case !bok:
			row.Verdict = "removed"
		case !reflect.DeepEqual(a.Input, b.Input) || a.Mode != b.Mode:
			row.Verdict = "input-changed"
		case !raok || !rbok || ar.State != "done" || br.State != "done":
			row.Verdict = "not-comparable"
		default:
			var av, bv map[string]json.RawMessage
			ae := json.Unmarshal(baseReports[id], &av)
			be := json.Unmarshal(targetReports[id], &bv)
			if ae != nil || be != nil {
				row.Verdict = "not-comparable"
				break
			}
			fields := map[string]bool{}
			for k := range av {
				fields[k] = true
			}
			for k := range bv {
				fields[k] = true
			}
			for k := range fields {
				var x, y interface{}
				_ = json.Unmarshal(av[k], &x)
				_ = json.Unmarshal(bv[k], &y)
				if !reflect.DeepEqual(x, y) {
					row.ChangedFields = append(row.ChangedFields, k)
				}
			}
			if !reflect.DeepEqual(a.Expect, b.Expect) || !reflect.DeepEqual(a.KnownDifference, b.KnownDifference) {
				row.ChangedFields = append(row.ChangedFields, "expectation")
			}
			if ar.ExitCode != br.ExitCode {
				row.ChangedFields = append(row.ChangedFields, "exitCode")
			}
			if ar.Check.Verdict != br.Check.Verdict {
				row.ChangedFields = append(row.ChangedFields, "verdict")
			}
			sort.Strings(row.ChangedFields)
			if len(row.ChangedFields) == 0 {
				row.Verdict = "unchanged"
			} else {
				row.Verdict = "changed"
			}
		}
		c.Rows = append(c.Rows, row)
		c.Counts[row.Verdict]++
	}
	return c
}
