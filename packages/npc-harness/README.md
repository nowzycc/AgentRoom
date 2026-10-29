# npc-harness — H5a 共享薄客户端（HTTP client / schema 入口 / SSE / CLI）

单执行权威（浏览器 NpcRuntime/ActionExecutor）不变；本包只是传输边界，无 MCP SDK/Three/DOM 依赖，不执行任何领域动作。

## 结构
- `config.py` HarnessConfig：固定 `http://127.0.0.1:<port>`、token（repr 隐藏）、world/actor/source/session/observer 绑定、`allow_manual=False` 默认、timeout 0.01–30s。env 前缀 `NPC_HARNESS_`，仅显式 `NPC_HARNESS_ENV_FILE`，不向上搜索。
- `schemas.py`：H4 contract + npc-contracts 三件的打包拷贝，import 时 sha256 门（漂移即拒绝启动）。输入/输出 schema 与 MCP 完全同源。
- `client.py` NpcHarnessClient：7 个领域操作唯一入口。POST 永不自动重试、不改 ID；redirect 拒绝；trust_env=False（代理 env 不生效）；错误码白名单清洗（上游正文/异常文本不入结果）；AUTHORITY_OFFLINE=确定性 error，其余 5xx 写操作=unknown。
- `sse.py` stream_events：httpx_sse 标准解析器，生成器（无内部队列）；Last-Event-ID 优先 after；resync_required 终止并要求重新 snapshot；错误 cursor → HarnessStreamError(400, INVALID_CURSOR)。
- `cli.py`：`capabilities/snapshot/action/goal/query/cancel/publish/events`；stdout 仅一行结构化 JSON envelope（与 MCP structuredContent 同形）；exit 0/10/11/12/2 语义见 DELIVERY.md。

## CLI 示例
    NPC_HARNESS_BASE_URL=http://127.0.0.1:8801 \
    NPC_HARNESS_TOKEN=... NPC_HARNESS_WORLD_ID=apartment-v3 NPC_HARNESS_ACTOR_ID=npc-a \
    NPC_HARNESS_SOURCE=... NPC_HARNESS_SESSION_ID=... NPC_HARNESS_OBSERVER_ID=harness-observation \
    .venv/bin/python -m npc_harness.cli action --input cmd.json

`--env-file <path>` 可代替代入 env；`--broker-epoch` 为 events 必填、snapshot/query 便利项；events 另有 `--after/--last-event-id/--max-events/--timeout-seconds` 有界读。

## 测试
    packages/npc-mcp/.venv/bin/python -m pytest tools/npc-v2/hardening/H6-harness/test_client.py -q
集成全链路（临时 H5a + 真实浏览器 rig）：`test_integration.py`，见 `../../tools/npc-v2/hardening/H6-harness/DELIVERY.md`。

## 依赖
httpx==0.28.1、httpx-sse==0.4.0、jsonschema==4.26.0、python-dotenv==1.2.2（与 npc-mcp 同一项目 venv；uv.lock 补锁为对父的提案）。
