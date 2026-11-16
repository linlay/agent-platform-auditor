package audit

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

type Parser func(context.Context, Input) (json.RawMessage, int, error)
type Runner struct {
	Store        *Store
	Parse        Parser
	Validate     func(Input) error
	Prepare      func(Input) (Input, error)
	Parser       *ParserInfo
	ParserSHA256 string
	mu           sync.Mutex
	activeID     string
	cancel       context.CancelFunc
}

func (r *Runner) Start(testsetID string, caseIDs []string, reviewOverride ...*ReviewOptions) (Run, error) {
	var review *ReviewOptions
	if len(reviewOverride) > 0 {
		review = reviewOverride[0]
	}
	return r.StartWithKind(testsetID, caseIDs, review, "legacy")
}
func (r *Runner) StartWithKind(testsetID string, caseIDs []string, review *ReviewOptions, kind string, projectDirs ...string) (Run, error) {
	if kind == "" {
		kind = "legacy"
	}
	if kind != "manual" && kind != "batch" && kind != "legacy" {
		return Run{}, errors.New("invalid run kind")
	}
	if kind == "manual" && len(caseIDs) == 0 {
		return Run{}, errors.New("manual selection requires at least one case")
	}
	reviewOverride := []*ReviewOptions{review}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.activeID != "" {
		return Run{}, errors.New("another run is active")
	}
	set, e := r.Store.Testset(testsetID)
	if e != nil {
		return Run{}, e
	}
	if kind == "batch" && len(caseIDs) > 0 && len(caseIDs) != len(set.Cases) {
		return Run{}, errors.New("whole-testset batch must include every case")
	}
	selected := map[string]bool{}
	for _, id := range caseIDs {
		if selected[id] {
			return Run{}, errors.New("duplicate selected case")
		}
		selected[id] = true
	}
	cases := []Case{}
	for _, c := range set.Cases {
		if len(caseIDs) > 0 && !selected[c.ID] {
			continue
		}
		if len(reviewOverride) > 0 && reviewOverride[0] != nil {
			next := *reviewOverride[0]
			// Selecting an access level alone must not discard a fixture's
			// explicit read-only capability. An explicit override still wins.
			if next.Mode != "syntax-only" && next.Editing == nil && c.Review != nil {
				next.Editing = c.Review.Editing
			}
			c.Input.Review = &next
		}
		if len(projectDirs) > 0 {
			c.Input.ProjectDir = projectDirs[0]
		}
		if e = r.Validate(c.Input); e != nil {
			return Run{}, e
		}
		if r.Prepare != nil {
			c.Input, e = r.Prepare(c.Input)
			if e != nil {
				return Run{}, e
			}
		}
		cases = append(cases, c)
	}
	if len(caseIDs) > 0 && len(cases) != len(caseIDs) {
		return Run{}, errors.New("selected case not found")
	}
	now := time.Now().UTC()
	run := Run{Kind: kind, ID: newID("run-"), TestsetID: set.ID, TestsetVersion: set.Version, TestsetHash: hash(set.Cases), ParserSHA256: r.ParserSHA256, Parser: r.Parser, Host: runtime.GOOS + "/" + runtime.GOARCH, StartedAt: now, State: "running", Cases: cases, Results: map[string]Result{}, Counts: map[string]int{}}
	if len(reviewOverride) > 0 {
		run.ReviewOverride = reviewOverride[0]
	}
	r.Store.mu.Lock()
	e = r.Store.saveRun(run)
	r.Store.mu.Unlock()
	if e != nil {
		return Run{}, e
	}
	ctx, cancel := context.WithCancel(context.Background())
	r.activeID = run.ID
	r.cancel = cancel
	response := run
	response.Results = map[string]Result{}
	response.Counts = map[string]int{}
	go r.execute(ctx, run)
	return response, nil
}
func (r *Runner) Cancel(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.activeID != id {
		return errors.New("run is not active")
	}
	r.cancel()
	return nil
}
func (r *Runner) execute(ctx context.Context, run Run) {
	defer func() { r.mu.Lock(); r.activeID = ""; r.cancel = nil; r.mu.Unlock() }()
	jobs := make(chan Case)
	var workers sync.WaitGroup
	var mu sync.Mutex
	diskError := ""
	for range 2 {
		workers.Go(func() {
			for c := range jobs {
				result := Result{State: "cancelled", Check: Check{"not-run", []string{"run cancelled"}}}
				if ctx.Err() == nil {
					start := time.Now()
					requestCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
					raw, code, e := r.Parse(requestCtx, c.Input)
					cancel()
					input := c.Input
					result = Result{Input: &input, State: "done", Report: raw, ExitCode: code, DurationMs: time.Since(start).Milliseconds()}
					if e != nil {
						result.State = "error"
						result.Error = e.Error()
						result.Check = Check{"error", []string{e.Error()}}
						if ctx.Err() != nil {
							result.State = "cancelled"
							result.Check.Verdict = "not-run"
						}
					} else {
						result.Checks = CheckReportParts(c, raw)
						result.Check = CombineChecks(result.Checks)
						var report Report
						_ = json.Unmarshal(raw, &report)
						result.Status = &report.Status
						result.Policy = report.Policy
					}
				}
				mu.Lock()
				if result.State == "done" {
					if e := atomicJSON(filepath.Join(r.Store.Root, "results", "runs", run.ID, "reports", c.ID+".json"), result.Report); e != nil {
						result.State = "error"
						result.Error = e.Error()
						result.Check = Check{"error", []string{e.Error()}}
						diskError = e.Error()
					}
				}
				result.Report = nil
				run.Results[c.ID] = result
				run.Counts[result.Check.Verdict]++
				r.Store.mu.Lock()
				if e := r.Store.saveRun(run); e != nil {
					diskError = e.Error()
				}
				r.Store.mu.Unlock()
				mu.Unlock()
			}
		})
	}
	for _, c := range run.Cases {
		jobs <- c
	}
	close(jobs)
	workers.Wait()
	now := time.Now().UTC()
	run.FinishedAt = &now
	run.State = "completed"
	if ctx.Err() != nil {
		run.State = "cancelled"
	}
	if diskError != "" {
		run.State = "error"
		run.Error = diskError
	}
	if e := r.Store.SaveComparison(ExpectationComparison(run)); e != nil {
		run.State = "error"
		run.Error = e.Error()
	}
	r.Store.mu.Lock()
	if e := r.Store.saveRun(run); e != nil {
		run.State = "error"
		run.Error = e.Error()
	}
	r.Store.mu.Unlock()
}

// Recover records interrupted runs; a server restart never converts unrun cases to pass.
func (r *Runner) Recover() error {
	runs, e := r.Store.Runs()
	if e != nil {
		return e
	}
	for _, v := range runs {
		if v.State != "running" {
			continue
		}
		full, e := r.Store.Run(v.ID)
		if e != nil {
			return e
		}
		full.State = "interrupted"
		now := time.Now().UTC()
		full.FinishedAt = &now
		r.Store.mu.Lock()
		e = r.Store.saveRun(full)
		r.Store.mu.Unlock()
		if e != nil {
			return e
		}
		if e = r.Store.SaveComparison(ExpectationComparison(full)); e != nil {
			return e
		}
	}
	return nil
}
