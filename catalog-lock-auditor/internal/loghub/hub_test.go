package loghub

import (
	"fmt"
	"testing"
	"time"
)

func TestHubPubSubRingAndClear(t *testing.T) {
	hub := New()
	ch, cancel := hub.Subscribe()
	defer cancel()

	hub.Emit("info", "build", "starting build")
	select {
	case ev := <-ch:
		if ev.Seq != 1 || ev.Level != "info" || ev.Source != "build" || ev.Message != "starting build" {
			t.Fatalf("unexpected event: %+v", ev)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for subscribed log")
	}

	for i := 0; i < maxEntries+25; i++ {
		hub.Emit("platform", "watcher", fmt.Sprintf("line %d", i))
	}
	snap := hub.Snapshot()
	if len(snap) != maxEntries {
		t.Fatalf("snapshot len=%d, want %d", len(snap), maxEntries)
	}
	if snap[0].Message != "line 25" {
		t.Fatalf("oldest retained = %q, want line 25", snap[0].Message)
	}

	hub.Clear()
	if len(hub.Snapshot()) != 0 {
		t.Fatal("expected empty snapshot after Clear")
	}
}
