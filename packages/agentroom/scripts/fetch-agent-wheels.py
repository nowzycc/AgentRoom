#!/usr/bin/env python3
"""下载 AgentRoom agent(MCP) 的 Windows CPython 3.11 wheel（W1）。

用法：
    python3 packages/agentroom/scripts/fetch-agent-wheels.py

行为：
- 清单：agent/mcp/requirements-win.txt（版本与 packages/npc-mcp/uv.lock 对齐）。
- 目标目录：vendor/wheels-win-agent/（build-windows.py 整目录解压进内嵌运行时）。
- 跳过 npc-harness / npc-mcp：二者以源码随包分发，不下载 wheel。
- 主路径：一次 `pip download -r`（pip 自行解析闭包并校验 pin 一致性），
  随后逐包核对 wheel 是否落盘，输出 OK/FAIL 汇总。
- 批量失败时回退为逐包 `--no-deps` 下载，以便定位具体是哪个包失败；
  失败包保留 pip stderr 摘要。任何 FAIL 都以 exit 1 结束，不伪造成功。

下载参数固定为 --only-binary=:all: --platform win_amd64 --python-version 3.11
--implementation cp --abi cp311；清单行内的环境标记会被剥除
（下载上下文就是 Windows 目标平台，例如 pywin32 的 win32 标记）。
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PKG = Path(__file__).resolve().parents[1]
REQUIREMENTS = PKG / "agent" / "mcp" / "requirements-win.txt"
DEST = PKG / "vendor" / "wheels-win-agent"

# 源码随包分发，绝不下载 wheel
SOURCE_ONLY = {"npc-harness", "npc-mcp"}

WIN_PLATFORM = "win_amd64"
PY_VERSION = "3.11"
PY_IMPL = "cp"
PY_ABI = "cp311"
STDERR_TAIL_CHARS = 2000


def canonical(name: str) -> str:
    """PEP 503 规范名 -> wheel 文件名常用的下划线形式。"""
    return re.sub(r"[-_.]+", "_", name.lower())


def parse_requirements(text: str) -> list[tuple[str, str, str]]:
    """返回 [(规范名, 版本, 下载用 spec)]；跳过注释行与源码分发包。"""
    entries: list[tuple[str, str, str]] = []
    for raw in text.splitlines():
        content = raw.split("#", 1)[0].strip()
        if not content or content.startswith(("-r", "--", "-e", ".")):
            continue
        spec = content.split(";", 1)[0].strip()  # 剥除环境标记
        name = re.split(r"[=!<>\[\]~ ;]", spec, 1)[0].strip()
        if not name:
            continue
        norm = canonical(name).replace("_", "-")
        if norm in SOURCE_ONLY:
            continue
        match = re.search(r"==\s*([^ ;]+)", spec)
        if not match:
            raise SystemExit(f"requirements 行不是精确 pin（需要 name==version）：{raw!r}")
        entries.append((norm, match.group(1), spec))
    return entries


def find_pip() -> list[str] | None:
    """优先当前解释器的 pip，失败则回退 PATH 上的 pip3/pip。"""
    candidates = [[sys.executable, "-m", "pip"], ["pip3"], ["pip"]]
    for cmd in candidates:
        try:
            probe = subprocess.run(
                cmd + ["--version"], capture_output=True, text=True, timeout=60
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if probe.returncode == 0:
            return cmd
    return None


def base_download_args(dest: Path) -> list[str]:
    return [
        "--only-binary=:all:",
        "--platform", WIN_PLATFORM,
        "--python-version", PY_VERSION,
        "--implementation", PY_IMPL,
        "--abi", PY_ABI,
        "--disable-pip-version-check",
        "-d", str(dest),
    ]


def wheel_present(dest: Path, name: str, version: str) -> Path | None:
    prefix = f"{canonical(name)}-{version}-"
    for wheel in sorted(dest.glob(f"{prefix}*.whl")):
        return wheel
    return None


def run_batch(pip: list[str], specs_file: Path, dest: Path) -> tuple[bool, str]:
    cmd = pip + ["download", "-r", str(specs_file)] + base_download_args(dest)
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0, result.stderr or result.stdout


def run_single(pip: list[str], spec: str, dest: Path) -> tuple[bool, str]:
    cmd = pip + ["download", spec, "--no-deps"] + base_download_args(dest)
    result = subprocess.run(cmd, capture_output=True, text=True)
    tail = (result.stderr or result.stdout or "").strip()[-STDERR_TAIL_CHARS:]
    return result.returncode == 0, tail


def main() -> int:
    parser = argparse.ArgumentParser(
        description="下载 agent(MCP) 的 Windows CPython 3.11 wheel 到 vendor/wheels-win-agent/"
    )
    parser.parse_args()

    if not REQUIREMENTS.is_file():
        print(f"FAIL: 清单不存在：{REQUIREMENTS}", file=sys.stderr)
        return 1
    entries = parse_requirements(REQUIREMENTS.read_text(encoding="utf-8"))
    if not entries:
        print("FAIL: 清单为空", file=sys.stderr)
        return 1
    DEST.mkdir(parents=True, exist_ok=True)
    print(f"清单：{REQUIREMENTS}（{len(entries)} 个包，跳过源码分发：{', '.join(sorted(SOURCE_ONLY))}）")
    print(f"目标：{DEST}")
    print(f"目标平台：win_amd64 / CPython {PY_VERSION} / 仅二进制 wheel")

    pip = find_pip()
    if pip is None:
        print("FAIL: 找不到可用的 pip（尝试了 sys.executable -m pip、pip3、pip）", file=sys.stderr)
        return 1
    print(f"pip：{' '.join(pip)}")

    # 主路径：一次批量下载（pip 解析闭包、校验 pin 一致性），失败再逐包定位。
    with tempfile.TemporaryDirectory(prefix="agentroom-wheel-reqs-") as tmp:
        specs_file = Path(tmp) / "requirements.txt"
        specs_file.write_text(
            "\n".join(spec for _, _, spec in entries) + "\n", encoding="utf-8"
        )
        batch_ok, batch_tail = run_batch(pip, specs_file, DEST)

    results: list[tuple[str, str, bool, str]] = []
    for name, version, spec in entries:
        wheel = wheel_present(DEST, name, version)
        if wheel is not None:
            results.append((name, version, True, wheel.name))
            continue
        if not batch_ok:
            ok, tail = run_single(pip, spec, DEST)
            wheel = wheel_present(DEST, name, version)
            if wheel is not None:
                results.append((name, version, True, wheel.name))
            else:
                results.append((name, version, False, tail or "pip 未产生输出，且目标目录无对应 wheel"))
            continue
        results.append((name, version, False, "批量下载成功但目录中缺少该 wheel（pip 可能按 marker 跳过）"))

    ok_count = 0
    fail_count = 0
    for name, version, ok, detail in results:
        if ok:
            ok_count += 1
            print(f"[OK]   {name}=={version} -> {detail}")
        else:
            fail_count += 1
            print(f"[FAIL] {name}=={version}")
            print("       pip stderr 摘要：")
            for line in detail.splitlines()[-12:]:
                print(f"       {line}")
    print(f"汇总：{ok_count} OK，{fail_count} FAIL（目标 {DEST}）")
    if fail_count:
        print("存在失败项：wheel 清单不完整，禁止宣称交付成功。", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
