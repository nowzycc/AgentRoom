"""Verify final SSE evidence, schema, source hashes and owned service cleanup.

Run from repository root: python3 tools/npc-v2/hardening/H5a/verify-sse.py
Uses only installed project dependencies. Never reads/prints credentials.
"""
import hashlib
import json
from pathlib import Path
import subprocess
from protocol import parse

HERE = Path(__file__).resolve().parent


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    evidence = HERE / 'evidence'
    records = []
    documents = []
    for name in ['sse-network-built.log', 'sse-reconnect-built.log']:
        receipt = json.loads((evidence / name).read_text())
        path = Path(receipt['path'])
        assert digest(path) == receipt['sha256']
        document = json.loads(path.read_text())
        assert document['status'] == 'ready_for_review'
        for relative, expected in document['sources'].items():
            assert digest(HERE / relative) == expected, relative
        documents.append(document)
        records.append(dict(path=str(path), sha256=digest(path)))
    sse, reconnect = documents
    parse('brokerSnapshot', sse['checks']['initial']['body'])
    parse('brokerSnapshot', sse['checks']['finalSnapshot']['body'])
    event_count = 0
    for client in sse['clients']:
        assert client['closed'] and not client['errors'], client
        for row in client['rows']:
            if 'data' in row:
                parse('brokerStreamEvent', row['data'])
                event_count += 1
    original = reconnect['checks']['h5a1']
    assert original['exit'] == 0
    network_receipt = json.loads(original['output'].strip().splitlines()[-1])
    network_path = Path(network_receipt['path'])
    assert digest(network_path) == network_receipt['sha256']
    records.append(dict(path=str(network_path), sha256=digest(network_path)))
    old_root = HERE / '../../../layout-model-v3/web'
    for relative, expected in reconnect['oldBundles'].items():
        assert digest(old_root / relative) == expected, relative
    listeners = subprocess.run(['ss', '-ltnp'], check=True, capture_output=True, text=True).stdout
    processes = [sse['service'], *reconnect['processes']]
    for process in processes:
        assert process['listeningAfter'] is False
        assert not Path(f"/proc/{process['pid']}").exists()
        port = process['base'].rsplit(':', 1)[1]
        assert not any(line.split()[3].endswith(':' + port) for line in listeners.splitlines()[1:])
    assert isinstance(listeners, str)
    source_files = ['broker.py', 'server.py', 'journal.py', 'read_api.py', 'browser-sse.mjs', 'sse-client.py', 'verify-sse.py', 'dist/adapter.js', '../H4-closeout/schema/contract.schema.json']
    logs = ['sse-red.log', 'sse-atomic-red.log', 'sse-green.log', 'sse-clock.log', 'sse-contract.log', 'sse-core.log', 'sse-three.log', 'sse-core-types.log', 'sse-three-types.log', 'sse-h5-types.log']
    result = dict(status='ready_for_review', baseline='eca0a7e', finalEvidence=records,
                  validatedStreamRows=event_count, oldPageHashesVerified=len(reconnect['oldBundles']),
                  processes=[dict(pid=p['pid'], base=p['base'], listeningAfter=False) for p in processes],
                  protectedHostPids=[], listeners=listeners,
                  sources={f:digest(HERE / f) for f in source_files},
                  logs={f:digest(evidence / f) for f in logs},
                  limits=['fake harness only', 'single in-memory broker', 'no persistence/takeover', 'at-least-once plus cursor dedupe', 'Python static typecheck unavailable'])
    output = evidence / 'sse-verification.json'
    output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(dict(path=str(output), sha256=digest(output), status=result['status'], validatedStreamRows=event_count)))


if __name__ == '__main__':
    main()
