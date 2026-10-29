#!/usr/bin/env python3
"""从只读原仓库按白名单构建 backend/room 快照（保原路径层级，满足
config.ROOT=parents[4] 与 protocol.py 的 HERE/ROOT relative lookup）。

来源（全部只读）：
- tools/npc-v2/hardening/H5a/*.py（原服务7文件）
- tools/npc-v2/hardening/H4-closeout/schema/contract.schema.json
- packages/npc-contracts/schemas/{common,envelope,event}.schema.json
- 冻结 R4 bundle（SHA256 必须等于 0ba2…619）
- tools/layout-model-v3 瘦镜像：父侧真实网络 inventory（scripts/scene-manifest.parent.json）
- renderer/* → H5a副本/shell/（中文窄壳）
- scripts/templates/run-desktop.py → H5a副本/run-desktop.py

禁止物化：.env*、*.log、evidence/、.pytest_cache、node_modules、archive。
产物：backend/room + backend/SNAPSHOT.json（清单+SHA）+ backend/python-linux.path。
"""
from __future__ import annotations
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

PKG = Path(__file__).resolve().parents[1]
REPO = Path('<repo>')
BACKEND = PKG / 'backend'
ROOM = BACKEND / 'room'
H5A_REL = Path('tools/npc-v2/hardening/H5a')
FROZEN = REPO / 'tools/npc-v2/hardening/H6-harness/archive/glm-h6-transport-r4-submission/dist/adapter.js'
FROZEN_SHA = '0ba29206942e2f8caf898f358788897dc8d6ac12959910c08e5b81e5b43ab619'
PY_FILES = ['server.py', 'broker.py', 'config.py', 'protocol.py', 'read_api.py', 'receipts.py', 'journal.py']
TEXT_SUFFIX = {'.py', '.js', '.json', '.html', '.css', '.md', '.txt', '.wasm.js'}

def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def copy(src: Path, dst: Path, entry: dict):
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)  # copyfile 会解析 symlink 读真实内容（assets 软链 → 实体文件）
    digest = sha256(dst)
    entry.update(rel=dst.relative_to(BACKEND).as_posix(), src=src.resolve().as_posix(),
                 bytes=dst.stat().st_size, sha256=digest)
    return digest

def main() -> int:
    if ROOM.exists():
        shutil.rmtree(ROOM)
    manifest = []
    # 1) H5a python + 2) schemas
    for name in PY_FILES:
        src = REPO / H5A_REL / name
        entry = {'group': 'h5a-py'}
        digest = copy(src, ROOM / H5A_REL / name, entry)
        assert digest == sha256(src)
        manifest.append(entry)
    for rel in ('tools/npc-v2/hardening/H4-closeout/schema/contract.schema.json',
                'packages/npc-contracts/schemas/common.schema.json',
                'packages/npc-contracts/schemas/envelope.schema.json',
                'packages/npc-contracts/schemas/event.schema.json'):
        entry = {'group': 'schema'}
        copy(REPO / rel, ROOM / rel, entry)
        manifest.append(entry)
    # 3) 冻结 R4 dist
    actual = sha256(FROZEN)
    if actual != FROZEN_SHA:
        print(f'FATAL frozen bundle sha mismatch {actual}', file=sys.stderr); return 1
    entry = {'group': 'r4-dist'}
    copy(FROZEN, ROOM / H5A_REL / 'dist-r4' / 'adapter.js', entry)
    manifest.append(entry)
    # 3b) 原 server.create_app() 构造期即实例化 StaticFiles(H5a/dist)，目录必须存在；
    #     boot 时 /h5 挂载即被 swap 到 dist-r4（见 run-desktop.py），此目录永不参与服务。
    dist_placeholder = ROOM / H5A_REL / 'dist'
    dist_placeholder.mkdir(parents=True, exist_ok=True)
    (dist_placeholder / 'PLACEHOLDER.txt').write_text(
        '占位目录：原 create_app() 构造期需要本目录存在；运行时 /h5 已被 run-desktop.py '
        '替换为 dist-r4/（冻结 R4 bundle）。请勿放入任何文件。\n', 'utf-8')
    manifest.append({'group': 'placeholder', 'rel': (Path('room') / H5A_REL / 'dist' / 'PLACEHOLDER.txt').as_posix(),
                     'src': 'generated', 'bytes': (dist_placeholder / 'PLACEHOLDER.txt').stat().st_size,
                     'sha256': sha256(dist_placeholder / 'PLACEHOLDER.txt')})
    # 4) 中文壳
    for name in ('index.html', 'shell.js', 'shell.css'):
        entry = {'group': 'shell'}
        copy(PKG / 'renderer' / name, ROOM / H5A_REL / 'shell' / name, entry)
        manifest.append(entry)
    # 5) sidecar 入口
    entry = {'group': 'entry'}
    copy(PKG / 'scripts/templates/run-desktop.py', ROOM / H5A_REL / 'run-desktop.py', entry)
    manifest.append(entry)
    # 6) layout 瘦镜像（父真实网络 inventory；跳过 '/' 与 '/h5/adapter.js'——分别由壳与 dist-r4 提供）
    inv = json.loads((PKG / 'scripts/scene-manifest.parent.json').read_text())
    for row in inv['observedResources']:
        url = row['urlPath']
        if url in ('/', '/h5/adapter.js'):
            continue
        src = Path(row['sourcePath'])
        if not src.exists():
            print(f'FATAL inventory source missing: {src}', file=sys.stderr); return 1
        rel_inside = url.removeprefix('/room/').replace('%20', ' ')
        entry = {'group': 'scene'}
        digest = copy(src, ROOM / 'tools/layout-model-v3' / rel_inside, entry)
        if row['dynamicResponse'] is False and digest != row['sha256']:
            print(f'FATAL sha mismatch {rel_inside}', file=sys.stderr); return 1
        manifest.append(entry)
    # 7) 禁物化断言 + 绝对 home 路径扫描
    total = 0
    for e in manifest:
        p = BACKEND / e['rel']
        rel_posix = e['rel']
        low = rel_posix.lower()
        assert '.env' not in os.path.basename(low) and not low.endswith('.log'), rel_posix
        assert 'evidence' not in low and 'pytest_cache' not in low and 'node_modules' not in low, rel_posix
        total += e['bytes']
        if p.suffix in TEXT_SUFFIX or p.name.endswith('.wasm.js'):
            text = p.read_text('utf-8', errors='ignore')
            if '<home>' in text or 'C:\\Users' in text:
                print(f'FATAL absolute home path inside {rel_posix}', file=sys.stderr); return 1
    (BACKEND / 'SNAPSHOT.json').write_text(json.dumps(
        {'generatedBy': 'scripts/snapshot.py', 'files': manifest, 'totalBytes': total,
         'frozenR4Sha256': FROZEN_SHA, 'layoutMirrorSource': 'parent asset-inventory (observed subset)',
         'lazyResourcesPolicy': 'observed subset only for v0; see KNOWN-LIMITATIONS'}, ensure_ascii=False, indent=1), 'utf-8')
    print(f'snapshot ok: {len(manifest)} files, {total} bytes')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
