from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.agents.market_place import MarketPlaceMessage


class MarketPlaceInfoAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, MarketPlaceMessage):
            return
        if msg.message_type == "PRICE_LIST":
            pass
