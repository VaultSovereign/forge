#!/usr/bin/env python3
"""Protocol evolution proposal verifier (deterministic, stdlib-first)."""
from __future__ import annotations

import argparse
import json
import hashlib
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Tuple

try:
    import jsonpatch  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    jsonpatch = None  # type: ignore[assignment]

try:
    from nacl.exceptions import BadSignatureError  # type: ignore
    from nacl.signing import VerifyKey  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    VerifyKey = None  # type: ignore[assignment]

ALLOWED_PREFIXES = (
    "/consensus/validators",
    "/consensus/quorum",
    "/parameters",
    "/ledger",
)
DENIED_PREFIXES = (
    "/genesis_time",
    "/history",
    "/archive",
    "/receipts",
    "/checkpoints",
    "/artifact_index",
    "/consensus/validators/*/id",
)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def jcs_like(obj: Any) -> bytes:
    """Stable JSON canonicalisation (RFC8785-inspired but simpler)."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def core_of_proposal(proposal: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in proposal.items() if k not in {"signatures", "acceptance"}}


def file_hash(path: Path) -> str:
    return sha256_hex(path.read_bytes())


def base_lock_ok(proposal: Dict[str, Any], genesis_hash: str, genesis_version: str) -> bool:
    return (
        proposal.get("base_genesis_hash") == genesis_hash
        and proposal.get("base_genesis_version") == genesis_version
    )


def merge_patch_apply(base: Dict[str, Any], patch_obj: Dict[str, Any]) -> Dict[str, Any]:
    result = deepcopy(base)

    def merge(dst: Dict[str, Any], src: Dict[str, Any]) -> None:
        for key, value in src.items():
            if value is None:
                dst.pop(key, None)
            elif isinstance(value, dict) and isinstance(dst.get(key), dict):
                merge(dst[key], value)  # type: ignore[arg-type]
            else:
                dst[key] = value

    merge(result, patch_obj)
    return result


def paths_ok(changes: Dict[str, Any]) -> bool:
    if "json_patch" in changes:
        for op in changes["json_patch"]:
            path = op.get("path", "")
            if not path or any(path.startswith(prefix) for prefix in DENIED_PREFIXES):
                return False
            if not any(path.startswith(prefix) for prefix in ALLOWED_PREFIXES):
                return False
        return True
    if "merge_patch" in changes:
        for key in changes["merge_patch"].keys():
            top_level = f"/{key}"
            if not any(top_level.startswith(prefix) for prefix in ALLOWED_PREFIXES):
                return False
        return True
    return False


def dry_run_apply(genesis: Dict[str, Any], changes: Dict[str, Any]) -> Dict[str, Any]:
    if "json_patch" in changes:
        if jsonpatch is None:
            raise RuntimeError("jsonpatch not installed; run `pip install jsonpatch`." )
        patch = jsonpatch.JsonPatch(changes["json_patch"])  # type: ignore[arg-type]
        return patch.apply(genesis, in_place=False)
    if "merge_patch" in changes:
        return merge_patch_apply(genesis, changes["merge_patch"])
    raise ValueError("Unsupported change set (expected json_patch or merge_patch)")


def tally_signatures(
    proposal: Dict[str, Any], genesis: Dict[str, Any], challenge_hex: str
) -> Tuple[int, int, bool]:
    if VerifyKey is None:
        return (0, 0, False)

    guardians = {
        guardian.get("id"): guardian.get("pubkey")
        for guardian in genesis.get("consensus", {}).get("validators", [])
    }
    ok = 0
    total = 0
    for entry in proposal.get("signatures", []):
        total += 1
        guardian_id = entry.get("guardian_id")
        pubkey_b64 = entry.get("public_key")
        signature_b64 = entry.get("signature")
        if guardian_id not in guardians or guardians[guardian_id] != pubkey_b64:
            continue
        try:
            import base64

            pk_bytes = base64.b64decode(pubkey_b64)
            sig_bytes = base64.b64decode(signature_b64)
            VerifyKey(pk_bytes).verify(bytes.fromhex(challenge_hex), sig_bytes)
            ok += 1
        except (ValueError, BadSignatureError):
            continue
    return (ok, total, True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify protocol evolution proposals against genesis.")
    parser.add_argument("--proposal", required=True, type=Path, help="Path to the proposal JSON")
    parser.add_argument("--genesis", required=True, type=Path, help="Path to the base genesis JSON")
    args = parser.parse_args(argv)

    proposal = json.loads(args.proposal.read_text(encoding="utf-8"))
    genesis = json.loads(args.genesis.read_text(encoding="utf-8"))

    core = core_of_proposal(proposal)
    challenge_hex = sha256_hex(jcs_like(core))

    genesis_hash = file_hash(args.genesis)
    genesis_version = genesis.get("version", "1.0.0")
    base_ok = base_lock_ok(proposal, genesis_hash, genesis_version)

    change_set = proposal.get("changes", {})
    paths_valid = paths_ok(change_set)

    try:
        new_genesis = dry_run_apply(genesis, change_set)
        new_genesis_hash = sha256_hex(jcs_like(new_genesis))
        apply_ok = True
    except Exception:
        new_genesis_hash = None
        apply_ok = False

    signatures_ok, signatures_total, sigs_supported = tally_signatures(proposal, genesis, challenge_hex)

    result = {
        "challenge_hex": challenge_hex,
        "base_genesis_hash": genesis_hash,
        "base_genesis_version": genesis_version,
        "base_lock_ok": base_ok,
        "paths_ok": paths_valid,
        "apply_ok": apply_ok,
        "new_genesis_hash": new_genesis_hash,
        "signatures_ok": signatures_ok,
        "signatures_total": signatures_total,
        "signature_verification_supported": sigs_supported,
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))

    if base_ok and paths_valid and apply_ok:
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
