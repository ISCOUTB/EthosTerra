"""TaguchComparisonTask — efectos principales Taguchi + gráficas cruzadas."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from besa.rational.task import Task
from experiments.analysis.state import AnalysisState


class TaguchComparisonTask(Task):
    def __init__(self, output_dir: Path):
        super().__init__(name="taguchi_comparison")
        self.output_dir = Path(output_dir)

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        from experiments.analysis.tools import stats_tool, chart_tool
        from experiments.analysis.tools.data_tool import load_narratives_json

        if not state.all_results:
            return True

        # Cargar parámetros de tratamientos
        try:
            from experiments.experimento5 import TREATMENTS as _params
            treatment_params = _params
        except ImportError:
            print("[Comparison] No se pudo cargar experimento5.TREATMENTS")
            treatment_params = {}

        # Métricas de tratamientos procesados
        metrics = {
            tr.treatment_id: {
                "productividad": tr.productividad,
                "bienestar": tr.bienestar,
            }
            for tr in state.all_results
        }

        # Efectos principales Taguchi
        if treatment_params and metrics:
            state.taguchi_effects = stats_tool.taguchi_main_effects(treatment_params, metrics)

            for metric in ("productividad", "bienestar"):
                try:
                    path = chart_tool.taguchi_effects_plot(
                        state.taguchi_effects, metric, self.output_dir
                    )
                    state.taguchi_chart_paths[metric] = path
                    print(f"[Comparison] Taguchi plot ({metric}): {path}")
                except Exception as exc:
                    print(f"[Comparison] taguchi plot error: {exc}")

        # Score statistics del pipeline de explicabilidad
        try:
            entries = load_narratives_json(state.narratives_json_path)
            if entries:
                state.score_stats = stats_tool.score_statistics(entries)
                path = chart_tool.scores_heatmap(state.score_stats, self.output_dir)
                state.taguchi_chart_paths["scores_heatmap"] = path
        except Exception as exc:
            print(f"[Comparison] scores heatmap error: {exc}")

        return True
