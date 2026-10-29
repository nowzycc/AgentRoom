# H5a.1 API 前置契约（中文，站姿 fake harness）

## 0. 实现状态与可用范围

本文件是后续 H5a 的约束，不是在线 API 公告。本轮没有实现/启动 HTTP、SSE、WebSocket 服务，没有接真实 harness 或 Hermes hooks。schema/contract.schema.json 与 examples/ 可直接离线校验：

    cd <repo>
    node tools/npc-v2/hardening/H4-closeout/validate-contract.mjs

网络版本 apiVersion=h5a.1；内层沿用 @npc/contracts specVersion=1.0，二者不是同一个版本。JSON Schema Draft 2020-12，禁止未知字段、不做类型转换或默认值注入。schema 是结构约束，以下鉴权、跨字段身份一致性、期限、仲裁和事件顺序仍须应用层执行与测试，不能声称 schema 已证明它们。

当前可执行 single action 只有 lookAround：standing，candidate=null，resourceDependencies=[]，versionDependencies=[]，channels=[gaze]。没有资源依赖，不能制造候选/资源版本。长期 goal 网络白名单仅 converse、lookAround、idle；converse 实际执行 turnToSpeaker。work/think/rest、坐下、家具、任意 pose、骨骼/刚体写入都不开放。H4a 配置 working→converse 是明确的临时站姿占位，不是打字/工作姿态。底层类型或 ACTION_CATALOG 含更多名字不等于网络支持它们。

当前本地入口：

    action.request → runtime.requestSingleAction({requestId:commandId, actionKey, issuedAtWallMs, ttlMs})
    action cancel → runtime.cancelSingleAction(target.commandId)
    goal.request → store.dispatch({kind:'command', command:…})
    goal cancel → runtime.cancel({scope:'goal', targetCommandId:target.commandId})
    harness observation → parseHarnessEvent → HarnessBridge.ingest
    goal receipt → executionReceipt(requestBinding, runtime.view(), runtime.terminals)

最后一个入口需要在浏览器保存 {command,sinceSimMs,revision:runtime.executionRevision}。HarnessBridge 当前会自己生成 policy/manual commandId，不能把外部 commandId 偷换为该 serial，再宣称已有完整网络幂等。H5a 应保留外部 commandId，在同一 store 登记请求，使用相同绑定结构投影；不要新建 executor/runtime。取消独立 single action 不等于撤回 policy goal，反之亦然。

## 1. 权威与传输边界

浏览器中既有 NpcRuntime + ActionExecutor 是人物执行权威；DomainStore 是领域状态唯一写入点。网络服务只做认证、输入校验、投递、关联、有限缓存与转发，不运行 GOAP、不调用假运动适配器、不生成动作成功、不直接写 facts/pose。服务端收到 HTTP POST 或 WebSocket send 成功均不能产生 started/succeeded。

两个方向必须真正接通：

    fake harness → HTTP /events/batch 或 /commands
        → 服务投递 → 内部 WebSocket dispatch → 指定浏览器网络适配器
        → HarnessBridge/DomainStore/既有 runtime → 真实 rig/adapter
        → 浏览器 report(accepted / started / terminal 或 snapshot)
        → 服务核 authorityEpoch/runtimeInstanceId/reportSeq/关联 → HTTP查询 + SSE

观察事件的 ingest 回执也从浏览器返回；服务不重新实现 run/tool reducer。观察源的 sourceEpoch 与浏览器执行权威 authorityEpoch、服务重启 brokerEpoch 三者必须分开。

## 2. 建议端点（H5a待实现）

所有路径位于 /api/h5a，world/actor 从认证绑定与 payload scope 双重核对。

