import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { label } from "./ui-labels";
export function Tag({
  code,
  text,
  tone = "neutral",
  hint,
}: {
  code: string;
  text?: string;
  tone?: string;
  hint?: string;
}) {
  const tooltip = hint ? `${code} · ${hint}` : code;
  const id = useId(),
    anchor = useRef<HTMLSpanElement>(null),
    popup = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false),
    [focused, setFocused] = useState(false),
    [position, setPosition] = useState({ left: 8, top: 8 });
  const open = hover || focused;
  useLayoutEffect(() => {
    if (!open || !anchor.current || !popup.current) return;
    const a = anchor.current.getBoundingClientRect(),
      p = popup.current.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(a.left, window.innerWidth - p.width - 8)),
      top: Math.max(
        8,
        Math.min(
          a.top - p.height - 6 < 8 ? a.bottom + 6 : a.top - p.height - 6,
          window.innerHeight - p.height - 8,
        ),
      ),
    });
  }, [open, tooltip]);
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setHover(false);
      setFocused(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  return (
    <>
      <span
        ref={anchor}
        className={"tag tone-" + tone}
        title={tooltip}
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setHover(false);
            setFocused(false);
          }
        }}
      >
        {text ?? label(code)}
      </span>
      {open &&
        createPortal(
          <span
            ref={popup}
            role="tooltip"
            id={id}
            className="english-tooltip"
            style={position}
          >
            {tooltip}
          </span>,
          document.body,
        )}
    </>
  );
}
