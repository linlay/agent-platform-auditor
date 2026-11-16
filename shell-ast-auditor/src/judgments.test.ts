import { describe, it, expect } from "vitest";
import { judgments } from "./judgments";
import { Case, Check, Policy, Result } from "./domain";
const c: Case = {id:"one",command:"node --version",dialect:"bash",profile:"bash-3.2",platforms:["macos"],tags:[],source:null,expect:{syntax:"valid",gradeCeiling:"opaque",policy:{mode:"evaluation",decision:"requires_approval"}}};
const match: Check = {verdict:"match",issues:[]};
const mismatch: Check = {verdict:"mismatch",issues:["审批决定不符"]};
const policy = (value: string): Policy => ({mode:"evaluation",categories:[],context:"test",syntaxSource:"test",engine:"test",decision:{value,requiresHITL:value==="requires_approval",blocked:value==="block",autoApproved:value==="auto_approved",disposition:"test",reason:"实际决定"}});
const done = (parsing=match,approval=match,value="requires_approval"):Result => ({state:"done",checks:{parsing,approval},check:approval,policy:policy(value)});
describe("independent expected judgments",()=>{
 it("marks an expected approval request or block green without authorizing execution",()=>{
  for(const value of ["requires_approval","block"]){
   const j=judgments(c,done(match,match,value));
   expect(j.parsing.text).toBe("符合预期"); expect(j.approval.text).toBe("符合预期"); expect(j.hasRed).toBe(false); expect(j.approval.reason).toContain("实际审批");
  }
 });
 it("keeps parsing green when only approval differs, including an unexpected allow",()=>{
  const j=judgments(c,done(match,mismatch,"allow"));
  expect(j.parsing.tone).toBe("green");expect(j.approval.tone).toBe("red");expect(j.hasRed).toBe(true);
 });
 it("keeps approval green when only parsing differs",()=>{
  const j=judgments(c,done(mismatch,match));expect(j.parsing.tone).toBe("red");expect(j.approval.tone).toBe("green");
 });
 it("does not infer expectations from actual allow, auto, block or manual approval",()=>{
  for(const value of ["allow","auto_approved","block","requires_approval"]){
   const j=judgments({...c,expect:{syntax:"valid",gradeCeiling:"opaque"}},done(match,{verdict:"not-set",issues:[]},value));
   expect(j.approval.text).toBe("未设预期");expect(j.approval.tone).toBe("neutral");expect(j.hasRed).toBe(false);
  }
 });
 it("does not pass missing, running, cancelled, custom or ambiguous legacy failures",()=>{
  for(const r of [undefined,{state:"running"} as Result,{state:"cancelled"} as Result,{state:"done",check:mismatch} as Result])expect(judgments(c,r).approval.tone).toBe("neutral");
  expect(judgments({...c,id:"custom"},done()).parsing.text).toBe("未设预期");
  expect(judgments(c,{state:"error",error:"failed"}).hasRed).toBe(true);
 });
 it("retains known syntax differences as parsing errors independent of approval",()=>{
  const j=judgments(c,done({verdict:"known-difference",issues:["syntax"]},match));expect(j.parsing.tone).toBe("red");expect(j.approval.tone).toBe("green");
 });
});

it("selects declared expectations using the requested tier, and keeps unevaluated matrices neutral",()=>{
 const matrix={ask_for_approval:{mode:"evaluation",accessLevel:"ask_for_approval",decision:"requires_approval"},auto_approve:{mode:"evaluation",accessLevel:"auto_approve",decision:"auto_approved"},full_access:{mode:"evaluation",accessLevel:"full_access",decision:"allow"}};
 for(const level of ["ask_for_approval","auto_approve","full_access"] as const){
  const tc={...c,review:{mode:"evaluation" as const,accessLevel:level},expect:{...c.expect,policyByLevel:matrix}};
  const result=done(match,match,matrix[level].decision);
  expect(judgments(tc,result).approval.text).toBe("符合预期");
 }
 const tc={...c,review:undefined,expect:{syntax:"valid",gradeCeiling:"opaque",policyByLevel:matrix}};
 const j=judgments(tc,{state:"done",checks:{parsing:match,approval:{verdict:"not-evaluated",issues:[]}}});
 expect(j.approval.text).toBe("未评估审批");expect(j.approval.tone).toBe("neutral");
});
