import { judgments } from "./judgments";
import { label, reasonLines } from "./ui-labels";
import { provenance, ReportData, sourceRuns } from "./report-data";

const escape = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const badge = (text: string, tone: string) => `<span class="badge ${escape(tone)}">● ${escape(text)}</span>`;
export function humanReport(data: ReportData): string {
  const groups: { number: number; replacement: string; workspace: string; cwd: string; sources: Set<string>; count: number }[] = [];
  const directoryRefs = new Map<string, number>();
  for (const item of [...data.items, ...data.baseline]) {
    const input = item.result?.input, c = item.snapshot;
    const review = input?.review ?? c.review;
    const projectDir = input?.projectDir ?? c.projectDir;
    const noPolicy = !review || review.mode === "syntax-only";
    const replacement = projectDir || (projectDir === "" || input ? "未启用替换" : "未记录");
    const workspace = review?.workspace || (noPolicy ? "不适用（仅解析语法）" : "未记录（使用运行时默认值）");
    const cwd = review?.cwd || (noPolicy ? "不适用（仅解析语法）" : "未记录（使用运行时默认值）");
    let group = groups.find(g => g.replacement === replacement && g.workspace === workspace && g.cwd === cwd);
    if (!group) {
      group = { number: groups.length + 1, replacement, workspace, cwd, sources: new Set(), count: 0 };
      groups.push(group);
    }
    group.count++;
    group.sources.add(`${item.side === "baseline" ? "基准" : "当前"} · ${item.runId ?? "临时输入"}`);
    directoryRefs.set(item.key, group.number);
  }
  const directoryLink = (key: string | undefined) => {
    const number = key ? directoryRefs.get(key) : undefined;
    return number ? `<a href="#directory-config-${number}">目录配置 ${number}</a>` : "—";
  };
  const directories = `<h2>当时的目录配置</h2><div class="table directory-table"><table id="directory-contexts"><thead><tr><th>配置</th><th>替换目录（/project）</th><th>工作区（Workspace）</th><th>工作目录（cwd）</th><th>适用来源</th></tr></thead><tbody>${groups.map(g => `<tr id="directory-config-${g.number}"><td>配置 ${g.number}</td><td><code>${escape(g.replacement)}</code></td><td><code>${escape(g.workspace)}</code></td><td><code>${escape(g.cwd)}</code></td><td><small>${g.count} 条用例<br>${[...g.sources].map(escape).join("<br>")}</small></td></tr>`).join("")}</tbody></table></div><small>取自各条运行保存的输入；未记录的默认目录不会用当前页面设置补写。</small>`;
  const rows = data.items.map(item => {
    const c = item.snapshot, r = item.result, j = judgments(c, r), source = provenance(data, item);
    const status = r?.status ?? r?.report?.status, policy = r?.policy ?? r?.report?.policy;
    const context = r?.input?.review ?? c.review;
    const why = [...(r?.check?.issues ?? []), ...(r?.error ? [r.error] : [])].map(text => ({ text, original: text }));
    if (policy?.decision?.reason) why.push(...reasonLines(policy.decision.reason).map(reason => ({ ...reason, text: reason.text.replace("原始报告", "预期与上下文") })));
    return `<tr data-red="${j.hasRed}"><td><strong>${escape(c.id)}</strong><pre>${escape(r?.input?.command ?? c.command)}</pre><small>${escape(label(c.profile))} · ${escape(source.runId ?? "临时输入")}<br>解析器 ${escape(source.parser?.sourceCommit ?? source.parserSha256 ?? "版本未记录")} · ${escape(source.host)}<br>${directoryLink(item.key)}</small></td><td>${badge(j.parsing.text, j.parsing.tone)}<small>${escape(label(r?.state ?? "not-run"))} · 语法${escape(label(status?.syntax ?? "未判断"))} · ${escape(label(status?.grade ?? "未判断"))}</small></td><td>${badge(j.approval.text, j.approval.tone)}<small>${escape(label(context?.mode ?? "syntax-only"))}<br>${escape(context?.accessLevel ? label(context.accessLevel) : "未传 access level")}<br>实际：${escape(policy?.decision ? label(policy.decision.value) : "未评估审批")}</small></td><td>${why.length ? why.map(reason => `<p title="${escape(reason.original)}">${escape(reason.text)}</p>`).join("") : "—"}<details><summary>预期与上下文</summary><pre>${escape(JSON.stringify({ expected: c.id === "custom" ? null : c.expect, expectedEvidence: c.expectedEvidence ?? null, source: c.source, review: context ?? null, approvalReason: policy?.decision?.reason ?? null, projectDir: r?.input?.projectDir ?? c.projectDir ?? null, knownDifference: c.knownDifference ?? null }, null, 2))}</pre></details></td></tr>`;
  }).join("");
  const parsingPass = data.items.filter(i => judgments(i.snapshot, i.result).parsing.tone === "green").length;
  const approvalPass = data.items.filter(i => judgments(i.snapshot, i.result).approval.tone === "green").length;
  const red = data.items.filter(i => judgments(i.snapshot, i.result).hasRed).length;
  const incomplete = data.items.filter(i => !i.result || ["running", "cancelled"].includes(i.result.state) || i.result.check?.verdict === "not-run").length;
  const errors = data.items.filter(i => i.result?.state === "error" || i.result?.check?.verdict === "error").length;
  const comparison = data.comparison ? `<h2>运行对比</h2><p>${escape(data.comparison.baseRunId ?? "用例预期")} → ${escape(data.comparison.targetRunId)}</p><div class="table"><table><thead><tr><th>用例</th><th>对比结论</th><th>变化字段</th></tr></thead><tbody>${data.comparison.rows.map(row => `<tr><td>${escape(row.caseId)}</td><td>${escape(label(row.verdict))}</td><td>${escape(row.changedFields?.join(", ") ?? "—")}</td></tr>`).join("")}</tbody></table></div>` : "";
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Shell 命令测试报告</title><style>
*{box-sizing:border-box}body{font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#253344;background:#f5f7f9;margin:0;padding:24px}main{max-width:1440px;margin:auto}h1{font-size:22px;margin:0}h2{font-size:17px;margin:20px 0 8px}p{margin:4px 0}small{display:block;color:#617080;overflow-wrap:anywhere}.summary{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.summary span{background:white;padding:8px 12px;border-radius:8px}.table{overflow:auto;border:1px solid #d7dfe6;border-radius:8px;background:white}table{width:100%;border-collapse:collapse;min-width:800px}th,td{padding:10px;text-align:left;vertical-align:top;border-bottom:1px solid #e1e7ec}th{background:#edf2f6}td:first-child{width:40%}.directory-table table{table-layout:fixed}.directory-table td:first-child,.directory-table th:first-child{width:72px}.directory-table td{overflow-wrap:anywhere}.directory-table td:last-child,.directory-table th:last-child{width:22%}.directory-table code{font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}a{color:#076ac6}pre{font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0}details pre{max-height:280px;overflow:auto}.badge{white-space:nowrap;font-weight:600}.red{color:#af3840}.green{color:#26764e}.neutral{color:#617080}label{display:inline-flex;gap:6px;align-items:center;margin:0 0 10px}summary{cursor:pointer}tr[hidden]{display:none}@media(max-width:760px){body{padding:12px}}@media print{body{background:white;padding:0}label{display:none}.table{overflow:visible}table{min-width:0}thead{display:table-header-group}}
</style></head><body><main><h1>Shell 命令测试报告</h1><p>${escape(data.testsetTitle)} · ${escape({ accumulated: "单用例累计结果", batch: "整集测试", comparison: "结果对比" }[data.scope])}</p><small>生成时间：${escape(data.generatedAt)}${data.scope === "batch" ? ` · 批次号：${escape(data.items[0]?.runId)}` : ""}</small><div class="summary"><span>用例 ${data.items.length}</span><span>解析符合预期 ${parsingPass}</span><span>审批符合预期 ${approvalPass}</span><span>有红点 ${red}</span><span>解析/报告错误 ${errors}</span><span>未完成 ${incomplete}</span></div><p>解析判断与审批判断分别对照预期，实际审批结论单独展示。符合预期不是执行许可；需要审批或禁止执行也可以符合预期。已知差异和未完成不计为符合。</p>${directories}<h2>逐条结果</h2><label><input id="red-only" type="checkbox">只看红点用例</label><div class="table"><table id="cases"><thead><tr><th>用例与命令</th><th>解析判断</th><th>审批判断</th><th>原因与依据</th></tr></thead><tbody>${rows}</tbody></table></div>${comparison}<details><summary>来源记录与版本</summary><pre>${escape(JSON.stringify(sourceRuns(data), null, 2))}</pre></details><small>本报告不包含完整解析树。需要定位问题请导出“优化反馈包”，需要全部原始解析结果请导出“完整数据”。</small></main><script>document.getElementById('red-only').addEventListener('change',function(){document.querySelectorAll('#cases tbody tr').forEach(row=>{row.hidden=this.checked&&row.dataset.red!=='true'})})</script></body></html>`;
}
