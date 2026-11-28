package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"catalog-lock-auditor/internal/auditor"
	"catalog-lock-auditor/internal/loghub"
	"catalog-lock-auditor/internal/monitor"
	"catalog-lock-auditor/internal/targetbuild"
)

const maxJSONBody = 256 * 1024

// Handler serves the Catalog Lock Auditor JSON API and static TypeScript/HTML UI.
type Handler struct {
	rootDir string
	store   *auditor.Store
	targets *targetbuild.Manager
	logs    *loghub.Hub
	runner  *auditor.Runner
	sandbox *auditor.SandboxManager
	mux     *http.ServeMux
}

// New constructs the HTTP handler rooted at projectDir (containing public/, dist/, results/).
func New(projectDir string) (*Handler, error) {
	store, err := auditor.NewStore(filepath.Join(projectDir, "results"))
	if err != nil {
		return nil, err
	}
	logs := loghub.New()
	targets := targetbuild.NewManager(projectDir)
	targets.SetLogger(logs.Emit)
	h := &Handler{
		rootDir: projectDir,
		store:   store,
		targets: targets,
		logs:    logs,
		runner:  auditor.NewRunner(store, targets, logs),
		sandbox: auditor.NewSandboxManager(targets, logs),
		mux:     http.NewServeMux(),
	}
	h.routes()
	return h, nil
}

// Close cleans up any running live sandbox workspace on shutdown.
func (h *Handler) Close() error {
	return h.sandbox.Stop()
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	h.mux.ServeHTTP(w, r)
}

func (h *Handler) routes() {
	h.mux.HandleFunc("GET /api/health", h.handleHealth)
	h.mux.HandleFunc("GET /api/targets", h.handleTargetsStatus)
	h.mux.HandleFunc("GET /api/targets/refs", h.handleTargetsRefs)
	h.mux.HandleFunc("POST /api/targets/build", h.handleTargetsBuild)
	h.mux.HandleFunc("GET /api/logs", h.handleLogsSnapshot)
	h.mux.HandleFunc("POST /api/logs/clear", h.handleLogsClear)
	h.mux.HandleFunc("GET /api/logs/stream", h.handleLogsStream)
	h.mux.HandleFunc("GET /api/scenarios", h.handleScenarios)
	h.mux.HandleFunc("GET /api/runs", h.handleListRuns)
	h.mux.HandleFunc("GET /api/runs/{id}", h.handleGetRun)
	h.mux.HandleFunc("POST /api/runs", h.handleCreateRun)
	h.mux.HandleFunc("GET /api/comparisons", h.handleListComparisons)
	h.mux.HandleFunc("GET /api/comparisons/{id}", h.handleGetComparison)
	h.mux.HandleFunc("POST /api/compare", h.handleCompare)
	h.mux.HandleFunc("GET /api/sandbox", h.handleSandboxState)
	h.mux.HandleFunc("POST /api/sandbox/start", h.handleSandboxStart)
	h.mux.HandleFunc("POST /api/sandbox/action", h.handleSandboxAction)
	h.mux.HandleFunc("POST /api/sandbox/stop", h.handleSandboxStop)

	h.mux.HandleFunc("GET /", h.handleIndex)
	h.mux.HandleFunc("GET /styles.css", h.handleStyles)
	h.mux.Handle("GET /dist/", http.StripPrefix("/dist/", http.FileServer(http.Dir(filepath.Join(h.rootDir, "dist")))))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	body, err := io.ReadAll(io.LimitReader(r.Body, maxJSONBody+1))
	if err != nil {
		return err
	}
	if len(body) > maxJSONBody {
		return errors.New("request body too large")
	}
	if len(strings.TrimSpace(string(body))) == 0 {
		return nil
	}
	return json.Unmarshal(body, dst)
}

func (h *Handler) handleHealth(w http.ResponseWriter, _ *http.Request) {
	handles, supported := monitor.ProcessHandleCount()
	writeJSON(w, http.StatusOK, map[string]any{
		"app":                  "catalog-lock-auditor",
		"os":                   runtime.GOOS,
		"arch":                 runtime.GOARCH,
		"goVersion":            runtime.Version(),
		"handleCountSupported": supported,
		"currentHandleCount":   handles,
		"defaultPort":          8095,
		"timestamp":            time.Now(),
	})
}

func (h *Handler) handleScenarios(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"scenarios": auditor.ListScenarios(),
	})
}

func (h *Handler) handleListRuns(w http.ResponseWriter, _ *http.Request) {
	runs, err := h.store.ListRuns()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if runs == nil {
		runs = []auditor.RunRecord{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"runs": runs})
}

