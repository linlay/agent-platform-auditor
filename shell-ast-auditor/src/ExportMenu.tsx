import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ExportKind } from "./report-data";

const choices: { kind: ExportKind; label: string; description: string }[] = [
  { kind: "human", label: "测试报告", description: "HTML · 阅读判断与异常，可离线打开" },
  { kind: "feedback", label: "优化反馈包", description: "ZIP · 给 agent-platform 的复现与证据" },
  { kind: "raw", label: "完整数据", description: "JSON · 全部原始解析结果，供深度排障" },
];
export function ExportMenu({ onExport, disabled, busy }: { onExport: (kind: ExportKind) => Promise<void>; disabled: boolean; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 34 });
  const id = useId();
  useLayoutEffect(() => {
    if (!open || !root.current || !menu.current) return;
    const anchor = root.current.getBoundingClientRect();
    const popup = menu.current.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.right - popup.width, window.innerWidth - popup.width - 12));
    const preferredTop = anchor.bottom + popup.height + 6 <= window.innerHeight - 12 ? anchor.bottom + 6 : anchor.top - popup.height - 6;
    const top = Math.max(12, Math.min(preferredTop, window.innerHeight - popup.height - 12));
    setPosition({ left: left - anchor.left, top: top - anchor.top });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    const resize = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", resize); };
  }, [open]);
  return <div className="export-menu" ref={root}>
    <button ref={trigger} disabled={disabled || busy} aria-expanded={open} aria-controls={id} aria-busy={busy} onClick={() => setOpen(!open)}>{busy ? "导出中…" : "导出报告"}<span aria-hidden="true"> ▾</span></button>
    {open && <div ref={menu} id={id} style={{ left: position.left, top: position.top, right: "auto" }} className="export-options" role="group" aria-label="报告类型">
      {choices.map(choice => <button key={choice.kind} aria-label={choice.label} onClick={() => { setOpen(false); trigger.current?.focus(); void onExport(choice.kind); }}><span>{choice.label}{choice.kind === "human" && <small>默认</small>}</span><small>{choice.description}</small></button>)}
    </div>}
  </div>;
}
