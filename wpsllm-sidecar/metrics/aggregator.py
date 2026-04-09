"""
Agregador multi-sesión de métricas del BDI Pulse.
Lee todos los archivos *.jsonl históricos y calcula estadísticas
comparativas entre el motor LLM y el motor numérico eBDI original.
"""
import os
import json
import statistics
from pathlib import Path
from datetime import datetime, timezone
from config import METRICS_DIR


def aggregate_all_sessions() -> dict:
    """
    Lee todos los archivos session_*.jsonl y genera un reporte comparativo.
    Este reporte valida las métricas del paper TEMSCON-LATAM 2026.
    """
    records = _load_all_records()

    if not records:
        return {
            "status": "no_data",
            "message": "No se encontraron registros. Ejecuta una simulación primero.",
        }

    llm_records = [r for r in records if r.get("mode") == "llm"]
    numeric_only = [r for r in records if r.get("mode") == "numeric"]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sessions_found": _count_session_files(),
        "totals": {
            "total_pulses": len(records),
            "llm_pulses": len(llm_records),
            "numeric_pulses": len(numeric_only),
            "llm_activation_rate": round(len(llm_records) / len(records), 4) if records else 0,
        },

        # ── Métricas de latencia (validación del paper) ──────────────────
        "latency_ms": _compute_latency_stats(llm_records),

        # ── Coherencia funcional (crisis → supervivencia) ─────────────────
        "coherence": _compute_coherence(llm_records),

        # ── Comparativa LLM vs. Numérico (novedad del framework) ──────────
        "dual_track_comparison": _compute_dual_track(llm_records),

        # ── Proyección ejecución completa (100 ag × 1825 días) ───────────
        "projection": _compute_projection(llm_records),

        # ── Distribución de metas por motor ──────────────────────────────
        "intent_distribution": {
            "llm": _count_intentions(llm_records, "llm"),
            "numeric": _count_intentions(llm_records, "numeric"),
        },
    }


