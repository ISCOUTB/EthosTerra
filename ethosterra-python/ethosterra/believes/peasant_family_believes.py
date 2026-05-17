from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pydantic import BaseModel, Field


@dataclass
class Loan:
    lender: str = ""
    amount: float = 0.0
    remaining: float = 0.0
    is_formal: bool = True


@dataclass
class Land:
    id: str = ""
    area: float = 1.0
    crop_type: str = ""
    stage: str = "FALLOW"
    moisture: float = 0.5
    pest_pressure: float = 0.0
    days_until_harvest: int = 0
    irrigated: bool = False
    x: float = 0.0
    y: float = 0.0
    kind: str = "land"
    neighbors: list[str] = field(default_factory=list)
    parcel_name: str = ""

    def get_neighbor_lands(self, all_lands: list["Land"]) -> list["Land"]:
        ids = {l.id for l in all_lands}
        return [l for l in all_lands if l.id in set(self.neighbors) and l.id != self.id]


class PeasantFamilyBelieves(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    alias: str = ""
    money: float = Field(default=3000000.0, ge=0)
    initial_money: float = 3000000.0
    health: float = Field(default=1.0, ge=0, le=1)
    initial_health: float = 1.0
    time_left_on_day: float = 1440.0
    harvested_weight: float = 0.0
    total_harvested_weight: float = 0.0
    last_crop_type: str = "maiz"
    days_to_work_for_other: int = 0
    days_in_crisis: int = 0
    social_capital: float = 0.5
    food_security: float = 1.0
    happiness: float = 0.0
    hopeful: float = 0.0
    secure: float = 0.0
    emotion: str = "neutral"

    tools: int = 10
    seeds: int = 0
    water_available: int = 9999999
    pesticides: int = 0
    livestock: int = 0
    supplies: int = 0
    crop_health: float = 1.0

    lands: list[Land] = Field(default_factory=list)
    loans: list[Loan] = Field(default_factory=list)
    current_goal: str | None = None
    task_log: list[str] = Field(default_factory=list)

    current_date: str = ""
    current_day: int = 0
    year: int = 2024
    week: int = 1
    new_day: bool = True

    crop_size: float = 1.0
    irrigation: bool = False
    emotions_enabled: bool = False
    training_enabled: bool = False
    training_available: bool = False
    training_level: float = 0.1
    personality: float = 0.0

    peasant_family_affinity: float = 0.5
    peasant_friends_affinity: float = 0.5
    peasant_leisure_affinity: float = 0.5
    social_affinity: float = 0.5
    criminality_affinity: bool = False
    minimum_vital: float = 12000.0
    purpose: str = "farmer"

    have_loan: bool = False
    to_pay: float = 0.0
    loan_denied: bool = False
    wait: bool = False
    update_price_list: bool = True
    worker_without_land: bool = False
    robbery_account: int = 0
    asked_for_contractor: bool = False
    asked_for_collaboration: bool = False
    contractor: str = ""
    peasant_family_helper: str = ""
    farm_name: bool = False
    price_list_empty: bool = True
    loan_amount_to_pay: float = 0.0
    current_activity: str = ""
    resources_acquired: bool = False
    work: str = ""
    work_done_today: bool = False
    simulation_years: int = 1

    def _get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def is_new_day(self) -> bool:
        return self.new_day

    def isNewDay(self) -> bool:
        return self.new_day

    def is_in_crisis(self) -> bool:
        return self.money < self.minimum_vital or self.health < 0.3

    def is_in_prolonged_crisis(self) -> bool:
        return self.days_in_crisis > 90

    def has_land_with_crop_care(self, care_type: str) -> bool:
        stage_map = {
            "CHECK": "GROWING",
            "HARVEST": "HARVEST_READY",
            "HARVESTABLE": "HARVEST_READY",
            "PREPARE": "NONE",
            "PLANT": "PLANTING",
            "GROWING": "GROWING",
            "WATER": "GROWING",
            "PEST": "GROWING",
            "IRRIGATE": "GROWING",
        }
        target = stage_map.get(care_type.upper(), care_type)
        return any(l.stage == target for l in self.lands)

    def hasLandWithCropCare(self, care_type: str) -> bool:
        return self.has_land_with_crop_care(care_type)

    def has_land_with_kind(self, kind: str) -> bool:
        return any(l.crop_type == kind for l in self.lands)

    def hasLandWithKind(self, kind: str) -> bool:
        return self.has_land_with_kind(kind)

    def has_land_with_season(self, season: str) -> bool:
        season_map = {
            "HARVEST": "HARVEST_READY",
            "HARVESTABLE": "HARVEST_READY",
            "PLANT": "PLANTING",
            "NONE": "NONE",
            "GROWING": "GROWING",
            "PLANTING": "PLANTING",
            "FALLOW": "FALLOW",
        }
        target = season_map.get(season.upper(), season)
        return any(l.stage == target for l in self.lands)

    def hasLandWithSeason(self, season: str) -> bool:
        return self.has_land_with_season(season)

    def has_land_with_kind_and_season(self, kind: str, season: str) -> bool:
        return any(l.crop_type == kind and l.stage == season for l in self.lands)

    def hasLandWithKindAndSeason(self, kind: str, season: str) -> bool:
        return self.has_land_with_kind_and_season(kind, season)

    def has_harvested_weight(self) -> bool:
        return self.harvested_weight > 0

    def hasHarvestedWeight(self) -> bool:
        return self.has_harvested_weight()

    def has_money_below(self, amount: float) -> bool:
        return self.money < amount

    def hasMoneyBelow(self, amount: float) -> bool:
        return self.has_money_below(amount)

    def has_money(self, amount: float) -> bool:
        return self.money >= amount

    def hasMoney(self, amount: float) -> bool:
        return self.has_money(amount)

    def has_loan(self) -> bool:
        return self.have_loan

    def hasLoan(self) -> bool:
        return self.has_loan()

    def has_health_below(self, threshold: float) -> bool:
        return (self.health * 100) < threshold

    def hasHealthBelow(self, threshold: float) -> bool:
        return self.has_health_below(threshold)

    def has_purpose(self) -> bool:
        return getattr(self, '_purpose_set', False)

    def hasPurpose(self) -> bool:
        return self.has_purpose()

    def needs_pesticides(self) -> bool:
        return self.pesticides <= 0

    def needsPesticides(self) -> bool:
        return self.needs_pesticides()

    def needs_seeds(self) -> bool:
        return self.seeds <= 0

    def needsSeeds(self) -> bool:
        return self.needs_seeds()

    def needs_tools(self) -> bool:
        return self.tools <= 0

    def needsTools(self) -> bool:
        return self.needs_tools()

    def needs_water(self) -> bool:
        return self.water_available <= 0

    def needsWater(self) -> bool:
        return self.needs_water()

    def is_price_list_available(self) -> bool:
        return not self.price_list_empty

    def isPriceListAvailable(self) -> bool:
        return self.is_price_list_available()

    def has_helper(self) -> bool:
        return self.peasant_family_helper != ""

    def hasHelper(self) -> bool:
        return self.has_helper()

    def is_worker(self) -> bool:
        return self.worker_without_land

    def isWorker(self) -> bool:
        return self.is_worker()

    def get_training_bonus(self) -> float:
        return self.training_level * 0.1

    def getTrainingBonus(self) -> float:
        return self.get_training_bonus()

    def get_efficiency_factor(self) -> float:
        return 1.0 - (self.training_level * 0.2)

    def getEfficiencyFactor(self) -> float:
        return self.get_efficiency_factor()

    def is_task_executed_today(self, task_id: str) -> bool:
        _ = task_id
        return False

    def to_summary(self) -> dict[str, Any]:
        return {
            "alias": self.alias,
            "money": self.money,
            "health": self.health,
            "happiness": self.happiness,
            "emotion": self.emotion,
            "current_goal": self.current_goal,
            "days_in_crisis": self.days_in_crisis,
            "food_security": self.food_security,
            "current_date": self.current_date,
            "tools": self.tools,
            "seeds": self.seeds,
            "water": self.water_available,
            "lands": len(self.lands),
            "have_loan": self.have_loan,
        }

    def get_lands_state(self) -> list[dict[str, Any]]:
        return [{"id": l.id, "area": l.area, "stage": l.stage} for l in self.lands]

    def has_land_with_stage(self, stage: str) -> bool:
        return any(l.stage == stage for l in self.lands)

    def has_land_with_crop(self, crop_type: str) -> bool:
        return any(l.crop_type == crop_type for l in self.lands)

    @property
    def has_farm(self) -> bool:
        return self.farm_name or len(self.lands) > 0

    @property
    def hasFarm(self) -> bool:
        return self.has_farm

    def is_sunday(self) -> bool:
        from datetime import datetime
        try:
            dt = datetime.strptime(self.current_date, "%d/%m/%Y")
            return dt.weekday() == 6
        except Exception:
            return True

    def isSunday(self) -> bool:
        return self.is_sunday()
