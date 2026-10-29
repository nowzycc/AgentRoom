"""Shared typed HTTP client; transport adapter only, preserves original domain receipts.

No MCP SDK import; no executor, reducer or timer. Write POSTs never auto-retry and never
change IDs; transport loss yields outcome=unknown with the original operation id.
Responses are read inside a stream context and byte-capped per decoded chunk: an oversized
upstream is terminated and closed immediately, never eagerly buffered. Success data is
correlated against the bound scope (authorityEpoch included) and the original operation id
before returning. Only an explicitly known broker rejection code with its matching HTTP
status is a definitive error; anything else on a write stays outcome=unknown (possibly
executed), never "not executed".
"""
import json
from urllib.parse import quote
import httpx
from .config import HarnessConfig
from .schemas import inputs, outputs, valid

_WRITE = ("npc_request_action", "npc_request_goal", "npc_publish_observations", "npc_cancel")
_PATH = {"npc_capabilities": "capabilities", "npc_snapshot": "snapshot",
         "npc_publish_observations": "events/batch", "npc_request_action": "commands",
         "npc_request_goal": "commands", "npc_cancel": "cancel"}
_PAYLOAD_LIMIT = 65536
# Deterministic broker rejections, keyed by the exact (code, HTTP status) pair actually
# raised by the H5a broker/server (protocol.py Rejected default status = 400). A plausible
# code alone is never enough: an unknown uppercase 5xx code, a sanitized body or a known
# code with a mismatched status must NOT claim a definitive decision.
_DEFINITIVE_REJECTIONS = {
    ("INVALID_REQUEST", 400), ("INVALID_CURSOR", 400), ("UNAUTHORIZED", 401),
    ("FORBIDDEN_SCOPE", 403), ("UNKNOWN_COMMAND", 404), ("PAYLOAD_TOO_LARGE", 413),
    ("COMMAND_CONFLICT", 409), ("RESYNC_REQUIRED", 409), ("AUTHORITY_BUSY", 409),
    ("TARGET_KIND_MISMATCH", 409), ("STALE_AUTHORITY_EPOCH", 409), ("TTL_EXPIRED", 410),
    ("UNSUPPORTED_ACTION", 422), ("UNSUPPORTED_GOAL", 422), ("INVALID_ACTION_TIME", 422),
    ("RATE_LIMITED", 429), ("UNSUPPORTED_ENDPOINT", 501),
    ("AUTHORITY_OFFLINE", 503), ("COMMAND_LEDGER_FULL", 503),
}
_UNKNOWN_HINT = ("write outcome unverifiable: this client holds no trusted brokerEpoch for "
                 "the original id; only a query against the command's ORIGINAL epoch (the one "
                 "in scope at acceptance) can settle it, a fresh boot's 404 proves nothing; "
                 "keep unknown and do not resend")


class _UpstreamBodyError(Exception):
    """Upstream body was not parseable JSON; carries no upstream bytes (no echo/leak)."""


