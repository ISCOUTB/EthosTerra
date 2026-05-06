from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA


class MarketPlaceMessageType:
    BUY_RESOURCES = "BUY_RESOURCES"
    SELL_PRODUCTS = "SELL_PRODUCTS"
    GET_PRICES = "GET_PRICES"
    PRICE_LIST = "PRICE_LIST"
    TRANSACTION_COMPLETE = "TRANSACTION_COMPLETE"
    TRANSACTION_FAILED = "TRANSACTION_FAILED"


class MarketPlaceMessage:
    def __init__(
        self,
        message_type: str = "",
        peasant_alias: str = "",
        resource: str = "",
        quantity: float = 0.0,
        price: float = 0.0,
    ):
        self.message_type = message_type
        self.peasant_alias = peasant_alias
        self.resource = resource
        self.quantity = quantity
        self.price = price


@dataclass
class MarketPlaceState:
    prices: dict[str, float] = field(default_factory=lambda: {
        "water": 5000, "seeds": 15000, "pesticides": 20000,
        "tools": 50000, "livestock": 200000,
        "rice": 3000, "roots": 2500, "maiz": 2000,
        "frijol": 4000, "cafe": 8000, "platano": 3000,
    })
    inventory: dict[str, float] = field(default_factory=lambda: {
        "water": 10000, "seeds": 5000, "pesticides": 2000,
        "tools": 500, "livestock": 100,
    })
    available_money: float = 1000000000.0


class MarketPlaceGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, MarketPlaceMessage):
            return
        state: MarketPlaceState = self.get_state()

        if msg.message_type == MarketPlaceMessageType.GET_PRICES:
            self._agent.send(
                msg.peasant_alias,
                EventBESA(
                    guard_type=FromMarketPlaceGuard,
                    data=MarketPlaceMessage(
                        MarketPlaceMessageType.PRICE_LIST,
                        price=state.prices.get(msg.resource, 0),
                    ),
                ),
            )

        elif msg.message_type == MarketPlaceMessageType.BUY_RESOURCES:
            price = state.prices.get(msg.resource, 0) * msg.quantity
            if state.inventory.get(msg.resource, 0) >= msg.quantity and state.available_money >= price:
                state.inventory[msg.resource] = state.inventory.get(msg.resource, 0) - msg.quantity
                state.available_money += price
                self._agent.send(
                    msg.peasant_alias,
                    EventBESA(
                        guard_type=FromMarketPlaceGuard,
                        data=MarketPlaceMessage(
                            MarketPlaceMessageType.TRANSACTION_COMPLETE,
                            resource=msg.resource,
                            quantity=msg.quantity,
                            price=price,
                        ),
                    ),
                )
            else:
                self._agent.send(
                    msg.peasant_alias,
                    EventBESA(
                        guard_type=FromMarketPlaceGuard,
                        data=MarketPlaceMessage(MarketPlaceMessageType.TRANSACTION_FAILED),
                    ),
                )

        elif msg.message_type == MarketPlaceMessageType.SELL_PRODUCTS:
            value = state.prices.get(msg.resource, 0) * msg.quantity
            state.inventory[msg.resource] = state.inventory.get(msg.resource, 0) + msg.quantity
            state.available_money -= value
            self._agent.send(
                msg.peasant_alias,
                EventBESA(
                    guard_type=FromMarketPlaceGuard,
                    data=MarketPlaceMessage(MarketPlaceMessageType.TRANSACTION_COMPLETE, price=value),
                ),
            )


class FromMarketPlaceGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class MarketPlaceAgent(AgentBESA):
    def __init__(self, alias: str):
        super().__init__(alias, MarketPlaceState())
        self.register_guard(MarketPlaceGuard)
