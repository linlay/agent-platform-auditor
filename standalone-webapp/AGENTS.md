# 独立 WebApp 开发约定

- 本目录直接包含 backend/、frontend/、platform/、webapp.json 和 AGENTS.md，不增加应用名包装层。
- frontend/ 是原生 HTML/CSS/JS，无 npm 依赖；backend/ 保留可选 Node 报告 API 源码，当前基础镜像只运行前端形态。
- platform/ 保存本应用的 agents、skills-center、connectors-center、registries 和公开 configs；资源继续按 key/id 关联。
- webapp.json 是应用清单事实源，直接声明实际部署形态；通用打包命令原样保留清单，不删改后端声明或应用配置。
- 通用包检查和 ZIP 打包统一使用 Platform 的 webapp check/pack 命令；本应用不维护重复的打包、清单校验或对应测试。scripts/ 仅保留本机登录辅助，test/ 仅保留应用业务测试。
- 不重新加入离线运行制品、基础镜像制作链或无依赖的 npm 空清单；以后前端确需 npm 时，清单放 frontend/。
- ZIP 和 dist 应用目录根只有 backend/、frontend/、platform/、webapp.json、AGENTS.md；排除真实凭据、*.local.yml、*.local.yaml、工程工具和生成数据。
- Compose 只消费现成基础镜像，可选规则 fixture 使用独立演示镜像，不挂载宿主程序。规则服务不等同真实 AI。
- .runtime/ 整体挂载为 /runtime，保存已安装资源、聊天、日志、产物和私有状态；不得随工程清理而改写或删除。
- 不读取相邻 Platform/Desktop 的源码、配置或凭据。基础镜像的源码和维护归其自身工程，不在本应用维护。
- 本项目按用户精简要求不使用根 npm 清单，验证入口为 agent-platform webapp check、agent-platform webapp pack 和 node --test test/*.test.mjs；涉及容器的改动用独立临时实例验证，不自动启动用户实例。
