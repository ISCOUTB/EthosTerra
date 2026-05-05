from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any

import numpy as np

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA


class AgroEcosystemMessageType(Enum):
    CROP_INIT = auto()
    CROP_INFORMATION = auto()
    CROP_IRRIGATION = auto()
    CROP_PESTICIDE = auto()
    CROP_OBSERVE = auto()
    CROP_HARVEST = auto()


class FromAgroEcosystemMessageType(Enum):
    CROP_INIT = auto()
    CROP_INFORMATION_NOTIFICATION = auto()
    CROP_IRRIGATION = auto()
    CROP_PESTICIDE = auto()
    CROP_HARVEST = auto()
    NOTIFY_CROP_WATER_STRESS = auto()
    NOTIFY_CROP_DISEASE = auto()
    NOTIFY_CROP_READY_HARVEST = auto()


class Soil(Enum):
    SAND = (0.05, 0.25, 0.01)
    LOAM = (0.11, 0.30, 0.05)
    CLAY = (0.40, 0.55, 0.15)
    SILT = (0.15, 0.35, 0.08)

    @property
    def fc(self) -> float:
        return self.value[0]

    @property
    def wp(self) -> float:
        return self.value[1]

    @property
    def delta(self) -> float:
        return self.value[2]


class AgroEcosystemMessage:
    def __init__(
        self,
        message_type: AgroEcosystemMessageType = AgroEcosystemMessageType.CROP_INIT,
        crop_id: str = "",
        peasant_alias: str = "",
        payload: str = "",
        date: str = "",
    ):
        self.message_type = message_type
        self.crop_id = crop_id
        self.peasant_alias = peasant_alias
        self.payload = payload
        self.date = date


class FromAgroEcosystemMessage:
    def __init__(
        self,
        message_type: FromAgroEcosystemMessageType = FromAgroEcosystemMessageType.CROP_INIT,
        peasant_alias: str = "",
        payload: str = "",
    ):
        self.message_type = message_type
        self.peasant_alias = peasant_alias
        self.payload = payload
        self.date = ""


@dataclass
class CropCellState:
    evapotranspiration: float = 0.0
    growing_degree_days: float = 0.0
    above_ground_biomass: float = 0.0
    cumulated_evapotranspiration: float = 0.0
    depletion_fraction_adjusted: float = 0.5
    root_zone_depletion: float = 0.0
    water_stress: bool = False


class CropCell:
    def __init__(
        self,
        crop_factor_ini: float,
        crop_factor_mid: float,
        crop_factor_end: float,
        degree_days_mid: float,
        degree_days_end: float,
        crop_area: int,
        max_root_depth: float,
        depletion_fraction: float,
        soil: Soil,
        crop_id: str,
        peasant_alias: str,
    ):
        self.crop_factor_ini = crop_factor_ini
        self.crop_factor_mid = crop_factor_mid
        self.crop_factor_end = crop_factor_end
        self.degree_days_mid = degree_days_mid
        self.degree_days_end = degree_days_end
        self.crop_area = crop_area
        self.max_root_depth = max_root_depth
        self.depletion_fraction = depletion_fraction
        self.soil = soil
        self.crop_id = crop_id
        self.peasant_alias = peasant_alias

        self.state = CropCellState()
        self.total_available_water = 1000 * (soil.fc - soil.wp) * max_root_depth
        self.readily_available_water = depletion_fraction * self.total_available_water
        self._is_perennial = False
        self.harvest_ready = False
        self.is_active = True
        self.infected = False
        self.irrigation_events: list[float] = field(default_factory=list)
        self.pesticide_events: list[float] = field(default_factory=list)

    def is_perennial(self) -> bool:
        return self._is_perennial

    def grow(self, temp: float, rad: float, et0: float, rainfall: float) -> None:
        if not self.is_active:
            return
        self.state.growing_degree_days += max(0, temp - 10)
        gdd = self.state.growing_degree_days

        if gdd < self.degree_days_mid:
            kc = self.crop_factor_ini
        elif gdd < self.degree_days_end:
            kc = self.crop_factor_mid
        else:
            kc = self.crop_factor_end
            self.harvest_ready = True
            return

        etc = kc * et0
        self.state.evapotranspiration = etc
        self.state.cumulated_evapotranspiration += etc
        self.state.depletion_fraction_adjusted = min(
            0.8, max(0.1, self.depletion_fraction + 0.04 * (5 - etc))
        )

        self.state.root_zone_depletion = max(
            0, self.state.root_zone_depletion + etc - rainfall
        )
        if self.state.root_zone_depletion > self.readily_available_water:
            self.state.water_stress = True
            ks = max(
                0,
                (self.total_available_water - self.state.root_zone_depletion)
                / ((1 - self.depletion_fraction) * self.total_available_water),
            )
            etc = ks * etc
        else:
            self.state.water_stress = False

        wue = 5.0
        hi = 0.4
        self.state.above_ground_biomass += wue * rad * etc / max(et0, 0.01)
        self.state.above_ground_biomass *= 1 - self.state.depletion_fraction_adjusted * 0.1

    def apply_irrigation(self, amount: float) -> None:
        self.state.root_zone_depletion = max(0, self.state.root_zone_depletion - amount)

    def reset_harvest_cycle(self) -> None:
        self.state.growing_degree_days = 0
        self.state.above_ground_biomass = 0
        self.state.cumulated_evapotranspiration = 0
        self.state.water_stress = False
        self.harvest_ready = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.crop_id,
            "peasant": self.peasant_alias,
            "gdd": self.state.growing_degree_days,
            "biomass": self.state.above_ground_biomass,
            "et": self.state.evapotranspiration,
            "water_stress": self.state.water_stress,
            "harvest_ready": self.harvest_ready,
            "infected": self.infected,
            "perennial": self._is_perennial,
        }


