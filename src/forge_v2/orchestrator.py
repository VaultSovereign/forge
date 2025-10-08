from __future__ import annotations
import asyncio
import json
import time
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict
import yaml
from .schema import ForgeConfig
from .receipts import make_receipt, write_receipt
from .metrics import rituals_total, steps_total, latency
from .bus import bus
from .config import get_settings

StepFn = Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]
REGISTRY: Dict[str, StepFn] = {}

def step(name: str):
    def deco(fn: StepFn) -> StepFn:
        REGISTRY[name] = fn
        return fn
    return deco

from .adapters import system as sys_ad
from .adapters import mcp as mcp_ad
from .adapters import vaultmesh as vm_ad
from .adapters import grafana as gf_ad

@step("system.selftest")
async def _sys_selftest(opts: Dict[str, Any]) -> Dict[str, Any]:
    return await sys_ad.selftest()

@step("mcp:ping")
async def _mcp_ping(opts: Dict[str, Any]) -> Dict[str, Any]:
    return await mcp_ad.ping()

@step("vaultmesh.rollup")
async def _vm_rollup(opts: Dict[str, Any]) -> Dict[str, Any]:
    return await vm_ad.rollup()

@step("grafana.annotate")
async def _gf_annotate(opts: Dict[str, Any]) -> Dict[str, Any]:
    return await gf_ad.annotate(opts.get("text", "Forge ritual"))

def load_config(path: Path | None = None) -> ForgeConfig:
    settings = get_settings()
    cfg_path = path or settings.forgefile
    data = yaml.safe_load(cfg_path.read_text())
    return ForgeConfig.model_validate(data)

async def run_ritual(name: str) -> Dict[str, Any]:
    cfg = load_config()
    if name not in cfg.rituals:
        raise AssertionError(f"Ritual '{name}' not found")
    ritual = cfg.rituals[name]
    start = time.perf_counter()
    ritual_ok = True
    out_steps: list[Dict[str, Any]] = []

    await bus.publish(f"event: ritual\ndata: {json.dumps({'name': name, 'status': 'start'})}\n\n")

    for s in ritual.steps:
        fn = REGISTRY.get(s.call)
        if not fn:
            payload = make_receipt(type="forge.step", ritual=name, step=s.call, ok=False, data={"error": "unknown call"}).model_dump()
            write_receipt(payload)
            steps_total.labels(ritual=name, step=s.call, status="error").inc()
            ritual_ok = False
            break

        try:
            res = await fn(s.with_)
            ok = bool(res.get("ok", True))
            payload = make_receipt(type="forge.step", ritual=name, step=s.call, ok=ok, data=res).model_dump()
            path = write_receipt(payload)
            await bus.publish(f"event: step\ndata: {json.dumps({'ritual': name, 'step': s.call, 'ok': ok, 'path': str(path)})}\n\n")
            steps_total.labels(ritual=name, step=s.call, status="ok" if ok else "fail").inc()
            out_steps.append({"step": s.call, "ok": ok, "data": res})
            if not ok:
                ritual_ok = False
                break
        except Exception as exc:  # noqa: BLE001
            payload = make_receipt(type="forge.step", ritual=name, step=s.call, ok=False, data={"error": str(exc)}).model_dump()
            write_receipt(payload)
            steps_total.labels(ritual=name, step=s.call, status="error").inc()
            ritual_ok = False
            break

    duration = time.perf_counter() - start
    latency.labels(name=name).observe(duration)
    rituals_total.labels(name=name, status="ok" if ritual_ok else "fail").inc()

    final = make_receipt(type="forge.ritual", ritual=name, ok=ritual_ok, data={"duration_s": duration, "steps": out_steps}).model_dump()
    final_path = write_receipt(final)
    await bus.publish(f"event: ritual\ndata: {json.dumps({'name': name, 'status': 'end', 'ok': ritual_ok, 'receipt': str(final_path)})}\n\n")
    return {"ok": ritual_ok, "duration_s": duration, "receipt": str(final_path)}

def cli_run() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("name", help="ritual name (from Forgefile.yaml)")
    args = parser.parse_args()
    result = asyncio.run(run_ritual(args.name))
    print(json.dumps(result, indent=2))
