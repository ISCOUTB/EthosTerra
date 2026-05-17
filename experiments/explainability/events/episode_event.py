from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class EpisodeData:
    treatment_id: str
    episode_type: str           # CRISIS | ALTERNATIVE_WORK | LOAN_REQUEST | EMOTIONAL_SHIFT | HARVEST
    agent_alias: str
    trigger_date: str           # valor del campo 'date' en el CSV
    trigger_row: dict[str, str] # fila CSV que disparó la detección
    window: list[dict[str, str]] # ±5 filas alrededor del episodio
    goal_id: str                 # current_goal en la fila disparadora (puede ser "")
    episode_index: int = 0       # índice dentro del tratamiento
    trigger_idx: int = 0         # índice de fila en el CSV (para ventana del timeline)


@dataclass(slots=True)
class StartExtractionData:
    treatment_id: str
    csv_path: str
    max_episodes: int = 0       # 0 = sin límite


@dataclass(slots=True)
class ExtractionDoneData:
    treatment_id: str
    episode_count: int
