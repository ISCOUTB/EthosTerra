"""ReportAggregatorAgent — acumula narrativas validadas y genera informes.

Cuando recibe todas las narrativas de un tratamiento, lanza 3 hilos en paralelo:
  - JSON report:     reports/json/explainability_{treatment}.json
  - Markdown report: reports/markdown/explainability_{treatment}.md
  - LaTeX tables:    reports/latex/table_{treatment}.tex

Al completar todos los tratamientos envía ReportDoneEvent al orchestrator.
"""
from __future__ import annotations

import json
import threading
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from besa.kernel.agent import AgentBESA
from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA

from experiments.explainability.events.narrative_event import ValidatedNarrativeData

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
REPORTS_DIR = PROJECT_ROOT / "reports" / "explainability"


@dataclass
class AggregatorState:
    narratives: list[ValidatedNarrativeData] = field(default_factory=list)
    treatments_done: set[str] = field(default_factory=set)
    # expected_counts[tid] = número de episodios del tratamiento
    expected_counts: dict[str, int] = field(default_factory=dict)
    # received_counts[tid] = narrativas ya recibidas
    received_counts: dict[str, int] = field(default_factory=dict)
    total_treatments: int = 27
    lock: threading.Lock = field(default_factory=threading.Lock)


@dataclass
class ReportDoneData:
    reports: list[str]
    total_narratives: int


class ReceiveValidatedGuard(GuardBESA):
    """Acumula narrativas validadas y verifica si el tratamiento está completo."""

    def func_exec_guard(self, event: EventBESA) -> None:
        vnd: ValidatedNarrativeData = event.data
        agent: ReportAggregatorAgent = self._agent  # type: ignore[assignment]
        state: AggregatorState = self.get_state()
        tid = vnd.narrative_data.context.episode.treatment_id

        with state.lock:
            state.narratives.append(vnd)
            state.received_counts[tid] = state.received_counts.get(tid, 0) + 1
            received = state.received_counts[tid]
            expected = state.expected_counts.get(tid, -1)
            treatment_complete = (expected >= 0 and received >= expected)

        if treatment_complete:
            agent._finalize_treatment(tid)


class ExtractionDoneGuard(GuardBESA):
    """Registra el número esperado de narrativas para un tratamiento."""

    def func_exec_guard(self, event: EventBESA) -> None:
        from experiments.explainability.events.episode_event import ExtractionDoneData
        done_data: ExtractionDoneData = event.data
        agent: ReportAggregatorAgent = self._agent  # type: ignore[assignment]
        state: AggregatorState = self.get_state()
        tid = done_data.treatment_id

        with state.lock:
            state.expected_counts[tid] = done_data.episode_count
            received = state.received_counts.get(tid, 0)
            # Si ya llegaron todas las narrativas antes de este evento
            treatment_complete = (done_data.episode_count == 0 or received >= done_data.episode_count)

        if treatment_complete:
            agent._finalize_treatment(tid)


