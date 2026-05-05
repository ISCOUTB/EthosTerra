from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class WorldConfiguration:
    _instance: WorldConfiguration | None = None
    _data: dict[str, Any] = {}

    def __init__(self):
        self._data = {}

    @classmethod
    def get_instance(cls) -> WorldConfiguration:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load(self, world_id: str) -> dict[str, Any]:
        candidates = [
            Path(f"data/worlds/world.{world_id}.json"),
            Path(f"data/worlds/{world_id}.json"),
            Path(os.getenv("ETHOSTERRA_ROOT", "")) / f"data/worlds/world.{world_id}.json",
            Path(os.getenv("ETHOSTERRA_ROOT", "")) / f"data/worlds/{world_id}.json",
        ]
        for c in candidates:
            if c.exists():
                self._data = json.loads(c.read_text())
                return self._data
        self._data = self._default(world_id)
        return self._data

    def _default(self, world_id: str) -> dict[str, Any]:
        size = int(world_id) if world_id.isdigit() else 100
        return {
            "id": world_id,
            "size": size,
            "climate": "tropical",
            "hemisphere": "northern",
            "latitude": 4.0,
            "temperature_avg": 25.0,
            "rainfall_annual": 1500,
            "soil_type": "LOAM",
            "crops": ["maiz", "frijol", "cafe", "platano"],
        }

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)


class MonthData:
    def __init__(
        self,
        tmax: float = 30.0,
        tmin: float = 20.0,
        rainfall: float = 100.0,
        humidity: float = 0.8,
        wind: float = 2.0,
        solar_radiation: float = 18.0,
    ):
        self.tmax = tmax
        self.tmin = tmin
        self.rainfall = rainfall
        self.humidity = humidity
        self.wind = wind
        self.solar_radiation = solar_radiation


class MonthlyDataLoader:
    _instance: MonthlyDataLoader | None = None
    _data: dict[int, MonthData] = {}

    MONTHLY_DEFAULTS: dict[int, dict[str, float]] = {
        1:  {"tmax": 28, "tmin": 18, "rainfall": 80,  "humidity": 0.75, "wind": 2.0, "solar_radiation": 16},
        2:  {"tmax": 28, "tmin": 18, "rainfall": 90,  "humidity": 0.76, "wind": 2.1, "solar_radiation": 17},
        3:  {"tmax": 29, "tmin": 19, "rainfall": 120, "humidity": 0.78, "wind": 2.0, "solar_radiation": 18},
        4:  {"tmax": 29, "tmin": 19, "rainfall": 150, "humidity": 0.80, "wind": 1.9, "solar_radiation": 18},
        5:  {"tmax": 30, "tmin": 20, "rainfall": 180, "humidity": 0.82, "wind": 1.8, "solar_radiation": 19},
        6:  {"tmax": 30, "tmin": 20, "rainfall": 160, "humidity": 0.81, "wind": 1.8, "solar_radiation": 19},
        7:  {"tmax": 31, "tmin": 20, "rainfall": 130, "humidity": 0.79, "wind": 1.9, "solar_radiation": 20},
        8:  {"tmax": 31, "tmin": 20, "rainfall": 120, "humidity": 0.78, "wind": 2.0, "solar_radiation": 20},
        9:  {"tmax": 30, "tmin": 19, "rainfall": 140, "humidity": 0.80, "wind": 2.0, "solar_radiation": 18},
        10: {"tmax": 29, "tmin": 19, "rainfall": 170, "humidity": 0.81, "wind": 1.9, "solar_radiation": 17},
        11: {"tmax": 28, "tmin": 18, "rainfall": 160, "humidity": 0.80, "wind": 2.0, "solar_radiation": 16},
        12: {"tmax": 28, "tmin": 18, "rainfall": 100, "humidity": 0.77, "wind": 2.1, "solar_radiation": 16},
    }

    def __init__(self):
        self._data = {}
        for month, vals in self.MONTHLY_DEFAULTS.items():
            self._data[month] = MonthData(**vals)

    @classmethod
    def get_instance(cls) -> MonthlyDataLoader:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_from_world(self, world_config: dict[str, Any]) -> None:
        monthly = world_config.get("monthly_data", {})
        for month_str, vals in monthly.items():
            month = int(month_str)
            if month in self._data:
                for k, v in vals.items():
                    setattr(self._data[month], k, float(v))

    def get_month(self, month: int) -> MonthData:
        return self._data.get(month, MonthData())
