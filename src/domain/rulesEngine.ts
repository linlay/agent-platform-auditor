import type { AuditIssue, JsonObject, JsonValue, ParsedRecord, Strictness } from "./types";
import { getRules, isSchemaRegistryLoaded } from "./schemaRegistry";
import { isPlainObject, makeIssue, shortJson, valueAtPath } from "./utils";

interface RulesFile {
  recordRules?: Rule[];
  crossRecordRules?: Rule[];
}

interface Rule {
  op?: string;
  whenType?: string[];
  severity?: "error" | "warning" | "info";
  code?: string;
  title?: string;
  path?: string;
  expected?: string;
  left?: string | string[];
  right?: string;
  arrayPath?: string;
  fields?: string[];
  typesExpectingLiveSeq?: string[];
  skipMissingTypes?: string[];
}

export function evaluateJsonl(records: ParsedRecord[], strictness: Strictness): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!isSchemaRegistryLoaded()) return issues;

  const rules = (getRules("jsonl") || {}) as RulesFile;
  (rules.recordRules ?? []).forEach((rule) => {
    records.forEach((rec) => {
      if (!rec || rec.kind !== "jsonl" || !isPlainObject(rec.data) || rec.parseError) return;
      applyRecordRule(rule, rec, issues, strictness);
    });
  });
  (rules.crossRecordRules ?? []).forEach((rule) => applyCrossRecordRule(rule, records, issues));

  return issues;
}

function applyRecordRule(rule: Rule, rec: ParsedRecord, issues: AuditIssue[], strictness: Strictness): void {
  const data = rec.data as JsonObject;
  const type = jsonlType(data);
  if (rule.whenType && !rule.whenType.includes(type)) return;

  if (rule.op === "legacyStep") applyLegacyStepRule(rule, rec, issues);
  if (rule.op === "sumEquals") applySumEqualsRule(rule, rec, issues);
  if (rule.op === "lessThanOrEqual") applyLessThanOrEqualRule(rule, rec, issues);
  if (rule.op === "forbiddenAny") applyForbiddenAnyRule(rule, rec, issues, strictness);
}

function applyLegacyStepRule(rule: Rule, rec: ParsedRecord, issues: AuditIssue[]): void {
  const data = rec.data as JsonObject;
  if (jsonlType(data) !== "step") return;
  issues.push(
    makeIssue(
      rule.severity || "info",
      "LEGACY_STEP",
      "旧格式 step 记录",
      rec.index,
      "_type",
      "query|react|plan-execute|submit|planning",
      "step",
      "_type=step 是旧格式，建议升级到新格式"
    )
  );
  if (data._stage) {
    issues.push(makeIssue("info", "LEGACY_FIELD", "旧字段 _stage", rec.index, "_stage", "stage (string)", `_stage=${shortJson(data._stage)}`, "旧字段 _stage，建议使用 stage"));
  }
  if (data._seq !== undefined) {
    issues.push(makeIssue("info", "LEGACY_FIELD", "旧字段 _seq", rec.index, "_seq", "seq (number)", `_seq=${shortJson(data._seq)}`, "旧字段 _seq，建议使用 seq"));
  }
}

function applySumEqualsRule(rule: Rule, rec: ParsedRecord, issues: AuditIssue[]): void {
  if (!Array.isArray(rule.left) || !rule.right) return;
  let sum = 0;
  for (const left of rule.left) {
    const value = valueAtPath(rec.data, left);
    if (typeof value !== "number") return;
    sum += value;
  }
  const right = valueAtPath(rec.data, rule.right);
  if (typeof right !== "number" || sum === right) return;
  issues.push(
    makeIssue(
      rule.severity || "warning",
      rule.code || "SUM_MISMATCH",
      rule.title || "数值合计不匹配",
      rec.index,
      rule.path || rule.right,
      rule.expected || rule.left.join(" + "),
      `${rule.left.join(" + ")} = ${sum} != ${rule.right}=${right}`,
      "totalTokens 不等于 promptTokens+completionTokens"
    )
  );
}

function applyLessThanOrEqualRule(rule: Rule, rec: ParsedRecord, issues: AuditIssue[]): void {
  if (!rule.left || !rule.right) return;
  const leftPath = Array.isArray(rule.left) ? rule.left[0] : rule.left;
  const left = valueAtPath(rec.data, leftPath);
  const right = valueAtPath(rec.data, rule.right);
  if (typeof left !== "number" || typeof right !== "number" || left <= right) return;
  issues.push(
    makeIssue(
      rule.severity || "warning",
      rule.code || "VALUE_OUT_OF_RANGE",
      rule.title || "值超出范围",
      rec.index,
      rule.path || leftPath,
      `<= ${rule.right}=${right}`,
      `${leftPath}=${left}`,
      `实际大小 ${left} 超过最大限制 ${right}`
    )
  );
}

function applyForbiddenAnyRule(rule: Rule, rec: ParsedRecord, issues: AuditIssue[], _strictness: Strictness): void {
  if (!rule.arrayPath || !rule.fields) return;
  const arr = valueAtPath(rec.data, rule.arrayPath);
  if (!Array.isArray(arr)) return;

  arr.forEach((item, i) => {
    if (!isPlainObject(item)) return;
    rule.fields!.forEach((field) => {
      if (item[field] === undefined) return;
      const path = `${rule.arrayPath}[${i}].${field}`;
      issues.push(
        makeIssue(
          rule.severity || "info",
          rule.code || "FORBIDDEN_FIELD",
          rule.title || "存在旧字段",
          rec.index,
          path,
          rule.expected || "field removed",
          "nested cursor",
          "新平台将 liveSeq 保存在 JSONL 顶层，awaiting payload 会移除 seq/liveSeq"
        )
      );
    });
  });
}

