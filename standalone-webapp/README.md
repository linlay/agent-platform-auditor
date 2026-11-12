# 独立审阅助手

应用通过 Backend 调用独立 Go Agent Platform，由包内 Agent、Skill 与 Connector 审阅输入。Nginx 提供前端，Node 24 自主运行 Backend，Platform 自主运行。三个服务及用户认证服务使用同一个共用基础镜像，通过不同容器角色隔离；只有 Backend 能连接 Platform。

应用没有 Python、vendor、第三方 npm 依赖或本地镜像制作链。

```text
standalone-webapp/
├── backend/          Node 审阅、报告与健康 API
├── frontend/         静态 HTML/CSS/JS
├── platform/         agents / skills-center / connectors-center / registries / configs
├── webapp.json       路由、Backend 与认证声明
├── AGENTS.md         应用开发约定
├── compose.yml       消费共用镜像的部署配置
├── test/             应用业务测试
├── dist/             公共 Platform CLI 生成的 ZIP，忽略提交
└── .runtime/         用户私有运行目录，忽略提交
```

ZIP 根直接放 backend/、frontend/、platform/、webapp.json、AGENTS.md。Compose、测试、文档及运行数据不打进包。

## 检查和打包

```sh
cd /Users/linlay/Project/zenmind/agent-platform-auditor/standalone-webapp
agent-platform webapp check
agent-platform webapp pack
node --test test/*.test.mjs
```

默认输出 dist/standalone-auditor-1.0.0.zip。目录输入也支持，将 WEBAPP_SOURCE 指向独立解压目录的绝对路径；不需要再包一层应用名目录。

## 容器启动

使用已构建的 agent-platform-webapp-base:0.5.47。可选 agent-platform-auditor-fixture:1.0.0 只提供规则演示，不是真实 LLM。镜像由 Platform 工程维护；本应用只消费现成镜像。

升级旧实例或更改认证模式时，先完整停止服务，再重新准备配置和启动。运行目录保留，命令由部署者执行：

```sh
cd /Users/linlay/Project/zenmind/agent-platform-auditor/standalone-webapp
export AUDITOR_UID="$(id -u)" AUDITOR_GID="$(id -g)"
mkdir -p .runtime
docker compose --profile demo down
WEBAPP_UPDATE=true docker compose --profile demo up -d --no-build --force-recreate
```

然后直接访问 http://127.0.0.1:19382 。当前 authentication.mode 为 none，无需 ticket 或登录辅助脚本。主机不再开放 Platform 的 19381 端口。

普通重启使用同一个 ZIP，省略 WEBAPP_UPDATE=true。使用真实模型时不启用 --profile demo，并在 .runtime/registries 中配置真实 Provider/Model。默认测试模型是显式规则响应，经过 Backend→Platform→模型接口，但不能当作真实 AI 审核效果。

## 运行目录

```text
.runtime/
├── app/                    安装后的五根应用包
├── agents/                 Platform 实际读取的包内 Agent
├── skills-center/
├── connectors-center/
├── registries/             实例模型配置，包默认只补缺
├── config/
│   ├── platform/           实例 Platform 配置
│   └── auth.json           SSO 私有身份源配置（none 不需要）
├── chats/                  对话 JSONL、会话数据库及聊天产物
├── webapp-data/reports.json 报告历史，按用户最多 20 份
├── logs/                   platform.log / backend.log / nginx-*.log
├── host/                   生成的各角色配置和私钥；不能公开整个目录
├── .state/platform/        Platform 私有状态
├── platform-runtime/       其余 Platform 派生运行数据
└── run/installation.json   包摘要、应用身份与认证模式
```

宿主上仍能在一个 .runtime/ 内查看全部数据，容器分别挂载所需子目录。Nginx 只读取 frontend/、公开 bootstrap 和生成的路由；Backend 只读取 backend/、本角色服务凭据和业务数据；auth 只读取本角色身份源配置。

包升级保留实例 registries、config 与聊天，不覆盖已存在的模型配置。新包未声明的历史资源不会自动删除。准备过程失败时公共入口保持停止，修复后重新执行。

## 认证与接口

none、sso（OIDC）、custom 由 webapp.json 的 authentication 声明。SSO 的 providerRef 指向 .runtime/config/auth.json 中的部署配置，真实 issuer、clientId、clientSecret 与 HTTPS publicOrigin 不进入 ZIP。custom 由业务 Backend 提供 checkPath、登录和 CSRF；当前示例没有实现 custom 登录业务。

前端公共宿主接口只有 /__webapp/bootstrap.json 与 /__webapp/client.js；SSO 才启用 /__auth/login、callback、me、csrf、logout。/__internal 与 /__desktop 在 Nginx 对外入口返回 404。业务 /api 只代理本应用 Backend，无法转发 Platform API。

SSO/none 下业务 Backend 无需实现用户登录，但仍通过宿主注入的短期服务 token 调用私有 Platform。SSO 报告按宿主提供的稳定用户标识隔离；none 报告为本实例共享数据。

```sh
tail -f .runtime/logs/platform.log
docker compose logs --tail=100 platform backend auth webapp
docker compose --profile demo down
```

真实 OIDC 身份源和真实模型的验收需要对应部署配置；协议单元测试使用模拟身份源。
