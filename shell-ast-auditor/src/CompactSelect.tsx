import { SelectHTMLAttributes, useLayoutEffect, useRef, useState } from "react";

// The hidden label sizes the control to its current option, rather than its
// longest option. Keep a native select for keyboard and platform interaction.
export function CompactSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const select = useRef<HTMLSelectElement>(null);
  const [text, setText] = useState("");
  useLayoutEffect(() => {
    setText(select.current?.selectedOptions[0]?.label ?? "");
  }, [props.value, props.children]);

  return (
    <span className="compact-select">
      <span className="compact-select-value" aria-hidden="true">
        {text}
      </span>
      <select {...props} ref={select} title={props.title ?? text} />
    </span>
  );
}