| 方法与路径 | 输入/输出 schema $defs | scope | 语义 |
| --- | --- | --- | --- |
| GET /capabilities | capabilities | read | 当前绑定与可用性；失联 available=false |
| POST /events/batch | eventBatch → batchDelivery / batchReceipt | events:write | 最多64事件，按数组顺序投递；不是执行命令 |
| POST /commands | command → delivery 或 receipt | commands:write / manual:write | 有限投递，不能把 pending 当 accepted |
| POST /cancel | cancel → delivery 或目标receipt | cancel:write（仅本人目标） | 不含 world/work 全域取消 |
| GET /commands/{id} | receipt 或 delivery/error | read | 查本epoch真实回执，非预测结果 |
| GET /status | snapshot | read | 返回最新浏览器快照；connection 标出新鲜度 |
| GET /snapshot | snapshot | read | 原子快照与游标截面，不冒称历史完整 |
| GET /events?after={cursor} | streamEvent 的 SSE data | read | Last-Event-ID重连，缺口要求resync |
| WS /runtime | hello/grant/dispatch/report/report_ack/renew | runtime:attach | 内部浏览器双向链路；非普通harness权限 |

POST首次接收可返回202 {delivery:'pending',execution:null}，其含义只是内存投递登记。只有浏览器实际调用本地入口返回 accepted=true 后，服务才可提供 accepted receipt。已有回执的同payload重试返回200及最新回执。网络超时/连接断开后结果不明：查同epoch同commandId，禁止自动换ID重发以免重复动作。

batch 的浏览器report data采用snapshot（含已处理后的投影），deliveryId关联原批次；逐事件的接受/拒绝结果应另回报，见第6节。失败不得伪改 observed harness state。

## 3. 单动作与长期目标生命周期

单动作本地状态：

    rejected（未准入）
    accepted → started → succeeded
                       → cancel_requested → cancelled 或 failed
                       → failed
    accepted → cancelled（开始前TTL/取消/manual/safety）
             → failed（开始预检失败等）

accepted 只表示本runtime内收件并登记；started 必须实际 executor.start 成功且真实 adapter.begin，带 actionId/attemptId；succeeded 必须来自同 actionId、同 attemptId 的 executor terminal.outcome=success，不能用“没有当前action”“predicate已真”或 HTTP 2xx 推导。显式不同commandId即使 lookedAround 已真仍独立执行一次；相同ID不重放。预检失败可有 actionId/attemptId，但没有 started。terminal 内原样携带 executor attemptId（本轮补齐）；schema 内 terminal 是只读对外子集，隐藏内部effects，不能反向提交它。

cancel_requested不是终态，表示已请求safe-exit，未确认退出前继续占用通道。exit-unconfirmed 时保留占用/阻断新动作，不得超时伪造cancelled或释放。取消与完成同帧以当前runtime既有safe-exit仲裁为准，不接第二终态。取消已终态目标返回该目标终态；目标不存在404，绝不改目标结果。重复cancel操作本身按cancel.commandId幂等。

长期goal的 status 与 goalStatus 分列：accepted/pending、started/active、maintaining/maintaining、succeeded/maintaining、failed/failed、withdrawn/withdrawn。succeeded/maintaining 仅表示本请求窗口有确认成功attempt且当前谓词满足，goal仍持续有效，不是生命周期终结。maintaining可以attempts=[]，表明当前目标已满足，不是新动作成功，更不能用作single终态。重规划可有后续attempt；撤回/TTL失效终结目标请求而非完成动作。

本地优先级规则：安全暂停/安全层高于manual；manual高于single；single在准入时busy拒绝、不排队；single期间policy可以更新但不抢占独立动作，结束读取store最新policy，不恢复旧快照。manual/安全到达运行中single先safe-exit。观察heartbeat断连只撤回policy，不取消独立single；manual与观察断连同时到达，manual照常安全抢占，观察保持disconnected。H5执行连接失联则必须冻结远程准入并取消远程owned工作，不能与观察断连混淆。准入时多种拒绝同时成立的具体reason不构成安全优先级证明：当前requestSingleAction先报manual；固定步运行中先判断safety。

## 4. Scope、幂等与容量

scope={worldId,actorId,authorityEpoch}，还须绑定认证principal、owner/client与内部runtimeInstanceId。网络幂等键为该scope+commandId；同scope命令、取消共用ID命名空间。浏览器原SingleActionLedger仅按requestId键控且每runtime隐含actor，不自带鉴权/epoch，H5a适配器必须在调用前补齐检查，不能裸露给远端。

