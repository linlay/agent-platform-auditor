package auditor

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"runtime"
	"strings"
	"syscall"
	"testing"
	"time"

	"catalog-lock-auditor/internal/monitor"
)

func TestWaitVerifiedRejectsFalseSuccess(t *testing.T) {
	for _, tc := range []struct {
		name   string
		reason string
		old    bool
		check  stateCheck
	}{
		{"old event", "skills", true, func(context.Context) error { return nil }},
		{"wrong category", "agents", false, func(context.Context) error { return nil }},
		{"stale API despite reload", "skills", false, func(context.Context) error { return errors.New("still v1") }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			after := time.Now()
			when := after
			if tc.old {
				when = after.Add(-time.Second)
			}
			events := make(chan monitor.ReloadEvent, 1)
			events <- monitor.ReloadEvent{Reason: tc.reason, Timestamp: when}
			if err := waitVerified(context.Background(), events, "skills", after, 60*time.Millisecond, tc.check); err == nil {
				t.Fatal("false pass")
			}
		})
	}
}

func TestWaitVerifiedWaitsForLatestState(t *testing.T) {
	after := time.Now()
	events := make(chan monitor.ReloadEvent, 1)
	events <- monitor.ReloadEvent{Reason: "skills", Timestamp: after}
	calls := 0
	err := waitVerified(context.Background(), events, "skills", after, time.Second, func(context.Context) error {
		calls++
		if calls < 3 {
			return errors.New("old version")
		}
		return nil
	})
	if err != nil || calls < 3 {
		t.Fatalf("err=%v calls=%d", err, calls)
	}
}

func TestQuietObservationRejectsClosedOrCanceledStream(t *testing.T) {
	events := make(chan monitor.ReloadEvent)
	close(events)
	if _, err := observe(context.Background(), events, time.Second); err == nil {
		t.Fatal("closed stream passed as silence")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := observe(ctx, make(chan monitor.ReloadEvent), time.Second); !errors.Is(err, context.Canceled) {
		t.Fatalf("err=%v", err)
	}
	events = make(chan monitor.ReloadEvent, 4)
	for i := 0; i < 4; i++ {
		events <- monitor.ReloadEvent{Reason: "skills"}
	}
	counts, err := observe(context.Background(), events, 20*time.Millisecond)
	if err != nil || counts["skills"] != 4 {
		t.Fatalf("counts=%v err=%v", counts, err)
	}
}

func TestAPIAssertionsRejectMalformedAndStaleResponses(t *testing.T) {
	for _, tc := range []struct {
		name, body     string
		absent, wantOK bool
	}{
		{"invalid JSON", `not-json`, true, false},
		{"missing data", `{}`, true, false},
		{"error envelope", `{"code":500,"data":{"skills":[]}}`, true, false},
		{"missing collection", `{"data":{}}`, true, false},
		{"wrong type", `{"data":{"skills":{}}}`, true, false},
		{"wrong object", `{"data":{"skills":[{"id":"other","description":"v2","status":"ready"}]}}`, false, false},
		{"old content", `{"data":{"skills":[{"id":"demo","description":"v1","status":"ready"}]}}`, false, false},
		{"invalid object", `{"data":{"skills":[{"id":"demo","description":"v2","status":"invalid"}]}}`, false, false},
		{"missing status", `{"data":{"skills":[{"id":"demo","description":"v2"}]}}`, false, false},
		{"duplicate object", `{"data":{"skills":[{"id":"demo","description":"v2","status":"ready"},{"id":"demo","description":"v2","status":"ready"}]}}`, false, false},
		{"deleted still present", `{"data":{"skills":[{"id":"demo"}]}}`, true, false},
		{"latest", `{"code":200,"data":{"skills":[{"id":"demo","description":"v2","status":"ready"}]}}`, false, true},
		{"deleted", `{"code":200,"data":{"skills":[]}}`, true, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(tc.body)) }))
			defer srv.Close()
			mon := &platformMonitor{proc: &platformProcess{apiURL: srv.URL}}
			err := apiRow(mon, "skills", "demo", "description", "v2", tc.absent)(context.Background())
			if (err == nil) != tc.wantOK {
				t.Fatalf("err=%v wantOK=%t", err, tc.wantOK)
			}
		})
	}
}

func TestVerdictDoesNotHideFailedStepsBehindLowerHandles(t *testing.T) {
	watcher := RunSummary{Total: 9, Passed: 8, Failed: 1, TotalLockErrors: 0, MaxHandleDelta: 100}
	polling := RunSummary{Total: 9, Passed: 9, Failed: 0, TotalLockErrors: 0, MaxHandleDelta: 0}
	got := buildVerdict(EngineBuiltin, watcher, polling)
	if !strings.Contains(got, "Watcher 失败 1 项") {
		t.Fatalf("misleading watcher failure verdict: %s", got)
	}
	pollingFail := RunSummary{Total: 9, Passed: 8, Failed: 1, TotalLockErrors: 0, MaxHandleDelta: 0}
	gotPollFail := buildVerdict(EngineBuiltin, watcher, pollingFail)
	if !strings.Contains(gotPollFail, "Polling 存在失败步骤") {
		t.Fatalf("misleading polling failure verdict: %s", gotPollFail)
	}
}

func TestOnlyWindowsSharingErrorsCountAsLocks(t *testing.T) {
	for _, err := range []error{
		os.ErrNotExist,
		os.ErrPermission,
		context.Canceled,
		syscall.Errno(5),
		&os.PathError{Op: "open", Path: "demo", Err: syscall.Errno(5)},
		&os.PathError{Op: "stat", Path: "demo", Err: syscall.Errno(5)},
	} {
		var res ScenarioResult
		addLockError(&res, nil, monitor.ModeWatcher, "test", err)
		if res.LockErrors != 0 {
			t.Fatalf("misclassified %v", err)
		}
	}
	if runtime.GOOS == "windows" {
		for _, lockErr := range []error{
			&os.PathError{Op: "rename", Path: "demo", Err: syscall.Errno(32)},
			&os.LinkError{Op: "rename", Old: "a", New: "b", Err: syscall.Errno(5)},
			&os.PathError{Op: "remove", Path: "a", Err: syscall.Errno(5)},
		} {
			var res ScenarioResult
			addLockError(&res, nil, monitor.ModeWatcher, "test", lockErr)
			if res.LockErrors != 1 {
				t.Fatalf("missed lock error for %v", lockErr)
			}
		}
	}
}
