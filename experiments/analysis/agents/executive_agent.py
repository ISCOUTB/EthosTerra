"""ExecutiveReportTask — genera el resumen ejecutivo global vía LLM."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from besa.rational.task import Task
from experiments.analysis.state import AnalysisState

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class ExecutiveReportTask(Task):
    def __init__(self, broker: Any):
        super().__init__(name="executive_report")
        self.broker = broker

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        from experiments.analysis.tools.stats_tool import (
            build_metrics_table_prompt, identify_top_factor
        )
        if not state.all_results:
            return True

        template = (_PROMPTS_DIR / "executive_summary.md").read_text(encoding="utf-8")
        table_md = build_metrics_table_prompt(state.all_results)
        top_factor = identify_top_factor(state.taguchi_effects)

        prompt = template.format(
            metrics_table=table_md,
            n_treatments=len(state.all_results),
            top_factor=top_factor,
        )
        text = self.broker.call(prompt)

        # Extraer después del marcador
        marker = "Resumen Ejecutivo:"
        idx = text.find(marker)
        state.executive_summary_text = text[idx + len(marker):].strip() if idx != -1 else text
        print(f"\n[Executive] Resumen generado: {len(state.executive_summary_text)} chars")
        return True
