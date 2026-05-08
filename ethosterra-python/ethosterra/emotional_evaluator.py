from __future__ import annotations

from typing import Any

import numpy as np

try:
    import skfuzzy as fuzz
    from skfuzzy import control as ctrl
    HAS_FUZZY = True
except ImportError:
    HAS_FUZZY = False


class EmotionalEvaluator:
    def __init__(self, mode: str = "EmotionalRulesFull"):
        self._engine = None
        self._mode = mode
        if HAS_FUZZY:
            self._build_engine()

    def _build_engine(self) -> None:
        happiness = ctrl.Antecedent(np.arange(-1.0, 1.01, 0.01), "happiness_sadness")
        happiness["sad"] = fuzz.trapmf(happiness.universe, [-1.0, -1.0, -0.6, 0.2])
        happiness["neutral"] = fuzz.trimf(happiness.universe, [-0.2, 0.0, 0.2])
        happiness["happy"] = fuzz.trapmf(happiness.universe, [0.2, 0.4, 1.0, 1.0])

        hopeful = ctrl.Antecedent(np.arange(-1.0, 1.01, 0.01), "hopeful_uncertainty")
        hopeful["uncertainty"] = fuzz.trapmf(hopeful.universe, [-1.0, -1.0, -0.6, 0.2])
        hopeful["neutral"] = fuzz.trimf(hopeful.universe, [-0.2, 0.0, 0.2])
        hopeful["hopeful"] = fuzz.trapmf(hopeful.universe, [0.2, 0.4, 1.0, 1.0])

        secure = ctrl.Antecedent(np.arange(-1.0, 1.01, 0.01), "secure_insecure")
        secure["insecure"] = fuzz.trapmf(secure.universe, [-1.0, -1.0, -0.6, 0.2])
        secure["neutral"] = fuzz.trimf(secure.universe, [-0.2, 0.0, 0.2])
        secure["secure"] = fuzz.trapmf(secure.universe, [0.2, 0.4, 1.0, 1.0])

        emotional = ctrl.Consequent(np.arange(0.0, 1.01, 0.01), "emotional_state")
        emotional["negative"] = fuzz.trapmf(emotional.universe, [0.0, 0.0, 0.2, 0.4])
        emotional["neutral"] = fuzz.trimf(emotional.universe, [0.3, 0.5, 0.7])
        emotional["positive"] = fuzz.trapmf(emotional.universe, [0.6, 0.8, 1.0, 1.0])

        rules = [
            ctrl.Rule(happiness["sad"] & hopeful["uncertainty"] & secure["insecure"], emotional["negative"]),
            ctrl.Rule(happiness["happy"] & hopeful["hopeful"] & secure["secure"], emotional["positive"]),
            ctrl.Rule(happiness["neutral"] & hopeful["neutral"] & secure["neutral"], emotional["neutral"]),
            ctrl.Rule(happiness["sad"] | hopeful["uncertainty"] | secure["insecure"], emotional["negative"]),
            ctrl.Rule(happiness["happy"] | hopeful["hopeful"] | secure["secure"], emotional["positive"]),
        ]

        self._engine = ctrl.ControlSystem(rules)
        self._sim = ctrl.ControlSystemSimulation(self._engine)

    def evaluate(self, happiness: float = 0.0, hopeful: float = 0.0, secure: float = 0.0) -> float:
        if not HAS_FUZZY or self._engine is None:
            return (happiness + hopeful + secure) / 3.0 + 0.5
        try:
            self._sim.input["happiness_sadness"] = happiness
            self._sim.input["hopeful_uncertainty"] = hopeful
            self._sim.input["secure_insecure"] = secure
            self._sim.compute()
            return float(self._sim.output["emotional_state"])
        except Exception:
            return 0.5

    def evaluate_single_emotion(self, axis_name: str, value: float) -> float:
        if axis_name == "happiness":
            return self.evaluate(happiness=value)
        elif axis_name == "hopeful":
            return self.evaluate(hopeful=value)
        elif axis_name == "secure":
            return self.evaluate(secure=value)
        return self.evaluate(happiness=value)

    def emotional_factor(self, value: float) -> float:
        if value >= 0.7:
            return 1.4
        if value > 0.5:
            return 1.2
        if value > 0.3:
            return 1.0
        return 0.9


EMOTIONAL_EVENT_INFLUENCES: dict[str, dict[str, float]] = {
    "happiness": {
        "LEISURE": 0.7, "DOVITALS": 0.3, "STARVING": 0.6,
        "CROPDISEASES": 0.2, "HARVESTING": 0.5, "UNPAYINGDEBTS": 0.1,
        "HELPED": 0.3, "THIEVING": 0.8, "CRIME_NEARBY": 0.3,
    },
    "hopeful": {
        "PLANTING": 1.0, "SELLING": 0.8, "DOVITALS": 0.4,
        "CHECKCROPS": 0.2, "PLANTINGFAILED": 0.3, "THIEVING": 1.0,
        "UNPAYINGDEBTS": 0.1, "HELPED": 0.3, "WORK": 0.4, "HARVESTING": 0.5,
        "CRIME_NEARBY": 0.4,
    },
    "secure": {
        "HOUSEHOLDING": 0.5, "THIEVING": 1.0, "DOVITALS": 0.4,
        "PLANTING": 0.5, "HARVESTING": 0.5, "CRIME_NEARBY": 0.6,
    },
}


def process_emotional_event(believes: Any, event_type: str) -> None:
    from besa.ebdi.semantic_dictionary import SemanticDictionary
    sd = SemanticDictionary.get_instance()
    intensity = sd.estimate_intensity("stranger", event_type.lower(), "neutral")
    intensity_abs = abs(intensity) if intensity != 0 else 0.3

    personality = getattr(believes, 'personality', 0.0)
    p_mod = 0.8 + personality * 0.67

    for axis, influences in EMOTIONAL_EVENT_INFLUENCES.items():
        influence = influences.get(event_type, 0)
        if influence > 0:
            current = getattr(believes, axis, 0.5)
            delta = influence * intensity_abs * 0.05 * p_mod
            new_val = current + delta
            setattr(believes, axis, max(-1.0, min(1.0, new_val)))


def apply_forget_factor(current: float, base: float, forget_factor: float, time_delta_seconds: float) -> float:
    sign = 1 if base > current else -1
    slope = sign * forget_factor / 1000.0
    new_value = slope * time_delta_seconds + current
    if sign > 0:
        return min(new_value, base)
    else:
        return max(new_value, base)
