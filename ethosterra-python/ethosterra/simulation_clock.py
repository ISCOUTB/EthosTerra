from __future__ import annotations

from datetime import datetime, timedelta
from typing import ClassVar


class SimulationClock:
    _instance: ClassVar[SimulationClock | None] = None
    _current_date: str = ""
    _date_format: str = "dd/MM/yyyy"

    def __init__(self):
        self.current_date: datetime = datetime.now()

    @classmethod
    def get_instance(cls) -> SimulationClock:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def set_current_date(self, date_str: str) -> None:
        self.current_date = datetime.strptime(date_str, "%d/%m/%Y")

    def get_current_date(self) -> str:
        return self.current_date.strftime("%d/%m/%Y")

    def advance_one_day(self) -> str:
        self.current_date += timedelta(days=1)
        return self.get_current_date()

    def advance_days(self, days: int) -> str:
        self.current_date += timedelta(days=days)
        return self.get_current_date()

    def is_after(self, date_str: str) -> bool:
        other = datetime.strptime(date_str, "%d/%m/%Y")
        return other > self.current_date

    def is_before(self, date_str: str) -> bool:
        other = datetime.strptime(date_str, "%d/%m/%Y")
        return other < self.current_date

    def is_first_day_of_week(self, date_str: str) -> bool:
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        return dt.weekday() == 0

    def is_first_day_of_month(self, date_str: str) -> bool:
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        return dt.day == 1

    def days_between(self, date_str: str) -> int:
        other = datetime.strptime(date_str, "%d/%m/%Y")
        return (other - self.current_date).days
