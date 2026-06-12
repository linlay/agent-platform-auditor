# Platform Auditor

Platform Auditor 是一个用于审计 **ZenMind AI 聊天平台** 日志的本地单页 Web 应用。它支持多种日志格式的解析、校验和分析，帮助开发者快速发现数据一致性问题。

## 功能特性

- **多格式支持**：自动识别 JSONL（聊天记录）、SSE（实时事件流）、WebSocket Frame 日志（含 HAR 抓包格式）、Live Events
- **JSON Schema 校验**：基于 AJV 对 JSONL 记录和 WebSocket frame 进行类型化结构校验
- **规则引擎**：支持跨记录审计规则（liveSeq 递增/去重、token 合计校验、contextWindow 超限、chatId 一致性等）
- **可切换严格度**：Balanced（平衡）/ Strict（严格）/ Exploratory（探索）
- **交互式时间线**：按时间排序查看所有记录，支持点击选中查看详情
- **详情面板**：属性树展开、原始 JSON 搜索/高亮/复制
- **问题面板**：按严重度（错误/警告/提示）过滤、按路径/值搜索

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | React 18 + TypeScript 5 |
| 构建 | Vite 5 |
| Schema 校验 | AJV 8 |
| 测试 | Vitest + Testing Library |
| 样式 | 纯 CSS（支持浅色/深色主题） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:8000）
npm run dev
```

> **注意**：项目通过 `fetch` 从本地 `public/schemas/` 加载 JSON Schema 文件，因此需要以 HTTP 方式运行。直接双击打开 `dist/index.html` 会导致 schema 加载失败。

## 使用方式

### 输入数据

- **粘贴文本**：在左侧文本区域粘贴 JSONL / SSE / WebSocket 日志，点击「解析并审计」
- **选择文件**：支持 `.jsonl`、`.txt`、`.log`、`.json`、`.har` 格式
- **加载示例**：快速加载内置的示例数据

### 审计结果

解析完成后，界面分为三栏：

| 区域 | 内容 |
| --- | --- |
| 左侧 | 输入区 + 统计概览 + 问题列表 |
| 中间 | 时间线（按时间排序的记录列表） |
| 右侧 | 详情面板（属性树 / 原始 JSON / 相关问题） |

### 过滤与搜索

- **严重度过滤**：全部 / 错误 / 警告 / 提示
- **搜索**：按路径或值过滤问题
- **严格度切换**：Balanced（默认）、Strict（未知字段报 error）、Exploratory（未知字段不报）

## 支持的格式

### JSONL（聊天记录）

每行一个 JSON 对象，通过 `_type` 字段区分记录类型：

| `_type` | 说明 |
| --- | --- |
| `query` | 用户查询请求 |
| `react` | Agent 推理/响应 |
| `react-tool` | Agent 工具结果（seq 跟随上一条 react） |
| `plan-execute` | 计划执行记录 |
| `submit` | 提交/应答 |
| `planning` | 规划生成 |
| `event` | 通用事件 |
| `steer` | 用户干预/引导 |
| `system` | 系统消息 |
| `step` | 旧格式（兼容） |

### WebSocket Frame 日志

支持两种输入形式：
- **逐行 JSON Frame**：每行一个包含 `frame` 字段的 JSON
- **HAR 文件**：自动提取 `_webSocketMessages` 数组

| `frame` | 说明 |
| --- | --- |
| `request` | 客户端请求 |
| `response` | 服务端响应 |
| `stream` | 流式推送 |
| `push` | 服务端主动推送 |
| `error` | 错误帧 |

### SSE（Server-Sent Events）

标准 SSE 文本格式，支持 `event:` / `data:` 行以及 `[DONE]` 终止标记。

### Live Events

每行一个 JSON 事件对象，包含 `type` / `seq` / `timestamp` 字段。

## 规则审计

审计规则通过 `public/schemas/rules/jsonl-rules.json` 配置，主要包括：

- **Token 校验**：`usage.totalTokens` 应等于 `promptTokens + completionTokens`
- **Context Window**：`actualSize` 不超过 `maxSize`
- **liveSeq 审计**：同一 `runId` 下 liveSeq 应递增、不重复
- **react-tool seq 审计**：`react-tool.seq` 必须等于同一 `runId` 下之前最近一条 `react.seq`
- **旧格式检测**：`_type=step` 旧格式提示升级
- **chatId 一致性**：同一 `runId` 的记录 chatId 应一致
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
│       ├── jsonl/                     # JSONL 各类型的 schema
│       │   ├── query.schema.json
│       │   ├── react.schema.json
│       │   ├── react-tool.schema.json
│       │   ├── plan-execute.schema.json
│       │   ├── submit.schema.json
│       │   ├── event.schema.json
│       │   ├── steer.schema.json
│       │   ├── planning.schema.json
│       │   ├── system.schema.json
│       │   └── step.schema.json
│       ├── ws/                        # WebSocket frame schema
│       │   ├── request.schema.json
│       │   ├── response.schema.json
│       │   ├── stream.schema.json
│       │   ├── push.schema.json
│       │   └── error.schema.json
│       └── rules/
│           └── jsonl-rules.json       # 审计规则定义
├── src/
│   ├── main.tsx                       # 入口
│   ├── App.tsx                        # 主组件
│   ├── styles.css                     # 全局样式
│   ├── domain/                        # 核心逻辑
│   │   ├── types.ts                   # 类型定义
│   │   ├── parsers.ts                 # 各格式解析器
│   │   ├── auditor.ts                 # 审计主流程
│   │   ├── schemaRegistry.ts          # Schema 注册与查询
│   │   ├── schemaValidator.ts         # AJV 校验适配
│   │   ├── schema.ts                  # 常量定义
│   │   ├── rulesEngine.ts             # 规则引擎
│   │   ├── utils.ts                   # 工具函数
│   │   └── auditor.test.ts           # 核心逻辑测试
│   └── components/                    # UI 组件
│       ├── TopBar.tsx                 # 顶栏
│       ├── InputPanel.tsx             # 输入面板
│       ├── OverviewPanel.tsx          # 统计概览
│       ├── IssuesPanel.tsx            # 问题列表
│       ├── TimelinePanel.tsx          # 时间线
│       └── DetailTabs.tsx             # 详情面板
├── test/
│   └── fixtures/                      # 测试用 fixture 数据
│       ├── jsonl/
│       └── ws/
└── dist/                              # 构建产物
```

## NPM Scripts

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（端口 8000） |
| `npm run build` | TypeScript 检查 + Vite 生产构建 |
| `npm test` | 运行 Vitest 测试 |

## 贡献

本项目为 ZenMind 平台内部工具。欢迎提交 Issue 和 Pull Request。

### 开发约定

- 使用 `vitest run` 运行测试，确保通过后再提交
- 新增日志类型需同步更新 `manifest.json` 和对应的 schema 文件
- 审计规则通过 `jsonl-rules.json` 配置，无需修改代码
