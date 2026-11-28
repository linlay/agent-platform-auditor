package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"catalog-lock-auditor/internal/targetbuild"
)

func resolveProjectDir() string {
	wd, err := os.Getwd()
	if err == nil {
		if _, statErr := os.Stat(filepath.Join(wd, "go.mod")); statErr == nil {
			return wd
		}
	}
	return "."
}

func main() {
	var req targetbuild.BuildRequest
	flag.StringVar(&req.SourceDir, "source", "", "path to read-only agent-platform repository")
	flag.StringVar(&req.WatcherRef, "watcher-ref", targetbuild.DefaultWatcherRef, "git ref for watcher baseline")
	flag.StringVar(&req.PollingRef, "polling-ref", targetbuild.DefaultPollingRef, "git ref for polling candidate")
	flag.Parse()

	mgr := targetbuild.NewManager(resolveProjectDir())
	manifest, err := mgr.Build(context.Background(), req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "build targets failed: %v\n", err)
		os.Exit(1)
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(manifest)
}
