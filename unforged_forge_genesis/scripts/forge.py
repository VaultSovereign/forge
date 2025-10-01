#!/usr/bin/env python3
# Deterministic "forge" sidecar — stdlib only

from __future__ import annotations

import argparse
import json
import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def load_genesis(base: Path) -> Dict[str, Any]:
    gp = base / "genesis.json"
    if not gp.exists():
        raise FileNotFoundError(
            f"genesis.json not found at {gp} (use --base-dir to point at unforged_forge_genesis)"
        )
    return json.loads(gp.read_text(encoding="utf-8"))


def save_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_timestamp_override(raw: str) -> int:
    """Accept epoch seconds or ISO 8601; returns epoch int (UTC)."""
    raw = raw.strip()
    if raw.isdigit():
        return int(raw)
    cleaned = raw.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(cleaned)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"invalid timestamp override: {raw}") from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def mint(base: Path, ore_file: Path, timestamp_override: Optional[int] = None) -> None:
    """Deterministically mint an artifact from ore text."""
    genesis = load_genesis(base)

    ore_text = ore_file.read_text(encoding="utf-8")
    ore_bytes = ore_text.encode("utf-8")

    ore_hash = sha256_hex(ore_bytes)
    ore_id = f"ore-{ore_hash[:16]}"

    product_hash = sha256_hex(ore_bytes + b"|hammer-v1|")
    artifact_id = f"artifact-{product_hash[:16]}"
    lineage_hash = sha256_hex(b"genesis-lineage")

    epoch = int(timestamp_override if timestamp_override is not None else time.time())

    validators: List[str] = [v["id"] for v in genesis.get("consensus", {}).get("validators", [])]
    strikes: List[str] = [
        sha256_hex(f"{ore_id}|strike|{vid}|seed-alpha".encode("utf-8"))
        for vid in validators
    ]

    result_hash = sha256_hex(f"{artifact_id}|quench|{epoch}".encode("utf-8"))

    artifact = {
        "artifact_id": artifact_id,
        "ore_id": ore_id,
        "product_hash": product_hash,
        "lineage_hash": lineage_hash,
        "receipts": [
            {
                "artifact_id": artifact_id,
                "event": "quench",
                "gas": 271828,
                "result_hash": result_hash,
                "time": epoch,
            }
        ],
        "height": 1,
    }

    checkpoint = {
        "height": 1,
        "state_root": sha256_hex(f"{product_hash}{lineage_hash}".encode("utf-8")),
        "archive_root": sha256_hex(f"{artifact_id}{result_hash}".encode("utf-8")),
        "quorum_signatures": strikes,
    }

    index = {
        "mesh": "Unforged-Forge",
        "artifacts": [artifact_id],
        "merkle_root": sha256_hex(artifact_id.encode("utf-8")),
        "created": epoch,
    }

    save_json(base / "archive" / f"{artifact_id}.json", artifact)
    save_json(base / "receipts" / f"{artifact_id}_receipt.json", artifact["receipts"][0])
    save_json(base / "checkpoints" / "checkpoint_0001.json", checkpoint)
    save_json(base / "artifact_index.json", index)

    print(f"FORGED: {artifact_id}")
    print(f"ORE:    {ore_id}")
    print(f"STATE:  {checkpoint['state_root']}")
    print(f"ARCH:   {checkpoint['archive_root']}")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Forge artifacts from ORE text inputs.")
    parser.add_argument("ore_file", type=Path, help="Path to ORE text file")
    parser.add_argument(
        "--timestamp",
        dest="timestamp",
        type=parse_timestamp_override,
        help="Deterministic timestamp (epoch seconds or ISO 8601)",
    )
    parser.add_argument(
        "--base-dir",
        dest="base_dir",
        type=Path,
        help="Override base directory (defaults to unforged_forge_genesis root)",
    )
    args = parser.parse_args(argv)

    base = args.base_dir.resolve() if args.base_dir else Path(__file__).resolve().parent.parent
    ore = args.ore_file if args.ore_file.is_absolute() else (Path.cwd() / args.ore_file)
    if not ore.exists():
        parser.error(f"ore file not found: {ore}")

    mint(base, ore, timestamp_override=args.timestamp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