payload fingerprint比较完整已校验请求，包含type、scope、commandId、TTL/issued时间、goal/priority/onConflict或cancel target。复用 domain/commands.ts canonicalJson 的递归key排序语义；JSON数值/Unicode不额外归一化，禁止undefined/NaN/Infinity。不宣称它是完整RFC8785密码规范；服务可缓存canonical文本，浏览器以同payload校验，非安全签名。相同ID且完全等价→最新原回执；不同payload→409 COMMAND_CONFLICT，不能覆盖原记录。刷新TTL需要新ID，是新命令。epoch失效时先拒绝STALE_AUTHORITY_EPOCH，不能用旧缓存绕过fence。

原SingleActionLedger容量256是整个runtime生命周期累计请求槽：well-formed但unsupported/busy/TTL等拒绝也占槽；accepted/terminal不被淘汰。无效结构、conflict、满容量本身不新增。已有ID先命中duplicate/conflict，再检查满容量，故满后仍可查询/重试原ID，第257个新ID拒绝 COMMAND_LEDGER_FULL。不得自动重建runtime清空表来绕过容量；刷新丢失幂等是实际风险，不是恢复方案。当前没有持久化和跨重启exactly-once。

goal的DomainStore命令记录另外有默认256终态保留与600000ms保留期，会prune；这不是SingleActionLedger的永不淘汰256。H5a网络去重表需独立保存“投递/关联元数据”（不是执行权威），同epoch最多256个操作ID，满时503 COMMAND_LEDGER_FULL，保留旧ID重试；不默默覆盖。batch单独有界去重/投递窗口，见第6节。read/cancel不应因single新动作槽满而阻断安全退出；cancel网络关联容量需预留安全控制路径，满时仍可按target幂等转发cancel，不得以清空执行ledger为代价。

## 5. TTL、时间与重启

时间统一毫秒。occurredAt是观察源声明的ISO时间；receivedAtWallMs由浏览器store记录，不能接受外部伪填。命令issuedAtWallMs是发起时墙钟，H5a要求0≤issued≤now且issued+ttl为安全整数，ttl 1000..3600000；服务和浏览器各检查，deadline<=now即过期，绝不在网络转发时续期。跨机器时钟超前拒绝INVALID_ACTION_TIME；H5a本机模式只容许一致的系统时钟，不猜偏移。

single本地使用原始issued+ttl；每固定步先refreshSingleActionPriority再executor.update/stepSingleAction，刚accepted后到截止点但未开始会cancelled/TTL_EXPIRED且actionId/attemptId/terminal均null、零begin。运行中TTL触发cancel_requested，必须等safe-exit再cancelled。现本地stepSingleAction另有failed/TTL_EXPIRED兜底，正常单调时钟路径先被前述取消覆盖。时钟回退可能延迟原墙钟TTL，协议不宣称当前已做单调TTL；执行权威连接lease应使用独立单调时钟。

长期goal当前DomainStore按收到时刻+ttl计时，不原生执行issuedAt。H5a浏览器在dispatch前算remaining=issued+ttl-now，若remaining<1000拒绝TTL_TOO_SHORT，否则把剩余ttl（向下取整）写入内层Command，issuedAt以原时间ISO保留；同外部ID重复不再改remaining。这样不因跨网络而延长目标，外部fingerprint与内层映射分开存。安全取消无TTL，立即幂等按target执行。

浏览器重载/新runtime丢失SingleActionLedger和attempt上下文，必须新authorityEpoch，旧回执只可历史读、不得接收为新成功。服务重启则新brokerEpoch，旧cursor必resync；即使浏览器还活着，也先执行重连安全停止/快照握手后发新authorityEpoch，不能重放未知命令。失联时未收到terminal→unknown delivery/execution（connection=offline），不是failed/success；重新同步可恢复同runtime内已知结果，绝不能凭服务缓存补造terminal。H5a不引入持久日志；原H5的“持久事件序号/跨重启恢复”仍未实现。

## 6. Harness事件、批处理与回执

复用v1 event.schema：source/sessionId/runId/toolCallId、sourceEpoch、sequence/eventId、occurredAt。H5a收窄为presence.heartbeat、run.started/completed、tool.started/completed，绑定observerId不同于执行actorId。scope.actorId是人物；events[].actorId是该scope配置的observerId，不应直接强制二者相等。world/source/session必须匹配policy且经principal授权。

