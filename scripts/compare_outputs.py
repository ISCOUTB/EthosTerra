#!/usr/bin/env python3
"""
compare_outputs.py — Statistical comparison between Java and Python simulation outputs.

Usage:
    python compare_outputs.py --java java.csv --python python.csv [--tolerance 0.15]

Uses Kolmogorov-Smirnov test to determine if two simulation runs produce
statistically equivalent distributions.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats


def compare_simulations(
    java_csv: str,
    python_csv: str,
    tolerance: float = 0.15,
    verbose: bool = True,
) -> bool:
    java = pd.read_csv(java_csv)
    python = pd.read_csv(python_csv)

    metrics = {
        "money_final":       ("money", stats.ks_2samp),
        "health_avg":        ("health", stats.ks_2samp),
        "harvests_count":    ("harvested_weight", stats.ks_2samp),
        "loans_active":      ("loans_active", stats.ks_2samp),
        "food_security":     ("food_security", stats.ks_2samp),
        "days_in_crisis":    ("days_in_crisis", stats.ks_2samp),
    }

    results = {}
    for name, (col, test_fn) in metrics.items():
        java_vals = java[col].dropna()
        py_vals = python[col].dropna()
        if len(java_vals) == 0 or len(py_vals) == 0:
            results[name] = {"error": "empty column", "passed": False}
            continue
        stat, p_value = test_fn(java_vals, py_vals)
        mean_java = float(java_vals.mean())
        mean_py = float(py_vals.mean())
        mean_diff = abs(mean_java - mean_py) / max(abs(mean_java), 0.01)
        passed = p_value > 0.05
        results[name] = {
            "statistic": float(stat),
            "p_value": float(p_value),
            "mean_java": mean_java,
            "mean_py": mean_py,
            "mean_diff_pct": mean_diff,
            "passed": passed,
        }

    for col in ["money", "health", "food_security"]:
        if col not in java.columns or col not in python.columns:
            continue
        java_ts = java.groupby("date")[col].mean()
        py_ts = python.groupby("date")[col].mean()
        common = java_ts.index.intersection(py_ts.index)
        if len(common) > 10:
            corr = float(java_ts[common].corr(py_ts[common]))
            passed = corr > 0.8
            results[f"temporal_corr_{col}"] = {
                "correlation": corr,
                "common_dates": len(common),
                "passed": passed,
            }

    failed = [k for k, v in results.items() if not v.get("passed", False)]

    if verbose:
        print("=" * 60)
        print("COMPARISON RESULTS (Java vs Python)")
        print("=" * 60)
        for name, res in sorted(results.items()):
            if "error" in res:
                status = "SKIP"
            else:
                status = "PASS" if res.get("passed") else "FAIL"
            print(f"  [{status}] {name}")
            if "p_value" in res:
                print(f"         p={res['p_value']:.4f}  "
                      f"Java={res['mean_java']:.2f}  "
                      f"Python={res['mean_py']:.2f}  "
                      f"diff={res['mean_diff_pct']:.1%}")
            if "correlation" in res:
                print(f"         corr={res['correlation']:.4f}  "
                      f"dates={res['common_dates']}")
        print("=" * 60)

    if failed:
        print(f"FAIL: {len(failed)} metrics out of tolerance: {failed}")
        return False
    print("PASS: Python produces statistically equivalent distributions to Java")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare Java vs Python simulation outputs"
    )
    parser.add_argument("--java", required=True, help="Java CSV file")
    parser.add_argument("--python", required=True, help="Python CSV file")
    parser.add_argument("--tolerance", type=float, default=0.15)
    args = parser.parse_args()

    ok = compare_simulations(args.java, args.python, args.tolerance)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
