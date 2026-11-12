# 独立审阅 WebApp

## 项目简介

页面通过 Platform SDK 调用本应用 Agent、Skill 和 Connector，审阅用户输入。应用与现成基础镜像分别维护；本项目没有 npm 依赖、内置 Node/Platform 二进制或镜像制作工具。

`frontend/` 是原生 HTML/CSS/JS；`backend/` 保留可选 Node 报告 API 源码。当前基础镜像运行前端形态，报告收藏存在浏览器，对话和模型报告正文保存在服务端 Chat 记录。

`platform/` 包含 Agent、独立技能、完整连接器、模型/Provider 模板及公开 Platform 配置。

`scripts/` 仅保留本机登录辅助；`test/` 保留应用业务测试。打包和包检查统一由 Platform CLI 提供。`dist/` 是生成的 ZIP，`.runtime/` 是已安装实例，`.local-backups/` 是既有备份，均忽略提交。

## 快速开始

使用带 webapp check/pack 命令的新版 Platform CLI。检查和打包无需 Node；业务测试和本机登录辅助使用系统 Node ≥24，应用没有第三方 npm 依赖。

```sh
cd /Users/linlay/Project/zenmind/agent-platform-auditor/standalone-webapp
agent-platform webapp check
agent-platform webapp pack
# 可选：应用自身的前后端业务测试
node --test test/*.test.mjs
```

默认生成 dist/standalone-auditor-1.0.0.zip，ZIP 根直接包含：

```text
backend/
frontend/
platform/
webapp.json
AGENTS.md
```

webapp.json 直接声明当前纯前端部署形态。Platform 原样打包清单，不删改后端声明或应用配置；backend/ 中的可选 Node 报告 API 源码仍随包保留。需要目录输入时，将 ZIP 解压到一个独立目录。

## 配置说明

公开默认模型声明位于 `platform/registries/`。首次安装后，实例实际读取 `.runtime/registries/`；真实 Provider/API 凭据放实例私有配置，不提交、不打进 ZIP。

默认模型连接的是显式规则演示服务，不是真实 AI。真实模型配置好后，不启动 demo profile。应用/模型/Provider 的关联字段参考包内模型及 Provider 示例文件。

安装器把包内 `platform/agents` 等映射到 `/runtime/agents` 等固定位置，保留实例已有 registries/configs。相同输入重启保留实例修改；输入改变使用显式 `WEBAPP_UPDATE=true`。不同应用使用不同运行目录。

## 容器部署

本机 Docker 已准备好 `agent-platform-webapp-base:0.5.46` 基础镜像。可选的 `agent-platform-auditor-fixture:1.0.0` 只提供规则测试模型；它已封装为独立镜像，不再依赖本项目二进制挂载。迁移到其他机器时，镜像需另行分发或加载；WebApp ZIP 不包含镜像。

```sh
# 已打包后，用当前 ZIP 显式更新旧实例；此命令由你自行执行
AUDITOR_UID="$(id -u)" AUDITOR_GID="$(id -g)" WEBAPP_UPDATE=true \
  docker compose --profile demo up -d --no-build --force-recreate

# 在另一个终端生成本机登录链接，打开打印的 URL
node scripts/open.mjs
```

普通重启省略 `WEBAPP_UPDATE=true`；真实模型实例省略 `--profile demo`。使用目录输入时，将 `WEBAPP_SOURCE` 设置为独立解压目录的绝对路径。容器名与此前保持一致。

本项目不提供基础镜像重建命令。当前基础镜像不含 Python、Node 或编译器；完整 Node 后端需要另行提供 Node 24/supervisor/Landlock 运行环境。

## 运维

```sh
tail -f .runtime/logs/platform.log
docker compose logs --tail=100 webapp
docker compose --profile demo down
```

整个 `.runtime/` 挂载到容器 `/runtime`：`chats/*.jsonl` 保存对话和模型输出；`chats/<chatId>/artifacts/<runId>/` 保存正式发布的文件；`webapp-data/` 保存业务数据；`.state/` 保存私有身份及授权。运行目录和历史备份不会被工程精简删除。

只有 `/runtime/.lock` 使用容器内存挂载，以满足 Docker Desktop 上的临时锁语义；聊天、日志、产物及所有 ru-* 执行资源仍在宿主运行目录。登录辅助只监听本机，使用一次性 ticket 换取应用 Cookie，不把 owner 凭据暴露给页面。
