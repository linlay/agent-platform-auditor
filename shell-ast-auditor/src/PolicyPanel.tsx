import { Policy } from "./domain";
import { Tag } from "./Tag";
import { label, reasonLines } from "./ui-labels";
export function PolicyPanel({ policy: p }: { policy: Policy }) {
  const decision = p.decision;
  const tone =
    decision?.value === "block"
      ? "danger"
      : decision?.requiresHITL
        ? "danger"
        : decision
          ? "success"
          : "neutral";
  const reasons = decision ? reasonLines(decision.reason) : [];
  return (
    <section
      className={"policy-panel policy-" + tone}
      aria-label="审批预审结果"
    >
      <div className="policy-heading">
        <h3
          className={decision ? "decision" : "classification-title"}
          title={decision?.value ?? p.mode}
        >
          {decision ? label(decision.value) : "仅分析行为分类"}
        </h3>
        <div className="policy-meta">
          <Tag code={p.mode} />
          {p.accessLevel && <Tag code={p.accessLevel} />}
        </div>
      </div>
      <small>以上为实际预审结论；是否符合用例的审批预期，见上方“审批判断”。</small>
      {reasons.length > 0 ? (
        <ul className="policy-reasons">
          {reasons.map((r, i) => (
            <li key={i} title={r.original}>
              {r.text}
            </li>
          ))}
        </ul>
      ) : !decision ? (
        <p>未设置权限档位，因此未评估是否需要审批。</p>
      ) : null}
      <div className="chips policy-categories" aria-label="检测到的行为">
        {p.categories.map((c) => (
          <Tag code={c} key={c} />
        ))}
        {p.categories.length === 0 && <small>未发现额外行为类别</small>}
      </div>
      <details className="technical-details">
        <summary>预审说明与原始报告</summary>
        <p>
          这是独立环境的预审，未关联真实任务、连接器挂载、技能执行证明或已有批准。分类描述行为，不等于待审批清单；最终要求以本次预审决定为准。
        </p>
        <p>
          分类来自当前生产审查器，与语法解析程度分别计算。此处不执行命令，也不产生可复用的执行许可。
        </p>
        {decision && (
          <p>
            处理方式：{label(decision.disposition)}；人工确认：
            {decision.requiresHITL ? "需要" : "不需要"}。
          </p>
        )}
        <pre>{JSON.stringify(p, null, 2)}</pre>
      </details>
    </section>
  );
}
