#!/usr/bin/env python3
"""
EthosTerra — Orquestador ReAct para Análisis de Explicabilidad.

Uso:
  PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. .venv/bin/python \\
    experiments/analysis/orchestrator.py [--treatment E401] [--all] \\
    [--max-episodes 5] [--ollama-url http://localhost:11434] [--model gemma3:4b] \\
    [--output-dir reports/analysis]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from experiments.analysis.state import AnalysisState
from experiments.analysis.react_loop import ReActLoop, MonthlyReActLoop
from experiments.analysis.agents.analysis_agent import AnalysisAgent
from experiments.analysis.agents.executive_agent import ExecutiveReportTask
from experiments.analysis.agents.technical_agent import TechnicalSectionTask
from experiments.analysis.agents.comparison_agent import TaguchComparisonTask
from experiments.analysis.report.assembler import assemble_html_report, assemble_latex_report, assemble_monthly_html_report


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="ReAct Analysis — EthosTerra")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--treatment", help="ID de un tratamiento (ej: E401)")
    g.add_argument("--all", action="store_true", help="Procesar todos los tratamientos")
    p.add_argument("--mode", choices=["episodes", "monthly"], default="episodes",
                   help="Modo de análisis: 'episodes' (por evento) o 'monthly' (mes a mes)")
    p.add_argument("--max-episodes", type=int, default=5, help="Máx. episodios por tratamiento (0=todos, solo modo episodes)")
    p.add_argument("--ollama-url", default="http://localhost:11434")
    p.add_argument("--model", default="gemma3:4b")
    p.add_argument("--output-dir", default="reports/analysis")
    return p.parse_args()


def select_treatments(args: argparse.Namespace) -> list[tuple[str, dict]]:
    from experiments.experimento5 import TREATMENTS
    if args.all:
        return list(TREATMENTS.items())
    tid = args.treatment
    if tid not in TREATMENTS:
        print(f"[Error] Tratamiento '{tid}' no encontrado. Disponibles: {list(TREATMENTS.keys())}")
        sys.exit(1)
    return [(tid, TREATMENTS[tid])]


def main() -> None:
    args = parse_args()
    treatments = select_treatments(args)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    mode = args.mode
    print("=" * 70)
    print(f"  EthosTerra — Análisis ReAct (Reasoning + Acting) | Modo: {mode}")
    print(f"  Tratamientos: {len(treatments)} | Modelo: {args.model}")
    print(f"  Ollama: {args.ollama_url}" + (f" | Max episodios: {args.max_episodes}" if mode == "episodes" else ""))
    print(f"  Output: {output_dir}")
    print("=" * 70)

    state = AnalysisState(
        treatments=[t[0] for t in treatments],
        ollama_url=args.ollama_url,
        model=args.model,
        output_dir=output_dir,
    )

    if mode == "monthly":
        loop = MonthlyReActLoop(
            ollama_url=args.ollama_url,
            model=args.model,
            output_dir=output_dir,
            max_episodes=0,
        )
        for tid, params in treatments:
            result = loop.run_monthly_treatment(state, tid, params)
            print(
                f"  ✓ {tid}: {len(result.monthly_data)} meses | "
                f"Prod={result.productividad:.3f} Bien={result.bienestar:.3f} "
                f"Crisis={result.crisis_rate:.1%}"
            )

        if not state.all_results:
            print("\n[Warning] Ningún tratamiento produjo datos. Revisa los CSVs.")
            return

        print("\n[Report] Generando reporte mensual...")
        html_path = assemble_monthly_html_report(state, output_dir)

        print("\n" + "=" * 70)
        print(f"  ✅ Análisis mensual completado")
        print(f"     Tratamientos procesados: {len(state.all_results)}")
        print(f"     HTML: {html_path}")
        print("=" * 70)
        return

    # ── Modo episodes (original) ──────────────────────────────────────────
    loop = ReActLoop(
        ollama_url=args.ollama_url,
        model=args.model,
        output_dir=output_dir,
        max_episodes=args.max_episodes,
    )
    agent = AnalysisAgent(state)

    for tid, params in treatments:
        result = agent.run_treatment(tid, params, loop)
        ep_count = len(result.episode_results)
        print(
            f"  ✓ {tid}: {ep_count} episodios | "
            f"Prod={result.productividad:.3f} Bien={result.bienestar:.3f} "
            f"Crisis={result.crisis_rate:.1%}"
        )

    if not state.all_results:
        print("\n[Warning] Ningún tratamiento produjo episodios. Revisa los CSVs.")
        return

    # ── Análisis Taguchi cruzado ──────────────────────────────────────────
    print("\n[Comparison] Calculando efectos Taguchi...")
    TaguchComparisonTask(output_dir).execute(state)

    # ── Resumen ejecutivo (global) ────────────────────────────────────────
    print("\n[Executive] Generando resumen ejecutivo...")
    ExecutiveReportTask(loop.broker).execute(state)

    # ── Ensamble de secciones técnicas ───────────────────────────────────
    print("\n[Technical] Ensamblando secciones técnicas...")
    TechnicalSectionTask().execute(state)

    # ── Generación de reportes ────────────────────────────────────────────
    print("\n[Report] Generando reportes...")
    html_path = assemble_html_report(state, output_dir)
    latex_path = assemble_latex_report(state, output_dir)

    total_episodes = sum(len(tr.episode_results) for tr in state.all_results)
    print("\n" + "=" * 70)
    print(f"  ✅ Análisis completado")
    print(f"     Tratamientos procesados: {len(state.all_results)}")
    print(f"     Episodios analizados:    {total_episodes}")
    print(f"     Alucinaciones detectadas: {len(state.hallucination_log)}")
    print(f"     HTML:  {html_path}")
    print(f"     LaTeX: {latex_path}")
    print(f"     Charts: {output_dir}/charts/")
    print("=" * 70)


if __name__ == "__main__":
    main()