同source/epoch/eventId重复沿用DomainStore DUPLICATE_EVENT，不代表动作失败；sourceEpoch切换必须受控显式adopt，旧epoch拒绝；sequence仅本source诊断/heartbeat排序，不是SSE cursor，普通事实允许乱序。保留并行tool集合及finish先于start不复活语义，不重写为“每条事件播放动画”。去重窗口有限，不能承诺任意迟到永久不复活。

batch本身不是事务；格式/权限整批预检，结构不合规则无任何投递。通过后按序逐事件ingest，可能部分applied/duplicate/stale。H5a必须返回浏览器逐项回执(batchId,index,eventId,accepted,reason,revision)，再给处理后snapshot；不得一条失败仍宣称整批成功。batchId+完整payload同scope去重，256批内存窗口，满则拒绝新批，不驱逐未确认批。浏览器失联不积压无限事件：暂停投递，连接恢复先snapshot/epoch握手，过期heartbeat不重放以免假在线。源应发新heartbeat和必要当前run/tool事实；原epoch下finish乱序仍由现reducer处理。

## 7. authority epoch、lease、防双驱动与断连

H5a服务是单进程/单worker内存broker，不支持多worker共享权威。内部WS认证runtime:attach，校验Origin并绑定唯一(world,actor,runtimeInstanceId)。hello只是声明，服务确认独占后grant {authorityEpoch,connectionId,leaseMs:5000,heartbeatMs:1000}；epoch随机boot标识+递增fence，不用sourceEpoch替代。

浏览器每1000ms主动renew，服务回复grant（同epoch，仅续租）。仅已认证同connectionId可续；旧epoch/旧connection消息拒绝。浏览器收到grant记录单调本地期限；过期、WS close、pagehide均立即停止接收dispatch、停掉fake按钮/heartbeat和HarnessBridge.refresh生产意图，并经现runtime取消远程single、撤回远程goal，允许既有固定步只完成safe-exit，确认后暂停远程执行。不能直接放claim/改pose，不能通过停止rAF假装已安全退出。后台tab若冻结，下次tick先检查lease再准入/推进；服务不得因此推断已经退出。

要防双驱动，不仅给服务器加map：H5a browser adapter必须绑定现存iframe.__npcStage，不创建第二slice；关闭本地fake事件生成器，所有远程入口和恢复路径检查同grant，local manual仍走同runtime；同一页面不得同时本地试验驱动与网络驱动。仅隐藏按钮不足以禁驱动，必须取消现interval/handler或在producer入口统一模式栅栏。旧SeatGoalRunner/controller未进入远程白名单，H5a不得调用。

不允许仅凭5秒timeout自动给第二浏览器grant。旧执行者可能暂停/分区而尚未退出：进入authority quarantine，拒绝新命令和另一个runtime attach。只有同runtime重连并提供真实安全停止snapshot/无action后，才可换epoch；不同runtime接管需先明确关闭旧页并人工确认quiescent，不能自动猜。服务重启丢失绑定时默认同样fail-closed，要求配置固定的runtimeInstanceId/原浏览器重连收口，而非“新服务上线即谁先来谁驱动”。这是H5a单浏览器限制，不是分布式租约已完成。需要自动故障转移时另做协议阶段，不扩展本轮。

服务验证report的scope/内外epoch一致、runtimeInstanceId、当前WS owner、递增reportSeq、唯一reportId及deliveryId关联；重复report返回同report_ack游标，不能重复公开事件。浏览器terminal的actionId/attemptId必须匹配先前accepted/started或合法preflight失败的绑定，终态不可改写。单个snapshot可包含完成于断连间的结果，但只可恢复同runtime原关联；新epoch不能把旧结果变成本次成功。服务不信普通客户端上报动作完成；schema通过也不等于执行证明。

## 8. Snapshot、事件游标与resync

