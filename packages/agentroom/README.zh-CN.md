# AgentRoom · 私用预览 v0.1.0（Electron E1）

这是把现有「真实 NPC 场景 + H5a 本机服务 + 冻结 R4 传输」装进桌面窗口的第一版**私用预览**。
仅供资源所有者本人本地测试，**不公开发布、不再分发**。

## 它是什么 / 不是什么
- 是：桌面窗口里运行的既有真实 NPC 场景（未改动场景与 runtime）；显式按钮发命令
  （环顾一次 / converse / idle / 取消 / 退出），并诚实显示命令回执与实际姿态。
- 不是：自动接入 Hermes 会话监听（H6b 未实现）；不是高保真布料/造型/鞋修复版；
  不是最终发行版（未签名、无安装器、无自动更新）。

## Windows x64 启动
1. 解压 `AgentRoom-win32-x64-0.1.0.zip` 到任意目录（例如 `D:\RoomNPC`，路径不要有中文也可）。
2. 双击 `AgentRoom-win32-x64\AgentRoom.exe`。
3. 首次运行 Windows SmartScreen 可能提示「未知发布者」——这是**未签名**应用的正常提示；
   请自行确认来源后选择「仍要运行」，**不要因此关闭系统安全功能**。
4. 窗口出现即表示本机 sidecar 已就绪（每次启动都是全新会话；关闭窗口即清理）。
5. 需要 Windows 10/11 x64（Electron 45 不支持更早系统）。

> 包 SHA256：`87520cd070ce6557ccf3caafa50d8beab45bc7db42d9e913f16c70b8eb2cbe42`（含 MCP + Skill 接入）
> 状态：Windows 包**已组装并通过静态校验**（PE x64、资源齐全、内置 Python 3.11.9）。
> Windows 原生启动仍为 NOT_RUN（构建机无 Windows 实机），由你实机验证。

## 接入 agent（v1：MCP + Skill）

首次启动会弹出四屏向导（自检 → 选择 agent → 写入配置/安装 Skill → 连通测试）。
之后可从菜单 **AgentRoom → 接入设置…** 重开。

支持两个宿主，均为**同机**接入：

| 宿主 | 配置写入点 | Skill 安装点 |
|---|---|---|
| Hermes | `<HERMES_HOME>/config.yaml` 的 `mcp_servers.agentroom` | `<HERMES_HOME>/skills/agentroom` |
| DeepSeek Harness | `<DSH_HOME>/profiles/<profile>/cordis.patch.yml` | `<DSH_HOME>/skills/agentroom` |

- 桌面版每次启动随机端口与 token，写入
  `%LOCALAPPDATA%\AgentRoom\connection.json`（退出即删）；MCP 启动器读它完成鉴权。
- MCP server 名为 `agentroom`，7 个工具：`npc_capabilities`、`npc_snapshot`、
  `npc_publish_observations`、`npc_request_action`、`npc_request_goal`、
  `npc_query_receipt`、`npc_cancel`。
- **本版没有自动观察**：agent 不会收到房间事件推送；`npc_publish_observations` 只是显式上报。
- **跨机接入（Hermes 在另一台 Linux）尚未支持**，向导会明确标为不可用。

## 使用
- 右上「状态 / 命令」面板可折叠。
- 「环顾（单次）」发一次 lookAround；回执列表显示 pending/accepted/started/终态；
  **动作是否真的完成看「实际姿态/相位」**，命令回执完成不等于动作完成。
- converse / idle 为目标命令（长寿目标，maintaining 不是终态）。
- 「显式取消」取消最近一条未结清命令；「退出」安全关闭并清理本机服务。

## 许可与归属（摘要，随包另附全文）
- 场景/模型/动画资产为原项目既有资产，许可各不相同（CMU 动捕需署名；Mixamo 衍生仅私用；
  VRM 角色 AvatarSample_A：VRoid/pixiv 官方条款，可应用内使用，**不是 CC0/MIT**，禁改称许可、
  禁收费再分发模型原文件）。房间场景含 PolyHaven CC0 资产。
- 本包为私用本地测试包：保存原始许可与归属，不得用于公开分发。

## 隐私与安全
- 服务只监听 127.0.0.1 随机端口；每次启动生成新凭据，不落盘、不打日志。
- 窗口只加载本机同源页面；禁止新窗口、外部导航、相机/麦克风等权限。
- 无遥测、无网络上报。
