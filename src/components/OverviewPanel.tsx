import type { AuditResult } from "../domain/types";

interface Props {
  auditResult: AuditResult | null;
  schemaState: "loading" | "ready" | "error";
  schemaError: string;
}

export function OverviewPanel({ auditResult, schemaState, schemaError }: Props) {
  if (schemaState === "loading") return <div className="overview-panel"><div className="overview-empty">正在加载 JSONL schema...</div></div>;
  if (schemaState === "error") return <div className="overview-panel"><div className="overview-empty">JSONL schema 加载失败：{schemaError}<br />请通过本地 HTTP 服务打开页面。</div></div>;
  if (!auditResult) return <div className="overview-panel"><div className="overview-empty">请粘贴数据并点击"解析并审计"</div></div>;

  return (
    <div className="overview-panel">
      <OverviewItem label="记录数" value={auditResult.summary.totalRecords} />
      <OverviewItem label="错误" value={auditResult.summary.errorCount} />
      <OverviewItem label="警告" value={auditResult.summary.warningCount} />
      <OverviewItem label="提示" value={auditResult.summary.infoCount} />
      {Object.entries(auditResult.summary.byKind).map(([kind, count]) => (
        <OverviewItem key={kind} label={kind} value={count} />
      ))}
    </div>
  );
}

function OverviewItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="overview-item">
      <span className="ov-label">{label}</span>
      <span className="ov-value">{value}</span>
    </div>
  );
}
