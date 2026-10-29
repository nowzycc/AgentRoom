"""Official SDK stdio server, with explicit JSON Schema callbacks."""
import asyncio
import json
import logging
from mcp import types
from mcp.server.lowlevel import Server
from mcp.server.stdio import stdio_server
from .boundary import Boundary
from .config import Config
from .schemas import inputs, outputs

DESCRIPTIONS={
"npc_capabilities":"Read true H5a capabilities/availability/scope/epochs and unsupported features. Does not recover authority.",
"npc_snapshot":"Read bounded last-known snapshot, freshness and receipts using an explicit brokerEpoch. Offline actual remains unknown.",
"npc_publish_observations":"Publish bound observation facts, not action commands. Five existing event types only. Returns batch delivery/individual receipts, not invented motion.",
"npc_request_action":"Request one standing lookAround action. Preserve commandId, issuedAtWallMs, ttlMs and scope on retries. Quick receipt is not completion; query original ID.",
"npc_request_goal":"Request long-lived converse/lookAround/idle intention. Default task; manual requires local policy opt-in. Converse is a standing placeholder, not typing. Maintaining is not terminal.",
"npc_query_receipt":"Read original pending/accepted/started/terminal/unknown receipt, fenced by brokerEpoch. UNKNOWN_COMMAND after restart is not non-execution proof.",
"npc_cancel":"Explicit domain safe-exit request for owned commandId and action/goal kind under the one configured principal. requested is not settled; MCP disconnect/cancel does not call this tool.",
}

def create_server(config):
    boundary=Boundary(config)
    async def list_tools(context,params):
        return types.ListToolsResult(tools=[types.Tool(name=name,description=description,inputSchema=inputs[name],outputSchema=outputs[name],annotations=types.ToolAnnotations(readOnlyHint=name in ("npc_capabilities","npc_snapshot","npc_query_receipt"),idempotentHint=True,destructiveHint=name not in ("npc_capabilities","npc_snapshot","npc_query_receipt"),openWorldHint=False)) for name,description in DESCRIPTIONS.items()])
    async def call_tool(context,params):
        result=await boundary.call(params.name,params.arguments or {})
        return types.CallToolResult(content=[types.TextContent(text=json.dumps(result,ensure_ascii=False))],structuredContent=result,isError=result["outcome"]=="error")
    return Server("npc-mcp",version="0.1.0",instructions="Single configured principal, original IDs and epochs. Call completion is not NPC completion. No automatic replay/recovery.",get_tool_input_schema=lambda name:inputs.get(name),on_list_tools=list_tools,on_call_tool=call_tool)

async def serve(config):
    server=create_server(config)
    async with stdio_server() as (read,write):
        await server.run(read,write,server.create_initialization_options())

def main():
    # SDK logs can contain arbitrary tool payloads; suppress payload logging entirely.
    logging.basicConfig(level=logging.CRITICAL)
    try: asyncio.run(serve(Config.load()))
    except (ValueError, OSError):
        raise SystemExit("NPC MCP configuration/transport error; inspect local configuration (values redacted)") from None

if __name__=="__main__": main()
