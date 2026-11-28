# AGENTS.md — Catalog Lock Auditor

- 本项目为 `agent-platform-auditor` 下的独立子项目，维护自己的 `go.mod`、`package.json`、`package-lock.json`、`node_modules/` 与构建产物。
- 不修改相邻 `../agent-platform` 源码、配置或运行数据，不通过相对路径或 symlink 共享兄弟子项目代码。
- TypeScript 启用 `strict: true`（含 `noUncheckedIndexedAccess` 与 `exactOptionalPropertyTypes`），禁止隐式或无说明的 `any`。
- `src/domain/` 中的领域比较与统计逻辑必须保持纯 TypeScript，不依赖 DOM 或浏览器 API。
- 修改后需在当前目录执行 `npm test && npm run build` 验证 Go 单测、Vitest 单测、TypeScript 编译与服务端构建。
