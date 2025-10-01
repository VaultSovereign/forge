#!/usr/bin/env python3
"""
Reality Ledger inspector: filter and print events from sharded JSONL files.

Usage examples:
  python3 scripts/ledger_inspect.py --day 2025-09-29 --keyword tem-vision --pretty
  python3 scripts/ledger_inspect.py --from 2025-09-01 --to 2025-09-29 --profile @blue --limit 20
  python3 scripts/ledger_inspect.py --day 2025-09-29 --fields ts,keyword,profile,model --ndjson

Filters: day (repeatable), from/to, keyword/profile/provider/model, free-text contains.
Outputs NDJSON by default; use --pretty for JSON array; --fields to select specific keys.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Dict, Any

LEDGER_DIR = Path(__file__).resolve().parent.parent / "reality_ledger"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default=str(LEDGER_DIR), help="ledger directory (default: ./reality_ledger)")
    parser.add_argument("--day", action="append", help="YYYY-MM-DD shard day (repeatable)")
    parser.add_argument("--from", dest="date_from", help="start date YYYY-MM-DD (inclusive)")
    parser.add_argument("--to", dest="date_to", help="end date YYYY-MM-DD (inclusive)")
    parser.add_argument("--keyword", help="substring match in keyword")
    parser.add_argument("--profile", help="substring match in profile")
    parser.add_argument("--provider", help="substring match in provider")
    parser.add_argument("--model", help="substring match in model")
    parser.add_argument("--contains", help="substring match anywhere in raw line")
    parser.add_argument("--limit", type=int, default=0, help="limit number of results")
    parser.add_argument("--fields", help="comma-separated list of fields to print")
    out = parser.add_mutually_exclusive_group()
    out.add_argument("--pretty", action="store_true", help="Pretty JSON array output")
    out.add_argument("--ndjson", action="store_true", help="Force NDJSON output (default)")
    return parser.parse_args()


def shard_paths(root: Path, days: List[str] | None, date_from: str | None, date_to: str | None) -> List[Path]:
    if days:
        shards = [root / f"events-{d}.jsonl" for d in days]
        return [p for p in shards if p.exists()]
    if date_from or date_to:
        start = datetime.strptime(date_from or "1970-01-01", "%Y-%m-%d")
        end = datetime.strptime(date_to or "9999-12-31", "%Y-%m-%d")
        results = []
        for p in root.glob("events-*.jsonl"):
            try:
                day = datetime.strptime(p.stem.split("events-")[1], "%Y-%m-%d")
            except Exception:
                continue
            if start <= day <= end:
                results.append(p)
        return sorted(results)
    return sorted(root.glob("events-*.jsonl"))


def select_fields(obj: Dict[str, Any], fields: List[str] | None) -> Dict[str, Any]:
    if not fields:
        return obj
    return {name: obj.get(name) for name in fields}


def main() -> int:
    args = parse_args()
    root = Path(args.dir)
    if not root.exists():
        print(f"no ledger dir: {root}", file=sys.stderr)
        return 1

    shards = shard_paths(root, args.day, args.date_from, args.date_to)
    if not shards:
        print("no shards matched", file=sys.stderr)
        return 0

    fields = [f.strip() for f in args.fields.split(",") if f.strip()] if args.fields else []

    results = []
    printed = 0

    for shard in shards:
        with shard.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.rstrip("\n")
                if args.contains and args.contains not in line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if args.keyword and (args.keyword not in (obj.get("keyword") or "")):
                    continue
                if args.profile and (args.profile not in (obj.get("profile") or "")):
                    continue
                if args.provider and (args.provider not in (obj.get("provider") or "")):
                    continue
                if args.model and (args.model not in (obj.get("model") or "")):
                    continue

                payload = select_fields(obj, fields)
                if args.pretty:
                    results.append(payload)
                else:
                    print(json.dumps(payload, ensure_ascii=False))
                    printed += 1
                    if args.limit and printed >= args.limit:
                        break
            if not args.pretty and args.limit and printed >= args.limit:
                break

    if args.pretty:
        if args.limit:
            results = results[: args.limit]
        print(json.dumps(results, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
