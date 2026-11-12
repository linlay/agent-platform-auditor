# Chat Validator

## 1. 项目简介

通过公开 HTTP/SSE API 验证运行中的 Agent Platform。当前提供 **61 个集成用例**：27 个协议与准入用例（P01–P27）、20 个真实对话及会话行为用例（C01–C20）、2 个可选 Project/BOT 用例（X01–X02），以及 12 个多轮、Steer、Planning、Interrupt 工作流（M/S/L/I 系列）。清单见 [cases/platform.json](cases/platform.json)。执行器有独立离线测试，不用离线通过数代替平台通过数。

当前提供命令行执行器和本地交互工作台，没有 WS 客户端或 BOT 派活/回信验证；Planning 已覆盖合成计划的批准、拒绝修订和 steer 失效。Project/BOT 未配置时跳过；KBX 状态只做健康观察，不宣称知识库检索已经验证。

本机 11949 的实测结果与已发现问题见 [VALIDATION.md](VALIDATION.md)。

## 2. 快速开始

Node.js ≥ 20，在本目录执行：

```bash
npm ci
npm test && npm run build
npm run cases
# 启动交互工作台（先 build）
npm run ui

export PLATFORM_URL=http://127.0.0.1:11949
export PLATFORM_TOKEN_FILE=/absolute/path/to/current-token
# 可选；缺省选择无 Workspace 的 Native GENERAL。
export PLATFORM_AGENT_KEY=your-test-agent
npm run validate
```

token 文件必须是纯 JWT 文本，按请求重新读取，支持换票；真实凭据不复制到项目、不写入报告。`PLATFORM_TOKEN` 可作为环境变量备用，同时设置时文件优先。需要身份合法访问目标 Agent/Chat。401/403 为环境错误，不能解释成参数校验成功。

```bash
npm run validate -- --only P01,P02
npm run validate -- --only protocol
npm run validate -- --only C01,C02,C03 --report-dir reports/memory
npm run validate -- --only chat
# 调试时保留本次 Chat；之后需人工清理
npm run validate -- --keep-chats
```

用例依赖的 Chat/Mail fixture 按需创建，所以单独运行 C02、C15 等也可执行。全量运行复用本次调用的基础 fixture；requestId/chatId/口令按执行生成。集成命令会调用真实模型并产生用量，执行串行。默认使用 `ask_for_approval`。基础场景遇到意外 `awaiting.ask` 会失败并中断；工作流只回答本次合成文本问题、批准只回复测试标记的计划，其他审批一律不自动通过。

## 3. 配置说明

工具只读取进程环境，**不会自动加载 `.env`**；变量模板见 [.env.example](.env.example)。

| 变量 | 缺省 / 用途 |
| --- | --- |
| PLATFORM_URL | `http://127.0.0.1:11949`，只接受 HTTP(S) origin |
| PLATFORM_TOKEN_FILE | 合法 JWT 文本文件路径，每次请求重新读取 |
| PLATFORM_TOKEN | 无文件时使用的 Bearer token |
| PLATFORM_AGENT_KEY | Native 测试 Agent，缺省发现无 Workspace 的 GENERAL |
| PLATFORM_TIMEOUT_MS | 每次请求 / Mail 等待期限，默认 `120000`，范围 `1000..600000` |
| PLATFORM_PROJECT_AGENT_KEY | 专用 Project 测试 Agent，必须绑定 Workspace |
| PLATFORM_PROJECT_FILE | 专用 Workspace 内预先准备的只读文件路径 |
| PLATFORM_PROJECT_EXPECT | 文件应含的非敏感文本，不会直接写进模型问题 |
| PLATFORM_BOT_AGENT_KEY | 专用 BOT 测试目标，须没有主要 Chat；已有主要 Chat 则跳过 |

Project 须同时配置三个变量；BOT 需显式目标。执行器不创建 Agent、不改配置、不准备 Workspace 文件。X01 要求实际工具结果和正确文件内容，X02 只在 BOT 无主要 Chat 时省略 chatId，以 primary:true 创建测试主聊天，再等待最终 Run 完成和回答标记；已有主聊天时跳过，不能凭收据通过。BOT 主聊天调度、分身和回信不在当前覆盖范围。

## 4. 部署

`npm run build` 输出 `dist/src/cli.js`。独立复制时保留 `cases/`、npm 清单、锁文件及 `dist/`，在本目录安装和运行，不引用相邻项目源码或共享依赖。编译包含离线测试，`validate` 不运行离线测试。

## 5. 运维与结果解释

执行在 `reports/<UTC 时间>/` 生成 `report.json` 和 `report.md`。报告按用例持续落盘，包含分类、耗时、脱敏请求/回答/事件，以及 requestId、chatId、runId、mailId。健康检查的 KBX 降级保留在证据中。

| 状态 | 含义 |
| --- | --- |
| passed | 实际执行且所有断言成立 |
| failed | 反馈/状态/业务断言失败，包括真实 run.error/run.cancel |
| skipped | 未配置能力目标，或关闭认证时的免认证拒绝测试 |
| environment_error | 认证、网络、目标等前置条件失败 |
| timeout | 请求超时或收据后未观察到最终回答 |
| protocol_error | JSON/SSE、缺少 DONE/终态等协议错误 |

退出码：0 为所有已执行用例通过（允许部分 skipped）；1 为场景失败、环境/协议/超时错误或清理失败；2 为配置/参数错误，或没有通过用例。缺少认证时只做一次目录预检，其余依赖认证的用例报告环境错误，不将未执行项算作通过。

