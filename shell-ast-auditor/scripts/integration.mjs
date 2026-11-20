import { assertCoreParsingRun } from "./core-parsing-check.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
assert.equal(
  fs.existsSync("auditor-policy-sentinel"),
  false,
  "sentinel path must be absent before test",
);
const origin = process.env.AUDITOR_URL ?? "http://127.0.0.1:8093";
async function api(path, body) {
  const r = await fetch(
    origin + path,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  assert.equal(r.status, 200, await (r.ok ? Promise.resolve(path) : r.text()));
  return r.json();
}
async function run(testsetId, checkDuplicate = false) {
  const start = await api("/api/runs", { testsetId });
  if (checkDuplicate) {
    const child = spawnSync("bin/auditor", [], {
      encoding: "utf8",
      timeout: 5000,
      env: { ...process.env, AUDITOR_ADDR: new URL(origin).host },
    });
    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stderr, /already running/);
    const active = await api("/api/runs/" + start.id);
    assert.notEqual(
      active.state,
      "interrupted",
      "duplicate startup changed active run",
    );
  }
  for (;;) {
    const run = await api("/api/runs/" + start.id);
    if (run.state !== "running") {
      assert.equal(run.state, "completed");
      return run;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}
const sets = await api("/api/testsets");
assert.ok(sets.some((x) => x.id === "policy-smoke"));
assert.equal(sets.find((x) => x.id === "shell-core").cases.length, 233);
assert.equal(sets.find((x) => x.id === "smoke").cases.length, 5);
assert.equal(sets.find((x) => x.id === "windows-core").cases.length, 166);
assert.equal(sets.find((x) => x.id === "windows-smoke").cases.length, 3);
for (const set of sets) {
  const windows = set.cases[0].platforms.includes("windows");
  assert.ok(set.cases.every(c => c.platforms.every(p => windows ? p === "windows" : p === "macos" || p === "linux")), set.id);
}
const health = await api("/api/health");
assert.equal(health.app, "shell-ast-auditor");
assert.equal(health.parser.mode, "syntax-only");
const previous = (await api("/api/runs")).find(
  (r) =>
    r.testsetId === "shell-core" &&
    r.state === "completed" &&
    r.parserSha256 !== health.parser.sha256 &&
    r.counts.match === 313,
);
const core = await run("shell-core", true);
assert.equal(core.parser.mode, "syntax-only");
assert.equal(core.parserSha256, health.parser.sha256);
assertCoreParsingRun(core);
assert.equal(Object.keys(core.results).length, 233);
const windows = await run("windows-core");
assertCoreParsingRun(windows);
const windowsSmoke = await run("windows-smoke");
assertCoreParsingRun(windowsSmoke);
let versionComparison;
if (previous) {
  versionComparison = await api("/api/comparisons", {
    baseRunId: previous.id,
    targetRunId: core.id,
  });
  assert.equal(
    versionComparison.rows.filter(row => row.verdict === "input-changed" || row.verdict === "unchanged" || (row.verdict === "changed" && row.changedFields?.every(field => field === "expectation"))).length,
    core.cases.filter(c => previous.cases.some(old => old.id === c.id)).length,
    "syntax-only adapter changed the retained macOS/Linux report results",
  );
}
const policy = await run("policy-smoke");
assert.equal(policy.counts.match, 9, JSON.stringify(policy.results, null, 2));
const classify = await api(
  "/api/runs/" + policy.id + "/cases/policy.classify-node",
);
assert.equal(classify.report.status.classification, "platform-review");
assert.equal(classify.report.policy.mode, "classification");
assert.equal(classify.report.policy.decision, undefined);
assert.equal(classify.report.policy.accessLevel, undefined);
const auto = await api("/api/runs/" + policy.id + "/cases/policy.auto-node");
assert.equal(auto.report.policy.accessLevel, "auto_approve");
assert.equal(auto.report.policy.decision.value, "auto_approved");
const overrideStart = await api("/api/runs", {
  testsetId: "smoke",
  caseIds: ["bash.pipeline"],
  review: { mode: "classification" },
});
let overridden;
do {
  overridden = await api("/api/runs/" + overrideStart.id);
  if (overridden.state === "running")
    await new Promise((r) => setTimeout(r, 100));
} while (overridden.state === "running");
assert.equal(overridden.cases[0].review.mode, "classification");
assert.equal(overridden.results["bash.pipeline"].policy.mode, "classification");
const a = await run("smoke");
const b = await run("smoke");
assertCoreParsingRun(a);
assertCoreParsingRun(b);
const comparison = await api("/api/comparisons", {
  baseRunId: a.id,
  targetRunId: b.id,
});
assert.equal(comparison.counts.unchanged, 5);
const restored = await api("/api/comparisons/" + comparison.id);
assert.equal(restored.rows.length, 5);
const expectations = await api("/api/comparisons/expectations-" + core.id);
assert.deepEqual(expectations.counts, core.counts);
const report = await api("/api/runs/" + core.id + "/cases/bash.pipeline");
assert.equal(report.report.consumer, "diagnostic");
assert.equal(report.report.status.classification, "not-run");
assert.ok(report.report.nativeTree);
assert.equal(report.report.policy, undefined);
assert.equal(report.check.verdict, "match");
const cancel = await api("/api/runs", { testsetId: "shell-core" });
await api("/api/runs/" + cancel.id + "/cancel", {});
let cancelled;
do {
  cancelled = await api("/api/runs/" + cancel.id);
  if (cancelled.state === "running")
    await new Promise((r) => setTimeout(r, 100));
} while (cancelled.state === "running");
assert.equal(cancelled.state, "cancelled");
assert.ok(cancelled.counts["not-run"] > 0);
assert.equal(
  fs.existsSync("auditor-policy-sentinel"),
  false,
  "a test command was executed",
);
console.log(
  JSON.stringify(
    {
      parser: health.parser,
      coreRun: core.id,
      versionComparison: versionComparison
        ? {
            id: versionComparison.id,
            base: previous.id,
            counts: versionComparison.counts,
          }
        : null,
      duplicateStartup: "passed; exit 0, no run recovery",
      coreCounts: core.counts,
      windowsRun: windows.id,
      windowsCounts: windows.counts,
      windowsSmokeRun: windowsSmoke.id,
      policyRun: policy.id,
      policyCounts: policy.counts,
      overrideRun: overridden.id,
      smokeRuns: [a.id, b.id],
      comparison: comparison.id,
      comparisonCounts: comparison.counts,
      cancelledRun: cancel.id,
    },
    null,
    2,
  ),
);