服务保存最多1024条公开事件、256条待投递/报告关联，均仅内存；慢客户端不得无限排队。公开cursor固定 brokerEpoch/sequence，sequence是服务在此boot内单调序号，非simStep、domain revision、source sequence或action attempt；超过JS安全整数前换brokerEpoch并要求resync。任何持久化说法在H5a都为假。

快照需在浏览器同一JS任务/固定步完成边界捕获 runtime+store+receipts，然后服务在同一串行关联更新临界区登记cursor和snapshot。snapshot.cursor=S表示已包含截至S的公开状态；先订阅缓冲或读取后从S续接，重放所有>S记录，不能在GET snapshot与打开SSE之间丢事件。snapshot含observation、desiredGoal、actual、connection、runtimeInstanceId及有限receipts；receiptsComplete只指当前保留请求是否全部列出，historyComplete恒false。快照不等于完整历史，也不能拿old actual当当前在线。断连仍可返回最后快照但connection=offline，capturedAtWallMs保留原采样时间。

SSE用标准UTF-8 text/event-stream，每条id为cursor，event为receipt/snapshot/resync_required，data为streamEvent JSON；不用手拼换行协议。浏览器原生EventSource解析；使用同源HttpOnly会话cookie（首次POST配对换session），不把token放URL。首次用after=S，自动重连Last-Event-ID优先，二者若同时存在以header为准。合法当前window游标仅发>S；未知boot/过旧/未来cursor先发resync_required错误事件然后关闭，客户端收到必须close()停止自动重连，GET /snapshot再新建EventSource(after=S)。未携带cursor同样要求先snapshot，不静默从末尾开始。

慢客户端队列满必须显式resync/关闭；流已断则下次根据cursor发现缺口，不能丢事件还假称连续。heartbeat仅保活不推进状态游标；write/flush不是客户端消费确认，也不是动作成功。SSE发送超时/onAbort仅清理订阅，不授权动作终态。内部WS报告需report_ack后才可清理重发缓冲；丢ACK同reportId重发。Snapshot截面、SSE窗口、WS报告去重都属于H5a待实现验收，不是现DomainStore.history现成提供的网络能力。

## 9. 安全默认与错误

服务默认bind 127.0.0.1，禁止空token；独立配置.env注入token/Origin白名单/world/actor/source/session/policy路径，日志脱敏token、工具正文和用户内容，仅记录ID/decision。浏览器需同源安全配对；本地开发可通过明确页面Origin白名单，不允许Access-Control-Allow-Origin:*配credentials。WS也校验Origin、会话和runtime专用权限；不把普通harness token嵌入网页代码。

scope：read、events:write、commands:write、manual:write、cancel:write、runtime:attach。普通commands不允许priority=manual/safety；manual需额外scope，safety只运行时保留。取消只能本人owner请求，跨owner403；运行时/管理员安全路径另行内用，不公开work/world全部取消。HTTP JSON≤65536字节，batch≤64，ID≤128，流/WS单消息同上限；body读取前/读取中限长，超限413，不只看Content-Length。新操作每principal每秒20、burst40的有界限流，429 Retry-After；已有ID查询/安全cancel不能被新动作洪水饿死。

400 INVALID_REQUEST；401 UNAUTHORIZED；403 FORBIDDEN_SCOPE；404 UNKNOWN_COMMAND；409 COMMAND_CONFLICT/BUSY/MANUAL_PRIORITY/SAFETY_PRIORITY/STALE_AUTHORITY_EPOCH/AUTHORITY_BUSY；410 TTL_EXPIRED（准入前）；422 UNSUPPORTED_ACTION/UNSUPPORTED_GOAL/INVALID_ACTION_TIME/TTL_TOO_SHORT；503 COMMAND_LEDGER_FULL/AUTHORITY_OFFLINE；413 PAYLOAD_TOO_LARGE；429 RATE_LIMITED。所有返回error结构并保留原receipt，不把拒绝写成执行failed。准入后过期按第3/5节真实receipt返回，不用HTTP410覆盖accepted历史。

## 10. 扩展与验收边界

