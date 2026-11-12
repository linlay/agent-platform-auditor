# Platform Auditor 架构

## 1. 项目概览

仓库包含多个相互独立的 ZenMind Agent Platform 验证项目。Schema Auditor 已实现日志结构与一致性审计；Chat Validator 当前处于设计阶段，目标是验证真实对话行为与反馈。

## 2. 技术栈

各项目分别选择和维护技术栈。Schema Auditor 使用 React 18、TypeScript 5 strict、Vite 5、AJV 8、Vitest 2 与 jsdom，发布为静态 SPA。Chat Validator 的执行器和界面尚未实现。根目录没有 npm 工程或统一构建工具链。

## 3. 架构设计

各项目独立安装、运行、测试和构建，拥有自己的依赖、锁文件、配置和用例。子项目之间没有源码依赖或共享的 `node_modules/`，不使用 npm workspaces。每个项目均可独立复制、安装和使用。

Schema Auditor 的解析器、Schema 注册表、校验器与规则引擎位于自己的 `src/domain/`，UI 位于 `src/components/`。

Chat Validator 规划为“平台适配 → 场景执行 → 反馈断言 → 报告”，通过平台公开 API 连接被测服务，其设计见 [项目设计](chat-validator/CLAUDE.md)。

## 4. 目录结构

```text
agent-platform-auditor/
├── README.md                    # 项目导航
├── AGENTS.md                    # 仓库级协作约定
├── CLAUDE.md                    # 仓库边界说明
├── schema-auditor/              # 独立的数据结构审计项目
│   ├── package.json
│   ├── package-lock.json        # 本项目锁文件
│   ├── node_modules/            # 本项目依赖，忽略提交
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   ├── public/schemas/
│   ├── test/fixtures/
│   ├── dist/                    # 本项目构建产物，忽略提交
│   ├── AGENTS.md
│   └── README.md
└── chat-validator/              # 独立的对话验证项目，待实现
    ├── README.md
    └── CLAUDE.md
```

Chat Validator 实现时在自身目录维护依赖清单、锁文件和 `node_modules/`。其他验证项目直接按同级目录增加。

## 独立 WebApp 示例

`standalone-webapp/` 已分为通用基础镜像、完整 WebApp 目录/ZIP 和独立运行目录。镜像只包含 Linux、固定 Go Platform 和 Go 启动器，不包含具体应用；webapp/ 保存应用源，.runtime/ 整体挂载到 /runtime 保存安装内容、聊天、日志、文件产物及实例配置。包包含 Agent、Skills、连接器和 registries；私有数据与凭据不进入基础镜像。规则模型仍仅为显式测试 fixture。详见 [使用说明](standalone-webapp/README.md)。

## 5. 数据结构

Schema Auditor 的核心记录、审计问题和报告类型由 `schema-auditor/src/domain/types.ts` 维护。Schema 与规则的运行时来源是其 `public/schemas/`。Chat Validator 的场景和报告类型待实现时独立定义。

## 6. API 定义

Schema Auditor 没有后端 API，只通过 HTTP 加载自身静态 Schema 与规则。Chat Validator 将使用被测平台公开对话 API，协议以被测版本源码为准，本地源码路径不是服务地址。

## 7. 开发要点

现有应用的源码、配置、Schema 和测试数据整体迁入 `schema-auditor/`，内部相对路径保持一致。各项目以自身目录为工作目录，不从父目录解析工具或依赖。凭据和生成产物归各项目管理。

## 8. 开发流程

进入目标项目，依据其锁文件安装依赖，执行其开发、测试和构建命令。使用和部署文档分别维护在各自 README；根目录只提供导航。

## 9. 已知约束与注意事项

Schema 必须通过 HTTP 加载，部署目录为 `schema-auditor/dist/`。Chat Validator 尚无客户端、执行器、可运行用例或 UI，本次目录改造不代表已验证真实对话行为。
