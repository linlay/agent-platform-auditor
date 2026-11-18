import { label as zh, statusName } from "./ui-labels";
import { Tag } from "./Tag";
import { ApprovalOutcome, PolicyCategories, PolicyPanel, approvalTab } from "./PolicyPanel";
import { JudgmentBadge } from "./JudgmentBadge";
import { hasApprovalExpectation, judgments } from "./judgments";
import { ExpectationPanel } from "./ExpectationPanel";
import { useState, useEffect, useId } from "react";
import { Case, J, Result, obj, byteSlice } from "./domain";
const pretty = (v: unknown) => JSON.stringify(v, null, 2);
function Tree({
  value,
  onPick,
  label = "root",
}: {
  value: J;
  onPick: (v: J) => void;
  label?: string;
}) {
  if (value === null || typeof value !== "object")
    return <span>{String(value)}</span>;
  const o = obj(value);
  const children = Array.isArray(value)
    ? value
    : Array.isArray(o.children)
      ? o.children
      : [];
  return (
    <details className="ast-tree" open={label === "root"}>
      <summary title={String(o.kind ?? label)} onClick={() => onPick(value)}>
        {zh(String(o.kind ?? o.id ?? label))}{" "}
        {o.kind && o.id ? <small>{String(o.id)}</small> : null}
        {o.error ? " ⚠ 错误" : ""}
        {o.missing ? " ⚠ 缺失" : ""}
      </summary>
      {children.map((v, i) => (
        <Tree key={i} value={v} onPick={onPick} label={String(i)} />
      ))}
    </details>
  );
}
export function Inspector({
  c,
  result,
  defaultTab = approvalTab,
}: {
  c?: Case;
  result?: Result;
  defaultTab?: string;
}) {
  const panelId = useId();
  const [tab, setTab] = useState(defaultTab),
    [picked, setPicked] = useState<J>(null);
  const [copyState, setCopyState] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  useEffect(() => {
    setTab(defaultTab);
    setPicked(null);
  }, [defaultTab]);
  const report = result?.report;
  const policy = report?.policy ?? result?.policy;
  const source = result?.input?.command ?? c?.command ?? "";
  useEffect(() => setCopyState("idle"), [source]);
  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [copyState]);
  const template = result?.input?.templateCommand ?? c?.templateCommand;
  const range = obj(obj(picked).range),
    start = obj(range.start).offset,
    end = obj(range.end).offset;
  const highlight = c && typeof start === "number" && typeof end === "number";
  return (
    <section className="inspector">
      {c && (
        <>
          <div className="inspector-row inspector-heading">
            <h2>{c.id === "custom" ? "解析结果" : c.id}</h2>
            <div className="case-meta">
              <Tag code={c.profile} />
              <Tag code={c.review?.mode ?? "syntax-only"} />
              {c.review?.accessLevel && <Tag code={c.review.accessLevel} />}
              {c.id !== "custom" && <span title={"expect.syntax=" + c.expect.syntax}>
                预期语法{zh(c.expect.syntax)}
              </span>}
            </div>
          </div>
          <div className="source-box">
            <pre className="source">
              {highlight ? (
                <>
                  {byteSlice(source, 0, start)}
                  <mark>{byteSlice(source, start, end)}</mark>
                  {byteSlice(source, end)}
                </>
              ) : (
                source
              )}
            </pre>
            <button
              type="button"
              className={"copy-command" + (copyState === "copied" ? " is-copied" : "")}
              aria-label="复制命令"
              title={copyState === "copied" ? "已复制" : "复制命令"}
              disabled={copyState === "copying"}
              aria-busy={copyState === "copying"}
              onClick={async () => {
                setCopyState("copying");
                try {
                  await navigator.clipboard.writeText(source);
                  setCopyState("copied");
                } catch {
                  setCopyState("error");
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                {copyState === "copied" ? (
                  <path d="m5 12 4 4L19 6" />
                ) : (
                  <>
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M16 8V4H4v12h4" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <span
            role="status"
            className={copyState === "error" ? "copy-error" : "sr-only"}
          >
            {copyState === "copied"
              ? "命令已复制"
              : copyState === "error"
                ? "复制失败，请选中命令手动复制。"
                : ""}
          </span>
          {(c.id !== "custom" || template) && (
            <div className="inspector-row case-overview">
              {c.id !== "custom" && (
                <div className="judgment-summary">
                  <JudgmentBadge
                    kind="解析判断"
                    value={judgments(c, result).parsing}
                  />
                  {tab !== approvalTab && <ApprovalOutcome policy={policy} />}
                </div>
              )}
              {template && (
                <details className="template-source">
                  <summary>已映射 /project · 查看用例原文</summary>
                  <pre>{template}</pre>
                  <small>上方为本次实际解析的命令，源码范围与高亮以此为准。映射目录：{result?.input?.projectDir ?? c.projectDir}</small>
                </details>
              )}
            </div>
          )}
          <div className="inspector-row parse-status">
            {report && (
              <>
                <Tag
                  code={report.status.syntax}
                  text={"语法" + zh(report.status.syntax)}
                  tone={
                    report.status.syntax === "invalid" ? "danger" : "neutral"
                  }
                />
                <Tag
                  code={report.status.grade}
                  text={
                    report.status.grade === "exact"
                      ? "精确解析"
                      : zh(report.status.grade)
                  }
                  hint="只描述已验证范围内的语法解析程度，不是执行许可"
                />
                {report.status.recovered && (
                  <Tag
                    code="recovered"
                    text="包含语法恢复错误"
                    tone="warning"
                  />
                )}
              </>
            )}
            <div className="status" title={result?.runId ? "结果记录：" + result.runId : undefined}>
              解析：{zh(result?.state ?? "未运行")} · {result?.durationMs ?? "—"}{" "}
              ms · <span title="CLI exit code">退出码 {result?.exitCode ?? "—"}</span>
            </div>
            {report && (
              <details className="technical-details">
                <summary>全部解析状态</summary>
                <div className="chips">
                  {Object.entries(report.status).map(([k, v]) => (
                    <Tag
                      key={k}
                      code={`${k}=${String(v)}`}
                      text={`${statusName[k] ?? k}：${zh(String(v))}`}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>
          {result?.error && <p role="alert">{result.error}</p>}
          {c.id !== "custom" && (report || policy) && <PolicyCategories policy={policy} />}
          <nav role="tablist" aria-label="当前命令详情">
            {[
              "解析判断",
              approvalTab,
              "执行面",
              "执行点",
              "关系",
              "不透明区域",
              "诊断",
              "原生树",
              "完整 JSON",
              "来源",
            ].filter(t => c.id !== "custom" || t !== "解析判断").map((t) => (
              <button
                role="tab"
                tabIndex={tab === t ? 0 : -1}
                onKeyDown={(e) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const tabs = Array.from(
                    e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                      "[role=tab]",
                    ) ?? [],
                  );
                  const index = tabs.indexOf(e.currentTarget);
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? tabs.length - 1
                        : (index +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            tabs.length) %
                          tabs.length;
                  tabs[next]?.focus();
                  tabs[next]?.click();
                }}
                aria-selected={tab === t}
                aria-controls={panelId}
                id={`${panelId}-${t}`}
                className={tab === t ? "chosen" : ""}
                key={t}
                onClick={() => {
                  setTab(t);
                  setPicked(null);
                }}
              >
                {t}
              </button>
            ))}
          </nav>
          <div
            className="views"
            role="tabpanel"
            id={panelId}
            aria-labelledby={`${panelId}-${tab}`}
          >
            {tab === "解析判断" ? (
              <ExpectationPanel testCase={c} result={result} />
            ) : tab === approvalTab ? (
              <>
              {policy ? (
                <PolicyPanel policy={policy} showCategories={c.id === "custom"} />
              ) : (
                <p className="empty">
                  {report
                    ? "本次报告未包含分类或审批预审。可选择“只看分类”或“评估审批要求”后重新解析；若已选择，请查看诊断或错误信息。"
                    : result?.state === "error"
                      ? "本次解析失败，没有分类或预审报告。"
                      : "解析后将在此显示当前命令的分类与审批结果。"}
                </p>
              )}
              {hasApprovalExpectation(c) ? (
                <ExpectationPanel testCase={c} result={result} kind="approval" />
              ) : c.id !== "custom" && <p className="empty">本条用例未设置审批预期。</p>}
              </>
            ) : !report ? (
              <p className="empty">
                {result?.state === "running"
                  ? "正在解析当前命令…"
                  : result?.state === "error"
                    ? "本次解析失败，请查看错误信息。"
                    : "解析后将在此显示当前命令的结果。"}
              </p>
            ) : tab === "执行面" || tab === "原生树" ? (
              <Tree
                value={
                  (tab === "执行面" ? report.structure : report.nativeTree) ??
                  null
                }
                onPick={setPicked}
              />
            ) : tab === "执行点" ? (
              <div>
                {(report.execPoints ?? []).map((e, i) => {
                  const o = obj(e);
                  return (
                    <section className="exec" key={i}>
                      <button
                        title={`grade=${String(o.grade)}; stableArgPrefix=${String(o.stableArgPrefix)}`}
                        onClick={() => setPicked(e)}
                      >
                        {String(o.id)} · {zh(String(o.kind))} · 解析程度{" "}
                        {zh(String(o.grade))} · 确定参数前缀{" "}
                        {String(o.stableArgPrefix)}
                      </button>
                      <div>
                        {(Array.isArray(o.words) ? o.words : []).map((w, j) => (
                          <button
                            className="word"
                            key={j}
                            onClick={() => setPicked(w)}
                          >
                            {String(obj(obj(w).value).text ?? "动态值")}
                            <small>
                              {zh(String(obj(obj(w).value).state))} · 参数个数{" "}
                              {String(obj(w).arity)}
                            </small>
                          </button>
                        ))}
                      </div>
                      <details>
                        <summary>有序重定向 / 赋值 / 作用域</summary>
                        <pre>
                          {pretty({
                            redirects: o.redirects,
                            assignments: o.assignments,
                            scope: o.scope,
                            mayExecute: o.mayExecute,
                          })}
                        </pre>
                      </details>
                    </section>
                  );
                })}
              </div>
            ) : tab === "完整 JSON" ? (
              <pre>{pretty(report)}</pre>
            ) : tab === "来源" ? (
              <pre>{pretty(c)}</pre>
            ) : (
              <div>
                {(
                  (tab === "关系"
                    ? report.relations
                    : tab === "不透明区域"
                      ? report.opaque
                      : report.diagnostics) ?? []
                ).map((v, i) => (
                  <section className="exec" key={i}>
                    <button onClick={() => setPicked(v)}>
                      {zh(String(obj(v).kind ?? obj(v).code ?? i))}
                    </button>
                    <pre>{pretty(v)}</pre>
                  </section>
                ))}
              </div>
            )}
            {picked !== null && (
              <section className="node">
                <h3>节点详情</h3>
                <pre>{pretty(picked)}</pre>
              </section>
            )}
          </div>
          <details>
            <summary>用例定义与来源（不含历史结果）</summary>
            <pre>{pretty(c)}</pre>
          </details>
        </>
      )}
    </section>
  );
}
