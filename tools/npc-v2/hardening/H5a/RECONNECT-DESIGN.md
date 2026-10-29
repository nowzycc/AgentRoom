# H5a.2 最小安全恢复边界

本轮选择 API-CONTRACT §7 允许的 fail-closed 策略，不实现透明续跑或同服务接管。

生产路径不变：HTTP → Broker.submit → 当前 WS → adapter.receive → 既有 runtime → report → Broker.report → 查询。

1. 同 runtime 暂断：close/lease 到期立即撤销网络准入，既有 runtime 只推进 safe-exit。保留 runtime ledger，但本 broker 永久 quarantine；原 cookie 再 hello 明确 RESYNC_REQUIRED，不重新 dispatch，也不接受迟到 report。断连前未确认终态的查询/相同 POST 返回 delivery=unknown、execution=null，lastReceipt 仅历史，不代表当前执行结论。
2. 新浏览器：它有独立真实 scene/runtime。首次 pairing 之后另一浏览器 pairing 或同 cookie 第二 WS 都拒绝 AUTHORITY_BUSY；lease 到期不授权接管。配置 runtimeInstanceId 不是跨页身份凭据，绝不凭 hello 声明放开 quarantine。
3. 恢复：关闭所有旧 H5 页面并确认 safe-exit/quiescent，停止旧 broker，人工启动新 broker（原配置 H5_QUIESCENT=confirmed 仅人工承诺，不是自动检测）。新 brokerEpoch/authorityEpoch；新浏览器仅提交一个全新命令。旧 epoch POST/report 拒绝，旧查询携带 ?brokerEpoch=旧boot 时 RESYNC_REQUIRED；无 boot 的不存在 ID 为 UNKNOWN_COMMAND。无持久 ledger，禁止把 404 当未执行并重放旧请求。不存在跨重启 exactly-once。
4. 同 epoch：全 payload/ID 幂等；未知命令保持原 ID unknown，不能续 TTL、换 ID 自动重做。已确认终态仍可历史读取。重复相同 reportId/payload 返回原 ack，不推进 cursor；新 reportId 复用 reportSeq 拒绝。服务器绑定实际 WS connectionId，拒绝旧连接 report/renew。close 握手完成不证明人物已经退出。
5. 本轮 schema 仅扩大 delivery/batchDelivery 为 pending|unknown；command delivery 增加可选 lastReceipt。wire apiVersion 保持 h5a.1：原客户端必须接受 unknown 新分支，拒绝未知分支比当成功安全；不宣称完全向后兼容。普通在线生命周期形状不变。SSE、持久化、snapshot、cancel、网络 goal.request 仍未实现，501。

TDD：lease 到期、quarantine 重连、双 attach、旧 epoch/connection、reportSeq 重复、reportId ACK 幂等、unknown 相同请求不重派、新 boot fence。真实网络：两个独立 browser context/两个真实 runtime，第二拒绝；第一个 started 后断 WS，安全退出；原 cookie 重连拒绝，HTTP 明确 unknown；人工收口/重启后新页面的全新命令成功。另独立服务重跑原 H5a.1 browser-network.mjs。

临时工件：本轮 evidence/reconnect-* 日志/证据；loopback 子进程由复跑脚本管理，清理核 /proc/PID/cmdline 后 TERM 并核端口无监听。保留父 .debug-journal.md/全部 untracked；不写旧 bundle。