func (h *Handler) handleGetRun(w http.ResponseWriter, r *http.Request) {
	rec, err := h.store.GetRun(r.PathValue("id"))
	if err != nil {
		status := http.StatusNotFound
		if !os.IsNotExist(err) {
			status = http.StatusBadRequest
		}
		writeErr(w, status, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rec)
}

func (h *Handler) handleCreateRun(w http.ResponseWriter, r *http.Request) {
	var req auditor.RunConfig
	if err := decodeJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	mode := req.Mode
	if mode == "" {
		mode = monitor.ModePolling
	}
	rec, err := h.runner.RunMode(r.Context(), mode, req)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rec)
}

func (h *Handler) handleListComparisons(w http.ResponseWriter, _ *http.Request) {
	items, err := h.store.ListComparisons()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if items == nil {
		items = []auditor.ComparisonRecord{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"comparisons": items})
}

func (h *Handler) handleGetComparison(w http.ResponseWriter, r *http.Request) {
	rec, err := h.store.GetComparison(r.PathValue("id"))
	if err != nil {
		status := http.StatusNotFound
		if !os.IsNotExist(err) {
			status = http.StatusBadRequest
		}
		writeErr(w, status, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rec)
}

func (h *Handler) handleCompare(w http.ResponseWriter, r *http.Request) {
	var req auditor.RunConfig
	if err := decodeJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	cmp, err := h.runner.RunCompare(r.Context(), req)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, cmp)
}

func (h *Handler) handleTargetsStatus(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.targets.Status())
}

func (h *Handler) handleTargetsRefs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.targets.ListRefs(r.Context(), r.URL.Query().Get("sourceDir")))
}

func (h *Handler) handleTargetsBuild(w http.ResponseWriter, r *http.Request) {
	var req targetbuild.BuildRequest
	if err := decodeJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := h.targets.Build(r.Context(), req); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, h.targets.Status())
}

func (h *Handler) handleLogsSnapshot(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"entries": h.logs.Snapshot()})
}

func (h *Handler) handleLogsClear(w http.ResponseWriter, _ *http.Request) {
	h.logs.Clear()
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) handleLogsStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeErr(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Connection", "keep-alive")

	ch, cancel := h.logs.Subscribe()
	defer cancel()

	var lastSeq int64
	for _, entry := range h.logs.Snapshot() {
		raw, err := json.Marshal(entry)
		if err != nil {
			continue
		}
		_, _ = fmt.Fprintf(w, "event: log\ndata: %s\n\n", raw)
		lastSeq = entry.Seq
	}
	flusher.Flush()

	keepalive := time.NewTicker(15 * time.Second)
	defer keepalive.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-keepalive.C:
			_, _ = fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		case entry, open := <-ch:
			if !open {
				return
			}
			if entry.Seq <= lastSeq {
				continue
			}
			lastSeq = entry.Seq
			raw, err := json.Marshal(entry)
			if err != nil {
				continue
			}
			_, _ = fmt.Fprintf(w, "event: log\ndata: %s\n\n", raw)
			flusher.Flush()
		}
	}
}

func (h *Handler) handleSandboxState(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.sandbox.State())
}

type sandboxStartRequest struct {
	Engine         string       `json:"engine"`
	Mode           monitor.Mode `json:"mode"`
	PollIntervalMs int          `json:"pollIntervalMs"`
	Ref            string       `json:"ref"`
}

func (h *Handler) handleSandboxStart(w http.ResponseWriter, r *http.Request) {
	var req sandboxStartRequest
	if err := decodeJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.Mode == "" {
		req.Mode = monitor.ModePolling
	}
	state, err := h.sandbox.Start(req.Mode, req.Engine, req.PollIntervalMs, req.Ref)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, state)
}

type sandboxActionRequest struct {
	Action string `json:"action"`
}

func (h *Handler) handleSandboxAction(w http.ResponseWriter, r *http.Request) {
	var req sandboxActionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	state, err := h.sandbox.Action(req.Action)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, state)
}

func (h *Handler) handleSandboxStop(w http.ResponseWriter, _ *http.Request) {
	if err := h.sandbox.Stop(); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, h.sandbox.State())
}

func (h *Handler) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join(h.rootDir, "public", "index.html"))
}

func (h *Handler) handleStyles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/css; charset=utf-8")
	http.ServeFile(w, r, filepath.Join(h.rootDir, "public", "styles.css"))
}
