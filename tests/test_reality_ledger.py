import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path


def run_append(root: Path, payload: dict, env: dict | None = None):
    env_vars = dict(os.environ)
    if env:
        env_vars.update(env)

    python_cmd = "python" if os.name == "nt" else "python3"
    proc = subprocess.Popen(
        [python_cmd, str(root / "reality_ledger" / "reality_ledger.py"), "append"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=root,
        env=env_vars,
    )
    out, err = proc.communicate(json.dumps(payload).encode("utf-8"), timeout=5)
    return proc.returncode, out.decode("utf-8"), err.decode("utf-8")


def copy_ledger_script(tmp: Path) -> None:
    dst_dir = tmp / "reality_ledger"
    dst_dir.mkdir(parents=True, exist_ok=True)
    src = Path("reality_ledger/reality_ledger.py")
    dst = dst_dir / "reality_ledger.py"
    dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


def test_shard_dedupe_with_index():
    tmp = Path(tempfile.mkdtemp())
    try:
        copy_ledger_script(tmp)
        ts = datetime.utcnow().isoformat() + "Z"
        eid = "pytest:eid"
        payload = {"event_id": eid, "keyword": "tem-vision", "profile": "@blue", "ts": ts}

        code1, _, err1 = run_append(tmp, payload)
        code2, _, err2 = run_append(tmp, payload)

        assert code1 == 0
        assert code2 == 0
        shard = tmp / "reality_ledger" / f"events-{ts[:10]}.jsonl"
        index = tmp / "reality_ledger" / f"events-{ts[:10]}.idx"
        assert shard.exists()
        assert index.exists()
        lines = shard.read_text(encoding="utf-8").strip().splitlines()
        assert len([ln for ln in lines if eid in ln]) == 1
        assert "duplicate event_id" in err2
        assert "duplicate event_id" not in err1
        idx_lines = index.read_text(encoding="utf-8").strip().splitlines()
        assert len([ln for ln in idx_lines if ln == eid]) == 1
    finally:
        shutil.rmtree(tmp)


def test_compact_mode_omits_artifact():
    tmp = Path(tempfile.mkdtemp())
    try:
        copy_ledger_script(tmp)
        ts = datetime.utcnow().isoformat() + "Z"
        payload = {
            "event_id": "compact:eid",
            "keyword": "tem-sonic",
            "artifact": {"kept": False},
            "ts": ts,
        }

        code, _, _ = run_append(tmp, payload, env={"REALITY_LEDGER_COMPACT": "1"})
        assert code == 0

        shard = tmp / "reality_ledger" / f"events-{ts[:10]}.jsonl"
        assert shard.exists()
        final_line = shard.read_text(encoding="utf-8").strip().splitlines()[-1]
        obj = json.loads(final_line)
        assert obj["keyword"] == "tem-sonic"
        assert "artifact" not in obj
    finally:
        shutil.rmtree(tmp)