function applyCrossRecordRule(rule: Rule, records: ParsedRecord[], issues: AuditIssue[]): void {
  if (rule.op === "liveSeqByRun") applyLiveSeqByRunRule(rule, records, issues);
  if (rule.op === "reactToolSeqMatchesPreviousReact") applyReactToolSeqMatchesPreviousReactRule(rule, records, issues);
}

function applyReactToolSeqMatchesPreviousReactRule(rule: Rule, records: ParsedRecord[], issues: AuditIssue[]): void {
  const lastReactByRun: Record<string, { idx: number; seq: number }> = {};

  records.forEach((rec, idx) => {
    if (!rec || rec.kind !== "jsonl" || !isPlainObject(rec.data) || rec.parseError) return;
    const runId = rec.data.runId;
    if (typeof runId !== "string" || !runId) return;

    const type = jsonlType(rec.data);
    const seq = rec.data.seq;
    if (type === "react") {
      if (isPositiveInteger(seq)) lastReactByRun[runId] = { idx, seq };
      return;
    }

    if (type !== "react-tool" || !isPositiveInteger(seq)) return;

    const prevReact = lastReactByRun[runId];
    if (!prevReact) {
      issues.push(
        makeIssue(
          rule.severity || "error",
          rule.code || "REACT_TOOL_SEQ_MISMATCH",
          rule.title || "react-tool seq 未匹配上个 react",
          idx,
          rule.path || "seq",
          rule.expected || "previous react seq",
          shortJson(seq),
          `runId=${runId} 的 react-tool.seq=${seq} 找不到之前的 react.seq`
        )
      );
      return;
    }

    if (seq !== prevReact.seq) {
      issues.push(
        makeIssue(
          rule.severity || "error",
          rule.code || "REACT_TOOL_SEQ_MISMATCH",
          rule.title || "react-tool seq 未匹配上个 react",
          idx,
          rule.path || "seq",
          `react.seq=${prevReact.seq} at record ${prevReact.idx}`,
          shortJson(seq),
          `runId=${runId} 的 react-tool.seq=${seq} 应等于上个 react.seq=${prevReact.seq}`
        )
      );
    }
  });
}

function applyLiveSeqByRunRule(rule: Rule, records: ParsedRecord[], issues: AuditIssue[]): void {
  const groups: Record<string, { idx: number; rec: ParsedRecord }[]> = {};
  records.forEach((rec, i) => {
    if (!rec || rec.kind !== "jsonl" || !isPlainObject(rec.data) || rec.parseError) return;
    const runId = rec.data.runId;
    if (typeof runId !== "string" || !runId) return;
    groups[runId] ||= [];
    groups[runId].push({ idx: i, rec });
  });

  Object.entries(groups).forEach(([runId, group]) => validateLiveSeqGroup(rule, runId, group, issues));
}

function validateLiveSeqGroup(rule: Rule, runId: string, group: { idx: number; rec: ParsedRecord }[], issues: AuditIssue[]): void {
  let prevLiveSeq = 0;
  const seen: Record<string, number> = {};
  const expectTypes = rule.typesExpectingLiveSeq ?? [];
  const skipMissing = rule.skipMissingTypes ?? [];

  group.forEach(({ idx, rec }) => {
    if (!isPlainObject(rec.data)) return;
    const type = jsonlType(rec.data);
    const liveSeq = rec.data.liveSeq;
    if (liveSeq === undefined) {
      if (skipMissing.includes(type)) return;
      if (expectTypes.includes(type)) {
        issues.push(makeIssue(rule.severity || "warning", "MISSING_LIVESEQ", "缺少顶层 liveSeq", idx, "liveSeq", "number (run 内 cursor)", "undefined", `runId=${runId} 的 _type=${type} 记录应包含顶层 liveSeq`));
      }
      return;
    }
    if (typeof liveSeq !== "number") {
      issues.push(makeIssue("error", "TYPE_MISMATCH", "liveSeq 类型错误", idx, "liveSeq", "number", typeof liveSeq, "liveSeq 应为数字"));
      return;
    }
    if (!Number.isInteger(liveSeq) || liveSeq <= 0) {
      return;
    }
    if (seen[String(liveSeq)] !== undefined) {
      issues.push(makeIssue("error", "LIVESEQ_DUPLICATE", "run 内 liveSeq 重复", idx, "liveSeq", "unique per run", shortJson(liveSeq), `runId=${runId} 的 liveSeq=${liveSeq} 已在记录 ${seen[String(liveSeq)]} 出现`));
    }
    if (liveSeq <= prevLiveSeq) {
      issues.push(makeIssue("error", "LIVESEQ_DECREASE", "run 内 liveSeq 非递增", idx, "liveSeq", `> ${prevLiveSeq}`, shortJson(liveSeq), `runId=${runId} 的 liveSeq 从 ${prevLiveSeq} 降到 ${liveSeq}`));
    }
    seen[String(liveSeq)] = idx;
    if (liveSeq > prevLiveSeq) prevLiveSeq = liveSeq;
  });
}

function jsonlType(data: JsonObject): string {
  const type = data._type;
  return typeof type === "string" ? type : "unknown";
}

function isPositiveInteger(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
