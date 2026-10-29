"""桌面 sidecar 入口（打包副本内，非原仓库文件）。

原 H5a server 原样 import；仅两类路由对象替换（仿 H6 transport-r4/run-server.py 的
swap_h5_mount，断言只改目标路由、其余 route 对象身份不变）：
  1) '/h5' static mount → 本目录 dist-r4/（冻结 R4 bundle，boot 时核 SHA256）
  2) Route('/') index  → 本目录 shell/（中文窄壳；追加 Mount('/', html=True) 到末尾）
凭据只来自 H5_* 进程环境（与 H5a run.py 同契约），不读 .env、不打印任何凭据。
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
DIST_R4 = HERE / 'dist-r4'
SHELL = HERE / 'shell'
FROZEN_SHA256 = '0ba29206942e2f8caf898f358788897dc8d6ac12959910c08e5b81e5b43ab619'


def verify_frozen_bundle() -> None:
    adapter = DIST_R4 / 'adapter.js'
    digest = hashlib.sha256(adapter.read_bytes()).hexdigest()
    if digest != FROZEN_SHA256:
        raise SystemExit(f'frozen R4 bundle hash mismatch: {digest}')


def swap_h5_mount(routes: list, directory: Path):
    hits = [i for i, route in enumerate(routes)
            if type(route).__name__ == 'Mount' and getattr(route, 'path', '') == '/h5']
    if len(hits) != 1:
        raise AssertionError(f'expected exactly one /h5 mount, found {len(hits)}')
    before = [id(route) for route in routes]
    from starlette.routing import Mount
    from starlette.staticfiles import StaticFiles
    replaced = routes[hits[0]]
    routes[hits[0]] = Mount('/h5', app=StaticFiles(directory=directory), name=getattr(replaced, 'name', None))
    changed = [i for i in range(len(routes)) if before[i] != id(routes[i])]
    if changed != [hits[0]]:
        raise AssertionError(f'unexpected route object changes: {changed}')
    return replaced


def swap_index_route(routes: list, shell_dir: Path):
    hits = [i for i, route in enumerate(routes)
            if type(route).__name__ == 'Route' and getattr(route, 'path', '') == '/']
    if len(hits) != 1:
        raise AssertionError(f'expected exactly one / index route, found {len(hits)}')
    removed = routes[hits[0]]
    remaining_ids = [id(r) for j, r in enumerate(routes) if j != hits[0]]
    routes.pop(hits[0])
    if [id(r) for r in routes] != remaining_ids:
        raise AssertionError('unexpected route list change after index removal')
    from starlette.routing import Mount
    from starlette.staticfiles import StaticFiles
    routes.append(Mount('/', app=StaticFiles(directory=shell_dir, html=True), name='shell'))
    return str(removed.path)


def main() -> int:
    verify_frozen_bundle()
    import os
    import uvicorn
    from config import Config
    from server import create_app

    app = create_app(testing=False)  # 从 H5_* 环境加载，与 H5a run.py 相同
    routes = app.router.routes
    replaced = swap_h5_mount(routes, DIST_R4)
    index = swap_index_route(routes, SHELL)
    config = app.state.broker.config
    assert config.origin.startswith('http://127.0.0.1:'), config.origin
    port = int(config.origin.rsplit(':', 1)[1])
    print(json.dumps({'event': 'ready', 'origin': config.origin, 'runtimeId': config.runtime_id,
                      'replacedRoutes': 2, 'replacedPaths': ['/h5', index],
                      'h5Dist': str(DIST_R4), 'wsMaxSize': 65536}), flush=True)
    uvicorn.run(app, host='127.0.0.1', port=port, workers=1, ws_max_size=65536,
                access_log=False, log_level='warning')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
