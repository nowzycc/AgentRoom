"""Thin compatibility wrapper: npc_mcp re-exports the single shared schema entry (npc-harness)."""
from npc_harness.schemas import (CONTRACT, SYNC_OK, definition, inline, inputs,  # noqa: F401
                                 object_schema, outputs, valid)
