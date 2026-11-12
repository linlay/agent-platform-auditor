# Chat Validator 架构

## 1. 项目概览

独立 TypeScript strict CLI 与本地交互工作台，通过运行中 Platform 的公开 HTTP/SSE API 验证交互。61 个真实集成场景见 `cases/platform.json`。执行器离线测试与真实平台验证命令分离；没有 WS 客户端。

## 2. 技术栈

Node.js ≥ 20、TypeScript strict、原生 fetch / Web Streams / AbortSignal、Vitest。运行期无第三方依赖；本项目独立维护 npm 清单、锁文件和依赖目录。

## 3. 架构设计

- `src/platform/`：Bearer 文件即时读取、HTTP envelope、超时、SSE UTF-8/帧解码和终态断言。
- `src/scenarios/runner.ts`：场景调度、Native 目标发现、fixture、多轮关联、Mailbox 等待、出错中断、清理。
- `src/scenarios/workflows.ts`：多轮流程状态编排、异步 SSE 内的控制操作、计划版本、原 Run 与新 Run 断言、进度证据与收尾。
- `src/reporting/`：脱敏、JSON/Markdown 报告、退出码。
- `src/cases.ts`：声明清单加载、唯一 ID 校验、按 ID/组选择。
- `src/config.ts`：环境变量与 URL/超时校验。
- `src/cli.ts`：CLI、串行执行、持续报告、SIGINT/TERM 后清理。
- `src/ui/` 与 `ui/`：本机 HTTP 工作台、报告浏览、同源运行入口、单批任务状态及浏览器交互。运行使用原 Runner，不独立维护测试逻辑。
- `scripts/check-ui.mjs`：显式浏览器检查，不混入默认离线测试。

## 4. 目录结构

```text
chat-validator/
├── package.json / package-lock.json / tsconfig.json
├── .env.example / .gitignore
├── cases/platform.json
├── src/{platform,scenarios,reporting}/
├── test/fixtures/success.sse
├── test/{sse,client,contracts,scenarios}.test.ts
├── dist/                    # 忽略提交
└── reports/                 # 忽略提交
```

## 5. 数据结构

中立类型位于 `src/types.ts`。JSON 使用递归 Json/Obj，外部输入在边界校验，禁止无说明 any。CaseDefinition 表达 ID、组、动作、请求和预期；CaseResult 保存 passed/failed/skipped/environment_error/timeout/protocol_error、耗时和证据。请求不向报告写认证头或 token 文件内容。

## 6. API 定义

以相邻 agent-platform 的 `docs/API与协议.md`、`internal/api/types.go`、HTTP handler 为参考，所有实际验证通过公开 API。目录 `data` 为数组；query SSE 事件字段平铺；完成事件是 `run.complete`，结束标记是 `[DONE]`；持久化 content.snapshot 使用 `text`。BOT 与普通 /send 都必须继续观察 Chat 最终结果，收据本身不能通过。

## 7. 开发要点

普通目标自动选择无 Workspace 的 native GENERAL，指定目标仍要求普通 Native。Project/BOT 必须显式配置测试目标，无配置跳过。普通新 Chat ID 使用本次随机 cv_ 前缀，BOT 无主要 Chat 时由 send 分配并在收据后记录清理；负例误受理也限制到自建 Chat。使用 `ask_for_approval`，Project 另以 `editingMode:false` 禁止 Workspace 编辑；只在专用工作流中回答合成文本问题与批准无副作用计划，不自动批准其他 HITL，不直接修改被测源码/配置/存储。fixture 共享只在单次 Runner 内生效；基础多轮与 Mail 通过随机标记验证，不硬编码模型回复全文。

## 8. 开发流程

本目录执行 `npm ci`、`npm test && npm run build`。真实验证独立运行 `npm run validate`；`npm run cases` 只列清单。添加集成场景时维护声明和动作，离线测试验证解析/分类/报告/清理等执行器行为，不能将 mock 结果宣称为平台通过。

## 9. 已知约束

真实模型存在波动和用量；要求 tool.result 只能证明发生工具结果，不能单独证明文件访问符合预期，X01 同时验证未提供给模型的预置内容。已覆盖 Planning、question submit、steer、取消后续跑；未覆盖真实 WS、任意 Shell 进程暂停、TEAM 编排、KBX 检索、BOT 主聊天调度/分身回信。超时与停止按 README 处理；强制终止进程无法保证清理。真实平台结果以各次生成的报告为准，认证不通过不得声称完成真实对话覆盖。
