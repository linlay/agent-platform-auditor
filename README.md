# Platform Auditor

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev/)
[![Test](https://img.shields.io/badge/test-vitest-brightgreen)]()
[![License](https://img.shields.io/badge/license-private-lightgrey)]()

Platform Auditor 是一个用于审计 **ZenMind AI 聊天平台**日志的本地单页 Web 应用。支持 JSONL、SSE、WebSocket Frame（含 HAR）、Live Events 等多种日志格式的自动识别、Schema 校验和跨记录规则审计，帮助开发者快速发现数据一致性问题。

```mermaid
flowchart LR
    A[日志输入] --> B[格式识别/解析]
    B --> C[JSON Schema 校验]
    B --> D[跨记录规则引擎]
    C --> E[审计报告]
    D --> E
    E --> F[时间线 / 问题面板 / 详情]
```

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [严格度模式](#严格度模式)
- [支持的格式](#支持的格式)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [贡献](#贡献)
- [常见问题](#常见问题)

## 功能特性

- **多格式自动识别**：JSONL（聊天记录）、SSE（实时事件流）、WebSocket Frame 日志（含 HAR 抓包格式）、Live Events
- **JSON Schema 校验**：基于 AJV 对每条记录进行类型化结构校验
- **规则引擎**：跨记录审计（liveSeq 递增/去重、token 合计校验、contextWindow 超限、chatId 一致性等）
- **三级严格度**：Balanced（平衡）/ Strict（严格）/ Exploratory（探索），可按需切换
- **交互式时间线**：按时间排序的记录列表，支持点击选中查看详情
- **详情面板**：属性树展开、原始 JSON 搜索/高亮/复制
- **问题面板**：按严重度过滤、按路径/值搜索
- **浅色/深色主题**：纯 CSS 实现，跟随系统或手动切换

## 快速开始

### 前置要求

- **Node.js** ≥ 18
- 浏览器：Chrome / Firefox / Safari / Edge 最新两个大版本

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:8000，支持 HMR）
npm run dev
```

> **注意**：Schema 文件通过 `fetch` 从 `public/schemas/` 加载，必须以 HTTP 方式运行。直接双击打开 `dist/index.html` 会导致 Schema 加载失败。

### 一键验证

```bash
npm install && npm test && npm run build
```

确保依赖安装、测试通过、构建成功。

## 使用指南

<!-- TODO: 添加界面截图 -->

### 基本流程

1. **打开页面** → Schema 注册表自动从 `public/schemas/manifest.json` 加载
2. **输入数据** → 支持粘贴文本、选择文件（`.jsonl` / `.txt` / `.log` / `.json` / `.har`）或加载内置示例
3. **点击「解析并审计」** → 自动识别格式、执行 Schema 校验和规则审计
4. **查看结果** → 在时间线、问题面板和详情面板中浏览审计报告
5. **（可选）切换严格度** → 在顶栏切换 Balanced / Strict / Exploratory，结果实时更新

### 界面布局

- **左侧面板**：日志输入区 + 统计概览（记录总数、错误/警告/提示计数）+ 问题列表
- **中间面板**：时间线（按时间排序的所有记录，点击选中查看详情）
- **右侧面板**：详情（属性树 / 原始 JSON / 该记录关联的问题）

### 输入方式

| 方式 | 说明 |
|------|------|
| 粘贴文本 | 在左侧文本区粘贴日志内容后点击「解析并审计」 |
| 选择文件 | 支持 `.jsonl` `.txt` `.log` `.json` `.har` 格式 |
| 加载示例 | 快速加载内置示例数据，方便体验功能 |

### 问题过滤

- **严重度**：全部 / 错误 / 警告 / 提示
- **搜索**：支持按路径（如 `usage.totalTokens`）或值内容搜索问题

## 严格度模式

| 模式 | 未知字段 | 缺失必需字段 | 类型错误 | 适用场景 |
|------|----------|-------------|---------|---------|
| **Balanced**（默认） | warning | error | error | 日常开发，平衡严格性与容错 |
| **Strict** | error | error | error | Schema 验收，严格模式 |
| **Exploratory** | 忽略 | error | error | 探索新格式，仅校验核心字段 |

切换严格度后审计结果会实时更新，无需重新输入数据。

## 支持的格式

### JSONL（聊天记录）

每行一个 JSON 对象，通过 `_type` 字段区分记录类型。支持的类型：

| 类别 | `_type` 值 | 说明 |
|------|------------|------|
| 请求 | `query` | 用户查询请求 |
| 响应 | `react` | Agent 推理/响应 |
| | `react-tool` | Agent 工具调用结果 |
| | `submit` | 提交/应答 |
| 计划 | `planning` | 规划生成 |
| | `plan-execute` | 计划执行记录 |
| 事件 | `event` | 通用事件 |
| | `steer` | 用户干预/引导 |
| | `system` | 系统消息 |
| 审计 | `compact` | 单次压缩尝试的结果及诊断 |
| 兼容 | `step` | 旧格式（兼容） |

`_type:"query"` 的 `query` 保存调用方原始输入，支持 HTTP/WS、`chat_start`、`agent_invoke`/`agent_delegate` 任务条目和 Automation。输入中省略的 ID、role、默认值不会补写；显式 `null` 保留，`role` 仅作为原始输入记录。平台决定放在行顶层：`requestId/agentKey/lane/origin/accessGrant/planRunId/accessLevel/hidden/planningMode/editingMode/model/references`；任务字段为 `taskId/taskName/taskToolId/taskAgentKey`。`lane` 仅旁路记录 `btw` 或 `explain`，分支号 `sideId` 留在原始输入中。

`query` 和 `messages` 均可省略：纯系统快照只携带 `system`，不要求 `liveSeq`；批准计划后的执行首行以 `planRunId` 关联规划 Run。只有 `messages` 的历史行继续接受，普通请求的游标检查保留。旧 Query 布局、`subAgentKey/taskSubAgentKey` 和 `kind:"system-init"` 继续兼容。

所有 JSONL 行类型均允许可选的顶层 `_compact`。旧格式为非空且首尾无空白的字符串 ID；当前格式为 `{ "level": "L1", "id": "compact-123", "keep": ["content"] }`，`level` 支持 `L0/L1/L2`，`id` 同样要求非空且首尾无空白。`keep` 可省略或为空数组，元素仅允许 `content/reasoning/tool` 且不能重复。压缩标记不会跳过该行原有的结构和规则审计。

独立的 `_type:"compact"` 行记录一次压缩尝试。必填字段为 `_type/chatId/compactId/status/startedAt/updatedAt/durationMs`；`status` 支持 `completed/failed/skipped`，可选 `level` 使用 `l1_tools/summary`，`scope` 使用 `run/history`，`trigger` 使用 `auto/manual`。历史压缩可省略 `runId/liveSeq`；活动 Run 的审计行可以复用紧邻事件的 `liveSeq`。模型、窗口、估算与清理统计、`compactionUsage/diagnostics/error` 按原样校验和展示；时间点采用安全整数 epoch 毫秒，耗时和计数必须为非负整数。失败结果本身是合法审计数据。

平台不将 compact 审计行用于上下文或聊天回放；auditor 在原始 JSONL 时间线展示它的层级、范围、状态及失败原因。新增格式依据相邻 `agent-platform` 的 `CompactRecordLine`、`compact_record.go` 和历史压缩写入代码核对，当前来自尚未提交的工作区改动。

`_type:"steer"` 使用专用 `steer` payload；`requestId` 可省略，`chatId/runId/steerId/message/role` 必填，`role` 固定为 `user`。`message` 可为空字符串（当前存储校验允许“继续执行”输入），支持 `references` 和 Agent 来源 `origin`；来源必须包含 `type:"agent"` 与非空 `agentKey/chatId/runId/toolId`。旧 `source` 名称及单条用户 `messages` 快照继续兼容。`steer` 内不接受 `type/timestamp/seq/liveSeq`。旧的 `_type:"steer" + event` 以及 `_type:"event" + event.type:"request.steer"` 仍按硬切协议报错。

#### 2026-10-16 契约核对

按相邻 `agent-platform` 本地 `main`（HEAD `1c468e41`）最近 10 次提交逐条核对，以 `internal/chat/types.go`、`query_line.go`、`jsonl_schema.go`、StepWriter 及相关测试的实际行为为准。

| 提交（由新到旧） | JSONL 影响与处理 |
|------|------|
| `1c468e41` 彩色连接器图标 | 无格式变化 |
| `d18af52a` MCP 地址导入 | 无行结构变化，导入及诊断返回使用既有开放 payload |
| `fe719e9d` MCP 授权发现与登录竞态 | 无格式变化 |
| `c382b9f8` MCP 标准授权 | 工具结果内容变化，既有开放正文结构已支持 |
| `35877b17` 线条图标 | 无格式变化 |
| `c2974bf6` v0.5.3 版本号 | 无格式变化 |
| `df075222` 固化 Query 有效值 | 接受顶层 `hidden/taskName`，允许无 query/messages 的快照和计划执行行，校验原始输入的规范字段名称 |
| `d6c9b66b` 原始 Query 与元数据分离 | 更新 Query 顶层元数据、三种 origin、旁路输入、任务 `taskAgentKey`、steer.origin 及历史兼容 |
| `bd084673` MCP 搜索与调用 | JSONL 正文已支持；同步实时事件的 `tool.result.target/toolLabel` 字段 |
| `ad471fcc` CLI 登录准备与错误码 | 错误码值变化，无行结构变化 |

Schema 与规则版本为 `2026-10-16.compact-record-v3`；回归数据见 `test/fixtures/jsonl/valid-query-origin.jsonl` 和 `valid-compact.jsonl`。除上述提交涉及的契约及通用 `_compact` 字段外，已同步后续新增的独立 compact 审计行；表中既有兼容类型仍保留。

### WebSocket Frame 日志

支持两种输入形式：逐行 JSON Frame 或 HAR 文件（自动提取 `_webSocketMessages` 数组）。

| `frame` 值 | 说明 |
|-----------|------|
| `request` | 客户端请求 |
| `response` | 服务端响应 |
| `stream` | 流式推送 |
| `push` | 服务端主动推送 |
| `error` | 错误帧 |

### SSE（Server-Sent Events）

标准 SSE 文本格式，支持 `event:` / `data:` 行以及 `[DONE]` 终止标记。

### Live Events

每行一个 JSON 事件对象，包含 `type` / `seq` / `timestamp` 字段。

### 审计规则

规则配置在 `public/schemas/rules/jsonl-rules.json` 中，主要包含：

- **Token 校验**：`usage.totalTokens` = `promptTokens + completionTokens`
- **Context Window**：`currentSize` ≤ `maxSize`
- **liveSeq 审计**：同一 `runId` 下 liveSeq 默认严格递增且不重复；`react-tool` 可复用当前公开游标（与前一条相等）以持久化隐藏工具结果，但仍不得倒退
- **react-tool seq 审计**：`react-tool.seq` 须等于同 `runId` 最近一条 `react.seq`
- **chatId 一致性**：同一 `runId` 的记录 chatId 须一致
- **steer 身份一致性**：`steer.chatId/runId` 须分别等于顶层 `chatId/runId`
- **旧格式检测**：`_type=step` 提示升级
- **awaiting 旧字段**：检测 `awaiting` 数组中的嵌套 `liveSeq`/`seq`

## 项目结构

```
platform-auditor/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── schemas/
│       ├── manifest.json              # Schema 注册清单
│       ├── common/common.schema.json  # 公共 schema 片段
│       ├── jsonl/                     # JSONL 各类型 schema（11 种）
│       ├── ws/                        # WebSocket frame schema（5 种）
│       └── rules/jsonl-rules.json     # 审计规则定义
├── src/
│   ├── main.tsx                       # 入口
│   ├── App.tsx                        # 主组件
│   ├── styles.css                     # 全局样式
│   ├── domain/                        # 核心逻辑
│   │   ├── types.ts                   # 类型定义
│   │   ├── parsers.ts                 # 格式解析器
│   │   ├── auditor.ts                 # 审计主流程
│   │   ├── schemaRegistry.ts          # Schema 注册与查询
│   │   ├── schemaValidator.ts         # AJV 校验适配
│   │   ├── rulesEngine.ts             # 规则引擎
│   │   ├── utils.ts                   # 工具函数
│   │   └── auditor.test.ts           # 核心逻辑测试
│   └── components/                    # UI 组件
│       ├── TopBar.tsx
│       ├── InputPanel.tsx
│       ├── OverviewPanel.tsx
│       ├── IssuesPanel.tsx
│       ├── TimelinePanel.tsx
│       └── DetailTabs.tsx
└── test/fixtures/                     # 测试用 fixture 数据
    ├── jsonl/
    └── ws/
```

> `dist/` 和 `node_modules/` 为构建/依赖产物，已通过 `.gitignore` 排除。

## 开发指南

### NPM Scripts

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 8000，HMR） |
| `npm run build` | TypeScript 类型检查 + 生产构建 → `dist/` |
| `npm test` | 运行 Vitest 全量测试（单次） |

### 构建产物

`npm run build` 后 `dist/` 目录包含 `index.html`、打包后的 JS/CSS（`assets/`）以及 `schemas/` 目录。部署时将 `dist/` 内容上传到任意静态服务器即可，Schema 通过相对路径加载，无需额外 CORS 配置。

### 本地预览构建

```bash
npx serve dist
# 或
npx http-server dist
```

### Nginx 部署示例

```nginx
server {
    listen 80;
    server_name auditor.example.com;
    root /var/www/platform-auditor/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /schemas/ {
        try_files $uri =404;
    }
}
```

### 运行测试

```bash
npm test                     # 单次全量测试
npx vitest                   # watch 模式
npx vitest run --reporter=verbose  # 详细输出
```

测试覆盖：各 `_type` Schema 校验、跨记录规则（liveSeq、token、contextWindow 等）、WebSocket/SAR 解析、SSE 解析、严格度行为差异。

### 测试 Fixture

| 文件 | 说明 |
|------|------|
| `test/fixtures/jsonl/valid-all-types.jsonl` | 所有合法类型示例 |
| `test/fixtures/jsonl/invalid-schema.jsonl` | Schema 校验失败用例 |
| `test/fixtures/jsonl/invalid-rules.jsonl` | 规则审计失败用例 |
| `test/fixtures/jsonl/invalid-event-steer.jsonl` | event/steer 硬切、字段白名单与身份一致性校验 |
| `test/fixtures/jsonl/missing-liveseq-by-type.jsonl` | liveSeq 缺失检测 |
| `test/fixtures/ws/har-websocket.json` | HAR WebSocket 抓包示例 |

## 贡献

本项目为 ZenMind 平台内部工具。欢迎提交 Issue 和 Pull Request。

### 开发约定

- 提交前确保 `npm test` 通过
- 新增日志类型需同步更新 `manifest.json` 和对应 schema 文件，并在 `test/fixtures/` 下添加用例
- 审计规则通过 `jsonl-rules.json` 配置，无需修改代码

### 本地开发流程

1. Fork / Clone 本仓库
2. `npm install`
3. `npm run dev` 启动开发服务器
4. 修改代码，HMR 自动热更新
5. `npm test` 确认测试通过
6. `npm run build` 确认构建成功
7. 提交 PR

## 常见问题

### 粘贴日志后点击"解析并审计"没有反应？

请检查：1) 输入内容是否为空；2) 界面顶部是否显示识别的格式模式；3) 若显示"未识别"，说明输入不在支持的格式范围内；4) F12 打开控制台查看错误信息。

### 为什么直接打开 dist/index.html 无法加载 Schema？

`fetch` API 不支持 `file://` 协议。需通过 HTTP 服务访问：`npx serve dist` 或 `npx http-server dist`。

### HAR 文件中的 WebSocket Frame 没有显示？

确认 HAR 文件包含 `_webSocketMessages` 数组（工具会递归搜索 JSON 结构）。若仍不显示，检查每条 message 的 `data` 字段是否为包含 `frame` 属性的合法 JSON。

### 如何新增 JSONL 类型？

1. 在 `public/schemas/jsonl/` 下创建 schema 文件，定义 `$id` 和字段约束
2. 在 `public/schemas/manifest.json` 注册 `$id` 和路径
3. 在 `test/fixtures/jsonl/` 下添加有效/无效用例
4. 运行 `npm test` 确认校验正常
5. （可选）在 `jsonl-rules.json` 中添加该类型的审计规则
