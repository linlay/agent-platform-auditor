package audit

import (
	"encoding/json"
	"strings"
	"testing"
)

// This checks the authored coverage contract, not native PowerShell acceptance.
func TestPowerShellPairedCoverage(t *testing.T) {
	set, err := (&Store{Root: "../.."}).Testset("powershell-compat")
	if err != nil {
		t.Fatal(err)
	}
	if len(set.Cases) != 210 {
		t.Fatalf("expected 105 input pairs, got %d cases", len(set.Cases))
	}
	pairs := map[string]map[string]Case{}
	for _, c := range set.Cases {
		key := c.ID[:strings.LastIndex(c.ID, ".")]
		if pairs[key] == nil {
			pairs[key] = map[string]Case{}
		}
		pairs[key][c.Profile] = c
		var source struct {
			Kind      string `json:"kind"`
			Reference string `json:"reference"`
		}
		if err := json.Unmarshal(c.Source, &source); err != nil || source.Kind != "manual" || !strings.HasPrefix(source.Reference, "https://learn.microsoft.com/") {
			t.Fatalf("%s: missing documented provenance", c.ID)
		}
		if c.KnownDifference != nil || !strings.Contains(c.ExpectedEvidence, "pending") || len(c.Expect.ContainsArgv) > 0 {
			t.Fatalf("%s: unverified fixture claims native evidence or hides parser gaps", c.ID)
		}
	}
	modern, malformed := 0, 0
	for key, pair := range pairs {
		a, okA := pair["windows-powershell-5.1"]
		b, okB := pair["pwsh-7.6"]
		if !okA || !okB || a.Command != b.Command {
			t.Fatalf("%s: incomplete or unequal-input pair", key)
		}
		switch {
		case strings.Contains(key, ".chain-") || strings.Contains(key, ".ternary-") || strings.Contains(key, ".coalesce-") || strings.Contains(key, ".null-") || strings.Contains(key, ".background-") || strings.Contains(key, ".leading-pipe"):
			modern++
			if a.Expect.Syntax != "invalid" || b.Expect.Syntax != "valid" {
				t.Fatalf("%s: unsupported 5.1 syntax accepted by expectation", key)
			}
		case a.Expect.Syntax == "invalid":
			malformed++
			if b.Expect.Syntax != "invalid" {
				t.Fatalf("%s: malformed input accepted in 7.6", key)
			}
		default:
			if b.Expect.Syntax != "valid" {
				t.Fatalf("%s: common syntax expectations disagree", key)
			}
		}
	}
	if modern != 10 || malformed != 15 {
		t.Fatalf("lost rejection coverage: version pairs=%d malformed pairs=%d", modern, malformed)
	}
}
