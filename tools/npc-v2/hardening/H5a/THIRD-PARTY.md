# 既有依赖与许可

H5a.3 另复用本机已有 sse-starlette 3.4.5（BSD-3-Clause；EventSourceResponse/ServerSentEvent）及验收客户端 httpx_sse/httpx。官方示例与规范来源见 SSE-DESIGN.md。没有安装依赖；使用当前环境既有 Starlette / Uvicorn / AnyIO / websockets / jsonschema / referencing，以及仓库既有 Ajv / ajv-formats / esbuild / Playwright / Three / VRM / Ammo 与 NPC 包。
依赖原有 LICENSE/NOTICE 不移动、不删除、不改写；H5 不手写 WebSocket 协议。生成 bundle 应通过 build.mjs 复建，并保留构建器生成的 legal comments/许可伴随文件，不单独剥除。此文不是第三方许可的替代文本。复验沿用仓库既有依赖树，不需要安装整栈。
