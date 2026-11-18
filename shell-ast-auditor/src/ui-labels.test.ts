import { describe, it, expect } from "vitest";
import { label, reasonLines } from "./ui-labels";
describe("Chinese diagnostic summaries", () => {
  it("keeps approval and parsing meanings distinct", () => {
    expect(label("requires_approval")).toBe("需要人工审批");
    expect(label("auto_approved")).toBe("已自动批准");
    expect(label("allow")).toBe("无需人工审批 · 允许");
    expect(label("block")).toBe("禁止执行");
    expect(label("exact")).toBe("精确");
    expect(label("classification")).toBe("只看行为分类");
  });
  it("provides Chinese labels for every current policy category", () => {
    const categories = {
      "bash-agent-authored-code": "智能体编写的代码",
      "bash-complex-filesystem": "复杂文件操作",
      "bash-opaque-command": "程序行为待确认",
      "bash-write-in-write-roots": "允许目录内写入",
      destructive: "可能丢弃数据",
      "executable-config": "可执行配置变更",
      "hard-block": "硬性限制",
      "read-outside-roots": "读取范围外路径",
      "remote-mutation": "修改远程资源",
      "shell-syntax": "命令语法需审查",
      "write-outside-roots": "写入范围外路径",
    };
    for (const [category, chinese] of Object.entries(categories)) {
      expect(label(category), category).toBe(chinese);
    }
  });
  it("retains both reasons and exact paths from the production message", () => {
    const raw =
      'bash path is outside allowed roots: /project; bash command "git" may access files internally; approval covers this invocation, content version and cwd "/work"';
    const lines = reasonLines(raw);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toContain("/project");
    expect(lines[1].text).toContain("git");
    expect(lines[1].original).toContain('cwd "/work"');
  });
  it("does not invent a translation or hide an unknown policy reason", () => {
    const result = reasonLines("future hard gate: sample");
    expect(result[0].text).toContain("原文");
    expect(result[0].original).toBe("future hard gate: sample");
  });
  it("preserves the readonly restriction even for a fully privileged request", () =>
    expect(
      reasonLines(
        "bash path blocked: workspace editing is disabled for this run (Workspace mutation requires editingMode=true): /work/out",
      )[0].text,
    ).toBe("工作区为只读，不能写入：/work/out"));
});
