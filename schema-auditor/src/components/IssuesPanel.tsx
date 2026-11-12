import { useEffect, useMemo, useRef, useState } from "react";
import type { AuditIssue, Severity } from "../domain/types";
import { formatIssueCopyText, severityLabel } from "./issueFormatting";

export interface IssueFilters {
  severity: string;
  searchQuery: string;
}

interface Props {
  issues: AuditIssue[];
  filters: IssueFilters;
  onSeverityFilterChange: (value: string) => void;
  onSelectRecord: (index: number) => void;
}

const SEVERITY_FILTER_OPTIONS: ReadonlyArray<{ value: string; severity: Severity | null; label: string }> = [
  { value: "all", severity: null, label: "全部" },
  { value: "error", severity: "error", label: "错误" },
  { value: "warning", severity: "warning", label: "警告" },
  { value: "info", severity: "info", label: "提示" }
];

export function IssuesPanel({ issues, filters, onSeverityFilterChange, onSelectRecord }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const filtered = useMemo(() => filterIssues(issues, filters), [issues, filters]);
  const severityCounts = useMemo(() => countBySeverity(issues), [issues]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const copyIssue = (issue: AuditIssue, key: string) => {
    navigator.clipboard?.writeText(formatIssueCopyText(issue)).then(() => {
      setCopiedKey(key);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1500);
    }).catch(() => undefined);
  };

  const filterRow = (
    <div className="issues-severity-filter">
      {SEVERITY_FILTER_OPTIONS.map((option) => {
        const count = option.severity === null ? issues.length : severityCounts[option.severity];
        const active = filters.severity === option.value;
        return (
          <button
            type="button"
            key={option.value}
            className={`filter-btn${active ? " active" : ""}`}
            onClick={() => onSeverityFilterChange(option.value)}
            aria-pressed={active}
          >
            {option.label} {count}
          </button>
        );
      })}
    </div>
  );

  if (issues.length === 0) {
    return (
      <div className="issues-panel panel active">
        {filterRow}
        <div className="issues-empty">没有发现问题</div>
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="issues-panel panel active">
        {filterRow}
        <div className="issues-empty">没有符合筛选的问题</div>
      </div>
    );
  }

  const groups = {
    error: filtered.filter((issue) => issue.severity === "error"),
    warning: filtered.filter((issue) => issue.severity === "warning"),
    info: filtered.filter((issue) => issue.severity === "info")
  };

  return (
    <div className="issues-panel panel active">
      {filterRow}
      <div className="issues-list">
        {(["error", "warning", "info"] as const).map((severity) => {
          const list = groups[severity];
          if (list.length === 0) return null;
          return (
            <div className="issues-group" key={severity}>
              <div className={`issues-group-title severity-${severity}`}>{severityLabel(severity)} ({list.length})</div>
              {list.map((issue, index) => {
                const issueKey = `${severity}-${issue.recordIndex}-${issue.code}-${issue.path}-${index}`;
                const copied = copiedKey === issueKey;
                return (
                  <div className={`issue-item severity-${issue.severity}`} key={issueKey}>
                    <button type="button" className="issue-main" onClick={() => issue.recordIndex >= 0 && onSelectRecord(issue.recordIndex)} disabled={issue.recordIndex < 0}>
                      <span className="issue-code">{issue.code}</span>
                      <span className="issue-title">{issue.title}</span>
                      <span className="issue-path">{issue.path}</span>
                      {issue.recordIndex >= 0 ? <span className="issue-record"> #{issue.recordIndex + 1}</span> : null}
                      <span className="issue-detail">{issue.message}</span>
                    </button>
                    <button type="button" className="issue-copy-btn" onClick={() => copyIssue(issue, issueKey)} aria-label={`${copied ? "已复制" : "复制"}问题 ${issue.code} ${issue.path || "root"}`}>
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                );
              })}
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

function countBySeverity(issues: AuditIssue[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    counts[issue.severity] += 1;
  }
  return counts;
}