from __future__ import annotations

from besa.ebdi.emotional_event import EmotionalState


class EmotionalModel:
    def __init__(self, alias: str = ""):
        self.alias = alias
        self.state = EmotionalState()
        self._baseline: dict[str, float] = {}

    def set_baseline(self, baseline: dict[str, float]) -> None:
        self._baseline = baseline

    def process_emotional_event(self, event) -> None:
        pass

    def get_dominant_emotion(self) -> str:
        return self.state.get_most_activated_emotion()

    def reset(self) -> None:
        self.state = EmotionalState()
