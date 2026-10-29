"""Bounded correlation broker, deliberately not an NPC executor or reducer."""
from dataclasses import dataclass
import secrets
import time
from config import Config
from protocol import Document, Json, Rejected, canonical, parse
from journal import Journal
from receipts import settled, correlate

@dataclass(slots=True)
class Entry:
    """Mutable transport metadata; runtime alone produces the receipt."""
    payload: Document
    delivery_id: str
    fingerprint: str
    receipt: Document | None = None

class Broker:
    def __init__(self, config: Config):
        self.config = config
        self.boot = 'broker-' + secrets.token_hex(12)
        self.scope: Document = dict(worldId=config.world_id, actorId=config.actor_id, authorityEpoch=self.boot + '-1')
        self.journal = Journal(self.boot, self.scope)
        self.snapshot_received_at: int | None = None
        self.connection_id = 'connection-' + secrets.token_hex(12)
        self.attached = False
        self.quarantined = False
        self.deadline = 0.0
        self.commands: dict[str, Entry] = {}
        self.batches: dict[str, Entry] = {}
        self.reports: dict[str, tuple[str, Document]] = {}
        self.report_seq = -1
        self.cursor_seq = 0
        self.snapshot: Document | None = None
        self.tokens = 40.0
        self.token_time = time.monotonic()

    @property
    def online(self) -> bool:
        if self.attached and time.monotonic() >= self.deadline:
            self.disconnect()
        return self.attached and not self.quarantined

    def disconnect(self) -> None:
        if self.quarantined:
            return
        self.attached = False
        self.quarantined = True
        self.journal.publish('connection', dict(connection='offline', freshness='unknown'))

    def fence(self, scope: Json) -> None:
        if not isinstance(scope, dict) or scope.get('worldId') != self.config.world_id or scope.get('actorId') != self.config.actor_id:
            raise Rejected('FORBIDDEN_SCOPE', 403)
        if scope.get('authorityEpoch') != self.scope['authorityEpoch']:
            raise Rejected('STALE_AUTHORITY_EPOCH', 409)

    def attach(self, hello: Document) -> Document:
        if self.online:
            raise Rejected('AUTHORITY_BUSY', 409)
        if self.quarantined:
            raise Rejected('RESYNC_REQUIRED', 409)
        if (hello['worldId'], hello['actorId'], hello['runtimeInstanceId']) != (self.config.world_id, self.config.actor_id, self.config.runtime_id):
            raise Rejected('FORBIDDEN_SCOPE', 403)
        self.attached = True
        self.journal.publish('connection', dict(connection='online', freshness='unknown'))
        return self.grant()

    def grant(self) -> Document:
        self.deadline = time.monotonic() + 5
        return dict(apiVersion='h5a.1', type='grant', scope=self.scope, connectionId=self.connection_id, leaseMs=5000, heartbeatMs=1000)

    def submit(self, payload: Document, *, batch: bool) -> tuple[Entry, bool]:
        self.fence(payload['scope'])
        control = not batch and payload.get('type') == 'cancel'
        ledger = self.batches if batch else self.commands
        operation_id = str(payload['batchId' if batch else 'commandId'])
        fingerprint = canonical(payload)
        existing = ledger.get(operation_id)
        if existing:
            if existing.fingerprint != fingerprint:
                raise Rejected('COMMAND_CONFLICT', 409)
            return existing, False
        if not self.online:
            raise Rejected('AUTHORITY_OFFLINE', 503)
        now = int(time.time() * 1000)
        if control:
            target = payload['target']
            original = self.commands.get(target['commandId'])
            if original is None:
                raise Rejected('UNKNOWN_COMMAND', 404)
            if original.payload['type'] != target['kind'] + '.request':
                raise Rejected('TARGET_KIND_MISMATCH', 409)
        elif not batch:
            issued, ttl = payload['issuedAtWallMs'], payload['ttlMs']
            if not isinstance(issued, int) or not isinstance(ttl, int) or issued > now or issued + ttl > 9007199254740991:
                raise Rejected('INVALID_ACTION_TIME', 422)
            if issued + ttl <= now:
                raise Rejected('TTL_EXPIRED', 410)
        else:
            for event in payload['events']:
                if (event['worldId'], event['actorId'], event['source'], event['sessionId']) != (self.config.world_id, self.config.observer_id, self.config.source, self.config.session_id):
                    raise Rejected('FORBIDDEN_SCOPE', 403)
        controls = sum(row.payload.get('type') == 'cancel' for row in ledger.values())
        if (controls if control else len(ledger) - controls) >= 256:
            raise Rejected('COMMAND_LEDGER_FULL', 503)
        tick = time.monotonic()
        self.tokens = min(40.0, self.tokens + (tick - self.token_time) * 20)
        self.token_time = tick
        if not control:
            if self.tokens < 1:
                raise Rejected('RATE_LIMITED', 429)
            self.tokens -= 1
        entry = Entry(payload, 'delivery-' + secrets.token_hex(12), fingerprint)
        ledger[operation_id] = entry
        self.journal.publish('delivery', self.delivery(entry))
        return entry, True

    def delivery(self, entry: Entry, *, observed_online: bool | None = None) -> Document:
        online = self.online if observed_online is None else observed_online
        confirmed = entry.receipt is not None and ('batchId' in entry.receipt or settled(entry.receipt))
        if entry.receipt is not None and (online or confirmed):
            return entry.receipt
        payload = entry.payload
        delivery = 'pending' if online else 'unknown'
        if 'batchId' in payload:
            return dict(apiVersion='h5a.1', scope=self.scope, batchId=payload['batchId'], delivery=delivery, observation=None)
        result = dict(apiVersion='h5a.1', scope=self.scope, commandId=payload['commandId'], delivery=delivery, execution=None)
        if entry.receipt is not None:
            result['lastReceipt'] = entry.receipt
        return result

    def report(self, message: Document, *, connection_id: str) -> Document:
        self.fence(message['scope'])
        if not self.online or connection_id != self.connection_id or message['runtimeInstanceId'] != self.config.runtime_id:
            raise Rejected('AUTHORITY_OFFLINE', 503)
        report_id = str(message['reportId'])
        fingerprint = canonical(message)
        if report_id in self.reports:
            previous, ack = self.reports[report_id]
            if previous != fingerprint:
                raise Rejected('COMMAND_CONFLICT', 409)
            return ack
        if message['reportSeq'] <= self.report_seq:
            raise Rejected('INVALID_REQUEST')
        data = message['data']
        if not isinstance(data, dict):
            raise Rejected('INVALID_REQUEST')
        self.fence(data.get('scope'))
        delivery_id = message['deliveryId']
        if 'commandId' in data:
            entry = self.commands.get(data['commandId'])
            if entry is None or entry.delivery_id != delivery_id:
                raise Rejected('UNKNOWN_COMMAND', 404)
            correlate(entry.payload, entry.receipt, data)
            if entry.payload.get('type') == 'cancel' and data.get('targetReceipt') is not None:
                target = self.commands[entry.payload['target']['commandId']]
                if canonical(target.receipt) != canonical(data['targetReceipt']):
                    raise Rejected('COMMAND_CONFLICT', 409)
            entry.receipt = data
        elif 'batchId' in data:
            entry = self.batches.get(data['batchId'])
            if entry is None or entry.delivery_id != delivery_id:
                raise Rejected('UNKNOWN_COMMAND', 404)
            events = entry.payload['events']
            if len(data['results']) != len(events) or any(row['index'] != i or row['eventId'] != events[i]['eventId'] for i, row in enumerate(data['results'])):
                raise Rejected('INVALID_REQUEST')
            entry.receipt = data
        elif 'observation' in data:
            if data['runtimeInstanceId'] != self.config.runtime_id or delivery_id is not None:
                raise Rejected('INVALID_REQUEST')
            self.snapshot = data
            self.snapshot_received_at = int(time.time() * 1000)
        else:
            raise Rejected('INVALID_REQUEST')
        self.report_seq = message['reportSeq']
        kind = 'runtime_snapshot' if 'observation' in data else 'batch_receipt' if 'batchId' in data else 'receipt'
        cursor = self.journal.publish(kind, data)
        self.cursor_seq += 1  # Legacy diagnostic: number of unique accepted runtime reports.
        ack: Document = dict(apiVersion='h5a.1', type='report_ack', scope=self.scope, reportId=report_id, cursor=cursor)
        self.reports[report_id] = (fingerprint, ack)
        if len(self.reports) > 1024:
            del self.reports[next(iter(self.reports))]
        return ack
