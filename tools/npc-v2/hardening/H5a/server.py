"""Independent loopback ASGI service; no NPC motion/state authority here."""
import json
import secrets
import hashlib
import logging
from pathlib import Path
import anyio
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, FileResponse, Response
from starlette.routing import Route, WebSocketRoute, Mount
from starlette.staticfiles import StaticFiles
from starlette.websockets import WebSocket, WebSocketDisconnect
from broker import Broker
from config import Config, ROOT
from protocol import Document, Rejected, parse
from read_api import read_response


def trace(hop: str, *, correlation: str = "", **fields: str | bool) -> None:
    """Allowlisted hop metadata only; never log credentials or wire payloads."""
    logging.getLogger("h5a.trace").warning(json.dumps(dict(hop=hop, correlation=hashlib.sha256(correlation.encode()).hexdigest()[:16], **fields)))


def create_app(*, testing: bool = False) -> Starlette:
    config = Config('http://testserver', 'runtime-test', 'harness-test', 'runtime-test') if testing else Config.load()
    broker = Broker(config)
    runtime_sessions: set[str] = set()
    sockets: list[WebSocket] = []
    lock = anyio.Lock()

    def authorized(request: Request) -> bool:
        return secrets.compare_digest(request.headers.get('authorization', ''), 'Bearer ' + config.harness_token)

    async def body(request: Request) -> Document:
        if request.headers.get('content-type', '').split(';')[0] != 'application/json':
            raise Rejected('INVALID_REQUEST')
        chunks = bytearray()
        async for chunk in request.stream():
            chunks.extend(chunk)
            if len(chunks) > 65536:
                raise Rejected('PAYLOAD_TOO_LARGE', 413)
        try:
            value = json.loads(chunks, parse_constant=lambda _: None)
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise Rejected('INVALID_REQUEST') from None
        if not isinstance(value, dict):
            raise Rejected('INVALID_REQUEST')
        return value

    async def pair(request: Request) -> JSONResponse:
        if request.headers.get('origin') != config.origin or not secrets.compare_digest(request.headers.get('authorization', ''), 'Bearer ' + config.runtime_token):
            return JSONResponse(Rejected('UNAUTHORIZED', 401).body(), 401)
        if runtime_sessions:
            return JSONResponse(Rejected('AUTHORITY_BUSY', 409).body(), 409)
        session = secrets.token_urlsafe(32)
        runtime_sessions.add(session)
        response = JSONResponse(dict(runtimeInstanceId=config.runtime_id, worldId=config.world_id, actorId=config.actor_id))
        response.set_cookie('h5_runtime', session, httponly=True, samesite='strict', path='/api/h5a', max_age=3600)
        return response

    async def http(request: Request) -> Response:
        try:
            if not authorized(request):
                raise Rejected('UNAUTHORIZED', 401)
            origin = request.headers.get('origin')
            if origin is not None and origin != config.origin:
                raise Rejected('FORBIDDEN_SCOPE', 403)
            path = request.path_params.get('path', '')
            if request.method == 'GET' and path in ('snapshot', 'events'):
                return await read_response(request, broker, lock)
            async with lock:
                match (request.method, path):
                    case ('GET', 'capabilities'):
                        return JSONResponse(dict(apiVersion='h5a.1', scope=broker.scope, available=broker.online,
                            singleActions=[dict(actionKey='lookAround', posture='standing', candidate=None, resourceDependencies=[], versionDependencies=[], channels=['gaze'])],
                            goals=['converse', 'lookAround', 'idle'], singleLedgerCapacity=256, persistence='memory-only', implemented=['commands', 'events/batch', 'status', 'runtime', 'snapshot', 'events/SSE', 'goal.request', 'cancel'],
                            unsupported=['reconnect', 'takeover'], brokerEpoch=broker.boot,
                            recovery='close-old-pages-confirm-quiescent-restart-new-epoch', quarantine=broker.quarantined))
                    case ('GET', 'status'):
                        if broker.snapshot is None:
                            raise Rejected('AUTHORITY_OFFLINE', 503)
                        return JSONResponse(broker.snapshot | {'connection': 'online' if broker.online else 'offline'})
                    case ('POST', 'commands') | ('POST', 'events/batch') | ('POST', 'cancel'):
                        payload = await body(request)
                        batch = path == 'events/batch'
                        # Validate structure first even for unsupported action, then return the semantic error.
                        if not batch and payload.get('type') == 'action.request' and payload.get('actionKey') != 'lookAround':
                            probe = payload | {'actionKey': 'lookAround'}
                            parse('command', probe)
                            raise Rejected('UNSUPPORTED_ACTION', 422)
                        if not batch and payload.get('type') == 'goal.request':
                            if payload.get('priorityClass') not in ('task', 'manual'):
                                parse('command', payload | {'priorityClass': 'task', 'goal': 'idle'})
                                raise Rejected('FORBIDDEN_SCOPE', 403)
                            if payload.get('goal') not in ('converse', 'lookAround', 'idle'):
                                parse('command', payload | {'goal': 'idle'})
                                raise Rejected('UNSUPPORTED_GOAL', 422)
                        payload = parse('eventBatch' if batch else 'cancel' if path == 'cancel' else 'command', payload)
                        entry, fresh = broker.submit(payload, batch=batch)
                        trace('http.submit', correlation=entry.delivery_id, fresh=fresh, attached=broker.online)
                        if fresh:
                            try:
                                with anyio.fail_after(1):
                                    await sockets[0].send_json(dict(apiVersion='h5a.1', type='dispatch', scope=broker.scope, deliveryId=entry.delivery_id, operation=payload))
                                    trace('ws.dispatch.sent', correlation=entry.delivery_id)
                            except (WebSocketDisconnect, OSError, TimeoutError, RuntimeError) as error:
                                trace('ws.dispatch.failed', correlation=entry.delivery_id, error=type(error).__name__)
                                broker.disconnect()
                        return JSONResponse(broker.delivery(entry), 200 if entry.receipt else 202)
                    case ('GET', name) if name.startswith('commands/'):
                        if request.query_params.get('brokerEpoch', broker.boot) != broker.boot:
                            raise Rejected('RESYNC_REQUIRED', 409)
                        entry = broker.commands.get(name[len('commands/'):])
                        if entry is None:
                            raise Rejected('UNKNOWN_COMMAND', 404)
                        return JSONResponse(broker.delivery(entry))
                    case _:
                        raise Rejected('UNSUPPORTED_ENDPOINT', 501)
        except Rejected as error:
            headers = {'Retry-After': '1'} if error.status == 429 else None
            return JSONResponse(error.body(), error.status, headers=headers)

    async def runtime(ws: WebSocket) -> None:
        if ws.headers.get('origin') != config.origin or ws.cookies.get('h5_runtime') not in runtime_sessions:
            await ws.close(1008)
            return
        await ws.accept()
        owner = False
        try:
            with anyio.fail_after(5):
                first = await ws.receive_text()
            if len(first.encode()) > 65536:
                raise Rejected('PAYLOAD_TOO_LARGE', 413)
            async with lock:
                grant = broker.attach(parse('hello', json.loads(first)))
                connection_id = broker.connection_id
                sockets.append(ws)
                owner = True
                await ws.send_json(grant)
            while True:
                with anyio.fail_after(5):
                    text = await ws.receive_text()
                if len(text.encode()) > 65536:
                    raise Rejected('PAYLOAD_TOO_LARGE', 413)
                message = json.loads(text)
                try:
                    async with lock:
                        match message.get('type'):
                            case 'renew':
                                message = parse('renew', message)
                                broker.fence(message['scope'])
                                if not broker.online or connection_id != broker.connection_id or message['connectionId'] != connection_id or message['runtimeInstanceId'] != config.runtime_id:
                                    raise Rejected('AUTHORITY_OFFLINE', 503)
                                await ws.send_json(broker.grant())
                            case 'report':
                                delivery_id = message.get('deliveryId')
                                if delivery_id is not None:
                                    trace('report.received', correlation=str(delivery_id))
                                acknowledgement = broker.report(parse('browserReport', message), connection_id=connection_id)
                                if delivery_id is not None:
                                    trace('broker.receipt', correlation=str(delivery_id), status=message['data'].get('status', 'batch'))
                                await ws.send_json(acknowledgement)
                            case _:
                                raise Rejected('INVALID_REQUEST')
                except Rejected as error:
                    trace('report.rejected', code=error.code)
                    await ws.send_json(error.body())
        except Rejected as error:
            await ws.send_json(error.body())
            await ws.close(1008)
        except WebSocketDisconnect:
            # Peer loss is not a safe-exit acknowledgement; don't send after disconnect.
            pass
        except (TimeoutError, json.JSONDecodeError):
            if ws.application_state.name == 'CONNECTED':
                await ws.close(1008)
        finally:
            if owner:
                with anyio.CancelScope(shield=True):
                    async with lock:
                        broker.disconnect()
                        sockets.remove(ws)

    async def browser_policy(request: Request) -> JSONResponse:
        # Configuration projection only; preserve existing policy and execution semantics.
        path = ROOT / 'tools/layout-model-v3/web/harness-preview/policy.json'
        policy = json.loads(path.read_text())
        return JSONResponse(policy | dict(source=config.source, sessionId=config.session_id,
            observerId=config.observer_id, actorId=config.actor_id))

    async def index(request: Request) -> FileResponse:
        return FileResponse(Path(__file__).parent / 'index.html')

    app = Starlette(routes=[Route('/', index), Route('/api/h5a/pair', pair, methods=['POST']),
        WebSocketRoute('/api/h5a/runtime', runtime), Route('/api/h5a/{path:path}', http, methods=['GET', 'POST', 'OPTIONS']),
        Mount('/h5', StaticFiles(directory=Path(__file__).parent / 'dist')),
        Route('/room/web/harness-preview/policy.json', browser_policy),
        Mount('/room', StaticFiles(directory=ROOT / 'tools/layout-model-v3', follow_symlink=True))])
    app.state.broker = broker
    return app
