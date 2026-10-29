"""Given/When/Then read journal tests; real network evidence is separate."""
import json
from pathlib import Path

import anyio
import pytest
from starlette.testclient import TestClient

from broker import Broker
from config import Config
from protocol import Rejected
from server import create_app
from read_api import snapshot as read_snapshot
from test_authority import bound, receipt_report


def test_snapshot_watermark_includes_intervening_report():
    # Given: the actual broker and a client snapshot before the report.
    broker, _ = bound()
    before = read_snapshot(broker)
    report = receipt_report(broker)
    # When: runtime reports between snapshot and subscription.
    ack = broker.report(report, connection_id=broker.connection_id)
    # Then: replay contains the report once and snapshot reflects the same cut.
    rows = broker.journal.after(before['cursor'])
    assert rows[-1].cursor == ack['cursor']
    assert json.loads(rows[-1].data)['data'] == report['data']
    current = read_snapshot(broker)
    assert current['cursor'] == ack['cursor']
    assert current['commands'][0]['result'] == report['data']


@pytest.mark.parametrize('cursor', ['', 'bad', '/1', 'broker-x/-1', 'broker-x/01', 'broker-x/1.0', 'broker-x/9007199254740992'])
def test_invalid_cursor_when_malformed(cursor):
    broker, _ = bound()
    # When / Then: parsing occurs before replay, never silently latest.
    with pytest.raises(Rejected, match='INVALID_CURSOR'):
        broker.journal.after(cursor)


def test_resync_when_old_future_or_evicted_cursor():
    broker, _ = bound()
    old = broker.journal.cursor
    broker.journal.capacity = 2
    for n in range(3):
        broker.journal.publish('delivery', {'n': n})
    # When / Then: all valid-shaped but unavailable positions require resync.
    for cursor in [old, 'broker-' + 'f' * 24 + '/0', broker.boot + '/999']:
        with pytest.raises(Rejected, match='RESYNC_REQUIRED'):
            broker.journal.after(cursor)
    assert len(broker.journal.events) == 2


def test_duplicate_report_preserves_cursor_and_order():
    broker, _ = bound()
    before = broker.journal.cursor
    report = receipt_report(broker)
    ack = broker.report(report, connection_id=broker.connection_id)
    # When: ACK loss causes retransmission.
    assert broker.report(report, connection_id=broker.connection_id) == ack
    # Then: one delivery and one report, strictly increasing cursor.
    rows = broker.journal.after(before)
    assert [r.event for r in rows] == ['delivery', 'receipt']
    assert len({r.cursor for r in rows}) == 2


def test_disconnected_snapshot_is_unknown_with_original_source_time():
    broker, _ = bound()
    fixture = json.loads((Path(__file__).parent.parent / 'H4-closeout/examples/valid/snapshot.json').read_text())
    fixture.update(scope=dict(broker.scope), runtimeInstanceId='runtime-test')
    report = dict(scope=dict(broker.scope), runtimeInstanceId='runtime-test', reportId='snapshot-a', reportSeq=1, deliveryId=None, data=fixture)
    broker.report(report, connection_id=broker.connection_id)
    # When: the transport disappears.
    broker.disconnect()
    snapshot = read_snapshot(broker)
    # Then: old posture is only last known, never current standing.
    assert snapshot['actual']['posture'] == 'unknown'
    assert snapshot['freshness'] == 'unknown'
    assert snapshot['runtimeLastKnown']['data']['capturedAtWallMs'] == fixture['capturedAtWallMs']
    assert snapshot['runtimeLastKnown']['receivedAtWallMs'] > 0


@pytest.mark.parametrize('path', ['snapshot', 'events'])
@pytest.mark.parametrize('headers,query,status', [
    ({}, '', 401),
    ({'Authorization': 'Bearer runtime-test'}, '', 401),
    ({'Authorization': 'Bearer harness-test', 'Origin': 'http://evil'}, '', 403),
    ({'Authorization': 'Bearer harness-test'}, '?worldId=other&actorId=npc-a', 403),
    ({'Authorization': 'Bearer harness-test'}, '', 403),
    ({'Authorization': 'Bearer harness-test'}, '?worldId=apartment-v3&actorId=npc-a&token=secret', 400),
])
def test_permissions_when_read_boundary(path, headers, query, status):
    # Given: existing static principal/config and no runtime authority needed.
    with TestClient(create_app(testing=True)) as client:
        # When: unauthorized or out-of-scope read is attempted.
        response = client.get('/api/h5a/' + path + query, headers=headers)
        # Then: denied before subscribing/disclosing snapshots.
        assert response.status_code == status


def test_clients_independent_slow_resync_and_cancel_cleanup():
    async def scenario():
        broker, _ = bound()
        lock = anyio.Lock()
        from read_api import events
        start = broker.journal.cursor
        a, b = events(broker, lock, start), events(broker, lock, start)
        # Given: initial comment flushes headers and starts each independent reader.
        await anext(a)
        await anext(b)
        broker.journal.publish('delivery', {'index': 1})
        first_a, first_b = await anext(a), await anext(b)
        assert first_a.id == first_b.id
        broker.journal.capacity = 2
        for n in range(3):
            broker.journal.publish('delivery', {'index': n + 2})
            await anext(a)
        # When: one reader lags outside retention; the fast one remains continuous.
        gap = await anext(b)
        # Then: explicit resync (no id) and close; disconnect frees active reader.
        assert gap.event == 'resync_required' and gap.id is None
        with pytest.raises(StopAsyncIteration):
            await anext(b)
        await a.aclose()
        assert broker.journal.subscribers == 0
    anyio.run(scenario)
