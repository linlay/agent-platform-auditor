import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const base=process.env.AUDITOR_URL??"http://127.0.0.1:8093";
const levels=["ask_for_approval","auto_approve","full_access"];
async function api(route,body){const r=await fetch(base+route,body===undefined?undefined:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});assert.equal(r.status,200,await(r.ok?Promise.resolve(route):r.text()));return r.json();}
async function completed(body){const start=await api("/api/runs",body);for(let i=0;i<800;i++){const r=await api("/api/runs/"+start.id);if(r.state!=="running"){assert.equal(r.state,"completed");return r;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error("matrix run timed out");}
const sets=await api("/api/testsets");
for(const set of sets)for(const c of set.cases)assert.deepEqual(Object.keys(c.expect.policyByLevel??{}).sort(),[...levels].sort(),c.id+" missing authored level");
const workspace=path.resolve("artifacts/approval-matrix-workspace");fs.mkdirSync(workspace,{recursive:true});
if(!fs.existsSync(path.join(workspace,".git")))execFileSync("git",["init","-q",workspace],{stdio:"pipe"});
const outcomes=[];
for(const level of levels){
 const run=await completed({testsetId:"shell-core",kind:"batch",projectDir:workspace,review:{mode:"evaluation",accessLevel:level,editing:true}});
 assert.equal(run.cases.length,317);
 const counts={},differences=[];
 for(const c of run.cases){const r=run.results[c.id];assert.ok(r.checks,c.id+" missing independent checks");assert.notEqual(r.checks.approval.verdict,"not-set",c.id);assert.notEqual(r.checks.approval.verdict,"not-evaluated",c.id);const v=r.checks.approval.verdict;counts[v]=(counts[v]??0)+1;
  if(v!=="match")differences.push({caseId:c.id,expected:c.expect.policyByLevel[level],actual:r.policy?.decision??null,state:r.state,issues:r.checks.approval.issues,error:r.error??null,basis:c.expect.policyBasis});
 }
 const policy=await completed({testsetId:"policy-smoke",kind:"batch",projectDir:workspace,review:{mode:"evaluation",accessLevel:level}});
 assert.equal(policy.cases.length,6);
 for(const [id,r]of Object.entries(policy.results)){assert.equal(r.checks.approval.verdict,"match",id+"/"+level+": "+r.checks.approval.issues.join(";"));}
 const entry={level,runId:run.id,counts,policyRunId:policy.id,differences};outcomes.push(entry);
 console.log(JSON.stringify({level,runId:run.id,approvalCounts:counts,policyExpectationsMatched:6,differences:differences.map(d=>({id:d.caseId,expected:d.expected.decision,actual:d.actual?.value,state:d.state}))}));
}
assert.equal(fs.existsSync(path.join(workspace,"auditor-policy-sentinel")),false);
fs.writeFileSync("artifacts/approval-matrix-validation.json",JSON.stringify({workspace,expectationSource:"Authored before running from shipped defaults and source rule/semantic review; never captured from these results",nativeWindowsValidated:false,outcomes},null,2));
console.log("Verified 323 cases across all 3 levels; recorded all mismatches without changing expectations.");
