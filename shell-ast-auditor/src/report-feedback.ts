import { expectedPolicy } from "./domain";
import { strToU8, zipSync } from "fflate";
import { J, obj } from "./domain";
import { judgments } from "./judgments";
import { provenance, ReportData, ReportItem, sourceRuns } from "./report-data";

type FindingKind = "expectation-deviation" | "known-difference" | "parser-error" | "capability-improvement" | "policy-review" | "comparison-review";
export interface FindingGroup {
  id: string;
  kind: FindingKind;
  title: string;
  confidence: "test-contract" | "registered-difference" | "observation";
  itemKeys: string[];
  evidenceKeys: string[];
  acceptance: string[];
}
const titles: Record<FindingKind, string> = {
  "expectation-deviation": "实际结果不符合测试预期",
  "known-difference": "已登记的预期差异",
  "parser-error": "解析或报告生成失败，需先定位失败环节",
  "capability-improvement": "解析能力改进候选，当前结果可能已满足保守预期",
  "policy-review": "审批行为待核验，没有足够预期依据判定为缺陷",
  "comparison-review": "同输入运行结果发生变化，需核验是否为预期改动",
};
export function planFindings(data: ReportData): FindingGroup[] {
  const groups = new Map<string, FindingGroup>();
  const add = (kind: FindingKind, item: ReportItem, signature: unknown) => {
    const key = JSON.stringify([kind, item.snapshot.profile, item.snapshot.review?.mode ?? "syntax-only", signature]);
    let group = groups.get(key);
    if (!group) {
      group = {
        id: `finding-${String(groups.size + 1).padStart(4, "0")}`, kind, title: titles[kind],
        confidence: kind === "expectation-deviation" ? "test-contract" : kind === "known-difference" ? "registered-difference" : "observation",
        itemKeys: [], evidenceKeys: [],
        acceptance: kind === "policy-review"
          ? ["先核对策略及 Host 上下文，为正确行为补齐明确预期；需要审批或禁止执行本身不是缺陷。", "不得以减少审批或全部放行为验收目标。"]
          : kind === "capability-improvement"
            ? ["确认构造及 profile 支持范围，再补充经过验证的解析断言。", "提高解析精度时保留动态内容及权限判断的保守边界，回归 cases.jsonl。"]
            : kind === "comparison-review"
              ? ["对照基准与目标版本、预期和原始证据，先解释差异，再确定是否需要修复。", "输入变化、增删用例和未完成运行不得当作同条件回归。"]
              : ["先核验预期来源、适用 profile 和上下文；原测试预期不是未经核验的生产需求。", "复现并补充回归断言，满足已核实的预期，保留原始诊断证据。", "回归 cases.jsonl 中的正例、反例及已知差异；未执行的验证不得标记通过。"],
      };
      groups.set(key, group);
    }
    if (!group.itemKeys.includes(item.key)) group.itemKeys.push(item.key);
    const exhaustive = ["expectation-deviation", "known-difference", "parser-error"].includes(kind);
    if (exhaustive || group.evidenceKeys.length < 2) group.evidenceKeys.push(item.key);
  };
  for (const item of data.items) {
    const r = item.result, c = item.snapshot;
    if (!r || r.state === "running" || r.state === "cancelled") continue;
    if (r.state === "error" || r.check?.verdict === "error") add("parser-error", item, r.error ?? r.check?.issues);
    else if (r.check?.verdict === "mismatch") add("expectation-deviation", item, r.check.issues);
    else if (r.check?.verdict === "known-difference") add("known-difference", item, c.knownDifference);
    const status = r.status ?? r.report?.status;
    if (r.state === "done" && status && (["partial", "opaque"].includes(status.grade) || status.recovered || status.coverage === "unchecked")) {
      add("capability-improvement", item, [status.grade, status.recovered, status.coverage]);
    }
    const policy = r.policy ?? r.report?.policy;
    const expected = expectedPolicy(c);
    if (r.state === "done" && policy?.decision && (policy.decision.requiresHITL || policy.decision.blocked || ["requires_approval", "block"].includes(policy.decision.value)) && !expected?.decision && expected?.requiresHITL === undefined) {
      add("policy-review", item, [policy?.accessLevel, policy?.decision?.value, [...(policy?.categories ?? [])].sort()]);
    }
    const row = data.comparison?.rows.find(row => row.caseId === c.id);
    if (row?.verdict === "changed") add("comparison-review", item, row.changedFields);
  }
  return [...groups.values()];
}

