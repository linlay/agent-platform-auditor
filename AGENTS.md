# AGENTS.md — Platform Auditor

## 项目概述

Platform Auditor 是一个纯前端的本地单页 Web 应用（SPA），用于审计 **ZenMind AI 聊天平台**的日志数据。支持 JSONL、SSE、WebSocket Frame（含 HAR 抓包格式）、Live Events 等多种日志格式的自动识别、JSON Schema 结构校验和跨记录规则审计，帮助开发者快速发现数据一致性问题。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18（函数组件 + Hooks） |
| 语言 | TypeScript 5（strict 模式） |
| 构建 | Vite 5，端口 8000，HMR |
| Schema 校验 | AJV 8（JSON Schema draft-07） |
| 测试 | Vitest 2 + jsdom |
| 样式 | 纯 CSS（浅色/深色主题），无第三方 UI 库 |
| 包管理 | npm |

## 项目结构

```
platform-auditor/
├── index.html                       # SPA 入口 HTML
├── package.json                     # 依赖和 scripts
├── tsconfig.json                    # TypeScript 配置
├── vite.config.ts                   # Vite + Vitest 配置
├── public/schemas/                  # 运行时通过 fetch 加载的 Schema 文件
│   ├── manifest.json                # Schema 注册清单（格式/类型/Schema 映射）
│   ├── common/common.schema.json    # 公共 schema 片段（usage/contextWindow/estimatedCost 等）
│   ├── jsonl/                       # JSONL 各 _type 的 Schema（10 种）
│   │   ├── query.schema.json
│   │   ├── react.schema.json
│   │   ├── react-tool.schema.json
│   │   ├── plan-execute.schema.json
│   │   ├── submit.schema.json
│   │   ├── event.schema.json
│   │   ├── steer.schema.json
│   │   ├── planning.schema.json
│   │   ├── system.schema.json
│   │   └── step.schema.json
│   ├── ws/                          # WebSocket frame 的 Schema（5 种）
│   │   ├── request.schema.json
│   │   ├── response.schema.json
│   │   ├── stream.schema.json
│   │   ├── push.schema.json
│   │   └── error.schema.json
│   └── rules/jsonl-rules.json       # JSONL 审计规则定义（纯配置，无需改代码）
├── src/
│   ├── main.tsx                     # React 入口
│   ├── App.tsx                      # 根组件（状态管理 + 布局组合）
│   ├── styles.css                   # 全局样式（含浅色/深色主题变量）
│   ├── domain/                      # 核心领域逻辑（纯 TS，无 UI 依赖）
│   │   ├── types.ts                 # 所有类型定义
│   │   ├── parsers.ts               # 格式检测 + 解析器（JSONL/SSE/WS/LiveEvents）
│   │   ├── auditor.ts               # 审计主流程 + 时间线构建 + 摘要统计
│   │   ├── schemaRegistry.ts        # Schema 加载、编译、查询
│   │   ├── schemaValidator.ts       # AJV 校验适配（JSONL + WS）
│   │   ├── rulesEngine.ts           # 规则引擎（record + cross-record 规则）
│   │   ├── utils.ts                 # 工具函数（isPlainObject/compactText/valueAtPath/makeIssue）
│   │   ├── schema.ts                # 硬编码常量（类型列表、event 类型、payload schema）
│   │   └── auditor.test.ts          # 核心逻辑测试（~600 行，覆盖所有路径）
│   └── components/                  # UI 组件（纯展示 + 事件回调）
│       ├── TopBar.tsx               # 顶部工具栏（格式标签/过滤/搜索/严格度切换）
│       ├── InputPanel.tsx           # 日志输入区（粘贴/文件/示例加载）
│       ├── OverviewPanel.tsx        # 统计概览（记录数、错误/警告/提示计数）
│       ├── IssuesPanel.tsx          # 问题面板（按严重度过滤 + 搜索）
│       ├── TimelinePanel.tsx        # 时间线（按时间排序，点击选中）
│       └── DetailTabs.tsx           # 详情面板（属性树/原始 JSON/关联问题）
└── test/fixtures/                   # 测试 fixture 数据
    ├── jsonl/
    │   ├── valid-all-types.jsonl
    │   ├── invalid-schema.jsonl
    │   ├── invalid-rules.jsonl
    │   ├── invalid-event-steer.jsonl
    │   └── missing-liveseq-by-type.jsonl
    └── ws/har-websocket.json
```

