from __future__ import annotations

import random
from typing import ClassVar


class AgentRNG:
    _instances: ClassVar[dict[str, random.Random]] = {}

    @classmethod
    def for_agent(cls, agent_alias: str, root_seed: int = 42) -> random.Random:
        if agent_alias not in cls._instances:
            agent_seed = (root_seed + hash(agent_alias)) % 2**31
            rng = random.Random(agent_seed)
            cls._instances[agent_alias] = rng
        return cls._instances[agent_alias]
