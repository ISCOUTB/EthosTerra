"""EpisodeExtractorAgent — Lee CSVs del E5 y detecta episodios críticos.

Tipos de episodio detectados (por orden de prioridad):
  LEISURE          money < 500_000 Y meta activa es 'leisure_activities' (hallazgo principal E5)
  CRISIS           money < 500_000 (threshold de look_for_loan.yaml)
  ALTERNATIVE_WORK current_goal contiene 'alternative_work'
  LOAN_REQUEST     loans_active aumenta de 0 a ≥ 1
  EMOTIONAL_SHIFT  emotion cambia a 'negative' o 'sad'
  HARVEST          harvested_weight incrementa > 100 kg

Por cada episodio envía EpisodeEvent a ContextBuilderAgent.
Al terminar el CSV envía ExtractionDoneEvent al orchestrator.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from besa.kernel.agent import AgentBESA
from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA

from experiments.explainability.events.episode_event import (
    EpisodeData,
    ExtractionDoneData,
    StartExtractionData,
)

WINDOW_HALF = 5
CRISIS_THRESHOLD = 500_000
HARVEST_DELTA = 100.0
NEGATIVE_EMOTIONS = {"negative", "sad", "angry", "fear", "disgust"}
LEISURE_GOALS = {"leisure_activities", "do_leisure_activities", "spare_time"}


@dataclass
class ExtractorState:
    pending_treatments: int = 0
    total_episodes: int = 0


class StartExtractionGuard(GuardBESA):
    """Dispara la extracción de episodios para un tratamiento."""

    def func_exec_guard(self, event: EventBESA) -> None:
        data: StartExtractionData = event.data
        agent: EpisodeExtractorAgent = self._agent  # type: ignore[assignment]
        episodes = agent.extract_episodes(data.treatment_id, data.csv_path, data.max_episodes)
        state: ExtractorState = self.get_state()
        state.total_episodes += len(episodes)

        for ep in episodes:
            agent.send(
                "ContextBuilderAgent",
                EventBESA(guard_type=ReceiveEpisodeGuard, data=ep),
            )

        agent.send(
            "Orchestrator",
            EventBESA(
                guard_type=ExtractionDoneGuard,
                data=ExtractionDoneData(
                    treatment_id=data.treatment_id,
                    episode_count=len(episodes),
                ),
            ),
        )


class ExtractionDoneGuard(GuardBESA):
    """Guard dummy para que el orquestador reciba la señal de fin."""

    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class ReceiveEpisodeGuard(GuardBESA):
    """Guard dummy — el ContextBuilderAgent lo registra en su struct."""

    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class EpisodeExtractorAgent(AgentBESA):
    def __init__(self, alias: str = "EpisodeExtractorAgent"):
        super().__init__(alias=alias, state=ExtractorState())
        self.register_guard(StartExtractionGuard)
        self.register_guard(ExtractionDoneGuard)

    def extract_episodes(
        self,
        treatment_id: str,
        csv_path: str,
        max_episodes: int = 0,
    ) -> list[EpisodeData]:
        path = Path(csv_path)
        if not path.exists():
            print(f"[EpisodeExtractor] CSV no encontrado: {csv_path}")
            return []

        with open(path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            rows = list(reader)

        # Limpiar \r residuales de CRLF y saltar filas sin fecha válida
        rows = [
            {k: (v.strip() if v else v) for k, v in row.items()}
            for row in rows
            if row.get("date", "").strip()
        ]

        if not rows:
            return []

        episodes: list[EpisodeData] = []
        seen: set[tuple[str, str, str]] = set()  # (agent, date, type)

        prev_loans: dict[str, int] = {}
        prev_emotions: dict[str, str] = {}
        prev_harvest: dict[str, float] = {}

        for idx, row in enumerate(rows):
            agent = row.get("agent", "")
            date = row.get("date", "")
            money = _float(row.get("money", "0"))
            loans = _int(row.get("loans_active", "0"))
            emotion = (row.get("emotion") or "neutral").strip().lower()
            goal = (row.get("current_goal") or "").strip().lower()
            harv = _float(row.get("harvested_weight", "0"))

            ep_type: str | None = None

            if money < CRISIS_THRESHOLD and money > 0 and goal in LEISURE_GOALS:
                ep_type = "LEISURE"
            elif money < CRISIS_THRESHOLD and money > 0:
                ep_type = "CRISIS"
            elif "alternative_work" in goal:
                ep_type = "ALTERNATIVE_WORK"
            elif loans > prev_loans.get(agent, 0):
                ep_type = "LOAN_REQUEST"
            elif emotion in NEGATIVE_EMOTIONS and prev_emotions.get(agent, "neutral") not in NEGATIVE_EMOTIONS:
                ep_type = "EMOTIONAL_SHIFT"
            elif harv - prev_harvest.get(agent, 0.0) > HARVEST_DELTA:
                ep_type = "HARVEST"

            prev_loans[agent] = loans
            prev_emotions[agent] = emotion
            prev_harvest[agent] = harv

            if ep_type and (agent, date, ep_type) not in seen:
                seen.add((agent, date, ep_type))
                start = max(0, idx - WINDOW_HALF)
                end = min(len(rows), idx + WINDOW_HALF + 1)
                ep = EpisodeData(
                    treatment_id=treatment_id,
                    episode_type=ep_type,
                    agent_alias=agent,
                    trigger_date=date,
                    trigger_row=dict(row),
                    window=rows[start:end],
                    goal_id=goal,
                    episode_index=len(episodes),
                )
                episodes.append(ep)
                if max_episodes > 0 and len(episodes) >= max_episodes:
                    break

        print(f"[EpisodeExtractor] {treatment_id}: {len(episodes)} episodios detectados")
        return episodes


def _float(v: str) -> float:
    try:
        return float(v)
    except (ValueError, TypeError):
        return 0.0


def _int(v: str) -> int:
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return 0
