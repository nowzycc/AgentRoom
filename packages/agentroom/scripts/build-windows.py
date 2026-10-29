#!/usr/bin/env python3
"""Assemble the Windows x64 portable build from verified inputs.

Inputs (all already downloaded and checksum-verified against official sources):
  vendor/downloads/electron-v45.1.0-win32-x64.zip
  vendor/downloads/python-3.11.9-embed-amd64.zip
  vendor/wheels-win/*.whl
  backend/ (snapshot produced by scripts/snapshot.py)

Output:
  dist/releases/AgentRoom-win32-x64/        portable app directory
  dist/releases/AgentRoom-win32-x64-0.1.0.zip
  dist/releases/SHA256SUMS.txt
  dist/releases/BUILD-REPORT.json

No network, no code signing, no wine. Only packaging and static verification.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import zipfile
from pathlib import Path

PKG = Path(__file__).resolve().parents[1]
VENDOR = PKG / 'vendor'
DOWNLOADS = VENDOR / 'downloads'
WHEELS = VENDOR / 'wheels-win'
BACKEND = PKG / 'backend'
RELEASES = PKG / 'dist' / 'releases'
APP_NAME = 'AgentRoom'
VERSION = '0.1.0'
OUT = RELEASES / f'{APP_NAME}-win32-x64'
ZIP_PATH = RELEASES / f'{APP_NAME}-win32-x64-{VERSION}.zip'
NODE = Path(os.environ.get('AGENTROOM_NODE') or shutil.which('node') or 'node')
ASAR_JS = PKG / 'node_modules' / '@electron/asar' / 'bin' / 'asar.js'
FROZEN_SHA = '0ba29206942e2f8caf898f358788897dc8d6ac12959910c08e5b81e5b43ab619'
EXPECTED = {
    DOWNLOADS / 'electron-v45.1.0-win32-x64.zip': '55eaba17abff7b5bba6c3bbc85068967379024fe742fe9c7fdba9118922ccbe2',
    DOWNLOADS / 'python-3.11.9-embed-amd64.zip': '009d6bf7e3b2ddca3d784fa09f90fe54336d5b60f0e0f305c37f400bf83cfd3b',
}
KEEP_LOCALES = {'en-US.pak', 'zh-CN.pak'}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def pe_machine(path: Path) -> int:
    data = path.open('rb').read(0x400)
    if data[:2] != b'MZ':
        raise ValueError(f'{path} is not MZ')
    offset = struct.unpack_from('<I', data, 0x3C)[0]
    if data[offset:offset + 4] != b'PE\0\0':
        raise ValueError(f'{path} has no PE signature')
    return struct.unpack_from('<H', data, offset + 4)[0]


def reset() -> None:
    RELEASES.mkdir(parents=True, exist_ok=True)
    for target in (OUT, ZIP_PATH):
        if target.is_dir():
            shutil.rmtree(target)
        elif target.exists():
            target.unlink()


def extract_electron() -> None:
    with zipfile.ZipFile(DOWNLOADS / 'electron-v45.1.0-win32-x64.zip') as archive:
        archive.extractall(OUT)
    (OUT / 'resources' / 'default_app.asar').unlink(missing_ok=True)
    locales = OUT / 'locales'
    for pak in locales.iterdir():
        if pak.name not in KEEP_LOCALES:
            pak.unlink()
    exe = OUT / 'electron.exe'
    if not exe.exists():
        raise SystemExit('electron.exe missing after extraction')
    exe.rename(OUT / f'{APP_NAME}.exe')


def build_asar() -> Path:
    staging = PKG / 'dist' / 'asar-staging'
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    shutil.copytree(PKG / 'main', staging / 'main')
    shutil.copytree(PKG / 'renderer', staging / 'renderer')
    shutil.copy2(PKG / 'package.json', staging / 'package.json')
    archive_path = OUT / 'resources' / 'app.asar'
    subprocess.run([str(NODE), str(ASAR_JS), 'pack', str(staging), str(archive_path)],
                   check=True, capture_output=True, text=True)
    shutil.rmtree(staging)
    if not archive_path.is_file() or archive_path.stat().st_size < 1024:
        raise SystemExit('app.asar build failed')
    return archive_path


def install_backend() -> Path:
    target = OUT / 'resources' / 'app.asar.unpacked' / 'backend'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(BACKEND, target)
    (target / 'python-linux.path').unlink(missing_ok=True)
    adapter = target / 'room' / 'tools' / 'npc-v2' / 'hardening' / 'H5a' / 'dist-r4' / 'adapter.js'
    if sha256(adapter) != FROZEN_SHA:
        raise SystemExit('frozen R4 bundle hash mismatch inside package')
    return target


# Trim runtime pieces this product never loads. dxcompiler/vk_swiftshader serve
# WebGPU/Vulkan fallback (we render WebGL2 through ANGLE/D3D11); pythonwin and
# win32comext are pywin32 GUI/COM extras the MCP server never imports.
PRUNE = [
    'dxcompiler.dll',
    'vk_swiftshader.dll',
    'vk_swiftshader_icd.json',
    'Lib/site-packages/pythonwin',
    'Lib/site-packages/win32comext',
]


def prune_runtime() -> None:
    for relative in PRUNE:
        target = OUT / relative
        if target.is_dir():
            shutil.rmtree(target)
        elif target.exists():
            target.unlink()


def install_agent(backend: Path, runtime: Path) -> Path:
    """Copy the MCP launcher/skill/config and install the MCP server deps."""
    agent_src = PKG / 'agent'
    agent_dst = OUT / 'resources' / 'app.asar.unpacked' / 'agent'
    if not agent_src.is_dir():
        raise SystemExit('agent/ missing: run the W1/W2/W3 tasks first')
    shutil.copytree(agent_src, agent_dst)
    # agent/config/*.js requires 'yaml'; keep it next to agent/ so unpacked
    # modules resolve it without reading inside app.asar.
    yaml_src = PKG / 'node_modules' / 'yaml'
    if yaml_src.is_dir():
        shutil.copytree(yaml_src, agent_dst / 'node_modules' / 'yaml')
    else:
        raise SystemExit('node_modules/yaml missing (npm install first)')
    site = runtime / 'Lib' / 'site-packages'
    for package in ('npc_mcp', 'npc_harness'):
        source = PKG.parent / ('npc-mcp/src/' if package == 'npc_mcp' else 'npc-harness/src/') / package
        if not source.is_dir():
            raise SystemExit(f'source package missing: {source}')
        shutil.copytree(source, site / package, dirs_exist_ok=True)
    wheels = VENDOR / 'wheels-win-agent'
    wheels_found = list(wheels.glob('*.whl')) if wheels.is_dir() else []
    if not wheels_found:
        raise SystemExit(f'agent wheels missing: {wheels} (run scripts/fetch-agent-wheels.py)')
    # The sidecar runtime already ships tested versions of the shared deps
    # (starlette/uvicorn/sse-starlette/anyio/httpx...). Extracting the agent's
    # older pins over them would silently downgrade H5a at runtime, so keep the
    # sidecar copy and only add agent-only packages.
    def dist_name(path: Path) -> str:
        return path.name.split('-')[0].lower().replace('_', '-')
    sidecar_names = {dist_name(p) for p in (VENDOR / 'wheels-win').glob('*.whl')}
    installed, skipped = [], []
    for wheel in sorted(wheels_found):
        if dist_name(wheel) in sidecar_names:
            skipped.append(wheel.name)
            continue
        with zipfile.ZipFile(wheel) as archive:
            archive.extractall(site)
        installed.append(wheel.name)
    # pywin32's wheel expects a postinstall step to generate this bootstrap;
    # without it the .pth line fails and win32 DLLs are not found. Write a
    # minimal equivalent so mcp.server.stdio can import win32api on Windows.
    bootstrap = site / 'pywin32_bootstrap.py'
    if not bootstrap.exists() and any(name.startswith('pywin32-') for name in installed):
        bootstrap.write_text(
            'import os, sys\n'
            'base = os.path.dirname(os.path.abspath(sys.executable))\n'
            'for name in ("pywin32_system32", os.path.join("Lib", "site-packages", "pywin32_system32")):\n'
            '    path = os.path.join(base, name)\n'
            '    if os.path.isdir(path):\n'
            '        os.add_dll_directory(path)\n'
            '        os.environ["PATH"] = path + os.pathsep + os.environ.get("PATH", "")\n',
            encoding='utf-8')
    print(f'[agent] wheels installed={len(installed)} skipped(shared with sidecar)={len(skipped)}')
    return agent_dst


def install_python(backend: Path) -> Path:
    runtime = backend / 'runtime' / 'python'
    runtime.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(DOWNLOADS / 'python-3.11.9-embed-amd64.zip') as archive:
        archive.extractall(runtime)
    site = runtime / 'Lib' / 'site-packages'
    site.mkdir(parents=True, exist_ok=True)
    for wheel in sorted(WHEELS.glob('*.whl')):
        with zipfile.ZipFile(wheel) as archive:
            archive.extractall(site)
    (runtime / 'python311._pth').write_text(
        'python311.zip\n.\nLib\\site-packages\nimport site\n', encoding='utf-8')
    if not (runtime / 'python.exe').is_file() or not (runtime / 'python311.dll').is_file():
        raise SystemExit('embedded python incomplete')
    return runtime


def static_checks(backend: Path, runtime: Path) -> dict:
    exe = OUT / f'{APP_NAME}.exe'
    required = [
        OUT / 'resources' / 'app.asar',
        OUT / 'resources.pak',
        OUT / 'icudtl.dat',
        OUT / 'v8_context_snapshot.bin',
        OUT / 'locales' / 'zh-CN.pak',
        OUT / 'locales' / 'en-US.pak',
        backend / 'room' / 'tools' / 'npc-v2' / 'hardening' / 'H5a' / 'run-desktop.py',
        backend / 'room' / 'tools' / 'npc-v2' / 'hardening' / 'H5a' / 'shell' / 'index.html',
        backend / 'room' / 'tools' / 'npc-v2' / 'hardening' / 'H5a' / 'dist-r4' / 'adapter.js',
        backend / 'room' / 'tools' / 'layout-model-v3' / 'dist' / 'apartment-v3.glb',
        backend / 'room' / 'tools' / 'layout-model-v3' / 'web' / 'harness-preview' / 'scene.html',
        backend / 'room' / 'tools' / 'layout-model-v3' / 'web' / 'npc' / 'assets' / 'models' / 'avatar.vrm',
        runtime / 'python.exe',
        runtime / 'python311.dll',
        runtime / 'Lib' / 'site-packages' / 'anyio' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'starlette' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'uvicorn' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'jsonschema' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'rpds' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'websockets' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'npc_mcp' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'npc_harness' / '__init__.py',
        runtime / 'Lib' / 'site-packages' / 'mcp' / '__init__.py',
        OUT / 'resources' / 'app.asar.unpacked' / 'agent' / 'mcp' / 'launch.py',
        OUT / 'resources' / 'app.asar.unpacked' / 'agent' / 'skill' / 'agentroom' / 'SKILL.md',
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise SystemExit('missing packaged files: ' + ', '.join(missing))

    machines = {'AgentRoom.exe': pe_machine(exe), 'python.exe': pe_machine(runtime / 'python.exe'),
                'python311.dll': pe_machine(runtime / 'python311.dll')}
    native = list((runtime / 'Lib' / 'site-packages').rglob('*.pyd'))
    for library in native:
        machines[str(library.relative_to(runtime))] = pe_machine(library)
    bad = {name: hex(machine) for name, machine in machines.items() if machine != 0x8664}
    if bad:
        raise SystemExit(f'non-x64 PE binaries: {bad}')

    leaks = []
    forbidden_names = ('.env',)
    for path in OUT.rglob('*'):
        if path.is_file() and path.name.startswith(forbidden_names):
            leaks.append(('env-file', str(path)))
    for path in (backend / 'room').rglob('*'):
        if not path.is_file() or path.suffix not in {'.py', '.js', '.json', '.html', '.css', '.txt', '.md'}:
            continue
        text = path.read_text('utf-8', errors='ignore')
        if re.search(r'/home/[^/\s\"\']+/', text) or re.search(r'[A-Za-z]:\\Users\\', text):
            leaks.append(('absolute-user-path', str(path)))
    if leaks:
        raise SystemExit(f'forbidden content: {leaks[:5]}')

    return {'peMachine': machines, 'nativeLibraries': len(native), 'requiredFiles': len(required),
            'locales': sorted(p.name for p in (OUT / 'locales').iterdir())}


def archive_tree() -> None:
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    subprocess.run(['zip', '-r', '-q', '-6', str(ZIP_PATH), OUT.name], cwd=RELEASES, check=True)


def main() -> int:
    for path, expected in EXPECTED.items():
        actual = sha256(path)
        if actual != expected:
            raise SystemExit(f'checksum mismatch for {path.name}: {actual}')
    reset()
    extract_electron()
    asar_path = build_asar()
    backend = install_backend()
    runtime = install_python(backend)
    install_agent(backend, runtime)
    prune_runtime()
    checks = static_checks(backend, runtime)

    files = []
    total = 0
    for path in sorted(OUT.rglob('*')):
        if path.is_file():
            size = path.stat().st_size
            total += size
            files.append({'path': path.relative_to(OUT).as_posix(), 'bytes': size, 'sha256': sha256(path)})
    report = {
        'app': APP_NAME, 'version': VERSION, 'target': 'win32-x64',
        'electron': '45.1.0', 'python': '3.11.9 embeddable amd64',
        'frozenR4Sha256': FROZEN_SHA,
        'appAsarSha256': sha256(asar_path),
        'fileCount': len(files), 'totalBytes': total,
        'checks': checks,
        'signed': False,
        'windowsNativeBoot': 'NOT_RUN (no Windows host available; assembled and statically verified on Linux arm64)',
    }
    (RELEASES / 'BUILD-REPORT.json').write_text(json.dumps({**report, 'files': files}, ensure_ascii=False, indent=2), encoding='utf-8')

    archive_tree()
    zip_sha = sha256(ZIP_PATH)
    (RELEASES / 'SHA256SUMS.txt').write_text(f'{zip_sha}  {ZIP_PATH.name}\n', encoding='utf-8')
    print(json.dumps({'zip': str(ZIP_PATH), 'zipSha256': zip_sha, 'zipBytes': ZIP_PATH.stat().st_size,
                      'treeBytes': total, 'fileCount': len(files), 'checks': checks,
                      'report': str(RELEASES / 'BUILD-REPORT.json')}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
