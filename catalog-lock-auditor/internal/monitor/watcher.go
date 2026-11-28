package monitor

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/fsnotify/fsnotify"
)

// nativeWatcher mirrors agent-platform/internal/watch/watch.go using fsnotify.
// On Windows, fsnotify holds open directory handles for each registered directory.
type nativeWatcher struct {
	entry   Entry
	ignore  func(string) bool
	enqueue func(string)

	fsw      *fsnotify.Watcher
	watched  map[string]struct{}
	mu       sync.Mutex
	done     chan struct{}
	commands chan watchCommand
	pending  []fsnotify.Event

	statsMu   sync.Mutex
	errCount  int
	lastError string
}

type watchCommand struct {
	resume bool
	result chan error
}

func startWatcher(ctx context.Context, entry Entry, ignore func(string) bool, enqueue func(string)) (*nativeWatcher, error) {
	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	w := &nativeWatcher{
		entry:    entry,
		ignore:   ignore,
		enqueue:  enqueue,
		fsw:      fsw,
		watched:  make(map[string]struct{}),
		done:     make(chan struct{}),
		commands: make(chan watchCommand),
	}

	_ = w.drainSubscriptions(func() error {
		return w.addTree(entry.Path)
	}, true)

	go w.run(ctx)
	return w, nil
}

func (w *nativeWatcher) Done() <-chan struct{} {
	return w.done
}

func (w *nativeWatcher) Stats() Stats {
	w.mu.Lock()
	watched := len(w.watched)
	w.mu.Unlock()

	w.statsMu.Lock()
	errs := w.errCount
	lastErr := w.lastError
	w.statsMu.Unlock()

	return Stats{
		Mode:        ModeWatcher,
		WatchedDirs: watched,
		Errors:      errs,
		LastError:   lastErr,
	}
}

func (w *nativeWatcher) Suspend() (func() error, error) {
	resume := func() error { return w.command(true) }
	if err := w.command(false); err != nil {
		return nil, errors.Join(err, resume())
	}
	return resume, nil
}

func (w *nativeWatcher) command(resume bool) error {
	cmd := watchCommand{resume: resume, result: make(chan error, 1)}
	select {
	case <-w.done:
		return errors.New("watcher stopped")
	case w.commands <- cmd:
	}
	select {
	case err := <-cmd.result:
		return err
	case <-w.done:
		return errors.New("watcher stopped")
	}
}

func (w *nativeWatcher) recordError(err error) {
	if err == nil {
		return
	}
	w.statsMu.Lock()
	w.errCount++
	w.lastError = err.Error()
	w.statsMu.Unlock()
}

func (w *nativeWatcher) drainDuring(fn func() error) error {
	return w.drainSubscriptions(fn, false)
}

// Windows fsnotify subscription operations wait for the event-delivery goroutine,
// so keep draining Events/Errors while adding or closing watches.
func (w *nativeWatcher) drainSubscriptions(fn func() error, retain bool) error {
	done := make(chan error, 1)
	events, errs := w.fsw.Events, w.fsw.Errors
	go func() { done <- fn() }()
	for {
		select {
		case err := <-done:
			return err
		case event, ok := <-events:
			if !ok {
				events = nil
			} else if retain {
				w.pending = append(w.pending, event)
			}
		case err, ok := <-errs:
			if !ok {
				errs = nil
			} else {
				w.recordError(err)
			}
		}
	}
}

func (w *nativeWatcher) removeAll() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if err := w.fsw.Close(); err != nil {
		return err
	}
	w.watched = make(map[string]struct{})
	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	w.fsw = fsw
	return nil
}

func (w *nativeWatcher) addTree(root string) error {
	cleaned := filepath.Clean(root)
	if _, err := os.Stat(cleaned); os.IsNotExist(err) {
		return nil
	}
	return filepath.WalkDir(cleaned, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			if os.IsNotExist(walkErr) {
				return nil
			}
			return walkErr
		}
		if !d.IsDir() {
			return nil
		}
		if path != cleaned && w.ignore(path) {
			return filepath.SkipDir
		}
		return w.addDir(path)
	})
}

func (w *nativeWatcher) addDir(path string) error {
	path = filepath.Clean(path)
	w.mu.Lock()
	defer w.mu.Unlock()
	if _, ok := w.watched[path]; ok {
		return nil
	}
	if err := w.fsw.Add(path); err != nil {
		return err
	}
	w.watched[path] = struct{}{}
	return nil
}

func (w *nativeWatcher) prune(path string) {
	path = filepath.Clean(path)
	w.mu.Lock()
	defer w.mu.Unlock()
	for dir := range w.watched {
		if dir == path || strings.HasPrefix(dir, path+string(os.PathSeparator)) {
			_ = w.fsw.Remove(dir)
			delete(w.watched, dir)
		}
	}
}

func (w *nativeWatcher) run(ctx context.Context) {
	defer func() {
		w.mu.Lock()
		_ = w.fsw.Close()
		w.watched = make(map[string]struct{})
		w.mu.Unlock()
		close(w.done)
	}()

	suspended := false
	for {
		events := w.fsw.Events
		queued := len(w.pending) > 0
		if queued {
			next := make(chan fsnotify.Event, 1)
			next <- w.pending[0]
			events = next
		}

		select {
		case <-ctx.Done():
			return
		case cmd := <-w.commands:
			if !cmd.resume {
				suspended = true
				w.pending = nil
				cmd.result <- w.drainDuring(w.removeAll)
			} else {
				err := w.drainDuring(func() error { return w.addTree(w.entry.Path) })
				suspended = false
				w.enqueue(w.entry.Reason)
				cmd.result <- err
			}
		case event, ok := <-events:
			if queued {
				w.pending = w.pending[1:]
			}
			if !ok {
				return
			}
			if suspended {
				continue
			}
			if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Remove|fsnotify.Rename) == 0 {
				continue
			}
			changed := filepath.Clean(event.Name)
			if w.ignore(changed) {
				continue
			}
			if event.Op&(fsnotify.Remove|fsnotify.Rename) != 0 {
				_ = w.drainSubscriptions(func() error { w.prune(changed); return nil }, true)
			}
			if event.Op&(fsnotify.Create|fsnotify.Rename) != 0 {
				_ = w.drainSubscriptions(func() error { return w.addTree(changed) }, true)
			}
			if pathWithin(w.entry.Path, changed) {
				w.enqueue(w.entry.Reason)
			}
		case err, ok := <-w.fsw.Errors:
			if !ok {
				return
			}
			w.recordError(err)
			w.enqueue(w.entry.Reason)
		}
	}
}