新增能力必须先完成其现runtime executor/evidence/safe-exit接入、声明真实candidate及必要version、独立TDD+浏览器验收，再提高capability/schema小版本；禁止仅改enum让旧家具上线。H5a只做站姿fake harness双向网络链，验收需证明HTTP→WS dispatch→真实begin→same-attempt terminal→report→SSE，以及重复/冲突/并行工具/乱序/TTL/manual与断连/双页抢attach/旧epoch报告/服务与浏览器重启/resync缺口。无浏览器回执只能pending/offline，服务器不得用timer造成功。

完整样例是合成协议fixture，不是本轮网络执行记录；真实本地/browser证据在DELIVERY.md与EVIDENCE.json。外部组件机制、许可证与选型见COMPONENTS.md。


# H5a.2 authority lease/epoch supplement (implemented subset)

H5a.1 parent acceptance is recorded in ../H5a/PARENT-ACCEPTANCE.md (0e9a363). H5a.2 implements the explicit-refusal option in §7, not transparent reconnection: close/lease loss permanently quarantines this broker. Same-runtime reconnect receives RESYNC_REQUIRED; a simultaneous second connection or another browser pairing receives AUTHORITY_BUSY. A transport close is not proof of safe-exit; the original browser continues existing safe-exit only, refuses new dispatch, and cannot be reactivated by a late grant. No automatic lease-based takeover.

Unconfirmed command queries and identical POST retries now return delivery=unknown, execution=null, optionally lastReceipt (historical accepted/started only). This does not manufacture a terminal. Confirmed terminal receipts remain historical reads. Batch uncertainty uses delivery=unknown, observation=null. Online receipt shapes and h5a.1 apiVersion are unchanged; clients must add unknown handling (not fully backwards-compatible enum extension). Neither pending nor unknown authorizes a retry under a different ID.

Manual recovery only: close all old H5 pages after observed safe-exit/quiescence, stop the broker, explicitly confirm H5_QUIESCENT, start a new broker and pair a fresh page. Both brokerEpoch and authorityEpoch change. Old-scope commands/reports are rejected before cache access. GET commands/{id}?brokerEpoch=<old boot> returns 409 RESYNC_REQUIRED; a bare missing ID is 404 UNKNOWN_COMMAND, never proof that the command did not execute. No persistent ledger, no re-identification/replay of old commands across boots, no cross-boot exactly-once claim. The configured runtime ID is an allowlist, not proof that two browser pages share a runtime. Recovery must not be automated by setting the confirmation flag.

Actual WS connection ownership is additionally passed to Broker.report/renew; reportId duplicates return original ACK, reportSeq reuse with a different reportId is rejected. Scope/runtime/Origin/token separation remains. /health does not exist; authenticated GET capabilities is the readiness probe. This H5a.2 historical 501 list is superseded for snapshot/SSE by the H5a.3 supplement below. Minimal recovery design and official close semantics: ../H5a/RECONNECT-DESIGN.md and ../H5a/RECONNECT-RESEARCH.md.

# H5a.3 只读接口补充（当前实现优先于上述规划）

新增 GET /snapshot?worldId=<bound>&actorId=<bound>[&brokerEpoch=<boot>]，输出 $defs/brokerSnapshot，不是浏览器输入 $defs/snapshot。新增 GET /events?worldId=<bound>&actorId=<bound>&brokerEpoch=<boot>&after=<cursor>，输出 $defs/brokerStreamEvent。旧 /status 为兼容保留的最后 runtime snapshot；消费者需要新鲜度/水位应使用 /snapshot。

鉴权沿用静态 harness Bearer principal，仅可访问配置绑定的 world/actor；runtime token/cookie 不是 read 权限。Origin 不存在允许 HTTP 客户端，存在则必须等配置 origin。不开放 CORS。未知/重复 query 拒绝，不支持 URL token。现无多principal/动态scope系统。HTTP SSE 使用 Authorization header + 已有 httpx_sse 标准解析器，未开放原生 EventSource cookie 会话配对；§8原生EventSource建议不是本轮能力。Last-Event-ID（包括空值）优先于 after；必须同时携带本 boot brokerEpoch。

