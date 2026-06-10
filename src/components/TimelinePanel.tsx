import type { TimelineEntry } from "../domain/types";

interface Props {
  timeline: TimelineEntry[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function TimelinePanel({ timeline, selectedIndex, onSelect }: Props) {
  if (timeline.length === 0) return <div className="timeline-empty">暂无时间线数据</div>;

  const groups = groupTimeline(timeline);
  return (
    <div className="timeline">
      {groups.map(([groupKey, entries]) => (
        <div className="timeline-group" key={groupKey}>
          <div className="timeline-group-title">{groupKey}</div>
          <div className="tl-header">
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
              className={`tl-entry ${entry.recordIndex === selectedIndex ? "selected" : ""}`}
              onClick={() => onSelect(entry.recordIndex)}
              title={[formatFullTime(entry.time), entry.seq || "", entry.liveSeq || "", entry.typeLabel, entry.summary].filter(Boolean).join(" · ")}
            >
              <span className="tl-time">{formatShortTime(entry.time)}</span>
              <span className="tl-seq">{entry.seq || ""}</span>
              <span className={`tl-live-seq${(entry.liveSeq || "").length > 1 ? " tl-live-seq-pill" : ""}`}>{entry.liveSeq || ""}</span>
              <span className="tl-type">{entry.typeLabel}</span>
              <span className="tl-summary">{entry.summary}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupTimeline(timeline: TimelineEntry[]): [string, TimelineEntry[]][] {
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
