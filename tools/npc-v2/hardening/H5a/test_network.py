"""Given / When / Then boundary tests; TestClient is not network evidence."""
import importlib
import time

import pytest
from starlette.testclient import TestClient


def app_client():
    # Given: an explicitly bound test-only configuration, never production credentials.
    module = importlib.import_module('server')
    factory = getattr(module, 'create_app', None)
    assert callable(factory), 'H5 app factory must exist'
    return TestClient(factory(testing=True))


def command(scope, **changes):
    return dict(apiVersion='h5a.1', scope=scope, commandId='test-command',
                type='action.request', actionKey='lookAround',
                issuedAtWallMs=int(time.time() * 1000), ttlMs=10000, **changes)


def attached(client):
    client.post('/api/h5a/pair', headers={'Origin': 'http://testserver', 'Authorization': 'Bearer runtime-test'})
    return client.websocket_connect('/api/h5a/runtime', headers={'Origin': 'http://testserver'})


def hello(ws):
    ws.send_json(dict(apiVersion='h5a.1', type='hello', worldId='apartment-v3', actorId='npc-a', runtimeInstanceId='runtime-test'))
    return ws.receive_json()['scope']


@pytest.mark.parametrize('mutation,code', [({'pose': {}}, 'INVALID_REQUEST'), ({'actionKey': 'standUp'}, 'UNSUPPORTED_ACTION'), ({'ttlMs': 1}, 'INVALID_REQUEST')])
def test_rejects_input_when_untrusted_payload(mutation, code):
    with app_client() as client:
        with attached(client) as ws:
            scope = hello(ws)
            payload = command(scope) | mutation
            # When: malformed or unsupported command enters the HTTP boundary.
            response = client.post('/api/h5a/commands', json=payload, headers={'Authorization': 'Bearer harness-test'})
            # Then: rejection, not execution failure.
            assert response.json()['code'] == code


def test_deduplicates_when_same_payload_and_conflicts_when_changed():
    with app_client() as client:
        with attached(client) as ws:
            payload = command(hello(ws))
            headers = {'Authorization': 'Bearer harness-test'}
            assert client.post('/api/h5a/commands', json=payload, headers=headers).status_code == 202
            dispatch = ws.receive_json()
            # When: the identical operation is retried, then its TTL is changed.
            repeat = client.post('/api/h5a/commands', json=payload, headers=headers)
            conflict = client.post('/api/h5a/commands', json=payload | {'ttlMs': 12000}, headers=headers)
            # Then: same pending delivery; conflicting payload cannot replace it.
            assert repeat.json()['execution'] is None
            assert conflict.status_code == 409
            assert dispatch['operation']['commandId'] == payload['commandId']


def test_fences_report_when_epoch_is_old():
    with app_client() as client:
        with attached(client) as ws:
            scope = hello(ws)
            # When: an authenticated runtime reports from a different authority epoch.
            ws.send_json(dict(apiVersion='h5a.1', type='report', scope=scope | {'authorityEpoch': 'old'},
                              reportId='old-report', runtimeInstanceId='runtime-test', reportSeq=1, deliveryId=None,
                              data=dict(apiVersion='h5a.1', code='INVALID_REQUEST', reason='test', retryable=False)))
            # Then: epoch rejection, not report acceptance.
            assert ws.receive_json()['code'] == 'STALE_AUTHORITY_EPOCH'


def test_authentication_when_missing_token():
    with app_client() as client:
        # When: unauthenticated client reads capabilities.
        response = client.get('/api/h5a/capabilities')
        # Then: no information or authority granted.
        assert response.status_code == 401
