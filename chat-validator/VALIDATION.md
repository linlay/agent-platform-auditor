# 11949 实测记录

2026-11-12 对 `http://127.0.0.1:11949` 执行首批 49 个集成用例（以下保留该轮结果）。认证使用调用方提供的 JWT，仅传入测试进程环境，未写入项目文件。

| 范围 | 结果 |
| --- | --- |
| 27 个协议与准入用例 | 26 passed，1 failed |
| 20 个对话及会话行为用例 | 20 passed |
| 2 个可选能力用例 | 2 skipped |
| 执行器离线测试 | 75 passed |
| TypeScript 构建 | passed |
| 本次 Chat / Archive 清理 | 无错误 |

本次普通目标为无 Workspace 的 Native GENERAL `desktopAssistant`。对话用例按需共享本次基础 Chat/Mail fixture，20 个通过项代表 20 个行为断言场景，不代表 20 次独立模型调用。所有测试会话经公开 API 创建、回读并清理。

完整逐例结果、原始请求、HTTP 响应和脱敏 SSE / JSONL 证据保存在本机忽略提交的 [JSON 报告](reports/11949-verified-2026-11-12/report.json) 与 [Markdown 报告](reports/11949-verified-2026-11-12/report.md)。此前 `authenticated` / `final` 目录是执行器校准阶段的历史结果，最终结论以 `11949-verified-2026-11-12` 为准。

## P17：send 接受重复 JSON 键

平台文档 `docs/API与协议.md` 的 `/api/send` 合同明确拒绝重复 JSON 键。P17 保留原始重复 `message` 键，明确指定测试 Agent、随机 requestId 和本次自建 Chat：

```json
{
  "agentKey": "desktopAssistant",
  "chatId": "<本次 cv_ fixture>",
  "requestId": "<本次随机 requestId>",
  "accessLevel": "ask_for_approval",
  "message": "只回复CV_DUPLICATE_FIRST",
  "message": "只回复CV_DUPLICATE_SECOND"
}
```

预期 HTTP 400；实际 HTTP 200、`code:0`，返回 `mailId`、`runId`、`delivery:"started"`、`status:"inflight"`。请求已被受理，故该用例保持失败，整体验证命令退出码为 1。该 Chat 已由清理阶段删除。

源码线索：`internal/contracts/queryinput/send.go` 的 `SendRequest.UnmarshalJSON` 调用 `strict_json.go` 的 `DecodeStrictJSON`；当前使用标准 JSON 解码和字段名校验，没有在解码前检查同一对象的重复键。这里只记录验证结果和定位线索，未修改被测 Platform 源码或配置。

配置合法身份文件后可单独复现：

```bash
export PLATFORM_URL=http://127.0.0.1:11949
export PLATFORM_TOKEN_FILE=/absolute/path/to/current-token
export PLATFORM_AGENT_KEY=desktopAssistant
npm run validate -- --only P17
```

## 跳过范围

- X01：`coder.demo` 的专用 Workspace 当前为空，未配置预置文件和预期内容，未宣称 Project 文件读取通过。
- X02：`bot.demo` 已有主要聊天。当前 API 不接受用随机不存在的 chatId 为 BOT 新建分身；执行器跳过，避免向既有主聊天插入测试消息。使用没有主要 Chat 的专用 BOT 时，该用例会创建主聊天、等待最终结果，再清理本次 Chat。

## 执行器校准

真实验证后已修正执行器的错误假设，并纳入离线回归：请求权限使用 `ask_for_approval`；持久化查询行使用 `_type:"query"`；`run.activity` 使用不占公共游标的 `seq:0`；HTTP 幂等冲突允许标准的数字 code / msg envelope，同时检查冲突后未多开 Run。BOT 的已有主要 Chat 有明确的跳过保护。

## 新增复杂工作流：2026-11-12

当前清单共 61 项；新增 M01/M02、S01–S03、L01–L03、I01–I04 共 **12 个复杂工作流**已在同一 11949 服务、Native GENERAL desktopAssistant 上实际执行，**12 passed、0 failed、0 skipped、无清理错误**。原有 P17 缺陷记录不因这一轮通过而消失；本轮仅执行新增工作流，没有重跑原 49 项。

最终 [工作流 JSON 证据](reports/11949-workflows-verified-2026-11-12/report.json) / [可读结果](reports/11949-workflows-verified-2026-11-12/report.md) 保存完整每轮交互与状态。初轮 `11949-workflows-2026-11-12` 是执行器校准历史，最终以带 verified 的报告为准。

已观察到真实的 Planning 等待/拒绝/steer 作废/独立 execute Run、模型输出和 wait 中断后的空 query 新 Run 续跑、提问等待中断及旧提交拒绝、同 Run 提交答案后继续。当前带正文的 steer 通过 Mailbox 唤醒 wait，其 reason 是 mail；执行器同时核对同一用户 steerId、消费后新内容和 Run 身份。

本轮离线测试 99 passed，TypeScript 构建和 Chrome 页面交互检查通过；工作台顶部收紧，运行选择器并入标题栏，运行设置放入弹框。
