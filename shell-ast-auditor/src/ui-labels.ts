// Presentation only. Raw CLI identifiers, reports and decisions remain unchanged.
const names: Record<string, string> = {
  "bash-opaque-command": "程序行为待确认",
  "bash-write-in-write-roots": "允许目录内写入",
  "read-outside-roots": "读取范围外路径",
  "write-outside-roots": "写入范围外路径",
  "bash-complex-filesystem": "复杂文件操作",
  "bash-agent-authored-code": "智能体编写的代码",
  destructive: "可能丢弃数据",
  "remote-mutation": "修改远程资源",
  "hard-block": "硬性限制",
  "executable-config": "可执行配置变更",
  ask_for_approval: "按需审批",
  auto_approve: "自动审批",
  full_access: "完全访问",
  "syntax-only": "仅解析语法",
  "legacy-syntax": "仅解析语法（旧版）",
  classification: "只看行为分类",
  evaluation: "评估审批要求",
  requires_approval: "需要人工审批",
  auto_approved: "已自动批准",
  allow: "无需人工审批 · 允许",
  block: "禁止执行",
  hitl: "人工确认",
  auto: "自动审批",
  exact: "精确",
  partial: "部分确定",
  opaque: "无法完整确定",
  valid: "有效",
  invalid: "无效",
  unchecked: "未验证",
  mismatch: "与预期不符",
  complete: "完整覆盖",
  "not-run": "未运行",
  "platform-review": "已进行策略预审",
  "authorization-candidate": "授权候选（尚非许可）",
  diagnostic: "仅供诊断",
  running: "解析中",
  done: "已解析",
  completed: "已完成",
  cancelled: "已取消",
  interrupted: "已中断",
  error: "解析失败",
  match: "符合预期",
  "not-set": "未设预期",
  "not-evaluated": "未评估审批",
  "known-difference": "已知差异",
  unchanged: "无变化",
  changed: "有变化",
  "input-changed": "输入已变化",
  "not-comparable": "无法比较",
  added: "新增用例",
  removed: "移除用例",
  Script: "脚本",
  Sequence: "顺序执行",
  Pipeline: "管道",
  And: "成功后执行",
  Or: "失败后执行",
  Scope: "作用域",
  Exec: "执行点",
  call: "程序调用",
  literal: "固定值",
  symbolic: "动态值",
  incremental: "逐段处理",
  whole: "整体处理",
  line: "按行处理",
  pipe: "管道连接",
  sequence: "顺序关系",
  and: "成功条件",
  or: "失败条件",
  background: "后台执行",
  nested: "嵌套执行",
  profile_unchecked: "版本配置未验证",
  recovered_node: "语法恢复节点",
  syntax_error: "语法错误",
  unverified_construct: "尚未验证的语法",
  code_execution_site: "可能执行代码的位置",
  profile_mismatch: "版本配置不兼容",
  text_hazard: "文本风险",
  known_parser_divergence: "已知解析差异",
  limit_exceeded: "超出解析预算",
  internal_error: "解析器内部错误",
  macos: "macOS",
  linux: "Linux",
  windows: "Windows",
  true: "是",
  false: "否",
  "bash-3.2": "Bash 3.2",
  "bash-5.2": "Bash 5.2",
  "sh-dash": "sh · dash",
  "sh-busybox-ash": "sh · BusyBox ash",
  "sh-bash-posix": "sh · Bash POSIX",
  "zsh-5.9": "Zsh 5.9",
  "windows-powershell-5.1": "Windows PowerShell 5.1",
  "pwsh-7.6": "PowerShell 7.6",
  "cmd-command": "CMD 命令行",
  "cmd-batch": "CMD 批处理",
};
export const label = (code: string) => names[code] ?? code;
export const statusName: Record<string, string> = {
  syntax: "语法",
  recovered: "语法恢复",
  profile: "版本配置",
  coverage: "结构覆盖",
  executionModel: "处理方式",
  tier: "用途",
  grade: "解析程度",
  classification: "分类状态",
};
export function reasonLines(
  reason: string,
): { text: string; original: string }[] {
  if (!reason) return [];
  // Translate only known production message patterns. Unknown reasons stay
  // visible as an explicit untranslated item with the full original in details.
  const parts = reason.split(/; (?=bash (?:path|command)|command |shell )/);
  return parts.map((original) => {
    let text: string;
    const path = original.match(/^bash path is outside allowed roots: (.+)$/);
    const program = original.match(
      /^bash command "([^"]+)" may access files internally/,
    );
    const readonly = original.match(
      /^bash path blocked: workspace editing is disabled for this run \(Workspace mutation requires editingMode=true\): (.+)$/,
    );
    if (path) text = "访问路径超出允许范围：" + path[1];
    else if (program)
      text =
        "“" +
        program[1] +
        "”可能在内部访问文件；审批仅覆盖本次调用及对应的程序版本、工作目录。";
    else if (readonly) text = "工作区为只读，不能写入：" + readonly[1];
    else if (
      original === "all current Platform preflight requirements are satisfied"
    )
      text = "当前预审条件已满足。";
    else if (
      original ===
      "command discards data (recursive deletion or uncommitted changes)"
    )
      text = "命令可能丢弃数据，例如递归删除或丢弃未提交的更改。";
    else if (original === "command modifies a remote resource")
      text = "命令涉及修改远程资源。";
    else if (original === "bash path cannot be resolved statically")
      text = "无法静态确定命令访问的路径。";
    else text = "还有一项策略原因，展开“原始报告”查看原文。";
    return { text, original };
  });
}
