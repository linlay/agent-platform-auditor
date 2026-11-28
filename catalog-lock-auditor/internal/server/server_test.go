package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"catalog-lock-auditor/internal/auditor"
)

func TestServerEndpointsAndSandbox(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "public"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "dist"), 0755); err != nil {
		t.Fatal(err)
	}
	_ = os.WriteFile(filepath.Join(dir, "public", "index.html"), []byte("<html>ok</html>"), 0644)

	h, err := New(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer h.Close()

	// Health
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("health code=%d", rec.Code)
	}

	// Targets status
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/targets", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("targets code=%d", rec.Code)
	}

	// Targets git refs
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/targets/refs", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("targets refs code=%d", rec.Code)
	}

	// Logs snapshot & clear
	h.logs.Emit("info", "runner", "test log line")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/logs", nil))
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("test log line")) {
		t.Fatalf("logs code=%d body=%s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/logs/clear", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("logs clear code=%d", rec.Code)
	}

	// Scenarios
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/scenarios", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("scenarios code=%d", rec.Code)
	}

	// Compare
	body := `{"scenarioIds":["staging-ignore-and-promote"],"pollIntervalMs":30,"reloadDebounceMs":40,"stressRounds":2,"scaleProfile":"small"}`
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/compare", bytes.NewBufferString(body)))
	if rec.Code != http.StatusOK {
		t.Fatalf("compare code=%d body=%s", rec.Code, rec.Body.String())
	}
	var cmp auditor.ComparisonRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &cmp); err != nil {
		t.Fatal(err)
	}
	if cmp.PollingRun.Summary.Passed != 1 {
		t.Fatalf("expected polling passed=1, got %+v", cmp.PollingRun.Summary)
	}

	// Sandbox start -> action -> stop
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/sandbox/start", bytes.NewBufferString(`{"mode":"polling","pollIntervalMs":40}`)))
	if rec.Code != http.StatusOK {
		t.Fatalf("sandbox start code=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/sandbox/action", bytes.NewBufferString(`{"action":"rename-skill"}`)))
	if rec.Code != http.StatusOK {
		t.Fatalf("sandbox action code=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/sandbox/stop", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("sandbox stop code=%d", rec.Code)
	}
}
