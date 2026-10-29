# KNOWN-LIMITATIONS — v0.1.0 私用预览

## 平台
- **Windows 实测发现并已修**：中文 Windows 默认 GBK，冻结 H5a 用 `read_text()` 读 UTF-8 schema/policy
  导致 `UnicodeDecodeError` 使 sidecar exit 1。壳层注入 `PYTHONUTF8=1`/`PYTHONIOENCODING=utf-8` 修复，
  未改冻结源码；本机用 ASCII locale 复现同类失败并验证修复。Windows 复测仍待用户确认。
- **Windows 原生启动 NOT_RUN**：构建机为 Linux arm64，无 Windows 实机。已核验：Electron 45.1.0
  win32-x64 与官方 SHASUMS256 逐字匹配；ZIP 已组装（547 文件，约 167 MB）；RoomNPC.exe / python.exe /
  python311.dll / 两枚 native .pyd 均为 PE 0x8664；20 项必需文件齐全；内置 Python 3.11.9 embeddable
  与 15 个 win_amd64 轮子；冻结 R4 bundle 哈希一致；打包后的 backend 用本机解释器实启 capabilities 200。
  真实 Windows 启动/窗口/动作链路仍需你实机确认。
- 需要 Windows 10/11 x64；Electron 45 不支持 Windows 7/8。
- Linux arm64 为本验证平台：Xvfb 无 GPU，需 SwiftShader 软件 WebGL（`--use-gl=angle --use-angle=swiftshader
  --enable-unsafe-swiftshader`）+ 测试进程 `--no-sandbox`（宿主无 setuid chrome-sandbox）。真机有 GPU 时无需这些旗标；
  产品 webPreferences 的 sandbox:true 不变。

## 功能
- 未接入 Hermes 会话自动监听（H6b 未实现）；只有显式按钮命令与手动演示。
- 角色 `avatar.vrm` 是既有验证 fixture（AvatarSample_A），不是用户 D5B 鲸鱼模型；布料/造型/鞋修复未做。
- 动作集仅 lookAround（单动作）+ converse/idle（目标）；其余场景能力（坐/拉椅/冰箱等）runtime 支持但壳未暴露按钮。
- 资产为 observed subset（父侧真实网络清单 50 项）；未执行路径的 lazy 资源未全部物化。
- goal 的 maintaining/succeeded 为长寿目标状态，面板按「非终态」显示，取消用「显式取消」。

## 安全
- 首版未签名：SmartScreen 会提示；README 不引导关闭安全功能。
- 壳 CSP 含 `script-src 'unsafe-eval'`：因冻结 R4 adapter 内置 Ajv 运行时编译 schema；来源仍限同源。
- 自动配对瞬间，配对凭据存在于渲染层内存（与原 H5a 人工粘贴等价）；不持久化、不出进程、不打日志。
- IPC 信任边界校验主框架 + 精确壳 URL；同源 iframe 取不到桥（已负例验证）。

## 打包/工程
- ZIP 已由 `scripts/build-windows.py` 组装，`scripts/verify-windows-package.py` 独立复核通过；
  入口 `dist/releases/RoomNPC-win32-x64/RoomNPC.exe`，产物 `dist/releases/`。
- 未做安装器/自动更新/崩溃上报；未签名。
- 每次启动全新 epoch，无跨启动历史（sidecar 内存态，符合 persistence=memory-only）。
