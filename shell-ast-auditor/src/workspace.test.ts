import { describe, it, expect } from "vitest";
import { Case, Run, Result } from "./domain";
import {
  mergeWorkspace,
  restoreWorkspace,
  encodeWorkspaces,
  decodeWorkspaces,
  taggedResults,
} from "./workspace";
const c = (id: string): Case => ({
  id,
  command: "echo " + id,
  dialect: "bash",
  profile: "bash-3.2",
  platforms: ["macos"],
  tags: [],
  source: null,
  expect: { syntax: "valid", gradeCeiling: "opaque" },
});
const result = (id: string): Result => ({
  state: "done",
  runId: id,
  check: { verdict: "match", issues: [] },
});
describe("accumulated manual results", () => {
  it("keeps A after parsing B, and rerunning A only replaces A", () => {
    let w = mergeWorkspace({}, [c("a")], { a: result("run-a") });
    w = mergeWorkspace(w, [c("b")], { b: result("run-b") });
    expect(w.a.result.runId).toBe("run-a");
    expect(w.b.result.runId).toBe("run-b");
    w = mergeWorkspace(w, [c("a")], { a: result("run-a2") });
    expect(w.a.result.runId).toBe("run-a2");
    expect(w.b.result.runId).toBe("run-b");
  });
  it("restores source references separately without persisting large raw reports", () => {
    const r = result("run-a");
    r.report = {
      status: {
        syntax: "valid",
        grade: "exact",
        profile: "valid",
        coverage: "complete",
        recovered: false,
        classification: "not-run",
      },
      nativeTree: { kind: "Script" },
    };
    const workspace = mergeWorkspace({}, [c("a")], { a: r });
    const serialized = encodeWorkspaces({ core: workspace });
    expect(serialized).not.toContain("nativeTree");
    const restored = restoreWorkspace(
      [c("a"), c("b")],
      decodeWorkspaces(serialized).core,
    );
    expect(restored.results.a.runId).toBe("run-a");
    expect(restored.results.b).toBeUndefined();
    expect(workspace.a.result.report).toBeDefined();
  });
  it("never carries the previous raw report into a different run", () => {
    const old = result("old");
    old.report = {
      status: {
        syntax: "valid",
        grade: "opaque",
        profile: "unchecked",
        coverage: "complete",
        recovered: false,
        classification: "not-run",
      },
    };
    const w = mergeWorkspace(
      { a: { snapshot: c("a"), result: old } },
      [c("a")],
      { a: result("new") },
    );
    expect(w.a.result.report).toBeUndefined();
  });
  it("keeps testsets separate and honors an explicitly cleared workspace", () => {
    const a = mergeWorkspace({}, [c("a")], { a: result("old") });
    const restored = decodeWorkspaces(encodeWorkspaces({ other: a }));
    expect(restoreWorkspace([c("a")], restored.core ?? {}).results).toEqual({});
    expect(restored.other.a.result.runId).toBe("old");
  });
  it("does not restore an interrupted missing case as still running", () => {
    const run = {
      id: "r",
      state: "interrupted",
      cases: [c("a")],
      results: {},
    } as Run;
    expect(taggedResults(run).a.state).toBe("cancelled");
  });
});
