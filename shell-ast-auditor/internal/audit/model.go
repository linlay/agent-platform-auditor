// Package audit owns test sets, immutable run snapshots, and comparisons.
// It never interprets or executes command text; a parser adapter is injected.
package audit

import (
	"encoding/json"
	"time"
)

type ReviewOptions struct {
	Mode        string `json:"mode"`
	AccessLevel string `json:"accessLevel,omitempty"`
	Workspace   string `json:"workspace,omitempty"`
	CWD         string `json:"cwd,omitempty"`
	Editing     *bool  `json:"editing,omitempty"`
}
type PolicyExpectation struct {
	Mode         string   `json:"mode"`
	AccessLevel  string   `json:"accessLevel,omitempty"`
	Decision     string   `json:"decision,omitempty"`
	RequiresHITL *bool    `json:"requiresHITL,omitempty"`
	Categories   []string `json:"categories,omitempty"`
}
type PolicyDecision struct {
	Value        string `json:"value"`
	Disposition  string `json:"disposition"`
	RequiresHITL bool   `json:"requiresHITL"`
	Blocked      bool   `json:"blocked"`
	AutoApproved bool   `json:"autoApproved"`
	Reason       string `json:"reason"`
}
type Policy struct {
	Mode            string          `json:"mode"`
	AccessLevel     string          `json:"accessLevel,omitempty"`
	Categories      []string        `json:"categories"`
	Classifications json.RawMessage `json:"classifications"`
	Context         string          `json:"context"`
	SyntaxSource    string          `json:"syntaxSource"`
	Engine          string          `json:"engine"`
	Decision        *PolicyDecision `json:"decision,omitempty"`
}

func ReviewMode(input Input) string {
	if input.Review == nil || input.Review.Mode == "syntax-only" {
		return "syntax-only"
	}
	return input.Review.Mode
}

type Input struct {
	ProjectDir      string          `json:"projectDir,omitempty"`
	TemplateCommand string          `json:"templateCommand,omitempty"`
	Review          *ReviewOptions  `json:"review,omitempty"`
	Command         string          `json:"command"`
	Dialect         string          `json:"dialect"`
	Profile         string          `json:"profile"`
	Options         map[string]bool `json:"options,omitempty"`
}
type Expectation struct {
	PolicyByLevel map[string]PolicyExpectation `json:"policyByLevel,omitempty"`
	PolicyBasis   string                       `json:"policyBasis,omitempty"`
	Policy        *PolicyExpectation           `json:"policy,omitempty"`
	Syntax        string                       `json:"syntax"`
	GradeCeiling  string                       `json:"gradeCeiling"`
	ContainsCalls []string                     `json:"containsCalls,omitempty"`
	ContainsArgv  [][]string                   `json:"containsArgv,omitempty"`
}

// ExpectedPolicy selects a declared expectation using the frozen requested
// level, never the actual result (which could itself have the wrong level).
func ExpectedPolicy(c Case) *PolicyExpectation {
	if ReviewMode(c.Input) == "evaluation" && len(c.Expect.PolicyByLevel) > 0 {
		if p, ok := c.Expect.PolicyByLevel[c.Review.AccessLevel]; ok {
			return &p
		}
		return nil
	}
	return c.Expect.Policy
}

