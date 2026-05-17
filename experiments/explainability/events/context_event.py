from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from experiments.explainability.events.episode_event import EpisodeData


@dataclass(slots=True)
class ContextData:
    episode: EpisodeData
    goal_display_name: str
    pyramid_level_human: str
    activation_when_raw: str
    activation_when_human: str
    effects_human: str
    plan_steps_human: str
    historical_narrative: str   # tabla Markdown de la ventana de 5 días
    prompt_vars: dict[str, Any] = field(default_factory=dict)
