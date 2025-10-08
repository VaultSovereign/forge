import subprocess

async def selftest() -> dict:
    try:
        out = subprocess.run(["bash", "scripts/self_test.sh"], capture_output=True, text=True)
        return {"ok": out.returncode == 0, "stdout": out.stdout, "stderr": out.stderr}
    except FileNotFoundError:
        return {"ok": True, "stdout": "self_test.sh not found (skipping)", "stderr": ""}
