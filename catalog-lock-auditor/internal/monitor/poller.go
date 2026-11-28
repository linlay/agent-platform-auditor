package monitor

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	maxUnsettledScans = 20
	maxPollBackoff    = 30 * time.Second
)

type pollDigest [sha256.Size]byte

type pollCategory struct {
	reported pollDigest
	previous pollDigest
	moving   int
}

// changed waits for two identical metadata digests to settle after writes stop,
// while forcing progress at maxUnsettledScans under continuous mutations.
func (s *pollCategory) changed(current pollDigest) bool {
	stable := current == s.previous
	s.previous = current
	if current == s.reported {
		s.moving = 0
		return false
	}
	s.moving++
	if !stable && s.moving < maxUnsettledScans {
		return false
	}
	s.reported = current
	s.moving = 0
	return true
}

// adaptivePoller mirrors agent-platform's codex/windows-catalog-polling implementation:
// it walks directories ephemerally and retains zero directory handles between scans.
type adaptivePoller struct {
	entry   Entry
	ignore  func(string) bool
	enqueue func(string)

	done   chan struct{}
	scanMu sync.Mutex
	pauses int

	statsMu          sync.Mutex
	scans            int
	lastScanMs       int64
	maxScanMs        int64
	currentBackoffMs int64
	errCount         int
	lastError        string
}

func startPoller(
	ctx context.Context,
	entry Entry,
	interval time.Duration,
	auditInterval time.Duration,
	ignore func(string) bool,
	enqueue func(string),
) (*adaptivePoller, error) {
	started := time.Now()
	baseline, err := scanCatalogMetadata(ctx, entry.Path, ignore)
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	var lastAuditContent pollDigest
	var hasAuditBaseline bool
	if auditInterval > 0 {
		if csum, cErr := scanCatalogContent(ctx, entry.Path, ignore); cErr == nil {
			lastAuditContent = csum
			hasAuditBaseline = true
		}
	}

	p := &adaptivePoller{
		entry:            entry,
		ignore:           ignore,
		enqueue:          enqueue,
		done:             make(chan struct{}),
		currentBackoffMs: interval.Milliseconds(),
	}
	p.recordScan(time.Since(started), interval, err)

	state := pollCategory{reported: baseline, previous: baseline}
	failed := err != nil

	scanChanges := func() {
		current, scanErr := scanCatalogMetadata(ctx, entry.Path, ignore)
		if scanErr != nil {
			if ctx.Err() == nil && !failed {
				p.recordErrOnly(scanErr)
			}
			failed = true
			return
		}
		if state.changed(current) || failed {
			if auditInterval > 0 {
				if csum, cErr := scanCatalogContent(ctx, entry.Path, ignore); cErr == nil {
					lastAuditContent = csum
					hasAuditBaseline = true
				}
			}
			enqueue(entry.Reason)
		}
		failed = false
	}

	auditContent := func() {
		if auditInterval <= 0 {
			return
		}
		csum, cErr := scanCatalogContent(ctx, entry.Path, ignore)
		if cErr != nil {
			return
		}
		if !hasAuditBaseline || csum != lastAuditContent {
			lastAuditContent = csum
			hasAuditBaseline = true
			enqueue(entry.Reason)
		}
	}

	go p.run(ctx, interval, auditInterval, scanChanges, auditContent)
	return p, nil
}

func (p *adaptivePoller) Done() <-chan struct{} {
	return p.done
}

func (p *adaptivePoller) Suspend() (func() error, error) {
	p.scanMu.Lock()
	p.pauses++
	p.scanMu.Unlock()
	return func() error {
		p.scanMu.Lock()
		p.pauses--
		p.scanMu.Unlock()
		p.enqueue(p.entry.Reason)
		return nil
	}, nil
}

