"""Generate ignored local-only credentials and record a free port, without printing secrets."""
import os
from pathlib import Path
import secrets
import socket

HERE = Path(__file__).resolve().parent

def main() -> None:
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
    path = HERE / '.env.local'
    content = '\n'.join((f'H5_ORIGIN=http://127.0.0.1:{port}',
        f'H5_RUNTIME_ID=runtime-{secrets.token_hex(12)}', f'H5_HARNESS_TOKEN={secrets.token_urlsafe(32)}',
        f'H5_RUNTIME_TOKEN={secrets.token_urlsafe(32)}', 'H5_QUIESCENT=confirmed', ''))
    with path.open('x') as stream:
        os.chmod(path, 0o600)
        stream.write(content)
    print(f'Generated ignored .env.local; loopback port {port}; credentials not printed')

if __name__ == '__main__':
    main()
