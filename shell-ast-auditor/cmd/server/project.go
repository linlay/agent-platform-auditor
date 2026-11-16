package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"

	"shell-ast-auditor/internal/audit"
)

func existingContextDirectory(name, path string) (string, error) {
	canonical, err := filepath.Abs(path)
	if err == nil {
		canonical, err = filepath.EvalSymlinks(canonical)
	}
	if err != nil {
		return "", fmt.Errorf("%s必须是本机已存在的目录：%s（%w）", name, path, err)
	}
	info, err := os.Stat(canonical)
	if err != nil {
		return "", fmt.Errorf("%s无法读取：%w", name, err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("%s不是目录：%s", name, path)
	}
	return canonical, nil
}

func prepareInput(q Request) (Request, error) {
	// Generated provenance is always derived from the received command.
	q.TemplateCommand = ""
	if q.ProjectDir != "" {
		dir, err := existingContextDirectory("/project 映射目录", q.ProjectDir)
		if err != nil {
			return q, err
		}
		// Literal expansion keeps the original quoting of every dialect. Reject
		// ambiguous targets rather than changing argument boundaries or inventing
		// a second Shell parser. Ordinary Unicode directory names are supported.
		if dir == string(filepath.Separator) || strings.ContainsFunc(dir, func(r rune) bool {
			return unicode.IsSpace(r) || unicode.IsControl(r) || strings.ContainsRune("\\\"'`$;&|<>()*?[]{}!#~", r)
		}) {
			return q, fmt.Errorf("/project 映射目录暂不支持根目录、空白或 Shell 特殊字符，请选择普通目录路径")
		}
		q.ProjectDir = dir
		mapped := audit.MapProjectTemplate(q.Command, dir)
		if mapped != q.Command {
			q.TemplateCommand, q.Command = q.Command, mapped
		}
	}
	if q.Review != nil && q.Review.Mode != "syntax-only" {
		r := *q.Review
		if q.ProjectDir != "" {
			mapDir := func(path string) string {
				if path == "" || path == "/project" {
					return q.ProjectDir
				}
				if strings.HasPrefix(path, "/project/") {
					return filepath.Join(q.ProjectDir, strings.TrimPrefix(path, "/project/"))
				}
				return path
			}
			r.Workspace, r.CWD = mapDir(r.Workspace), mapDir(r.CWD)
		}
		var err error
		if r.Workspace != "" {
			r.Workspace, err = existingContextDirectory("工作区", r.Workspace)
			if err != nil {
				return q, err
			}
		}
		if r.CWD != "" {
			r.CWD, err = existingContextDirectory("工作目录", r.CWD)
			if err != nil {
				return q, err
			}
		}
		q.Review = &r
	}
	return q, validate(q)
}
