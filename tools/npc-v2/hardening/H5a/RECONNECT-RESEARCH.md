# H5a.2 upstream close/lease research

Read installed official implementations: Starlette 1.3.1 WebSocket.receive/send/close; websockets 16.0 Connection.close. Also fetched official docs (curl after extract service 403):
- https://starlette.dev/websockets/
- https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html

Starlette receive_text raises WebSocketDisconnect; send wraps OSError into WebSocketDisconnect(1006). Its close delegates to state-checked ASGI send, not an idempotent NPC shutdown. Do not send another close after a received disconnect. Websockets close is idempotent and waits for transport handshake/termination; that only closes transport, not executor safe-exit. Cancelled recv is safe, cancelled send discouraged. Retain Starlette/AnyIO/Uvicorn existing APIs, no custom wire transport or retry layer. Browser close must fence admission immediately rather than await broker confirmation; a delayed grant must not reactivate stopped adapter. Broker lease expiry quarantines, never promotes a second runtime. No dependency/license modifications.
