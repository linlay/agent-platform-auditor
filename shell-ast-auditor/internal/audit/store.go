package audit

import (
	"bufio"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

var validID = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$`)

func safeID(id string) error {
	if !validID.MatchString(id) {
		return errors.New("invalid identifier")
	}
	return nil
}
func newID(prefix string) string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return prefix + time.Now().UTC().Format("20060102T150405") + "-" + hex.EncodeToString(b)
}
func hash(v interface{}) string {
	b, _ := json.Marshal(v)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
func atomicJSON(path string, v interface{}) error {
	b, e := json.MarshalIndent(v, "", "  ")
	if e != nil {
		return e
	}
	if e = os.MkdirAll(filepath.Dir(path), 0755); e != nil {
		return e
	}
	f, e := os.CreateTemp(filepath.Dir(path), ".writing-*")
	if e != nil {
		return e
	}
	defer os.Remove(f.Name())
	if _, e = f.Write(append(b, '\n')); e != nil {
		f.Close()
		return e
	}
	if e = f.Close(); e != nil {
		return e
	}
	return os.Rename(f.Name(), path)
}
func readJSON(path string, v interface{}) error {
	b, e := os.ReadFile(path)
	if e != nil {
		return e
	}
	return json.Unmarshal(b, v)
}

type Store struct {
	Root string
	mu   sync.Mutex
}

func (s *Store) testset(id string, stack map[string]bool) (Testset, error) {
	var set Testset
	if safeID(id) != nil || stack[id] {
		return set, errors.New("invalid or cyclic testset reference")
	}
	stack[id] = true
	defer delete(stack, id)
	dir := filepath.Join(s.Root, "testsets", id)
	if e := readJSON(filepath.Join(dir, "testset.json"), &set); e != nil {
		return set, e
	}
	if set.ID != id || set.SchemaVersion != 1 || set.Version == "" {
		return set, errors.New("invalid testset manifest")
	}
	set.Cases = []Case{}
	for _, file := range set.Files {
		if filepath.Base(file) != file || !strings.HasSuffix(file, ".jsonl") {
			return set, errors.New("testset files must be local .jsonl files")
		}
		f, e := os.Open(filepath.Join(dir, file))
		if e != nil {
			return set, e
		}
		scanner := bufio.NewScanner(f)
		scanner.Buffer(make([]byte, 4096), 512<<10)
		line := 0
		for scanner.Scan() {
			line++
			if strings.TrimSpace(scanner.Text()) == "" {
				continue
			}
			var c Case
			if e = json.Unmarshal(scanner.Bytes(), &c); e != nil {
				f.Close()
				return set, fmt.Errorf("%s:%d: %w", file, line, e)
			}
			set.Cases = append(set.Cases, c)
		}
		e = scanner.Err()
		f.Close()
		if e != nil {
			return set, e
		}
	}
	for _, ref := range set.References {
		other, e := s.testset(ref.TestsetID, stack)
		if e != nil {
			return set, e
		}
		lookup := map[string]Case{}
		for _, c := range other.Cases {
			lookup[c.ID] = c
		}
		for _, id := range ref.CaseIDs {
			c, ok := lookup[id]
			if !ok {
				return set, fmt.Errorf("reference case %s not found", id)
			}
			set.Cases = append(set.Cases, c)
		}
	}
	seen := map[string]bool{}
	for _, c := range set.Cases {
		if safeID(c.ID) != nil || seen[c.ID] {
			return set, fmt.Errorf("invalid or duplicate case ID %s", c.ID)
		}
		seen[c.ID] = true
		if c.Expect.Syntax != "valid" && c.Expect.Syntax != "invalid" {
			return set, fmt.Errorf("case %s has invalid expectation", c.ID)
		}
		if _, ok := grades[c.Expect.GradeCeiling]; !ok {
			return set, fmt.Errorf("case %s has invalid gradeCeiling", c.ID)
		}
		for _, argv := range c.Expect.ContainsArgv {
			if len(argv) == 0 || strings.TrimSpace(argv[0]) == "" {
				return set, fmt.Errorf("case %s has empty containsArgv command", c.ID)
			}
		}
		if c.Expect.PolicyByLevel != nil {
			if len(c.Expect.PolicyByLevel) != 3 || strings.TrimSpace(c.Expect.PolicyBasis) == "" {
				return set, fmt.Errorf("case %s requires three approval levels and their basis", c.ID)
			}
			for _, level := range []string{"ask_for_approval", "auto_approve", "full_access"} {
				p, ok := c.Expect.PolicyByLevel[level]
				if !ok || p.Mode != "evaluation" || p.AccessLevel != level {
					return set, fmt.Errorf("case %s has invalid approval expectation for %s", c.ID, level)
				}
				if p.Decision != "allow" && p.Decision != "auto_approved" && p.Decision != "requires_approval" && p.Decision != "block" {
					return set, fmt.Errorf("case %s has invalid approval decision for %s", c.ID, level)
				}
				if p.RequiresHITL == nil || *p.RequiresHITL != (p.Decision == "requires_approval") {
					return set, fmt.Errorf("case %s has inconsistent approval HITL for %s", c.ID, level)
				}
			}
		}
	}
	if len(set.Cases) == 0 || len(set.Cases) > 5000 {
		return set, errors.New("testset must have 1..5000 cases")
	}
	return set, nil
}
func (s *Store) Testset(id string) (Testset, error) { return s.testset(id, map[string]bool{}) }
func (s *Store) Testsets() ([]Testset, error) {
	dirs, e := os.ReadDir(filepath.Join(s.Root, "testsets"))
	if e != nil {
		return nil, e
	}
	out := []Testset{}
	for _, d := range dirs {
		if !d.IsDir() {
			continue
		}
		v, e := s.Testset(d.Name())
		if e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, nil
}
func (s *Store) saveRun(r Run) error {
	return atomicJSON(filepath.Join(s.Root, "results", "runs", r.ID, "run.json"), r)
}
func (s *Store) Run(id string) (Run, error) {
	var r Run
	if safeID(id) != nil {
		return r, errors.New("invalid run id")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	e := readJSON(filepath.Join(s.Root, "results", "runs", id, "run.json"), &r)
	return r, e
}
func (s *Store) Runs() ([]Run, error) {
	dirs, e := os.ReadDir(filepath.Join(s.Root, "results", "runs"))
	if os.IsNotExist(e) {
		return []Run{}, nil
	}
	if e != nil {
		return nil, e
	}
	out := []Run{}
	for _, d := range dirs {
		if !d.IsDir() || strings.HasPrefix(d.Name(), ".") {
			continue
		}
		r, e := s.Run(d.Name())
		if e != nil {
			return nil, e
		}
		r.Cases = nil
		r.Results = nil
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartedAt.After(out[j].StartedAt) })
	return out, nil
}
func (s *Store) Result(runID, caseID string) (Result, error) {
	r, e := s.Run(runID)
	if e != nil {
		return Result{}, e
	}
	v, ok := r.Results[caseID]
	if !ok {
		return Result{}, os.ErrNotExist
	}
	if v.State == "done" {
		e = readJSON(filepath.Join(s.Root, "results", "runs", runID, "reports", caseID+".json"), &v.Report)
		if e == nil && v.Checks == nil {
			for _, c := range r.Cases {
				if c.ID == caseID {
					v.Checks = CheckReportParts(c, v.Report)
					break
				}
			}
		}
	}
	return v, e
}
func (s *Store) SaveComparison(c Comparison) error {
	if safeID(c.ID) != nil {
		return errors.New("invalid comparison ID")
	}
	return atomicJSON(filepath.Join(s.Root, "results", "comparisons", c.ID+".json"), c)
}
func (s *Store) Comparisons() ([]Comparison, error) {
	files, e := os.ReadDir(filepath.Join(s.Root, "results", "comparisons"))
	if os.IsNotExist(e) {
		return []Comparison{}, nil
	}
	if e != nil {
		return nil, e
	}
	out := []Comparison{}
	for _, f := range files {
		if !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		var c Comparison
		if e = readJSON(filepath.Join(s.Root, "results", "comparisons", f.Name()), &c); e != nil {
			return nil, e
		}
		c.Rows = nil
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}
func (s *Store) Comparison(id string) (Comparison, error) {
	var c Comparison
	if safeID(id) != nil {
		return c, errors.New("invalid comparison ID")
	}
	e := readJSON(filepath.Join(s.Root, "results", "comparisons", id+".json"), &c)
	return c, e
}
func (s *Store) Compare(baseID, targetID string) (Comparison, error) {
	a, e := s.Run(baseID)
	if e != nil {
		return Comparison{}, e
	}
	b, e := s.Run(targetID)
	if e != nil {
		return Comparison{}, e
	}
	if a.State == "running" || b.State == "running" {
		return Comparison{}, errors.New("wait for both runs to finish")
	}
	ar := map[string]json.RawMessage{}
	br := map[string]json.RawMessage{}
	for _, c := range a.Cases {
		r, e := s.Result(a.ID, c.ID)
		if e == nil {
			ar[c.ID] = r.Report
		}
	}
	for _, c := range b.Cases {
		r, e := s.Result(b.ID, c.ID)
		if e == nil {
			br[c.ID] = r.Report
		}
	}
	c := CompareRuns(a, b, ar, br)
	c.ID = newID("compare-")
	c.CreatedAt = time.Now().UTC()
	return c, s.SaveComparison(c)
}
