import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import type { AuditIssue, JsonObject, JsonValue, ParsedRecord } from "../domain/types";
import { formatIssueCopyText, severityLabel } from "./issueFormatting";

interface Props {
  record: ParsedRecord | null;
  allIssues: AuditIssue[];
}

type TabId = "property" | "raw";

export function DetailTabs({ record, allIssues }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("property");

  return (
    <>
      <div className="right-tabs">
        <TabButton id="property" label="属性" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="raw" label="原始json" activeTab={activeTab} onClick={setActiveTab} />
      </div>
      <div className="right-content">
        {activeTab === "property" ? <PropertyPanel record={record} allIssues={allIssues} /> : null}
        {activeTab === "raw" ? <RawPanel record={record} /> : null}
      </div>
    </>
  );
}

function TabButton({ id, label, activeTab, onClick }: { id: TabId; label: string; activeTab: TabId; onClick: (id: TabId) => void }) {
  return (
    <button type="button" className={`mode-tab ${activeTab === id ? "active" : ""}`} onClick={() => onClick(id)}>
      {label}
    </button>
  );
}

function PropertyPanel({ record, allIssues }: { record: ParsedRecord | null; allIssues: AuditIssue[] }) {
  if (!record || !record.data || typeof record.data !== "object") {
    return <div className="panel active"><div className="prop-empty">请选择一条记录查看属性</div></div>;
  }
  const issueMap = new Map<string, AuditIssue[]>();
  allIssues.filter((issue) => issue.recordIndex === record.index).forEach((issue) => {
    issueMap.set(issue.path, [...(issueMap.get(issue.path) ?? []), issue]);
  });

  return (
    <div className="panel active">
      <div className="prop-table">
        <h3 className="prop-title">属性校验 #{record.index + 1} ({record.lineType || record.frame || record.kind})</h3>
        <PropertyTree key={record.index} value={record.data} issueMap={issueMap} />
      </div>
    </div>
  );
}

function PropertyTree({ value, issueMap }: { value: JsonValue; issueMap: Map<string, AuditIssue[]> }) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedIssueKey, setCopiedIssueKey] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const toggleExpanded = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      removeDescendantPaths(next, path);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const copyNode = (path: string, nodeValue: JsonValue) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(formatCopyValue(nodeValue)).then(() => {
      setCopiedPath(path);
      setCopiedIssueKey(null);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedPath(null);
        setCopiedIssueKey(null);
      }, 1500);
    }).catch(() => undefined);
  };

  const copyIssue = (issue: AuditIssue, issueKey: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(formatIssueCopyText(issue)).then(() => {
      setCopiedIssueKey(issueKey);
      setCopiedPath(null);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedPath(null);
        setCopiedIssueKey(null);
      }, 1500);
    }).catch(() => undefined);
  };

  return (
    <NestedRows
      value={value}
      prefix=""
      issueMap={issueMap}
      expandedPaths={expandedPaths}
      copiedPath={copiedPath}
      copiedIssueKey={copiedIssueKey}
      onToggleExpanded={toggleExpanded}
      onCopyNode={copyNode}
      onCopyIssue={copyIssue}
    />
  );
}

