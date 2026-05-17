"""Validación programática de narrativas LLM contra datos reales del CSV."""
from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from experiments.analysis.state import EpisodeResult, AnalysisState

_MONEY_RE = re.compile(
    r'\$\s*([\d]{1,3}(?:[,.][\d]{3})+(?:[,.]\d+)?|\d{4,})',
    re.IGNORECASE,
)
_PCT_RE = re.compile(r'(\d+(?:\.\d+)?)\s*%')


def extract_monetary_values(text: str) -> list[float]:
    values: list[float] = []
    for m in _MONEY_RE.finditer(text):
        raw = m.group(1).replace(".", "").replace(",", "")
        try:
            values.append(float(raw))
        except ValueError:
            pass
    return values


def extract_percentages(text: str) -> list[float]:
    return [float(m.group(1)) for m in _PCT_RE.finditer(text)]


def validate_against_trigger_row(
    text: str,
    trigger_row: dict,
    tolerance: float = 0.10,
    context_values: list[float] | None = None,
) -> dict:
    result: dict = {
        "money_ok": True,
        "health_ok": True,
        "mismatches": [],
        "hallucinations": False,
    }

    try:
        true_money = float(trigger_row.get("money", "0"))
    except (ValueError, TypeError):
        true_money = 0.0

    if true_money > 0:
        for val in extract_monetary_values(text):
            if context_values and any(
                abs(val - cv) / max(cv, 1) < 0.05 for cv in context_values if cv > 0
            ):
                continue
            diff_pct = abs(val - true_money) / max(true_money, 1)
            if diff_pct > tolerance:
                result["money_ok"] = False
                result["hallucinations"] = True
                result["mismatches"].append({
                    "field": "money",
                    "extracted": val,
                    "truth": true_money,
                    "diff_pct": round(diff_pct * 100, 1),
                })

    return result


def log_hallucination(
    episode_result: "EpisodeResult",
    state: "AnalysisState",
) -> None:
    ep = episode_result.episode_data
    state.hallucination_log.append({
        "treatment_id": ep.treatment_id,
        "agent": ep.agent_alias,
        "date": ep.trigger_date,
        "episode_type": ep.episode_type,
        "mismatches": episode_result.validation_result.get("mismatches", []),
        "corrected": episode_result.corrected,
    })


def build_correction_note(validation_result: dict, trigger_row: dict) -> str:
    if not validation_result.get("hallucinations"):
        return ""
    try:
        true_money = float(trigger_row.get("money", "0"))
        money_str = f"${true_money:,.0f}"
    except (ValueError, TypeError):
        money_str = str(trigger_row.get("money", "desconocido"))

    return (
        f"CORRECCIÓN IMPORTANTE: El capital real de esta familia es {money_str} COP. "
        "Usa este valor exacto en tu respuesta.\n\n"
    )
