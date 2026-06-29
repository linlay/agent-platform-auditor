import type { ReactNode } from "react";
import type { AuditIssue, TimelineEntry } from "../domain/types";

interface Props {
  timeline: TimelineEntry[];
  issues: AuditIssue[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function TimelinePanel({ timeline, issues, selectedIndex, onSelect }: Props) {
  if (timeline.length === 0) return <div className="timeline-panel"><div className="timeline-empty">暂无时间线数据</div></div>;

  const issueMap = issuesByRecord(issues);
  const groups = groupTimeline(timeline);
  return (
    <div className="timeline-panel">
      <div className="timeline">
        {groups.map(([groupKey, entries]) => (
          isWsGroup(entries)
            ? <WsTimelineGroup groupKey={groupKey} entries={entries} selectedIndex={selectedIndex} onSelect={onSelect} issueMap={issueMap} key={groupKey} />
            : <DefaultTimelineGroup groupKey={groupKey} entries={entries} selectedIndex={selectedIndex} onSelect={onSelect} issueMap={issueMap} key={groupKey} />
        ))}
      </div>
    </div>
  );
}

function DefaultTimelineGroup({ groupKey, entries, selectedIndex, onSelect, issueMap }: { groupKey: string; entries: TimelineEntry[]; selectedIndex: number | null; onSelect: (index: number) => void; issueMap: Map<number, IssueCounts> }) {
  return (
    <div className="timeline-group">
      <div className="timeline-group-title">{formatGroupTitle(groupKey, entries)}</div>
      <div className="tl-header tl-header-default">
        <span className="tl-h-issues">ISSUES</span>
        <span className="tl-h-time">Time</span>
        <span className="tl-h-seq">Seq</span>
        <span className="tl-h-live-seq">LiveSeq</span>
        <span className="tl-h-type">Type</span>
        <span className="tl-h-summary">Summary</span>
      </div>
      {entries.map((entry) => (
        <button
          type="button"
          key={`${entry.recordIndex}-${entry.typeLabel}`}
          className={`tl-entry tl-entry-default ${entry.recordIndex === selectedIndex ? "selected" : ""}`}
          onClick={() => onSelect(entry.recordIndex)}
          title={[formatFullTime(entry.time), entry.seq || "", entry.liveSeq || "", entry.typeLabel, entry.summary].filter(Boolean).join(" · ")}
        >
          <span className="tl-issues">{renderIssueBadges(issueMap.get(entry.recordIndex))}</span>
          <span className="tl-time">{formatShortTime(entry.time)}</span>
          <span className="tl-seq">{entry.seq || ""}</span>
          <span className={`tl-live-seq${(entry.liveSeq || "").length > 1 ? " tl-live-seq-pill" : ""}`}>{entry.liveSeq || ""}</span>
          <span className="tl-type">{entry.typeLabel}</span>
          <span className="tl-summary">{entry.summary}</span>
        </button>
      ))}
    </div>
  );
}

function WsTimelineGroup({ groupKey, entries, selectedIndex, onSelect, issueMap }: { groupKey: string; entries: TimelineEntry[]; selectedIndex: number | null; onSelect: (index: number) => void; issueMap: Map<number, IssueCounts> }) {
  return (
    <div className="timeline-group timeline-group-ws">
      <div className="timeline-group-title">{groupKey}</div>
      <div className="tl-header tl-header-ws">
        <span className="tl-h-issues">ISSUES</span>
        <span className="tl-h-time">Time</span>
        <span className="tl-h-dir">Dir</span>
        <span className="tl-h-frame">Frame</span>
        <span className="tl-h-type">Type</span>
        <span className="tl-h-id">ID</span>
        <span className="tl-h-summary">Summary</span>
      </div>
      {entries.map((entry) => (
        <button
          type="button"
          key={`${entry.recordIndex}-${entry.wsFrame || entry.typeLabel}`}
          className={`tl-entry tl-entry-ws ${entry.recordIndex === selectedIndex ? "selected" : ""}`}
          onClick={() => onSelect(entry.recordIndex)}
          title={[formatFullTime(entry.time), entry.wsDirection || "", entry.wsFrame || "", entry.wsType || "", entry.wsId || "", entry.summary].filter(Boolean).join(" · ")}
        >
          <span className="tl-issues">{renderIssueBadges(issueMap.get(entry.recordIndex))}</span>
          <span className="tl-time">{formatShortTime(entry.time)}</span>
          <span className="tl-ws-dir">{entry.wsDirection || ""}</span>
          <span className="tl-ws-frame">{entry.wsFrame || entry.typeLabel}</span>
          <span className="tl-ws-type">{entry.wsType || ""}</span>
          <span className="tl-ws-id">{entry.wsId || ""}</span>
          <span className="tl-summary">{entry.summary}</span>
        </button>
      ))}
    </div>
  );
}

function isWsGroup(entries: TimelineEntry[]): boolean {
  return entries.length > 0 && entries.every((entry) => entry.kind === "ws");
}

interface IssueCounts {
  error: number;
  warning: number;
  info: number;
}

function issuesByRecord(issues: AuditIssue[]): Map<number, IssueCounts> {
  const map = new Map<number, IssueCounts>();
  for (const issue of issues) {
    if (issue.recordIndex < 0) continue;
    const counts = map.get(issue.recordIndex) ?? { error: 0, warning: 0, info: 0 };
    counts[issue.severity] += 1;
    map.set(issue.recordIndex, counts);
  }
  return map;
}

function renderIssueBadges(counts: IssueCounts | undefined): ReactNode {
  if (!counts) return null;
  const badges: ReactNode[] = [];
  if (counts.error > 0) badges.push(<span className="tl-issue-pill severity-error" key="error">{counts.error}</span>);
  if (counts.warning > 0) badges.push(<span className="tl-issue-pill severity-warning" key="warning">{counts.warning}</span>);
  if (counts.info > 0) badges.push(<span className="tl-issue-pill severity-info" key="info">{counts.info}</span>);
  return badges;
}

function formatGroupTitle(rawKey: string, entries: TimelineEntry[]): string {
  const hasRunId = entries.some((entry) => typeof entry.runId === "string" && entry.runId.length > 0);
  if (hasRunId) {
    const runId = entries.find((entry) => typeof entry.runId === "string" && entry.runId.length > 0)?.runId ?? rawKey;
    return `runId = ${runId}`;
  }
  const hasChatId = entries.some((entry) => typeof entry.chatId === "string" && entry.chatId.length > 0);
  if (hasChatId) {
    const chatId = entries.find((entry) => typeof entry.chatId === "string" && entry.chatId.length > 0)?.chatId ?? rawKey;
    return `chatId = ${chatId}`;
  }
  return "未分组";
}

function groupTimeline(timeline: TimelineEntry[]): [string, TimelineEntry[]][] {
  if (timeline.length > 0 && timeline.every((entry) => entry.kind === "ws")) {
    return [["WebSocket Frames", timeline]];
  }

  const groups = new Map<string, TimelineEntry[]>();
  timeline.forEach((entry) => {
    const key = entry.runId || entry.chatId || "_ungrouped";
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatShortTime(value: number | string | null): string {
  if (!value) return "--:--:--.---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${pad3(date.getMilliseconds())}`;
}

function formatFullTime(value: number | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${formatShortTime(value)}`;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function pad3(value: number): string {
  if (value < 10) return `00${value}`;
  if (value < 100) return `0${value}`;
  return String(value);
}