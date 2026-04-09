"""
L4 – Prompt Engine para el BDI Pulse
Construye el prompt con el estado completo del agente y
parsea la respuesta JSON del LLM con fallback robusto por regex.
"""
import json
import re
import logging
from typing import Optional

log = logging.getLogger("wpsllm-sidecar")


# ── Plantilla del Pulse ──────────────────────────────────────────────────────
# Diseñada para producir JSON válido con la intención y su justificación.
# El número exacto de metas disponibles se inyecta dinámicamente desde Java.
PULSE_PROMPT_TEMPLATE = """\
Eres el motor deliberativo de una familia campesina en los Montes de María (Colombia).
Tu rol es seleccionar la meta más urgente para HOY basándote en el estado actual del agente.

═══ ESTADO DEL AGENTE (Día simulado {day}) ═══
Capital disponible  : ${money:,.0f} pesos colombianos
Salud               : {health}/100
Estado emocional    : {emotional_state}
Deuda bancaria activa: {has_loan}
Tierra para cultivar: {land_available}
Temporada actual    : {season}
Préstamo a pagar    : ${loan_amount:,.0f} pesos

═══ JERARQUÍA DE PRIORIDADES (de mayor a menor urgencia) ═══
1. SUPERVIVENCIA  → salud, alimentación, vitalidad diaria
2. OBLIGACIONES   → pago de deudas bancarias
3. DESARROLLO     → cultivo, cosecha, trabajo agrícola
4. RECURSOS       → semillas, herramientas, precio de mercado
5. SOCIAL         → colaboración con vecinos
6. OCIO           → descanso, familia, amigos

═══ METAS DISPONIBLES HOY ═══
{available_goals_list}

═══ INSTRUCCIÓN ═══
Selecciona UNA sola meta de la lista anterior. Justifica la decisión en 1-2 oraciones
haciendo referencia al estado del agente. Responde ÚNICAMENTE con JSON válido:

{{
  "selected_intention": "<nombre_exacto_de_una_meta_de_la_lista>",
  "justification": "<explicación contextualizada en español>",
  "confidence": <número entre 0.0 y 1.0>
}}\
"""


def build_pulse_prompt(state: dict) -> str:
    """
    Construye el prompt del BDI Pulse con el estado completo del agente.

    Args:
        state: diccionario con los campos del AgentState
    Returns:
        prompt string listo para enviar al LLM
    """
    available = state.get("available_goals", [])
    goals_formatted = "\n".join(f"  • {g}" for g in available) if available else "  • DoVitalsTask"

    return PULSE_PROMPT_TEMPLATE.format(
        day=state.get("day", 0),
        money=state.get("money", 0),
        health=state.get("health", 100),
        emotional_state=_translate_emotional_state(state.get("emotional_state", "NEUTRAL")),
        has_loan="SÍ" if state.get("has_loan", False) else "NO",
        land_available="SÍ" if state.get("land_available", False) else "NO",
        season=_translate_season(state.get("season", "NONE")),
        loan_amount=state.get("loan_amount", 0),
        available_goals_list=goals_formatted,
    )


def parse_llm_response(
    raw_text: str,
    available_goals: list[str],
) -> dict:
    """
    Parsea la respuesta JSON del LLM.
    Fallback en cascada:
      1. json.loads directo
      2. Extracción por regex del primer objeto JSON
      3. Respuesta por defecto (DoVitalsTask con confianza 0)

    Args:
        raw_text:        texto completo devuelto por el LLM
        available_goals: lista de metas válidas para validación
    Returns:
        dict con keys: selected_intention, justification, confidence
    """
    log.debug(f"Raw LLM response: {raw_text}")
    
    # --- Intento 1: Limpieza de Markdown y JSON directo ---
    clean_text = raw_text.replace("```json", "").replace("```", "").strip()
    result = _try_parse_json(clean_text)

    # --- Intento 2: Extraer bloque JSON con regex robusto ---
    if result is None:
        # Buscamos el último bloque { ... } en el texto (por si hay preámbulo con llaves)
        all_matches = list(re.finditer(r"(\{.*\})", raw_text, re.DOTALL | re.MULTILINE))
        if all_matches:
            potential_json = all_matches[-1].group(1).strip()
            result = _try_parse_json(potential_json)

    # --- Fallback: valor por defecto ---
    if result is None:
        # Log para diagnóstico persistente
        log.error(f"❌ Falló el parseo del LLM. Texto crudo recibido:\n{raw_text}\n")
        return {
            "selected_intention": available_goals[0] if available_goals else "DoVitalsTask",
            "justification": "Fallback: no se pudo parsear la respuesta del LLM.",
            "confidence": 0.0,
            "parse_error": True,
        }

    # --- Validar que la intención esté en la lista ---
    intention = result.get("selected_intention", "")
    if available_goals and intention not in available_goals:
        # Intentar match por nombre parcial (ej. "PayDebts" → "PayDebtsTask")
        matches = [g for g in available_goals if intention.lower() in g.lower() or g.lower() in intention.lower()]
        intention = matches[0] if matches else (available_goals[0] if available_goals else "DoVitalsTask")
        result["selected_intention"] = intention
        result["intention_corrected"] = True

    return {
        "selected_intention": intention,
        "justification": result.get("justification", ""),
        "confidence": float(result.get("confidence", 0.5)),
        "parse_error": False,
    }


def _try_parse_json(text: str) -> Optional[dict]:
    """Intenta parsear JSON, retorna None si falla."""
    try:
        obj = json.loads(text.strip())
        if isinstance(obj, dict):
            return obj
    except (json.JSONDecodeError, ValueError):
        pass
    return None


def _translate_emotional_state(state: str) -> str:
    """Traduce los estados emocionales del eBDI al español."""
    translations = {
        "HAPPY": "alegría moderada",
        "SAD": "tristeza",
        "ANGRY": "frustración",
        "FEAR": "miedo/incertidumbre",
        "NEUTRAL": "estado neutro",
        "ANXIOUS": "ansiedad",
        "HOPEFUL": "esperanza",
    }
    return translations.get(state.upper(), state)


def _translate_season(season: str) -> str:
    """Traduce los tipos de temporada al español."""
    translations = {
        "NONE": "sin temporada activa",
        "PLANTING": "temporada de siembra",
        "GROWING": "cultivo en crecimiento",
        "HARVEST": "temporada de cosecha",
        "IRRIGATION": "riego activo",
    }
    return translations.get(season.upper(), season)
