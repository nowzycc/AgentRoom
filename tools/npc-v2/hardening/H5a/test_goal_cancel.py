"""Given/When/Then goal and cancellation wire tests, not physical evidence."""
import time
import pytest
from test_network import app_client, attached, hello, command
from test_authority import bound
from protocol import Rejected, Document
HEADERS = {'Authorization': 'Bearer harness-test'}

def goal(scope) -> Document:
    return dict(apiVersion='h5a.1',scope=scope,commandId='goal-a',type='goal.request',goal='idle',
                priorityClass='task',onConflict='replace',issuedAtWallMs=int(time.time()*1000),ttlMs=10000)

def cancel(scope, target='goal-a', kind='goal', operation='cancel-a') -> Document:
    return dict(apiVersion='h5a.1',scope=scope,commandId=operation,type='cancel',target=dict(kind=kind,commandId=target))

def test_pending_when_goal_and_cancel_dispatched_without_runtime_report():
    # Given: an authenticated real WS transport (no motion runtime).
    with app_client() as client, attached(client) as ws:
        scope=hello(ws)
        assert client.post('/api/h5a/commands',json=goal(scope),headers=HEADERS).status_code==202
        assert ws.receive_json()['operation']['type']=='goal.request'
        # When: cancel is submitted, but browser has not reported an outcome.
        response=client.post('/api/h5a/cancel',json=cancel(scope),headers=HEADERS)
        # Then: WS dispatch only, never broker-manufactured cancelled.
        assert response.status_code==202
        assert response.json()['execution'] is None
        assert ws.receive_json()['operation']['type']=='cancel'
        assert client.get('/api/h5a/commands/goal-a',headers=HEADERS).json()['delivery']=='pending'

@pytest.mark.parametrize('mutation,code,status',[
    ({'goal':'work'},'UNSUPPORTED_GOAL',422),({'priorityClass':'safety'},'FORBIDDEN_SCOPE',403)])
def test_explicit_rejection_when_goal_outside_scope(mutation,code,status):
    with app_client() as client, attached(client) as ws:
        payload=goal(hello(ws))|mutation
        response=client.post('/api/h5a/commands',json=payload,headers=HEADERS)
        assert (response.status_code,response.json()['code'])==(status,code)

def test_cancel_dedup_conflict_and_epoch_fence():
    # Given
    broker,_=bound();entry,_=broker.submit(goal(dict(broker.scope)),batch=False)
    payload=cancel(dict(broker.scope))
    # When
    first,fresh=broker.submit(payload,batch=False)
    again,repeated=broker.submit(payload,batch=False)
    # Then
    assert fresh and not repeated and again is first
    with pytest.raises(Rejected,match='COMMAND_CONFLICT'):
        broker.submit(payload|{'target':dict(kind='goal',commandId='other')},batch=False)
    with pytest.raises(Rejected,match='STALE_AUTHORITY_EPOCH'):
        broker.submit(payload|{'scope':dict(broker.scope)|{'authorityEpoch':'old'}},batch=False)
    assert entry.receipt is None

@pytest.mark.parametrize('target,kind,code',[('absent','goal','UNKNOWN_COMMAND'),('goal-a','action','TARGET_KIND_MISMATCH')])
def test_wrong_target_when_cancel_does_not_match(target,kind,code):
    broker,_=bound();broker.submit(goal(dict(broker.scope)),batch=False)
    with pytest.raises(Rejected,match=code):
        broker.submit(cancel(dict(broker.scope),target,kind),batch=False)

@pytest.mark.parametrize('identity', [dict(actionId='action-a',attemptId='attempt-b'),
                                      dict(actionId='action-b',attemptId='attempt-a')])
def test_goal_rejects_identity_switch_without_original_terminal(identity):
    # Given: a browser-bound goal has reported one running action/attempt pair.
    from receipts import correlate
    payload=goal({}) | {'goal':'lookAround'}
    prior: Document=dict(kind='goal',status='started',actionId='action-a',attemptId='attempt-a',attempts=[])
    # When: either half is swapped without settling that exact original pair.
    data=prior | identity
    # Then: neither action ID alone nor attempt ID alone proves continuity.
    with pytest.raises(Rejected,match='COMMAND_CONFLICT'):
        correlate(payload,prior,data)
