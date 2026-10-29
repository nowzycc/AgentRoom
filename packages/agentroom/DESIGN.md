# DESIGN — RoomNPC Desktop (Electron E1 候选壳)

分层：Electron main（生命周期/进程边界） / preload（窄桥） / renderer 壳（展示+显式命令） /
sidecar（原 H5a Python 服务 + 冻结 R4 adapter，快照副本）。领域执行全在既有 runtime，壳不新增 executor。

## 1. main/main.js（唯一进程协调者）
- 单实例锁：`requestSingleInstanceLock`；第二实例 `app.exit(0)`，不 spawn sidecar；`second-instance` 只聚焦既有窗口。
- 每 boot 新 epoch：随机 loopback 端口（bind 0 分配后关闭）+ `runtime-<ts36>-<hex>` + 两个独立 32B token；
  只经 `H5_*` env 传 sidecar；不落盘、不打日志；renderer 仅能一次性取走配对凭据（`npc:take-pair-credential` 取后即焚）。
- sidecar：spawn `run-desktop.py`（快照内 H5a 目录），`cwd=h5aDir`；stderr 有界尾随（服务端只输出 hop 元数据）。
  就绪只信 `GET /api/h5a/capabilities`（Bearer harness）返回 200 且 `apiVersion==='h5a.1'`，30s 超时即 fatal。
- scope：直接采用 capabilities.scope 完整原值（不从 brokerEpoch 拼装）。
- 命令通路：shell 按钮 → IPC（信任边界=同 WebContents + senderFrame 为主框架 + frame.url===origin+'/'，payload 白名单校验）
  → main 以 harness token POST `/api/h5a/commands|cancel` → 轮询 `GET /commands/{id}?brokerEpoch=...` 推送回执。
  回执契约=H5a `broker.delivery()`：有 `kind/status` 即顶层 receipt；否则 admission `{delivery:'pending'|'unknown', lastReceipt?}`。
  settled 语义只读复刻 `receipts.settled`（goal 仅 withdrawn/rejected；maintaining/succeeded 是长寿 goal 不当 single terminal）。
- POST 网络错：不自动重发、不换 ID；保留原 commandId 返回 `unknown`，允许凭原 ID 查询（短轮询 6 次）。
- 窗口安全：contextIsolation/nodeIntegration:false、sandbox/webSecurity:true、内存分区 `npc-epoch-<runtimeId>`（cookie 随进程消亡）、
  权限默认拒绝、setWindowOpenHandler deny、will-attach-webview 阻止、will-navigate 仅放行同源。
- 失败边界：`fatalExit` = dialog → destroy window → `stopSidecar()`（SIGTERM→5s→SIGKILL；win32 taskkill /T /F）→ `app.exit(1)`。
  正常退出路径 window-all-closed→before-quit→同 cleanup。启动失败/缺运行时给出中文错误，不吞。

## 2. preload/main/preload.js
仅暴露：`takePairCredential()`（一次性）、`sendCommand/sendCancel`（校验后代理）、`requestExit`、`onCommandUpdate`。
不暴露 ipcRenderer/fs/shell/任意执行。

## 3. renderer 壳（renderer/* → 快照 H5a/shell/，由 sidecar 以同源 '/' 服务）
- 全屏 `#scene` iframe（原 scene.html 不改）+ 可折叠中文面板：连接态、实际姿态/相位（`__h5.snapshot().actual`）、
  命令按钮（环顾/converse/idle/显式取消/退出）、回执列表。
- `#credential`(隐藏)/`#connect`(隐藏)/`#status` 保留：冻结 adapter 的 UI 契约；自动配对=等待 `window.__h5` 出现（即 adapter 已绑定
  click）→ 取一次性凭据 → 填入 → click；凭据立即被 adapter 清空，不写任何持久层。
- CSP：`script-src 'self' 'unsafe-eval'`——'unsafe-eval' 仅因冻结 R4 bundle 内置 Ajv 运行时编译 schema（new Function）；
  来源仍限同源。命令完成 ≠ 动作完成：面板分开显示回执与实际姿态/相位。

## 4. sidecar（backend/room 快照；scripts/snapshot.py 生成）
- 保原路径层级：`room/tools/npc-v2/hardening/H5a/`（7 个原 py + run-desktop.py）、`H4-closeout/schema/`、
  `packages/npc-contracts/schemas/`——满足 config.ROOT=parents[4] 与 protocol.py 的 HERE/ROOT 相对查找。
- `run-desktop.py`：import 原 `server.create_app()`，唯二路由对象替换（身份断言，仿 H6 transport-r4/run-server.py）：
  `/h5` mount → `dist-r4/`（冻结 R4，boot 时核 SHA256=0ba29206…，不符即拒启）；原 `Route('/')` index → 追加 shell 目录
  Mount('/', html=True) 于路由表末尾。其余路由对象不变。凭据只来自 env；`H5_QUIESCENT=confirmed` 由 main 设置
  （main 拥有唯一窗口生命周期）。
- layout 瘦镜像：父侧真实网络 inventory（50 observed 资源，逐文件 SHA256 校验后物化，assets 软链解为实体文件）。
- 占位 `dist/`：原 create_app() 构造期即实例化 StaticFiles(H5a/dist)，目录必须存在；boot 后即被替换，永不参与服务。
- 禁入快照：.env*、*.log、evidence、.pytest_cache、node_modules、archive、绝对 home 路径（脚本断言）。

## 5. 打包形态
- 源码（main/preload/renderer/backend 快照）→ app.asar；`backend/**` 标 unpack（Python 无法读 asar）→ app.asar.unpacked。
- Windows：官方预编译 electron win32-x64（SHASUMS256 核验）+ 官方 embeddable Python 3.11.9 amd64 + win_amd64 纯/native 轮子
  预装 site-packages（python311._pth 启用 site）。开箱即用，不要求用户装 Python/Node。
- dev-run：`backend/python-linux.path` 指向本机 venv（setup 写入，非 secret）。

## 6. 已知取舍
- 渲染层可见配对凭据一瞬（与原 H5a「人工粘贴」等价的自动化形态），凭据不持久化、不出进程。
- unsafe-eval 见 §3；无签名（SmartScreen 提示）；无自动更新。
