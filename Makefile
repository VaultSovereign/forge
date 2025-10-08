PY := uv run
APP := forge_v2.api:app

dev:
	uv sync
	uv run uvicorn $(APP) --reload --host 0.0.0.0 --port 8787

run:
	uv run uvicorn $(APP) --host 0.0.0.0 --port 8787

ritual:
	uv run forge-run $(name)

test:
	uv run pytest -q
