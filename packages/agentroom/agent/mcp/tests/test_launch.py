#!/usr/bin/env python3
"""W1 launch.py 测试。

运行方式（任选其一，均可直接跑）：
    python3 packages/agentroom/agent/mcp/tests/test_launch.py
    python3 -m unittest packages.agentroom.agent.mcp.tests.test_launch  # 不适用（非包），用下面的
    python3 -m unittest discover -s packages/agentroom/agent/mcp/tests -t packages/agentroom/agent/mcp/tests
    python3 -m pytest packages/agentroom/agent/mcp/tests/test_launch.py

只覆盖配置/映射层：服务本体（npc_mcp）在测试里用临时 stub 替身，
不依赖 mcp==2.3.0 等真实依赖，不联网，不长期占用端口。
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAUNCH = HERE.parent / "launch.py"

TOKEN = "harness-token-S3cret-ABC123"
ORIGIN = "http://127.0.0.1:19090"

# launch.py 会消费/透传的环境变量，测试子进程必须先剥离，避免宿主环境污染
PROTECTED_ENV = (
    "AGENTROOM_CONNECTION_FILE",
    "NPC_MCP_BASE_URL",
    "NPC_MCP_TOKEN",
    "NPC_MCP_WORLD_ID",
    "NPC_MCP_ACTOR_ID",
    "NPC_MCP_SOURCE",
    "NPC_MCP_SESSION_ID",
    "NPC_MCP_OBSERVER_ID",
)

STUB_DUMP_VAR = "NPC_MCP_TEST_DUMP"

STUB_SERVER_PY = '''"""测试替身：记录 launch.py 注入的环境变量后立即退出。"""
import json, os, sys
_keys = ["NPC_MCP_BASE_URL", "NPC_MCP_TOKEN", "NPC_MCP_WORLD_ID", "NPC_MCP_ACTOR_ID",
         "NPC_MCP_SOURCE", "NPC_MCP_SESSION_ID", "NPC_MCP_OBSERVER_ID"]
with open(os.environ["%s"], "w", encoding="utf-8") as _f:
    json.dump({k: os.environ.get(k) for k in _keys}, _f)


def main():
    sys.exit(0)
''' % STUB_DUMP_VAR


def base_env(extra: dict | None = None) -> dict:
    env = {k: v for k, v in os.environ.items() if k not in PROTECTED_ENV}
    if extra:
        env.update(extra)
    return env


def run_launch(args: list[str], extra_env: dict | None = None):
    return subprocess.run(
        [sys.executable, str(LAUNCH), *args],
        capture_output=True,
        text=True,
        env=base_env(extra_env),
        timeout=60,
    )


def write_connection(directory: Path, **overrides) -> Path:
    data = {
        "version": 1,
        "origin": ORIGIN,
        "harnessToken": TOKEN,
        "runtimeId": "runtime-xyz",
        "worldId": "apartment-v3",
        "actorId": "npc-a",
        "pid": 12345,
        "startedAt": "2026-10-29T10:00:00.000Z",
    }
    data.update(overrides)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "connection.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


class PrintConfigTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix="agentroom-launch-test-")
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)

    def test_print_config_from_flag_file(self):
        path = write_connection(self.tmp)
        result = run_launch(["--connection-file", str(path), "--print-config"])
        self.assertEqual(result.returncode, 0, result.stderr)
        info = json.loads(result.stdout)
        self.assertEqual(info, {
            "origin": ORIGIN,
            "worldId": "apartment-v3",
            "actorId": "npc-a",
            "runtimeId": "runtime-xyz",
        })
        self.assertNotIn(TOKEN, result.stdout + result.stderr)

    def test_connection_file_flag_beats_env_var(self):
        flag_file = write_connection(self.tmp / "a", origin="http://127.0.0.1:20001")
        env_file = write_connection(self.tmp / "b", origin="http://127.0.0.1:20002")
        result = run_launch(
            ["--connection-file", str(flag_file), "--print-config"],
            {"AGENTROOM_CONNECTION_FILE": str(env_file)},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["origin"], "http://127.0.0.1:20001")

    def test_env_var_used_without_flag(self):
        path = write_connection(self.tmp, origin="http://127.0.0.1:20003")
        result = run_launch(["--print-config"], {"AGENTROOM_CONNECTION_FILE": str(path)})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["origin"], "http://127.0.0.1:20003")
        self.assertNotIn(TOKEN, result.stdout + result.stderr)

    def test_passthrough_env_without_file(self):
        result = run_launch(
            ["--print-config"],
            {
                "NPC_MCP_BASE_URL": "http://127.0.0.1:20004",
                "NPC_MCP_TOKEN": TOKEN,
                "NPC_MCP_WORLD_ID": "apartment-v3",
                "NPC_MCP_ACTOR_ID": "npc-a",
            },
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        info = json.loads(result.stdout)
        self.assertEqual(info["origin"], "http://127.0.0.1:20004")
        self.assertIsNone(info["runtimeId"])
        self.assertNotIn(TOKEN, result.stdout + result.stderr)


class ConfigErrorTests(unittest.TestCase):
    """缺文件/坏 JSON/缺字段/非法地址 → exit 2，stderr 中文且不含 token。"""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix="agentroom-launch-err-")
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)

    def assert_config_error(self, result):
        self.assertEqual(result.returncode, 2, f"stdout={result.stdout!r} stderr={result.stderr!r}")
        self.assertTrue(result.stderr.strip(), "stderr 必须有中文错误说明")
        # 只允许报字段名，绝不允许出现 token 值
        self.assertNotIn(TOKEN, result.stdout)
        self.assertNotIn(TOKEN, result.stderr)

    def test_missing_file(self):
        result = run_launch(["--connection-file", str(self.tmp / "nope.json"), "--print-config"])
        self.assert_config_error(result)
        self.assertIn("不存在", result.stderr)

    def test_bad_json(self):
        path = self.tmp / "connection.json"
        path.write_text(json.dumps({"harnessToken": TOKEN})[:-1] + "{{{", encoding="utf-8")
        result = run_launch(["--connection-file", str(path), "--print-config"])
        self.assert_config_error(result)
        self.assertIn("JSON", result.stderr)

    def test_missing_field(self):
        path = write_connection(self.tmp)
        data = json.loads(path.read_text(encoding="utf-8"))
        del data["harnessToken"]
        path.write_text(json.dumps(data), encoding="utf-8")
        result = run_launch(["--connection-file", str(path), "--print-config"])
        self.assert_config_error(result)
        self.assertIn("harnessToken", result.stderr)

    def test_empty_field(self):
        path = write_connection(self.tmp, worldId="  ")
        result = run_launch(["--connection-file", str(path), "--print-config"])
        self.assert_config_error(result)
        self.assertIn("worldId", result.stderr)

    def test_bad_origin(self):
        path = write_connection(self.tmp, origin="https://example.com/room")
        result = run_launch(["--connection-file", str(path), "--print-config"])
        self.assert_config_error(result)
        self.assertIn("origin", result.stderr)

    def test_unsupported_version(self):
        path = write_connection(self.tmp, version=99)
        result = run_launch(["--connection-file", str(path), "--print-config"])
        self.assert_config_error(result)
        self.assertIn("版本", result.stderr)

    def test_partial_passthrough_env(self):
        result = run_launch(
            ["--connection-file", str(self.tmp / "ignored.json"), "--print-config"],
            {"NPC_MCP_BASE_URL": ORIGIN},  # 有 BASE_URL 无 TOKEN
        )
        self.assert_config_error(result)
        self.assertIn("NPC_MCP_TOKEN", result.stderr)


class ServerHandoffTests(unittest.TestCase):
    """用临时 stub npc_mcp 包验证：映射后的环境变量原样传给 npc_mcp.server:main。"""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix="agentroom-launch-stub-")
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)
        self.dump = self.tmp / "dump.json"
        stub = self.tmp / "stub" / "npc_mcp"
        stub.mkdir(parents=True)
        (stub / "__init__.py").write_text("", encoding="utf-8")
        (stub / "server.py").write_text(STUB_SERVER_PY, encoding="utf-8")
        self.path = write_connection(self.tmp)
        env = {"PYTHONPATH": str(self.tmp / "stub"), STUB_DUMP_VAR: str(self.dump)}
        self.result = run_launch(["--connection-file", str(self.path)], env)

    def test_exit_ok_and_stderr_clean(self):
        self.assertEqual(self.result.returncode, 0, self.result.stderr)
        self.assertNotIn(TOKEN, self.result.stdout + self.result.stderr)

    def test_mapping_exact(self):
        self.assertEqual(self.result.returncode, 0, self.result.stderr)
        dumped = json.loads(self.dump.read_text(encoding="utf-8"))
        self.assertEqual(dumped, {
            "NPC_MCP_BASE_URL": ORIGIN,
            "NPC_MCP_TOKEN": TOKEN,
            "NPC_MCP_WORLD_ID": "apartment-v3",
            "NPC_MCP_ACTOR_ID": "npc-a",
            "NPC_MCP_SOURCE": "agentroom:local",
            "NPC_MCP_SESSION_ID": "agentroom-session",
            "NPC_MCP_OBSERVER_ID": "agentroom-observation",
        })

    def test_passthrough_reaches_stub(self):
        env = {
            "PYTHONPATH": str(self.tmp / "stub"),
            STUB_DUMP_VAR: str(self.dump),
            "NPC_MCP_BASE_URL": "http://127.0.0.1:20005",
            "NPC_MCP_TOKEN": TOKEN,
        }
        result = run_launch(["--connection-file", str(self.path)], env)
        self.assertEqual(result.returncode, 0, result.stderr)
        dumped = json.loads(self.dump.read_text(encoding="utf-8"))
        self.assertEqual(dumped["NPC_MCP_BASE_URL"], "http://127.0.0.1:20005")
        self.assertEqual(dumped["NPC_MCP_TOKEN"], TOKEN)


class DefaultPathTests(unittest.TestCase):
    """进程内直接调用 launch.default_connection_path()，验证三段回退。"""

    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("agentroom_launch", LAUNCH)
        cls.launch = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.launch)

    def test_xdg_state_home(self):
        with tempfile.TemporaryDirectory() as tmp, self._patched_env(XDG_STATE_HOME=tmp):
            self.assertEqual(
                self.launch.default_connection_path(),
                Path(tmp) / "agentroom" / "connection.json",
            )

    def test_xdg_fallback_to_home(self):
        with self._patched_env(XDG_STATE_HOME=""):
            self.assertEqual(
                self.launch.default_connection_path(),
                Path.home() / ".local" / "state" / "agentroom" / "connection.json",
            )

    def test_windows_localappdata(self):
        # os.name="nt" 时 pathlib 会构造 WindowsPath，Linux 上无法实例化；
        # 用 PureWindowsPath 替换模块内 Path，只验证分支逻辑本身。
        from pathlib import PureWindowsPath
        from unittest import mock

        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch("os.name", "nt"), \
                    mock.patch.object(self.launch, "Path", PureWindowsPath), \
                    self._patched_env(LOCALAPPDATA=tmp):
                self.assertEqual(
                    self.launch.default_connection_path(),
                    PureWindowsPath(tmp) / "AgentRoom" / "connection.json",
                )
            with mock.patch("os.name", "nt"), self._patched_env(LOCALAPPDATA=""):
                with self.assertRaises(self.launch.ConfigError):
                    self.launch.default_connection_path()

    def _patched_env(self, **values):
        from unittest import mock

        return mock.patch.dict(os.environ, values)


if __name__ == "__main__":
    unittest.main(verbosity=2)