class CafeCell(CropCell):
    def __init__(self, crop_id: str, peasant_alias: str):
        super().__init__(
            crop_factor_ini=0.90, crop_factor_mid=0.95, crop_factor_end=0.95,
            degree_days_mid=3000, degree_days_end=6500,
            crop_area=1, max_root_depth=1.5, depletion_fraction=0.40,
            soil=Soil.LOAM, crop_id=crop_id, peasant_alias=peasant_alias,
        )
        self._is_perennial = True


class FrijolCell(CropCell):
    def __init__(self, crop_id: str, peasant_alias: str):
        super().__init__(
            crop_factor_ini=0.35, crop_factor_mid=1.15, crop_factor_end=0.35,
            degree_days_mid=600, degree_days_end=1400,
            crop_area=1, max_root_depth=0.6, depletion_fraction=0.45,
            soil=Soil.CLAY, crop_id=crop_id, peasant_alias=peasant_alias,
        )


class MaizCell(CropCell):
    def __init__(self, crop_id: str, peasant_alias: str):
        super().__init__(
            crop_factor_ini=0.30, crop_factor_mid=1.20, crop_factor_end=0.60,
            degree_days_mid=800, degree_days_end=1800,
            crop_area=1, max_root_depth=1.0, depletion_fraction=0.55,
            soil=Soil.LOAM, crop_id=crop_id, peasant_alias=peasant_alias,
        )


class PlatanoCell(CropCell):
    def __init__(self, crop_id: str, peasant_alias: str):
        super().__init__(
            crop_factor_ini=0.50, crop_factor_mid=1.10, crop_factor_end=1.00,
            degree_days_mid=1200, degree_days_end=2800,
            crop_area=1, max_root_depth=0.5, depletion_fraction=0.35,
            soil=Soil.LOAM, crop_id=crop_id, peasant_alias=peasant_alias,
        )
        self._is_perennial = True


class RiceCell(CropCell):
    def __init__(self, crop_id: str, peasant_alias: str):
        super().__init__(
            crop_factor_ini=1.05, crop_factor_mid=1.20, crop_factor_end=0.90,
            degree_days_mid=1000, degree_days_end=2200,
            crop_area=1, max_root_depth=0.5, depletion_fraction=0.20,
            soil=Soil.CLAY, crop_id=crop_id, peasant_alias=peasant_alias,
        )


class RootsCell(CropCell):
    def __init__(self, crop_id: str, peasant_alias: str):
        super().__init__(
            crop_factor_ini=0.50, crop_factor_mid=1.10, crop_factor_end=0.95,
            degree_days_mid=900, degree_days_end=2000,
            crop_area=1, max_root_depth=0.6, depletion_fraction=0.35,
            soil=Soil.SILT, crop_id=crop_id, peasant_alias=peasant_alias,
        )


class VegetablesCell(CropCell):
    def __init__(self, crop_id: str, peasant_alias: str):
        super().__init__(
            crop_factor_ini=0.45, crop_factor_mid=1.00, crop_factor_end=0.80,
            degree_days_mid=500, degree_days_end=1200,
            crop_area=1, max_root_depth=0.4, depletion_fraction=0.30,
            soil=Soil.LOAM, crop_id=crop_id, peasant_alias=peasant_alias,
        )


@dataclass
class MonthData:
    tmax: float = 30.0
    tmin: float = 20.0
    rainfall: float = 100.0
    humidity: float = 0.8
    wind: float = 2.0
    solar_radiation: float = 18.0


@dataclass
class Temperatures:
    day: float = 25.0
    month: int = 1


