import type { AuditIssue } from "../domain/types";

export function severityLabel(severity: AuditIssue["severity"]): string {
  return { error: "错误", warning: "警告", info: "提示" }[severity] || severity;
}

export function formatIssueCopyText(issue: AuditIssue): string {
  const lines = [
    `严重度: ${severityLabel(issue.severity)}`,
    `记录: ${issue.recordIndex >= 0 ? `#${issue.recordIndex + 1}` : "全局"}`,
    `Code: ${issue.code}`,
    `标题: ${issue.title}`,
    `Path: ${issue.path || "root"}`
  ];
  if (issue.message) lines.push(`消息: ${issue.message}`);
  if (issue.expected) lines.push(`期望: ${issue.expected}`);
  if (issue.actual) lines.push(`实际: ${issue.actual}`);
  return lines.join("\n");
}
