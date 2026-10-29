#!/usr/bin/env python3
"""Independent post-build verification of the Windows portable ZIP."""
from __future__ import annotations

import hashlib
import json
import os
import struct
import tempfile
import time
import zipfile
import subprocess
import socket
from pathlib import Path

PKG = Path(os.environ.get('AGENTROOM_PKG') or Path(__file__).resolve().parents[1])
ZIP = PKG / 'dist/releases/AgentRoom-win32-x64-0.1.0.zip'
FROZEN = '0ba29206942e2f8caf898f358788897dc8d6ac12959910c08e5b81e5b43ab619'
TOP = 'AgentRoom-win32-x64/'
REQUIRED = [
    'AgentRoom.exe', 'resources/app.asar', 'resources.pak', 'icudtl.dat',
    'locales/zh-CN.pak', 'locales/en-US.pak', 'version',
    'resources/app.asar.unpacked/backend/SNAPSHOT.json',
    'resources/app.asar.unpacked/backend/room/tools/npc-v2/hardening/H5a/run-desktop.py',
    'resources/app.asar.unpacked/backend/room/tools/npc-v2/hardening/H5a/dist-r4/adapter.js',
    'resources/app.asar.unpacked/backend/room/tools/npc-v2/hardening/H5a/shell/index.html',
    'resources/app.asar.unpacked/backend/room/tools/layout-model-v3/dist/apartment-v3.glb',
    'resources/app.asar.unpacked/backend/room/tools/layout-model-v3/web/npc/assets/models/avatar.vrm',
    'resources/app.asar.unpacked/backend/runtime/python/python.exe',
    'resources/app.asar.unpacked/backend/runtime/python/python311.dll',
    'resources/app.asar.unpacked/backend/runtime/python/python311._pth',
    'resources/app.asar.unpacked/agent/mcp/launch.py',
    'resources/app.asar.unpacked/agent/skill/agentroom/SKILL.md',
    'resources/app.asar.unpacked/agent/node_modules/yaml/package.json',
    'resources/app.asar.unpacked/backend/runtime/python/Lib/site-packages/mcp/__init__.py',
    'resources/app.asar.unpacked/backend/runtime/python/Lib/site-packages/npc_mcp/__init__.py',
    'resources/app.asar.unpacked/backend/runtime/python/Lib/site-packages/npc_harness/__init__.py',
]
MODULES = ['anyio', 'starlette', 'uvicorn', 'jsonschema', 'referencing', 'dotenv',
           'sse_starlette', 'websockets', 'rpds', 'attrs', 'idna', 'click', 'h11',
           'typing_extensions', 'mcp', 'pydantic', 'pydantic_core', 'httpx2',
           'jwt', 'opentelemetry', 'npc_mcp', 'npc_harness']


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pe_machine(data: bytes) -> int:
    if data[:2] != b'MZ':
        raise ValueError('not MZ')
    offset = struct.unpack_from('<I', data, 0x3C)[0]
    if data[offset:offset + 4] != b'PE\0\0':
        raise ValueError('no PE')
    return struct.unpack_from('<H', data, offset + 4)[0]


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return int(sock.getsockname()[1])


def main() -> int:
    report = {'zip': str(ZIP), 'exists': ZIP.is_file()}
    if not ZIP.is_file():
        raise SystemExit('zip missing')
    report['zipBytes'] = ZIP.stat().st_size
    report['zipSha256'] = hashlib.sha256(ZIP.read_bytes()).hexdigest()

    with zipfile.ZipFile(ZIP) as archive:
        bad = archive.testzip()
        report['testzip'] = bad
        names = archive.namelist()
        report['entries'] = len(names)
        report['topLevel'] = sorted({name.split('/')[0] for name in names})
        missing = [path for path in REQUIRED if TOP + path not in names]
        report['missing'] = missing
        report['envEntries'] = [name for name in names if Path(name).name.startswith('.env')]
        adapter = archive.read(TOP + 'resources/app.asar.unpacked/backend/room/tools/npc-v2/hardening/H5a/dist-r4/adapter.js')
        report['frozenAdapterSha256'] = sha256_bytes(adapter)
        report['frozenAdapterOk'] = sha256_bytes(adapter) == FROZEN
        pth = archive.read(TOP + 'resources/app.asar.unpacked/backend/runtime/python/python311._pth').decode()
        report['pth'] = pth.strip().splitlines()
        exe = archive.read(TOP + 'AgentRoom.exe')
        report['exeBytes'] = len(exe)
        report['exeMachine'] = hex(pe_machine(exe))
        report['exeMachineOk'] = pe_machine(exe) == 0x8664
        site_files = [name for name in names if '/Lib/site-packages/' in name]
        report['sitePackageFiles'] = len(site_files)
        report['modulesPresent'] = {module: (any(f'/site-packages/{module}/' in name for name in names)
                                            or f'/site-packages/{module}.py' in '\n'.join(names))
                                    for module in MODULES}
        report['nativeWheels'] = [name.rsplit('/', 1)[-1] for name in names if name.endswith('.pyd')]

    # Boot the packaged backend copy with the Linux interpreter: proves snapshot paths/schemas.
    backend = PKG / 'dist/releases/AgentRoom-win32-x64/resources/app.asar.unpacked/backend'
    runtime_py = PKG / '.venv-sidecar/bin/python'
    port = free_port()
    import os
    env = dict(os.environ, H5_QUIESCENT='confirmed', H5_ORIGIN=f'http://127.0.0.1:{port}',
               H5_RUNTIME_ID='pkg-verify', H5_HARNESS_TOKEN='verify-harness-token-0123456789',
               H5_RUNTIME_TOKEN='verify-runtime-token-0123456789', H5_WORLD_ID='apartment-v3',
               H5_ACTOR_ID='npc-a', PYTHONUNBUFFERED='1')
    entry = backend / 'room/tools/npc-v2/hardening/H5a/run-desktop.py'
    proc = subprocess.Popen([str(runtime_py), str(entry)], env=env, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True)
    ok = False
    last = ''
    try:
        deadline = time.time() + 25
        import urllib.request
        while time.time() < deadline:
            try:
                request = urllib.request.Request(f'http://127.0.0.1:{port}/api/h5a/capabilities',
                                                 headers={'Authorization': 'Bearer verify-harness-token-0123456789'})
                with urllib.request.urlopen(request, timeout=2) as response:
                    body = json.loads(response.read())
                    ok = response.status == 200 and body.get('apiVersion') == 'h5a.1' and 'scope' in body
                    last = json.dumps({'status': response.status, 'apiVersion': body.get('apiVersion'),
                                       'scope': body.get('scope'), 'implemented': body.get('implemented')})
                    break
            except Exception as error:
                last = str(error)
                time.sleep(0.3)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=8)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
    report['packagedBackendBoot'] = {'ok': ok, 'detail': last}
    report['pass'] = (report['testzip'] is None and not missing and not report['envEntries']
                      and report['frozenAdapterOk'] and report['exeMachineOk'] and ok
                      and all(report['modulesPresent'].values()))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report['pass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
