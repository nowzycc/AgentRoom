# AgentRoom

AgentRoom is an agent-driven 3D room: a browser-rendered NPC scene with a
single-authority runtime, an HTTP/WebSocket broker, an MCP server, and an
Electron desktop shell.

The project explores a narrow question: **can an AI coding agent inhabit a
persistent 3D space and act through an explicit, auditable contract instead of
pretending to act?**

Status: **private-preview quality**. Explicit command execution is implemented
and tested. Automatic observation of agent lifecycle events is not included in
this repository.

## Architecture

```
agent (Hermes / DeepSeek Harness, ...)
   │  MCP tools (or HTTP/CLI, same domain contract)
   ▼
npc-mcp ──► H5a broker ──► browser runtime (single execution authority)
                 │                 │
                 │                 ├─ scene (three.js + VRM)
                 │                 └─ ActionExecutor / MotionAdapter
                 └─ snapshot / SSE / receipts
Electron shell wraps the same page and brokers the local sidecar.
```

Key rules the code enforces:

- **One execution authority per world.** Viewers may be many; executors are not.
- **A transport success is not a completed action.** Receipts carry
  `accepted → started → terminal`; `maintaining` is not terminal.
- **Unknown stays unknown.** If a write's response is lost, the original
  `commandId` is preserved and queried; nothing is silently retried with a new
  id.
- **Observation never blocks the agent.** Bounded queues, short timeouts, and
  explicit gaps instead of fabricated idle states.

## Repository layout

| Path | Contents |
|---|---|
| `packages/npc-contracts` | JSON Schemas for envelopes, events, snapshots |
| `packages/npc-core` | domain runtime, planner, action catalog |
| `packages/npc-harness` | typed client, SSE reader, CLI |
| `packages/npc-mcp` | MCP stdio server (7 tools) |
| `packages/agentroom` | Electron shell and Windows packaging scripts |
| `tools/npc-v2/hardening/H5a` | HTTP/WS broker, receipts, journal, read API |
| `tools/npc-v2/hardening/H4-closeout` | frozen protocol contract and examples |
| `tools/layout-model-v3/web/harness-preview` | scene page and committed preview bundles |

## Running (development)

Requirements: Python 3.11+, Node.js 22+, a WebGL2-capable browser.

```bash
# 1. broker
cd tools/npc-v2/hardening/H5a
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
H5_QUIESCENT=confirmed H5_ORIGIN=http://127.0.0.1:19090 \
H5_RUNTIME_ID=runtime-dev H5_HARNESS_TOKEN=... H5_RUNTIME_TOKEN=... \
python run.py

# 2. MCP server
cd packages/npc-mcp
uv sync
NPC_MCP_BASE_URL=http://127.0.0.1:19090 NPC_MCP_TOKEN=... \
NPC_MCP_WORLD_ID=apartment-v3 NPC_MCP_ACTOR_ID=npc-a \
NPC_MCP_SOURCE=harness:local NPC_MCP_SESSION_ID=local-session \
NPC_MCP_OBSERVER_ID=harness-observation \
uv run npc-mcp
```

The scene **code** is in this repository, but 3D models, motion clips and
textures are **not**. See `ASSETS.md` for how to supply them and which licenses
apply. The `harness-preview/*.js` files are committed build artifacts; see
`tools/layout-model-v3/web/harness-preview/THIRD-PARTY.md` for the code they
inline and why they cannot be rebuilt from this repository alone.

## MCP tools

`npc_capabilities`, `npc_snapshot`, `npc_publish_observations`,
`npc_request_action`, `npc_request_goal`, `npc_query_receipt`, `npc_cancel`.

Read tools are side-effect free. Write tools preserve the caller's `commandId`,
`issuedAtWallMs`, `ttlMs`, and scope; a quick receipt is never completion.

## Desktop shell

`packages/agentroom` contains the Electron main process, a narrow preload
bridge, and build scripts for a portable Windows x64 ZIP. The shell spawns the
Python broker as a sidecar on a random loopback port with per-boot tokens. See
`packages/agentroom/README.zh-CN.md`.

## Assets and licensing

Code: MIT (see `LICENSE`). Third-party components: see `NOTICE`.
3D models, motion capture, and textures are **not distributed here**; see
`ASSETS.md` for their sources and terms.

## 中文简介

AgentRoom 是一个由 agent 驱动的 3D 房间：浏览器渲染场景 + 单一执行权威的
runtime + HTTP/WS broker + MCP 工具 + Electron 外壳。本仓库只包含代码与契约，
不包含任何 3D 模型、动捕或贴图；资产来源与许可见 `ASSETS.md`。
