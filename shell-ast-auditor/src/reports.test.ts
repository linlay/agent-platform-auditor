import { describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { Case, Result, Run, Status } from "./domain";
import { collectReportData, loadReportEvidence, provenance, rawReport, ReportData, ReportItem } from "./report-data";
import { assertions, feedbackEvidenceKeys, feedbackFiles, feedbackZip, planFindings, reproduction } from "./report-feedback";
import { humanReport } from "./report-html";

const tc = (id = "one"): Case => ({ id, command: "echo 中文", dialect: "bash", profile: "bash-3.2", platforms: ["macos"], tags: [], source: { file: "test-definition" }, expectedEvidence: "native syntax fixture", expect: { syntax: "valid", gradeCeiling: "opaque", containsCalls: ["echo"] } });
const status: Status = { syntax: "valid", grade: "exact", recovered: false, profile: "bash-3.2", coverage: "complete", classification: "not-run" };
const done = (): Result => ({ state: "done", checks: { parsing: { verdict: "match", issues: [] }, approval: { verdict: "not-set", issues: [] } }, check: { verdict: "match", issues: [] }, status: { ...status } });
const full = (): Result => ({ ...done(), report: { status: { ...status }, nativeTree: { HUGE_TREE: true }, execPoints: [{ words: [{ value: { text: "echo" } }] }] } });
function run(id: string, cases: Case[], results: Record<string, Result>): Run {
  return { id, kind: "manual", testsetId: "set", testsetVersion: id, testsetHash: `hash-${id}`, parserSha256: `sha-${id}`, parser: { sha256: `sha-${id}`, mode: "syntax-only", sourceCommit: `commit-${id}`, sourceDirty: false, supportsPolicy: true }, host: "darwin/arm64", state: "completed", startedAt: "2026-11-16T00:00:00Z", cases, results, counts: {} };
}
const item = (c = tc(), r: Result | undefined = done()): ReportItem => ({ key: `current:r:${c.id}`, side: "current", runId: "r", snapshot: c, result: r });
const data = (items: ReportItem[]): ReportData => ({ schemaVersion: "shell-ast-audit-export/v1", generatedAt: "2026-11-16T00:00:00Z", scope: "accumulated", testsetId: "set", testsetTitle: "测试集", items, baseline: [], runs: { r: run("r", items.map(i => i.snapshot), Object.fromEntries(items.filter(i => i.result).map(i => [i.snapshot.id, i.result!]))) } });

describe("frozen export sources", () => {
  it("exports a free input independently of testsets and preserves its own parser provenance", async () => {
    const c = tc("custom"), r = full();
    c.command = "printf '%s' 中文\nnode --version";
    r.parser = { sha256: "free-sha", sourceDirty: false, mode: "syntax-only", supportsPolicy: true };
    r.input = { command: c.command, projectDir: "/original-free-directory", review: { mode: "classification", cwd: "/original-free-cwd" } };
    const read = vi.fn();
    const d = await collectReportData({ scope: "free", testsetId: "free", testsetTitle: "自由测试", cases: [c], results: { custom: r } }, read);
    expect(read).not.toHaveBeenCalled();
    expect(d.items).toHaveLength(1);
    expect(provenance(d, d.items[0]).parserSha256).toBe("free-sha");
    expect(reproduction(d, d.items[0]).invocation.stdin).toBe(c.command);
    expect(reproduction(d, d.items[0]).expected).toBeNull();
    expect(rawReport(d).cases[0].expect).toBeNull();
    expect(humanReport(d)).toContain("自由测试");
    expect(humanReport(d)).not.toContain("单用例累计结果");
  });
  it("recovers each retained result from its original version and does not use edited case definitions", async () => {
    const a = tc("a"), b = tc("b");
    const runs = { a: run("a", [a], { a: done() }), b: run("b", [b], { b: done() }) };
    const read = vi.fn(async (id: string) => runs[id as keyof typeof runs]);
    const d = await collectReportData({ scope: "accumulated", testsetId: "set", testsetTitle: "测试集", cases: [{ ...a, command: "changed" }, b, tc("unrun")], results: { a: { ...done(), runId: "a" }, b: { ...done(), runId: "b" } } }, read);
    expect(d.items).toHaveLength(2);
    expect(d.items[0].snapshot.command).toBe(a.command);
    expect(provenance(d, d.items[0]).parser?.sourceCommit).toBe("commit-a");
    expect(provenance(d, d.items[1]).parser?.sourceCommit).toBe("commit-b");
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("fails when an original run is missing, and never fabricates the current version for local results", async () => {
    await expect(collectReportData({ scope: "accumulated", testsetId: "set", testsetTitle: "set", cases: [tc()], results: { one: { ...done(), runId: "gone" } } }, async () => { throw Error("missing source"); })).rejects.toThrow("missing source");
    const d = data([item()]); d.items[0].runId = undefined;
    expect(provenance(d, d.items[0]).parser).toBeNull();
  });
  it("exports all cases of the selected batch and both versions of a comparison", async () => {
    const a = tc("a"), b = tc("b"), target = run("target", [a, b], { a: done() }), base = run("base", [tc("removed"), a], { a: done() });
    const request = { scope: "batch" as const, testsetId: "set", testsetTitle: "set", cases: [a], results: {}, runId: "target" };
    const batch = await collectReportData(request, async () => target);
    expect(batch.items).toHaveLength(2);
    expect(batch.items[1].result?.state).toBe("cancelled");
    const d = await collectReportData({ ...request, scope: "comparison", comparison: { id: "compare", kind: "runs", baseRunId: "base", targetRunId: "target", counts: {}, rows: [] } }, async id => id === "base" ? base : target);
    expect(d.baseline.map(i => i.snapshot.id)).toEqual(["removed", "a"]);
    expect(Object.keys(d.runs)).toEqual(["target", "base"]);
  });
});

describe("optimization feedback", () => {
  it("does not treat an expected approval request or block as a defect", () => {
    for (const decision of ["requires_approval", "block"]) {
      const c = tc(); c.review = { mode: "evaluation", accessLevel: "ask_for_approval" }; c.expect.policy = { mode: "evaluation", accessLevel: "ask_for_approval", decision };
      const r = done(); r.checks!.approval = { verdict: "match", issues: [] }; r.status!.classification = "platform-review";
      r.policy = { mode: "evaluation", accessLevel: "ask_for_approval", categories: [], context: "Host", syntaxSource: "platform", engine: "production", decision: { value: decision, requiresHITL: decision === "requires_approval", blocked: decision === "block", autoApproved: false, disposition: "hitl", reason: "expected behavior" } };
      const d = data([item(c, r)]);
      expect(planFindings(d)).toEqual([]);
      delete c.expect.policy;
      expect(planFindings(d).map(f => f.kind)).toEqual(["policy-review"]);
      expect(planFindings(d)[0].confidence).toBe("observation");
    }
  });
  it("keeps capability candidates separate, limits sample evidence, and excludes unfinished results", () => {
    const items = Array.from({ length: 5 }, (_, n) => { const r = done(); r.status!.grade = "opaque"; return item(tc(`c-${n}`), r); });
    items.push(item(tc("pending"), { state: "running" }), item(tc("cancelled"), { state: "cancelled" }));
    const d = data(items), groups = planFindings(d);
    expect(groups).toHaveLength(1); expect(groups[0].kind).toBe("capability-improvement");
    expect(groups[0].itemKeys).toHaveLength(5); expect(feedbackEvidenceKeys(d).size).toBe(2);
  });
  it("exports exact stdin, omitted access level, options and explicit context without shell interpolation", () => {
    const c = tc(); c.command = "printf '%s\\n' \"$HOME\"\r\n\t中文  \n"; c.options = { z: false, a: true };
    let i = item(c); const d = data([i]);
    let repro = reproduction(d, i);
    expect(repro.invocation.stdin).toBe(c.command); expect(repro.invocation.argv).toContain("--syntax-only");
    expect(repro.invocation.argv.slice(-4)).toEqual(["--option", "a=on", "--option", "z=off"]);
    c.review = { mode: "classification", cwd: "/path with space", editing: false };
    repro = reproduction(d, i);
    expect(repro.accessLevelSupplied).toBe(false); expect(repro.invocation.argv).not.toContain("--access-level");
    expect(repro.invocation.argv).not.toContain("--syntax-only"); expect(repro.invocation.argv).toContain("/path with space"); expect(repro.invocation.argv).toContain("--editing=false");
    c.review = { mode: "evaluation", accessLevel: "auto_approve" };
    expect(reproduction(d, i).invocation.argv).toContain("auto_approve");
  });
  it("includes field-level failed assertions and raw evidence for every expectation deviation", async () => {
    const r = done(); r.check = { verdict: "mismatch", issues: ["缺少调用 echo"] };
    const d = data([item(tc(), r)]), read = vi.fn(async () => ({ ...full(), check: r.check }));
    await loadReportEvidence(d, feedbackEvidenceKeys(d), read);
    d.items[0].result!.report!.execPoints = [];
    expect(assertions(d.items[0]).find(a => a.field === "execPoints.calls")).toMatchObject({ expected: "echo", actual: [], outcome: "mismatch" });
    const files = feedbackFiles(d), feedback = JSON.parse(files["feedback.json"]);
    expect(feedback.findings[0].confidence).toBe("test-contract");
    expect(files[feedback.findings[0].cases[0].evidenceFile]).toContain("HUGE_TREE");
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("includes baseline raw evidence for changed inputs only when the comparison is comparable", () => {
    const current = item(), baseline = { ...item(), key: "baseline:old:one", side: "baseline" as const, runId: "old" };
    const d = data([current]); d.baseline = [baseline]; d.comparison = { id: "compare", kind: "runs", baseRunId: "old", targetRunId: "r", counts: {}, rows: [{ caseId: "one", command: "echo", verdict: "changed", changedFields: ["structure"] }] };
    expect(feedbackEvidenceKeys(d).has(baseline.key)).toBe(true);
    d.comparison.rows[0].verdict = "input-changed";
    expect(planFindings(d)).toHaveLength(0);
  });
  it("produces a self-contained ZIP with resolvable evidence references and reproduction cases", () => {
    const r = full(); r.status!.grade = "opaque"; const d = data([item(tc(), r)]);
    const archive = unzipSync(feedbackZip(d));
    const manifest = JSON.parse(strFromU8(archive["manifest.json"]));
    expect(manifest.files.sort()).toEqual(Object.keys(archive).sort());
    const feedback = JSON.parse(strFromU8(archive["feedback.json"]));
    for (const finding of feedback.findings) for (const e of finding.evidence) expect(archive[e.file]).toBeDefined();
    expect(JSON.parse(strFromU8(archive["cases.jsonl"]).trim()).invocation.stdin).toBe("echo 中文");
    expect(strFromU8(archive["README.md"])).toContain("不要把 stdin 作为 Shell 脚本执行");
  });
});

describe("human and full reports", () => {
  it("shows historical replacement/workspace/cwd directly in a visible HTML table", () => {
    const c = tc();
    c.projectDir = "/today/mapping";
    c.review = { mode: "classification", workspace: "/today/workspace", cwd: "/today/cwd" };
    const r = full();
    r.input = { command: c.command, projectDir: "/original/mapping", review: { mode: "classification", workspace: "/original/workspace", cwd: "/original/cwd" } };
    const html = humanReport(data([item(c, r)]));
    const visible = html.match(/<table id="directory-contexts">[\s\S]*?<\/table>/)?.[0];
    expect(visible).toContain("<code>/original/mapping</code>");
    expect(visible).toContain("<code>/original/workspace</code>");
    expect(visible).toContain("<code>/original/cwd</code>");
    expect(visible).not.toContain("/today/");
    expect(html).toContain('href="#directory-config-1"');
  });
  it("keeps mixed directory configurations separate and identifies missing defaults", () => {
    const a = tc("a"), b = tc("b");
    a.projectDir = "/first"; a.review = { mode: "classification", workspace: "/first", cwd: "/first" };
    b.projectDir = "/second"; b.review = { mode: "classification", workspace: "/second" };
    const html = humanReport(data([item(a), item(b)]));
    expect(html).toContain('id="directory-config-1"');
    expect(html).toContain('id="directory-config-2"');
    expect(html).toContain('href="#directory-config-2"');
    expect(html).toContain("未记录（使用运行时默认值）");
    const unconfigured = done();
    unconfigured.input = { command: "echo test", projectDir: "", review: { mode: "classification" } };
    expect(humanReport(data([item(tc(), unconfigured)]))).toContain("<code>未启用替换</code>");
    expect(humanReport(data([item()]))).toContain("不适用（仅解析语法）");
  });
  it("omits raw trees from HTML, escapes hostile command text and retains source versions", () => {
    const c = tc(); c.command = '</pre><img src=x onerror="alert(1)"><script>bad()</script>';
    const d = data([item(c, full())]), html = humanReport(d);
    expect(html).not.toContain("HUGE_TREE"); expect(html).not.toContain("<img src=x"); expect(html).toContain("&lt;img");
    expect(html).toContain("解析符合预期 1"); expect(html).toContain("审批符合预期 0");
    expect(html).toContain("commit-r"); expect(html).toContain('id="red-only"');
    const raw = rawReport(d);
    expect(raw.results.one?.report?.nativeTree).toEqual({ HUGE_TREE: true });
    expect(raw.sourceRuns.r.parser?.sourceCommit).toBe("commit-r");
  });
});

describe("exact argv feedback evidence", () => {
  it("reports lost operands and does not accept symbolic text as literal argv", () => {
    const c = tc(); c.expect.containsCalls = ["exec"]; c.expect.containsArgv = [["exec", "{fd}"]];
    const r = full();
    r.report!.execPoints = [{ words: [{ value: { state: "literal", text: "exec" } }] }];
    const i = item(c, r);
    expect(assertions(i).find(a => a.field === "execPoints.argv")).toMatchObject({ outcome: "mismatch", expected: ["exec", "{fd}"] });
    r.report!.execPoints = [{ words: [{ value: { state: "literal", text: "exec" } }, { value: { state: "symbolic", text: "{fd}" } }] }];
    expect(assertions(i).find(a => a.field === "execPoints.argv")?.outcome).toBe("mismatch");
    r.report!.execPoints = [{ words: [{ value: { state: "literal", text: "exec" } }, { value: { state: "literal", text: "{fd}" } }] }];
    expect(assertions(i).find(a => a.field === "execPoints.argv")?.outcome).toBe("match");
    delete r.report;
    expect(assertions(i).find(a => a.field === "execPoints.argv")?.outcome).toBe("unobserved");
  });
});