唯一公开序列为 brokerEpoch/sequence，从0开始，序号由此broker串行更新：投递登记、连接状态、已验证真实runtime报告。report_ack.cursor 与该报告事件 id 相同，重复reportId返回原ACK且不新增事件。cursor_seq仅保留原有唯一report数量诊断，不充当公开sequence。当前事件名 receipt / runtime_snapshot / batch_receipt / delivery / connection；resync_required 是无 id 的终止控制事件，不进入ring/不推进游标。原规划streamEvent留作历史fixture接口。

同一broker锁保护snapshot、关联更新、journal发布和SSE next/变化通知。snapshot.cursor是已知投影watermark：commands/batches列出各最多256个保留请求，结果来自现broker.delivery；runtimeLastKnown.data保留最近浏览器同任务/固定步采样，capturedAtWallMs为来源时刻，receivedAtWallMs为broker接收时刻。freshness=last_known不等于实时，断连/无样本为unknown且actual.posture=unknown；旧姿态仅保留在runtimeLastKnown。原始runtime快照内部cursor只是浏览器最近ACK诊断，不是外层watermark。historyComplete恒false；receiptsComplete只指当前保留ledger。

ring最多1024条冻结JSON事件；各客户端独立cursor，每次只取一条，不复制历史为无限队列。严格重放>S，不丢snapshot与订阅间事件。缺cursor、缺/旧brokerEpoch、未来/过期cursor发resync_required(code=RESYNC_REQUIRED)后EOF；语法非法cursor为HTTP400 INVALID_CURSOR。客户端须停止读并重新snapshot。慢读越窗下一次读取明确resync；socket堵塞由现组件5秒send_timeout终止，无法在堵塞连接保证送达resync，续读仍检查gap。15秒注释ping不推进id；组件断开取消任务，finally清理订阅，不改变runtime权威/动作结果。

同epoch续读仅恢复观察，不重派动作。正常连接按排他>cursor发送；网络交付为at-least-once，客户端处理成功后保存cursor并按cursor去重，已读未保存的末事件可重读。write/flush不是消费确认，不宣称exactly-once。旧epoch拒绝、永久quarantine和人工新epoch恢复不变；无持久化/自动接管/真实Hermes/网络cancel或goal扩展。

小设计 SSE-DESIGN.md，真网络父复跑脚本 browser-sse.mjs 和 browser-reconnect.mjs 均位于 ../H5a/。ready_for_review不是父验收。

# H5a.4 显式 goal/cancel 实现补充（当前 gate=ready_for_review；父待验收）

POST /commands 接入现 schema goal.request，白名单 converse/lookAround/idle；外部 commandId 保留，长期满足投影 maintaining，attempts 保留事实。POST /cancel 使用已有 target.kind/commandId，通过真实 WS 交 runtime；新增 receipt.kind=cancel，status=requested/settled/rejected，targetReceipt 为原目标完整回执。settled 只能来源于 browser 已报告的目标终态（goal withdrawn/rejected 或 single terminal），broker 不生成动作取消。

命令/取消共用 ID 表，普通操作最多256，安全控制额外256，不受新命令限流；brokerSnapshot.commands 上限512，runtime snapshot.receipts 仍只含最多256原始命令。满容量返回503，现无无限安全控制ID别名。静态唯一 harness principal 同时拥有 commands/manual/cancel 权限，没有多owner系统。错ID 404 UNKNOWN_COMMAND，错kind 409 TARGET_KIND_MISMATCH，旧epoch先fence；重复相同ID不重投，已终态目标仍经WS报告 settled，读取仍 GET /commands/{cancelId}。

优先级设计见 ../H5a/GOAL-CANCEL-DESIGN.md。H5a.4 定点修正后，新 task 在已有显式或本地 manual 时以 MANUAL_PRIORITY 拒绝，绝不撤销 manual 获取准入；既有同ID仍先走原去重/冲突。goal 暂停模拟时 Unix TTL 到期也发布真实 withdrawn；运行中等原 safe-exit。actionId/attemptId 完整绑定，不接受半边身份替换。最终源码复跑与哈希见 ../H5a/GOAL-CANCEL-DELIVERY.md；当前 ready_for_review，父待验收，不是完整H5。撤回恢复最新 observation；无透明重连/持久化/家具/真实Hermes。
