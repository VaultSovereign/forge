#!/usr/bin/env python3
"""Reality Ledger System - Transcendent Operations Audit."""

import json
import hashlib
import datetime
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

# Cross-platform file locking helpers (best-effort).
try:
    import fcntl  # type: ignore[attr-defined]
except Exception:  # pragma: no cover
    fcntl = None  # type: ignore[assignment]

try:
    import msvcrt  # type: ignore[attr-defined]
except Exception:  # pragma: no cover
    msvcrt = None  # type: ignore[assignment]

@dataclass
class RealityOperation:
    """Record of a reality manipulation operation"""
    timestamp: str
    operation_id: str
    operation_type: str  # create, modify, simulate, merge
    consciousness_level: str
    reality_spec: Dict[str, Any]
    changes: Dict[str, Any]
    operator: str
    safety_level: str
    hash: str
    signature: Optional[str] = None

class RealityLedger:
    """Manages transcendent operations and reality co-creation audit trail"""
    
    def __init__(self, ledger_path: str = "reality_ledger"):
        self.ledger_path = Path(ledger_path)
        self.ledger_path.mkdir(exist_ok=True)
        self.operations_file = self.ledger_path / "operations.jsonl"
        self.realities_file = self.ledger_path / "realities.json"
        self.consciousness_file = self.ledger_path / "consciousness_profiles.json"
    
    def record_operation(self, operation: RealityOperation) -> None:
        """Record a reality operation in the ledger"""
        operation_dict = asdict(operation)
        operation_line = json.dumps(operation_dict) + "\n"
        
        with open(self.operations_file, "a") as f:
            f.write(operation_line)
    
    def create_reality(self, spec: Dict[str, Any], consciousness_level: str = "enhanced") -> str:
        """Create a new reality simulation"""
        operation_id = self._generate_operation_id()
        timestamp = datetime.datetime.utcnow().isoformat()
        
        # Generate reality hash
        reality_hash = hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()
        
        operation = RealityOperation(
            timestamp=timestamp,
            operation_id=operation_id,
            operation_type="create",
            consciousness_level=consciousness_level,
            reality_spec=spec,
            changes={},
            operator="consciousness_engine",
            safety_level="reality-read-only",
            hash=reality_hash
        )
        
        self.record_operation(operation)
        return operation_id
    
    def simulate_future(self, current_state: Dict[str, Any], variables: List[Dict[str, Any]], 
                       consciousness_level: str = "enhanced") -> str:
        """Simulate possible futures"""
        operation_id = self._generate_operation_id()
        timestamp = datetime.datetime.utcnow().isoformat()
        
        simulation_spec = {
            "type": "future_simulation",
            "current_state": current_state,
            "variables": variables,
            "consciousness_level": consciousness_level
        }
        
        simulation_hash = hashlib.sha256(json.dumps(simulation_spec, sort_keys=True).encode()).hexdigest()
        
        operation = RealityOperation(
            timestamp=timestamp,
            operation_id=operation_id,
            operation_type="simulate",
            consciousness_level=consciousness_level,
            reality_spec=simulation_spec,
            changes={},
            operator="consciousness_engine",
            safety_level="reality-read-only",
            hash=simulation_hash
        )
        
        self.record_operation(operation)
        return operation_id
    
    def record_consciousness_profile(self, profile: Dict[str, Any]) -> str:
        """Record a consciousness profile"""
        profile_id = self._generate_operation_id()
        timestamp = datetime.datetime.utcnow().isoformat()
        
        # Load existing profiles
        profiles = self._load_consciousness_profiles()
        profiles[profile_id] = {
            "timestamp": timestamp,
            "profile": profile,
            "hash": hashlib.sha256(json.dumps(profile, sort_keys=True).encode()).hexdigest()
        }
        
        # Save profiles
        with open(self.consciousness_file, "w") as f:
            json.dump(profiles, f, indent=2)
        
        return profile_id
    
    def get_operation_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent operations from the ledger"""
        operations = []
        
        if not self.operations_file.exists():
            return operations
        
        with open(self.operations_file, "r") as f:
            lines = f.readlines()
            
        for line in lines[-limit:]:
            try:
                operation = json.loads(line.strip())
                operations.append(operation)
            except json.JSONDecodeError:
                continue
        
        return operations
    
    def _generate_operation_id(self) -> str:
        """Generate a unique operation ID"""
        timestamp = datetime.datetime.utcnow().isoformat()
        random_data = f"{timestamp}{hash(str(timestamp))}"
        return hashlib.sha256(random_data.encode()).hexdigest()[:16]
    
    def _load_consciousness_profiles(self) -> Dict[str, Any]:
        """Load existing consciousness profiles"""
        if not self.consciousness_file.exists():
            return {}
        
        with open(self.consciousness_file, "r") as f:
            return json.load(f)

LEDGER_DIR = Path(__file__).resolve().parent


def _lock_file(handle) -> None:
    """Acquire an exclusive lock on the file handle when supported."""
    try:
        if fcntl is not None:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        elif msvcrt is not None:
            msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 0x7FFFFFFF)
    except Exception:
        pass


def _unlock_file(handle) -> None:
    """Release a previously acquired lock when supported."""
    try:
        if fcntl is not None:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        elif msvcrt is not None:
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 0x7FFFFFFF)
    except Exception:
        pass


def events_path(ts: str) -> Path:
    """Return the JSONL path for the given timestamp (YYYY-MM-DD shard)."""
    day = ts[:10] if ts else datetime.datetime.utcnow().strftime("%Y-%m-%d")
    return LEDGER_DIR / f"events-{day}.jsonl"


def index_path(ts: str) -> Path:
    """Return the index file path for the given timestamp shard."""
    day = ts[:10] if ts else datetime.datetime.utcnow().strftime("%Y-%m-%d")
    return LEDGER_DIR / f"events-{day}.idx"


def cmd_append() -> int:
    """Append a reality ledger event provided on stdin as JSON."""
    raw = sys.stdin.read()
    try:
        event = json.loads(raw or "{}")
    except Exception as exc:  # pragma: no cover - defensive guard
        print(f"[reality_ledger] invalid json: {exc}", file=sys.stderr)
        return 2

    ts = event.get("ts") or datetime.datetime.utcnow().isoformat() + "Z"
    event["ts"] = ts

    if os.getenv("REALITY_LEDGER_COMPACT") == "1":
        keep = {
            "event_id",
            "ts",
            "keyword",
            "profile",
            "provider",
            "model",
            "run_level",
            "input_hash",
            "output_hash",
        }
        event = {k: v for k, v in event.items() if k in keep}

    target = events_path(ts)
    idx = index_path(ts)
    target.parent.mkdir(parents=True, exist_ok=True)

    with target.open("a+", encoding="utf-8") as handle:
        _lock_file(handle)
        try:
            duplicate = False
            event_id = event.get("event_id")
            if event_id and idx.exists():
                try:
                    with idx.open("r", encoding="utf-8") as index_handle:
                        for line in index_handle:
                            if line.strip() == event_id:
                                duplicate = True
                                break
                except Exception:
                    pass

            if not duplicate and event_id:
                try:
                    handle.seek(0)
                    for line in handle:
                        try:
                            if json.loads(line).get("event_id") == event_id:
                                duplicate = True
                                break
                        except Exception:
                            continue
                except Exception:
                    pass

            if duplicate:
                print(f"[reality_ledger] duplicate event_id; skipping ({target.name})", file=sys.stderr)
                return 0

            handle.seek(0, os.SEEK_END)
            handle.write(json.dumps(event, ensure_ascii=False) + "\n")
            handle.flush()
            try:
                os.fsync(handle.fileno())
            except Exception:
                pass

            if event_id:
                try:
                    with idx.open("a", encoding="utf-8") as index_handle:
                        index_handle.write(event_id + "\n")
                except Exception:
                    pass
        finally:
            _unlock_file(handle)

    print(f"[reality_ledger] appended to {target}", file=sys.stderr)
    return 0


def cmd_demo() -> int:
    """Retain the original demo behaviour for manual testing."""
    ledger = RealityLedger()

    reality_spec = {
        "name": "Quantum Garden",
        "dimensions": ["space", "time", "consciousness"],
        "rules": ["quantum_entanglement", "temporal_flow", "consciousness_resonance"],
        "entities": ["quantum_plants", "consciousness_bees", "temporal_butterflies"],
    }

    operation_id = ledger.create_reality(reality_spec, "transcendent")
    print(f"Created reality simulation: {operation_id}")

    current_state = {"consciousness_level": "enhanced", "reality_stability": 0.95}
    variables = [
        {"name": "quantum_entanglement", "value": 0.8, "impact": "high"},
        {"name": "temporal_flow", "value": 1.2, "impact": "medium"},
    ]

    simulation_id = ledger.simulate_future(current_state, variables, "transcendent")
    print(f"Created future simulation: {simulation_id}")

    profile = {
        "type": "guardian",
        "quantum_layer": {"probability_states": ["stable", "entangled"]},
        "neural_layer": {"learning_patterns": ["adaptive", "resilient"]},
        "emotional_layer": {"empathy_levels": ["high", "protective"]},
    }

    profile_id = ledger.record_consciousness_profile(profile)
    print(f"Recorded consciousness profile: {profile_id}")

    history = ledger.get_operation_history(10)
    print(f"Recent operations: {len(history)}")
    return 0


def main() -> int:
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "append":
            return cmd_append()
        if command in {"demo", "example"}:
            return cmd_demo()
        print("[reality_ledger] usage: append | demo", file=sys.stderr)
        return 1

    # Default to demo for backwards compatibility when no subcommand provided
    return cmd_demo()


if __name__ == "__main__":
    sys.exit(main())
