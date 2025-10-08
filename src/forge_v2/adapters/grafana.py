import json
import os
import time
import httpx

async def annotate(text: str) -> dict:
    url = os.environ.get("GRAFANA_URL")
    key = os.environ.get("GRAFANA_API_KEY")
    if not url or not key:
        return {"ok": False, "error": "GRAFANA_URL/API_KEY missing"}
    payload = {"text": text, "time": int(time.time() * 1000)}
    async with httpx.AsyncClient(timeout=5) as client:
        response = await client.post(
            f"{url}/api/annotations",
            headers={"Authorization": f"Bearer {key}"},
            content=json.dumps(payload),
        )
    return {"ok": response.is_success, "status": response.status_code, "resp": response.text}
