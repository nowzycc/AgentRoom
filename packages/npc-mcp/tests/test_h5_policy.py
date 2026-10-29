import os
import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/"tools/npc-v2/hardening/H5a"))
from server import create_app
from starlette.testclient import TestClient

def test_browser_policy_bound_config():
    env=dict(H5_QUIESCENT="confirmed",H5_ORIGIN="http://127.0.0.1:12345",H5_RUNTIME_ID="test-runtime",H5_HARNESS_TOKEN="test-harness",H5_RUNTIME_TOKEN="test-runtime-secret",H5_SOURCE="integration:mcp",H5_SESSION_ID="mcp-session",H5_OBSERVER_ID="mcp-observer")
    with patch.dict(os.environ,env),TestClient(create_app()) as client:
        response=client.get("/room/web/harness-preview/policy.json")
        assert response.status_code==200
        p=response.json()
        assert (p["source"],p["sessionId"],p["observerId"])==("integration:mcp","mcp-session","mcp-observer")
