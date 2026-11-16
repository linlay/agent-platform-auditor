package audit

import (
	"testing"
)

func TestProjectTemplateBoundaries(t *testing.T) {
	for _, tc := range []struct{ source, want string }{
		{"git -C /project status | head -20 > result.txt", "git -C /local/repo status | head -20 > result.txt"},
		{`cat '/project/a b' "/project/x" /project/out`, `cat '/local/repo/a b' "/local/repo/x" /local/repo/out`},
		{"(cd /project; git status) | cat", "(cd /local/repo; git status) | cat"},
		{"tool --dir=/project/sub", "tool --dir=/local/repo/sub"},
		{"echo /projects /project-old /other/project https://host/project /downloads/project", "echo /projects /project-old /other/project https://host/project /downloads/project"},
	} {
		if got := MapProjectTemplate(tc.source, "/local/repo"); got != tc.want {
			t.Errorf("%q: got %q, want %q", tc.source, got, tc.want)
		}
	}
}
