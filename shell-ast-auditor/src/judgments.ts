import { Case, Check, Result, expectedPolicy } from "./domain";
import { label } from "./ui-labels";
export interface Judgment {
  tone: "red" | "green" | "neutral";
  text: string;
  reason: string;
}
export interface Judgments {
  parsing: Judgment;
  approval: Judgment;
  hasRed: boolean;
}
export function hasApprovalExpectation(c: Case): boolean {
  return c.id !== "custom" && Boolean(c.expect.policy || c.expect.policyByLevel);
}
// Old combined failures cannot be safely attributed to either dimension.
// Full historical results are compared again by the backend when opened.
export function parsingCheck(c: Case, result?: Result): Check | undefined {
  if (result?.checks) return result.checks.parsing;
  const old = result?.check;
  if (!old) return undefined;
  if (!expectedPolicy(c) && (!c.review || c.review.mode === "syntax-only")) return old;
  if (["match", "known-difference"].includes(old.verdict)) return old;
  return undefined;
}
export function approvalCheck(c: Case, result?: Result): Check | undefined {
  if (result?.checks) return result.checks.approval;
  if (!expectedPolicy(c)) return { verdict: c.expect.policyByLevel ? "not-evaluated" : "not-set", issues: [] };
  if (result?.check?.verdict === "match") return { verdict: "match", issues: [] };
  return undefined;
}
function judgment(c: Case, result: Result | undefined, check: Check | undefined, kind: "解析" | "审批"): Judgment {
  if (c.id === "custom") return { tone: "neutral", text: "未设预期", reason: "临时命令没有固定测试预期；实际结果可在详情中查看。" };
  if (result?.state === "error") return { tone: "red", text: kind === "解析" ? "解析失败" : "预审未完成", reason: result.error ?? "本次运行失败，不能比较预期。" };
  if (result?.state === "running") return { tone: "neutral", text: "判断中", reason: "等待本次运行完成。" };
  if (result?.state === "cancelled") return { tone: "neutral", text: "未完成", reason: "本次运行未完成，不能比较预期。" };
  if (!result) return { tone: "neutral", text: "未判断", reason: `此命令尚未完成${kind}判断。` };
  if (!check) return { tone: "neutral", text: "待重新判断", reason: "旧记录尚无独立判断，请打开详情或重新运行。" };
  switch (check.verdict) {
    case "match": return { tone: "green", text: "符合预期", reason: `${kind}结果满足本条用例预先设置的${kind}要求，不是执行许可。` };
    case "mismatch": return { tone: "red", text: "不符合预期", reason: check.issues.join("；") || `${kind}结果与预期不同。` };
    case "known-difference": return { tone: "red", text: "已知差异", reason: "已登记的解析差异仍不计为符合预期。" + check.issues.join("；") };
    case "error": return { tone: "red", text: "判断失败", reason: check.issues.join("；") };
    case "not-set": return { tone: "neutral", text: "未设预期", reason: "本条用例没有设置审批预期，实际允许、需审批或禁止执行均不能据此记为通过。" };
    case "not-evaluated": return { tone: "neutral", text: "未评估审批", reason: "本条用例已声明三档审批预期；请选“评估审批要求”和权限档位后重新运行。" };
    default: return { tone: "neutral", text: "未完成", reason: "本次运行未完成，不能比较预期。" };
  }
}
export function judgments(c: Case, result?: Result): Judgments {
  const parsing = judgment(c, result, parsingCheck(c, result), "解析");
  const approval = judgment(c, result, approvalCheck(c, result), "审批");
  const policy = result?.report?.policy ?? result?.policy;
  if (policy) approval.reason += policy.decision ? ` 实际审批：${label(policy.decision.value)}。${policy.decision.reason}` : " 本次仅分析行为分类。";
  return { parsing, approval, hasRed: parsing.tone === "red" || approval.tone === "red" };
}
