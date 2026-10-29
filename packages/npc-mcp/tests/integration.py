"""Real SDK stdio process -> real H5a -> real Playwright rig. No mocked upstream."""
import asyncio
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import sys
import time
import traceback
from mcp import Client
from mcp.client.stdio import StdioServerParameters
import httpx

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/"tools/npc-v2/hardening/H5-mcp"
PY=sys.executable
NODE=os.environ.get("NPC_TEST_NODE","<home>/.nvm/versions/node/v22.22.1/bin/node")

async def run():
    evidence=dict(status="blocked",checks={},protocols={},startedAt=time.time(),sources={})
    stamp=f"mcp-{time.time_ns()}-{secrets.token_hex(4)}"
    service=browser=None
    secret=secrets.token_urlsafe(32);runtime_secret=secrets.token_urlsafe(32)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1",0));port=sock.getsockname()[1]
    base=f"http://127.0.0.1:{port}"
    env={**os.environ,"H5_QUIESCENT":"confirmed","H5_ORIGIN":base,"H5_RUNTIME_ID":stamp,"H5_HARNESS_TOKEN":secret,"H5_RUNTIME_TOKEN":runtime_secret,"H5_SOURCE":"integration:mcp","H5_SESSION_ID":stamp,"H5_OBSERVER_ID":"harness-observation","H5_WORLD_ID":"apartment-v3","H5_ACTOR_ID":"npc-a"}
    mcp_env={**os.environ,"NPC_MCP_BASE_URL":base,"NPC_MCP_TOKEN":secret,"NPC_MCP_WORLD_ID":"apartment-v3","NPC_MCP_ACTOR_ID":"npc-a","NPC_MCP_SOURCE":"integration:mcp","NPC_MCP_SESSION_ID":stamp,"NPC_MCP_OBSERVER_ID":"harness-observation","NPC_MCP_ALLOW_MANUAL":"true"}
    params=StdioServerParameters(command=PY,args=["-m","npc_mcp.server"],env=mcp_env,cwd=ROOT)
    async with httpx.AsyncClient(trust_env=False,headers={"Authorization":"Bearer "+secret},timeout=5) as http:
      async def direct(path):
        r=await http.get(base+"/api/h5a/"+path);return r.json()
      async def command(op,**kw):
        browser.stdin.write((json.dumps(dict(op=op,**kw))+"\n").encode());await browser.stdin.drain()
        row=json.loads(await asyncio.wait_for(browser.stdout.readline(),30))
        assert "error" not in row,row
        assert not row["errors"],row["errors"]
        return row["result"]
      try:
        service=await asyncio.create_subprocess_exec(PY,str(ROOT/"tools/npc-v2/hardening/H5a/run.py"),env=env,stdout=asyncio.subprocess.DEVNULL,stderr=asyncio.subprocess.PIPE)
        for _ in range(120):
          try:
            probe=await direct("capabilities");break
          except httpx.HTTPError: await asyncio.sleep(.05)
        else: raise RuntimeError("H5 readiness failed")
        boot=probe["brokerEpoch"];scope=probe["scope"]
        evidence["service"]=dict(pid=service.pid,base=base)
        # Discovery against offline authority and actual legacy/modern negotiation.
        for mode in ["auto","legacy"]:
          async with Client(params,mode=mode) as client:
            evidence["protocols"][mode]=client.protocol_version
            tools=await client.list_tools();assert len(tools.tools)==7
            evidence.setdefault("discovery",{})[mode]=tools.model_dump(by_alias=True,mode="json")
            result=(await client.call_tool("npc_capabilities",{})).structured_content
            assert result["outcome"]=="upstream",result
            assert result["data"]["available"] is False
            action=dict(apiVersion="h5a.1",scope=scope,commandId=stamp+"-offline",type="action.request",actionKey="lookAround",issuedAtWallMs=int(time.time()*1000),ttlMs=60000)
            result=(await client.call_tool("npc_request_action",action)).structured_content
            assert result["code"]=="AUTHORITY_OFFLINE",result
        browser=await asyncio.create_subprocess_exec(NODE,str(OUT/"browser-driver.mjs"),env={**env,"MCP_TEST_BASE":base,"MCP_TEST_RUNTIME_TOKEN":runtime_secret},stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
        ready=json.loads(await asyncio.wait_for(browser.stdout.readline(),100));assert ready["ready"]
        async with Client(params) as client:
          async def call(name,args):
            r=await client.call_tool(name,args)
            if r.structured_content is None: raise AssertionError(r.model_dump(by_alias=True,mode="json"))
            return r.structured_content
          async def receipt(cid): return await call("npc_query_receipt",dict(commandId=cid,brokerEpoch=boot))
          async def wait(cid,status):
            for _ in range(150):
              r=await receipt(cid)
              if r.get("data",{}).get("status")==status:return r["data"]
              await asyncio.sleep(.025)
            raise AssertionError((cid,status,r))
          def action(suffix,ttl=60000):return dict(apiVersion="h5a.1",scope=scope,commandId=stamp+suffix,type="action.request",actionKey="lookAround",issuedAtWallMs=int(time.time()*1000),ttlMs=ttl)
          def goal(suffix,name,priority="task",ttl=60000):
            a=action(suffix,ttl);a.pop("actionKey");return a|dict(type="goal.request",goal=name,priorityClass=priority,onConflict="replace")
          def cancel(suffix,target,kind):return dict(apiVersion="h5a.1",scope=scope,commandId=stamp+suffix,type="cancel",target=dict(kind=kind,commandId=target))
          a=action("-single");r=await call("npc_request_action",a);assert r["outcome"]=="upstream",r
          evidence["checks"]["accepted"]=await wait(a["commandId"],"accepted")
          await command("step",seconds=.1);started=await wait(a["commandId"],"started");evidence["checks"]["started"]=started
          await command("step",seconds=1.6);terminal=await wait(a["commandId"],"succeeded");evidence["checks"]["terminal"]=terminal
          assert (terminal["actionId"],terminal["attemptId"])==(started["actionId"],started["attemptId"])
          assert terminal["terminal"]["outcome"]=="success"
          diag=await command("diagnostics");starts=diag["diagnostics"]["runtime"]["stats"]["actionsStarted"]
          assert (await call("npc_request_action",a))["data"]==terminal
          assert (await call("npc_request_action",a|{"ttlMs":50000}))["code"]=="COMMAND_CONFLICT"
          assert (await command("diagnostics"))["diagnostics"]["runtime"]["stats"]["actionsStarted"]==starts
          assert (await call("npc_request_action",action("-expired")|{"issuedAtWallMs":1}))["code"]=="TTL_EXPIRED"
          assert (await call("npc_request_action",action("-scope")|{"scope":scope|{"actorId":"other"}}))["code"]=="FORBIDDEN_SCOPE"
          assert (await call("npc_request_action",action("-stale")|{"scope":scope|{"authorityEpoch":"old"}}))["code"]=="STALE_AUTHORITY_EPOCH"
          seq=0
          def fact(kind,data,**ids):
            nonlocal seq
            seq+=1
            return dict(specVersion="1.0",source="integration:mcp",sourceEpoch=stamp+"-source",sequence=seq,eventId=stamp+f"-event-{seq}",worldId=scope["worldId"],actorId="harness-observation",sessionId=stamp,occurredAt=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),type=kind,data=data,**ids)
          batch=dict(apiVersion="h5a.1",scope=scope,batchId=stamp+"-working",events=[fact("presence.heartbeat",dict(status="alive")),fact("run.started",{},runId=stamp+"-run"),fact("tool.started",dict(toolCallId=stamp+"-tool",activityClass="coding"),runId=stamp+"-run")])
          r=await call("npc_publish_observations",batch);assert r["outcome"]=="upstream",r
          await command("step",seconds=1.8)
          snap=(await call("npc_snapshot",dict(brokerEpoch=boot)))["data"]
          assert snap["runtimeLastKnown"]["data"]["observation"]["state"]=="working"
          assert snap["actual"]["goalId"]=="converse";assert snap["actual"]["posture"]=="standing"
          evidence["checks"]["workingStandingPlaceholder"]=snap
          idle=goal("-idle","idle");await call("npc_request_goal",idle);await wait(idle["commandId"],"accepted");await command("step",seconds=.2)
          evidence["checks"]["maintaining"]=await wait(idle["commandId"],"maintaining")
          ci=cancel("-cancel-idle",idle["commandId"],"goal");await call("npc_cancel",ci);await command("step",seconds=.3);await wait(ci["commandId"],"settled")
          # manual true is explicit local policy, not granted by MCP request itself.
          manual=goal("-manual","lookAround","manual");await call("npc_request_goal",manual);await wait(manual["commandId"],"accepted");await command("step",seconds=.1)
          manual_started=await wait(manual["commandId"],"started")
          task=goal("-task","idle");await call("npc_request_goal",task);refused=await wait(task["commandId"],"rejected");assert refused["reason"]=="MANUAL_PRIORITY"
          assert (await receipt(manual["commandId"]))["data"]["attemptId"]==manual_started["attemptId"]
          evidence["checks"]["manualPriority"]=dict(manual=manual_started,task=refused)
          cm=cancel("-cancel-manual",manual["commandId"],"goal");await call("npc_cancel",cm);await wait(cm["commandId"],"requested");await command("step",seconds=.8)
          withdrawn=await wait(manual["commandId"],"withdrawn");assert any(t["attemptId"]==manual_started["attemptId"] and t["outcome"]=="cancelled" for t in withdrawn["attempts"])
          evidence["checks"]["safeExitGoal"]=await wait(cm["commandId"],"settled")
          # Running action cancellation and duplicate original ID.
          b=action("-cancel-running");await call("npc_request_action",b);await wait(b["commandId"],"accepted");await command("step",seconds=.1);bs=await wait(b["commandId"],"started")
          cb=cancel("-cancel-single",b["commandId"],"action");await call("npc_cancel",cb);await wait(cb["commandId"],"requested");await command("step",seconds=.8)
          bt=await wait(b["commandId"],"cancelled");assert bt["attemptId"]==bs["attemptId"]
          evidence["checks"]["safeExitAction"]=await wait(cb["commandId"],"settled")
          assert (await call("npc_cancel",cb))["data"]==evidence["checks"]["safeExitAction"]
          ttl=goal("-ttl","idle",ttl=1200);await call("npc_request_goal",ttl);await wait(ttl["commandId"],"maintaining");await asyncio.sleep(1.3)
          evidence["checks"]["ttlWithdrawn"]=await wait(ttl["commandId"],"withdrawn")
          assert (await call("npc_request_goal",ttl))["data"]==evidence["checks"]["ttlWithdrawn"]
          # Current same data via MCP, direct H5 read and snapshot command projection.
          final=(await call("npc_snapshot",dict(brokerEpoch=boot)))["data"]
          assert final==await direct("snapshot?worldId=apartment-v3&actorId=npc-a&brokerEpoch="+boot)
          for cid in [a["commandId"],b["commandId"],cb["commandId"],manual["commandId"],ttl["commandId"]]:
            value=(await receipt(cid))["data"];assert value==await direct("commands/"+cid+"?brokerEpoch="+boot)
            assert next(row["result"] for row in final["commands"] if row["commandId"]==cid)==value
          evidence["checks"]["consistentSnapshot"]=final
          # Closing MCP client does not request domain cancellation.
          active=goal("-survive-mcp","idle");await call("npc_request_goal",active);await wait(active["commandId"],"maintaining")
        async with Client(params) as client:
          r=(await client.call_tool("npc_query_receipt",dict(commandId=active["commandId"],brokerEpoch=boot))).structured_content
          assert r["data"]["status"]=="maintaining",r
          evidence["checks"]["mcpReconnectNoDomainCancel"]=r
          # Browser authority loss: latest goal is unknown, not false success.
          await command("disconnect");await asyncio.sleep(.2)
          r=(await client.call_tool("npc_query_receipt",dict(commandId=active["commandId"],brokerEpoch=boot))).structured_content
          assert r["data"]["delivery"]=="unknown" and r["data"]["execution"] is None,r
          evidence["checks"]["offlineUnknown"]=r
          snapshot=(await client.call_tool("npc_snapshot",dict(brokerEpoch=boot))).structured_content["data"]
          assert snapshot["freshness"]=="unknown" and snapshot["actual"]["posture"]=="unknown"
          assert (await client.call_tool("npc_capabilities",{})).structured_content["data"]["quarantine"] is True
          evidence["checks"]["offlineSnapshot"]=snapshot
        evidence["browserFinal"]=await command("diagnostics")
        evidence["status"]="ready_for_parent_review"
      except BaseException:
        evidence["failure"]=traceback.format_exc();raise
      finally:
        if browser:
          if browser.returncode is None:
            browser.stdin.write(b'{"op":"close"}\n');await browser.stdin.drain()
            try:await asyncio.wait_for(browser.wait(),10)
            except TimeoutError:browser.terminate();await browser.wait()
          evidence["browserExit"]=browser.returncode
          evidence["browserStderr"]=(await browser.stderr.read()).decode()[-5000:]
        if service:
          evidence["serviceCmdline"]=Path(f"/proc/{service.pid}/cmdline").read_bytes().replace(b"\0",b" ").decode() if service.returncode is None else "already exited"
          if service.returncode is None:service.terminate();await asyncio.wait_for(service.wait(),10)
          evidence["serviceExit"]=service.returncode
          # metadata-only H5 trace, but still scrub secrets before persisting.
          evidence["serviceLog"]=(await service.stderr.read()).decode()[-12000:]
        try:await http.get(base+"/api/h5a/capabilities");evidence["listeningAfter"]=True
        except httpx.HTTPError:evidence["listeningAfter"]=False
        for folder in [ROOT/"packages/npc-mcp/src",ROOT/"packages/npc-mcp/tests",OUT,ROOT/"tools/npc-v2/hardening/H5a"]:
          for p in folder.rglob("*"):
            if p.is_file() and p.suffix in (".py",".ts",".mjs",".json") and not any(x in p.parts for x in ["__pycache__","evidence"]):evidence["sources"][str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
        text=json.dumps(evidence,ensure_ascii=False,indent=2).replace(secret,"[REDACTED]").replace(runtime_secret,"[REDACTED]")
        path=OUT/"evidence"/(stamp+".json");path.parent.mkdir(exist_ok=True);path.write_text(text+"\n")
        print(json.dumps(dict(path=str(path),status=evidence["status"],failure=evidence.get("failure"))))

if __name__=="__main__": asyncio.run(run())
