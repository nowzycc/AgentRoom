# npc_* 工具字段参考

来源：`packages/npc-mcp/src/npc_mcp/schemas.py`（打包的 H5a.1 契约，导入时做哈希校验）。
`*` = required；所有 enum/const/取值范围均为真实 schema，不得放宽。

## 公共约定

所有工具返回同一信封（MCP structuredContent）：

- 成功：`{"outcome": "upstream", "httpStatus": <int>, "data": <见各工具>}`
- 失败：`{"outcome": "error"|"unknown", "code": <string>, "httpStatus": <int|null>,`
  `"operationId": <string|null>, "detail"?: <string ≤500>, "query": <object|null>}`
  - `query` 形如 `{"tool": "npc_query_receipt", "commandId": ..., "brokerEpoch": ...}`，
    是 unknown 时复述给用户并求证的查询提示；本地校验失败（无 commandId/brokerEpoch）时为 null。

公共类型：

| 类型 | 约束 |
|---|---|
| id | string，1–128，pattern `^[A-Za-z0-9][A-Za-z0-9._:-]*$` |
| scope | `{"worldId": id*, "actorId": id*, "authorityEpoch": id*}` |
| terminal | `{"actionId": id*, "attemptId": id*, "actionKey": "lookAround"\|"turnToSpeaker", "outcome": "success"\|"failed"\|"cancelled", "reason": string\|null ≤280, "atSimMs": number ≥0, "planRevision": int ≥0}` |

## npc_capabilities（只读）

入参：`{}`（无参数）

出参 `data` = capabilities：

| 字段 | 类型/取值 |
|---|---|
| apiVersion* | const `"h5a.1"` |
| scope* | scope |
| available* | boolean |
| singleActions* | array ≤1；元素：`{"actionKey": const "lookAround", "posture": const "standing", "candidate": null, "resourceDependencies": [], "versionDependencies": [], "channels": const ["gaze"]}` |
| goals* | `[]` 或 `["converse","lookAround","idle"]` |
| singleLedgerCapacity* | const `256` |
| persistence* | const `"memory-only"` |
| implemented | array\<string\>（可选） |
| unsupported | array\<string\>（可选） |
| brokerEpoch | id（可选；写操作/查询所需 epoch 以此为准） |
| recovery | const `"close-old-pages-confirm-quiescent-restart-new-epoch"`（可选） |
| quarantine | boolean（可选） |

## npc_snapshot（只读）

入参：

| 字段 | 类型/取值 |
|---|---|
| brokerEpoch* | id |

出参 `data` = brokerSnapshot：

| 字段 | 类型/取值 |
|---|---|
| apiVersion* | const `"h5a.1"` |
| scope* | scope |
| brokerEpoch* | id |
| cursor* | string，pattern `^[A-Za-z0-9._:-]+/[0-9]+$`，≤160 |
| runtimeInstanceId* | id |
| connection* | `"online"` \| `"offline"` |
| freshness* | `"last_known"` \| `"unknown"` |
| actual* | `{"goalId": "converse"\|"lookAround"\|"idle"\|null, "posture": "standing"\|"unknown", "actionId": id\|null, "attemptId": id\|null, "phase": "running"\|"awaiting-evidence"\|"exiting"\|"exit-unconfirmed"\|null}` |
| runtimeLastKnown* | null 或 `{"data": <runtime snapshot>, "receivedAtWallMs": int ≥0}` |
| commands* | array ≤512；元素 `{"commandId": id*, "result": <delivery\|receipt>*}` |
| batches* | array ≤256；元素 `{"batchId": id*, "result": <batchDelivery\|batchReceipt>*}` |
| receiptsComplete* | const `true` |
| historyComplete* | const `false` |

## npc_request_action（写）

入参：

| 字段 | 类型/取值 |
|---|---|
| apiVersion* | const `"h5a.1"` |
| scope* | scope |
| commandId* | id（生成一次，全程不变） |
| issuedAtWallMs* | int，0–9007199254740991 |
| ttlMs* | int，1000–3600000 |
| type* | const `"action.request"` |
| actionKey* | const `"lookAround"` |

