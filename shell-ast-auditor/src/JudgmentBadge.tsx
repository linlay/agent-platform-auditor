import { Judgment } from "./judgments";
export function JudgmentBadge({
  kind,
  value,
}: {
  kind: string;
  value: Judgment;
}) {
  return (
    <span
      className={"judgment judgment-" + value.tone}
      title={value.reason}
      aria-label={`${kind}：${value.text}`}
    >
      <span className="judgment-dot" aria-hidden="true" />
      {kind}：{value.text}
    </span>
  );
}
