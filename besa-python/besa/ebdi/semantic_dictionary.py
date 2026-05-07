from __future__ import annotations

from typing import ClassVar


class SemanticValue:
    def __init__(self, name: str, value: float):
        self.name = name
        self.value = value


class SemanticDictionary:
    _instance: ClassVar[SemanticDictionary | None] = None

    PERSON = "person"
    EVENT = "event"
    OBJECT = "object"

    PERSON_WEIGHT: float = 0.3
    EVENT_WEIGHT: float = 0.4
    OBJECT_WEIGHT: float = 0.3

    _defaults: dict[str, dict[str, float]] = {
        PERSON: {
            "enemy": -1.0, "unfriendly": -0.3, "stranger": 0.0,
            "friend": 0.7, "close": 0.8,
        },
        EVENT: {
            "undesirable": -1.0, "somewhat_undesirable": -0.4, "indifferent": 0.0,
            "somewhat_desirable": 0.4, "desirable": 0.1,
        },
        OBJECT: {
            "repulsive": -1.0, "valueless": -0.2, "neutral": 0.0,
            "valuable": 0.6, "important": 0.8,
        },
    }

    def __init__(self):
        self._person: dict[str, float] = dict(self._defaults[self.PERSON])
        self._event: dict[str, float] = dict(self._defaults[self.EVENT])
        self._object: dict[str, float] = dict(self._defaults[self.OBJECT])

    @classmethod
    def get_instance(cls) -> SemanticDictionary:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_person(self, key: str, default: float = 0.0) -> float:
        return self._person.get(key.lower(), default)

    def get_event(self, key: str, default: float = 0.0) -> float:
        return self._event.get(key.lower(), default)

    def get_object(self, key: str, default: float = 0.0) -> float:
        return self._object.get(key.lower(), default)

    def set_person(self, key: str, value: float) -> None:
        self._person[key.lower()] = value

    def set_event(self, key: str, value: float) -> None:
        self._event[key.lower()] = value

    def set_object(self, key: str, value: float) -> None:
        self._object[key.lower()] = value

    def estimate_intensity(self, person: str, event: str, obj: str) -> float:
        p = self.get_person(person)
        e = self.get_event(event)
        o = self.get_object(obj)
        intensity = (
            self.PERSON_WEIGHT * abs(p)
            + self.EVENT_WEIGHT * abs(e)
            + self.OBJECT_WEIGHT * abs(o)
        )
        valence = self._estimate_valence(p, e, o)
        return intensity if valence else -intensity

    def _estimate_valence(self, person: float, event: float, obj: float) -> bool:
        sp = 1 if person > 0 else (-1 if person < 0 else 0)
        se = 1 if event > 0 else (-1 if event < 0 else 0)
        so = 1 if obj > 0 else (-1 if obj < 0 else 0)
        if sp > 0 and se < 0 and so < 0:
            return True
        return sp == se == so and sp != 0

    def get_all_person(self) -> dict[str, float]:
        return dict(self._person)

    def get_all_event(self) -> dict[str, float]:
        return dict(self._event)

    def get_all_object(self) -> dict[str, float]:
        return dict(self._object)