type KnownDifference struct {
	Syntax          string   `json:"syntax"`
	Grade           string   `json:"grade"`
	Recovered       bool     `json:"recovered"`
	DiagnosticCodes []string `json:"diagnosticCodes"`
	Reason          string   `json:"reason"`
}
type Case struct {
	Input
	ID               string           `json:"id"`
	Platforms        []string         `json:"platforms"`
	Tags             []string         `json:"tags"`
	Mode             string           `json:"mode"`
	Expect           Expectation      `json:"expect"`
	Source           json.RawMessage  `json:"source"`
	AdaptedFrom      string           `json:"adaptedFrom,omitempty"`
	ExpectedEvidence string           `json:"expectedEvidence,omitempty"`
	KnownDifference  *KnownDifference `json:"knownDifference,omitempty"`
}
type Reference struct {
	TestsetID string   `json:"testsetId"`
	CaseIDs   []string `json:"caseIds"`
}
type Testset struct {
	SchemaVersion int         `json:"schemaVersion"`
	ID            string      `json:"id"`
	Title         string      `json:"title"`
	Version       string      `json:"version"`
	Description   string      `json:"description"`
	Files         []string    `json:"files"`
	References    []Reference `json:"references,omitempty"`
	Cases         []Case      `json:"cases,omitempty"`
}
type Status struct {
	Syntax         string `json:"syntax"`
	Recovered      bool   `json:"recovered"`
	Profile        string `json:"profile"`
	Coverage       string `json:"coverage"`
	Grade          string `json:"grade"`
	Classification string `json:"classification"`
}
type Report struct {
	Policy     *Policy `json:"policy,omitempty"`
	Consumer   string  `json:"consumer"`
	Status     Status  `json:"status"`
	ExecPoints []struct {
		Words []struct {
			Value struct {
				Text  string `json:"text"`
				State string `json:"state"`
			} `json:"value"`
		} `json:"words"`
	} `json:"execPoints"`
	Diagnostics []struct {
		Code string `json:"code"`
	} `json:"diagnostics"`
}
type Check struct {
	Verdict string   `json:"verdict"`
	Issues  []string `json:"issues"`
}
type Checks struct {
	Parsing  Check `json:"parsing"`
	Approval Check `json:"approval"`
}
type Result struct {
	Checks     *Checks         `json:"checks,omitempty"`
	Input      *Input          `json:"input,omitempty"`
	Policy     *Policy         `json:"policy,omitempty"`
	State      string          `json:"state"`
	Status     *Status         `json:"status,omitempty"`
	ExitCode   int             `json:"exitCode"`
	DurationMs int64           `json:"durationMs"`
	Error      string          `json:"error,omitempty"`
	Report     json.RawMessage `json:"report,omitempty"`
	Check      Check           `json:"check"`
}
type ParserInfo struct {
	SupportsPolicy    bool   `json:"supportsPolicy"`
	SHA256            string `json:"sha256"`
	Mode              string `json:"mode"`
	SourceCommit      string `json:"sourceCommit,omitempty"`
	SourceDirty       bool   `json:"sourceDirty"`
	SourceFingerprint string `json:"sourceFingerprint,omitempty"`
	BuiltAt           string `json:"builtAt,omitempty"`
	GoVersion         string `json:"goVersion,omitempty"`
}
type Run struct {
	Kind           string            `json:"kind,omitempty"`
	ReviewOverride *ReviewOptions    `json:"reviewOverride,omitempty"`
	Parser         *ParserInfo       `json:"parser,omitempty"`
	ID             string            `json:"id"`
	TestsetID      string            `json:"testsetId"`
	TestsetVersion string            `json:"testsetVersion"`
	TestsetHash    string            `json:"testsetHash"`
	ParserSHA256   string            `json:"parserSha256"`
	Host           string            `json:"host"`
	StartedAt      time.Time         `json:"startedAt"`
	FinishedAt     *time.Time        `json:"finishedAt,omitempty"`
	State          string            `json:"state"`
	Error          string            `json:"error,omitempty"`
	Cases          []Case            `json:"cases,omitempty"`
	Results        map[string]Result `json:"results"`
	Counts         map[string]int    `json:"counts"`
}
type ComparisonRow struct {
	Command       string       `json:"command"`
	Expected      *Expectation `json:"expected,omitempty"`
	CaseID        string       `json:"caseId"`
	Verdict       string       `json:"verdict"`
	ChangedFields []string     `json:"changedFields,omitempty"`
	Before        *Result      `json:"before,omitempty"`
	After         *Result      `json:"after,omitempty"`
}
type Comparison struct {
	ID          string          `json:"id"`
	Kind        string          `json:"kind"`
	BaseRunID   string          `json:"baseRunId,omitempty"`
	TargetRunID string          `json:"targetRunId"`
	CreatedAt   time.Time       `json:"createdAt"`
	Counts      map[string]int  `json:"counts"`
	Rows        []ComparisonRow `json:"rows"`
}
