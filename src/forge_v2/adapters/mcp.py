import asyncio
import json
import time
from pathlib import Path

LEDGER_LOCAL = Path("reality_ledger/mcp")
LEDGER_LOCAL.mkdir(parents=True, exist_ok=True)

async def ping() -> dict:
    payload = {"type": "mcp.ping", "ts": time.time(), "input": {}, "output": {"pong": True}}
    fname = LEDGER_LOCAL / f"{int(time.time() * 1000)}_mcp.ping.json"
    fname.write_text(json.dumps(payload, indent=2))
    await asyncio.sleep(0.2)
    return {"ok": True, "path": str(fname)}
