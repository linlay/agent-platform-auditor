# 独立 WebApp 开发约定

- 应用根直接包含 backend/、frontend/、platform/、webapp.json 和 AGENTS.md；ZIP 同样只有这五个根。
- frontend/ 是原生 HTML/CSS/JS，无 npm 依赖。前端通过 /__webapp/client.js 调用本应用 /api；不得直接调用 Platform 或依赖 /__desktop。
- backend/ 是独立 Node 24 业务服务，提供审阅与报告 API。Platform 地址与短期服务 token 文件由镜像宿主注入；浏览器不能选择任意 Agent、模型或 Platform API。
- platform/ 保存本应用完整的 Agent、Skill、Connector、Registry 及公开配置；真实凭据只放实例私有目录。
- webapp.json 声明 Node Backend、业务代理前缀和认证模式。当前演示明确使用 none；custom 需要业务后端自行实现检查、登录、会话与 CSRF；sso 使用镜像认证组件。
- 打包、检查与基础镜像制作由 Platform 工程维护；本项目不复制公共工具、不添加空 npm 清单、vendor 或 Python 运行时。
- Compose 的各角色复用一个 Alpine/Node 24/Nginx/Platform 镜像，Platform 仅与 Backend 共用专用内部网络；只有 Nginx 发布主机端口。
- .runtime/ 是用户持久运行目录。各服务只挂载自己需要的子目录；聊天、报告、日志、实例配置、密钥与状态均在其中。不得为测试启动或改写用户实例。
- 修改包或认证模式前必须完整停止各角色，再显式 WEBAPP_UPDATE=true 运行 prepare 并重建服务，不做 Nginx 热切换。
- 当前 demo profile 的模型 fixture 只是规则测试服务，不是真实 AI；真实模型配置需由用户提供。
- 验证使用 agent-platform webapp check/pack、node --test test/*.test.mjs；容器验证使用临时目录与独立 Compose 项目。相邻工程源码和凭据不打入本包。
