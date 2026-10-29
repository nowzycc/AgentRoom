import asyncio
import json
import unittest
from npc_mcp.config import Config
from npc_mcp.boundary import Boundary
from npc_mcp.schemas import inputs
import httpx

class BoundaryTest(unittest.TestCase):
    def config(self, **kw):
        return Config(base_url="http://127.0.0.1:12345", token="unit-secret", world_id="apartment-v3", actor_id="npc-a", source="test:mcp", session_id="mcp-test", observer_id="harness-observation", **kw)

    def call(self, name, payload, handler=None, **config):
        seen=[]
        async def handle(req):
            seen.append(req)
            if handler: return handler(req)
            return httpx.Response(503,json={"code":"AUTHORITY_OFFLINE"})
        value=asyncio.run(Boundary(self.config(**config),httpx.MockTransport(handle)).call(name,payload))
        return value,seen

    def action(self):
        return dict(apiVersion="h5a.1",scope=dict(worldId="apartment-v3",actorId="npc-a",authorityEpoch="epoch-1"),commandId="Id.Exact:Case-1",issuedAtWallMs=1,ttlMs=1000,type="action.request",actionKey="lookAround")

    def test_unknown_field_and_capability(self):
        for payload in [self.action()|{"extra":True}, self.action()|{"actionKey":"sit"}]:
            result,seen=self.call("npc_request_action",payload)
            self.assertEqual(result["code"],"INVALID_REQUEST"); self.assertFalse(seen)

    def test_scope_manual_and_safety(self):
        goal=self.action(); goal.pop("actionKey"); goal.update(type="goal.request",goal="idle",priorityClass="manual",onConflict="replace")
        result,seen=self.call("npc_request_goal",goal)
        self.assertEqual(result["code"],"FORBIDDEN_SCOPE"); self.assertFalse(seen)
        result,seen=self.call("npc_request_goal",goal|{"priorityClass":"safety"})
        self.assertEqual(result["code"],"INVALID_REQUEST"); self.assertFalse(seen)
        bad=self.action(); bad["scope"]["actorId"]="other"
        result,seen=self.call("npc_request_action",bad)
        self.assertEqual(result["code"],"FORBIDDEN_SCOPE"); self.assertFalse(seen)

    def test_no_browser_and_id_preserved(self):
        result,seen=self.call("npc_request_action",self.action())
        self.assertEqual(result["code"],"AUTHORITY_OFFLINE")
        self.assertEqual(json.loads(seen[0].content),self.action())

    def test_post_timeout_unknown_no_retry(self):
        def timeout(req): raise httpx.ReadTimeout("unit-secret",request=req)
        result,seen=self.call("npc_request_action",self.action(),timeout)
        self.assertEqual(len(seen),1); self.assertEqual(result["outcome"],"unknown")
        self.assertEqual(result["operationId"],"Id.Exact:Case-1")
        self.assertNotIn("unit-secret",json.dumps(result))

    def test_redirect_never_followed(self):
        result,seen=self.call("npc_request_action",self.action(),lambda req:httpx.Response(307,headers={"location":"http://evil.invalid/?token=unit-secret"}))
        self.assertEqual(len(seen),1); self.assertEqual(result["outcome"],"unknown")
        self.assertNotIn("evil",json.dumps(result)); self.assertNotIn("unit-secret",json.dumps(result))

    def test_bad_base_url(self):
        for url in ["http://localhost:1234", "http://127.0.0.1:1234/path", "http://127.0.0.1:1234?token=x", "https://evil.invalid", "http://user:pass@127.0.0.1:1234"]:
            with self.assertRaises(ValueError): Config(url,"x","w","a","s","ss","o")

    def test_schema_reject_bool_ttl(self):
        result,seen=self.call("npc_request_action",self.action()|{"ttlMs":True})
        self.assertEqual(result["code"],"INVALID_REQUEST"); self.assertFalse(seen)

if __name__ == "__main__": unittest.main()
