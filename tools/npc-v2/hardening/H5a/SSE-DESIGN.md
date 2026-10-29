# H5a.3 最小只读闭环设计

验收范围见 H4-closeout/API-CONTRACT.md。仅 fake harness，保持断连永久 quarantine、人工关闭旧页并新 broker epoch 恢复；不碰其他长期服务与并行任务。

## 官方依据（实现前读取）
- WHATWG https://html.spec.whatwg.org/multipage/server-sent-events.html：UTF-8 text/event-stream，id/event/data，Last-Event-ID，注释保活，无消费确认。
- 已读取上游 https://raw.githubusercontent.com/sysid/sse-starlette/main/README.md 的 Starlette Quick Start、ServerSentEvent、send_timeout、自动断开清理示例，并核本机已装 3.4.5 源码。复用 EventSourceResponse + ServerSentEvent，不手拼 framing，不装栈。
- starlette.io 直接与代理获取均 SSL EOF；上游组件文档与安装源码可用，未以失败请求冒称已读。

## 数据流与权威
现 runtime/rig → adapter report → Broker.report（既有 schema/fence/幂等）→ 单进程 read journal → HTTP snapshot/SSE。命令 submit 仅发布 delivery pending；断连仅发布 connection offline/unknown。只有经过现 report 关联检查的 runtime receipt 可称动作完成。

## 一致性与有限内存
现 server anyio.Lock 同时保护 broker 更新、journal 发布、HTTP snapshot 截面和 SSE next/wait 注册。journal 的唯一序号用于 brokerEpoch/sequence、report_ack、snapshot watermark、SSE id。ring 默认1024条，event payload 冻结为 JSON 字符串；不为订阅者复制历史/建立无限队列。每次只取一条；慢客户端再次取时发现越窗即 resync_required 并关流。发送卡住由组件 send_timeout 终止，重连仍检查窗口。wait 用 AnyIO Event 变化通知，组件负责 ping/断开任务取消，无轮询忙循环。

snapshot 是 broker 已知状态截面，不声称 runtime 连续实时：runtimeLastKnown 保留最近原始 runtime snapshot、来源 capturedAtWallMs、broker 收到时刻；actual 明确未知/最后已知，无样本也是 unknown。commands/batches 显式投递结果与最后回执，watermark 以下报告和投递已纳入读模型。historyComplete=false；不凭陈旧姿态补造实时状态。

## HTTP/订阅边界
Bearer harness token 仅用于已配置单 world/actor 的 read（现静态 principal 同时有原 write 权限，无新增授权模型）；runtime token/cookie 不能读。Origin 缺失允许 HTTP 客户端，存在必须等配置 origin，无 CORS。snapshot/events 必带 worldId、actorId；events 必带 brokerEpoch 与 cursor（Last-Event-ID 优先于 after）。不接 URL token/未知 query。snapshot 可选 brokerEpoch 做旧 boot 拒绝。

400 INVALID_CURSOR/INVALID_REQUEST，403 FORBIDDEN_SCOPE，401 UNAUTHORIZED。鉴权/Origin/scope 先检查。事件游标 missing/old epoch/future/expired 用标准 event=resync_required（无 id，不推进客户端游标）随后 EOF；必须重新 GET snapshot，不能悄悄 latest。断开无需解除 runtime quarantine；同 epoch SSE 重连仅恢复读观察，不重派动作。

## TDD/验收
先红：游标语法/旧 boot/未来/越窗、snapshot→事件→订阅间隙、重复报告单事件、顺序、两个独立 cursor、慢读 resync、断开清理、读权限/Origin/scope。再最小实现。真实临时 loopback + 真实 browser lookAround：HTTP/两 SSE/原 runtime terminal 的 actionId/attemptId 相符；断 SSE 后同 epoch 排他 >cursor 重放，客户端仅处理并保存过的 cursor，故应用交付为 at-least-once+按cursor去重，不声称网络 exactly-once。原 browser-reconnect 回归；每次临时服务认证 capabilities 探活、核实际PID停止、核无监听。最终记录源码/证据 SHA256、精确暂存与独立 commit。缺验收则 blocked。
