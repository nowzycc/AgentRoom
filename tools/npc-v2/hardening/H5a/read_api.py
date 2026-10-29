"""Read-only broker projection and standard SSE adapter; no runtime execution."""
from collections.abc import AsyncIterator
from dataclasses import dataclass
import json
import anyio
from sse_starlette import EventSourceResponse, ServerSentEvent
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from broker import Broker
from protocol import Document, Rejected, canonical


@dataclass(frozen=True, slots=True)
class ReadQuery:
    cursor: str

    @classmethod
    def parse(cls, request: Request, broker: Broker) -> 'ReadQuery':
        query = request.query_params
        if query.get('worldId') != broker.config.world_id or query.get('actorId') != broker.config.actor_id:
            raise Rejected('FORBIDDEN_SCOPE', 403)
        if any(key not in {'worldId', 'actorId', 'brokerEpoch', 'after'} for key in query):
            raise Rejected('INVALID_REQUEST', 400)
        if any(len(query.getlist(key)) > 1 for key in query):
            raise Rejected('INVALID_REQUEST', 400)
        return cls(request.headers.get('last-event-id', query.get('after', '')))


def snapshot(broker: Broker) -> Document:
    online = broker.online
    last = broker.snapshot
    known: Document | None = None
    if last is not None:
        known = dict(data=json.loads(canonical(last)), receivedAtWallMs=broker.snapshot_received_at)
    actual: Document = dict(goalId=None, posture='unknown', actionId=None, attemptId=None, phase=None)
    if online and last is not None:
        actual = json.loads(canonical(last['actual']))
    return dict(apiVersion='h5a.1', brokerEpoch=broker.boot, scope=dict(broker.scope),
                cursor=broker.journal.cursor, runtimeInstanceId=broker.config.runtime_id,
                connection='online' if online else 'offline', freshness='last_known' if online and last is not None else 'unknown',
                actual=actual, runtimeLastKnown=known,
                commands=[dict(commandId=key, result=broker.delivery(entry, observed_online=online)) for key, entry in broker.commands.items()],
                batches=[dict(batchId=key, result=broker.delivery(entry, observed_online=online)) for key, entry in broker.batches.items()],
                receiptsComplete=True, historyComplete=False)


async def events(broker: Broker, lock: anyio.Lock, cursor: str) -> AsyncIterator[ServerSentEvent]:
    """Each reader advances its own cursor only; component cancels us on disconnect."""
    broker.journal.subscribers += 1
    try:
        yield ServerSentEvent(comment='h5a read stream')
        while True:
            try:
                async with lock:
                    broker.online  # Apply lease expiry to the read projection too.
                    row = broker.journal.next(cursor)
                    changed = broker.journal.changed
            except Rejected as error:
                if not cursor:
                    error = Rejected('RESYNC_REQUIRED', 409)
                envelope: Document = dict(apiVersion='h5a.1', brokerEpoch=broker.boot, scope=broker.scope,
                                          cursor=cursor or broker.journal.cursor, type='resync_required', data=error.body())
                yield ServerSentEvent(event='resync_required', data=canonical(envelope))
                return
            if row is None:
                await changed.wait()
            else:
                yield ServerSentEvent(id=row.cursor, event=row.event, data=row.data)
                cursor = row.cursor
    finally:
        broker.journal.subscribers -= 1


async def read_response(request: Request, broker: Broker, lock: anyio.Lock) -> Response:
    query = ReadQuery.parse(request, broker)
    epoch = request.query_params.get('brokerEpoch')
    if request.path_params['path'] == 'snapshot':
        if epoch is not None and epoch != broker.boot:
            raise Rejected('RESYNC_REQUIRED', 409)
        async with lock:
            return JSONResponse(snapshot(broker), headers={'Cache-Control': 'no-store'})
    # Stale/missing cursor gets a finite resync event, malformed input is HTTP 400.
    try:
        broker.journal.position(query.cursor)
    except Rejected as error:
        if query.cursor and error.code == 'INVALID_CURSOR':
            raise
    cursor = query.cursor if epoch == broker.boot else ''
    return EventSourceResponse(events(broker, lock, cursor), ping=15, send_timeout=5,
                               headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'})
