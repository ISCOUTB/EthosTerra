"""
Sistema de métricas con doble registro:
  - Resultado del motor LLM (intención, justificación, TTFT, latencia)
  - Resultado del motor numérico tradicional (contribución original del eBDI)

Este doble registro es el núcleo de la validación del paper TEMSCON-LATAM 2026:
permite comparar empíricamente ambos motores bajo idénticas condiciones.

MANDATORIO: os.umask(0) y chmod 0o666/0o777 para interoperabilidad host/container.
"""
import os
import json
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from config import METRICS_DIR

# Inicializar umask globalmente al importar el módulo
os.umask(0)
_metrics_lock = asyncio.Lock()


def _ensure_metrics_dir() -> Path:
    """Crea el directorio de métricas con permisos correctos."""
    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(METRICS_DIR, 0o777)
    except PermissionError:
        pass  # El directorio ya puede tener los permisos correctos
    return METRICS_DIR


def _session_file() -> Path:
    """Retorna el archivo JSONL de la sesión actual (uno por día)."""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return _ensure_metrics_dir() / f"session_{today}.jsonl"


async def record_pulse(
    agent_id: str,
    day: int,
    # Motor LLM
    llm_intention: str,
    llm_justification: str,
    llm_confidence: float,
    ttft_ms: int,
    total_ms: int,
    llm_success: bool,
    # Motor numérico (doble registro)
    numeric_winner_goal: str,
    numeric_winner_contribution: float,
    numeric_all_scores: dict[str, float],
    # Metadata
    mode: str = "llm",              # "llm" | "numeric" (modo híbrido)
    agent_state_snapshot: dict = None,
) -> None:
    """
    Registra un ciclo del BDI Pulse con doble track (LLM + numérico).

    Args:
        agent_id:                   alias del agente (ej. "PeasantFamily_01")
        day:                        día simulado interno
        llm_intention:              meta seleccionada por el LLM
        llm_justification:          justificación en lenguaje natural
        llm_confidence:             confianza del LLM [0.0, 1.0]
        ttft_ms:                    tiempo al primer token (ms)
        total_ms:                   latencia total del Pulse (ms)
        llm_success:                True si el JSON fue parseable
        numeric_winner_goal:        meta ganadora según el motor numérico eBDI
        numeric_winner_contribution:contribución máxima del motor numérico
        numeric_all_scores:         dict de {goal_name: contribution_score}
        mode:                       modo de activación del ciclo
        agent_state_snapshot:       snapshot del estado del agente para reproducibilidad
    """
    record = {
        # ── Identificación ──────────────────────────────
        "ts": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        "day_simulated": day,
        "mode": mode,

        # ── Motor LLM ───────────────────────────────────
        "llm": {
            "intention": llm_intention,
            "justification": llm_justification,
            "confidence": llm_confidence,
            "ttft_ms": ttft_ms,
            "total_ms": total_ms,
            "success": llm_success,
        },

        # ── Motor Numérico (eBDI original) ───────────────
        # Este es el "rastro" del motor tradicional para comparación empírica
        "numeric": {
            "winner_goal": numeric_winner_goal,
            "winner_contribution": numeric_winner_contribution,
            "all_scores": numeric_all_scores,   # snapshot completo de la pirámide
        },

        # ── Análisis de divergencia ──────────────────────
        "divergence": {
            # ¿Los dos motores eligieron la misma meta?
            "agreement": llm_intention == numeric_winner_goal,
            # ¿La meta LLM existe en el top-3 numérico?
            "llm_in_numeric_top3": _is_in_top_n(llm_intention, numeric_all_scores, 3),
        },
    }

    # Incluir snapshot de estado si se proporciona (para reproducibilidad)
    if agent_state_snapshot:
        record["agent_state"] = agent_state_snapshot

    # Escritura thread-safe y con permisos correctos
    async with _metrics_lock:
        try:
            filepath = _session_file()
            with open(filepath, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
            try:
                os.chmod(filepath, 0o666)
            except Exception:
                pass
        except Exception as e:
            print(f"❌ ERROR CRÍTICO AL ESCRIBIR LOG: {e}")
            import traceback
            traceback.print_exc()


def _is_in_top_n(goal: str, scores: dict[str, float], n: int) -> bool:
    """¿La meta `goal` está entre las top-N del motor numérico?"""
    if not scores:
        return False
    sorted_goals = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_n = [g for g, _ in sorted_goals[:n]]
    return goal in top_n
