# AGENTS.md — Platform Auditor

- 每个独立验证项目直接放在仓库根目录的 `<project-name>/` 下，不增加 `apps/` 包装层。
- 子项目独立维护入口、源码、配置、用例、`package.json`、`package-lock.json`、本地 `node_modules/` 和构建产物。安装、运行、测试和构建均进入对应项目目录执行。
- 根目录仅维护导航、仓库级文档和约定；不创建根级 npm 清单、锁文件或 `node_modules/`，不使用 workspaces、依赖提升或共享依赖目录。
- 不在子项目之间直接引用源码，不通过符号链接或根级包共享依赖。每个项目应可独立复制后安装、运行和构建。
- 现有结构审计应用位于 `schema-auditor/`，其开发约定见该目录的 `AGENTS.md`；应用内部相对路径均以该目录为基准。
- Chat Validator 当前为规划目录。没有实现并执行的验证不能标记为通过；投递收据不能代替最终对话结果。
- 新增 TypeScript 代码使用 strict 模式，禁止隐式或无说明的 `any`。领域逻辑不依赖 React。
- 相邻 `agent-platform` 是被测系统及协议参考来源；本仓库的改造不修改其源码、配置或运行数据。不要将其真实凭据复制进本仓库。
- 修改可执行项目后，在该项目目录执行 `npm test && npm run build`。需要真实平台的集成验证使用独立命令，不混入默认离线测试。
