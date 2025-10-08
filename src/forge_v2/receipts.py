from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
import json
from blake3 import blake3
from .schema import Receipt

LEDGER_ROOT = Path("reality_ledger/forge")

def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()

def write_receipt(payload: dict, domain: str = "forge") -> Path:
    date_dir = LEDGER_ROOT / datetime.now(timezone.utc).strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%fZ")
    path = date_dir / f"{ts}_{domain}.json"
    # hash
    h = blake3(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    payload["hash"] = h
    path.write_text(json.dumps(payload, indent=2))
    return path

def make_receipt(**kwargs) -> Receipt:
    return Receipt(ts=now_utc(), **kwargs)
