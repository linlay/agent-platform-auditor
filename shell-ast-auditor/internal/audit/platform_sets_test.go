package audit

import "testing"

func TestBundledSetsSeparateWindowsFromMacLinux(t *testing.T) {
	store := &Store{Root: "../.."}
	sets, err := store.Testsets()
	if err != nil {
		t.Fatal(err)
	}
	windows := map[string]bool{"windows-core": true, "windows-smoke": true, "powershell-compat": true, "policy-http-windows": true}
	counts := map[string]int{"shell-core": 233, "smoke": 5, "policy-smoke": 6, "windows-core": 166, "windows-smoke": 3, "powershell-compat": 210, "policy-http-regression": 13, "policy-http-windows": 20}
	unique := map[string]bool{}
	for _, set := range sets {
		if len(set.Cases) != counts[set.ID] {
			t.Fatalf("%s: unexpected case count %d", set.ID, len(set.Cases))
		}
		for _, c := range set.Cases {
			if len(c.Platforms) == 0 {
				t.Fatalf("%s: missing platform", c.ID)
			}
			if windows[set.ID] && set.ID != "policy-http-windows" && (ReviewMode(c.Input) != "syntax-only" || c.Expect.Policy != nil || len(c.Expect.PolicyByLevel) != 0 || c.Expect.PolicyBasis != "") {
				t.Fatalf("%s: Windows fixture %s must only assert parsing", set.ID, c.ID)
			}
			for _, platform := range c.Platforms {
				if windows[set.ID] && platform != "windows" || !windows[set.ID] && platform != "macos" && platform != "linux" {
					t.Fatalf("%s includes %s case %s", set.ID, platform, c.ID)
				}
			}
			unique[c.ID] = true
		}
	}
	if len(unique) != 648 {
		t.Fatalf("platform split lost cases: got %d unique IDs", len(unique))
	}
}
