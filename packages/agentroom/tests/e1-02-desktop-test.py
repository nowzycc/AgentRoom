#!/usr/bin/env python3
"""E1-02 桌面实测：Xvfb + 官方 arm64 Electron + 真实 sidecar + 真实 scene。
一条 lookAround 到终态（accepted→started→succeeded 同 attempt）+ 取消/重复/second-instance
+ 真实截图 + 退出清理。结果写 tests/e1-02-result.json。失败即非零退出。
说明：宿主无 setuid chrome-sandbox，测试进程加 --no-sandbox（仅影响本机测试层；
packaged Windows 不使用该层；产品 webPreferences 的 sandbox:true 不变）。
"""
from __future__ import annotations
import asyncio
import base64
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

PKG = Path('<repo>/packages/agentroom')
ELECTRON = PKG / 'vendor/electron-linux-arm64/electron'
APPDIR = PKG
PY = (PKG / 'backend/python-linux.path').read_text().strip()
ENVIRON = dict(os.environ, DISPLAY=':99', ELECTRON_ENABLE_LOGGING='0')
RESULTS: dict = {'steps': {}, 'ok': False}
DBG = True


def log(*a):
    if DBG:
        print(*a, flush=True)


def step(name, ok, detail):
    RESULTS['steps'][name] = {'ok': bool(ok), 'detail': detail}
    log(('PASS ' if ok else 'FAIL ') + name, detail if not ok else '')


def wait_port_from_stderr(proc, timeout=40):
    import re
    t0 = time.time()
    while time.time() - t0 < timeout:
        line = proc.stderr.readline().decode('utf-8', 'ignore') if proc.stderr else ''
        m = re.search(r'DevTools listening on ws://127\.0\.0\.1:(\d+)', line)
        if m:
            return int(m.group(1))
        if proc.poll() is not None:
            raise RuntimeError('electron 早退 code=' + str(proc.returncode))
        time.sleep(0.05)
    raise RuntimeError('未拿到 DevTools 端口')


