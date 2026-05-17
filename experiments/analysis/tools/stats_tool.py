"""Análisis estadístico: Taguchi, distribuciones, score stats."""
from __future__ import annotations

import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def compute_treatment_metrics(treatment_ids: list[str]) -> dict[str, dict]:
    """Productividad + bienestar (normalizados) + crisis_rate por tratamiento."""
    from experiments.compute_metrics import compute_all
    raw_data = compute_all(treatment_ids)
    results = raw_data.get("results", {})
    raw = raw_data.get("raw", {})

    output: dict[str, dict] = {}
    for tid in treatment_ids:
        if tid not in results:
            continue
        prod, bien = results[tid]
        crisis_rate = _compute_crisis_rate(tid)
        output[tid] = {
            "productividad": prod,
            "bienestar": bien,
            "crisis_rate": crisis_rate,
            "raw": raw.get(tid, {}),
        }
    return output


def _compute_crisis_rate(treatment_id: str) -> float:
    from experiments.analysis.tools.data_tool import load_treatment_csv
    rows = load_treatment_csv(treatment_id)
    if not rows:
        return 0.0
    crisis = sum(
        1 for r in rows
        if _safe_float(r.get("money", "0")) < 500_000
        and _safe_float(r.get("money", "0")) > 0
    )
    return round(crisis / len(rows), 4)


def episode_type_distribution(episodes: list[Any]) -> dict[str, int]:
    types = [
        ep.episode_type if hasattr(ep, "episode_type") else ep.get("episode_type", "")
        for ep in episodes
    ]
    return dict(Counter(types))


def score_statistics(entries: list[dict]) -> dict:
    by_type: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        by_type[e.get("episode_type", "UNKNOWN")].append(e.get("scores", {}))

    result: dict[str, dict] = {}
    for ep_type, score_list in by_type.items():
        metrics = ["variable_id", "comprehensibility", "faithfulness"]
        stats: dict[str, dict] = {}
        for m in metrics:
            vals = [s[m] for s in score_list if m in s]
            if vals:
                stats[m] = {
                    "avg": round(sum(vals) / len(vals), 3),
                    "min": round(min(vals), 3),
                    "max": round(max(vals), 3),
                    "n": len(vals),
                }
        result[ep_type] = stats
    return result


def taguchi_main_effects(
    treatment_params: dict[str, dict],
    metrics: dict[str, dict],
) -> dict:
    """Efectos principales Taguchi: para cada factor y nivel, media de productividad/bienestar."""
    factors = ["money", "land", "personality", "tools", "seeds", "water"]
    effects: dict[str, dict] = {f: {} for f in factors}

    for factor in factors:
        level_data: dict[Any, list[tuple[float, float]]] = defaultdict(list)
        for tid, params in treatment_params.items():
            if tid not in metrics:
                continue
            level = params.get(factor)
            if level is None:
                continue
            prod = metrics[tid].get("productividad", 0.0)
            bien = metrics[tid].get("bienestar", 0.0)
            level_data[level].append((prod, bien))

        for level, vals in level_data.items():
            prods = [v[0] for v in vals]
            biens = [v[1] for v in vals]
            effects[factor][level] = {
                "productividad": round(sum(prods) / len(prods), 4),
                "bienestar": round(sum(biens) / len(biens), 4),
                "n": len(vals),
            }

    return effects


def identify_top_factor(taguchi_effects: dict, metric: str = "productividad") -> str:
    """Factor con mayor rango de efecto (max-min) sobre la métrica dada."""
    factor_labels = {
        "money": "capital inicial",
        "land": "extensión de tierra",
        "personality": "personalidad del agente",
        "tools": "herramientas disponibles",
        "seeds": "semillas disponibles",
        "water": "disponibilidad de agua",
    }
    max_range = -1.0
    top = ""
    for factor, levels in taguchi_effects.items():
        vals = [lv[metric] for lv in levels.values() if metric in lv]
        if len(vals) >= 2:
            r = max(vals) - min(vals)
            if r > max_range:
                max_range = r
                top = factor_labels.get(factor, factor)
    return top or "capital inicial"


def build_metrics_table_html(treatment_results: list) -> str:
    rows_html = []
    for tr in treatment_results:
        rows_html.append(
            f"<tr><td>{tr.treatment_id}</td>"
            f"<td>{tr.productividad:.3f}</td>"
            f"<td>{tr.bienestar:.3f}</td>"
            f"<td>{tr.crisis_rate:.1%}</td>"
            f"<td>{len(tr.episode_results)}</td></tr>"
        )
    return (
        "<table class='metrics-table'>"
        "<tr><th>Tratamiento</th><th>Productividad</th>"
        "<th>Bienestar</th><th>Tasa de Crisis</th><th>Episodios</th></tr>"
        + "".join(rows_html)
        + "</table>"
    )


def build_metrics_table_prompt(treatment_results: list) -> str:
    lines = ["| Tratamiento | Productividad | Bienestar | Crisis | Episodios |",
             "|-------------|--------------|-----------|--------|-----------|"]
    for tr in treatment_results:
        lines.append(
            f"| {tr.treatment_id} | {tr.productividad:.3f} | "
            f"{tr.bienestar:.3f} | {tr.crisis_rate:.1%} | "
            f"{len(tr.episode_results)} |"
        )
    return "\n".join(lines)


def _safe_float(v: str) -> float:
    try:
        return float(v)
    except (ValueError, TypeError):
        return 0.0
