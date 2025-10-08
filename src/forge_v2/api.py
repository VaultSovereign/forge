from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from sse_starlette.sse import EventSourceResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from .orchestrator import run_ritual
from .bus import bus

app = FastAPI(title="Forge v2", version="0.1.0")

@app.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}

@app.post("/api/forge/run")
async def api_run(body: dict) -> dict:
    name = body.get("name")
    if not name:
        raise HTTPException(400, "Missing ritual name")
    return await run_ritual(name)

@app.get("/api/forge/events")
async def api_events() -> EventSourceResponse:
    async def gen():
        async for msg in bus.stream():
            yield msg
    return EventSourceResponse(gen())

@app.get("/metrics")
async def metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

def main() -> None:
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8787)
