import json
import hashlib
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
FORGE_SRC = BASE / "unforged_forge_genesis"
FORGE_SCRIPT = "scripts/forge.py"


def sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def iso_to_epoch(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).replace(tzinfo=timezone.utc).timestamp())


def test_forge_mint_is_deterministic(tmp_path: Path):
    work = tmp_path / "forge"
    shutil.copytree(FORGE_SRC, work)

    genesis = {
        "mesh": "Unforged-Forge",
        "consensus": {
            "validators": [{"id": "val-1"}, {"id": "val-2"}, {"id": "val-3"}]
        },
    }
    (work / "genesis.json").write_text(json.dumps(genesis, indent=2), encoding="utf-8")

    for dirname in ("archive", "receipts", "checkpoints"):
        target = work / dirname
        if target.exists():
            shutil.rmtree(target)
    (work / "ore").mkdir(exist_ok=True)
    ore_file = work / "ore" / "deterministic.txt"
    ore_content = "Forging under test harness."
    ore_file.write_text(ore_content, encoding="utf-8")

    ts_iso = "2025-01-01T00:00:00Z"
    epoch = iso_to_epoch(ts_iso)

    result = subprocess.run(
        [
            "python3",
            str(work / FORGE_SCRIPT),
            str(ore_file),
            "--base-dir",
            str(work),
            "--timestamp",
            ts_iso,
        ],
        cwd=work,
        capture_output=True,
        text=True,
        check=True,
    )

    ore_hash = sha256_hex(ore_content.encode())
    ore_id = f"ore-{ore_hash[:16]}"
    product_hash = sha256_hex(ore_content.encode() + b"|hammer-v1|")
    artifact_id = f"artifact-{product_hash[:16]}"
    lineage_hash = sha256_hex(b"genesis-lineage")
    result_hash = sha256_hex(f"{artifact_id}|quench|{epoch}".encode())
    validators = [v["id"] for v in genesis["consensus"]["validators"]]
    strikes = [sha256_hex(f"{ore_id}|strike|{vid}|seed-alpha".encode()) for vid in validators]

    artifact_path = work / "archive" / f"{artifact_id}.json"
    receipt_path = work / "receipts" / f"{artifact_id}_receipt.json"
    checkpoint_path = work / "checkpoints" / "checkpoint_0001.json"
    index_path = work / "artifact_index.json"

    assert artifact_path.exists(), result.stdout
    assert receipt_path.exists(), result.stdout
    assert checkpoint_path.exists(), result.stdout
    assert index_path.exists(), result.stdout

    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    assert artifact == {
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

    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert receipt == {
        "artifact_id": artifact_id,
        "event": "quench",
        "gas": 271828,
        "result_hash": result_hash,
        "time": epoch,
    }

    checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
    assert checkpoint == {
        "height": 1,
        "state_root": sha256_hex(f"{product_hash}{lineage_hash}".encode()),
        "archive_root": sha256_hex(f"{artifact_id}{result_hash}".encode()),
        "quorum_signatures": strikes,
    }

    index = json.loads(index_path.read_text(encoding="utf-8"))
    assert index == {
        "mesh": "Unforged-Forge",
        "artifacts": [artifact_id],
        "merkle_root": sha256_hex(artifact_id.encode()),
        "created": epoch,
    }

    assert f"FORGED: {artifact_id}" in result.stdout
    assert f"ORE:    {ore_id}" in result.stdout