## 核心架构

### 数据流

```
用户输入（粘贴/文件/示例）
  → parsers.ts: detectMode() 自动识别格式
  → parsers.ts: parseInput() 解析为 ParsedRecord[]
  → auditor.ts: auditRecords() 执行审计
      ├── schemaValidator.ts: validateJsonl() / validateWs() 单记录 Schema 校验
      ├── auditor.ts: auditSSERecord() / auditLiveEventRecord() 内置规则
      └── rulesEngine.ts: evaluateJsonl() 可配置规则引擎
  → App.tsx: 渲染 TimelinePanel + IssuesPanel + DetailTabs
```

### 关键设计决策

1. **领域逻辑与 UI 分离**：`src/domain/` 下所有代码是纯 TypeScript，不引用 React，可独立测试。测试文件直接 import 领域函数，不渲染组件。

2. **Schema 运行时加载**：`public/schemas/` 通过 `fetch` 在运行时加载，不由 Vite 打包。这要求应用通过 HTTP 服务运行，不能直接双击 `dist/index.html`。`manifest.json` 定义了格式→类型→Schema 文件的映射。

3. **三级严格度**：
   - `balanced`（默认）：未知字段 = warning，缺失必需字段 = error
   - `strict`：未知字段也视为 error
   - `exploratory`：忽略未知字段，仅校验核心必需字段

4. **规则引擎可配置**：JSONL 审计规则定义在 `public/schemas/rules/jsonl-rules.json` 中，支持 `recordRules`（单记录规则）和 `crossRecordRules`（跨记录规则，如 liveSeq 递增/去重）。规则 ops：`sumEquals`、`lessThanOrEqual`、`forbiddenAny`、`legacyStep`、`liveSeqByRun`、`reactToolSeqMatchesPreviousReact`。

5. **格式自动识别**：`detectMode()` 基于启发式规则（检查 `_type` 字段、`_webSocketMessages`、`frame` 字段、SSE `event:`/`data:` 前缀、`seq`+`type`+`timestamp` 组合）。

### 支持的类型

- **JSONL**：`_type` 字段区分，支持 `query`、`react`、`react-tool`、`plan-execute`、`submit`、`planning`、`event`、`steer`、`system`、`step`（旧格式）
- **WebSocket**：`frame` 字段区分，支持 `request`、`response`、`stream`、`push`、`error`
- **SSE**：标准 SSE 文本 + `[DONE]` 终止标记
- **Live Events**：每行一个 JSON 对象，含 `type`/`seq`/`timestamp`

## 开发命令

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器（http://localhost:8000，HMR）
npm run build        # 类型检查（tsc --noEmit）+ 生产构建（vite build）→ dist/
npm test             # 运行全量 Vitest 测试（单次）
npx vitest           # watch 模式
```

## 开发约定

- **TypeScript strict 模式**，所有新代码必须有完整类型标注
- **无 any 类型**（除显式标注的 escape hatch）
- **领域逻辑不引入 React**，写在 `src/domain/` 下
- **新增 JSONL 类型流程**：
  1. 在 `public/schemas/jsonl/` 创建 schema 文件（定义 `$id` 和字段约束）
  2. 在 `public/schemas/manifest.json` 的 `formats.jsonl.schemas` 中注册
  3. 在 `public/schemas/manifest.json` 的 `formats.jsonl.schemaPaths` 中添加路径
  4. 在 `test/fixtures/jsonl/` 添加有效/无效用例
  5. 运行 `npm test` 确认
- **新增审计规则**：直接在 `public/schemas/rules/jsonl-rules.json` 配置，无需改代码，规则引擎自动加载
- **提交前**：`npm test && npm run build` 必须通过

## 部署

构建产物在 `dist/`，部署到任意静态文件服务器即可。Schema 通过相对路径 `schemas/` 加载，无需额外 CORS 配置。

Nginx 示例：
```nginx
server {
    listen 80;
    server_name auditor.example.com;
    root /var/www/platform-auditor/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /schemas/ { try_files $uri =404; }
}
```

## 注意事项

- Schema 通过 `fetch` 加载，必须通过 HTTP 服务访问，不能直接打开 `dist/index.html`（`file://` 协议不支持 fetch）
- 修改 `manifest.json` 或 schema 文件后刷新页面即可生效，无需重新构建
- 测试使用 `hydrateSchemaRegistry` 在 beforeEach 中注入 schema，避免网络依赖