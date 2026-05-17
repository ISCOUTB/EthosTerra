"""TechnicalSectionTask — ensambla section_dict por episodio para el reporte HTML."""
from __future__ import annotations

from typing import Any

from besa.rational.task import Task
from experiments.analysis.state import AnalysisState


class TechnicalSectionTask(Task):
    def __init__(self):
        super().__init__(name="technical_section")

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        from experiments.analysis.tools.data_tool import (
            render_window_table_html,
            render_facts_table_html,
        )

        for tr in state.all_results:
            for i, er in enumerate(tr.episode_results):
                ep = er.episode_data
                center = er.center_in_window

                raw_table = render_window_table_html(er.window_rows[:15], highlight_idx=center)
                facts_table = render_facts_table_html(er.episode_facts) if er.episode_facts else ""
                validation_badge = _build_validation_badge(er)

                er.section_dict = {
                    "treatment_id": tr.treatment_id,
                    "params": tr.params,
                    "episode_index": i + 1,
                    "agent": ep.agent_alias,
                    "date": ep.trigger_date,
                    "episode_type": ep.episode_type,
                    "goal": (ep.goal_id or "-").replace("_", " "),
                    "facts_table": facts_table,
                    "raw_data_table": raw_table,
                    "timeline_chart": er.timeline_chart_path,
                    "description": er.description_text,
                    "hypothesis": er.hypothesis_text,
                    "recommendation": er.recommendation_text,
                    "validation_badge": validation_badge,
                    "hallucinations": er.hallucinations_flagged,
                    "corrected": er.corrected,
                }
        print(f"[Technical] section_dicts ensamblados: "
              f"{sum(len(tr.episode_results) for tr in state.all_results)} episodios")
        return True


def _build_validation_badge(er: Any) -> str:
    if er.hallucinations_flagged:
        status = "⚠ Corregida" if er.corrected else "❌ Alucinación"
        color = "#FFA500" if er.corrected else "#CC0000"
    else:
        status = "✅ Validada"
        color = "#228B22"
    detail = "; ".join(er.hallucinations_flagged) if er.hallucinations_flagged else "cifras verificadas"
    return f'<span class="badge" style="background:{color}">{status}</span> <small>{detail}</small>'
