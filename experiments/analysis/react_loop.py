"""ReAct loop: Plan + Task composition para el pipeline de análisis.

Cada Task implementa un paso del ciclo Razonar→Actuar→Observar:
  ObserveData → GenTimelines + ComputeMetrics → LLMObserve →
  LLMHypothesize → ValidateNumbers → LLMCorrect →
  LLMRecommend → GenDistribution
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from besa.rational.plan import Plan
from besa.rational.task import Task
from besa.rational.believes import Believes

from experiments.analysis.state import AnalysisState, EpisodeResult, TreatmentResult
from experiments.analysis.tools import data_tool, stats_tool, chart_tool, validation_tool

_PROMPTS_DIR = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    return (_PROMPTS_DIR / name).read_text(encoding="utf-8")


class AnalysisBroker:
    """Wrapper síncrono sobre OllamaLLMBroker para el pipeline de análisis."""

    def __init__(self, ollama_url: str, model: str, num_predict: int = 1024):
        from experiments.explainability.ollama_broker import OllamaLLMBroker
        self._broker = OllamaLLMBroker(
            ollama_url=ollama_url,
            model=model,
            num_predict=num_predict,
        )

    def call(self, prompt: str, max_retries: int = 2) -> str:
        return self._broker.call_sync(prompt, max_retries=max_retries)


# ---------------------------------------------------------------------------
# Task subclasses (una por paso ReAct)
# ---------------------------------------------------------------------------

class ObserveDataTask(Task):
    def __init__(self, max_episodes: int = 5):
        super().__init__(name="observe_data")
        self.max_episodes = max_episodes

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        tid = state.current_treatment.treatment_id
        rows = data_tool.load_treatment_csv(tid)
        episodes = data_tool.detect_episodes_in_csv(rows, tid, self.max_episodes)
        print(f"  [Observe] {tid}: {len(episodes)} episodios detectados")
        for ep in episodes:
            # Ventana amplia (±10) para el timeline chart
            wide = data_tool.get_window(rows, ep.trigger_idx, half=10)
            center = min(ep.trigger_idx, 10)
            state.current_treatment.episode_results.append(
                EpisodeResult(
                    episode_data=ep,
                    window_rows=wide,
                    center_in_window=center,
                )
            )
        return True


class GenerateTimelineChartsTask(Task):
    def __init__(self, output_dir: Path):
        super().__init__(name="gen_timeline_charts")
        self.output_dir = output_dir

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        tid = state.current_treatment.treatment_id
        for er in state.current_treatment.episode_results:
            ep = er.episode_data
            center = er.center_in_window
            try:
                path = chart_tool.timeline_chart(
                    agent=ep.agent_alias,
                    window_rows=er.window_rows,
                    treatment_id=tid,
                    output_dir=self.output_dir,
                    center_in_window=center,
                )
                er.timeline_chart_path = path
            except Exception as exc:
                print(f"  [Chart] timeline error: {exc}")
        return True


class ComputeMetricsTask(Task):
    def __init__(self):
        super().__init__(name="compute_metrics")

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        tid = state.current_treatment.treatment_id
        try:
            metrics = stats_tool.compute_treatment_metrics(state.treatments)
            m = metrics.get(tid, {})
            state.current_treatment.productividad = m.get("productividad", 0.0)
            state.current_treatment.bienestar = m.get("bienestar", 0.0)
            state.current_treatment.crisis_rate = m.get("crisis_rate", 0.0)
        except Exception as exc:
            print(f"  [Metrics] error: {exc}")
        return True


class LLMObserveTask(Task):
    def __init__(self, broker: AnalysisBroker):
        super().__init__(name="llm_observe")
        self.broker = broker
        self._template = _load_prompt("step_observe.md")

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        for er in state.current_treatment.episode_results:
            ep = er.episode_data
            facts = data_tool.extract_episode_facts(
                ep.trigger_row, er.window_rows, er.center_in_window
            )
            er.episode_facts = facts
            prompt = self._template.format(
                capital_fmt=facts["capital_fmt"],
                salud_fmt=facts["salud_fmt"],
                emocion=facts["emocion"],
                meta=facts["meta"],
                tendencia=facts["tendencia"],
                dias_bajo_umbral=facts["dias_bajo_umbral"],
                prestamos_activos=facts["prestamos_activos"],
            )
            text = self.broker.call(prompt)
            er.description_text = _extract_after(text, "Descripción:") or text
            print(f"  [LLM-Observe] {ep.agent_alias}: {len(er.description_text)} chars")
        return True


class LLMHypothesizeTask(Task):
    def __init__(self, broker: AnalysisBroker):
        super().__init__(name="llm_hypothesize")
        self.broker = broker
        self._template = _load_prompt("step_hypothesize.md")

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        tr = state.current_treatment
        params = tr.params
        try:
            money_inicial_raw = float(params.get("money", 0))
            money_inicial_fmt = f"${money_inicial_raw:,.0f}"
        except (ValueError, TypeError):
            money_inicial_raw = 0.0
            money_inicial_fmt = str(params.get("money", "?"))

        for er in tr.episode_results:
            ep = er.episode_data
            facts = er.episode_facts or data_tool.extract_episode_facts(
                ep.trigger_row, er.window_rows, er.center_in_window
            )
            umbral_texto = "por debajo del umbral de subsistencia" if facts["bajo_umbral"] else "por encima del umbral de subsistencia"
            prompt = self._template.format(
                description=er.description_text or "(sin descripción)",
                episode_type=ep.episode_type,
                capital_fmt=facts["capital_fmt"],
                umbral_texto=umbral_texto,
                meta=facts["meta"],
                money_inicial_fmt=money_inicial_fmt,
                land=params.get("land", "?"),
                personality=params.get("personality", "?"),
            )
            text = self.broker.call(prompt)
            er.hypothesis_text = _extract_after(text, "Hipótesis:") or text
        return True


class ValidateNumbersTask(Task):
    def __init__(self):
        super().__init__(name="validate_numbers")

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        try:
            money_inicial = float(state.current_treatment.params.get("money", 0))
        except (ValueError, TypeError):
            money_inicial = 0.0

        for er in state.current_treatment.episode_results:
            ep = er.episode_data
            facts = er.episode_facts or {}
            context_values = [
                500_000.0,
                money_inicial,
                facts.get("capital_raw", 0.0),
                facts.get("capital_delta_raw", 0.0),
            ]
            result = validation_tool.validate_against_trigger_row(
                er.hypothesis_text, ep.trigger_row,
                context_values=context_values,
            )
            er.validation_result = result
            if result.get("hallucinations"):
                mismatches = result.get("mismatches", [])
                er.hallucinations_flagged = [
                    f"{m['field']}: extraído={m['extracted']:,.0f} real={m['truth']:,.0f} ({m['diff_pct']}%)"
                    for m in mismatches
                ]
                print(f"  [Validate] HALLUCINATION en {ep.agent_alias}: {er.hallucinations_flagged}")
        return True


class LLMCorrectTask(Task):
    def __init__(self, broker: AnalysisBroker):
        super().__init__(name="llm_correct")
        self.broker = broker

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        for er in state.current_treatment.episode_results:
            if not er.hallucinations_flagged:
                continue
            ep = er.episode_data
            correction_note = validation_tool.build_correction_note(
                er.validation_result, ep.trigger_row
            )
            correction_prompt = (
                f"{correction_note}"
                f"Revisa y corrige la siguiente hipótesis usando los valores reales indicados arriba:\n\n"
                f"{er.hypothesis_text}\n\n"
                f"Hipótesis corregida:"
            )
            corrected = self.broker.call(correction_prompt)
            if corrected:
                er.hypothesis_text = _extract_after(corrected, "Hipótesis corregida:") or corrected
                er.corrected = True
        # Log after correction so corrected=True is captured
        for er in state.current_treatment.episode_results:
            if er.hallucinations_flagged:
                validation_tool.log_hallucination(er, state)
        return True


class LLMRecommendTask(Task):
    def __init__(self, broker: AnalysisBroker):
        super().__init__(name="llm_recommend")
        self.broker = broker
        self._template = _load_prompt("step_recommend.md")

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        for er in state.current_treatment.episode_results:
            ep = er.episode_data
            correction_note = validation_tool.build_correction_note(
                er.validation_result, ep.trigger_row
            )
            prompt = self._template.format(
                correction_note=correction_note,
                description=er.description_text or "(sin descripción)",
                hypothesis=er.hypothesis_text or "(sin hipótesis)",
            )
            text = self.broker.call(prompt)
            er.recommendation_text = _extract_after(text, "Recomendación:") or text
        return True


class GenerateDistributionChartTask(Task):
    def __init__(self, output_dir: Path):
        super().__init__(name="gen_distribution")
        self.output_dir = output_dir

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        tr = state.current_treatment
        counts = stats_tool.episode_type_distribution(
            [er.episode_data for er in tr.episode_results]
        )
        if counts:
            try:
                path = chart_tool.distribution_chart(tr.treatment_id, counts, self.output_dir)
                tr.distribution_chart_path = path
            except Exception as exc:
                print(f"  [Chart] distribution error: {exc}")
        return True


# ---------------------------------------------------------------------------
# ReActLoop
# ---------------------------------------------------------------------------

class ReActLoop:
    def __init__(self, ollama_url: str, model: str, output_dir: Path, max_episodes: int = 5):
        self.broker = AnalysisBroker(ollama_url, model)
        self.output_dir = Path(output_dir)
        self.max_episodes = max_episodes

    def build_plan(self) -> Plan:
        plan = Plan(plan_id="react_analysis")
        plan.add_task(ObserveDataTask(self.max_episodes))
        plan.add_task(GenerateTimelineChartsTask(self.output_dir), depends_on=["observe_data"])
        plan.add_task(ComputeMetricsTask(), depends_on=["observe_data"])
        plan.add_task(LLMObserveTask(self.broker), depends_on=["gen_timeline_charts"])
        plan.add_task(LLMHypothesizeTask(self.broker), depends_on=["llm_observe"])
        plan.add_task(ValidateNumbersTask(), depends_on=["llm_hypothesize"])
        plan.add_task(LLMCorrectTask(self.broker), depends_on=["validate_numbers"])
        plan.add_task(LLMRecommendTask(self.broker), depends_on=["llm_correct"])
        plan.add_task(GenerateDistributionChartTask(self.output_dir), depends_on=["llm_recommend"])
        return plan

    def run_treatment(
        self,
        state: AnalysisState,
        treatment_id: str,
        params: dict,
    ) -> TreatmentResult:
        state.current_treatment = TreatmentResult(
            treatment_id=treatment_id,
            params=params,
        )
        plan = self.build_plan()
        plan.execute(state)
        state.all_results.append(state.current_treatment)
        return state.current_treatment


def _extract_after(text: str, marker: str) -> str:
    idx = text.find(marker)
    if idx == -1:
        return text
    return text[idx + len(marker):].strip()


# ---------------------------------------------------------------------------
# Monthly mode — single LLM call per treatment covering the full arc
# ---------------------------------------------------------------------------

class MonthlyAnalysisTask(Task):
    def __init__(self, broker: AnalysisBroker):
        super().__init__(name="monthly_analysis")
        self.broker = broker
        self._template = _load_prompt("step_monthly.md")

    def execute(self, state: AnalysisState, **_: Any) -> bool:
        tr = state.current_treatment
        rows = data_tool.load_treatment_csv(tr.treatment_id)
        if not rows:
            print(f"  [Monthly] {tr.treatment_id}: sin datos CSV")
            return True

        monthly = data_tool.aggregate_monthly(rows)
        tr.monthly_data = monthly
        print(f"  [Monthly] {tr.treatment_id}: {len(monthly)} meses agregados")

        params_text = "\n".join(f"- **{k}**: {v}" for k, v in tr.params.items())
        monthly_table = data_tool.render_monthly_table_md(monthly)
        prompt = self._template.format(
            params=params_text,
            monthly_table=monthly_table,
        )
        text = self.broker.call(prompt, max_retries=3)
        tr.monthly_narrative = _extract_after(text, "Análisis:") or text
        print(f"  [Monthly] {tr.treatment_id}: narrativa {len(tr.monthly_narrative)} chars")
        return True


class MonthlyReActLoop(ReActLoop):
    """Variante del ReActLoop que procesa cada tratamiento mes a mes en una sola llamada LLM."""

    def build_monthly_plan(self) -> Plan:
        plan = Plan(plan_id="monthly_analysis")
        plan.add_task(MonthlyAnalysisTask(self.broker))
        plan.add_task(ComputeMetricsTask(), depends_on=["monthly_analysis"])
        return plan

    def run_monthly_treatment(
        self,
        state: AnalysisState,
        treatment_id: str,
        params: dict,
    ) -> TreatmentResult:
        state.current_treatment = TreatmentResult(
            treatment_id=treatment_id,
            params=params,
        )
        plan = self.build_monthly_plan()
        plan.execute(state)
        state.all_results.append(state.current_treatment)
        return state.current_treatment
