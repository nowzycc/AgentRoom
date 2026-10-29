"""Given/When/Then atomic read-cut and SSE cleanup tests."""
import anyio
import pytest
from starlette.testclient import TestClient
from protocol import parse
from read_api import snapshot, events
from server import create_app
from test_authority import bound, receipt_report


def test_atomic_snapshot_when_lease_crosses_during_projection(monkeypatch):
    # Given: a command and a clock that crosses the lease during snapshot assembly.
    broker, _ = bound()
    receipt_report(broker)
    calls = 0
    def clock():
        nonlocal calls
        calls += 1
        return broker.deadline - 1 if calls == 1 else broker.deadline
    monkeypatch.setattr('broker.time.monotonic', clock)
    # When: taking one read cut.
    value = snapshot(broker)
    # Then: no disconnected cursor combined with an online pending projection.
    assert value['connection'] == 'online'
    assert value['commands'][0]['result']['delivery'] == 'pending'
    assert not broker.quarantined


def test_cancelled_waiter_cleans_subscription_without_polling():
    async def scenario():
        # Given: an idle subscription inside a structured task group.
        broker, _ = bound()
        lock = anyio.Lock()
        started = anyio.Event()
        async def consume():
            async for event in events(broker, lock, broker.journal.cursor):
                if event.comment:
                    started.set()
        # When: the actual waiting generator is cancelled (same cleanup as peer loss).
        async with anyio.create_task_group() as group:
            group.start_soon(consume)
            await started.wait()
            group.cancel_scope.cancel()
        # Then: no surviving subscriber/task.
        assert broker.journal.subscribers == 0
    anyio.run(scenario)


@pytest.mark.parametrize('after,epoch,code', [('', None, 'RESYNC_REQUIRED'), ('broker-old/0', 'broker-old', 'RESYNC_REQUIRED'), ('FUTURE', 'CURRENT', 'RESYNC_REQUIRED')])
def test_resync_event_closes_when_cursor_unavailable(after, epoch, code):
    # Given: an authenticated read principal with fixed world/actor scope.
    with TestClient(create_app(testing=True)) as client:
        broker = client.app.state.broker
        if after == 'FUTURE':
            after = broker.boot + '/999'
        if epoch == 'CURRENT':
            epoch = broker.boot
        query = dict(worldId='apartment-v3', actorId='npc-a', after=after)
        if epoch:
            query['brokerEpoch'] = epoch
        # When: a syntactically missing or unavailable resume position is requested.
        response = client.get('/api/h5a/events', params=query, headers={'Authorization': 'Bearer harness-test'})
        # Then: finite standard SSE resync, never a quiet tail subscription.
        assert response.status_code == 200
        assert 'event: resync_required' in response.text
        assert '"code":"' + code + '"' in response.text
        assert '\nid:' not in response.text
        assert broker.journal.subscribers == 0


def test_read_projection_and_stream_match_explicit_schema():
    broker, _ = bound()
    # Given: real broker-generated envelopes, not only hand-authored fixtures.
    value = snapshot(broker)
    # When / Then: public read model is a distinct schema from runtime snapshot.
    assert parse('brokerSnapshot', value) == value
    assert parse('capabilities', TestClient(create_app(testing=True)).get('/api/h5a/capabilities', headers={'Authorization': 'Bearer harness-test'}).json())