@dataclass
class CropLayerState:
    crops: dict[str, CropCell] = field(default_factory=dict)

    def add_crop(self, cell: CropCell) -> None:
        self.crops[cell.crop_id] = cell

    def get_crop(self, crop_id: str) -> CropCell | None:
        return self.crops.get(crop_id)

    def get_all_crops(self) -> list[CropCell]:
        return list(self.crops.values())

    def remove_crop(self, crop_id: str) -> None:
        self.crops.pop(crop_id, None)

    def apply_irrigation_to_all(self, amount: float) -> None:
        for crop in self.crops.values():
            crop.apply_irrigation(amount)


@dataclass
class AgroEcosystemState:
    crops: CropLayerState = field(default_factory=CropLayerState)
    monthly_data: dict[int, MonthData] = field(default_factory=lambda: {
        i: MonthData() for i in range(1, 13)
    })
    current_temp: Temperatures = field(default_factory=Temperatures)
    disease_pressure: float = 0.1
    grid_size: int = 100

    def update_for_date(self, date_str: str) -> None:
        from datetime import datetime
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        month = dt.month
        md = self.monthly_data.get(month, MonthData())
        temp = (md.tmax + md.tmin) / 2
        rad = md.solar_radiation
        et0 = 0.0023 * md.solar_radiation * (temp + 17.8) * (temp - md.tmin) ** 0.5
        rainfall = md.rainfall / 30.0

        for crop in self.crops.get_all_crops():
            if crop.is_active:
                crop.grow(temp, rad, et0, rainfall)
                crop.infected = self.rng.random() < self.disease_pressure / 100

    def set_rng(self, rng: Any) -> None:
        self.rng = rng


class AgroEcosystemGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, AgroEcosystemMessage):
            return
        state: AgroEcosystemState = self.get_state()

        if msg.message_type == AgroEcosystemMessageType.CROP_INIT:
            if not state.crops.get_crop(msg.crop_id):
                crop = MaizCell(msg.crop_id, msg.peasant_alias)
                state.crops.add_crop(crop)
            state.update_for_date(msg.date)
            self._reply(msg.peasant_alias, FromAgroEcosystemMessageType.CROP_INIT, "CROP_INIT", msg.date)

        elif msg.message_type == AgroEcosystemMessageType.CROP_INFORMATION:
            state.update_for_date(msg.date)
            for crop in state.crops.get_all_crops():
                if crop.state.water_stress:
                    self._notify(crop.peasant_alias, FromAgroEcosystemMessageType.NOTIFY_CROP_WATER_STRESS, msg.date)
                if crop.infected:
                    self._notify(crop.peasant_alias, FromAgroEcosystemMessageType.NOTIFY_CROP_DISEASE, msg.date)
                if crop.harvest_ready:
                    self._notify(crop.peasant_alias, FromAgroEcosystemMessageType.NOTIFY_CROP_READY_HARVEST, msg.date)

            cell = state.crops.get_crop(msg.crop_id)
            if cell:
                self._reply(msg.peasant_alias, FromAgroEcosystemMessageType.CROP_INFORMATION_NOTIFICATION,
                            str(cell.to_dict()), msg.date)

        elif msg.message_type == AgroEcosystemMessageType.CROP_IRRIGATION:
            state.crops.apply_irrigation_to_all(10.0)
            self._reply(msg.peasant_alias, FromAgroEcosystemMessageType.CROP_IRRIGATION, "CROP_IRRIGATION", msg.date)

        elif msg.message_type == AgroEcosystemMessageType.CROP_PESTICIDE:
            cell = state.crops.get_crop(msg.crop_id)
            if cell:
                cell.infected = False
            self._reply(msg.peasant_alias, FromAgroEcosystemMessageType.CROP_PESTICIDE, "CROP_PESTICIDE", msg.date)

        elif msg.message_type == AgroEcosystemMessageType.CROP_HARVEST:
            cell = state.crops.get_crop(msg.crop_id)
            if cell:
                if cell.is_perennial():
                    cell.reset_harvest_cycle()
                else:
                    cell.is_active = False
                self._reply(msg.peasant_alias, FromAgroEcosystemMessageType.CROP_HARVEST,
                            str(cell.to_dict()), msg.date)

    def _reply(self, peasant: str, mtype: FromAgroEcosystemMessageType, payload: str, date: str) -> None:
        from ethosterra.guards.from_agro_ecosystem import FromAgroEcosystemGuard
        msg = FromAgroEcosystemMessage(mtype, peasant, payload)
        msg.date = date
        self._agent.send(peasant, EventBESA(guard_type=FromAgroEcosystemGuard, data=msg))

    def _notify(self, peasant: str, mtype: FromAgroEcosystemMessageType, date: str) -> None:
        self._reply(peasant, mtype, "", date)


class AgroEcosystemAgent(AgentBESA):
    def __init__(self, alias: str):
        state = AgroEcosystemState()
        super().__init__(alias, state)
        state.rng = self.rng
        self.register_guard(AgroEcosystemGuard)
