---
name: agentroom
description: "Use when the user asks the on-screen AgentRoom character to act or report status: trigger lookAround actions, set converse/lookAround/idle goals, query receipts, or cancel — via the agentroom MCP npc_* tools; never fake completion, never retry with a new ID."
---

# AgentRoom 角色控制（npc_* 工具）

通过名为 `agentroom` 的 MCP server（stdio）控制 AgentRoom 画面里的角色。
凭据与端口由启动器注入环境；本 skill 不接触 token，也不引用任何内部路径。

## 何时使用 / 何时不用

- 使用：用户要让角色做动作（如 lookAround 环顾）、设定长期意图（converse / lookAround / idle
  goal）、查询某条命令的进度或回执、取消进行中的命令。
- 不用：本版本没有自动观察宿主事件的能力——agent 不会收到任何房间事件推送，不要等待或假设
  这类通知存在。`npc_publish_observations` 只是显式上报 agent 自身事实的写接口，不是被动观察
  通道，也不是动作命令。

## 首次调用前的准备

1. 先调 `npc_capabilities`（只读）拿 `scope`（worldId / actorId / authorityEpoch）与
   `brokerEpoch`。
2. 之后所有写操作的 `scope.authorityEpoch`、`npc_snapshot` / `npc_query_receipt` 的
   `brokerEpoch` 都用这个值。桌面端重启后 epoch 会变；遇到 `RESYNC_REQUIRED` /
   `STALE_AUTHORITY_EPOCH` 时重新调 `npc_capabilities`。
3. `worldId` / `actorId` 是启动器注入的固定绑定，不要自己编造，也不要替换 `authorityEpoch`。

## 七个工具

| 工具 | 读/写 | 用途 |
|---|---|---|
| npc_capabilities | 只读 | 探测可用能力、scope、brokerEpoch、不支持的功能；不恢复权威。 |
| npc_snapshot | 只读 | 按 brokerEpoch 读 last-known 快照：连接状态、当前 goal/动作、命令列表。 |
| npc_request_action | 写 | 请求一次站立 lookAround 动作；受理回执不等于完成。 |
| npc_request_goal | 写 | 请求长期意图 converse / lookAround / idle；maintaining 不是终态。 |
| npc_query_receipt | 只读 | 用原 commandId + brokerEpoch 查受理/启动/终态/unknown 回执。 |
| npc_cancel | 写 | 领域级安全退出：对 owned commandId 请求取消 action 或 goal。 |
| npc_publish_observations | 写 | 上报 agent 自身事实（心跳/工具运行，仅 5 种事件）；非动作命令。 |

字段级入参/出参表见 references/tools.md，本文件只讲语义。所有工具返回统一信封：
成功 `{outcome:"upstream", httpStatus, data}`；失败 `{outcome:"error"|"unknown", code, ...}`。

### 典型参数

- `npc_capabilities`：无参数。
- `npc_snapshot`：`{"brokerEpoch": "<capabilities 返回值>"}`。
- `npc_request_action`：`apiVersion:"h5a.1"`、`scope`、`commandId`（自造、全程不变）、
  `issuedAtWallMs`（当前 epoch 毫秒）、`ttlMs`（1000–3600000）、`type:"action.request"`、
  `actionKey:"lookAround"`（本版唯一动作）。
- `npc_request_goal`：同上基础字段，另有 `type:"goal.request"`、`goal`
  （converse/lookAround/idle）、`priorityClass`（task/manual；manual 默认被本地策略拒绝，
  返回 FORBIDDEN_SCOPE）、`onConflict`（replace=顶掉当前意图 / reject=冲突即拒）。
- `npc_query_receipt`：`{"brokerEpoch": "...", "commandId": "<原 ID>"}`。
- `npc_cancel`：`type:"cancel"`、`commandId`（本次取消请求自己的新 ID）、
  `target:{"kind":"action"|"goal", "commandId":"<被取消命令的原 ID>"}`。
