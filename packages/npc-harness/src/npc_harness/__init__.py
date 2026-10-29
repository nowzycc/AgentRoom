"""Thin shared harness boundary: no MCP SDK, no Three/DOM, no execution authority."""
from .config import HarnessConfig
from .client import NpcHarnessClient

__all__ = ["HarnessConfig", "NpcHarnessClient"]