class NpcHarnessClient:
    def __init__(self, config: HarnessConfig, transport=None):
        self.config = config
        self.transport = transport

    def error(self, code, operation=None, status=None, unknown=False):
        op = operation or {}
        cid = op.get("commandId", op.get("batchId"))
        epoch = op.get("brokerEpoch")
        if cid is not None and epoch:
            # A callable query hint: exactly the published npc_query_receipt input, id verbatim.
            query = dict(tool="npc_query_receipt", commandId=cid, brokerEpoch=epoch)
        else:
            # No trusted brokerEpoch here: query stays null; the caller must obtain one
            # explicitly. We never guess a boot epoch and never rewrite the original id.
            query = None
        result = dict(outcome="unknown" if unknown else "error", code=code, httpStatus=status,
                      operationId=cid, query=query)
        if unknown and query is None:
            result["detail"] = _UNKNOWN_HINT
        return result

    async def _bounded_json(self, response):
        """Stream-read the body, byte-capped per decoded chunk (None = cap exceeded).

        Always closes the response (finally), so an oversized upstream is terminated at once
        instead of being buffered to the end. JSON parse failure raises _UpstreamBodyError.
        """
        buf = bytearray()
        try:
            async for chunk in response.aiter_bytes():
                buf.extend(chunk)
                if len(buf) > self.config.max_response_bytes:
                    return None
        finally:
            await response.aclose()
        try:
            return json.loads(bytes(buf)) if buf else None
        except ValueError:
            raise _UpstreamBodyError from None

    async def call(self, name, args):
        if name not in inputs or not valid(inputs[name], args):
            return self.error("INVALID_REQUEST")
        c = self.config
        if "scope" in args and (args["scope"]["worldId"], args["scope"]["actorId"]) != (c.world_id, c.actor_id):
            return self.error("FORBIDDEN_SCOPE")
        if name == "npc_request_goal" and args["priorityClass"] == "manual" and not c.allow_manual:
            return self.error("FORBIDDEN_SCOPE")
        if name == "npc_publish_observations" and any(
                (e["worldId"], e["actorId"], e["source"], e["sessionId"])
                != (c.world_id, c.observer_id, c.source, c.session_id) for e in args["events"]):
            return self.error("FORBIDDEN_SCOPE")
        if len(json.dumps(args).encode()) > _PAYLOAD_LIMIT:
            return self.error("PAYLOAD_TOO_LARGE")
        write = name in _WRITE
        params = None
        if name == "npc_query_receipt":
            # IDs remain literal. Encoding cannot let an ID become query/path syntax.
            path = "commands/" + quote(args["commandId"], safe="")
            params = {"brokerEpoch": args["brokerEpoch"]}
        else:
            path = _PATH[name]
        if name == "npc_snapshot":
            params = dict(worldId=c.world_id, actorId=c.actor_id, brokerEpoch=args["brokerEpoch"])
        try:
            async with httpx.AsyncClient(transport=self.transport, trust_env=False, follow_redirects=False,
                                         timeout=c.timeout_seconds,
                                         headers={"Authorization": "Bearer " + c.token}) as client:
                request = client.build_request("POST" if write else "GET", c.base_url + "/api/h5a/" + path,
                                               params=params, json=args if write else None)
                # Streaming send: the body is consumed (and capped) only by _bounded_json below.
                response = await client.send(request, stream=True)
                try:
                    if response.is_redirect:
                        return self.error("UPSTREAM_REDIRECT", args, response.status_code, unknown=write)
                    if not response.is_success:
                        try:
                            body = await self._bounded_json(response)
                        except _UpstreamBodyError:
                            body = None
                        code = body.get("code", "") if isinstance(body, dict) else ""
                        # No arbitrary upstream body, exception, URL or token may enter results.
                        if not isinstance(code, str) or not code or any(
                                ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789" for ch in code):
                            code = "UPSTREAM_HTTP_ERROR"
                        # Definitive only for an explicitly known rejection code AND its matching
                        # HTTP status; everything else stays unknown on a write (possibly executed).
                        definitive = (code, response.status_code) in _DEFINITIVE_REJECTIONS
                        return self.error(code, args, response.status_code, unknown=write and not definitive)
                    try:
                        data = await self._bounded_json(response)
                    except _UpstreamBodyError:
                        data = None
                    result = dict(outcome="upstream", httpStatus=response.status_code, data=data)
                    if data is None or not valid(outputs[name], result):
                        return self.error("INVALID_UPSTREAM_RESPONSE", args, response.status_code, unknown=write)
                    # Success data must belong to this binding, carry the exact original scope
                    # (authorityEpoch included, never a substituted epoch) and the original id.
                    scope = data.get("scope") if isinstance(data, dict) else None
                    if isinstance(scope, dict):
                        if (scope.get("worldId"), scope.get("actorId")) != (c.world_id, c.actor_id):
                            return self.error("FORBIDDEN_SCOPE", args, response.status_code, unknown=write)
                        if "scope" in args and scope != args["scope"]:
                            return self.error("INVALID_UPSTREAM_RESPONSE", args, response.status_code, unknown=write)
                    if name == "npc_snapshot" and data.get("brokerEpoch") != args["brokerEpoch"]:
                        return self.error("INVALID_UPSTREAM_RESPONSE", args, response.status_code, unknown=write)
                    if "commandId" in data and "commandId" in args and data["commandId"] != args["commandId"]:
                        return self.error("INVALID_UPSTREAM_RESPONSE", args, response.status_code, unknown=write)
                    if name == "npc_publish_observations" and data.get("batchId") != args["batchId"]:
                        return self.error("INVALID_UPSTREAM_RESPONSE", args, response.status_code, unknown=write)
                    return result
                finally:
                    await response.aclose()
        except (httpx.HTTPError, ValueError):
            return self.error("UPSTREAM_UNAVAILABLE", args, unknown=write)
        # CancelledError intentionally propagates: MCP/caller cancellation is never domain cancel.
