"""AnalysisState — estado central del pipeline ReAct de análisis."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from besa.rational.believes import BelievesBase
from experiments.explainability.events.episode_event import EpisodeData


@dataclass
class EpisodeResult:
    episode_data: EpisodeData
    window_rows: list[dict]          # ±10 filas alrededor del trigger
    center_in_window: int = 0        # índice del trigger dentro de window_rows
    episode_facts: dict = field(default_factory=dict)  # pre-extraídos por data_tool
    description_text: str = ""       # LLM step_observe
    hypothesis_text: str = ""        # LLM step_hypothesize
    recommendation_text: str = ""    # LLM step_recommend
    timeline_chart_path: str = ""    # PNG timeline money/tiempo
    validation_result: dict = field(default_factory=dict)
    hallucinations_flagged: list[str] = field(default_factory=list)
    corrected: bool = False
    section_dict: dict = field(default_factory=dict)


@dataclass
class TreatmentResult:
    treatment_id: str
    params: dict                     # money, land, personality, tools, seeds, water
    episode_results: list[EpisodeResult] = field(default_factory=list)
    distribution_chart_path: str = ""
    executive_summary: str = ""
    productividad: float = 0.0
    bienestar: float = 0.0
    crisis_rate: float = 0.0
    monthly_narrative: str = ""      # análisis mensual generado por LLM (modo monthly)
    monthly_data: list[dict] = field(default_factory=list)  # filas agregadas mes a mes


@dataclass
class AnalysisState(BelievesBase):
    treatments: list[str]
    current_treatment: TreatmentResult | None = None
    all_results: list[TreatmentResult] = field(default_factory=list)
    taguchi_effects: dict = field(default_factory=dict)
    taguchi_chart_paths: dict = field(default_factory=dict)
    score_stats: dict = field(default_factory=dict)
    hallucination_log: list[dict] = field(default_factory=list)
    executive_summary_text: str = ""
    ollama_url: str = "http://localhost:11434"
    model: str = "gemma3:4b"
    output_dir: Path = field(default_factory=lambda: Path("reports/analysis"))
    narratives_json_path: Path = field(
        default_factory=lambda: Path("reports/explainability/json/explainability_all.json")
    )

    def to_summary(self) -> dict[str, Any]:
        return {"treatments": self.treatments, "completed": len(self.all_results)}
