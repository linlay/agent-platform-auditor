package audit

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestExactArgvCannotBeReplacedByACommandNameOrUnknownWord(t *testing.T) {
	c := Case{Expect: Expectation{Syntax: "valid", GradeCeiling: "opaque", ContainsArgv: [][]string{{"exec", "{fd}"}}}}
	for _, tc := range []struct{ words, verdict string }{
		{`[{"value":{"state":"literal","text":"exec"}},{"value":{"state":"literal","text":"{fd}"}}]`, "match"},
		{`[{"value":{"state":"literal","text":"exec"}}]`, "mismatch"},
		{`[{"value":{"state":"literal","text":"exec"}},{"value":{"state":"symbolic","text":"{fd}"}}]`, "mismatch"},
		{`[{"value":{"state":"literal","text":"exec"}},{"value":{"state":"literal","text":"{fd}"}},{"value":{"state":"literal","text":"extra"}}]`, "mismatch"},
	} {
		var r Report
		if err := json.Unmarshal([]byte(`{"consumer":"diagnostic","status":{"syntax":"valid","grade":"opaque","classification":"not-run"},"execPoints":[{"words":`+tc.words+`}]}`), &r); err != nil {
			t.Fatal(err)
		}
		if got := checkParsing(c, r); got.Verdict != tc.verdict {
			t.Fatalf("%s: %+v", tc.words, got)
		}
		c.KnownDifference = &KnownDifference{Syntax: "invalid", Grade: "opaque", Recovered: true, DiagnosticCodes: []string{}}
		r.Status.Syntax, r.Status.Recovered = "invalid", true
		got := checkParsing(c, r)
		if tc.verdict == "mismatch" && got.Verdict != "mismatch" {
			t.Fatalf("known syntax difference hid argv loss: %+v", got)
		}
		c.KnownDifference = nil
	}
}

func TestBundledVersionThreeKeepsNativeSemanticsAndHardBlocksSeparate(t *testing.T) {
	core, err := (&Store{Root: "../.."}).Testset("shell-core")
	if err != nil {
		t.Fatal(err)
	}
	if core.Version != "3" || len(core.Cases) != 317 {
		t.Fatalf("unexpected fixture version/count: %s/%d", core.Version, len(core.Cases))
	}
	cases := map[string]Case{}
	for _, c := range core.Cases {
		cases[c.ID] = c
	}
	ps := cases["powershell.null-conditional"]
	if ps.Command != "${x}?.Name" || ps.KnownDifference != nil || ps.Expect.Syntax != "valid" {
		t.Fatalf("stale null-conditional fixture: %+v", ps)
	}
	if cases["bash.coproc.macos32"].Expect.Syntax != "invalid" || len(cases["bash.coproc.macos32"].Expect.ContainsCalls) > 0 || cases["bash.coproc"].Expect.Syntax != "valid" {
		t.Fatal("Bash profile syntax expectations were conflated")
	}
	for _, id := range []string{"bash.profile32-coproc", "bash.profile32-named-fd", "bash.named-fd.macos32"} {
		c := cases[id]
		want := `[ ["exec","{fd}"] ]`
		if strings.Contains(id, "coproc") {
			want = `[["coproc","cat"]]`
		}
		var argv [][]string
		_ = json.Unmarshal([]byte(want), &argv)
		a, _ := json.Marshal(argv)
		b, _ := json.Marshal(c.Expect.ContainsArgv)
		if string(a) != string(b) {
			t.Fatalf("%s: wrong native argv assertion: %s", id, b)
		}
		for level, p := range c.Expect.PolicyByLevel {
			if p.Decision != "block" {
				t.Fatalf("%s/%s loosened hard block", id, level)
			}
		}
	}
}