function NestedRows({
  value,
  prefix,
  issueMap,
  expandedPaths,
  copiedPath,
  copiedIssueKey,
  onToggleExpanded,
  onCopyNode,
  onCopyIssue
}: {
  value: JsonValue;
  prefix: string;
  issueMap: Map<string, AuditIssue[]>;
  expandedPaths: Set<string>;
  copiedPath: string | null;
  copiedIssueKey: string | null;
  onToggleExpanded: (path: string) => void;
  onCopyNode: (path: string, value: JsonValue) => void;
  onCopyIssue: (issue: AuditIssue, issueKey: string) => void;
}) {
  if (!value || typeof value !== "object") return null;
  const entries = childEntries(value);

  return (
    <>
      {entries.map(([key, child]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const valueType = valueTypeLabel(child);
        const expandable = isExpandable(child);
        const isOpen = expandable && expandedPaths.has(path);
        const issues = issueMap.get(path) ?? [];
        const copied = copiedPath === path;
        const toggle = () => {
          if (expandable) onToggleExpanded(path);
        };

        return (
          <div className="prop-fragment" key={path}>
            <div className={`prop-row ${expandable ? "prop-row-expandable" : ""}`}>
              <button type="button" className="prop-tree-toggle" onClick={toggle} style={{ visibility: expandable ? "visible" : "hidden" }} aria-label={`${isOpen ? "折叠" : "展开"} ${path}`}>
                {isOpen ? "▼" : "▶"}
              </button>
              {expandable ? (
                <button type="button" className="prop-path prop-node-button" title={path} onClick={toggle}>{key}</button>
              ) : (
                <div className="prop-path" title={path}>{key}</div>
              )}
              <div className="prop-type">{valueType}</div>
              {expandable ? (
                <button type="button" className={`prop-value prop-node-button ${valueType === "object" ? "object-value" : valueType === "array" ? "array-value" : ""}`} onClick={toggle}>{valueSummary(child)}</button>
              ) : (
                <div className={`prop-value ${valueType === "object" ? "object-value" : valueType === "array" ? "array-value" : ""}`}>{valueSummary(child)}</div>
              )}
              <button type="button" className="prop-copy-btn" onClick={() => onCopyNode(path, child)} aria-label={`${copied ? "已复制" : "复制"} ${path}`}>
                {copied ? "已复制" : "复制"}
              </button>
              <div className="prop-issues">
                {issues.map((issue, index) => (
                  <PropertyIssue issue={issue} issueKey={`${path}-${issue.code}-${index}`} copiedIssueKey={copiedIssueKey} onCopyIssue={onCopyIssue} key={`${issue.code}-${index}`} />
                ))}
              </div>
            </div>
            {isOpen ? (
              <div className="prop-children">
                <NestedRows
                  value={child}
                  prefix={path}
                  issueMap={issueMap}
                  expandedPaths={expandedPaths}
                  copiedPath={copiedPath}
                  copiedIssueKey={copiedIssueKey}
                  onToggleExpanded={onToggleExpanded}
                  onCopyNode={onCopyNode}
                  onCopyIssue={onCopyIssue}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function PropertyIssue({ issue, issueKey, copiedIssueKey, onCopyIssue }: { issue: AuditIssue; issueKey: string; copiedIssueKey: string | null; onCopyIssue: (issue: AuditIssue, issueKey: string) => void }) {
  const copied = copiedIssueKey === issueKey;

  return (
    <div className={`prop-issue severity-${issue.severity}`} title={issue.message}>
      <div className="prop-issue-body">
        [{severityLabel(issue.severity)}] {issue.message || issue.title}
        {issue.expected ? <><br /><span className="iss-expected">期望: {issue.expected}</span></> : null}
        {issue.actual ? <><br /><span className="iss-actual">实际: {issue.actual}</span></> : null}
      </div>
      <button type="button" className="prop-issue-copy-btn" onClick={() => onCopyIssue(issue, issueKey)} aria-label={`${copied ? "已复制" : "复制"}问题 ${issue.code} ${issue.path || "root"}`}>
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}

function RawPanel({ record }: { record: ParsedRecord | null }) {
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const firstMatchRef = useRef<HTMLElement | null>(null);
  const text = record?.data ? JSON.stringify(record.data, null, 2) : record?.raw || "无数据";
  const searchResult = useMemo(() => buildHighlightedText(text, search, firstMatchRef), [text, search]);

  useEffect(() => {
    if (!search.trim() || searchResult.count === 0) return;
    firstMatchRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [search, searchResult.count]);

  if (!record) return <div className="panel active"><div className="raw-empty">请选择一条记录查看原始 JSON</div></div>;

  const handleCopy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => undefined);
  };

  return (
    <div className="panel active">
      <div className="jv-toolbar">
        <button type="button" className="jv-btn" onClick={handleCopy}>{copied ? "已复制" : "复制"}</button>
        <input
          className="jv-search-input raw-search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索原始 JSON..."
        />
        {search.trim() ? <span className={`jv-search-status ${searchResult.count === 0 ? "empty" : ""}`}>{searchResult.count > 0 ? `命中 ${searchResult.count}` : "无命中"}</span> : null}
      </div>
      <pre className="raw-json">{searchResult.nodes}</pre>
    </div>
  );
}

function buildHighlightedText(text: string, query: string, firstMatchRef: MutableRefObject<HTMLElement | null>): { nodes: ReactNode[]; count: number } {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return { nodes: [text], count: 0 };

  const lowerText = text.toLowerCase();
  const nodes: ReactNode[] = [];
  let count = 0;
  let cursor = 0;

  while (cursor < text.length) {
    const index = lowerText.indexOf(normalizedQuery, cursor);
    if (index === -1) break;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const end = index + normalizedQuery.length;
    nodes.push(<mark className="raw-json-highlight" key={`${index}-${count}`} ref={count === 0 ? firstMatchRef : undefined}>{text.slice(index, end)}</mark>);
    count += 1;
    cursor = end;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return { nodes: nodes.length > 0 ? nodes : [text], count };
}

function removeDescendantPaths(paths: Set<string>, path: string): void {
  const descendantPrefix = `${path}.`;
  [...paths].forEach((currentPath) => {
    if (currentPath.startsWith(descendantPrefix)) paths.delete(currentPath);
  });
}

function formatCopyValue(value: JsonValue): string {
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

function childEntries(value: JsonValue): [string, JsonValue][] {
  if (Array.isArray(value)) return value.map((child, index) => [String(index), child]);
  if (value && typeof value === "object") return Object.keys(value).sort().map((key) => [key, (value as JsonObject)[key]]);
  return [];
}

function isExpandable(value: JsonValue): boolean {
  return !!value && typeof value === "object" && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0);
}

function valueTypeLabel(value: JsonValue): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function valueSummary(value: JsonValue): string {
  if (value && typeof value === "object") {
    if (Array.isArray(value)) return `[${value.length} 项]`;
    return `{${Object.keys(value).length} 字段}`;
  }
  try {
    const text = JSON.stringify(value);
    return text && text.length > 200 ? `${text.slice(0, 200)}...` : text ?? "";
  } catch {
    return String(value);
  }
}
