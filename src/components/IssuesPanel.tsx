import { useMemo } from "react";
import type { AuditIssue } from "../domain/types";

export interface IssueFilters {
  severity: string;
  searchQuery: string;
}

interface Props {
  issues: AuditIssue[];
  filters: IssueFilters;
  onSelectRecord: (index: number) => void;
}

export function IssuesPanel({ issues, filters, onSelectRecord }: Props) {
  const filtered = useMemo(() => filterIssues(issues, filters), [issues, filters]);
  if (issues.length === 0) return <div className="issues-panel panel active"><div className="issues-empty">没有发现问题</div></div>;
  if (filtered.length === 0) return <div className="issues-panel panel active"><div className="issues-empty">没有符合筛选的问题</div></div>;

  const groups = {
    error: filtered.filter((issue) => issue.severity === "error"),
    warning: filtered.filter((issue) => issue.severity === "warning"),
    info: filtered.filter((issue) => issue.severity === "info")
  };

  return (
    <div className="issues-panel panel active">
      <div className="issues-list">
        {(["error", "warning", "info"] as const).map((severity) => {
          const list = groups[severity];
          if (list.length === 0) return null;
          return (
            <div className="issues-group" key={severity}>
              <div className={`issues-group-title severity-${severity}`}>{severityLabel(severity)} ({list.length})</div>
              {list.map((issue, index) => (
                <button type="button" className={`issue-item severity-${issue.severity}`} onClick={() => issue.recordIndex >= 0 && onSelectRecord(issue.recordIndex)} key={`${issue.code}-${issue.path}-${index}`}>
                  <span className="issue-code">{issue.code}</span>
                  <span className="issue-title">{issue.title}</span>
                  <span className="issue-path">{issue.path}</span>
                  {issue.recordIndex >= 0 ? <span className="issue-record"> #{issue.recordIndex + 1}</span> : null}
                  <span className="issue-detail">{issue.message}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function filterIssues(issues: AuditIssue[], filters: IssueFilters): AuditIssue[] {
  return issues.filter((issue) => {
    if (filters.severity !== "all" && issue.severity !== filters.severity) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return [issue.path, issue.message, issue.title, issue.code].some((part) => part.toLowerCase().includes(q));
    }
    return true;
  });
}

function severityLabel(severity: AuditIssue["severity"]): string {
  return { error: "错误", warning: "警告", info: "提示" }[severity] || severity;
}
