"""Thin compatibility wrapper: the MCP boundary delegates to the shared npc-harness client.

Transport adapter only; preserves original domain receipts and identities. The optional
transport parameter keeps MockTransport-based tests working unchanged.
"""
import httpx
from npc_harness.client import NpcHarnessClient


class Boundary:
    def __init__(self, config, transport: httpx.AsyncBaseTransport | None = None):
        self.config = config
        self.client = NpcHarnessClient(config, transport=transport)

    def error(self, code, operation=None, status=None, unknown=False):
        return self.client.error(code, operation=operation, status=status, unknown=unknown)

    async def call(self, name, args):
        return await self.client.call(name, args)
    # CancelledError intentionally propagates: MCP cancellation is never domain cancel.
