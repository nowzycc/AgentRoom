#!/usr/bin/env python3
"""AgentRoom MCP 启动器（契约 CONTRACT-AGENT-V1 W1）。

读取桌面版写入的 connection.json（sidecar 连接事实），映射为 NPC_MCP_*
环境变量后进入官方 npc_mcp stdio 服务。

规则（契约第 45-58 行）：
- 解析顺序：--connection-file > AGENTROOM_CONNECTION_FILE > 默认路径。
- 同时存在 NPC_MCP_BASE_URL 与 NPC_MCP_TOKEN 时直接透传，不读文件。
- 配置问题（缺文件/坏 JSON/缺字段/地址非法）：stderr 输出不含凭据的中文
  错误，exit 2。
- 不打印 token，不写日志文件；stdout 只属于 MCP 协议通道，
  诊断信息一律走 stderr。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

EXIT_OK = 0
EXIT_CONFIG_ERROR = 2

# Windows consoles default to a legacy code page; Chinese diagnostics would be
# escaped as \uXXXX and break MCP hosts that match on the message text.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="backslashreplace")  # type: ignore[attr-defined]
        except OSError:
            pass


def _prepare_windows_dlls() -> None:
    """pywin32 wheels need their DLL dir registered when no postinstall ran.

    mcp.server.stdio imports win32api/pywintypes on Windows, so this must run
    before npc_mcp is imported.
    """
    if sys.platform != "win32":
        return
    base = Path(sys.executable).resolve().parent
    candidates = [
        base / "Lib" / "site-packages" / "pywin32_system32",
        base / "pywin32_system32",
        base / "Lib" / "site-packages" / "win32" / "lib",
    ]
    for candidate in candidates:
        if candidate.is_dir():
            try:
                os.add_dll_directory(str(candidate))
            except OSError:
                continue
            os.environ["PATH"] = str(candidate) + os.pathsep + os.environ.get("PATH", "")


_prepare_windows_dlls()

CONNECTION_ENV_VAR = "AGENTROOM_CONNECTION_FILE"

# connection.json 参与映射的字段 -> NPC_MCP_* 环境变量（顺序即映射关系）
MAPPING_FIELDS = {
    "origin": "NPC_MCP_BASE_URL",
    "harnessToken": "NPC_MCP_TOKEN",
    "worldId": "NPC_MCP_WORLD_ID",
    "actorId": "NPC_MCP_ACTOR_ID",
}
# 契约固定值；观察者 ID 必须与 actor 不同（npc-harness 校验）
FIXED_ENV = {
    "NPC_MCP_SOURCE": "agentroom:local",
    "NPC_MCP_SESSION_ID": "agentroom-session",
    "NPC_MCP_OBSERVER_ID": "agentroom-observation",
}
SUPPORTED_VERSION = 1
# --print-config 只允许输出这些非敏感字段
PRINT_FIELDS = ("origin", "worldId", "actorId", "runtimeId")


class ConfigError(Exception):
    """连接文件/环境变量配置问题；消息必须不含凭据。"""


def default_connection_path() -> Path:
    """契约第 28-29 行：Windows 用 %LOCALAPPDATA%，其余用 XDG state 目录。"""
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA", "").strip()
        if not base:
            raise ConfigError("未找到 LOCALAPPDATA，无法推导默认连接文件路径")
        return Path(base) / "AgentRoom" / "connection.json"
    state_home = os.environ.get("XDG_STATE_HOME", "").strip()
    if not state_home:
        state_home = str(Path.home() / ".local" / "state")
    return Path(state_home) / "agentroom" / "connection.json"


def resolve_connection_file(explicit: str) -> Path:
    if explicit.strip():
        return Path(explicit)
    env_path = os.environ.get(CONNECTION_ENV_VAR, "").strip()
    if env_path:
        return Path(env_path)
    return default_connection_path()


def _origin_port(u) -> int | None:
    try:
        return u.port
    except ValueError:
        return None


def _require_loopback_origin(origin: str) -> None:
    """与 npc-harness 的校验一致：http://127.0.0.1:<port>，无附加部分。"""
    u = urlsplit(origin)
    ok = (
        u.scheme == "http"
        and u.hostname == "127.0.0.1"
        and bool(_origin_port(u))
        and not u.username
        and not u.password
        and not u.path
        and not u.query
        and not u.fragment
    )
    if not ok:
        raise ConfigError("origin 必须是带显式端口的 http://127.0.0.1 本机地址")