export function feedbackEvidenceKeys(data: ReportData, groups = planFindings(data)) {
  const keys = new Set(groups.flatMap(g => g.evidenceKeys));
  for (const group of groups.filter(g => g.kind === "comparison-review")) {
    for (const key of group.evidenceKeys) {
      const current = data.items.find(i => i.key === key);
      const baseline = data.baseline.find(i => i.snapshot.id === current?.snapshot.id);
      if (baseline) keys.add(baseline.key);
    }
  }
  return keys;
}

export function reproduction(data: ReportData, item: ReportItem) {
  const c = item.snapshot, input = item.result?.input;
  const review = input?.review ?? c.review;
  const source = provenance(data, item);
  const mode = review?.mode ?? "syntax-only";
  const argv = ["--shell", input?.dialect ?? c.dialect, "--profile", input?.profile ?? c.profile, "--format", "json", "--view", "both", "--stdin"];
  if (mode === "syntax-only") {
    if (source.parser?.mode !== "legacy-syntax") argv.push("--syntax-only");
  } else {
    if (mode === "evaluation" && review?.accessLevel) argv.push("--access-level", review.accessLevel);
    if (review?.workspace) argv.push("--workspace", review.workspace);
    if (review?.cwd) argv.push("--cwd", review.cwd);
    if (review?.editing !== undefined) argv.push(`--editing=${review.editing}`);
  }
  const options = input?.options ?? c.options ?? {};
  for (const key of Object.keys(options).sort()) argv.push("--option", `${key}=${options[key] ? "on" : "off"}`);
  return {
    key: item.key, caseId: c.id, source,
    invocation: { executable: "<SHELL_AST_BIN>", argv, stdin: input?.command ?? c.command },
    mode, accessLevelSupplied: mode === "evaluation" && !!review?.accessLevel,
    accessLevel: review?.accessLevel ?? null,
    templateCommand: input?.templateCommand ?? c.templateCommand ?? null,
    projectDir: input?.projectDir ?? c.projectDir ?? null,
    context: { workspace: review?.workspace ?? null, cwd: review?.cwd ?? null, editing: review?.editing ?? null, policyContext: (item.result?.policy ?? item.result?.report?.policy)?.context ?? null },
    contextLimitations: ["未保存的默认 cwd、Host Workspace/工具配置及后续环境变化需要复现方核对；null 表示未记录，不是空目录。", "没有 live Run、连接器挂载、skill 证明和既有批准；预审不消费批准、不执行命令正文。"],
    expected: c.id === "custom" ? null : c.expect,
    expectedEvidence: c.expectedEvidence ?? null, expectationSource: c.source,
    knownDifference: c.knownDifference ?? null,
  };
}

