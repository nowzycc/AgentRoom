#!/usr/bin/env python3
"""Install the agentroom skill directory into an agent home.

Usage:
    install_skill.py --agent hermes|dsh [--root PATH] [--dry-run]

Copies the shipped skill directory (../../skill/agentroom relative to this
file) to <root>/skills/agentroom.

- Hermes default root: ~/.hermes ; DSH default root: $DSH_HOME or ~/.dsh.
- An existing target is first renamed to <root>/skills/agentroom.bak.<UTC ts>
  (a -N suffix is appended on timestamp collision), then a fresh copy is made;
  the operation is idempotent.
- Symlinks inside the source are preserved as links, never followed.
- Nothing is ever written outside <root>/skills/agentroom(.bak.*).
- --dry-run prints the plan as JSON and touches nothing.
- On success a JSON result is printed to stdout; on failure a JSON error goes
  to stderr and the exit code is nonzero.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

SOURCE = Path(__file__).resolve().parent.parent / "skill" / "agentroom"
SKILL_NAME = "agentroom"


def default_root(agent: str) -> Path:
    if agent == "hermes":
        return Path.home() / ".hermes"
    env = os.environ.get("DSH_HOME", "").strip()
    return Path(env).expanduser() if env else Path.home() / ".dsh"


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def backup_path_for(target: Path) -> Path:
    """Would-be backup path; -N suffix on same-second collision."""
    parent = target.parent
    candidate = parent / f"{target.name}.bak.{utc_stamp()}"
    n = 0
    while candidate.exists() or candidate.is_symlink():
        n += 1
        candidate = parent / f"{target.name}.bak.{utc_stamp()}-{n}"
    return candidate


def copy_tree(src: Path, dst: Path) -> int:
    """Copy src into dst preserving relative layout; symlinks are kept as links.

    Returns the number of regular files copied. Never follows symlinks.
    """
    files = 0
    dst.mkdir(parents=True, exist_ok=False)
    for item in sorted(src.rglob("*")):
        dest = dst / item.relative_to(src)
        if item.is_symlink():
            dest.symlink_to(os.readlink(item))
        elif item.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
        else:
            shutil.copyfile(item, dest)
            files += 1
    return files


def install(agent: str, root_arg: str | None, dry_run: bool) -> dict:
    if not SOURCE.is_dir():
        raise FileNotFoundError(f"skill source directory not found: {SOURCE}")
    if not (SOURCE / "SKILL.md").is_file():
        raise FileNotFoundError(f"skill source is missing SKILL.md: {SOURCE}")

    root = Path(root_arg).expanduser() if root_arg else default_root(agent)
    root = root.resolve()
    target = root / "skills" / SKILL_NAME

    exists = target.exists() or target.is_symlink()
    backup = backup_path_for(target) if exists else None
    plan = {
        "ok": True,
        "agent": agent,
        "root": str(root),
        "source": str(SOURCE),
        "target": str(target),
        "backup": str(backup) if backup else None,
        "dry_run": dry_run,
    }
    if dry_run:
        plan["would_copy_files"] = sum(1 for p in SOURCE.rglob("*") if p.is_file() and not p.is_symlink())
        return plan

    if backup is not None:
        os.replace(target, backup)  # same parent: atomic rename, never follows links
    files = copy_tree(SOURCE, target)
    if not (target / "SKILL.md").is_file():
        raise RuntimeError(f"post-install verification failed: {target / 'SKILL.md'} missing")
    plan["files"] = files
    return plan


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Install the agentroom skill into an agent home.")
    parser.add_argument("--agent", required=True, choices=("hermes", "dsh"),
                        help="target agent family (affects the default root only)")
    parser.add_argument("--root", default=None, help="agent home root (default: ~/.hermes or $DSH_HOME / ~/.dsh)")
    parser.add_argument("--dry-run", action="store_true", help="print the plan as JSON; write nothing")
    args = parser.parse_args(argv)
    try:
        result = install(args.agent, args.root, args.dry_run)
    except (OSError, RuntimeError, FileNotFoundError) as error:
        print(json.dumps({"ok": False, "error": f"{type(error).__name__}: {error}"}, ensure_ascii=False),
              file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
