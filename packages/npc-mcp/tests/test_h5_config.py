import os
import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/"tools/npc-v2/hardening/H5a"))
from config import Config

def test_explicit_bindings():
    env=dict(H5_QUIESCENT="confirmed",H5_ORIGIN="http://127.0.0.1:12345",H5_RUNTIME_ID="test-runtime",H5_HARNESS_TOKEN="test-harness",H5_RUNTIME_TOKEN="test-runtime-secret",H5_WORLD_ID="apartment-v3",H5_ACTOR_ID="npc-a",H5_SOURCE="integration:mcp",H5_SESSION_ID="mcp-session",H5_OBSERVER_ID="mcp-observer")
    with patch.dict(os.environ,env):
        c=Config.load()
    assert (c.world_id,c.actor_id,c.source,c.session_id,c.observer_id)==("apartment-v3","npc-a","integration:mcp","mcp-session","mcp-observer")
