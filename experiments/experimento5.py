#!/usr/bin/env python3
"""Batch experiment runner for EthosTerra Experiment 5.

Reproduces the 27 treatments from Table \\ref{tab:factoresE5}.
Each treatment runs with 100 agents, 800 world parcels, 5 years.

Output per treatment: data/experiments/E5/<treatment_id>/wpsSimulator.csv
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

TREATMENTS: dict[str, dict] = {
    "E401": {"money": 750000,  "land": 2,  "personality": 0.7,  "tools": 10,     "seeds": 10,     "water": 0},
    "E402": {"money": 750000,  "land": 2,  "personality": 0.7,  "tools": 10,     "seeds": 999999, "water": 999999},
    "E403": {"money": 750000,  "land": 2,  "personality": 0.7,  "tools": 10,     "seeds": 0,      "water": 0},
    "E404": {"money": 750000,  "land": 6,  "personality": 0.3,  "tools": 999999, "seeds": 10,     "water": 0},
    "E405": {"money": 750000,  "land": 6,  "personality": 0.3,  "tools": 999999, "seeds": 999999, "water": 999999},
    "E406": {"money": 750000,  "land": 6,  "personality": 0.3,  "tools": 999999, "seeds": 0,      "water": 0},
    "E407": {"money": 750000,  "land": 12, "personality": -0.5, "tools": 0,      "seeds": 10,     "water": 0},
    "E408": {"money": 750000,  "land": 12, "personality": -0.5, "tools": 0,      "seeds": 999999, "water": 999999},
    "E409": {"money": 750000,  "land": 12, "personality": -0.5, "tools": 0,      "seeds": 0,      "water": 0},
    "E410": {"money": 1500000, "land": 2,  "personality": 0.3,  "tools": 0,      "seeds": 10,     "water": 999999},
    "E411": {"money": 1500000, "land": 2,  "personality": 0.3,  "tools": 0,      "seeds": 999999, "water": 0},
    "E412": {"money": 1500000, "land": 2,  "personality": 0.3,  "tools": 0,      "seeds": 0,      "water": 0},
    "E413": {"money": 1500000, "land": 6,  "personality": -0.5, "tools": 10,     "seeds": 10,     "water": 999999},
    "E414": {"money": 1500000, "land": 6,  "personality": -0.5, "tools": 10,     "seeds": 999999, "water": 0},
    "E415": {"money": 1500000, "land": 6,  "personality": -0.5, "tools": 10,     "seeds": 0,      "water": 0},
    "E416": {"money": 1500000, "land": 12, "personality": 0.7,  "tools": 999999, "seeds": 10,     "water": 999999},
    "E417": {"money": 1500000, "land": 12, "personality": 0.7,  "tools": 999999, "seeds": 999999, "water": 0},
    "E418": {"money": 1500000, "land": 12, "personality": 0.7,  "tools": 999999, "seeds": 0,      "water": 0},
    "E419": {"money": 3000000, "land": 2,  "personality": -0.5, "tools": 999999, "seeds": 10,     "water": 0},
    "E420": {"money": 3000000, "land": 2,  "personality": -0.5, "tools": 999999, "seeds": 999999, "water": 0},
    "E421": {"money": 3000000, "land": 2,  "personality": -0.5, "tools": 999999, "seeds": 0,      "water": 999999},
    "E422": {"money": 3000000, "land": 6,  "personality": 0.7,  "tools": 0,      "seeds": 10,     "water": 0},
    "E423": {"money": 3000000, "land": 6,  "personality": 0.7,  "tools": 0,      "seeds": 999999, "water": 0},
    "E424": {"money": 3000000, "land": 6,  "personality": 0.7,  "tools": 0,      "seeds": 0,      "water": 999999},
    "E425": {"money": 3000000, "land": 12, "personality": 0.3,  "tools": 10,     "seeds": 10,     "water": 0},
    "E426": {"money": 3000000, "land": 12, "personality": 0.3,  "tools": 10,     "seeds": 999999, "water": 0},
    "E427": {"money": 3000000, "land": 12, "personality": 0.3,  "tools": 10,     "seeds": 0,      "water": 999999},
}

DEFAULT_AGENTS = 100
DEFAULT_YEARS = 5
DEFAULT_WORLD_LANDS = 800


def get_treatment_label(tid: str, params: dict) -> str:
    p_map = {-0.5: "Neg", 0.3: "Neu", 0.7: "Pos"}
    r_map_tools = {10: "Base", 999999: "Inf", 0: "Comp"}
    r_map_seeds = {10: "Base", 999999: "Inf", 0: "Comp"}
    r_map_water = {0: "No", 999999: "Inf", 0: "Comp"}
    w = params["water"]
    return (
        f"{tid}: $={params['money']:,} L={params['land']} "
        f"P={p_map.get(params['personality'], '?')} "
        f"T={r_map_tools.get(params['tools'], '?')} "
        f"S={r_map_seeds.get(params['seeds'], '?')} "
        f"W={r_map_water.get(w, '?')}"
    )


def run_treatment(
    tid: str,
    params: dict,
    agents: int = DEFAULT_AGENTS,
    years: int = DEFAULT_YEARS,
    world_lands: int = DEFAULT_WORLD_LANDS,
    speed: float = 0.0,
) -> dict:
    output_dir = PROJECT_ROOT / "data" / "experiments" / "E5" / tid
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "wpsSimulator.csv"

    env = {
        **os.environ,
        "PYTHONPATH": "besa-python:ethosterra-python",
        "ETHOSTERRA_ROOT": str(PROJECT_ROOT),
        "ETHOSTERRA_LOGS_PATH": str(csv_path),
    }

    cmd = [
        sys.executable,
        "ethosterra-python/ethosterra/start.py",
        "--agents", str(agents),
        "--years", str(years),
        "--money", str(params["money"]),
        "--land", str(params["land"]),
        "--personality", str(params["personality"]),
        "--tools", str(params["tools"]),
        "--seeds", str(params["seeds"]),
        "--water", str(params["water"]),
        "--world-lands", str(world_lands),
        "--variance", "0.4",
        "--irrigation", "1",
        "--emotions", "1",
        "--training", "1",
        "--speed", str(speed),
    ]

    label = get_treatment_label(tid, params)
    print(f"\n{'='*70}")
    print(f"  [{tid}] Starting: {label}")
    print(f"  Output: {csv_path}")
    print(f"  Agents: {agents}, Years: {years}, World parcels: {world_lands}")
    print(f"{'='*70}")

    start_time = time.time()

    try:
        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=3600,
        )
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start_time
        return {
            "treatment": tid,
            "params": params,
            "status": "timeout",
            "elapsed_sec": elapsed,
            "error": "Simulation exceeded 1 hour timeout",
        }

    elapsed = time.time() - start_time

    outcome = {
        "treatment": tid,
        "params": params,
        "status": "success" if result.returncode == 0 else "error",
        "returncode": result.returncode,
        "elapsed_sec": round(elapsed, 1),
        "csv_path": str(csv_path),
    }

    if result.returncode != 0:
        outcome["stderr"] = result.stderr[-2000:] if result.stderr else ""
        print(f"  [{tid}] FAILED (rc={result.returncode}) after {elapsed:.0f}s")
        if result.stderr:
            print(f"  stderr: {result.stderr[:500]}")
    else:
        csv_lines = 0
        if csv_path.exists():
            with open(csv_path) as f:
                csv_lines = sum(1 for _ in f)
        outcome["csv_rows"] = csv_lines
        print(f"  [{tid}] OK — {elapsed:.0f}s, {csv_lines} CSV rows")

    metadata_path = output_dir / "metadata.json"
    metadata_path.write_text(json.dumps(outcome, indent=2, default=str))

    return outcome


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Run EthosTerra Experiment 5 (27 treatments)")
    parser.add_argument("--agents", type=int, default=DEFAULT_AGENTS, help="Agents per treatment")
    parser.add_argument("--years", type=int, default=DEFAULT_YEARS, help="Years per treatment")
    parser.add_argument("--world-lands", type=int, default=DEFAULT_WORLD_LANDS, help="World parcels")
    parser.add_argument("--speed", type=float, default=0.0, help="Tick speed (0 = max)")
    parser.add_argument("--filter", type=str, default="", help="Comma-separated treatment IDs to run (e.g. E401,E405)")
    parser.add_argument("--skip", type=str, default="", help="Comma-separated treatment IDs to skip")
    parser.add_argument("--start-at", type=str, default="", help="Start from this treatment ID (inclusive)")
    args = parser.parse_args()

    run_ids = [t.strip() for t in args.filter.split(",") if t.strip()] if args.filter else list(TREATMENTS.keys())
    skip_ids = set(t.strip() for t in args.skip.split(",") if t.strip())

    results = []
    failed = []
    started = args.start_at == ""

    total = len(run_ids)
    print(f"Experiment 5: {total} treatment(s), {args.agents} agents, {args.years} years")
    print(f"World parcels: {args.world_lands}, Speed: {args.speed}")
    print(f"Start: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    for i, tid in enumerate(run_ids):
        if tid not in TREATMENTS:
            print(f"  Unknown treatment: {tid}")
            continue
        if tid in skip_ids:
            print(f"  [{tid}] SKIPPED")
            continue
        if args.start_at and not started:
            if tid == args.start_at:
                started = True
            else:
                print(f"  [{tid}] SKIPPED (before start-at)")
                continue

        params = TREATMENTS[tid]
        outcome = run_treatment(
            tid, params,
            agents=args.agents,
            years=args.years,
            world_lands=args.world_lands,
            speed=args.speed,
        )
        results.append(outcome)
        if outcome["status"] != "success":
            failed.append(tid)

        remaining = total - (i + 1)
        if remaining > 0:
            print(f"  [{i+1}/{total}] Remaining: {remaining}")

    print(f"\n{'='*70}")
    print(f"Experiment 5 finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    statuses = {}
    for r in results:
        s = r["status"]
        statuses[s] = statuses.get(s, 0) + 1
    for s, c in statuses.items():
        print(f"  {s}: {c}")
    if failed:
        print(f"  FAILED: {', '.join(failed)}")

    summary_path = PROJECT_ROOT / "data" / "experiments" / "E5" / "summary.json"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary = {
        "experiment": "E5",
        "agents": args.agents,
        "years": args.years,
        "world_lands": args.world_lands,
        "date": datetime.now().isoformat(),
        "results": results,
    }
    summary_path.write_text(json.dumps(summary, indent=2, default=str))
    print(f"\nSummary: {summary_path}")
    print(f"Output dir: {PROJECT_ROOT / 'data' / 'experiments' / 'E5'}")


if __name__ == "__main__":
    main()
