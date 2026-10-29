"""Given/When/Then authority safety tests, not real-runtime evidence."""
import pytest
from broker import Broker
from config import Config
from protocol import Document, Rejected
import time


def command(scope: Document) -> Document:
    return dict(apiVersion='h5a.1', scope=scope, commandId='test-command', type='action.request',
                actionKey='lookAround', issuedAtWallMs=int(time.time() * 1000), ttlMs=10000)


def bound() -> tuple[Broker, Document]:
    broker = Broker(Config('http://testserver', 'runtime-test', 'harness-test', 'runtime-test'))
    hello: Document = dict(worldId='apartment-v3', actorId='npc-a', runtimeInstanceId='runtime-test')
    broker.attach(hello)
    return broker, hello


def test_unknown_when_disconnected_command_retried():
    broker, _ = bound()
    payload = command(dict(broker.scope))
    entry, _ = broker.submit(payload, batch=False)
    broker.disconnect()
    # When: identical request is retried after unconfirmed execution.
    same, fresh = broker.submit(payload, batch=False)
    # Then: no dispatch and explicit uncertainty, not a fresh pending/success.
    assert same is entry and not fresh
    assert broker.delivery(entry)['delivery'] == 'unknown'
    assert broker.delivery(entry)['execution'] is None


def test_resync_when_same_runtime_reconnects_after_lease(monkeypatch):
    broker, hello = bound()
    monkeypatch.setattr('broker.time.monotonic', lambda: broker.deadline)
    # When: lease expires and the same runtime attempts a reconnect.
    assert not broker.online
    with pytest.raises(Rejected, match='RESYNC_REQUIRED'):
        broker.attach(hello)


def test_busy_when_duplicate_attach():
    broker, hello = bound()
    # When: another socket claims the configured runtime identity.
    with pytest.raises(Rejected, match='AUTHORITY_BUSY'):
        broker.attach(hello)
    assert broker.online


def receipt_report(broker: Broker) -> Document:
    entry, _ = broker.submit(command(dict(broker.scope)), batch=False)
    return dict(scope=dict(broker.scope), runtimeInstanceId='runtime-test', reportId='report-a', reportSeq=1,
                deliveryId=entry.delivery_id, data=dict(scope=dict(broker.scope), commandId='test-command',
                status='accepted', actionId=None, attemptId=None, terminal=None))


def test_old_connection_report_rejected():
    broker, _ = bound()
    report = receipt_report(broker)
    # When: a non-owner transport sends an otherwise matching report.
    with pytest.raises(Rejected, match='AUTHORITY_OFFLINE'):
        broker.report(report, connection_id='old-connection')
    assert broker.cursor_seq == 0


def test_report_ack_idempotent_and_reused_sequence_rejected():
    broker, _ = bound()
    report = receipt_report(broker)
    ack = broker.report(report, connection_id=broker.connection_id)
    # When: ACK is lost, then a different report reuses the sequence.
    assert broker.report(report, connection_id=broker.connection_id) == ack
    with pytest.raises(Rejected, match='INVALID_REQUEST'):
        broker.report(report | {'reportId': 'report-b'}, connection_id=broker.connection_id)
    assert broker.cursor_seq == 1


def test_old_epoch_rejected_before_cached_id():
    broker, _ = bound()
    report = receipt_report(broker)
    # When: authenticated old authority tries to publish.
    old_scope: Document = dict(broker.scope)
    old_scope['authorityEpoch'] = 'old'
    report['scope'] = old_scope
    with pytest.raises(Rejected, match='STALE_AUTHORITY_EPOCH'):
        broker.report(report, connection_id=broker.connection_id)
    assert broker.cursor_seq == 0


def test_new_broker_has_distinct_epoch_and_does_not_replay():
    broker, _ = bound()
    old = command(dict(broker.scope))
    broker.submit(old, batch=False)
    fresh, _ = bound()
    # When: an old-boot command enters the new broker.
    with pytest.raises(Rejected, match='STALE_AUTHORITY_EPOCH'):
        fresh.submit(old, batch=False)
    assert fresh.boot != broker.boot
    assert not fresh.commands


def test_report_rejected_when_lease_expires(monkeypatch):
    broker, _ = bound()
    report = receipt_report(broker)
    monkeypatch.setattr('broker.time.monotonic', lambda: broker.deadline)
    # When: a valid-looking report arrives at the exact lease deadline.
    with pytest.raises(Rejected, match='AUTHORITY_OFFLINE'):
        broker.report(report, connection_id=broker.connection_id)
    assert broker.cursor_seq == 0 and broker.quarantined


def test_started_is_only_historical_when_connection_lost():
    broker, _ = bound()
    report = receipt_report(broker)
    report['data'] = dict(scope=dict(broker.scope), commandId='test-command', status='started',
                          actionId='action-a', attemptId='attempt-a', terminal=None)
    broker.report(report, connection_id=broker.connection_id)
    # When: transport disappears before a terminal report.
    broker.disconnect()
    result = broker.delivery(broker.commands['test-command'])
    assert result['delivery'] == 'unknown' and result['execution'] is None
    assert result['lastReceipt'] == report['data']


def test_confirmed_terminal_remains_history_when_disconnected():
    broker, _ = bound()
    report = receipt_report(broker)
    report['data'] = dict(scope=dict(broker.scope), commandId='test-command', status='rejected',
                          actionId=None, attemptId=None, terminal=None)
    broker.report(report, connection_id=broker.connection_id)
    # When: connection disappears after a confirmed rejection.
    broker.disconnect()
    assert broker.delivery(broker.commands['test-command']) == report['data']


def test_unknown_delivery_is_valid_schema_without_manufactured_terminal():
    from protocol import parse
    broker, _ = bound()
    entry, _ = broker.submit(command(dict(broker.scope)), batch=False)
    broker.disconnect()
    # When: querying an unconfirmed delivery in the quarantined epoch.
    result = broker.delivery(entry)
    assert parse('delivery', result) == result
    invalid = dict(result)
    invalid['execution'] = 'success'
    with pytest.raises(Rejected, match='INVALID_REQUEST'):
        parse('delivery', invalid)
