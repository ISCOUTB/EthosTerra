from __future__ import annotations

import structlog
import uuid

logger = structlog.get_logger()


def new_simulation_trace() -> str:
    trace_id = str(uuid.uuid4())[:8]
    structlog.contextvars.bind_contextvars(trace_id=trace_id)
    return trace_id


def bind_agent(alias: str) -> None:
    structlog.contextvars.bind_contextvars(agent=alias)
