from __future__ import annotations

from typing import Any

from besa.rational.believes import Believes
from besa.rational.task import Task


class Plan:
    def __init__(self, plan_id: str = ""):
        self.plan_id = plan_id
        self._tasks: list[Task] = []
        self._dependencies: dict[str, set[str]] = {}  # task_name → set of prerequisite task names

    def add_task(self, task: Task, depends_on: list[str] | None = None) -> None:
        self._tasks.append(task)
        if depends_on:
            self._dependencies[task.name] = set(depends_on)
        else:
            self._dependencies[task.name] = set()

    def execute(self, believes: Believes, **kwargs: Any) -> bool:
        executed: set[str] = set()
        remaining = {t.name for t in self._tasks}

        while remaining:
            batch = [
                t
                for t in self._tasks
                if t.name in remaining
                and self._dependencies[t.name].issubset(executed)
            ]
            if not batch:
                break
            all_ok = True
            for task in batch:
                ok = task.execute(believes, **kwargs)
                if not ok:
                    all_ok = False
                executed.add(task.name)
                remaining.discard(task.name)
            if not all_ok:
                return False

        return len(remaining) == 0

    def __repr__(self) -> str:
        return f"Plan({self.plan_id}, tasks={len(self._tasks)})"
