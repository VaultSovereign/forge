import sys
import pathlib
import hashlib
import json
from datetime import datetime, timezone

def strike(ore_path: pathlib.Path, base_path: pathlib.Path, timestamp_override: str = None):
    """Forge an ORE into an ARTIFACT, write a RECEIPT, and update the INDEX."""
    if not ore_path.exists():
        print(f"✖ ORE not found: {ore_path}")
        sys.exit(1)

    # 1. Create Artifact
    content = ore_path.read_text()
    artifact_hash = hashlib.sha256(content.encode()).hexdigest()
    artifact_path = base_path / "archive" / f"{artifact_hash[:16]}.vmf"
    artifact_path.parent.mkdir(exist_ok=True)
    artifact_path.write_text(content)
    print(f"🔥 Artifact forged: {artifact_path.relative_to(base_path)}")

    # 2. Create Receipt
    receipt_path = base_path / "receipts" / f"{artifact_hash[:16]}.json"
    receipt_path.parent.mkdir(exist_ok=True)
    timestamp = timestamp_override or datetime.now(timezone.utc).isoformat()
    receipt = {
        "artifact_hash": artifact_hash,
        "ore_path": str(ore_path.relative_to(base_path.parent)),
        "timestamp_utc": timestamp,
        "signature_simulated": f"signed-by(simulated-key-for-{artifact_hash[:8]})"
    }
    receipt_path.write_text(json.dumps(receipt, indent=2))
    print(f"🧾 Receipt created: {receipt_path.relative_to(base_path)}")

    # 3. Update Index (atomic update)
    index_path = base_path / "artifact_index.json"
    try:
        index_data = json.loads(index_path.read_text())
        artifacts = set(index_data.get("artifacts", []))
    except (FileNotFoundError, json.JSONDecodeError):
        index_data = {"artifacts": []}
        artifacts = set()

    artifacts.add(artifact_hash)
    sorted_artifacts = sorted(list(artifacts))
    
    # Recalculate Merkle root
    merkle_root = hashlib.sha256("".join(sorted_artifacts).encode()).hexdigest()

    index_data["artifacts"] = sorted_artifacts
    index_data["merkle_root"] = merkle_root
    index_path.write_text(json.dumps(index_data, indent=2) + "\n")
    print(f"🔗 Index updated. New Merkle root: {merkle_root[:16]}...")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Forge an ORE into a verifiable artifact.")
    parser.add_argument("ore_file", type=pathlib.Path, help="Path to the ORE file to forge.")
    parser.add_argument("--ts", dest="timestamp", help="ISO-8601 timestamp to use for the receipt (for deterministic runs).")
    args = parser.parse_args()

    if not args.ore_file:
        parser.print_help()
        sys.exit(1)
    
    script_dir = pathlib.Path(__file__).parent
    base_dir = script_dir.parent
    strike(args.ore_file, base_dir, timestamp_override=args.timestamp)