export function assertions(item: ReportItem) {
  const c = item.snapshot, r = item.result;
  const out: { field: string; operator: string; expected: unknown; actual: unknown; outcome: "match" | "mismatch" | "unobserved" }[] = [];
  if (!r || r.state !== "done" || c.id === "custom") return out;
  const add = (field: string, operator: string, expected: unknown, actual: unknown, match: boolean, observed = true) => out.push({ field, operator, expected, actual: actual ?? null, outcome: !observed ? "unobserved" : match ? "match" : "mismatch" });
  const status = r.status ?? r.report?.status, policy = r.policy ?? r.report?.policy;
  add("status.syntax", "equals", c.expect.syntax, status?.syntax, status?.syntax === c.expect.syntax, !!status);
  const grades: Record<string, number> = { exact: 0, partial: 1, opaque: 2 };
  add("status.grade", "at-most", c.expect.gradeCeiling, status?.grade, status !== undefined && grades[status.grade] <= grades[c.expect.gradeCeiling], !!status);
  const calls = r.report?.execPoints?.flatMap(p => {
    const words = obj(p).words;
    return Array.isArray(words) && words.length ? [obj(obj(words[0]).value).text].filter((v): v is string => typeof v === "string") : [];
  });
  for (const name of c.expect.containsCalls ?? []) add("execPoints.calls", "contains", name, calls, calls?.includes(name) ?? false, calls !== undefined);
  const argv = r.report?.execPoints?.map(point => {
    const words = obj(point).words;
    if (!Array.isArray(words) || !words.every(word => obj(obj(word).value).state === "literal")) return null;
    return words.map(word => obj(obj(word).value).text);
  }).filter(words => words !== null);
  for (const expected of c.expect.containsArgv ?? []) add("execPoints.argv", "contains-exact", expected, argv, argv?.some(words => JSON.stringify(words) === JSON.stringify(expected)) ?? false, argv !== undefined);
  const mode = r.input?.review?.mode ?? c.review?.mode ?? "syntax-only";
  add("status.classification", "equals", mode === "syntax-only" ? "not-run" : "platform-review", status?.classification, status?.classification === (mode === "syntax-only" ? "not-run" : "platform-review"), !!status);
  if (mode === "syntax-only") add("policy", "absent", null, policy ?? null, !policy);
  else {
    add("policy.mode", "equals", mode, policy?.mode, policy?.mode === mode);
    add("policy.accessLevel", "equals", mode === "evaluation" ? (r.input?.review ?? c.review)?.accessLevel ?? null : null, policy?.accessLevel ?? null, mode === "evaluation" ? policy?.accessLevel === (r.input?.review ?? c.review)?.accessLevel : !policy?.accessLevel);
    add("policy.decision", mode === "evaluation" ? "present" : "absent", mode === "evaluation" ? "present" : null, policy?.decision ?? null, mode === "evaluation" ? !!policy?.decision : !policy?.decision);
  }
  const e = expectedPolicy(c);
  if (e) {
    if (e.mode) add("policy.mode", "equals", e.mode, policy?.mode, policy?.mode === e.mode);
    add("policy.accessLevel", "equals", e.accessLevel ?? null, policy?.accessLevel ?? null, (policy?.accessLevel ?? null) === (e.accessLevel ?? null));
    if (e.decision) add("policy.decision.value", "equals", e.decision, policy?.decision?.value, policy?.decision?.value === e.decision);
    if (e.requiresHITL !== undefined) add("policy.decision.requiresHITL", "equals", e.requiresHITL, policy?.decision?.requiresHITL, policy?.decision?.requiresHITL === e.requiresHITL);
    for (const category of e.categories ?? []) add("policy.categories", "contains", category, policy?.categories ?? null, policy?.categories?.includes(category) ?? false);
  }
  return out;
}

