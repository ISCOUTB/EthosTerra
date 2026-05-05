from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class EmotionalEvent:
    person: str
    event: str
    obj: str
    intensity: float = 1.0
    valance: float = 0.0


@dataclass(slots=True)
class EmotionalState:
    joy: float = 0.0
    sadness: float = 0.0
    anger: float = 0.0
    fear: float = 0.0
    surprise: float = 0.0
    trust: float = 0.0
    anticipation: float = 0.0
    disgust: float = 0.0

    def get_most_activated_emotion(self) -> str:
        emotions = {
            "joy": self.joy,
            "sadness": self.sadness,
            "anger": self.anger,
            "fear": self.fear,
            "surprise": self.surprise,
            "trust": self.trust,
            "anticipation": self.anticipation,
            "disgust": self.disgust,
        }
        return max(emotions, key=emotions.get)

    def normalize(self) -> None:
        total = sum([
            self.joy, self.sadness, self.anger, self.fear,
            self.surprise, self.trust, self.anticipation, self.disgust,
        ])
        if total > 0:
            self.joy /= total
            self.sadness /= total
            self.anger /= total
            self.fear /= total
            self.surprise /= total
            self.trust /= total
            self.anticipation /= total
            self.disgust /= total
