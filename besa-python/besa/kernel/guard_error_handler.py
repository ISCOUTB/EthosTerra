from __future__ import annotations

from besa.kernel.event import EventBESA


class GuardErrorHandler:
    @staticmethod
    def handle(agent_alias: str, guard_name: str, error: Exception, event: EventBESA) -> None:
        import structlog

        logger = structlog.get_logger()
        logger.error(
            "GuardError",
            agent=agent_alias,
            guard=guard_name,
            event_id=event.id,
            error=str(error),
        )
