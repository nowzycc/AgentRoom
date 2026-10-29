"""Bounded SSE reader on the standard httpx-sse parser; no hand-built protocol, no queue.

Single GET per stream. The standard EventSource/SSEDecoder parses frames; this module only
adds transport-level byte bounds (thin bounded stream wrapper), envelope schema/scope/epoch
validation and explicit error classification. resync_required is a terminating control
event: it is schema/scope/type validated, then yielded and the stream stops; the caller
must re-snapshot, never fake recovery. A legal resync may name the CURRENT boot while an
older boot was requested, so requested-epoch equality is enforced only on ordinary events.
The parser Response is built WITHOUT the transport Content-Encoding/Content-Length headers:
aiter_bytes() already yields decompressed bytes, and the byte bound applies post-decompression.
"""
import json
import httpx
from httpx_sse import EventSource, SSEError
from .config import HarnessConfig
from .schemas import definition, valid

RESYNC = "resync_required"
_STREAM_EVENT = definition("brokerStreamEvent")


class HarnessStreamError(Exception):
    def __init__(self, status: int, code: str):
        self.status, self.code = status, code
        super().__init__(code)


def _sanitize(code) -> str:
    if not isinstance(code, str) or not code or any(ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789" for ch in code):
        return "UPSTREAM_HTTP_ERROR"
    return code


async def _read_bounded(response: httpx.Response, limit: int) -> bytes | None:
    """Read a response body up to limit bytes; None means the body exceeded the cap."""
    buf = bytearray()
    async for chunk in response.aiter_bytes():
        buf.extend(chunk)
        if len(buf) > limit:
            return None
    return bytes(buf)


class _BoundedByteStream(httpx.AsyncByteStream):
    """Thin transport-level cap around an upstream byte stream; protocol parsing stays in httpx-sse.

    The source is response.aiter_bytes() (already content-decoded), so the cap counts
    decompressed bytes.
    """

    def __init__(self, source, limit: int):
        self._source, self._limit, self._used = source, limit, 0

    async def __aiter__(self):
        async for chunk in self._source:
            self._used += len(chunk)
            if self._used > self._limit:
                raise HarnessStreamError(200, "UPSTREAM_STREAM_TOO_LARGE") from None
            yield chunk


async def stream_events(config: HarnessConfig, *, broker_epoch: str, after: str = "",
                        last_event_id: str | None = None, max_events: int | None = None,
                        read_timeout: float | None = None):
    """Yield dict(kind='event',id,event,data) rows with validated brokerStreamEvent envelopes.

    Last-Event-ID header wins over after (server contract). sse.id is asserted equal to the
    envelope cursor. Invalid JSON/schema/type/scope (any frame) or epoch/cursor/id mismatch
    (ordinary events) aborts the stream with a classified HarnessStreamError instead of
    yielding unvalidated data. max_events must be a positive integer and read_timeout a
    positive number; invalid values are rejected outright.
    """
    if max_events is not None and (isinstance(max_events, bool) or not isinstance(max_events, int) or max_events < 1):
        raise ValueError("max_events must be a positive integer")
    if read_timeout is not None and (isinstance(read_timeout, bool)
                                     or not isinstance(read_timeout, (int, float)) or read_timeout <= 0):
        raise ValueError("read_timeout must be a positive number")
    params = dict(worldId=config.world_id, actorId=config.actor_id, brokerEpoch=broker_epoch)
    if last_event_id is None:
        params["after"] = after
    headers = {"Authorization": "Bearer " + config.token, "Accept": "text/event-stream"}
    if last_event_id is not None:
        headers["Last-Event-ID"] = last_event_id
    timeout = httpx.Timeout(config.timeout_seconds, read=read_timeout if read_timeout is not None else 30.0)
    count = 0
    async with httpx.AsyncClient(trust_env=False, follow_redirects=False, timeout=timeout) as client:
        request = client.build_request("GET", config.base_url + "/api/h5a/events", params=params, headers=headers)
        response = await client.send(request, stream=True)
        try:
            if response.is_redirect:
                raise HarnessStreamError(response.status_code, "UPSTREAM_REDIRECT")
            if not response.is_success:
                body = await _read_bounded(response, config.max_response_bytes)
                code = "UPSTREAM_HTTP_ERROR"
                if body is not None:
                    try:
                        code = _sanitize(json.loads(body).get("code", ""))
                    except (ValueError, AttributeError):
                        code = "UPSTREAM_HTTP_ERROR"
                raise HarnessStreamError(response.status_code, code)
            if "text/event-stream" not in response.headers.get("content-type", ""):
                raise HarnessStreamError(response.status_code, "UPSTREAM_NOT_EVENT_STREAM")
            # Strip transport framing headers: the wrapped stream yields DECOMPRESSED bytes
            # (aiter_bytes decodes Content-Encoding), so keeping the header would make the
            # parser gunzip a second time; Content-Length refers to compressed bytes.
            headers = [(k, v) for k, v in response.headers.items()
                       if k.lower() not in ("content-encoding", "content-length")]
            bounded = httpx.Response(response.status_code, headers=headers,
                                     stream=_BoundedByteStream(response.aiter_bytes(), config.max_stream_bytes))
            try:
                async for sse in EventSource(bounded).aiter_sse():
                    try:
                        envelope = json.loads(sse.data)
                    except ValueError:
                        envelope = None
                    # Every frame (control or data) must be schema-valid JSON with a matching
                    # SSE event type and the bound world/actor; failures never leak body text.
                    if not isinstance(envelope, dict) or not valid(_STREAM_EVENT, envelope) \
                            or sse.event != envelope["type"]:
                        raise HarnessStreamError(200, "UPSTREAM_INVALID_EVENT")
                    scope = envelope["scope"]
                    if (scope["worldId"], scope["actorId"]) != (config.world_id, config.actor_id):
                        raise HarnessStreamError(200, "FORBIDDEN_SCOPE")
                    if sse.event == RESYNC:
                        # Terminating control. A legal resync may carry the CURRENT boot while
                        # an older boot was requested, so brokerEpoch is deliberately not
                        # compared against the requested epoch here. Yield and stop; the
                        # caller must re-snapshot against the announced boot.
                        yield dict(kind="resync_required", data=envelope["data"])
                        return
                    # Ordinary events: strict epoch, cursor and SSE id identity; unknown types
                    # are already rejected by the schema const above.
                    if envelope["brokerEpoch"] != broker_epoch:
                        raise HarnessStreamError(200, "UPSTREAM_EPOCH_MISMATCH")
                    if not sse.id or sse.id != envelope["cursor"]:
                        raise HarnessStreamError(200, "UPSTREAM_INVALID_EVENT")
                    yield dict(kind="event", id=sse.id, event=sse.event, data=envelope)
                    count += 1
                    if max_events is not None and count >= max_events:
                        return
            except SSEError:
                raise HarnessStreamError(200, "UPSTREAM_HTTP_ERROR") from None
        finally:
            await response.aclose()
