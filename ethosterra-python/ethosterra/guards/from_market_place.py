from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.agents.market_place import MarketPlaceMessage, MarketPlaceMessageType


class FromMarketPlaceGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, MarketPlaceMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        if msg.message_type == MarketPlaceMessageType.PRICE_LIST:
            pass

        elif msg.message_type == MarketPlaceMessageType.TRANSACTION_COMPLETE:
            if msg.resource == "seeds":
                believes.seeds += int(msg.quantity)
            elif msg.resource == "water":
                believes.water_available += int(msg.quantity)
            elif msg.resource == "pesticides":
                believes.pesticides += int(msg.quantity)
            elif msg.resource == "tools":
                believes.tools += int(msg.quantity)
            elif msg.resource == "livestock":
                believes.livestock += int(msg.quantity)
            believes.money -= msg.price
