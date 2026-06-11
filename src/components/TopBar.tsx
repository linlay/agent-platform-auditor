import type { DetectedMode, Strictness } from "../domain/types";

interface Props {
  detectedModeLabel: string;
  detectedMode: DetectedMode;
  severityFilter: string;
  onSeverityFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  strictness: Strictness;
  onStrictnessChange: (value: Strictness) => void;
  disabled: boolean;
}

export function TopBar(props: Props) {
  return (
    <header className="top-bar">
      <h1>🛡 Auditor</h1>
      <span className={`mode-badge mode-${props.detectedMode}`}>{props.detectedModeLabel}</span>

      <div className="filter-group">
        <label htmlFor="severity-filter">严重度</label>
        <select id="severity-filter" value={props.severityFilter} onChange={(event) => props.onSeverityFilterChange(event.target.value)}>
          <option value="all">全部</option>
          <option value="error">错误</option>
          <option value="warning">警告</option>
          <option value="info">提示</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="search-input">搜索</label>
        <input id="search-input" type="text" value={props.searchQuery} onChange={(event) => props.onSearchQueryChange(event.target.value)} placeholder="path / value..." />
      </div>

      <div className="filter-group">
        <label htmlFor="strictness-select">严格度</label>
        <select id="strictness-select" value={props.strictness} disabled={props.disabled} onChange={(event) => props.onStrictnessChange(event.target.value as Strictness)}>
          <option value="balanced">平衡</option>
          <option value="strict">严格</option>
          <option value="exploratory">探索</option>
        </select>
      </div>
    </header>
  );
}
