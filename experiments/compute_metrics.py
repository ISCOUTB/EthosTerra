#!/usr/bin/env python3
"""Compute Productividad and Bienestar metrics for Experiment 5 treatments.

Formulas:
  Productividad = Normalize( (final_money_avg + total_harvested) / avg_parcels )
  Bienestar     = Normalize( positive_emotion_count - negative_emotion_count + health_avg )

Normalization: min-max across all 27 treatments → values in [0, 1].
"""

from __future__ import annotations

import csv
import json
import argparse
from pathlib import Path
from collections import defaultdict


PROJECT_ROOT = Path(__file__).resolve().parent.parent
E5_DIR = PROJECT_ROOT / "data" / "experiments" / "E5"

EMOTION_POSITIVE = {"positive", "happy", "joy", "satisfied", "grateful", "optimistic"}
EMOTION_NEGATIVE = {"negative", "sad", "angry", "frustrated", "fearful", "pessimistic"}


def analyze_treatment(csv_path: Path) -> dict:
    """Extract key metrics from a single treatment CSV."""
    if not csv_path.exists():
        return {"error": f"CSV not found: {csv_path}"}

    money_values = []
    health_values = []
    harvested_total = 0.0
    parcels_final: dict[str, float] = {}
    emotion_counts = {"positive": 0, "negative": 0, "neutral": 0}
    agent_data: dict[str, dict] = {}

    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            agent = row.get("agent", "")
            if not agent:
                continue
            try:
                money = float(row.get("money", 0))
                health = float(row.get("health", 0))
                harvested = float(row.get("harvested_weight", 0))
                parcels = float(row.get("lands_count", 0))
                emotion = (row.get("emotion") or "").strip().lower()

                money_values.append(money)
                health_values.append(health)
                harvested_total += harvested
                parcels_final[agent] = parcels

                if emotion in EMOTION_POSITIVE:
                    emotion_counts["positive"] += 1
                elif emotion in EMOTION_NEGATIVE:
                    emotion_counts["negative"] += 1
                else:
                    emotion_counts["neutral"] += 1

                agent_data[agent] = {"money": money, "health": health}
            except (ValueError, TypeError):
                continue

    n_agents = len(agent_data)
    if n_agents == 0:
        return {"error": "No agent data found"}

    final_money_avg = sum(d["money"] for d in agent_data.values()) / n_agents
    health_avg = sum(d["health"] for d in agent_data.values()) / n_agents
    avg_parcels = sum(parcels_final.values()) / len(parcels_final) if parcels_final else 1.0

    eP = emotion_counts["positive"]
    eN = emotion_counts["negative"]

    # Raw (unnormalized) metrics
    return {
        "agent_count": n_agents,
        "total_rows": len(money_values),
        "final_money_avg": final_money_avg,
        "health_avg": health_avg,
        "total_harvested": harvested_total,
        "avg_parcels": avg_parcels,
        "positive_emotions": eP,
        "negative_emotions": eN,
        "neutral_emotions": emotion_counts["neutral"],
        "raw_productividad": (final_money_avg + harvested_total) / max(avg_parcels, 0.01),
        "raw_bienestar": (eP - eN) + health_avg,
    }


def normalize(values: list[float]) -> list[float]:
    """Min-max normalize a list of values to [0, 1]."""
    if not values:
        return values
    vmin = min(values)
    vmax = max(values)
    if vmax == vmin:
        return [0.5] * len(values)
    return [(v - vmin) / (vmax - vmin) for v in values]


def compute_all(treatment_ids: list[str]) -> dict:
    """Compute metrics for all treatments and normalize."""
    raw_results = {}
    for tid in treatment_ids:
        csv_path = E5_DIR / tid / "wpsSimulator.csv"
        raw_results[tid] = analyze_treatment(csv_path)

    # Collect raw values
    prod_vals = []
    bien_vals = []
    valid_tids = []
    for tid in treatment_ids:
        r = raw_results.get(tid, {})
        if "error" not in r:
            prod_vals.append(r["raw_productividad"])
            bien_vals.append(r["raw_bienestar"])
            valid_tids.append(tid)

    # Normalize
    norm_prod = normalize(prod_vals)
    norm_bien = normalize(bien_vals)

    # Build final results
    results = {}
    for i, tid in enumerate(valid_tids):
        r = raw_results[tid]
        results[tid] = [
            round(norm_prod[i], 3),
            round(norm_bien[i], 3),
        ]

    return {
        "results": results,
        "raw": raw_results,
        "raw_productividad_range": [min(prod_vals), max(prod_vals)] if prod_vals else [0, 0],
        "raw_bienestar_range": [min(bien_vals), max(bien_vals)] if bien_vals else [0, 0],
    }


