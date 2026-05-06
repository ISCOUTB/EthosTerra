from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.agents.market_place import MarketPlaceMessage


class MarketPlaceInfoAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        from ethosterra.agents.market_place import MarketPlaceMessage
        if not isinstance(msg, MarketPlaceMessage):
            return
        if msg.message_type == "PRICE_LIST":
            from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
            believes: PeasantFamilyBelieves = self.get_state()
            if believes:
                believes.price_list_empty = False
                believes.update_price_list = False
                believes.task_log.append("Lista de precios del mercado actualizada")
