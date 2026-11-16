import { CompactSelect } from "./CompactSelect";
import { useId } from "react";
import { ReviewOptions } from "./domain";
import { label } from "./ui-labels";
export function ReviewControls({
  value,
  onChange,
  projectDir,
  inherit = false,
  disabled = false,
  scope = inherit ? "batch" : "custom",
}: {
  value?: ReviewOptions;
  onChange: (v: ReviewOptions | undefined) => void;
  projectDir: string;
  inherit?: boolean;
  disabled?: boolean;
  scope?: "manual" | "batch" | "custom";
}) {
  const fieldId = useId();
  const mode = value?.mode ?? (inherit ? "inherit" : "classification");
  const configured = Boolean(
    value?.workspace || value?.cwd || value?.editing === false,
  );
  return (
    <fieldset className="review-controls" disabled={disabled}>
      <legend className="sr-only">
        {inherit ? "本次运行模式" : "自定义命令模式"}
      </legend>
      <label>
        模式
        <CompactSelect
          aria-label={
            scope === "manual"
              ? "单用例模式"
              : inherit
                ? "本次运行模式"
                : "自定义审查模式"
          }
          title={mode}
          value={mode}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "inherit") {
              onChange(undefined);
              return;
            }
            if (next === "syntax-only") {
              onChange({ mode: "syntax-only" });
              return;
            }
            onChange({
              mode: next as "classification" | "evaluation",
              workspace: value?.workspace,
              cwd: value?.cwd,
              editing: value?.editing,
              accessLevel:
                next === "evaluation" ? "ask_for_approval" : undefined,
            });
          }}
        >
          {inherit && <option value="inherit">沿用用例设置</option>}
          <option value="syntax-only">仅解析语法</option>
          <option value="classification">只看分类</option>
          <option value="evaluation">评估审批要求</option>
        </CompactSelect>
      </label>
      {mode === "evaluation" && (
        <label>
          权限档位
          <CompactSelect
            aria-label={
              scope === "manual"
                ? "单用例权限档位"
                : inherit
                  ? "本次权限档位"
                  : "自定义权限档位"
            }
            title={value?.accessLevel ?? "ask_for_approval"}
            value={value?.accessLevel ?? "ask_for_approval"}
            onChange={(e) =>
              onChange({
                ...value!,
                accessLevel: e.target.value as ReviewOptions["accessLevel"],
              })
            }
          >
            {["ask_for_approval", "auto_approve", "full_access"].map((v) => (
              <option key={v} value={v}>
                {label(v)}
              </option>
            ))}
          </CompactSelect>
        </label>
      )}
      {(mode === "classification" || mode === "evaluation") && (
        <details className="context-settings">
          <summary
            className={configured ? "is-configured" : undefined}
            data-configured={configured}
          >
            目录与权限
            {configured ? " · 已调整" : ""}
          </summary>
          <div className="form-grid">
            <div className="context-path-field">
              <div className="context-path-heading">
                <label htmlFor={`${fieldId}-workspace`}>工作区</label>
                <button
                  type="button"
                  className="context-use-project"
                  aria-label="工作区使用用例内目录"
                  disabled={!projectDir}
                  title={projectDir || "请先设置用例内目录"}
                  onClick={() => onChange({ ...value!, workspace: projectDir })}
                >使用用例内目录</button>
              </div>
              <input
                id={`${fieldId}-workspace`}
                aria-label={inherit ? "本次 Workspace" : "自定义 Workspace"}
                placeholder="默认跟随用例内目录设置"
                title="留空时使用用例内目录；未设置用例内目录时使用后端当前目录"
                value={value?.workspace ?? ""}
                onChange={(e) =>
                  onChange({ ...value!, workspace: e.target.value })
                }
              />
            </div>
            <div className="context-path-field">
              <div className="context-path-heading">
                <label htmlFor={`${fieldId}-cwd`}>工作目录（cwd）</label>
                <button
                  type="button"
                  className="context-use-project"
                  aria-label="工作目录使用用例内目录"
                  disabled={!projectDir}
                  title={projectDir || "请先设置用例内目录"}
                  onClick={() => onChange({ ...value!, cwd: projectDir })}
                >使用用例内目录</button>
              </div>
              <input
                id={`${fieldId}-cwd`}
                aria-label={inherit ? "本次 cwd" : "自定义 cwd"}
                placeholder="默认跟随用例内目录设置"
                title="留空时使用用例内目录；未设置用例内目录时使用后端当前目录"
                value={value?.cwd ?? ""}
                onChange={(e) => onChange({ ...value!, cwd: e.target.value })}
              />
            </div>
            <label className="check-field">
              <input
                type="checkbox"
                checked={value?.editing !== false}
                onChange={(e) =>
                  onChange({ ...value!, editing: e.target.checked })
                }
              />
              允许修改工作区
            </label>
            <small>目录只用于预审上下文。此应用不会执行命令。</small>
          </div>
        </details>
      )}
    </fieldset>
  );
}
