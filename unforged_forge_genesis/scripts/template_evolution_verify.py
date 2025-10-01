#!/usr/bin/env python3
"""Council verifier for template evolution OREs (stdlib only)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def semver_tuple(version: str) -> tuple[int, int, int]:
    match = SEMVER_RE.match(version or "")
    if not match:
        raise ValueError(f"invalid semver: {version}")
    return tuple(int(part) for part in match.groups())


def semver_gt(a: str, b: str) -> bool:
    return semver_tuple(a) > semver_tuple(b)


def read_yaml_version(path: Path) -> str:
    """Minimal YAML scan (avoids extra deps)."""
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("version:"):
                return line.split(":", 1)[1].strip().strip("'\"")
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"failed reading {path}: {exc}") from exc
    raise RuntimeError(f"no 'version:' key found in {path}")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: template_evolution_verify.py --proposal <path> [--repo-root .]", file=sys.stderr)
        return 2

    args = argv[1:]
    proposal_path: Path | None = None
    repo_root = Path(".")
    i = 0
    while i < len(args):
        arg = args[i]
        if arg == "--proposal":
            i += 1
            proposal_path = Path(args[i])
        elif arg == "--repo-root":
            i += 1
            repo_root = Path(args[i])
        else:
            print(f"unknown arg: {arg}", file=sys.stderr)
            return 2
        i += 1

    if proposal_path is None:
        print("--proposal is required", file=sys.stderr)
        return 2

    proposal = json.loads(proposal_path.read_text(encoding="utf-8"))
    if proposal.get("ore_type") != "template_evolution.v1":
        print("ore_type must be 'template_evolution.v1'", file=sys.stderr)
        return 2

    targets = proposal.get("targets") or []
    if not isinstance(targets, list) or not targets:
        print("targets[] is required and non-empty", file=sys.stderr)
        return 2

    errors: list[str] = []
    for target in targets:
        path_str = target.get("template_path")
        from_version = target.get("from_version")
        to_version = target.get("to_version")

        if not path_str or not from_version or not to_version:
            errors.append(f"target missing fields: {target}")
            continue
        if not SEMVER_RE.match(from_version) or not SEMVER_RE.match(to_version):
            errors.append(f"invalid semver(s): from={from_version} to={to_version} for {path_str}")
            continue
        if not semver_gt(to_version, from_version):
            errors.append(f"to_version must be greater than from_version for {path_str}: {from_version} -> {to_version}")
            continue

        template_path = repo_root / path_str
        if not template_path.exists():
            errors.append(f"template not found: {template_path}")
            continue

        try:
            current_version = read_yaml_version(template_path)
        except RuntimeError as exc:  # noqa: BLE001
            errors.append(str(exc))
            continue

        if current_version != from_version:
            errors.append(
                f"version mismatch in {template_path}: repo has {current_version}, proposal expects {from_version}"
            )

    if errors:
        print("[verify] FAIL")
        for err in errors:
            print(f" - {err}", file=sys.stderr)
        return 1

    print("[verify] OK — all targets valid and forward-semver")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
