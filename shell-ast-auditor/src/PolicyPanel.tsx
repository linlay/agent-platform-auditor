import { Policy } from "./domain";
import "./PolicyPanel.css";
import { Tag } from "./Tag";
import { label, reasonLines } from "./ui-labels";
export const approvalTab = "分类与审批";

export function ApprovalOutcome({ policy }: { policy?: Policy }) {
  return policy?.decision && (
    <span className="approval-outcome" title={policy.accessLevel ? label(policy.accessLevel) : undefined}>
      审批：{label(policy.decision.value)}
    </span>
  );
}

export function PolicyCategories({ policy }: { policy?: Policy }) {
  return (
    <section className="policy-category-summary" aria-label="审批策略项">
      <div className="policy-category-heading">
        <h4>审批策略项</h4>
        <small>
          {policy
            ? policy.categories.length === 0
              ? "已完成分类，未命中额外策略项。"
              : "所列为本次命中的行为分类。放行或人工确认取决于权限档位及策略预审。"
            : "本次报告未包含审批策略项。纯语法模式只拆解命令；选择“只看分类”或“评估审批要求”后重新解析可查看策略项。"}
        </small>
      </div>
      {policy && policy.categories.length > 0 && (
        <ul className="policy-category-list">
          {policy.categories.map((category) => (
            <li key={category}>
              <code>{category}</code>
              {label(category) !== category && <span>{label(category)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PolicyPanel({ policy: p }: { policy: Policy }) {
  const decision = p.decision;
  const tone =
    decision?.value === "block"
      ? "danger"
      : decision?.requiresHITL
        ? "warning"
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
      <PolicyCategories policy={p} />
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
