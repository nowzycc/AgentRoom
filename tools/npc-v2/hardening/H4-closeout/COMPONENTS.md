# H5a组件机制调研与选型

本轮只调研/离线验证，没有安装包、启动服务或复制上游实现。外部搜索/extract后端返回403，改为直接读取官方文档及官方GitHub源码；抓取URL、内容SHA256和机制摘录保存在evidence/research-*.json，汇入EVIDENCE.json。这里只评估本次所需的JSON验证、SSE framing/断连、双向WS和单进程边界，不泛列平台。

## 1. 优先既有：JSON Schema + Ajv

项目packages/npc-contracts已固定ajv=8.17.1、ajv-formats=3.0.1，二者MIT。当前harness-preview/boundary.ts已用Ajv2020 strict+formats解析外部事件和policy。本轮validate-contract.mjs原样复用这组依赖，不新增Zod、不换校验栈。Draft2020与旧draft不要混用同一错误class；外部JSON只在边界解析，禁止coerceTypes/removeAdditional/useDefaults悄悄修改payload。

官方机制：https://ajv.js.org/json-schema.html ，特别draft2020需要Ajv2020导出；strict模式由现项目使用。终态identity比较/epoch/TTL/scope等动态语义不能由JSON Schema单独证明，必须适配器与测试覆盖。

## 2. H5a默认建议：独立Starlette ASGI模块，不导入旧world.app

world/pyproject.toml已经声明FastAPI/Uvicorn/Pydantic（FastAPI MIT，Starlette BSD-3-Clause）；现执行解释器元数据显示Starlette 1.3.1、Uvicorn 0.51.0、Pydantic 2.13.4、sse-starlette 3.4.5、jsonschema 4.26.0可用，但FastAPI在该解释器未安装。以上是该解释器现状，不证明room-world专用部署环境已有同依赖，H5a开始要复核解释器/锁定版本。

H5a最少依赖方案是在独立目录用已有Starlette路由+WebSocket+Uvicorn，sse-starlette.EventSourceResponse处理SSE，jsonschema.Draft202012Validator校验共享契约；JSON Schema仍是唯一结构来源，不另写Pydantic镜像再漂移。若项目部署环境明确有FastAPI，可薄包装同端点，但不能为套框架迁移现浏览器TS runtime。

不能复用world/src/room_world/app.py的应用对象：其模块导入即开SQLite并写表，维护另一个WorldState reducer且CORS=*、空TOKEN放行；旧/ws只传state和ping/pong，无执行回执，也无authority fencing。复用框架机制而非把旧mode服务冒充NPC动作权威。本轮未import旧app，不碰room.db。

官方证据：

- https://raw.githubusercontent.com/encode/starlette/master/starlette/websockets.py ：receive/send维持连接状态，send_json/receive_text和WebSocketDisconnect；使用标准WS，不手写RFC6455或JSON-over-TCP。
- https://raw.githubusercontent.com/fastapi/fastapi/master/docs/en/docs/advanced/websockets.md ：官方明确ConnectionManager内存列表只适合单进程、进程存活期，不能把演示广播当集群持久事件总线。
- https://raw.githubusercontent.com/sysid/sse-starlette/main/README.md ：EventSourceResponse、send_timeout、断连取消、AnyIO有界memory stream；让库负责UTF8/framing/ping/退出，本项目只做cursor窗口与resync业务。
- https://raw.githubusercontent.com/sysid/sse-starlette/main/sse_starlette/sse.py ：EventSourceResponse维护发送锁、ping和disconnect监听，取消任务不能吞掉。库的断连通知不等于runtime安全退出回执。
- https://raw.githubusercontent.com/sysid/sse-starlette/main/LICENSE ：BSD-3-Clause，保留版权/条款/免责声明，不使用作者名背书。
- Starlette官方LICENSE.md为BSD-3-Clause；FastAPI LICENSE为MIT。jsonschema元数据MIT。许可与现MIT/ISC依赖可共存；仓库没有查到统一根LICENSE，不在此替用户宣告整个仓库发行许可。

## 3. 若后续要求TS服务：有成熟备选，但本轮不安装

Hono + @hono/node-server（均MIT）+ 已有Ajv，服务端用hono/streaming.streamSSE，浏览器原生EventSource。官方源码sse.ts已负责data多行拆分、event/id换行拒绝、id/retry字段编码、headers和关闭；utils/stream.ts有onAbort和ReadableStream cancel。应复用它，不复制手拼协议。注意write内部会吞发送错误，writeSSE resolved不是客户端已接收、更不是动作成功；仍需onAbort、bounded队列、send timeout和应用层回执。Node适配器官方要求Node>20，与当前node22兼容，但相关包本地未发现安装，故不是零安装路径。

官方机制：

- https://raw.githubusercontent.com/honojs/hono/main/src/helper/streaming/sse.ts
- https://raw.githubusercontent.com/honojs/hono/main/src/utils/stream.ts
- https://raw.githubusercontent.com/honojs/node-server/main/README.md
- https://raw.githubusercontent.com/honojs/hono/main/LICENSE
- https://raw.githubusercontent.com/honojs/node-server/main/LICENSE

这里只选择小模块机制，不追main版本或整套引入Hono/新UI。H5a若改用TS需显式依赖锁与网络测试，不能默认本轮已安装。

## 4. SSE标准约束

https://html.spec.whatwg.org/multipage/server-sent-events.html 官方HTML标准定义UTF8、event/data/id、Last-Event-ID、自动重连及204停止重连。浏览器用原生EventSource，不手写parser。SSE是单向推送，所以实际browser执行必须另有WS双向回执；仅POST成功+SSE展示状态不能驱动现iframe人物。

cursor持久化、重启恢复、authority lease不是任何上述库自动赠送的能力。本契约明确H5a memory-only、cursor缺口resync、浏览器执行权威和失联quarantine；组件选型不能把这些未实现协议项打成passed。
