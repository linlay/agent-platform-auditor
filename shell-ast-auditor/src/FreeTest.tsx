import { useState } from "react";
import { api } from "./api";
import { Case, Result, ReviewOptions } from "./domain";
import { CompactSelect } from "./CompactSelect";
import { ReviewControls } from "./ReviewControls";
import { Inspector } from "./Inspector";
import { ExportMenu } from "./ExportMenu";
import { ExportKind } from "./report-data";
import { exportResultReport } from "./export-report";
import { label } from "./ui-labels";

const profiles: Record<string, string> = {
  "bash-3.2": "bash", "bash-5.2": "bash",
  "sh-dash": "sh", "sh-busybox-ash": "sh", "sh-bash-posix": "sh",
  "zsh-5.9": "zsh", "windows-powershell-5.1": "powershell", "pwsh-7.6": "powershell",
  "cmd-command": "cmd", "cmd-batch": "cmd",
};

// Keep the component mounted between modes, but render only the active view.
// Free inputs and responses never enter testset workspaces or batch records.
export function FreeTest({ active, projectDir, onBusyChange }: { active: boolean; projectDir: string; onBusyChange: (busy: boolean) => void }) {
  const [command, setCommand] = useState("node --version");
  const [profile, setProfile] = useState("bash-3.2");
  const [review, setReview] = useState<ReviewOptions>({ mode: "classification" });
  const [snapshot, setSnapshot] = useState<Case>();
  const [result, setResult] = useState<Result>();
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  async function parse() {
    if (busy || !command.trim()) return;
    const current: Case = {
      id: "custom", command, profile, dialect: profiles[profile], review: { ...review }, projectDir,
      platforms: [], tags: ["custom"], expect: { syntax: "valid", gradeCeiling: "opaque" },
      source: { kind: "user-input", note: "自由测试，没有固定测试预期" },
    };
    setSnapshot(current);
    setResult({ state: "running" });
    setRevision(n => n + 1);
    setError("");
    setBusy(true);
    onBusyChange(true);
    try {
      const parsed = await api<Result>("/api/parse", {
        command: current.command, dialect: current.dialect, profile: current.profile,
        review: current.review, projectDir: current.projectDir, options: {},
      });
      setResult({ ...parsed, state: "done" });
    } catch (e) {
      setResult({ state: "error", error: String(e) });
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function exportReport(kind: ExportKind) {
    if (!snapshot || !result || exporting) return;
    setExporting(true);
    setError("");
    try {
      await exportResultReport({ scope: "free", testsetId: "free", testsetTitle: "自由测试", cases: [snapshot], results: { custom: result } }, kind);
    } catch (e) {
      setError("报告导出失败：" + String(e));
    } finally {
      setExporting(false);
    }
  }

  if (!active) return null;
  const modified = snapshot && (command !== snapshot.command || profile !== snapshot.profile || projectDir !== snapshot.projectDir || JSON.stringify(review) !== JSON.stringify(snapshot.review));
  return <div className="free-test">
    <section className="free-editor" aria-label="自由测试输入">
      <div className="free-toolbar">
        <label>Shell<CompactSelect aria-label="自由测试 Shell" value={profile} disabled={busy} onChange={e => setProfile(e.target.value)}>
          {Object.keys(profiles).map(value => <option key={value} value={value}>{label(value)}</option>)}
        </CompactSelect></label>
        <ReviewControls value={review} projectDir={projectDir} onChange={value => setReview(value ?? { mode: "classification" })} disabled={busy} />
        <button className="primary" disabled={busy || !command.trim()} aria-busy={busy} title="Ctrl / ⌘ + Enter" onClick={() => void parse()}>{busy ? "解析中…" : "解析命令"}</button>
        <ExportMenu onExport={exportReport} busy={exporting} disabled={busy || !result} />
        <button disabled={busy || !result} onClick={() => { setSnapshot(undefined); setResult(undefined); setError(""); }}>清空结果</button>
      </div>
      <textarea aria-label="自定义命令" placeholder="输入 Shell 命令，支持多行" spellCheck={false} value={command} disabled={busy} onChange={e => setCommand(e.target.value)} onKeyDown={e => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void parse(); }
      }} />
    </section>
    {error && <p role="alert">{error}</p>}
    {modified && <small className="free-stale">输入已修改，以下为上次解析结果。</small>}
    {snapshot && <Inspector key={revision} c={snapshot} result={result} defaultTab={snapshot.review?.mode === "syntax-only" ? "执行面" : undefined} />}
  </div>;
}