def compare_with_reference(
    python_results: dict[str, list[float]],
    reference: dict[str, list[float]],
) -> dict:
    """Compare Python results with Java reference values."""
    try:
        import numpy as np
        from scipy import stats
    except ImportError:
        return {"error": "numpy/scipy not available; install for correlations"}

    py_prod = []
    ref_prod = []
    py_bien = []
    ref_bien = []
    common_ids = []

    for tid, ref_vals in reference.items():
        if tid in python_results:
            py_vals = python_results[tid]
            common_ids.append(tid)
            py_prod.append(py_vals[0])
            ref_prod.append(ref_vals[0])
            py_bien.append(py_vals[1])
            ref_bien.append(ref_vals[1])

    if len(common_ids) < 3:
        return {"error": "Insufficient common treatments for comparison"}

    prod_spearman, _ = stats.spearmanr(ref_prod, py_prod)
    prod_pearson, _ = stats.pearsonr(ref_prod, py_prod)
    bien_spearman, _ = stats.spearmanr(ref_bien, py_bien)
    bien_pearson, _ = stats.pearsonr(ref_bien, py_bien)

    # RMSE
    rmse_prod = np.sqrt(np.mean((np.array(ref_prod) - np.array(py_prod)) ** 2))
    rmse_bien = np.sqrt(np.mean((np.array(ref_bien) - np.array(py_bien)) ** 2))
    mad_prod = np.mean(np.abs(np.array(ref_prod) - np.array(py_prod)))
    mad_bien = np.mean(np.abs(np.array(ref_bien) - np.array(py_bien)))

    # Rankings
    ref_ranks = {cid: i + 1 for i, (cid, _) in enumerate(
        sorted(zip(common_ids, ref_prod), key=lambda x: -x[1])
    )}
    py_ranks = {cid: i + 1 for i, (cid, _) in enumerate(
        sorted(zip(common_ids, py_prod), key=lambda x: -x[1])
    )}

    # Top-5 and bottom-5 intersection
    ref_top5 = set(sorted(ref_ranks, key=lambda x: ref_ranks[x])[:5])
    py_top5 = set(sorted(py_ranks, key=lambda x: py_ranks[x])[:5])
    ref_bot5 = set(sorted(ref_ranks, key=lambda x: -ref_ranks[x])[:5])
    py_bot5 = set(sorted(py_ranks, key=lambda x: -py_ranks[x])[:5])

    rank_shifts = [abs(ref_ranks[c] - py_ranks[c]) for c in common_ids]
    mean_rank_shift = np.mean(rank_shifts)

    return {
        "correlations": {
            "productivity_spearman": round(prod_spearman, 4),
            "productivity_pearson": round(prod_pearson, 4),
            "wellbeing_spearman": round(bien_spearman, 4),
            "wellbeing_pearson": round(bien_pearson, 4),
        },
        "rmse": {
            "productivity": round(float(rmse_prod), 4),
            "wellbeing": round(float(rmse_bien), 4),
        },
        "mean_abs_diff": {
            "productivity": round(float(mad_prod), 4),
            "wellbeing": round(float(mad_bien), 4),
        },
        "mean_rank_shift": round(float(mean_rank_shift), 1),
        "top5_intersection_prod": sorted(ref_top5 & py_top5),
        "bottom5_intersection_prod": sorted(ref_bot5 & py_bot5),
        "python_results": python_results,
        "reference_results": reference,
        "rank_shifts": {c: int(s) for c, s in zip(common_ids, rank_shifts)},
    }


def main():
    parser = argparse.ArgumentParser(description="Compute E5 metrics")
    parser.add_argument("--reference", type=str, default="",
                        help="Path to reference JSON (e.g. comparison.json from Java)")
    parser.add_argument("--output-dir", type=str, default=str(E5_DIR),
                        help="Output directory")
    args = parser.parse_args()

    from experiments.experimento5 import TREATMENTS as E5_TREATMENTS
    treatment_ids = list(E5_TREATMENTS.keys())

    print(f"Computing metrics for {len(treatment_ids)} treatments...")
    data = compute_all(treatment_ids)

    results = data["results"]
    print(f"\n  Raw productividad range: [{data['raw_productividad_range'][0]:.1f}, {data['raw_productividad_range'][1]:.1f}]")
    print(f"  Raw bienestar range:     [{data['raw_bienestar_range'][0]:.1f}, {data['raw_bienestar_range'][1]:.1f}]")

    # Top/bottom by productividad
    sorted_prod = sorted(results.items(), key=lambda x: -x[1][0])
    print("\n  Top 5 Productividad:")
    for tid, (p, b) in sorted_prod[:5]:
        print(f"    {tid}: Prod={p:.3f}, Bien={b:.3f}")
    print("  Bottom 5 Productividad:")
    for tid, (p, b) in sorted_prod[-5:]:
        print(f"    {tid}: Prod={p:.3f}, Bien={b:.3f}")

    # Save metrics JSON
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    metrics_path = output_dir / "metrics.json"
    metrics_path.write_text(json.dumps({
        "results": results,
        "raw": {tid: {k: v for k, v in raw.items() if k != "error"}
                for tid, raw in data["raw"].items() if "error" not in raw},
    }, indent=2, default=str))
    print(f"\nMetrics saved to: {metrics_path}")

    # Compare with reference if provided
    if args.reference:
        ref_path = Path(args.reference)
        if ref_path.exists():
            ref_data = json.loads(ref_path.read_text())
            ref_results = ref_data.get("reference_results", ref_data.get("results", {}))
            comparison = compare_with_reference(results, ref_results)
            if "error" not in comparison:
                comp_path = output_dir / "comparison.json"
                comp_path.write_text(json.dumps(comparison, indent=2, default=str))
                print(f"Comparison saved to: {comp_path}")
                print(f"\n  Spearman prod: {comparison['correlations']['productivity_spearman']:.4f}")
                print(f"  Spearman bien: {comparison['correlations']['wellbeing_spearman']:.4f}")
                print(f"  RMSE prod:     {comparison['rmse']['productivity']:.4f}")
                print(f"  RMSE bien:     {comparison['rmse']['wellbeing']:.4f}")
                print(f"  Rank shift:    {comparison['mean_rank_shift']:.1f}")
            else:
                print(f"Comparison error: {comparison['error']}")
        else:
            print(f"Reference file not found: {args.reference}")

if __name__ == "__main__":
    main()
