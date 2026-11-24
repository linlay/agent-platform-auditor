package audit

import "testing"

func TestBundledSetsSeparateWindowsFromMacLinux(t *testing.T) {
	store := &Store{Root: "../.."}
	sets, err := store.Testsets()
	if err != nil {
		t.Fatal(err)
	}
	windows := map[string]bool{
		"windows-core": true, "windows-smoke": true, "powershell-compat": true,
		"powershell-51": true, "powershell-76": true,
		"policy-http-windows": true, "policy-hitl-windows": true, "policy-chat-approval-windows": true,
	}
	counts := map[string]int{
		"shell-core": 233, "smoke": 5, "policy-smoke": 9, "policy-http-regression": 19,
		"policy-npm-regression": 11, "policy-sqlite-regression": 13, "policy-shell-regression": 24,
		"windows-core": 166, "windows-smoke": 3, "powershell-compat": 210,
		"powershell-51": 194, "powershell-76": 140, "policy-http-windows": 20, "policy-hitl-windows": 100,
		"policy-chat-approval-windows": 70, "policy-chat-approval-macos": 55,
	}
	profiles := map[string]string{"powershell-51": "windows-powershell-5.1", "powershell-76": "pwsh-7.6"}
	unique := map[string]bool{}
	for _, set := range sets {
		if len(set.Cases) != counts[set.ID] {
			t.Fatalf("%s: unexpected case count %d", set.ID, len(set.Cases))
		}
		profile := profiles[set.ID]
		windowsPolicy := set.ID == "policy-http-windows" || set.ID == "policy-hitl-windows" || set.ID == "policy-chat-approval-windows"
		if profile != "" && (len(set.Files) != 0 || len(set.References) != 2 ||
			set.References[0].TestsetID != "windows-core" || set.References[1].TestsetID != "powershell-compat") {
			t.Fatalf("%s must reuse the core and compatibility fixtures", set.ID)
		}
		for _, c := range set.Cases {
			if profile != "" && (c.Dialect != "powershell" || c.Profile != profile) {
				t.Fatalf("%s: case %s has unexpected profile %s", set.ID, c.ID, c.Profile)
			}
			if len(c.Platforms) == 0 {
				t.Fatalf("%s: missing platform", c.ID)
			}
			if windows[set.ID] && !windowsPolicy && (ReviewMode(c.Input) != "syntax-only" || c.Expect.Policy != nil || len(c.Expect.PolicyByLevel) != 0 || c.Expect.PolicyBasis != "") {
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
	if len(unique) != 930 {
		t.Fatalf("platform split lost cases: got %d unique IDs", len(unique))
	}
}
