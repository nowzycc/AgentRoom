"""Real HTTP SSE test client using the already installed standard parser.

Run: H5_HARNESS_TOKEN=<private env> python3 sse-client.py <events-url>
No credentials in argv/URL/output. Parent owns the bounded subprocess lifetime.
"""
import json
import os
import sys

import httpx
from httpx_sse import connect_sse


def main() -> None:
    headers = {'Authorization': 'Bearer ' + os.environ['H5_HARNESS_TOKEN']}
    if 'H5_LAST_EVENT_ID' in os.environ:
        headers['Last-Event-ID'] = os.environ['H5_LAST_EVENT_ID']
    with httpx.Client(timeout=httpx.Timeout(25, connect=5), follow_redirects=False, trust_env=False) as client:
        with connect_sse(client, 'GET', sys.argv[1], headers=headers) as source:
            source.response.raise_for_status()
            print(json.dumps({'ready': True, 'contentType': source.response.headers['content-type']}), flush=True)
            for event in source.iter_sse():
                print(json.dumps({'id': event.id, 'event': event.event, 'data': json.loads(event.data)}), flush=True)
                if event.event == 'resync_required':
                    return


if __name__ == '__main__':
    main()