出参 `data` = receipt(action) 或 delivery（两种形态见下方"receipt / delivery"节）。

## npc_request_goal（写）

入参：

| 字段 | 类型/取值 |
|---|---|
| apiVersion* | const `"h5a.1"` |
| scope* | scope |
| commandId* | id（生成一次，全程不变） |
| issuedAtWallMs* | int，0–9007199254740991 |
| ttlMs* | int，1000–3600000 |
| type* | const `"goal.request"` |
| goal* | `"converse"` \| `"lookAround"` \| `"idle"` |
| priorityClass* | `"task"` \| `"manual"`（manual 未被本地策略允许时客户端直接返回 FORBIDDEN_SCOPE，请求不出网） |
| onConflict* | `"replace"` \| `"reject"` |

出参 `data` = receipt(goal) 或 delivery。

## npc_query_receipt（只读）

入参：

| 字段 | 类型/取值 |
|---|---|
| brokerEpoch* | id（命令受理当时的 epoch，重启后换新 epoch 查不到） |
| commandId* | id（原 ID，逐字不变） |

出参 `data` = receipt 或 delivery。注意：UNKNOWN_COMMAND after restart is not
non-execution proof（persistence=memory-only）。

## npc_cancel（写）

入参：

| 字段 | 类型/取值 |
|---|---|
| apiVersion* | const `"h5a.1"` |
| scope* | scope |
| commandId* | id（本次取消请求自身的 ID） |
| type* | const `"cancel"` |
| target* | `{"kind": const "action", "commandId": id*}` 或 `{"kind": const "goal", "commandId": id*}`（commandId 为被取消命令的原 ID） |

出参 `data` = receipt(cancel) 或 delivery。cancelReceipt 特有字段：
`kind*` const `"cancel"`、`target*` 同入参、
`status*`：`"requested"` | `"settled"` | `"rejected"`（requested ≠ settled）、
`reason*` string|null ≤280、`targetReceipt*`：actionReceipt | goalReceipt | null。

## npc_publish_observations（写）

入参 = eventBatch：

| 字段 | 类型/取值 |
|---|---|
| apiVersion* | const `"h5a.1"` |
| scope* | scope |
| batchId* | id |
| events* | array，1–64 条 |

每条 event = 公共信封 + 按 type 的 data；batch 内要求额外携带 `sessionId`，且 `type` 限于：

`presence.heartbeat` / `run.started` / `run.completed` / `tool.started` / `tool.completed`

| event 字段 | 类型/取值 |
|---|---|
| specVersion* | const `"1.0"` |
| eventId* | id |
| source* | string，pattern `^[a-z][a-z0-9-]{1,31}:[A-Za-z0-9._-]{1,64}$` |
| sourceEpoch* | id |
| sequence* | int ≥0 |
| worldId* / actorId* | id（必须等于绑定值） |
| sessionId*（batch 约束） | id（必须等于绑定 session） |
| type* | 上列 5 种之一 |
| occurredAt* | string，format date-time |
| data* | object，按 type：`presence.heartbeat`→`{"status": "alive"\|"degraded"}`；`run.started`→`{}`；`run.completed`→`{"outcome": "success"\|"failed"\|"cancelled"}` + 事件级 `runId`；`tool.started`→`{"toolCallId": id, "activityClass": string ^[a-z][a-z0-9._-]{0,63}$}`；`tool.completed`→`{"toolCallId": id, "outcome": "success"\|"failed"\|"cancelled"}` |
| runId / correlationId | id（可选，事件级） |

客户端边界校验：任一 event 的 `(worldId, actorId, source, sessionId)` 不等于绑定值
→ FORBIDDEN_SCOPE，整个 batch 拒绝。

出参 `data` = batchReceipt 或 batchDelivery：

