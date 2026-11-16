package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"shell-ast-auditor/internal/audit"
)

func TestPrepareProjectMapping(t *testing.T) {
	dir := t.TempDir()
	canonical, err := filepath.EvalSymlinks(dir)
	if err != nil {
		t.Fatal(err)
	}
	command := "git -C /project status | head -20 > result.txt"
	review := &audit.ReviewOptions{Mode: "evaluation", AccessLevel: "ask_for_approval", Workspace: "/project", CWD: "/project"}
	q := Request{Command: command, ProjectDir: dir, Dialect: "bash", Profile: "bash-3.2", Review: review}
	prepared, err := prepareInput(q)
	if err != nil {
		t.Fatal(err)
	}
	if prepared.Command != "git -C "+canonical+" status | head -20 > result.txt" || prepared.TemplateCommand != command || prepared.ProjectDir != canonical {
		t.Fatalf("wrong resolved input: %+v", prepared)
	}
	if prepared.Review.CWD != canonical || prepared.Review.Workspace != canonical || prepared.Review.AccessLevel != "ask_for_approval" {
		t.Fatal(prepared.Review)
	}
	if q.Command != command || review.CWD != "/project" {
		t.Fatal("mutated source or shared review")
	}
	if _, err := os.Stat(filepath.Join(dir, "result.txt")); !os.IsNotExist(err) {
		t.Fatal("input must never execute")
	}
	// Syntax-only expansion does not invent policy context.
	q.Review = nil
	prepared, err = prepareInput(q)
	if err != nil || prepared.Review != nil || prepared.TemplateCommand != command {
		t.Fatal(prepared, err)
	}
	// With no mapping configured, templates stay literal and supplied provenance
	// cannot masquerade as server-generated input metadata.
	q.ProjectDir, q.TemplateCommand = "", "spoofed"
	prepared, err = prepareInput(q)
	if err != nil || prepared.Command != command || prepared.TemplateCommand != "" {
		t.Fatal(prepared, err)
	}
}

func TestProjectMappingValidation(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "file")
	if err := os.WriteFile(file, []byte("x"), 0600); err != nil {
		t.Fatal(err)
	}
	for _, suffix := range []string{"has space", "quote'", "dollar$", "semicolon;"} {
		if err := os.Mkdir(filepath.Join(dir, suffix), 0700); err != nil {
			t.Fatal(err)
		}
	}
	for _, path := range []string{filepath.Join(dir, "missing"), file, "/", filepath.Join(dir, "has space"), filepath.Join(dir, "quote'"), filepath.Join(dir, "dollar$"), filepath.Join(dir, "semicolon;")} {
		q := Request{Command: "cat /project/x", Dialect: "bash", Profile: "bash-3.2", ProjectDir: path}
		if _, err := prepareInput(q); err == nil {
			t.Errorf("accepted invalid mapping %q", path)
		}
	}
	q := Request{Command: "cat /project", Dialect: "bash", Profile: "bash-3.2", Review: &audit.ReviewOptions{Mode: "classification", CWD: filepath.Join(dir, "missing")}}
	if _, err := prepareInput(q); err == nil || !strings.Contains(err.Error(), "工作目录必须是本机已存在的目录") {
		t.Fatal(err)
	}
	// Revalidate the expanded command against the CLI input budget.
	q.Review, q.ProjectDir, q.Command = nil, dir, strings.Repeat("/project ", 7000)
	if _, err := prepareInput(q); err == nil {
		t.Fatal("expanded input budget not enforced")
	}
}
