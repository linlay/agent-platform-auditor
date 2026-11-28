package monitor

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Mode selects the filesystem monitoring strategy.
type Mode string

const (
	ModeWatcher Mode = "watcher"
	ModePolling Mode = "polling"
)

// Entry binds a catalog directory root to a logical reload reason.
type Entry struct {
	Path   string
	Reason string
}

// Options configures a Manager instance.
type Options struct {
	PollInterval  time.Duration
	AuditInterval time.Duration
	Debounce      time.Duration
	Ignore        func(path string) bool
}

// Stats captures point-in-time operational telemetry for a monitor backend.
type Stats struct {
	Mode             Mode   `json:"mode"`
	WatchedDirs      int    `json:"watchedDirs"`
	Scans            int    `json:"scans"`
	LastScanMs       int64  `json:"lastScanMs"`
	MaxScanMs        int64  `json:"maxScanMs"`
	CurrentBackoffMs int64  `json:"currentBackoffMs"`
	Errors           int    `json:"errors"`
	LastError        string `json:"lastError,omitempty"`
}

// ReloadEvent represents a debounced catalog reload trigger produced by a monitor.
type ReloadEvent struct {
	Reason    string    `json:"reason"`
	Timestamp time.Time `json:"timestamp"`
	Source    Mode      `json:"source"`
}

// Backend is implemented by both native fsnotify watchers and adaptive pollers.
type Backend interface {
	Suspend() (resume func() error, err error)
	Done() <-chan struct{}
	Stats() Stats
}

// Manager coordinates multiple catalog roots under one monitor mode and debounces reload signals.
type Manager struct {
	mode     Mode
	backends map[string]Backend // keyed by reason
	entries  []Entry
	events   chan ReloadEvent
	done     chan struct{}

	mu      sync.Mutex
	pending map[string]struct{}
	wake    chan struct{}
}

// Start creates and starts a catalog monitor manager using either Watcher or Polling mode.
func Start(ctx context.Context, mode Mode, entries []Entry, opts Options) (*Manager, error) {
	if mode != ModeWatcher && mode != ModePolling {
		return nil, fmt.Errorf("unsupported monitor mode: %q", mode)
	}
	if opts.Debounce <= 0 {
		opts.Debounce = 150 * time.Millisecond
	}
	if opts.PollInterval <= 0 {
		opts.PollInterval = 500 * time.Millisecond
	}
	if opts.Ignore == nil {
		opts.Ignore = DefaultIgnore
	}

	m := &Manager{
		mode:     mode,
		backends: make(map[string]Backend, len(entries)),
		entries:  append([]Entry(nil), entries...),
		events:   make(chan ReloadEvent, 256),
		done:     make(chan struct{}),
		pending:  make(map[string]struct{}),
		wake:     make(chan struct{}, 1),
	}

	enqueue := func(reason string) {
		m.mu.Lock()
		m.pending[reason] = struct{}{}
		m.mu.Unlock()
		select {
		case m.wake <- struct{}{}:
		default:
		}
	}

	for _, entry := range entries {
		var (
			backend Backend
			err     error
		)
		if mode == ModePolling {
			backend, err = startPoller(ctx, entry, opts.PollInterval, opts.AuditInterval, opts.Ignore, enqueue)
		} else {
			backend, err = startWatcher(ctx, entry, opts.Ignore, enqueue)
		}
		if err != nil {
			// Best effort: stop already started backends on partial start failure.
			return nil, err
		}
		m.backends[entry.Reason] = backend
	}

	go m.runCoordinator(ctx, opts.Debounce)
	return m, nil
}

func (m *Manager) runCoordinator(ctx context.Context, debounce time.Duration) {
	defer func() {
		for _, b := range m.backends {
			<-b.Done()
		}
		close(m.done)
		close(m.events)
	}()

	var timer *time.Timer
	var tick <-chan time.Time
	defer func() {
		if timer != nil {
			timer.Stop()
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.wake:
			if tick == nil {
				timer = time.NewTimer(debounce)
				tick = timer.C
			}
		case <-tick:
			tick = nil
			m.mu.Lock()
			pending := m.pending
			m.pending = make(map[string]struct{})
			m.mu.Unlock()
			for _, entry := range m.entries {
				if _, ok := pending[entry.Reason]; !ok {
					continue
				}
				ev := ReloadEvent{
					Reason:    entry.Reason,
					Timestamp: time.Now(),
					Source:    m.mode,
				}
				select {
				case m.events <- ev:
				default:
				}
			}
		}
	}
}

// Events returns the debounced reload stream.
func (m *Manager) Events() <-chan ReloadEvent {
	return m.events
}

// Done closes after all backend goroutines and the coordinator have exited.
func (m *Manager) Done() <-chan struct{} {
	return m.done
}

// Suspend pauses monitoring for the named reason and returns a resume hook.
func (m *Manager) Suspend(reason string) (func() error, error) {
	b, ok := m.backends[reason]
	if !ok {
		return func() error { return nil }, nil
	}
	return b.Suspend()
}

// Stats aggregates metrics across all monitored roots.
func (m *Manager) Stats() Stats {
	out := Stats{Mode: m.mode}
	for _, b := range m.backends {
		s := b.Stats()
		out.WatchedDirs += s.WatchedDirs
		out.Scans += s.Scans
		if s.LastScanMs > out.LastScanMs {
			out.LastScanMs = s.LastScanMs
		}
		if s.MaxScanMs > out.MaxScanMs {
			out.MaxScanMs = s.MaxScanMs
		}
		if s.CurrentBackoffMs > out.CurrentBackoffMs {
			out.CurrentBackoffMs = s.CurrentBackoffMs
		}
		out.Errors += s.Errors
		if s.LastError != "" {
			out.LastError = s.LastError
		}
	}
	return out
}

// DefaultIgnore skips transient staging, install-copy, and VCS paths.
func DefaultIgnore(path string) bool {
	cleaned := filepath.Clean(path)
	base := filepath.Base(cleaned)
	if base == "." || base == string(filepath.Separator) {
		return false
	}
	if strings.HasPrefix(base, ".") {
		// Allow single "." only, skip ".skill-import-staging", ".install-*", ".publishing-*", ".git", etc.
		return true
	}
	if base == "node_modules" {
		return true
	}
	lower := strings.ToLower(base)
	return strings.HasSuffix(lower, ".tmp") || strings.HasSuffix(lower, ".swp") || strings.HasSuffix(lower, "~")
}

func pathWithin(root, target string) bool {
	if strings.TrimSpace(root) == "" {
		return false
	}
	rel, err := filepath.Rel(filepath.Clean(root), filepath.Clean(target))
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}
