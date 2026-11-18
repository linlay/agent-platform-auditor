import assert from "node:assert/strict";

// Runs only the diagnostic shell-ast adapter; never executes fixture commands.
const origin = process.env.AUDITOR_URL ?? "http://127.0.0.1:8093";
async function api(path, body) {
  const response = await fetch(origin + path, {
    ...(body === undefined ? {} : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, await (response.ok ? Promise.resolve(path) : response.text()));
  return response.json();
}
const start = await api("/api/runs", {
  testsetId: "powershell-compat",
  kind: "batch",
  review: { mode: "syntax-only" },
});
const deadline = Date.now() + 180_000;
let run;
do {
  run = await api(`/api/runs/${start.id}`);
  if (run.state !== "running") break;
  await new Promise(resolve => setTimeout(resolve, 200));
} while (Date.now() < deadline);
if (run.state === "running") {
  await api(`/api/runs/${start.id}/cancel`, {});
  throw new Error(`Diagnostic run timed out: ${start.id}`);
}
assert.equal(run.state, "completed");
assert.equal(run.cases.length, 210);
assert.equal(Object.keys(run.results).length, 210);
const deviations = [];
for (const c of run.cases) {
  const result = run.results[c.id];
  if (result.state !== "done") {
    deviations.push({ id: c.id, state: result.state, error: result.error });
    continue;
  }
  assert.equal(result.checks.approval.verdict, "not-set", c.id);
  assert.deepEqual(result.check, result.checks.parsing, c.id);
  if (result.checks.parsing.verdict !== "match") {
    deviations.push({ id: c.id, state: result.state, check: result.checks.parsing });
  }
}
console.log(JSON.stringify({
  runId: run.id, counts: run.counts,
  scope: "Local diagnostic parser only; Windows native validation pending",
  deviations,
}, null, 2));
// Persisted raw reports and mismatches remain available in results/runs/<id>.
if (deviations.length) process.exitCode = 1;