func (p *adaptivePoller) Stats() Stats {
	p.statsMu.Lock()
	defer p.statsMu.Unlock()
	return Stats{
		Mode:             ModePolling,
		WatchedDirs:      0, // Poller retains 0 persistent directory handles between scans.
		Scans:            p.scans,
		LastScanMs:       p.lastScanMs,
		MaxScanMs:        p.maxScanMs,
		CurrentBackoffMs: p.currentBackoffMs,
		Errors:           p.errCount,
		LastError:        p.lastError,
	}
}

func (p *adaptivePoller) recordScan(cost, next time.Duration, err error) {
	ms := cost.Milliseconds()
	p.statsMu.Lock()
	defer p.statsMu.Unlock()
	p.scans++
	p.lastScanMs = ms
	if ms > p.maxScanMs {
		p.maxScanMs = ms
	}
	p.currentBackoffMs = next.Milliseconds()
	if err != nil {
		p.errCount++
		p.lastError = err.Error()
	}
}

func (p *adaptivePoller) recordErrOnly(err error) {
	if err == nil {
		return
	}
	p.statsMu.Lock()
	p.errCount++
	p.lastError = err.Error()
	p.statsMu.Unlock()
}

func computeNextInterval(base, cost time.Duration) time.Duration {
	return min(maxPollBackoff, max(base, 10*cost))
}

func (p *adaptivePoller) run(ctx context.Context, interval, auditInterval time.Duration, scan, audit func()) {
	defer close(p.done)
	timer := time.NewTimer(interval)
	defer timer.Stop()

	var auditC <-chan time.Time
	if auditInterval > 0 {
		ticker := time.NewTicker(auditInterval)
		defer ticker.Stop()
		auditC = ticker.C
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-auditC:
			p.scanMu.Lock()
			if p.pauses == 0 {
				audit()
			}
			p.scanMu.Unlock()
		case <-timer.C:
			p.scanMu.Lock()
			started := time.Now()
			if p.pauses == 0 {
				scan()
			}
			cost := time.Since(started)
			next := computeNextInterval(interval, cost)
			if p.pauses == 0 {
				p.recordScan(cost, next, nil)
			}
			p.scanMu.Unlock()
			timer.Reset(next)
		}
	}
}

func scanCatalogContent(ctx context.Context, root string, ignore func(string) bool) (pollDigest, error) {
	var zero pollDigest
	h := sha256.New()
	fileDigest := sha256.New()
	buf := make([]byte, 32*1024)
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if walkErr != nil {
			if path == root && errors.Is(walkErr, os.ErrNotExist) {
				return nil
			}
			return walkErr
		}
		if path != root && ignore(path) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		fmt.Fprintf(h, "%q:%d:", path, info.Mode())
		if !info.Mode().IsRegular() {
			_, _ = io.WriteString(h, "\n")
			return nil
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		fileDigest.Reset()
		n, err := io.CopyBuffer(fileDigest, struct{ io.Reader }{f}, buf)
		if err != nil {
			return err
		}
		fmt.Fprintf(h, "%d:%x\n", n, fileDigest.Sum(nil))
		return nil
	})
	if err != nil {
		return zero, err
	}
	var sum pollDigest
	h.Sum(sum[:0])
	return sum, nil
}

func scanCatalogMetadata(ctx context.Context, root string, ignore func(string) bool) (pollDigest, error) {
	var zero pollDigest
	h := sha256.New()
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if walkErr != nil {
			if path == root && errors.Is(walkErr, os.ErrNotExist) {
				return nil
			}
			return walkErr
		}
		if path != root && ignore(path) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		var size, mtime int64
		if !d.IsDir() {
			size = info.Size()
			mtime = info.ModTime().UnixNano()
		}
		fmt.Fprintf(h, "%q:%d:%d:%d\n", path, info.Mode(), size, mtime)
		return nil
	})
	if err != nil {
		return zero, err
	}
	var sum pollDigest
	h.Sum(sum[:0])
	return sum, nil
}