| 字段 | batchReceipt | batchDelivery |
|---|---|---|
| apiVersion* | const `"h5a.1"` | const `"h5a.1"` |
| scope* | scope | scope |
| batchId* | id | id |
| results* | array 1–64：`{"index": int 0–63*, "eventId": id*, "accepted": boolean*, "reason": string\|null ≤280*, "revision": int ≥0*}` | — |
| delivery* | — | `"pending"` \| `"unknown"` |
| observation* | — | null |

## receipt / delivery（request_action / request_goal / query_receipt / cancel 的 data）

`data` 为 receipt（三选一，按 `kind` 区分）或 delivery：

### receipt(action)

| 字段 | 类型/取值 |
|---|---|
| apiVersion* / scope* / commandId* | 同上 |
| kind* | const `"action"` |
| accepted* | boolean |
| status* | `"rejected"` \| `"accepted"` \| `"started"` \| `"cancel_requested"` \| `"succeeded"` \| `"cancelled"` \| `"failed"` |
| reason* | string\|null，≤280 |
| actionId* / attemptId* | id\|null |
| terminal* | terminal\|null |

条件约束（schema allOf，必须整体满足）：
- `rejected` → `accepted=false`、`actionId/attemptId/terminal=null`、`reason` 非空 string
- 非 `rejected` → `accepted=true`
- `accepted`（仅受理）→ `actionId/attemptId/terminal/reason` 全 null
- `started` / `cancel_requested` / `succeeded` → `actionId`、`attemptId` 为非空 id
- `started` / `cancel_requested` → `terminal=null`
- `succeeded` → `terminal` 非空且 `terminal.outcome="success"`、`reason=null`
- `failed` / `cancelled` → `reason` 非空 string；`terminal` 可为 null 或对应 outcome

### receipt(goal)

| 字段 | 类型/取值 |
|---|---|
| apiVersion* / scope* / commandId* | 同上 |
| kind* | const `"goal"` |
| status* | `"accepted"` \| `"started"` \| `"pending"` \| `"maintaining"` \| `"succeeded"` \| `"failed"` \| `"withdrawn"` \| `"rejected"` |
| goalStatus* | `"pending"` \| `"active"` \| `"maintaining"` \| `"failed"` \| `"withdrawn"` |
| reason* | string\|null，≤280 |
| attempts* | array ≤256，元素 = terminal |
| accepted / actionId / attemptId | boolean / id\|null / id\|null（可选） |

条件约束：`status="succeeded"` → `goalStatus="maintaining"` 且 `attempts` 至少含一条
`outcome="success"`（即：成功 = 达成后进入维持，不是结束）。

### delivery

| 字段 | 类型/取值 |
|---|---|
| apiVersion* / scope* / commandId* | 同上 |
| delivery* | `"pending"` \| `"unknown"` |
| lastReceipt | receipt（可选，最近一笔回执） |
| execution* | null |

## 失败信封与错误码

`{outcome, code, httpStatus, operationId, detail?, query}`（见"公共约定"）。
契约内 `code` 全集：
INVALID_REQUEST、UNAUTHORIZED、FORBIDDEN_SCOPE、PAYLOAD_TOO_LARGE、COMMAND_CONFLICT、
BUSY、MANUAL_PRIORITY、SAFETY_PRIORITY、TTL_EXPIRED、TTL_TOO_SHORT、INVALID_ACTION_TIME、
UNSUPPORTED_ACTION、UNSUPPORTED_GOAL、COMMAND_LEDGER_FULL、AUTHORITY_OFFLINE、
STALE_AUTHORITY_EPOCH、AUTHORITY_BUSY、RESYNC_REQUIRED、UNKNOWN_COMMAND、RATE_LIMITED。
客户端本地补充：UPSTREAM_UNAVAILABLE（连接失败；写操作报 unknown）、UPSTREAM_REDIRECT、
UPSTREAM_HTTP_ERROR、INVALID_UPSTREAM_RESPONSE。

- 读操作失败恒为 `outcome="error"`（可安全重试）。
- 写操作只有在"明确已知拒绝码 + 匹配 HTTP 状态"才是 `error`；传输中断、非 2xx 未知码等
  一律 `unknown`（可能已执行），按 SKILL.md 失败处理节复述并用原 ID 查询。