def _load_all_records() -> list[dict]:
    """Carga todos los registros de todos los archivos .jsonl."""
    if not METRICS_DIR.exists():
        return []

    records = []
    for filepath in sorted(METRICS_DIR.glob("session_*.jsonl")):
        try:
            with open(filepath, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            records.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
        except IOError:
            continue
    return records


def _count_session_files() -> int:
    if not METRICS_DIR.exists():
        return 0
    return len(list(METRICS_DIR.glob("session_*.jsonl")))


def _compute_latency_stats(records: list[dict]) -> dict:
    """Calcula estadísticas de latencia: TTFT y total (en ms)."""
    ttft_values = [r["llm"]["ttft_ms"] for r in records if r.get("llm", {}).get("ttft_ms", -1) > 0]
    total_values = [r["llm"]["total_ms"] for r in records if r.get("llm", {}).get("total_ms", -1) > 0]

    def stats(values: list[float]) -> dict:
        if not values:
            return {"n": 0}
        return {
            "n": len(values),
            "mean_ms": round(statistics.mean(values), 1),
            "median_ms": round(statistics.median(values), 1),
            "p90_ms": round(_percentile(values, 90), 1),
            "p95_ms": round(_percentile(values, 95), 1),
            "min_ms": round(min(values), 1),
            "max_ms": round(max(values), 1),
            # Referencia del paper (Sección VI)
            "paper_target_ms": 150 if "ttft" in str(values[:1]) else 900,
        }

    return {
        "ttft": {
            "n": len(ttft_values),
            "mean_ms": round(statistics.mean(ttft_values), 1) if ttft_values else None,
            "median_ms": round(statistics.median(ttft_values), 1) if ttft_values else None,
            "p90_ms": round(_percentile(ttft_values, 90), 1) if ttft_values else None,
            "paper_target_ms": 150,     # Meta del paper: 150 ms TTFT
        },
        "total": {
            "n": len(total_values),
            "mean_ms": round(statistics.mean(total_values), 1) if total_values else None,
            "median_ms": round(statistics.median(total_values), 1) if total_values else None,
            "p90_ms": round(_percentile(total_values, 90), 1) if total_values else None,
            "paper_target_ms": 900,     # Meta del paper: ~900 ms total
        },
    }


def _compute_coherence(records: list[dict]) -> dict:
    """
    Valida coherencia funcional: en condiciones de crisis, el LLM debe
    priorizar metas de supervivencia (paper Sección VI.B).
    """
    SURVIVAL_GOALS = {"DoVitalsTask", "DoHealthCareTask", "DoVoidTask"}
    OBLIGATION_GOALS = {"PayDebtsTask", "LookForLoanTask"}

    crisis_records = [
        r for r in records
        if r.get("agent_state", {}).get("health", 100) < 30
        or r.get("agent_state", {}).get("money", 999999) < 500000
    ]

    if not crisis_records:
        return {"status": "no_crisis_records", "note": "Sin escenarios de crisis registrados aún"}

    llm_survival_rate = sum(
        1 for r in crisis_records
        if r.get("llm", {}).get("intention", "") in SURVIVAL_GOALS | OBLIGATION_GOALS
    ) / len(crisis_records)

    numeric_survival_rate = sum(
        1 for r in crisis_records
        if r.get("numeric", {}).get("winner_goal", "") in SURVIVAL_GOALS | OBLIGATION_GOALS
    ) / len(crisis_records)

    return {
        "crisis_records_n": len(crisis_records),
        "llm_survival_priority_rate": round(llm_survival_rate, 4),
        "numeric_survival_priority_rate": round(numeric_survival_rate, 4),
        "paper_target": ">= 0.95",
        "llm_passes": llm_survival_rate >= 0.95,
    }


def _compute_dual_track(records: list[dict]) -> dict:
    """Análisis de concordancia/divergencia entre motor LLM y motor numérico."""
    if not records:
        return {"n": 0}

    agreement_count = sum(1 for r in records if r.get("divergence", {}).get("agreement", False))
    in_top3_count = sum(1 for r in records if r.get("divergence", {}).get("llm_in_numeric_top3", False))

    return {
        "n": len(records),
        "agreement_rate": round(agreement_count / len(records), 4),
        "llm_in_numeric_top3_rate": round(in_top3_count / len(records), 4),
        "description": (
            "agreement_rate: porcentaje de ciclos donde LLM y motor numérico "
            "eligieron exactamente la misma meta. "
            "llm_in_numeric_top3_rate: porcentaje donde la elección del LLM "
            "coincide con el top-3 del motor numérico."
        ),
    }


def _compute_projection(records: list[dict]) -> dict:
    """Proyecta el tiempo total para 100 agentes × 1825 días (paper objetivo)."""
    if not records:
        return {}

    total_values = [r["llm"]["total_ms"] for r in records if r.get("llm", {}).get("total_ms", -1) > 0]
    if not total_values:
        return {}

    mean_ms = statistics.mean(total_values)
    # 100 agentes × 1825 días × mean_ms / 1000 / 3600 = horas
    total_pulses = 100 * 1825
    projected_hours_sequential = (total_pulses * mean_ms) / 1000 / 3600
    # Con modo híbrido (25% de ciclos usan LLM)
    hybrid_rate = 0.25
    projected_hours_hybrid = projected_hours_sequential * hybrid_rate

    return {
        "total_pulses_full_sim": total_pulses,
        "mean_pulse_ms": round(mean_ms, 1),
        "projected_sequential_hours": round(projected_hours_sequential, 1),
        "projected_hybrid_hours": round(projected_hours_hybrid, 1),
        "paper_target_hours": 46,  # ~46 h con Gemma 4 E4B (paper Tabla I)
    }


def _count_intentions(records: list[dict], motor: str) -> dict:
    """Cuenta la distribución de metas por motor."""
    counts: dict[str, int] = {}
    key = "intention" if motor == "llm" else "winner_goal"
    sub_key = "llm" if motor == "llm" else "numeric"
    for r in records:
        goal = r.get(sub_key, {}).get(key, "unknown")
        counts[goal] = counts.get(goal, 0) + 1
    return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True))


def _percentile(data: list[float], p: float) -> float:
    """Calcula el percentil p de una lista de datos."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    idx = (p / 100) * (len(sorted_data) - 1)
    lower = int(idx)
    upper = min(lower + 1, len(sorted_data) - 1)
    fraction = idx - lower
    return sorted_data[lower] + fraction * (sorted_data[upper] - sorted_data[lower])
