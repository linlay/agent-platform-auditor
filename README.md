# Platform Auditor

## 1. 项目简介

ZenMind Agent Platform 验证工具集合。每个子项目直接放在仓库根目录下，独立维护代码、配置、依赖、锁文件、测试和构建产物。

| 子项目 | 用途 | 状态 |
| --- | --- | --- |
| [schema-auditor](schema-auditor/README.md) | JSONL、SSE、WebSocket、Live Events 的结构校验与跨记录审计 | 已可用 |
| [chat-validator](chat-validator/README.md) | 通过多轮对话验证 Chat、Project、BOT 等场景的反馈与行为 | 设计阶段，执行器待实现 |
| [standalone-webapp](standalone-webapp/README.md) | 独立 Platform WebApp 示例：前后端、包内 Agent/Skill、模型配置和报告保存 | 已验证本机规则演示；支持指定外部真实模型 |

## 2. 快速开始

结构审计工具需要 Node.js ≥ 18。进入该项目后安装并启动：

```bash
cd schema-auditor
npm ci
npm run dev
```

测试和构建也在该目录执行：

```bash
npm test && npm run build
```

每个子项目使用自己的 `package.json`、`package-lock.json` 和 `node_modules/`，可单独复制到其他位置使用。仓库根目录只有项目导航与约定，不提供 npm 安装、启动或聚合命令。

## 3. 配置说明

各子项目独立维护自己的配置和环境变量说明。Schema Auditor 不需要环境变量；Schema 与规则在其 `public/schemas/` 中维护。Chat Validator 的运行配置将在执行器实现时定义。

## 4. 部署

在 `schema-auditor/` 执行 `npm run build` 后，将其 `dist/` 部署至静态 HTTP 服务。对应仓库路径为 **`schema-auditor/dist/`**，包含入口、资源和 Schema。原根目录 `dist/` 不再使用。

Chat Validator 当前没有部署产物。各子项目的部署说明分别见其 README。

## 5. 运维

- 安装和运行命令必须在对应子项目目录内执行。
- Schema 加载失败时，检查部署目录中的 `schemas/manifest.json` 是否可通过 HTTP 获取。
- 依赖问题在对应项目内使用其锁文件重新安装，不依赖父目录或其他子项目的 `node_modules/`。
- 新增验证项目时，在根目录增加独立子目录并维护自己的使用文档，无需注册到根级工具链。

仓库边界说明见 [CLAUDE.md](CLAUDE.md)。
