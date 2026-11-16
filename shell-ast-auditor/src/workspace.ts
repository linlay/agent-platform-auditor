import { Case, Result, Run } from "./domain";
export interface SavedCase {
  snapshot: Case;
  result: Result;
}
export type Workspace = Record<string, SavedCase>;
export type Workspaces = Record<string, Workspace>;
export const workspaceKey = "shell-ast-auditor.manual-results.v1";
export function taggedResults(run: Run): Record<string, Result> {
  return Object.fromEntries(
    (run.cases ?? []).map((c) => [
      c.id,
      {
        ...(run.results[c.id] ??
          (run.state === "running"
            ? { state: "running" as const }
            : {
                state: "cancelled" as const,
                check: {
                  verdict: "not-run",
                  issues: ["此条在批次结束前未完成"],
                },
              })),
        runId: run.id,
      },
    ]),
  );
}
export function mergeWorkspace(
  old: Workspace,
  cases: Case[],
  updates: Record<string, Result>,
): Workspace {
  const next = { ...old };
  for (const c of cases) {
    const incoming = updates[c.id];
    if (!incoming || c.id === "custom") continue;
    const previous = old[c.id]?.result;
    next[c.id] = {
      snapshot: c,
      result: {
        ...incoming,
        ...(incoming.runId &&
        incoming.runId === previous?.runId &&
        incoming.state === "done" &&
        previous.report
          ? { report: previous.report }
          : {}),
      },
    };
  }
  return next;
}
export function restoreWorkspace(cases: Case[], workspace: Workspace) {
  const results: Record<string, Result> = {};
  const snapshots = cases.map((c) => {
    const saved = workspace[c.id];
    if (!saved) return c;
    results[c.id] = saved.result;
    return saved.snapshot;
  });
  return { cases: snapshots, results };
}
export function encodeWorkspaces(sets: Workspaces): string {
  const summaries = Object.fromEntries(
    Object.entries(sets).map(([id, set]) => [
      id,
      Object.fromEntries(
        Object.entries(set).map(([caseId, entry]) => [
          caseId,
          {
            snapshot: entry.snapshot,
            result: { ...entry.result, report: undefined },
          },
        ]),
      ),
    ]),
  );
  return JSON.stringify({ version: 1, sets: summaries });
}
export function decodeWorkspaces(raw: string | null): Workspaces {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      data.version !== 1 ||
      !("sets" in data) ||
      !data.sets ||
      typeof data.sets !== "object"
    )
      return {};
    const sets: Workspaces = {};
    for (const [id, records] of Object.entries(data.sets)) {
      if (!records || typeof records !== "object") continue;
      const set: Workspace = {};
      for (const [caseId, value] of Object.entries(records)) {
        if (
          !value ||
          typeof value !== "object" ||
          !("snapshot" in value) ||
          !("result" in value)
        )
          continue;
        const { snapshot, result } = value as SavedCase;
        if (
          snapshot?.id !== caseId ||
          typeof snapshot.command !== "string" ||
          !Array.isArray(snapshot.tags) ||
          !Array.isArray(snapshot.platforms) ||
          !snapshot.expect ||
          !["done", "running", "error", "cancelled"].includes(result?.state)
        )
          continue;
        set[caseId] = { snapshot, result };
      }
      sets[id] = set;
    }
    return sets;
  } catch {
    return {};
  }
}