- `npc_publish_observations`：`batchId` + `events`（1–64 条，每条含 `sessionId`；事件里的
  worldId/actorId/source 必须等于绑定值，否则 FORBIDDEN_SCOPE）。

## 不变量（违反即事故）

1. `commandId` 全程不变：request、query、cancel 引用的都是同一个 ID；重试绝不允许换新 ID。
2. `accepted` / `started` 只是受理与启动，不是完成；完成只认终态回执
   （status = succeeded / failed / cancelled，且 `terminal` 非空）。
3. goal 的 `maintaining`（含 succeeded 时 goalStatus=maintaining）表示"达成后维持中"，
   不是终态；不要向用户宣布 goal 已结束。
4. 回执丢失或 `outcome=unknown`：保留原 commandId + 请求当时的 brokerEpoch 用
   `npc_query_receipt` 查询；不换 ID 重发。重启后查到 UNKNOWN_COMMAND 不能证明"没执行"
   （persistence=memory-only），只能说无法确认。
5. 取消是领域操作 `npc_cancel`；断开 MCP、中断调用、超时退出都不会取消角色动作。
   取消回执 status=requested 不等于 settled。

## 失败处理

- `outcome="unknown"`（仅写操作出现）：结果不可判定、可能已执行。必须向用户如实复述
  "动作结果未知，可能已在执行"，然后用返回 `query` 字段提示的参数（tool / commandId /
  brokerEpoch）调 `npc_query_receipt` 求证；`query` 为 null 时向用户询问可信的
  brokerEpoch，绝不猜测、绝不重发。
- `outcome="error"`：确定性拒绝，`code` 说明原因（INVALID_REQUEST、FORBIDDEN_SCOPE、
  COMMAND_CONFLICT、BUSY、TTL_EXPIRED、RATE_LIMITED、AUTHORITY_OFFLINE、UNKNOWN_COMMAND
  等，全表见 references/tools.md）。原样转述 code 与 reason，不要包装成"已完成"。
- 连接/离线（UPSTREAM_UNAVAILABLE、AUTHORITY_OFFLINE、snapshot 中 connection=offline）：
  告知用户角色当前不可达、本次没有产生任何已确认的动作；不编造动作完成，不假装成功。
- 任何失败都先对用户说实话再决定是否重试；重试沿用原 ID 与原 scope（含 authorityEpoch）。

## 最小示例

### 例 1：让角色 lookAround

npc_capabilities →
`{"outcome":"upstream","httpStatus":200,"data":{"scope":{"worldId":"apartment-v3","actorId":"npc-a","authorityEpoch":"epoch-1"},"brokerEpoch":"epoch-1","available":true,...}}`

npc_request_action →
```
{
  "apiVersion": "h5a.1",
  "scope": {"worldId": "apartment-v3", "actorId": "npc-a", "authorityEpoch": "epoch-1"},
  "commandId": "act-20261029-001",
  "issuedAtWallMs": 1795300000000,
  "ttlMs": 60000,
  "type": "action.request",
  "actionKey": "lookAround"
}
```
← `{"outcome":"upstream","httpStatus":200,"data":{"commandId":"act-20261029-001","kind":"action","accepted":true,"status":"started","actionId":"a-1","attemptId":"t-1","terminal":null,...}}`
→ 先向用户说"已开始环顾"；随后按例 2 查询，直到 status 进入终态才说"完成了"。

### 例 2：查询回执（回执丢失 / 复核终态）

npc_query_receipt →
```
{"brokerEpoch": "epoch-1", "commandId": "act-20261029-001"}
```
← data 为 receipt：status=succeeded 且 terminal 非空 → 可宣告完成；
  status=started / cancel_requested → 仍在进行，继续等；
  data 为 delivery（pending/unknown）→ 尚无结论，保持原 ID 稍后再查。
