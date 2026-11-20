import { assertCoreParsingRun } from "./core-parsing-check.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
const base=process.env.AUDITOR_URL??"http://127.0.0.1:8093";
async function api(path,body){const r=await fetch(base+path,body===undefined?undefined:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});assert.equal(r.status,200,await(r.ok?Promise.resolve(path):r.text()));return r.json();}
async function completed(body){const start=await api("/api/runs",body);for(let n=0;n<400;n++){const r=await api("/api/runs/"+start.id);if(r.state!=="running"){assert.equal(r.state,"completed");return r;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error("run timeout");}
const core=await completed({testsetId:"shell-core",kind:"batch"});
assertCoreParsingRun(core);
for(const r of Object.values(core.results)){assert.ok(r.checks);assert.equal(r.checks.approval.verdict,"not-evaluated");assert.equal(r.checks.parsing.verdict,r.check.verdict);}
const policy=await completed({testsetId:"policy-smoke",kind:"batch"});
assert.equal(policy.counts.match,9);
for(const r of Object.values(policy.results)){assert.equal(r.checks.parsing.verdict,"match");assert.equal(r.checks.approval.verdict,"match");}
assert.equal(policy.results["policy.ask-node"].policy.decision.value,"requires_approval");
assert.equal(policy.results["policy.readonly-workspace"].policy.decision.value,"block");
const changed=await completed({testsetId:"policy-smoke",caseIds:["policy.readonly-workspace"],kind:"manual",review:{mode:"evaluation",accessLevel:"full_access",editing:true}});
const different=changed.results["policy.readonly-workspace"];
assert.equal(different.checks.parsing.verdict,"match");assert.equal(different.checks.approval.verdict,"mismatch");assert.equal(different.policy.decision.value,"allow");
const detailed=await api(`/api/runs/${changed.id}/cases/policy.readonly-workspace`);
assert.deepEqual(detailed.checks,different.checks);
assert.equal(fs.existsSync("auditor-policy-sentinel"),false);
const evidence={coreRun:core.id,coreCounts:core.counts,policyRun:policy.id,policyCounts:policy.counts,changedRun:changed.id,checks:different.checks,checksVerified:["233 version-5 parsing expectations checked; unresolved upstream gaps remain mismatches; syntax-only does not evaluate approval","9 policy expectations match independently, including HITL and block","unexpected allow fails approval only","summaries and detail agree; input never executed"]};
fs.mkdirSync("artifacts",{recursive:true});fs.writeFileSync("artifacts/checks-validation.json",JSON.stringify(evidence,null,2));console.log("PASS "+JSON.stringify(evidence));