class CDP:
    def __init__(self, port):
        import urllib.request
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list', timeout=5) as r:
            targets = json.load(r)
        page = next(t for t in targets if t['type'] == 'page' and 'devtoolsFrontendUrl' in t)
        self.ws_url = page['webSocketDebuggerUrl']
        self._id = 0
        self._pending = {}
        self._events = []
        import websocket  # websocket-client 不在 venv；改用 websockets 异步？此处用同步轮询线程
        raise RuntimeError('use cdp_async')

    async def connect(self):
        import websockets
        self.ws = await websockets.connect(self.ws_url, max_size=64 * 1024 * 1024)

    async def call(self, method, **params):
        import asyncio
        self._id += 1
        mid = self._id
        await self.ws.send(json.dumps({'id': mid, 'method': method, 'params': params}))
        while True:
            raw = await asyncio.wait_for(self.ws.recv(), timeout=30)
            msg = json.loads(raw)
            if msg.get('id') == mid:
                if 'error' in msg:
                    raise RuntimeError(f'{method}: {msg["error"]}')
                return msg.get('result', {})
            self._events.append(msg)

    async def eval_js(self, expr):
        r = await self.call('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True)
        return r.get('result', {}).get('value')


async def main() -> int:
    import asyncio
    import websockets

    xvfb = subprocess.Popen(['Xvfb', ':99', '-screen', '0', '1280x800x24'])
    await asyncio.sleep(1.2)
    electron = None
    try:
        # 宿主无 GPU/X：强制 SwiftShader 软件 WebGL（仅测试环境；真机 Windows 用默认 GL 路径）
        cmd = [str(ELECTRON), '--no-sandbox', '--disable-dev-shm-usage',
               '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
               '--remote-debugging-port=0', str(APPDIR)]
        electron = subprocess.Popen(cmd, env=ENVIRON, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        port = wait_port_from_stderr(electron)
        step('electron-boot', True, f'devtools port {port}')
        RESULTS['devtoolsPort'] = port

        import urllib.request
        ws = None
        page = None
        t0 = time.time()
        while ws is None and time.time() - t0 < 40:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list', timeout=5) as r:
                    targets = json.load(r)
                pages = [t for t in targets if t['type'] == 'page']
                page = next((t for t in pages if t.get('url', '').startswith('http://127.0.0.1:')), pages[0] if pages else None)
                if page is None:
                    await asyncio.sleep(0.5)
                    continue
                try:
                    ws = await websockets.connect(page['webSocketDebuggerUrl'], max_size=64 * 1024 * 1024)
                except Exception:
                    await asyncio.sleep(0.5)  # 初始导航竞态：目标重建后重连
            except Exception:
                await asyncio.sleep(0.5)
        if ws is None:
            raise RuntimeError('40s 内无法连接页面 CDP 目标')
        cdp = CDP.__new__(CDP)
        cdp.ws_url = page['webSocketDebuggerUrl']
        cdp._id = 0
        cdp._events = []

        async def call(method, **params):
            cdp._id += 1
            mid = cdp._id
            await ws.send(json.dumps({'id': mid, 'method': method, 'params': params}))
            while True:
                raw = await asyncio.wait_for(ws.recv(), timeout=60)
                msg = json.loads(raw)
                if msg.get('id') == mid:
                    if 'error' in msg:
                        raise RuntimeError(f'{method}: {msg["error"]}')
                    return msg.get('result', {})

        async def ev(expr):
            r = await call('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True)
            res = r.get('result', {})
            if res.get('subtype') == 'error':
                return {'__evalError': res.get('description', '')}
            return res.get('value')

        # 1) 页面 boot + 配对完成（__h5 出现且 connected）
        t0 = time.time()
        paired = False
        boot_detail = ''
        while time.time() - t0 < 90:
            state = await ev('(() => ({ h5: Boolean(window.__h5), conn: window.__h5 ? Boolean(window.__h5.connected()) : false,'
                             ' status: document.querySelector("#status") ? document.querySelector("#status").textContent : null }))()')
            if state and state.get('h5') and state.get('conn'):
                paired = True
                boot_detail = json.dumps(state, ensure_ascii=False)
                break
            await asyncio.sleep(0.5)
        step('boot-paired', paired, boot_detail or '90s 内未 connected')
        if not paired:
            shot = await call('Page.captureScreenshot', format='png')
            (PKG / 'tests/boot-fail.png').write_bytes(base64.b64decode(shot['data']))
            return finish(1)

        # 2) 真实截图（场景已渲染）
        await asyncio.sleep(3)  # 给 three.js 首帧余量
        shot = await call('Page.captureScreenshot', format='png')
        png = base64.b64decode(shot['data'])
        out = PKG / 'tests/e1-02-desktop.png'
        out.write_bytes(png)
        nonempty = png[:8] == b'\x89PNG\r\n\x1a\n' and len(png) > 50_000
        step('screenshot', nonempty, f'{len(png)} bytes -> {out}')

        # 3) lookAround 一条到终态
        r = await ev('window.npcDesktop.sendCommand({kind:"lookAround"})')
        log('lookAround submit:', r)
        cmd_id = (r or {}).get('commandId')
        submit_ok = bool(cmd_id) and not (r or {}).get('unknown')
        step('look-submit', submit_ok, json.dumps(r, ensure_ascii=False))
        trace_seen, succeeded = [], False
        t0 = time.time()
        while time.time() - t0 < 30:
            tr = await ev('window.__h5 ? window.__h5.trace().filter(x => x.commandId === "' + str(cmd_id) + '") : []')
            if tr:
                trace_seen = tr
                last = tr[-1]
                if last.get('kind') == 'action' and last.get('status') == 'succeeded' and last.get('terminal'):
                    succeeded = True
                    break
            await asyncio.sleep(0.4)
        statuses = [x.get('status') for x in trace_seen]
        same_attempt = len({(x.get('attemptId')) for x in trace_seen if x.get('attemptId')}) <= 1
        step('lookAround-terminal', succeeded and same_attempt,
             f'statuses={statuses} attemptIds={[x.get("attemptId") for x in trace_seen]}')
        RESULTS['lookAround'] = {'commandId': cmd_id, 'statuses': statuses, 'trace': trace_seen}

        # 4) 重复提交（快速两次）：受控（不崩、各有回执/拒绝）
        r1 = await ev('window.npcDesktop.sendCommand({kind:"lookAround"})')
        r2 = await ev('window.npcDesktop.sendCommand({kind:"lookAround"})')
        dup_ok = bool((r1 or {}).get('commandId')) and bool((r2 or {}).get('commandId'))
        await asyncio.sleep(3)
        alive = await ev('Boolean(window.__h5) && document.querySelectorAll("iframe").length === 1')
        step('duplicate-controlled', dup_ok and alive, json.dumps({'r1': r1, 'r2': r2, 'pageAlive': alive}, ensure_ascii=False))

        # 5) 显式取消：发一条新 lookAround 后立刻取消其命令
        r3 = await ev('window.npcDesktop.sendCommand({kind:"lookAround"})')
        cid3 = (r3 or {}).get('commandId')
        rc = await ev(f'window.npcDesktop.sendCancel({{"kind":"action","commandId":"{cid3}"}})')
        cancel_ok = bool((rc or {}).get('commandId'))
        cancelled_seen = False
        t0 = time.time()
        while time.time() - t0 < 15:
            tr = await ev('window.__h5.trace()')
            for x in tr:
                if x.get('kind') == 'cancel' and x.get('targetReceipt') is not None:
                    cancelled_seen = True
                    break
                if x.get('kind') == 'action' and x.get('commandId') == cid3 and x.get('status') in ('cancelled', 'succeeded', 'failed'):
                    cancelled_seen = True
                    break
            if cancelled_seen:
                break
            await asyncio.sleep(0.4)
        step('explicit-cancel', cancel_ok and cancelled_seen, json.dumps({'submit': r3, 'cancel': rc}, ensure_ascii=False))

        # 6) 安全负例：iframe 内桥不可用 + 权限拒绝（IPC frame 边界）
        neg = await ev('''(async () => {
          const f = document.querySelector('#scene');
          const win = f.contentWindow;
          return { iframeBridge: Boolean(win.npcDesktop), frames: window.length };
        })()''')
        step('ipc-frame-boundary', neg and neg.get('iframeBridge') is False, json.dumps(neg))

        # 7) second-instance：第二实例快速退出
        second = subprocess.Popen([str(ELECTRON), '--no-sandbox', str(APPDIR)], env=ENVIRON,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        t0 = time.time()
        while second.poll() is None and time.time() - t0 < 15:
            await asyncio.sleep(0.2)
        si_code = second.poll()
        step('second-instance', si_code is not None and si_code == 0, f'exit={si_code}')

        # 8) 退出清理：#btn-exit → app 退出 + sidecar 进程消失
        await ev('document.querySelector("#btn-exit").click()')
        t0 = time.time()
        while electron.poll() is None and time.time() - t0 < 15:
            await asyncio.sleep(0.2)
        exit_code = electron.poll()
        ps = subprocess.run(['pgrep', '-f', 'run-desktop.py'], capture_output=True, text=True).stdout.strip()
        step('exit-cleanup', exit_code is not None and ps == '', f'electron exit={exit_code} sidecar_pids={ps!r}')
        RESULTS['ok'] = all(v['ok'] for v in RESULTS['steps'].values())
        return 0 if RESULTS['ok'] else 1
    except Exception as e:
        step('exception', False, f'{type(e).__name__}: {e}')
        return finish(1)
    finally:
        if electron and electron.poll() is None:
            electron.kill()
        xvfb.terminate()


def finish(code: int) -> int:
    RESULTS['ok'] = all(v['ok'] for v in RESULTS['steps'].values()) and code == 0
    out = PKG / 'tests/e1-02-result.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(RESULTS, ensure_ascii=False, indent=1))
    print('RESULT-OK' if RESULTS['ok'] else 'RESULT-FAIL', out)
    return code


if __name__ == '__main__':
    rc = asyncio.run(main())
    sys.exit(finish(rc))