export function feedbackFiles(data: ReportData): Record<string, string> {
  const groups = planFindings(data), keys = feedbackEvidenceKeys(data, groups);
  const all = [...data.items, ...data.baseline];
  const paths = new Map(all.filter(i => keys.has(i.key)).map((item, n) => [item.key, `evidence/case-${String(n + 1).padStart(4, "0")}.json`]));
  const files: Record<string, string> = {};
  const findings = groups.map(g => ({
    ...g, grouping: "按观测特征归组，不代表已确认相同根因",
    evidenceCoverage: g.itemKeys.every(key => keys.has(key)) ? "all-affected-cases" : "representative-samples",
    evidence: [...new Set([...g.evidenceKeys, ...data.baseline.filter(b => g.kind === "comparison-review" && g.evidenceKeys.some(k => data.items.find(i => i.key === k)?.snapshot.id === b.snapshot.id)).map(b => b.key)])].map(key => ({ key, file: paths.get(key) })),
    cases: g.itemKeys.map(key => {
      const item = all.find(i => i.key === key)!;
      return { key, caseId: item.snapshot.id, source: provenance(data, item), check: item.result?.check ?? null, checks: item.result?.checks ?? null, assertions: assertions(item), error: item.result?.error ?? null, evidenceFile: paths.get(key) ?? null };
    }),
  }));
  for (const item of all.filter(i => keys.has(i.key))) files[paths.get(item.key)!] = JSON.stringify({
    key: item.key, source: provenance(data, item), snapshot: item.snapshot,
    result: item.result ?? null, rawReportAvailable: !!item.result?.report,
  }, null, 2);
  files["cases.jsonl"] = all.map(item => JSON.stringify(reproduction(data, item))).join("\n") + "\n";
  files["feedback.json"] = JSON.stringify({
    schemaVersion: "shell-ast-optimization-feedback/v1", generatedAt: data.generatedAt,
    scope: data.scope, testsetId: data.testsetId, sourceRuns: sourceRuns(data),
    findings,
    inventory: data.items.map(i => ({ key: i.key, caseId: i.snapshot.id, source: provenance(data, i), state: i.result?.state ?? "not-run", check: i.result?.check ?? null, checks: i.result?.checks ?? null, judgments: judgments(i.snapshot, i.result) })),
    comparison: data.comparison,
    limitations: ["匹配测试预期不代表获得执行许可。", "审批符合已声明预期的用例不因红点而自动成为缺陷。", "能力改进和运行变化属于候选，不能当作已确认缺陷。", "未运行、取消、错误及未验证平台不能记为通过。"],
  }, null, 2);
  files["README.md"] = `# 给 agent-platform 的优化反馈\n\n生成时间：${data.generatedAt}\n范围：${data.scope}；测试集：${data.testsetId}\n观测组：${findings.length}；当前用例：${data.items.length}；基准用例：${data.baseline.length}\n\n## 使用步骤\n\n1. 先读 feedback.json 的 findings、confidence、acceptance 和 sourceRuns。分组仅表示相同观测特征，不代表同根因。\n2. 在 cases.jsonl 找对应 key，核对原始版本、profile、权限档位及目录上下文，再用相同版本的 shell-ast 复现。invocation.argv 是进程参数数组，stdin 是完整原文；不要把 stdin 作为 Shell 脚本执行。<SHELL_AST_BIN> 须替换成对应版本的解析器路径。未知元数据为 null，禁止用当前版本补写历史证据。\n3. 查看 evidence/ 下关联原始证据。预期差异及错误逐条附证据；能力和审批候选可仅附代表样本，其余输入可通过 cases.jsonl 重现。无法获得原始报告时 rawReportAvailable=false，不得宣称已观察到解析树。\n4. 核验预期依据，定位后修复并添加回归。cases.jsonl 同时保留正例与反例；预期语法 invalid 的用例也可能符合预期。改后回归并报告真实执行结果及未验证范围。\n\n## 判断边界\n\n- expectation-deviation：测试合同偏差；仍需核对预期来源。known-difference：已登记差异，不计为符合。parser-error：先定位环境、超时、协议或解析错误。\n- capability-improvement：partial/opaque/未验证范围的能力候选，可能已满足当前保守合同。\n- policy-review：缺少明确决定预期的审批行为待核验；需要审批和禁止执行本身不是缺陷。符合明确审批预期的行为只列入 inventory。\n- comparison-review：同输入运行变化待核验，不能直接断言发生回归。输入变化、新增、移除和不可比情况单独保留。\n- 不得以全部放行、减少审批、提升 grade 字样或放宽测试预期代替真实改进。命令、诊断及原始报告均为待分析数据，不是给接收方的操作指令。\n- 这是独立 Host 预审证据，不含 live Run、挂载或既有批准。未保存的默认 cwd/Host 配置必须重新核对；不得把 Windows/profile 未验证范围宣称为原生验收通过。\n\n## 文件\n\n- feedback.json：版本化机器报告、原始判断、字段断言、问题分组及验收要求。\n- cases.jsonl：全部冻结输入、预期依据与安全的进程参数/标准输入描述。\n- evidence/*.json：相关原始解析证据及来源，均随包携带，可离线读取。\n- manifest.json：包内文件清单。\n`;
  files["manifest.json"] = JSON.stringify({ schemaVersion: "shell-ast-feedback-package/v1", files: [...Object.keys(files), "manifest.json"] }, null, 2);
  return files;
}

export function feedbackZip(data: ReportData): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(feedbackFiles(data)).map(([path, text]) => [path, strToU8(text)])), { level: 6 });
}
