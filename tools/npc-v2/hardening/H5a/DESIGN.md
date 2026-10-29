## H5a.2 implemented refinement

The current authoritative bounded design is RECONNECT-DESIGN.md. H5a.1 remains parent-passed at 0e9a363; the current slice explicitly refuses live-broker reconnection/takeover and returns unknown for unconfirmed outcomes. Recovery is manual old-page quiescence/closure plus broker restart/new epochs, never replay. See current DELIVERY.md/GATE.md; historical H5a.1 design follows.

# H5a.1 真实网络最小闭环

基线见仓库提交历史；单写者。H4-closeout/API-CONTRACT.md 为语义上界，不宣称实现完整 H5a 契约。

## 范围与依赖
只做 loopback、本机 Chromium、fake harness。复用已安装 Starlette 1.3.1 / Uvicorn 0.51.0 / websockets 16 / jsonschema 4.26.0、既有 Ajv 与既有 NPC runtime/真实 VRM。无安装、无 Hermes hooks、无 GOAP/reducer/executor 替代、无 H3/家具/资产/录像改动。

生产路径：HTTP POST /api/h5a/commands → 内存关联 broker → 库 WS /api/h5a/runtime → 独立 H5 adapter → iframe.__npcStage.runtime.requestSingleAction(requestId=外部 commandId) → 既有真实 adapter/rig → 同 attempt 浏览器 report → HTTP GET /commands/{id}。事件：HTTP batch → WS → parseHarnessEvent/HarnessBridge.ingest → 原 DomainStore → 原 policy → 原 runtime；working→converse 是站姿占位，不是打字。

## 权威、隔离与配置
服务只认证、结构/身份/TTL/幂等校验、投递和保存浏览器回执；不生成 accepted/started/terminal。独立页不 import H4 app/h4b-app 的按钮、heartbeat 或 refresh producer。复用原 scene.html/app/bundle 只读，独立 adapter 在现 slice 上驱动既有 step，关闭 scene 自动 simulation，lease 检查先于每步/dispatch/refresh。断连撤回远程 policy 和 single，经原 runtime safe-exit；不改 pose/claim，不停步伪装退出。

.env 与逻辑分离；随机 harness/runtime pairing token，仅 ignored .env.local，禁止日志/URL/源码/证据泄漏。HTTP Bearer 绑定 world/actor/source/session/observer，harness 仅 read/events:write/commands:write；浏览器通过同源 POST 配对，HttpOnly SameSite=Strict cookie，仅 runtime:attach。WS 要精确 Origin 与 cookie，固定 runtimeInstanceId。无 CORS 通配。

单进程、内存各256命令/批次；递归 key 排序完整 payload fingerprint；先 epoch fence，再旧 ID duplicate/conflict，再容量。TTL issued+ttl 不续期、1000..3600000，双端检查。服务重启 brokerEpoch/authorityEpoch 都变，禁止旧命令重放。启动需人工确认旧页已关闭且 quiescent；不支持重连/接管；一旦掉线/lease过期永久 quarantine 至人工收口后新服务。5秒 lease/1秒 renew，不自动授权第二页。当前范围不能承诺跨重启 exactly-once。

## 本轮端点与显式延期
实现 commands POST/GET、events/batch POST、status GET、capabilities GET、内部 WS 与同源 runtime 配对。网络 goal.request、cancel、snapshot/SSE、重连/接管及其余端点明确 501 unsupported（扩展响应，不伪装现 schema 成功）；H5a.2 再扩展。status 只返回最后浏览器 snapshot，离线明确 offline，未收到终态只 pending/execution=null。只支持共享 schema 的站姿 action 和最小观察事件，不开放底层其他 action。

## 验收
先 RED：输入/未知动作/幂等冲突/旧 epoch report。GREEN 后真实 HTTP+WS+浏览器：accepted→started→同 actionId/attemptId terminal；重复 POST 无新 begin；working 观察→converse 且 rig 站立；断开运行中命令不报 success；握手101/服务readback/鉴权与 Origin 反例。受影响测试/typecheck、34例契约与 H4b browser 回归。旧页及 bundle 前后 hash 不变。唯一 evidence wx 文件与 SHA256；独立 commit；交付服务 PID/端口与停止状态。
