package loghub

import (
	"sync"
	"time"
)

const maxEntries = 400

// Entry represents a structured live log event streamed to the web UI.
type Entry struct {
	Seq     int64     `json:"seq"`
	Time    time.Time `json:"time"`
	Level   string    `json:"level"`  // info | ok | warn | error | reload | platform
	Source  string    `json:"source"` // build | runner | watcher | polling | sandbox
	Message string    `json:"message"`
}

// Hub maintains a bounded ring buffer of log entries and broadcasts new entries to subscribers.
type Hub struct {
	mu      sync.Mutex
	nextSeq int64
	entries []Entry
	subs    map[chan Entry]struct{}
}

// New creates a Hub instance.
func New() *Hub {
	return &Hub{
		subs: make(map[chan Entry]struct{}),
	}
}

// Emit appends a log entry and delivers it non-blockingly to active subscribers.
func (h *Hub) Emit(level, source, message string) {
	if h == nil || message == "" {
		return
	}
	h.mu.Lock()
	h.nextSeq++
	ev := Entry{
		Seq:     h.nextSeq,
		Time:    time.Now(),
		Level:   level,
		Source:  source,
		Message: message,
	}
	h.entries = append(h.entries, ev)
	if len(h.entries) > maxEntries {
		h.entries = append([]Entry(nil), h.entries[len(h.entries)-maxEntries:]...)
	}
	for ch := range h.subs {
		select {
		case ch <- ev:
		default:
		}
	}
	h.mu.Unlock()
}

// Snapshot returns a copy of buffered log entries in chronological order.
func (h *Hub) Snapshot() []Entry {
	if h == nil {
		return []Entry{}
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	out := make([]Entry, len(h.entries))
	copy(out, h.entries)
	return out
}

// Clear empties buffered entries without resetting monotonic sequence numbers.
func (h *Hub) Clear() {
	if h == nil {
		return
	}
	h.mu.Lock()
	h.entries = nil
	h.mu.Unlock()
}

// Subscribe registers a live log channel and returns an unsubscribe cleanup function.
func (h *Hub) Subscribe() (<-chan Entry, func()) {
	ch := make(chan Entry, 64)
	if h == nil {
		close(ch)
		return ch, func() {}
	}
	h.mu.Lock()
	h.subs[ch] = struct{}{}
	h.mu.Unlock()

	var once sync.Once
	cancel := func() {
		once.Do(func() {
			h.mu.Lock()
			delete(h.subs, ch)
			close(ch)
			h.mu.Unlock()
		})
	}
	return ch, cancel
}
