#!/usr/bin/env python3
"""Métricas de acuerdo inter-evaluadores para el experimento de explicabilidad.

Calcula:
  - Fleiss' Kappa: acuerdo entre ≥2 evaluadores por criterio
  - Cronbach's Alpha: consistencia interna por evaluador
  - Estadísticas descriptivas por tipo de episodio

Uso:
  python experiments/explainability/validation/inter_rater.py \\
    --reports-dir reports/explainability/expert/

Salida:
  reports/explainability/expert/inter_rater_analysis.json
  reports/explainability/expert/inter_rater_analysis.md
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from statistics import mean, stdev

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
REPORTS_DIR = PROJECT_ROOT / "reports" / "explainability" / "expert"
CRITERIA = ["variable_id", "comprehensibility", "faithfulness"]


def load_evaluations(reports_dir: Path) -> dict[str, list[dict]]:
    """Carga todos los JSON de evaluadores. Retorna {evaluador: [evaluaciones]}."""
    result = {}
    for f in sorted(reports_dir.glob("evaluator_*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        evaluator = data.get("evaluator", f.stem)
        evaluations = [e for e in data.get("evaluations", []) if e.get("index")]
        result[evaluator] = evaluations
    return result


def fleiss_kappa(ratings_matrix: list[list[int]], n_categories: int = 5) -> float:
    """
    Calcula Fleiss' Kappa para múltiples evaluadores.
    ratings_matrix: filas = ítems, columnas = evaluadores (valores 1-5)
    """
    n_items = len(ratings_matrix)
    n_raters = len(ratings_matrix[0]) if ratings_matrix else 0
    if n_items == 0 or n_raters < 2:
        return float("nan")

    # Matriz de categorías: n_items × n_categories
    cat_counts: list[list[int]] = []
    for row in ratings_matrix:
        counts = [0] * (n_categories + 1)
        for r in row:
            if 1 <= r <= n_categories:
                counts[r] += 1
        cat_counts.append(counts[1:])  # índices 1-5

    p_i = []
    for counts in cat_counts:
        total = sum(counts)
        if total < 2:
            p_i.append(0.0)
            continue
        s = sum(c * (c - 1) for c in counts)
        p_i.append(s / (total * (total - 1)))

    p_bar = mean(p_i) if p_i else 0.0

    # p_j: proporción de asignaciones a categoría j
    all_ratings = [r for row in ratings_matrix for r in row if 1 <= r <= n_categories]
    if not all_ratings:
        return float("nan")
    p_j = [all_ratings.count(k) / len(all_ratings) for k in range(1, n_categories + 1)]
    p_e = sum(pj ** 2 for pj in p_j)

    if p_e >= 1.0:
        return float("nan")
    return (p_bar - p_e) / (1.0 - p_e)


def cronbach_alpha(scores: list[list[float]]) -> float:
    """
    Cronbach's Alpha para una lista de ítems × criterios.
    scores: lista de vectores de puntajes por ítem (cada vector = puntajes en los criterios)
    """
    if len(scores) < 2:
        return float("nan")
    k = len(scores[0])
    if k < 2:
        return float("nan")

    item_vars = []
    for j in range(k):
        col = [scores[i][j] for i in range(len(scores)) if scores[i][j] > 0]
        if len(col) >= 2:
            item_vars.append(_variance(col))
        else:
            item_vars.append(0.0)

    total_scores = [sum(row) for row in scores]
    total_var = _variance(total_scores) if len(total_scores) >= 2 else 0.0

    if total_var == 0:
        return float("nan")
    return (k / (k - 1)) * (1 - sum(item_vars) / total_var)


def _variance(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    return sum((v - m) ** 2 for v in values) / (len(values) - 1)


def analyze(reports_dir: Path) -> dict:
    all_evals = load_evaluations(reports_dir)
    if not all_evals:
        print("No se encontraron archivos evaluator_*.json en", reports_dir)
        return {}

    evaluator_names = list(all_evals.keys())
    print(f"\nEvaluadores: {evaluator_names}")

    # Alinear evaluaciones por índice
    all_indices = sorted(set(e["index"] for evals in all_evals.values() for e in evals))
    print(f"Ítems evaluados (al menos por 1): {len(all_indices)}")

    results: dict = {
        "evaluators": evaluator_names,
        "n_items": len(all_indices),
        "fleiss_kappa": {},
        "cronbach_alpha": {},
        "descriptive": {},
        "by_episode_type": {},
    }

    # Fleiss' Kappa por criterio
    for criterion in CRITERIA:
        matrix: list[list[int]] = []
        for idx in all_indices:
            row = []
            for evals in all_evals.values():
                score = next((e.get(criterion, 0) for e in evals if e["index"] == idx), 0)
                if score and score > 0:
                    row.append(int(score))
            if len(row) >= 2:
                matrix.append(row)
        kappa = fleiss_kappa(matrix)
        results["fleiss_kappa"][criterion] = round(kappa, 4) if not math.isnan(kappa) else None
        print(f"  Fleiss Kappa [{criterion}]: {kappa:.4f}" if not math.isnan(kappa) else f"  Fleiss Kappa [{criterion}]: N/A")

    # Cronbach's Alpha por evaluador
    for evaluator, evals in all_evals.items():
        scores_matrix = []
        for e in evals:
            row = [float(e.get(c, 0) or 0) for c in CRITERIA]
            if any(v > 0 for v in row):
                scores_matrix.append(row)
        alpha = cronbach_alpha(scores_matrix)
        results["cronbach_alpha"][evaluator] = round(alpha, 4) if not math.isnan(alpha) else None
        print(f"  Cronbach Alpha [{evaluator}]: {alpha:.4f}" if not math.isnan(alpha) else f"  Cronbach Alpha [{evaluator}]: N/A")

    # Estadísticas descriptivas por criterio
    for criterion in CRITERIA:
        all_scores = [
            float(e.get(criterion, 0) or 0)
            for evals in all_evals.values()
            for e in evals
            if e.get(criterion, 0)
        ]
        if all_scores:
            results["descriptive"][criterion] = {
                "n": len(all_scores),
                "mean": round(mean(all_scores), 3),
                "std": round(stdev(all_scores), 3) if len(all_scores) > 1 else 0.0,
                "min": min(all_scores),
                "max": max(all_scores),
            }

    # Por tipo de episodio
    episode_types: dict[str, list[dict]] = {}
    for evals in all_evals.values():
        for e in evals:
            ep_type = e.get("episode_type", "UNKNOWN")
            episode_types.setdefault(ep_type, []).append(e)

    for ep_type, items in episode_types.items():
        results["by_episode_type"][ep_type] = {}
        for criterion in CRITERIA:
            scores = [float(e.get(criterion, 0) or 0) for e in items if e.get(criterion, 0)]
            if scores:
                results["by_episode_type"][ep_type][criterion] = {
                    "n": len(scores),
                    "mean": round(mean(scores), 3),
                }

    return results


def generate_markdown_report(results: dict, out_path: Path) -> None:
    lines = [
        "# Análisis Inter-Evaluador — EthosTerra / 20CCC",
        "",
        f"**Evaluadores:** {', '.join(results.get('evaluators', []))}",
        f"**Ítems evaluados:** {results.get('n_items', 0)}",
        "",
        "## Fleiss' Kappa (acuerdo entre evaluadores)",
        "",
        "| Criterio | κ | Interpretación |",
        "|----------|---|----------------|",
    ]
    for criterion, kappa in results.get("fleiss_kappa", {}).items():
        if kappa is None:
            interp = "N/A (datos insuficientes)"
        elif kappa < 0:
            interp = "Acuerdo menor que el azar"
        elif kappa < 0.2:
            interp = "Leve"
        elif kappa < 0.4:
            interp = "Moderado"
        elif kappa < 0.6:
            interp = "Sustancial"
        elif kappa < 0.8:
            interp = "Considerable"
        else:
            interp = "Casi perfecto"
        lines.append(f"| {criterion} | {kappa if kappa is not None else 'N/A'} | {interp} |")

    lines += ["", "## Cronbach's Alpha (consistencia interna por evaluador)", "", "| Evaluador | α |", "|-----------|---|"]
    for ev, alpha in results.get("cronbach_alpha", {}).items():
        lines.append(f"| {ev} | {alpha if alpha is not None else 'N/A'} |")

    lines += ["", "## Estadísticas Descriptivas", "", "| Criterio | N | Media | Desv. Est. | Min | Max |",
              "|----------|---|-------|------------|-----|-----|"]
    for crit, stat in results.get("descriptive", {}).items():
        lines.append(
            f"| {crit} | {stat['n']} | {stat['mean']} | {stat['std']} | {stat['min']} | {stat['max']} |"
        )

    lines += ["", "## Por Tipo de Episodio", ""]
    for ep_type, data in results.get("by_episode_type", {}).items():
        lines.append(f"### {ep_type}")
        lines.append("| Criterio | N | Media |")
        lines.append("|----------|---|-------|")
        for crit, stat in data.items():
            lines.append(f"| {crit} | {stat['n']} | {stat['mean']} |")
        lines.append("")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Reporte Markdown: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Métricas de acuerdo inter-evaluadores")
    parser.add_argument("--reports-dir", type=str,
                        default=str(REPORTS_DIR),
                        help="Directorio con archivos evaluator_*.json")
    args = parser.parse_args()

    reports_dir = Path(args.reports_dir)
    if not reports_dir.exists():
        print(f"Directorio no encontrado: {reports_dir}")
        return

    results = analyze(reports_dir)
    if not results:
        return

    json_out = reports_dir / "inter_rater_analysis.json"
    json_out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Análisis JSON: {json_out}")

    md_out = reports_dir / "inter_rater_analysis.md"
    generate_markdown_report(results, md_out)


if __name__ == "__main__":
    main()
