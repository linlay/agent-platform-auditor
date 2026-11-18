import { Case, Result, obj, expectedPolicy, approvalLevels } from "./domain";
import { label } from "./ui-labels";
import { Tag } from "./Tag";
import { parsingCheck, approvalCheck, judgments } from "./judgments";
const acceptedGrades: Record<string, string> = {
  exact: "精确",
  partial: "精确或部分确定",
  opaque: "精确、部分确定或无法完整确定",
};
export function ExpectationPanel({
  testCase: c,
  result,
  kind = "parsing",
}: {
  testCase: Case;
  result?: Result;
  kind?: "parsing" | "approval";
}) {
  const expected = expectedPolicy(c);
  const status = result?.report?.status ?? result?.status;
  const policy = result?.report?.policy ?? result?.policy;
  const calls =
    result?.report?.execPoints?.flatMap((e) => {
      const words = obj(e).words;
      const text = Array.isArray(words)
        ? obj(obj(words[0]).value).text
        : undefined;
      return typeof text === "string" ? [text] : [];
    }) ?? [];
  const actual = (v: string | undefined) =>
    v === undefined ? "等待解析" : label(v);
  const rows: [string, string, string][] = [
    ["语法状态", label(c.expect.syntax), actual(status?.syntax)],
    [
      "解析程度",
      acceptedGrades[c.expect.gradeCeiling] ?? label(c.expect.gradeCeiling),
      actual(status?.grade),
    ],
  ];
  if (c.expect.containsCalls?.length)
    rows.push([
      "应识别的程序",
      c.expect.containsCalls.join("、"),
      result?.report
        ? [...new Set(calls)].join("、") || "未识别到程序"
        : result?.state === "done"
          ? "正在读取报告…"
          : "等待解析",
    ]);
  if (kind === "approval") rows.length = 0;
  if (kind === "parsing" && c.expect.containsArgv?.length)
    rows.push(["精确命令参数", JSON.stringify(c.expect.containsArgv),
      result?.report ? JSON.stringify(result.report.execPoints?.map(point => obj(point).words)) : "未得到报告"]);
  if (kind === "approval" && expected && !c.expect.policyByLevel) {
    const p = expected;
    rows.push(["预审模式", label(p.mode), actual(policy?.mode)]);
    rows.push([
      "权限档位",
      p.accessLevel ? label(p.accessLevel) : "不设置",
      policy
        ? policy.accessLevel
          ? label(policy.accessLevel)
          : "未设置"
        : "等待解析",
    ]);
    if (p.decision)
      rows.push([
        "预审决定",
        label(p.decision),
        policy
          ? policy.decision
            ? label(policy.decision.value)
            : "未评估审批"
          : "等待解析",
      ]);
    if (typeof p.requiresHITL === "boolean")
      rows.push([
        "人工确认",
        p.requiresHITL ? "需要" : "不需要",
        policy?.decision
          ? policy.decision.requiresHITL
            ? "需要"
            : "不需要"
          : "等待解析",
      ]);
    if (p.categories?.length)
      rows.push([
        "应识别的行为",
        p.categories.map(label).join("、"),
        policy
          ? policy.categories.map(label).join("、") || "未识别到行为"
          : "等待解析",
      ]);
  }
  if (c.id === "custom")
    return (
      <section className="expectation-panel">
        <h3>临时命令没有固定预期</h3>
        <p>
          此输入不属于测试集，未预先设置语法、调用或审批要求。请在其他标签页查看实际解析与预审结果。
        </p>
      </section>
    );
  const check = kind === "parsing" ? parsingCheck(c, result) : approvalCheck(c, result);
  const heading = kind === "parsing" ? "解析判断" : "审批预期";
  const verdict = judgments(c, result)[kind];
  return (
    <section className="expectation-panel" aria-label={heading + "对照：" + c.id}>
      <div className="expectation-heading">
        <h3>{heading}</h3>
        <Tag code={check?.verdict ?? "not-run"} text={verdict.text} tone={verdict.tone === "green" ? "success" : verdict.tone === "red" ? "danger" : "neutral"} />
      </div>
      {kind === "parsing" && (
        <p className="expectation-context">
          当前用例：<code>{c.id}</code>。对照本次运行保存的预期与实际结果。
        </p>
      )}
      {check?.issues.length ? (
        <ul className="expectation-issues">
          {check.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      ) : null}
      {result?.state === "error" && (
        <p role="alert">{result.error ?? "解析失败，未得到可比较的报告。"}</p>
      )}
      {result?.state === "cancelled" && (
        <p>本条解析已取消，未完成的项目不计为通过。</p>
      )}
      {kind === "approval" && c.expect.policyByLevel && (
        <>
          {c.review?.mode !== "evaluation" && (
            <p>已设置三档预期；选择评估审批要求及权限档位后运行。</p>
          )}
          <div className="expectation-table approval-level-table">
            <table>
              <thead><tr><th>权限档位</th><th>预期决定</th><th>本次实际</th></tr></thead>
              <tbody>{approvalLevels.map(level => {
                const selected = c.review?.mode === "evaluation" && c.review.accessLevel === level;
                const p = c.expect.policyByLevel?.[level];
                return <tr key={level} className={selected ? "current-approval-level" : undefined} aria-current={selected ? "true" : undefined}>
                  <th scope="row">{label(level)}{selected ? " · 本次" : ""}</th>
                  <td>{p?.decision ? label(p.decision) : "缺少预期"}</td>
                  <td>{selected && policy?.decision ? label(policy.decision.value) : selected && result?.state === "running" ? "判断中" : "本次未运行此档位"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </>
      )}
      {rows.length > 0 && <div className="expectation-table">
        <table>
          <thead>
            <tr>
              <th>检查项目</th>
              <th>用例预期</th>
              <th>本次实际</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, expected, observed]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{expected}</td>
                <td>{observed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
      {kind === "parsing" && c.knownDifference && (
        <details className="technical-details">
          <summary>已登记的解析差异</summary>
          <p>此差异保留在实际结果中，不作为符合预期或生产验收通过。</p>
          <p>{c.knownDifference.reason}</p>
          <pre>{JSON.stringify(c.knownDifference, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
