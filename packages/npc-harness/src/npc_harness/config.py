"""Explicit single-principal binding; secrets excluded from repr.

Shared by npc-mcp (NPC_MCP_* env) and the non-MCP CLI (NPC_HARNESS_* env).
Config only; starting servers at import time is forbidden. Bounded-response caps are
explicit and small by default; they exist so a hostile upstream can never make this
client buffer unbounded data.
"""
from dataclasses import dataclass, field
import os
from urllib.parse import urlsplit
from dotenv import load_dotenv


@dataclass(frozen=True)
class HarnessConfig:
    base_url: str
    token: str = field(repr=False)
    world_id: str
    actor_id: str
    source: str
    session_id: str
    observer_id: str
    allow_manual: bool = False
    timeout_seconds: float = 5.0
    max_response_bytes: int = 1_048_576
    max_stream_bytes: int = 4_194_304

    def __post_init__(self):
        u = urlsplit(self.base_url)
        if (u.scheme != "http" or u.hostname != "127.0.0.1" or not u.port or u.username or u.password
                or u.path or u.query or u.fragment):
            raise ValueError("base_url must be a fixed http loopback origin with explicit port")
        if not all([self.token, self.world_id, self.actor_id, self.source, self.session_id, self.observer_id]) \
                or self.observer_id == self.actor_id:
            raise ValueError("Explicit nonempty binding and distinct observer required")
        if not 0.01 <= self.timeout_seconds <= 30:
            raise ValueError("Invalid timeout")
        if not 1024 <= self.max_response_bytes <= 16_777_216:
            raise ValueError("Invalid max_response_bytes")
        if not 4096 <= self.max_stream_bytes <= 67_108_864:
            raise ValueError("Invalid max_stream_bytes")

    @classmethod
    def from_env(cls, *, prefix: str, env_file_var: str, allow_manual_var: str) -> "HarnessConfig":
        # Only an explicitly named local env file; never search parent directories.
        path = os.environ.get(env_file_var)
        if path:
            load_dotenv(path, override=False)
        keys = ["BASE_URL", "TOKEN", "WORLD_ID", "ACTOR_ID", "SOURCE", "SESSION_ID", "OBSERVER_ID"]

        def _int_env(name: str, default: str) -> int:
            raw = os.environ.get(prefix + name, default)
            try:
                return int(raw)
            except ValueError as error:
                raise ValueError(f"Invalid {name}") from None

        return cls(*(os.environ.get(prefix + k, "") for k in keys),
                   allow_manual=os.environ.get(allow_manual_var, "false") == "true",
                   timeout_seconds=float(os.environ.get(prefix + "TIMEOUT_SECONDS", "5")),
                   max_response_bytes=_int_env("MAX_RESPONSE_BYTES", "1048576"),
                   max_stream_bytes=_int_env("MAX_STREAM_BYTES", "4194304"))
