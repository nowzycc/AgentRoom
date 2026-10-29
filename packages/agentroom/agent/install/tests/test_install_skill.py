"""CLI tests for install_skill.py.

Every run executes the installer as a subprocess against an isolated temporary
HOME; the real ~/.hermes and ~/.dsh are never touched. Standard library only.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
INSTALLER = HERE.parent / "install_skill.py"
SKILL_SOURCE = HERE.parent.parent / "skill" / "agentroom"


def run_installer(args: list[str], home: Path, *, dsh_home: str | None = "unset") -> subprocess.CompletedProcess:
    """Run install_skill.py with HOME bound to `home` (and DSH_HOME scrubbed
    unless explicitly provided)."""
    env = {k: v for k, v in os.environ.items() if k not in ("HOME", "DSH_HOME")}
    env["HOME"] = str(home)
    if dsh_home != "unset":
        if dsh_home is not None:
            env["DSH_HOME"] = dsh_home
    return subprocess.run([sys.executable, str(INSTALLER), *args],
                          capture_output=True, text=True, env=env, timeout=60)


@pytest.fixture
def home(tmp_path) -> Path:
    d = tmp_path / "home"
    d.mkdir()
    return d


def test_source_layout_is_complete():
    assert (SKILL_SOURCE / "SKILL.md").is_file()
    assert (SKILL_SOURCE / "references" / "tools.md").is_file()


def test_first_install_hermes_default_root(home):
    result = run_installer(["--agent", "hermes"], home)
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout)
    target = home / ".hermes" / "skills" / "agentroom"
    assert Path(out["target"]) == target.resolve()
    assert out["backup"] is None
    assert out["dry_run"] is False
    assert out["ok"] is True
    # whole directory copied
    assert (target / "SKILL.md").is_file()
    assert (target / "references" / "tools.md").is_file()
    copied = {p.relative_to(target) for p in target.rglob("*")}
    expected = {p.relative_to(SKILL_SOURCE) for p in SKILL_SOURCE.rglob("*")}
    assert copied == expected
    # no backup on first install
    assert not list((home / ".hermes" / "skills").glob("agentroom.bak.*"))


def test_dsh_default_root_without_dsh_home(home):
    result = run_installer(["--agent", "dsh"], home, dsh_home=None)
    assert result.returncode == 0, result.stderr
    target = home / ".dsh" / "skills" / "agentroom"
    assert (target / "SKILL.md").is_file()


def test_dsh_honors_dsh_home_env(home, tmp_path):
    custom = tmp_path / "custom-dsh"
    result = run_installer(["--agent", "dsh"], home, dsh_home=str(custom))
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout)
    assert Path(out["target"]) == (custom / "skills" / "agentroom").resolve()
    assert (custom / "skills" / "agentroom" / "SKILL.md").is_file()


def test_reinstall_creates_backup_and_is_idempotent(home):
    first = run_installer(["--agent", "hermes"], home)
    assert first.returncode == 0, first.stderr
    target = home / ".hermes" / "skills" / "agentroom"
    marker = target / "SKILL.md"
    assert marker.is_file()

    second = run_installer(["--agent", "hermes"], home)
    assert second.returncode == 0, second.stderr
    out2 = json.loads(second.stdout)
    skills = home / ".hermes" / "skills"
    backups = list(skills.glob("agentroom.bak.*"))
    assert len(backups) == 1
    assert out2["backup"] == str(backups[0].resolve())
    # backup holds the previous copy; fresh target reinstalled
    assert (backups[0] / "SKILL.md").is_file()
    assert marker.is_file()

    third = run_installer(["--agent", "hermes"], home)
    assert third.returncode == 0, third.stderr
    assert len(list(skills.glob("agentroom.bak.*"))) == 2
    assert marker.is_file()
    assert (target / "references" / "tools.md").is_file()


def test_dry_run_writes_nothing(home):
    result = run_installer(["--agent", "hermes", "--dry-run"], home)
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout)
    assert out["dry_run"] is True
    assert out["backup"] is None
    assert not (home / ".hermes").exists()
    assert not (home / ".dsh").exists()


def test_dry_run_on_existing_target_leaves_it_untouched(home):
    assert run_installer(["--agent", "hermes"], home).returncode == 0
    target = home / ".hermes" / "skills" / "agentroom"
    before = sorted((p.relative_to(target), p.stat().st_mtime_ns) for p in target.rglob("*"))
    result = run_installer(["--agent", "hermes", "--dry-run"], home)
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout)
    assert out["dry_run"] is True
    after = sorted((p.relative_to(target), p.stat().st_mtime_ns) for p in target.rglob("*"))
    assert after == before
    assert not list((home / ".hermes" / "skills").glob("agentroom.bak.*"))


def test_invalid_agent_fails_nonzero_without_writing(home):
    result = run_installer(["--agent", "claude"], home)
    assert result.returncode != 0
    assert not (home / ".hermes").exists()
    assert not (home / ".dsh").exists()


def test_explicit_root_overrides_default(home, tmp_path):
    custom = tmp_path / "anywhere"
    result = run_installer(["--agent", "hermes", "--root", str(custom)], home)
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout)
    assert Path(out["target"]) == (custom / "skills" / "agentroom").resolve()
    assert (custom / "skills" / "agentroom" / "SKILL.md").is_file()
    assert not (home / ".hermes").exists()


def test_symlink_in_source_is_preserved_not_followed(home, tmp_path):
    outside = tmp_path / "outside.txt"
    outside.write_text("linked", encoding="utf-8")
    link = SKILL_SOURCE / "link-probe.txt"
    link.symlink_to(outside)
    try:
        result = run_installer(["--agent", "hermes"], home)
        assert result.returncode == 0, result.stderr
        target_link = home / ".hermes" / "skills" / "agentroom" / "link-probe.txt"
        assert target_link.is_symlink()
        assert os.readlink(target_link) == str(outside)
    finally:
        link.unlink()
