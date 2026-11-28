package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"catalog-lock-auditor/internal/server"
)

func resolveProjectDir() string {
	wd, err := os.Getwd()
	if err == nil {
		if _, statErr := os.Stat(filepath.Join(wd, "public", "index.html")); statErr == nil {
			return wd
		}
	}
	exe, exeErr := os.Executable()
	if exeErr == nil {
		parent := filepath.Dir(filepath.Dir(exe))
		if _, statErr := os.Stat(filepath.Join(parent, "public", "index.html")); statErr == nil {
			return parent
		}
	}
	return wd
}

func main() {
	addr := os.Getenv("AUDITOR_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8095"
	}
	projectDir := resolveProjectDir()
	h, err := server.New(projectDir)
	if err != nil {
		log.Fatalf("init server: %v", err)
	}
	defer h.Close()

	srv := &http.Server{
		Addr:              addr,
		Handler:           h,
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	fmt.Printf("Catalog Lock Auditor → http://%s\n", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("listen %s: %v", addr, err)
	}
}
