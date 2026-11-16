import { CompactSelect } from "./CompactSelect";
import { label } from "./ui-labels";
import { Tag } from "./Tag";
import { Comparison, Run } from "./domain";
import { api } from "./api";
import { ReactNode } from "react";
interface Props {
  runs: Run[];
  baseId: string;
  setBaseId: (id: string) => void;
  targetId: string;
  setTargetId: (id: string) => void;
  comparisons: Comparison[];
  comparison?: Comparison;
  setComparison: (c: Comparison) => void;
  makeComparison: () => Promise<void>;
  exportControl: ReactNode;
  setFatal: (s: string) => void;
  onCase: (runId: string, caseId: string) => void;
}
export function ComparisonPanel({
  runs,
  baseId,
  setBaseId,
  targetId,
  setTargetId,
  comparisons,
  comparison,
  setComparison,
  makeComparison,
  exportControl,
  setFatal,
  onCase,
}: Props) {
  return (
    <section className="comparison">
      <h2>对比结果集</h2>
      <p>
        预期对比：当次实际结果 ↔ 当次预期快照。运行对比：基准运行 ↔
        目标运行。输入变化、未运行和解析错误单独列出，不算通过。
      </p>
      <div className="actions">
        <CompactSelect
          aria-label="基准运行"
          value={baseId}
          onChange={(e) => setBaseId(e.target.value)}
        >
          <option value="">基准运行</option>
          {runs
            .filter((r) => r.state !== "running" && r.kind !== "manual")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} / {r.testsetId} / parser {r.parserSha256.slice(0, 8)}
              </option>
            ))}
        </CompactSelect>
        <CompactSelect
          aria-label="目标运行"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">目标运行</option>
          {runs
            .filter((r) => r.state !== "running" && r.kind !== "manual")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} / {r.testsetId} / parser {r.parserSha256.slice(0, 8)}
              </option>
            ))}
        </CompactSelect>
        <button
          disabled={!baseId || !targetId}
          onClick={() => void makeComparison()}
        >
          生成运行对比
        </button>
        {exportControl}
      </div>
      <CompactSelect
        aria-label="历史对比"
        value={comparison?.id ?? ""}
        onChange={(e) =>
          api<Comparison>("/api/comparisons/" + e.target.value)
            .then(setComparison)
            .catch((e) => setFatal(String(e)))
        }
      >
        <option value="">选择已保存的对比报告</option>
        {[
          ...(comparison && !comparisons.some((c) => c.id === comparison.id)
            ? [comparison]
            : []),
          ...comparisons,
        ].map((c) => (
          <option value={c.id} key={c.id}>
            {c.id} / {c.kind === "expectations" ? "预期对比" : "运行对比"}
          </option>
        ))}
      </CompactSelect>
      {comparison && (
        <>
          <h3>
            {comparison.kind === "expectations"
              ? "实际结果对预期"
              : "两次运行对比"}{" "}
            · {comparison.id}
          </h3>
          <p>
            {comparison.baseRunId ?? "预期快照"} → {comparison.targetRunId}
          </p>
          <div className="chips">
            {Object.entries(comparison.counts).map(([k, v]) => (
              <Tag key={k} code={k} text={`${label(k)}：${v}`} />
            ))}
          </div>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>用例与命令</th>
                  <th>对比结论</th>
                  <th>
                    {comparison.kind === "expectations" ? "预期" : "基准"}
                  </th>
                  <th>目标 / 问题</th>
                  <th>变化字段</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.caseId}>
                    <td>
                      <button
                        onClick={() => {
                          onCase(
                            row.verdict === "removed"
                              ? (comparison.baseRunId ?? comparison.targetRunId)
                              : comparison.targetRunId,
                            row.caseId,
                          );
                        }}
                      >
                        {row.caseId}
                      </button>
                      <code>{row.command}</code>
                    </td>
                    <td>
                      <Tag code={row.verdict} />
                      {comparison.kind === "expectations" && row.after?.state === "done" && row.after.checks && (
                        <div>
                          {(["parsing", "approval"] as const).map((kind) => {
                            const check = row.after!.checks![kind];
                            return <Tag key={kind} code={check.verdict} text={`${kind === "parsing" ? "解析" : "审批"}：${label(check.verdict)}`} tone={check.verdict === "match" ? "success" : ["mismatch", "error", "known-difference"].includes(check.verdict) ? "danger" : "neutral"} />;
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      {row.expected ? (
                        <>
                          {label(row.expected.syntax)} · 解析上限{" "}
                          {label(row.expected.gradeCeiling)}
                          <small>
                            {row.expected.policy && (
                              <span>
                                预审：{label(row.expected.policy.mode)} /{" "}
                                {label(
                                  row.expected.policy.accessLevel ??
                                    "未设置权限",
                                )}{" "}
                                /{" "}
                                {label(
                                  row.expected.policy.decision ?? "无决定预期",
                                )}
                                <br />
                              </span>
                            )}
                            {row.expected.policyByLevel && <span>三档预期：{Object.entries(row.expected.policyByLevel).map(([level,p]) => `${label(level)}=${label(p.decision ?? "缺少预期")}`).join("；")}<br /></span>}
                            必要调用：
                            {row.expected.containsCalls?.join(", ") ?? "—"}
                          </small>
                        </>
                      ) : (
                        <>
                          {label(row.before?.status?.syntax ?? "—")} /{" "}
                          {label(row.before?.status?.grade ?? "—")}
                        </>
                      )}
                    </td>
                    <td>
                      {label(row.after?.status?.syntax ?? "—")} /{" "}
                      {label(row.after?.status?.grade ?? "—")}
                      <small>
                        {row.after?.policy && (
                          <span>
                            预审：{label(row.after.policy.mode)} /{" "}
                            {label(
                              row.after.policy.accessLevel ?? "未设置权限",
                            )}{" "}
                            /{" "}
                            {label(
                              row.after.policy.decision?.value ?? "未评估审批",
                            )}
                            <br />
                          </span>
                        )}
                        {row.after?.check?.issues.join("; ")}
                      </small>
                    </td>
                    <td>
                      {row.changedFields
                        ?.map(
                          (f) =>
                            (
                              ({
                                policy: "分类与预审",
                                status: "解析状态",
                                structure: "结构树",
                                nativeTree: "原生树",
                                expectation: "预期",
                                exitCode: "退出码",
                                verdict: "预期对照",
                                source: "原文",
                                parser: "解析器",
                              }) as Record<string, string>
                            )[f] ?? f,
                        )
                        .join("、") ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