正常完成的 SSE 对话通过要求 `[DONE]`、唯一 `run.complete`、非空助手正文及场景断言；中断工作流明确断言唯一 `run.cancel`、canContinue 与后续新 Run 身份，不把取消当成功完成。Mail 轮询最终终态与正文。回放使用 `/api/chat`、`/api/chat/jsonl`，不读取被测服务本地数据库。

持久化查询行通过 `_type:"query"` 识别。`run.activity` 不占公共游标，要求 `seq:0`；其他公开事件的正序号严格递增，允许因 simple 档过滤而跳号。P17 根据 `/api/send` 的重复 JSON 键拒绝合同检查 HTTP 400，保留原始重复键并绑定本次 Chat，不能把被受理的收据当作通过。

除读取目录/摘要外，仅修改本次分配的 `cv_` Chat：对话、重命名、已读、归档、删除。不切换现有主要聊天、置顶或排序。默认清理所有 fixture，包括失败/误受理请求生成的 Chat 和归档。SSE 出错或超时后已知 Run 会尝试同身份 HTTP interrupt，随后按 Chat 生命周期清理。清理失败保留 ID 并使退出码非零，不能将客户端超时当成 Run 已停止。Ctrl-C/TERM 在当前受超时约束的用例结束后清理并保存报告；强制杀进程无法保证清理。

报告默认忽略提交。分享前仍需检查业务文本；凭据键、Bearer/JWT、资源 ticket 会脱敏。多个断言共享同一模型响应时，报告保留 fixture 身份，不代表相同数量的独立模型调用。

## 6. 交互工作台

执行 `npm run build && npm run ui`，打开 http://127.0.0.1:11950。默认仅监听本机，`UI_PORT` 可更改工作台端口。页面执行目标固定为 `http://127.0.0.1:11949`。

- 点击用例核对定义、预期、结论、对话、请求/响应和可展开的 SSE / JSONL 证据；支持搜索、分组和结果筛选。
- 点击右上“运行设置”，在弹框中粘贴合法 JWT、指定普通 Native Agent，再“运行此用例”；也可勾选多个后“运行所选”，或“运行全部”。Token 只留在页面和当前执行进程内存，不写报告或浏览器持久存储。
- 运行轮次与历史报告选择器合并在标题栏；显示当前用例、流程阶段和逐项结果，一次只允许一批任务。“停止后续”会等当前受超时约束的用例收尾，再清理测试 Chat，未执行项不会显示为通过。
- 结果持续保存到 `reports/ui-*/`；刷新报告列表即可查看。支持历史报告切换、本地 JSON 导入及当前报告导出。
- 页面调用原有真实 Runner，不使用模拟数据。页面暂未提供 Project / BOT 配置字段，这两项按原规则跳过；需要配置时使用 CLI。

`npm run test:ui` 是独立浏览器验证，需要工作台和 11949 服务已启动，以及本机 Chrome。它实际点击运行 P01/P02（无需 JWT、不调用模型），检查单例、批量、筛选和窄屏布局；用 `CHROME_PATH` 指定 Chrome 可执行文件。默认 `npm test` 仍为离线测试。

## 7. 复杂流程测试

`npm run validate -- --only multiturn,steer,planning,interrupt` 可独立运行新增 12 项。工作台左侧同名分组可逐例或批量运行。每项保留步骤定义、每轮输入、控制接口收据、SSE 时间线及关联 Run / awaiting / steer 标识；没有观察到真正等待或模型输出时不会通过。

| 用例 | 完整流程与关键断言 |
| --- | --- |
| M01 | 四轮修订预算、城市，最后解析 JSON，检查保留值与修订累加 |
| M02 | 主对话建立草稿 → BTW 取消 → 主历史不变 → 主对话仍读到草稿 |
| S01 | wait 活动 → steer 新需求 → 同 Run 消费新要求并输出新值 |
| S02 | wait 活动 → 空白 steer → continued:true → 原 Run 立即继续 |
| S03 | wait 活动 → steer 新 selection → 回复未在原问题中提供的新标记 |
| L01 | 计划等待确认 → approve → 旧 Run 完成 → attach 独立执行 Run → planRunId 关联 |
| L02 | 第一版计划 → reject 反馈 → 同 Run 新确认 → 批准后只执行修订版 |
| L03 | 计划等待 → steer 取代 → 旧 approve 返回 409 → superseded → 新版批准执行 |
| I01 | 实际模型输出中 interrupt → run.cancel → canContinue → 空 query 新 Run 恢复上下文 |
| I02 | wait 工具活动中 interrupt → run.cancel → 空 query 新 Run 继续原任务 |
| I03 | 提问工具暂停 → interrupt → 旧 submit 返回 409 → 新消息恢复任务 |
| I04 | 文本提问工具暂停 → 确认 awaiting → submit 合成答案 → 原 Run 消费并完成 |

`interrupt` 取消整个 Run，续跑会创建新 Run，不能宣称原地暂停进程或某个任意 Bash 工具。`wait` 的 steer 提前继续、以及 question 的 submit 继续发生在原 Run。Steer 经当前 Mailbox 路径以 `reason:mail` 唤醒时，还必须关联同一用户 `request.steer`；空白 steer 必须有 `steered / continued` 事实。

需要挂载 wait / ask_user_question 的用例会预检目标工具，缺少时明确跳过。复杂场景全部使用本次新建 Chat、禁止 Workspace 编辑，不改变现有 Chat 或 Agent 配置。
