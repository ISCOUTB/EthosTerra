from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SimulationParams:
    mode: str = "single"
    role: str | None = None
    env: str = ""
    agents: int = 5
    money: int = 1500000
    land: int = -1
    personality: float = -1.0
    tools: int = -1
    seeds: int = -1
    water: int = -1
    irrigation: int = -1
    emotions: int = -1
    training: int = -1
    nodes: int = 0
    years: int = 1
    variance: float = -1.0
    criminality: int = -1
    steptime: int = -1
    perturbation: str = ""
    training_slots: int = -1
    world: str = "100"
    speed: float = 0.001
