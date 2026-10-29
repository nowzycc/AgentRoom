"""Receipt correlation only; never computes an execution outcome."""
from protocol import Document, Json, Rejected, canonical

def document(value: Json) -> Document:
    """Narrow a schema-validated nested object at the wire boundary."""
    match value:
        case dict(): return value
        case _: raise Rejected('INVALID_REQUEST')

def rows(value: Json) -> list[Document]:
    match value:
        case list(): return [document(row) for row in value]
        case _: raise Rejected('INVALID_REQUEST')

def settled(receipt: Document | None) -> bool:
    if receipt is None:
        return False
    match receipt.get('kind'):
        case 'goal': return receipt.get('status') in ('withdrawn', 'rejected')
        case 'cancel': return receipt.get('status') in ('settled', 'rejected')
        case _: return receipt.get('status') in ('succeeded', 'failed', 'cancelled', 'rejected')

def correlate(payload: Document, prior: Document | None, data: Document) -> None:
    """Check immutable terminal and request kind before broker retains a report."""
    match payload.get('type'):
        case 'action.request': expected = 'action'
        case 'goal.request': expected = 'goal'
        case 'cancel': expected = 'cancel'
        case _: raise Rejected('INVALID_REQUEST')
    if 'kind' in data and data['kind'] != expected:
        raise Rejected('COMMAND_CONFLICT', 409)
    if settled(prior) and canonical(prior) != canonical(data):
        raise Rejected('COMMAND_CONFLICT', 409)
    match expected:
        case 'cancel':
            if data['target'] != payload['target']:
                raise Rejected('COMMAND_CONFLICT', 409)
            target = data.get('targetReceipt')
            request_target = document(payload['target'])
            if target is not None:
                target = document(target)
                if target['commandId'] != request_target['commandId'] or target['kind'] != request_target['kind']:
                    raise Rejected('COMMAND_CONFLICT', 409)
            if data['status'] == 'settled' and not settled(target):
                raise Rejected('INVALID_REQUEST')
        case 'goal':
            attempts = rows(data['attempts'])
            old_attempts = rows(prior.get('attempts', [])) if prior else []
            if attempts[:len(old_attempts)] != old_attempts:
                raise Rejected('COMMAND_CONFLICT', 409)
            identities = [(canonical(row['actionId']),canonical(row['attemptId'])) for row in attempts]
            if len(set(identities)) != len(identities):
                raise Rejected('COMMAND_CONFLICT', 409)
            if prior and prior.get('actionId') and (data.get('actionId'),data.get('attemptId')) != (prior['actionId'],prior['attemptId']):
                if (canonical(prior['actionId']),canonical(prior['attemptId'])) not in identities:
                    raise Rejected('COMMAND_CONFLICT',409)
            match payload['goal']:
                case 'idle': allowed = ()
                case 'lookAround': allowed = ('lookAround',)
                case 'converse': allowed = ('turnToSpeaker',)
                case _: raise Rejected('INVALID_REQUEST')
            if any(row['actionKey'] not in allowed for row in attempts):
                raise Rejected('COMMAND_CONFLICT',409)
        case 'action':
            if data['status'] == 'succeeded' and (not prior or prior['status'] not in ('started','cancel_requested','succeeded')):
                raise Rejected('INVALID_REQUEST')
            if prior and prior.get('attemptId') and (prior['attemptId'],prior['actionId']) != (data['attemptId'],data['actionId']):
                raise Rejected('COMMAND_CONFLICT',409)
            terminal = data.get('terminal')
            if terminal:
                terminal = document(terminal)
                if (terminal['attemptId'],terminal['actionId'],terminal['actionKey']) != (data['attemptId'],data['actionId'],payload['actionKey']):
                    raise Rejected('COMMAND_CONFLICT',409)
