"""Thin compatibility wrapper: NPC_MCP_* env -> shared npc-harness config; secrets stay out of repr."""
from dataclasses import fields as dataclass_fields
from npc_harness.config import HarnessConfig


class Config(HarnessConfig):
    @classmethod
    def load(cls) -> "Config":
        shared = HarnessConfig.from_env(prefix="NPC_MCP_", env_file_var="NPC_MCP_ENV_FILE",
                                        allow_manual_var="NPC_MCP_ALLOW_MANUAL")
        return cls(**{f.name: getattr(shared, f.name) for f in dataclass_fields(shared)})
