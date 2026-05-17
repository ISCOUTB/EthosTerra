"""ContextBuilderAgent — combina datos CSV con especificaciones YAML.

Recibe EpisodeData, carga GoalSpec + PlanSpec, traduce activation_when
a texto legible en español y construye el dict de variables del prompt.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from besa.kernel.agent import AgentBESA
from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.bdi.declarative.plan_registry import PlanRegistry
from besa.bdi.declarative.goal_spec import GoalSpec

from experiments.explainability.events.episode_event import EpisodeData
from experiments.explainability.events.context_event import ContextData

PYRAMID_LABELS = {
    "L1_SURVIVAL": "Supervivencia (prioridad máxima)",
    "L2_OBLIGATION": "Obligación",
    "L3_OPPORTUNITY": "Oportunidad productiva",
    "L4_REQUIREMENT": "Necesidad de recursos",
    "L5_NEED": "Vínculos sociales",
    "L6_ATTENTION_CYCLE": "Bienestar y ocio",
    "SURVIVAL": "Supervivencia",
    "DUTY": "Deber / Obligación",
    "OPPORTUNITY": "Oportunidad",
    "REQUIREMENT": "Necesidad de recursos",
    "NEED": "Vínculos sociales",
    "ATTENTION_CYCLE": "Atención y descanso",
}

EPISODE_GOAL_DEFAULTS = {
    "LEISURE":          "leisure_activities",
    "CRISIS":           "do_vitals",
    "ALTERNATIVE_WORK": "alternative_work",
    "LOAN_REQUEST":     "look_for_loan",
    "EMOTIONAL_SHIFT":  "do_vitals",
    "HARVEST":          "harvest_crops",
}


@dataclass
class BuilderState:
    processed: int = 0


class ReceiveEpisodeGuard(GuardBESA):
    """Recibe EpisodeData y construye el contexto para el NarrativeAgent."""

    def func_exec_guard(self, event: EventBESA) -> None:
        episode: EpisodeData = event.data
        agent: ContextBuilderAgent = self._agent  # type: ignore[assignment]
        ctx = agent.build_context(episode)
        state: BuilderState = self.get_state()
        state.processed += 1
        agent.send(
            "NarrativeAgent",
            EventBESA(guard_type=ReceiveContextGuard, data=ctx),
        )


class ReceiveContextGuard(GuardBESA):
    """Guard dummy — lo registra NarrativeAgent."""

    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class ContextBuilderAgent(AgentBESA):
    def __init__(self, alias: str = "ContextBuilderAgent"):
        super().__init__(alias=alias, state=BuilderState())
        self.register_guard(ReceiveEpisodeGuard)
        self.register_guard(ReceiveContextGuard)

    def build_context(self, episode: EpisodeData) -> ContextData:
        goal_id = episode.goal_id or EPISODE_GOAL_DEFAULTS.get(episode.episode_type, "do_vitals")
        goal_registry = GoalRegistry.get_instance()
        plan_registry = PlanRegistry.get_instance()

        spec: GoalSpec | None = goal_registry.get(goal_id)
        if spec is None:
            # Intentar con guión bajo → sin guión
            spec = goal_registry.get(goal_id.replace("-", "_"))

        display_name = spec.display_name if spec else goal_id.replace("_", " ").title()
        pyramid_level = spec.pyramid_level if spec else "SURVIVAL"
        activation_raw = spec.activation_when if spec else "state.isNewDay()"
        effects = spec.effects if spec else {}

        plan_spec = plan_registry.get_plan(spec.plan_ref if spec else f"{goal_id}_plan")

        return ContextData(
            episode=episode,
            goal_display_name=display_name,
            pyramid_level_human=PYRAMID_LABELS.get(pyramid_level, pyramid_level),
            activation_when_raw=activation_raw,
            activation_when_human=_translate_activation(activation_raw),
            effects_human=_translate_effects(effects),
            plan_steps_human=_translate_plan_steps(plan_spec),
            historical_narrative=_build_historical_table(episode.window),
            prompt_vars=_build_prompt_vars(episode, display_name, pyramid_level, activation_raw, effects, episode.window),
        )


def _translate_activation(expr: str) -> str:
    """Convierte expresiones Java-style del YAML a texto comprensible en español."""
    rules = [
        (r"belief\.get\('money'\)\s*<=\s*([\d]+)",
         lambda m: f"Capital en caja ≤ ${int(m.group(1)):,} COP"),
        (r"belief\.get\('money'\)\s*<\s*([\d]+)",
         lambda m: f"Capital en caja < ${int(m.group(1)):,} COP"),
        (r"belief\.get\('money'\)\s*>\s*0",
         lambda _: "la familia tiene algún capital disponible"),
        (r"belief\.get\('money'\)\s*>=\s*([\d]+)",
         lambda m: f"Capital en caja ≥ ${int(m.group(1)):,} COP"),
        (r"state\.hasMoneyBelow\(([\d]+)\)",
         lambda m: f"Capital inferior a ${int(m.group(1)):,} COP"),
        (r"state\.isNewDay\(\)",
         lambda _: "inicio de un nuevo día de simulación"),
        (r"state\.hasPurpose\(\)",
         lambda _: "la familia tiene un propósito definido"),
        (r"!state\.hasPurpose\(\)",
         lambda _: "la familia no tiene un propósito definido"),
        (r"state\.hasLoan\(\)",
         lambda _: "existe un préstamo activo"),
        (r"!state\.hasLoan\(\)",
         lambda _: "no hay préstamos activos"),
        (r"state\.peasantProfile\.loanAmountToPay\s*==\s*0",
         lambda _: "no hay deuda pendiente de préstamo"),
        (r"state\.timeLeftOnDay\s*>=\s*([\d]+)",
         lambda m: f"quedan ≥ {m.group(1)} minutos en el día"),
        (r"&&", lambda _: " Y "),
        (r"\|\|", lambda _: " O "),
        (r"!", lambda _: "NO "),
    ]
    result = expr
    for pattern, replacement in rules:
        result = re.sub(pattern, replacement if callable(replacement) else lambda _, r=replacement: r, result)
    result = re.sub(r"\s+", " ", result).strip()
    return result or expr


def _translate_effects(effects: dict | None) -> str:
    if not effects:
        return "Sin efectos documentados."
    lines = []
    on_success = effects.get("on_success", {})
    on_failure = effects.get("on_failure", {})
    if on_success:
        parts = []
        for k, v in on_success.items():
            if k == "have_loan":
                parts.append("activa préstamo")
            elif k == "money":
                parts.append(f"dinero {v:+}")
            elif k == "happiness":
                parts.append(f"felicidad {float(v):+.2f}")
            elif k == "hopeful":
                parts.append(f"esperanza {float(v):+.2f}")
            else:
                parts.append(f"{k}={v}")
        lines.append("Éxito: " + ", ".join(parts))
    if on_failure:
        parts = []
        for k, v in on_failure.items():
            parts.append(f"{k}={v}")
        lines.append("Fallo: " + ", ".join(parts))
    return " | ".join(lines) if lines else "Ver YAML."


def _translate_plan_steps(plan_spec) -> str:
    if plan_spec is None or not plan_spec.steps:
        return "Plan no disponible."
    steps = []
    for i, step in enumerate(plan_spec.steps[:5], 1):
        action = getattr(step, "action", str(step))
        steps.append(f"{i}. {action.replace('_', ' ')}")
    if len(plan_spec.steps) > 5:
        steps.append(f"... ({len(plan_spec.steps) - 5} pasos más)")
    return "\n".join(steps)


def _build_historical_table(window: list[dict]) -> str:
    if not window:
        return "Sin historial disponible."
    headers = ["Fecha", "Dinero (COP)", "Salud", "Emoción", "Meta activa"]
    rows = ["| " + " | ".join(headers) + " |",
            "|" + "|".join(["---"] * len(headers)) + "|"]
    for row in window:
        money = row.get("money", "")
        try:
            money = f"${float(money):,.0f}"
        except (ValueError, TypeError):
            money = money or "-"
        rows.append(
            f"| {row.get('date', '-')} "
            f"| {money} "
            f"| {row.get('health', '-')} "
            f"| {row.get('emotion', '-')} "
            f"| {(row.get('current_goal') or '-').replace('_', ' ')} |"
        )
    return "\n".join(rows)


_EPISODE_HINTS: dict[str, str] = {
    "LEISURE": (
        "**Atención — episodio clave:** Esta familia está en crisis económica (capital bajo) "
        "pero el sistema decidió que descansara en lugar de trabajar o buscar ingresos. "
        "Explica por qué el bienestar emocional y físico de la familia justificó este 'descanso obligado' "
        "en medio de la escasez, y qué riesgos y beneficios trae esta decisión para el técnico rural."
    ),
    "CRISIS": (
        "**Contexto:** La familia atraviesa una crisis económica severa. "
        "Explica qué presiones la llevaron a este punto y qué opciones tiene disponibles."
    ),
    "ALTERNATIVE_WORK": (
        "**Contexto:** La familia buscó trabajo por fuera de la finca como estrategia de supervivencia. "
        "Explica qué la llevó a tomar esta decisión y qué implica para la actividad agrícola propia."
    ),
    "LOAN_REQUEST": (
        "**Contexto:** La familia solicitó un préstamo. "
        "Explica las circunstancias que la llevaron a endeudarse y los riesgos asociados."
    ),
    "EMOTIONAL_SHIFT": (
        "**Contexto:** El estado emocional de la familia empeoró. "
        "Explica qué situaciones acumuladas generaron este cambio y cómo afecta sus decisiones."
    ),
    "HARVEST": (
        "**Contexto:** La familia logró una cosecha significativa. "
        "Explica qué condiciones hicieron posible este resultado y su impacto en la seguridad alimentaria."
    ),
}


def _episode_context_hint(episode_type: str) -> str:
    return _EPISODE_HINTS.get(episode_type, "")


def _build_prompt_vars(
    ep: EpisodeData,
    display_name: str,
    pyramid_level: str,
    activation_raw: str,
    effects: dict | None,
    window: list[dict],
) -> dict:
    row = ep.trigger_row
    money = row.get("money", "0")
    try:
        money_fmt = f"${float(money):,.0f}"
    except (ValueError, TypeError):
        money_fmt = money or "$0"

    return {
        "agent_alias": ep.agent_alias,
        "treatment_id": ep.treatment_id,
        "episode_type": ep.episode_type,
        "current_date": ep.trigger_date,
        "current_day": row.get("current_day", "-"),
        "year": row.get("year", "-"),
        "money": money_fmt,
        "health": row.get("health", "-"),
        "happiness": row.get("happiness", "-"),
        "emotion": (row.get("emotion") or "neutral"),
        "current_goal": (row.get("current_goal") or display_name).replace("_", " "),
        "goal_display_name": display_name,
        "pyramid_level_human": PYRAMID_LABELS.get(pyramid_level, pyramid_level),
        "activation_when_raw": activation_raw,
        "activation_when_human": _translate_activation(activation_raw),
        "effects_human": _translate_effects(effects),
        "historical_narrative": _build_historical_table(window),
        "loans_active": row.get("loans_active", "0"),
        "days_in_crisis": row.get("days_in_crisis", "0"),
        "food_security": row.get("food_security", "-"),
        "social_capital": row.get("social_capital", "-"),
        "episode_context": _episode_context_hint(ep.episode_type),
    }
