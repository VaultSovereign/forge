import asyncio
import subprocess

async def rollup() -> dict:
    try:
        out = subprocess.run(
            ["vaultmesh", "receipts", "rollup", "--date", "today", "--all-domains"],
            capture_output=True,
            text=True,
        )
        ok = out.returncode == 0
        return {"ok": ok, "stdout": out.stdout, "stderr": out.stderr}
    except FileNotFoundError:
        await asyncio.sleep(0.1)
        return {"ok": False, "stderr": "vaultmesh CLI not found"}