class ReportDoneGuard(GuardBESA):
    """Guard dummy — lo registra el orchestrator."""

    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class ReportAggregatorAgent(AgentBESA):
    def __init__(self, alias: str = "ReportAggregatorAgent", total_treatments: int = 27):
        state = AggregatorState(total_treatments=total_treatments)
        super().__init__(alias=alias, state=state)
        self.register_guard(ReceiveValidatedGuard)
        self.register_guard(ExtractionDoneGuard)
        self.register_guard(ReportDoneGuard)
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        (REPORTS_DIR / "json").mkdir(exist_ok=True)
        (REPORTS_DIR / "markdown").mkdir(exist_ok=True)
        (REPORTS_DIR / "latex").mkdir(exist_ok=True)
        (REPORTS_DIR / "expert").mkdir(exist_ok=True)

    def _finalize_treatment(self, tid: str) -> None:
        state: AggregatorState = self.state
        with state.lock:
            if tid in state.treatments_done:
                return  # ya procesado
            state.treatments_done.add(tid)
            treatment_narratives = [
                n for n in state.narratives
                if n.narrative_data.context.episode.treatment_id == tid
            ]
            all_done = len(state.treatments_done) >= state.total_treatments

        self.generate_treatment_reports(tid, treatment_narratives)
        print(f"[ReportAggregator] {tid}: {len(treatment_narratives)} narrativas → reportes generados")

        if all_done:
            with state.lock:
                all_narratives = list(state.narratives)
            report_paths = self.generate_global_report(all_narratives)
            self.send(
                "Orchestrator",
                EventBESA(
                    guard_type=ReportDoneGuard,
                    data=ReportDoneData(
                        reports=report_paths,
                        total_narratives=len(all_narratives),
                    ),
                ),
            )

    def generate_treatment_reports(
        self,
        treatment_id: str,
        narratives: list[ValidatedNarrativeData],
    ) -> None:
        threads = [
            threading.Thread(
                target=self._generate_json,
                args=(treatment_id, narratives),
                daemon=True,
            ),
            threading.Thread(
                target=self._generate_markdown,
                args=(treatment_id, narratives),
                daemon=True,
            ),
            threading.Thread(
                target=self._generate_latex,
                args=(treatment_id, narratives),
                daemon=True,
            ),
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=30)

    def generate_global_report(self, all_narratives: list[ValidatedNarrativeData]) -> list[str]:
        """Genera el informe global con todas las narrativas de todos los tratamientos."""
        paths = []
        p = REPORTS_DIR / "json" / "explainability_all.json"
        payload = {
            "generated_at": datetime.now().isoformat(),
            "total_narratives": len(all_narratives),
            "entries": [_vnd_to_dict(n) for n in all_narratives],
            "summary": _compute_summary(all_narratives),
        }
        p.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        paths.append(str(p))

        p2 = REPORTS_DIR / "expert" / "expert_validation_form.md"
        p2.write_text(_generate_expert_form(all_narratives))
        paths.append(str(p2))

        print(f"[ReportAggregator] Informe global: {len(all_narratives)} narrativas → {REPORTS_DIR}")
        return paths

    def _generate_json(self, tid: str, narratives: list[ValidatedNarrativeData]) -> None:
        p = REPORTS_DIR / "json" / f"explainability_{tid}.json"
        payload = {
            "treatment": tid,
            "generated_at": datetime.now().isoformat(),
            "narratives": [_vnd_to_dict(n) for n in narratives],
        }
        p.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    def _generate_markdown(self, tid: str, narratives: list[ValidatedNarrativeData]) -> None:
        p = REPORTS_DIR / "markdown" / f"explainability_{tid}.md"
        lines = [f"# Informe de Explicabilidad — {tid}", f"*Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}*", ""]
        for i, n in enumerate(narratives, 1):
            ep = n.narrative_data.context.episode
            lines += [
                f"## Episodio {i}: {ep.episode_type}",
                f"**Agente:** {ep.agent_alias} | **Fecha:** {ep.trigger_date} | **Meta:** {n.narrative_data.context.goal_display_name}",
                "",
                "### Narrativa",
                n.narrative_data.narrative,
                "",
                f"**Scores — Variables: {n.variable_id_score:.2f} | Comprensibilidad: {n.comprehensibility_score:.2f} | Fidelidad: {n.faithfulness_score:.2f}**",
                "",
                "---",
                "",
            ]
        p.write_text("\n".join(lines), encoding="utf-8")

    def _generate_latex(self, tid: str, narratives: list[ValidatedNarrativeData]) -> None:
        p = REPORTS_DIR / "latex" / f"table_{tid}.tex"
        rows = []
        for n in narratives:
            ep = n.narrative_data.context.episode
            rows.append(
                f"  {ep.episode_type} & {ep.agent_alias} & {ep.trigger_date} "
                f"& {n.variable_id_score:.2f} & {n.comprehensibility_score:.2f} & {n.faithfulness_score:.2f} \\\\"
            )
        content = (
            "\\begin{table}[ht]\n"
            "\\centering\n"
            "\\caption{Métricas de Explicabilidad — " + tid + "}\n"
            "\\begin{tabular}{llllll}\n"
            "\\hline\n"
            "Tipo & Agente & Fecha & VarID & Compren. & Fidelidad \\\\\n"
            "\\hline\n"
            + "\n".join(rows) + "\n"
            "\\hline\n"
            "\\end{tabular}\n"
            "\\end{table}\n"
        )
        p.write_text(content, encoding="utf-8")


def _vnd_to_dict(n: ValidatedNarrativeData) -> dict:
    ep = n.narrative_data.context.episode
    return {
        "treatment_id": ep.treatment_id,
        "episode_type": ep.episode_type,
        "agent": ep.agent_alias,
        "date": ep.trigger_date,
        "goal": n.narrative_data.context.goal_display_name,
        "activation_human": n.narrative_data.context.activation_when_human,
        "narrative": n.narrative_data.narrative,
        "scores": {
            "variable_id": n.variable_id_score,
            "comprehensibility": n.comprehensibility_score,
            "faithfulness": n.faithfulness_score,
        },
        "quality_raw": n.quality_raw,
    }


def _compute_summary(narratives: list[ValidatedNarrativeData]) -> dict:
    if not narratives:
        return {}
    by_type: dict[str, list] = {}
    for n in narratives:
        t = n.narrative_data.context.episode.episode_type
        by_type.setdefault(t, []).append(n)

    summary = {}
    for ep_type, items in by_type.items():
        summary[ep_type] = {
            "count": len(items),
            "avg_variable_id": sum(i.variable_id_score for i in items) / len(items),
            "avg_comprehensibility": sum(i.comprehensibility_score for i in items) / len(items),
            "avg_faithfulness": sum(i.faithfulness_score for i in items) / len(items),
        }
    return summary


def _generate_expert_form(narratives: list[ValidatedNarrativeData]) -> str:
    lines = [
        "# Formulario de Validación por Expertos — EthosTerra / 20CCC",
        f"*Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}*",
        "",
        "**Instrucciones:** Evalúe cada narrativa en escala 1-5 (1=muy deficiente, 5=excelente).",
        "",
    ]
    for i, n in enumerate(narratives, 1):
        ep = n.narrative_data.context.episode
        lines += [
            f"## Narrativa {i}/{len(narratives)}",
            f"**Tratamiento:** {ep.treatment_id} | **Tipo:** {ep.episode_type} | **Agente:** {ep.agent_alias}",
            "",
            "**Texto:**",
            f"> {n.narrative_data.narrative}",
            "",
            "| Criterio | 1 | 2 | 3 | 4 | 5 |",
            "|----------|---|---|---|---|---|",
            "| Identifica variables disparadoras | ☐ | ☐ | ☐ | ☐ | ☐ |",
            "| Lenguaje comprensible para técnico rural | ☐ | ☐ | ☐ | ☐ | ☐ |",
            "| Fiel a la situación real del agente | ☐ | ☐ | ☐ | ☐ | ☐ |",
            "",
            "**Comentarios libres:**",
            "___",
            "",
            "---",
            "",
        ]
    return "\n".join(lines)
