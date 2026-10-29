# H5a.4 最小显式 goal / cancel 设计

基线 3e37d04；父 SSE 验收 PARENT-SSE-ACCEPTANCE.md。本轮无子 agent，无真实 Hermes，无家具/H3/角色/材质/stage 修改。

## 接口与权威

HTTP command/cancel → broker 认证、scope/epoch、完整 fingerprint、有限关联 → WS dispatch → 当前 iframe 的 HarnessBridge / DomainStore / NpcRuntime → 原 ActionExecutor / rig → browser report → broker ledger / HTTP / SSE / snapshot。

已有网络 schema 已声明 goal.request={goal,priorityClass,onConflict,issuedAtWallMs,ttlMs} 与 cancel={commandId,target:{kind,commandId}}；实现不再返回 501。白名单来自 API-CONTRACT §0 与现 standing runtime：converse→turnToSpeaker、lookAround→lookAround、idle→standing predicate（可零动作 maintaining）。不扩大 action 白名单。

HarnessBridge 新增外部显式请求入口，保留外部 commandId；通过原 store 注册，绑定 sinceSimMs + executionRevision。暂停 policy 命令生产但继续 ingest/observe；显式请求失效/取消后 refresh 读取最新 observation，不恢复旧快照。已有 local manual 仍走原入口。单动作仍 requestSingleAction/cancelSingleAction；goal cancel 只 runtime.cancel({scope:'goal',targetCommandId})，不误取消 independent single。

优先级：安全 > manual（本地或显式 manual） > 已准入 independent single > 显式 task goal > 状态 policy > autonomy。single 准入仍沿原 busy/manual/safety 检查，拒绝不排队；task goal 不抢 independent single。显式 goal 活跃时 policy 不产生命令，因此新状态不能借 replace 抢显式目标；manual 不被 task 提升。新 task 在本地/显式 manual 活跃时明确 MANUAL_PRIORITY 拒绝，不撤销 manual 以获取准入。此为 producer 接线，不新增 executor 或执行状态机。

## 回执与取消

goal 复用 executionReceipt；动作归属必须排除准入前已有 action/terminal，使用 request revision 和实际 actionId/attemptId，不把同 goal 的旧成功算成本请求。当前谓词已满足返回 maintaining；成功 attempt 后也只 maintaining（可留 attempts 事实），不是 single success。撤回在旧所属动作 safe-exit 终态后才报告 withdrawn；等待期间报告 pending。TTL 使用 UNIX 剩余寿命映射到已有相对 store clock，另保留 UNIX 到期检查。

cancel 是独立 operation ID，命令/取消共用去重命名空间；新增 cancelReceipt，含 target、status=requested|settled|rejected、reason、targetReceipt（原目标完整 receipt）。必须由 browser 调 runtime 后报告。重复相同 cancel ID 不重发；不同 cancel ID 对相同目标查询当前真实结果，不重复调用退出。错 ID、kind 不符、cancel-of-cancel 显式拒绝，不影响其他命令；已终态返回 settled + 原目标 receipt。旧 epoch 在缓存前 fence。安全控制每目标保留一个额外槽（最多256），不受普通命令槽/限流饿死；容量满的新 cancel ID 明确拒绝，已有目标的同 payload 重试仍可读取。

schema 更新 receipt union、goal accepted 字段/可选当前 action correlation、cancelReceipt；对应 fixtures 与 validator。broker 校验 kind、target command、delivery、action/attempt 绑定；goal maintaining 非终态，断连必须 unknown（不能把 succeeded goal 当 single 终态）。所有 HTTP/SSE/snapshot 使用同已验证报告。

## 验收矩阵（TDD）

1. core：保留外部 ID、显式覆盖、policy 更新不抢占、取消恢复最新状态、manual/single 独立、已满足 maintaining、排除旧 attempt。
2. 边界：goal/cancel HTTP→WS pending，browser report 前绝无 cancelled；重复/冲突/错 ID/kind/已终态/旧 epoch；goal 持续报告允许多 attempt。
3. 真 browser：working→显式站姿 goal→实际 attempt 或 maintaining→最新状态更新→HTTP cancel→真实 safe exit/withdrawn→最新 policy；lookAround running HTTP cancel→same attempt cancelled；重复不重复执行，旧/错 ID 不取消新动作；HTTP/SSE/snapshot 一致。
4. 复跑既有 browser-network / browser-sse 及受影响定向 tests/typecheck，独立 loopback authenticated capabilities 探活；核 PID 后仅停自建进程，宿主既有服务不动。

预算不足则 GATE=blocked，明确未完成项。唯一 evidence 前缀、source/build hashes、父可复跑脚本；不伪称完整 H5 或独立父验收。
