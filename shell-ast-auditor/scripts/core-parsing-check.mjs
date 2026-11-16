import assert from "node:assert/strict";

// These are unresolved upstream observations, never alternate expectations.
// Accept a future match, but reject a new failure or a changed failure reason.
const gaps = {
  "powershell.null-conditional": ["syntax 与预期不同"],
  "bash.coproc.macos32": ["syntax 与预期不同"],
  "bash.profile32-coproc": ["缺少调用 coproc", '缺少精确命令参数 ["coproc","cat"]'],
  "bash.profile32-named-fd": ['缺少精确命令参数 ["exec","{fd}"]'],
  "bash.named-fd.macos32": ['缺少精确命令参数 ["exec","{fd}"]'],
};
export function assertCoreParsingRun(run) {
  assert.equal(run.state, "completed");
  assert.equal(Object.keys(run.results).length, run.cases.length);
  for (const c of run.cases) {
    const r = run.results[c.id];
    assert.equal(r.state, "done", c.id);
    const check = r.checks.parsing;
    if (check.verdict === "match") continue;
    if (check.verdict === "known-difference") {
      assert.ok(c.knownDifference, `${c.id}: no declared known difference`);
      continue;
    }
    assert.equal(check.verdict, "mismatch", c.id);
    assert.ok(gaps[c.id], `${c.id}: unexpected parsing failure`);
    assert.deepEqual([...check.issues].sort(), [...gaps[c.id]].sort(), c.id);
  }
}
