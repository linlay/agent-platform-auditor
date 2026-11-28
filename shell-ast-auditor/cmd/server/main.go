package main

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"shell-ast-auditor/internal/audit"
	"syscall"
	"time"
)

func handler(bin string) http.Handler { return routes(bin, makeRunner(bin)) }
func routes(bin string, runner *audit.Runner) http.Handler {
	mux := http.NewServeMux()
	runner.Register(mux)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		root, _ := filepath.Abs(".")
		root, _ = filepath.EvalSymlinks(root)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(healthInfo{App: "shell-ast-auditor", ProjectRoot: root, PID: os.Getpid(), ParserAvailable: runner.ParserSHA256 != "", Consumer: "diagnostic", Classification: "not-run", Parser: runner.Parser})
	})
	mux.HandleFunc("POST /api/parse", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if origin := r.Header.Get("Origin"); origin != "" && origin != "http://"+r.Host && origin != "http://127.0.0.1:5173" {
			http.Error(w, "origin denied", 403)
			return
		}
		q := Request{}
		d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 512<<10))
		d.DisallowUnknownFields()
		if err := d.Decode(&q); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		if d.Decode(new(any)) != io.EOF {
			http.Error(w, "expected one JSON object", 400)
			return
		}
		if err := validate(q); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		prepared, err := prepareInput(q)
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		q = prepared
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()
		start := time.Now()
		report, code, err := runner.Parse(ctx, q)
		if err != nil {
			status := 502
			if ctx.Err() != nil {
				status = 504
			}
			http.Error(w, err.Error(), status)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"input": q, "report": report, "exitCode": code, "durationMs": time.Since(start).Milliseconds(), "parser": runner.Parser, "host": runtime.GOOS + "/" + runtime.GOARCH, "parsedAt": start.UTC()})
	})
	mux.Handle("/", http.FileServer(http.Dir("dist")))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			if origin := r.Header.Get("Origin"); origin != "" && origin != "http://"+r.Host && origin != "http://127.0.0.1:5173" {
				http.Error(w, "origin denied", 403)
				return
			}
		}
		mux.ServeHTTP(w, r)
	})
}
func main() {
	bin := os.Getenv("SHELL_AST_BIN")
	if bin == "" {
		bin = filepath.Join("bin", parserExecutableName("shell-ast"))
	}
	bin, _ = filepath.Abs(bin)
	addr := os.Getenv("AUDITOR_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8093"
	}

	root, _ := filepath.Abs(".")
	root, _ = filepath.EvalSymlinks(root)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		if errors.Is(err, syscall.EADDRINUSE) {
			if h, e := existingServer(addr, root); e == nil {
				if h.Parser != nil {
					if selected, e := os.ReadFile(bin); e == nil && fmt.Sprintf("%x", sha256.Sum256(selected)) != h.Parser.SHA256 {
						log.Printf("parser on disk changed; running service still uses %s. Run npm run server:stop, then npm run server to load the new parser.", h.Parser.SHA256)
					}
				}
				log.Printf("already running: http://%s (pid %d); reuse this URL. Stop the existing process before rebuilding/restarting.", addr, h.PID)
				return
			}
			log.Fatalf("port %s is occupied by another or older service; inspect with lsof -nP -iTCP:%s -sTCP:LISTEN, or set AUDITOR_ADDR=127.0.0.1:8094", addr, portOf(addr))
		}
		log.Fatal(err)
	}
	defer listener.Close()
	runner := makeRunner(bin)
	if runner.Parser == nil {
		_, _, e := runner.Parse(context.Background(), Request{})
		log.Fatal(e)
	}
	if err := runner.Recover(); err != nil {
		log.Fatal(err)
	}
	s := &http.Server{Addr: addr, Handler: routes(bin, runner), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16384}
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(signals)
	go func() {
		<-signals
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = s.Shutdown(ctx)
	}()
	log.Printf("diagnostic parser UI http://%s ; parser %s ; mode=%s ; sha256=%s", addr, bin, runner.Parser.Mode, runner.ParserSHA256)
	if e := s.Serve(listener); e != nil && !errors.Is(e, http.ErrServerClosed) {
		log.Fatal(e)
	}
}

type healthInfo struct {
	App             string            `json:"app"`
	ProjectRoot     string            `json:"projectRoot"`
	PID             int               `json:"pid"`
	ParserAvailable bool              `json:"parserAvailable"`
	Consumer        string            `json:"consumer"`
	Classification  string            `json:"classification"`
	Parser          *audit.ParserInfo `json:"parser,omitempty"`
}

func existingServer(addr, root string) (healthInfo, error) {
	var h healthInfo
	host, port, e := net.SplitHostPort(addr)
	if e != nil {
		return h, e
	}
	if host == "" || host == "0.0.0.0" {
		host = "127.0.0.1"
	}
	if host == "::" {
		host = "::1"
	}
	client := &http.Client{Timeout: time.Second, Transport: &http.Transport{Proxy: nil}}
	resp, e := client.Get("http://" + net.JoinHostPort(host, port) + "/api/health")
	if e != nil {
		return h, e
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return h, fmt.Errorf("health returned %d", resp.StatusCode)
	}
	if e = json.NewDecoder(io.LimitReader(resp.Body, 16384)).Decode(&h); e != nil {
		return h, e
	}
	if !sameServer(h, root) {
		return h, errors.New("listener is not this auditor project")
	}
	return h, nil
}
func sameServer(h healthInfo, root string) bool {
	return h.App == "shell-ast-auditor" && h.ProjectRoot == root && h.PID > 0 && h.Consumer == "diagnostic"
}
func portOf(addr string) string { _, p, _ := net.SplitHostPort(addr); return p }