def load_connection(path: Path) -> dict:
    """读取并校验 connection.json；任何失败都以不含凭据的 ConfigError 抛出。"""
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise ConfigError(f"连接文件不存在：{path}") from None
    except (OSError, ValueError, UnicodeDecodeError):
        raise ConfigError(f"连接文件无法读取：{path}") from None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ConfigError(f"连接文件不是有效 JSON：{path}") from None
    if not isinstance(data, dict):
        raise ConfigError(f"连接文件顶层必须是 JSON 对象：{path}")
    version = data.get("version", SUPPORTED_VERSION)
    if version != SUPPORTED_VERSION:
        raise ConfigError(f"不支持的连接文件版本：{version!r}（期望 {SUPPORTED_VERSION}）")
    missing = sorted(f for f in MAPPING_FIELDS if not str(data.get(f) or "").strip())
    if missing:
        raise ConfigError("连接文件缺少必需字段：" + "、".join(missing))
    _require_loopback_origin(str(data["origin"]))
    if str(data["actorId"]).strip() == FIXED_ENV["NPC_MCP_OBSERVER_ID"]:
        raise ConfigError("actorId 不能与固定观察者 ID 相同")
    return data


def apply_connection(data: dict) -> dict:
    """把 connection.json 映射进进程环境，返回可打印的非敏感信息。"""
    for field, env_name in MAPPING_FIELDS.items():
        os.environ[env_name] = str(data[field])
    for env_name, value in FIXED_ENV.items():
        os.environ[env_name] = value
    return {field: data.get(field) for field in PRINT_FIELDS}


def passthrough_info() -> dict:
    """直连透传模式下可打印的信息（runtimeId 只有连接文件里才有）。"""
    return {
        "origin": os.environ.get("NPC_MCP_BASE_URL", "").strip() or None,
        "worldId": os.environ.get("NPC_MCP_WORLD_ID", "").strip() or None,
        "actorId": os.environ.get("NPC_MCP_ACTOR_ID", "").strip() or None,
        "runtimeId": None,
    }


def run_server() -> None:
    """延迟导入：--print-config 与配置错误路径不需要 npc-mcp 依赖已安装。"""
    try:
        from npc_mcp.server import main as server_main
    except ImportError as error:
        missing = getattr(error, "name", None) or error
        raise ConfigError(
            f"MCP 服务依赖不可用（缺少 {missing}）："
            "请安装 requirements-win.txt 中的依赖，或使用随包内置的 Python 运行时"
        ) from None
    server_main()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="launch.py",
        description="AgentRoom MCP stdio 启动器（读取 connection.json 并映射 NPC_MCP_* 环境变量）",
    )
    parser.add_argument(
        "--connection-file",
        default="",
        help="connection.json 路径；缺省依次回退 AGENTROOM_CONNECTION_FILE 与平台默认路径",
    )
    parser.add_argument(
        "--print-config",
        action="store_true",
        help="只打印非敏感字段（origin/worldId/actorId/runtimeId）后退出，供测试与诊断",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    base_url = os.environ.get("NPC_MCP_BASE_URL", "").strip()
    token = os.environ.get("NPC_MCP_TOKEN", "")
    if base_url and token:
        # 契约第 55 行：已有直连环境变量时透传，不读文件。
        info = passthrough_info()
        _require_loopback_origin(info["origin"] or "")
    elif base_url or token:
        raise ConfigError(
            "直连环境变量不完整：需要同时设置 NPC_MCP_BASE_URL 与 NPC_MCP_TOKEN"
        )
    else:
        path = resolve_connection_file(args.connection_file)
        info = apply_connection(load_connection(path))

    if args.print_config:
        print(json.dumps(info, ensure_ascii=False))
        return EXIT_OK

    run_server()
    return EXIT_OK


def cli() -> int:
    try:
        return main()
    except ConfigError as error:
        print(f"launch: {error}", file=sys.stderr)
        return EXIT_CONFIG_ERROR


if __name__ == "__main__":
    sys.exit(cli())
