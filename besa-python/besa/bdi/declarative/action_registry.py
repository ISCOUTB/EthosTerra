from __future__ import annotations

from typing import Any, Protocol


class PrimitiveAction(Protocol):
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool: ...


class EmitEpisodeAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        text = (params or {}).get("text", "")
        if text:
            believes.task_log.append(text[:200])
        return True


class UpdateBeliefAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        key = p.get("key", "")
        value = p.get("value", p.get("new_value", True))
        if key:
            setattr(believes, key, value)
            setattr(believes, f"_{key}_set", True)
            if key == "new_day":
                believes.new_day = bool(str(value).lower() == "true" if isinstance(value, str) else value)
        return True


class ConsumeResourceAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        key = p.get("key", "")
        amount = int(float(str(p.get("amount", 0))))
        if key == "time_left_on_day":
            personality = getattr(believes, 'personality', 0.3)
            efficiency = 1.0 - (personality - 0.3) * 0.4
            amount = max(1, int(amount * efficiency))
            believes.time_left_on_day = max(0, believes.time_left_on_day - amount)
        elif key == "money":
            believes.money = max(0, believes.money - amount)
        elif key == "seeds":
            believes.seeds = max(0, believes.seeds - amount)
        elif key == "water_available":
            believes.water_available = max(0, believes.water_available - amount)
        elif key == "tools":
            believes.tools = max(0, believes.tools - amount)
        return True


class SendEventAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        send_guard = p.get("_send_guard_event")
        agent = p.get("_agent_alias", "")
        to = p.get("to", "")
        msg_type = p.get("type", "")
        payload = p.get("payload", {})
        if send_guard and to and msg_type:
            send_guard(to, msg_type, payload | {"from": agent})
        return True


class SendMarketPlaceEventAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        send_guard = p.get("_send_guard_event")
        agent = p.get("_agent_alias", "")
        mtype = p.get("message_type", "")
        quantity = int(float(str(p.get("quantity", "1"))))
        reset = str(p.get("reset_resource_needed", "true")).lower() == "true"
        if send_guard and mtype:
            from ethosterra.agents.market_place import MarketPlaceMessage, MarketPlaceMessageType
            mapped = {
                "ASK_FOR_PRICE_LIST": MarketPlaceMessageType.GET_PRICES,
                "BUY_SEEDS": MarketPlaceMessageType.BUY_RESOURCES,
                "BUY_WATER": MarketPlaceMessageType.BUY_RESOURCES,
                "BUY_PESTICIDES": MarketPlaceMessageType.BUY_RESOURCES,
                "BUY_TOOLS": MarketPlaceMessageType.BUY_RESOURCES,
                "BUY_SUPPLIES": MarketPlaceMessageType.BUY_RESOURCES,
                "BUY_LIVESTOCK": MarketPlaceMessageType.BUY_RESOURCES,
            }
            resource_map = {
                "BUY_SEEDS": "seeds", "BUY_WATER": "water",
                "BUY_PESTICIDES": "pesticides", "BUY_TOOLS": "tools",
                "BUY_SUPPLIES": "supplies", "BUY_LIVESTOCK": "livestock",
            }
            msg = MarketPlaceMessage(
                message_type=mapped.get(mtype, MarketPlaceMessageType.GET_PRICES),
                peasant_alias=agent,
                resource=resource_map.get(mtype, mtype.lower()),
                quantity=quantity,
            )
            send_guard("MarketPlace", mtype, msg)
            if reset and mtype in resource_map:
                setattr(believes, f"needs_{resource_map[mtype]}", False)
        return True


class SendCivicAuthorityLandRequestAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        send_guard = p.get("_send_guard_event")
        agent = p.get("_agent_alias", "")
        if send_guard:
            from ethosterra.agents.civic_authority import CivicAuthorityMessage
            believes.farm_name = True
            msg = CivicAuthorityMessage("REQUEST_LAND", peasant_alias=agent)
            send_guard("CivicAuthority", "REQUEST_LAND", msg)
        return True


class EmitEmotionAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        axis = p.get("axis", "happiness")
        delta = float(p.get("delta", 0))
        current = getattr(believes, axis, believes.happiness)
        setattr(believes, axis, max(0.0, min(1.0, current + delta)))
        return True


class IncreaseHealthAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        amount = float(p.get("amount", 0.05))
        believes.health = min(1.0, believes.health + amount)
        return True


class SyncClockAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        return True


class LogAuditAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        return True


class IncrementBeliefAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        key = p.get("key", "")
        amount = float(p.get("amount", 1))
        if key:
            v = getattr(believes, key, 0)
            if isinstance(v, (int, float)):
                new_val = v + amount
                if key == "money":
                    new_val = max(0.0, new_val)
                setattr(believes, key, new_val)
                setattr(believes, f'_{key}_incremented', True)
        return True


class WaitForEventAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        return True


class ConditionalAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        key = p.get("key", "money")
        threshold = int(p.get("threshold", 0))
        val = getattr(believes, key, 0)
        if val >= threshold:
            for action in p.get("then", []):
                a = ACTIONS.get(action.get("action"))
                if a:
                    a.execute(believes, action.get("args", {}))
        return True


class SendSocietyCollaborationAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        send_guard = p.get("_send_guard_event")
        agent = p.get("_agent_alias", "")
        flag = p.get("flag", "")
        days = int(p.get("amount", 5))
        if send_guard and flag:
            from ethosterra.agents.community_dynamics import CommunityDynamicsMessage
            action_type = "OFFER_HELP" if "offer" in str(p.get("guard", "")).lower() else "REQUEST_WORKER"
            msg = CommunityDynamicsMessage(action_type, worker_alias=agent, days=days)
            send_guard("CommunityDynamics", action_type, msg)
            setattr(believes, flag, True)
        return True


class SpendFriendsTimeAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        delta = float(p.get("happiness_gain", 0.05))
        believes.happiness = min(1.0, believes.happiness + delta)
        believes.social_capital = min(1.0, believes.social_capital + 0.02)
        return True


class AgroEcosystemAction:
    _STAGE_AFTER = {
        "PREPARE": "PLANTING",
        "PLANT": "GROWING",
        "CHECK": None,
        "IRRIGATE": "IRRIGATED",
        "PESTICIDE": "TREATED",
        "HARVEST": "FALLOW",
        "DEFOREST": "NONE",
        "SELL": None,
    }

    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        send_guard = p.get("_send_guard_event")
        agent = p.get("_agent_alias", "")
        op = p.get("operation", "")
        if send_guard and op:
            from ethosterra.agents.agro_ecosystem import AgroEcosystemMessage, AgroEcosystemMessageType
            op_map = {
                "CHECK": AgroEcosystemMessageType.CROP_INFORMATION,
                "DEFOREST": AgroEcosystemMessageType.CROP_INIT,
                "HARVEST": AgroEcosystemMessageType.CROP_HARVEST,
                "IRRIGATE": AgroEcosystemMessageType.CROP_IRRIGATION,
                "PESTICIDE": AgroEcosystemMessageType.CROP_PESTICIDE,
                "PLANT": AgroEcosystemMessageType.CROP_INIT,
                "PREPARE": AgroEcosystemMessageType.CROP_INIT,
                "SELL": AgroEcosystemMessageType.CROP_INFORMATION,
            }
            crop_type = p.get("crop_type", "")
            if not crop_type and hasattr(believes, 'lands') and believes.lands:
                crop_type = believes.lands[0].crop_type or ""
            msg = AgroEcosystemMessage(
                message_type=op_map.get(op, AgroEcosystemMessageType.CROP_INFORMATION),
                crop_id=f"{agent}_crop",
                peasant_alias=agent,
                date=believes.current_date,
                crop_type=crop_type,
            )
            send_guard("AgroEcosystem", op, msg)
            new_stage = self._STAGE_AFTER.get(op)
            if believes.lands:
                if new_stage:
                    believes.lands[0].stage = new_stage
                if op in ("PREPARE", "PLANT") and crop_type and believes.lands:
                    believes.lands[0].crop_type = crop_type
        return True


class SetLandCropTypeAction:
    def execute(self, believes: Any, params: dict[str, Any] | None = None) -> bool:
        p = params or {}
        crop_type = p.get("crop_type", "maiz")
        if hasattr(believes, 'lands') and believes.lands:
            believes.lands[0].crop_type = crop_type
        return True


ACTIONS: dict[str, PrimitiveAction] = {
    "emit_episode": EmitEpisodeAction(),
    "update_belief": UpdateBeliefAction(),
    "consume_resource": ConsumeResourceAction(),
    "send_event": SendEventAction(),
    "send_marketplace_event": SendMarketPlaceEventAction(),
    "send_civic_land_request": SendCivicAuthorityLandRequestAction(),
    "emit_emotion": EmitEmotionAction(),
    "increase_health": IncreaseHealthAction(),
    "sync_clock": SyncClockAction(),
    "log_audit": LogAuditAction(),
    "increment_belief": IncrementBeliefAction(),
    "wait_for_event": WaitForEventAction(),
    "conditional": ConditionalAction(),
    "send_society_collaboration": SendSocietyCollaborationAction(),
    "spend_friends_time": SpendFriendsTimeAction(),
    "agro_ecosystem_operation": AgroEcosystemAction(),
    "set_land_crop_type": SetLandCropTypeAction(),
}
