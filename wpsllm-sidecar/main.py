"""
WPSnext Sidecar – API FastAPI
Motor cognitivo LLM para el BDI Pulse de WellProdSim.

Endpoints:
  POST /pulse      → deliberación BDI con doble registro (LLM + numérico)
  GET  /metrics    → reporte agregado multi-sesión
  GET  /benchmark  → prueba de latencia con N pulses sintéticos
  GET  /health     → health check
"""
import os
import time
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

from config import HYBRID_MONEY_THRESHOLD, HYBRID_HEALTH_THRESHOLD
from layers.l1_llm_client import call_llm
from layers.l4_prompt_engine import build_pulse_prompt, parse_llm_response
from metrics.recorder import record_pulse
from metrics.aggregator import aggregate_all_sessions

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("wpsllm-sidecar")


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    os.umask(0)  # MANDATORIO: permisos de interoperabilidad host/container
    log.info("🚀 WPSnext Sidecar iniciado")
    yield
    log.info("🛑 WPSnext Sidecar detenido")


app = FastAPI(
    title="WPSnext BDI Pulse LLM Sidecar",
    description=(
        "Motor cognitivo LLM para el BDI Pulse de WellProdSim. "
        "Basado en el framework tecno-económico TEMSCON-LATAM 2026."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import PlainTextResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    raw_body = await request.body()
    log.error(f"❌ Error de validación (422). Path: {request.url.path} | Method: {request.method}")
    log.error(f"Raw Body ({len(raw_body)} bytes): {raw_body!r}")
    log.error(f"Detalles: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body_len": len(raw_body)},
    )


# ── Modelos de request/response ───────────────────────────────────────────────
class AgentState(BaseModel):
    model_config = ConfigDict(extra="allow")
    # Identificación
    agent_id: str = Field(..., description="Alias del agente (ej. PeasantFamily_01)")
    day: int = Field(..., description="Día simulado interno")

    # Estado del agente (de PeasantFamilyBelieves y PeasantFamilyProfile)
    money: float = Field(0.0, description="Capital disponible en pesos")
    health: int = Field(100, description="Salud del agente [0-100]")
    emotional_state: str = Field("NEUTRAL", description="Estado emocional eBDI")
    has_loan: bool = Field(False, description="¿Tiene deuda bancaria activa?")
    loan_amount: float = Field(0.0, description="Monto total del préstamo a pagar")
    land_available: bool = Field(False, description="¿Hay tierra disponible para cultivar?")
    season: str = Field("NONE", description="Temporada actual (PLANTING/GROWING/HARVEST/NONE)")

    # Metas disponibles según el motor eBDI en este ciclo
    available_goals: list[str] = Field(
        default_factory=list,
        description="Lista de metas elegibles según detectGoal() > 0",
    )

    # ── Doble registro: resultado del motor numérico eBDI ──────────────────
    # Java envía el resultado del motor numérico ANTES de que el LLM influya
    numeric_winner_goal: str = Field(
        "", description="Meta elegida por el motor numérico eBDI (doble registro)"
    )
    numeric_winner_contribution: float = Field(
        0.0, description="Contribución máxima del motor numérico"
    )
    numeric_all_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Mapa completo {goal_name: contribution_score} del motor numérico",
    )

    # Control
    hybrid_mode: bool = Field(
        True,
        description="Modo híbrido: si True, solo activa LLM en ciclos de alta significancia",
    )
    include_state_snapshot: bool = Field(
        False,
        description="Si True, guarda el estado completo en el registro (para reproducibilidad)",
    )


class PulseResponse(BaseModel):
    mode: str                        # "llm" | "numeric"
    # Motor LLM
    llm_intention: str
    llm_justification: str
    llm_confidence: float
    ttft_ms: int
    total_ms: int
    llm_success: bool
    # Motor numérico (echo del input para confirmación)
    numeric_intention: str
    numeric_contribution: float
    # Análisis
    agreement: bool                  # ¿Coinciden LLM y numérico?
    llm_in_numeric_top3: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post("/pulse", response_model=PulseResponse)
async def bdi_pulse(state: AgentState) -> PulseResponse:
    """
    Ejecuta un ciclo del BDI Pulse con doble registro.

    1. Recibe el estado del agente Y el resultado del motor numérico (desde Java)
    2. Si el modo híbrido está activo, decide si el ciclo REQUIERE LLM
    3. En modo LLM: construye el prompt, llama a Gemma, parsea la respuesta
    4. En modo numérico: retorna sin llamar al LLM (latencia = 0)
    5. Registra AMBOS resultados en el JSONL
    """
    t0 = time.perf_counter()

    # ── Decidir si se activa el LLM ──────────────────────────────────────────
    needs_llm = not state.hybrid_mode or _requires_llm_reasoning(state)

    if not needs_llm:
        # Modo numérico: solo registrar y retornar
        await record_pulse(
            agent_id=state.agent_id,
            day=state.day,
            llm_intention=state.numeric_winner_goal,  # En modo numérico, LLM coincide con numérico
            llm_justification="[modo numérico – LLM no activado en este ciclo]",
            llm_confidence=state.numeric_winner_contribution,
            ttft_ms=0,
            total_ms=0,
            llm_success=True,
            numeric_winner_goal=state.numeric_winner_goal,
            numeric_winner_contribution=state.numeric_winner_contribution,
            numeric_all_scores=state.numeric_all_scores,
            mode="numeric",
            agent_state_snapshot=state.model_dump() if state.include_state_snapshot else None,
        )
        return PulseResponse(
            mode="numeric",
            llm_intention=state.numeric_winner_goal,
            llm_justification="[ciclo rutinario – motor numérico eBDI]",
            llm_confidence=state.numeric_winner_contribution,
            ttft_ms=0,
            total_ms=0,
            llm_success=True,
            numeric_intention=state.numeric_winner_goal,
            numeric_contribution=state.numeric_winner_contribution,
            agreement=True,
            llm_in_numeric_top3=True,
        )

    # ── Modo LLM: inferencia semántica ───────────────────────────────────────
    state_dict = state.model_dump()
    prompt = build_pulse_prompt(state_dict)

    llm_success = True
    ttft_ms = 0
    try:
        raw_response, ttft_ms = await call_llm(prompt)
        parsed = parse_llm_response(raw_response, state.available_goals)
        llm_success = not parsed.get("parse_error", False)
    except Exception as exc:
        log.warning(f"[{state.agent_id}] LLM falló en día {state.day}: {exc}")
        # Fallback graceful al motor numérico
        parsed = {
            "selected_intention": state.numeric_winner_goal,
            "justification": f"[Fallback al motor numérico: {str(exc)[:80]}]",
            "confidence": state.numeric_winner_contribution,
        }
        llm_success = False

    total_ms = int((time.perf_counter() - t0) * 1000)

    llm_intention = parsed["selected_intention"]
    llm_justification = parsed["justification"]
    llm_confidence = parsed.get("confidence", 0.5)

    # ── Análisis de divergencia ──────────────────────────────────────────────
    agreement = llm_intention == state.numeric_winner_goal
    sorted_numeric = sorted(
        state.numeric_all_scores.items(), key=lambda x: x[1], reverse=True
    )[:3]
    top3_goals = {g for g, _ in sorted_numeric}
    llm_in_top3 = llm_intention in top3_goals

    # ── Registrar doble track ────────────────────────────────────────────────
    await record_pulse(
        agent_id=state.agent_id,
        day=state.day,
        llm_intention=llm_intention,
        llm_justification=llm_justification,
        llm_confidence=llm_confidence,
        ttft_ms=ttft_ms,
        total_ms=total_ms,
        llm_success=llm_success,
        numeric_winner_goal=state.numeric_winner_goal,
        numeric_winner_contribution=state.numeric_winner_contribution,
        numeric_all_scores=state.numeric_all_scores,
        mode="llm",
        agent_state_snapshot=state_dict if state.include_state_snapshot else None,
    )

    log.info(
        f"[{state.agent_id}] día={state.day} | LLM={llm_intention} "
        f"(conf={llm_confidence:.2f}) | Num={state.numeric_winner_goal} | "
        f"agree={agreement} | TTFT={ttft_ms}ms | total={total_ms}ms"
    )

    return PulseResponse(
        mode="llm",
        llm_intention=llm_intention,
        llm_justification=llm_justification,
        llm_confidence=llm_confidence,
        ttft_ms=ttft_ms,
        total_ms=total_ms,
        llm_success=llm_success,
        numeric_intention=state.numeric_winner_goal,
        numeric_contribution=state.numeric_winner_contribution,
        agreement=agreement,
        llm_in_numeric_top3=llm_in_top3,
    )


@app.get("/metrics")
async def get_metrics():
    """Reporte agregado multi-sesión con comparativa LLM vs. numérico."""
    return JSONResponse(content=aggregate_all_sessions())


@app.get("/benchmark")
async def run_benchmark(n: int = 10):
    """
    Ejecuta N pulses sintéticos para validar latencia.
    Diseñado para replicar los tests del paper (Sección VI.A):
      - TTFT target: ~150 ms
      - Total target: ~900 ms
    """
    if n > 100:
        raise HTTPException(status_code=400, detail="Máximo 100 pulses por benchmark")

    log.info(f"🔬 Iniciando benchmark con {n} pulses sintéticos")

    # Estado de crisis sintético (para validar coherencia funcional)
    crisis_state = AgentState(
        agent_id="benchmark_agent",
        day=45,
        money=300_000,        # Por debajo del umbral → crisis
        health=25,            # Por debajo del umbral → crisis
        emotional_state="ANXIOUS",
        has_loan=True,
        loan_amount=500_000,
        land_available=True,
        season="PLANTING",
        available_goals=[
            "DoVitalsTask", "DoHealthCareTask", "PayDebtsTask",
            "PlantCropTask", "CheckCropsTask", "SpendFamilyTimeTask",
        ],
        numeric_winner_goal="DoVitalsTask",
        numeric_winner_contribution=0.97,
        numeric_all_scores={
            "DoVitalsTask": 0.97, "DoHealthCareTask": 0.85,
            "PayDebtsTask": 0.78, "PlantCropTask": 0.60,
            "CheckCropsTask": 0.45, "SpendFamilyTimeTask": 0.20,
        },
        hybrid_mode=False,   # Forzar LLM en todos los ciclos del benchmark
    )

    ttft_list = []
    total_list = []
    success_count = 0
    survival_count = 0
    SURVIVAL_GOALS = {"DoVitalsTask", "DoHealthCareTask", "PayDebtsTask"}

    for i in range(n):
        crisis_state.agent_id = f"benchmark_agent_{i:02d}"
        crisis_state.day = i + 1
        try:
            result = await bdi_pulse(crisis_state)
            if result.llm_success:
                success_count += 1
                ttft_list.append(result.ttft_ms)
                total_list.append(result.total_ms)
                if result.llm_intention in SURVIVAL_GOALS:
                    survival_count += 1
        except Exception as exc:
            log.warning(f"Benchmark pulse {i} falló: {exc}")

    def safe_mean(lst): return round(sum(lst) / len(lst), 1) if lst else None
    def safe_p90(lst):
        if not lst: return None
        s = sorted(lst)
        idx = int(0.9 * len(s))
        return round(s[min(idx, len(s)-1)], 1)

    return {
        "benchmark_n": n,
        "success_rate": round(success_count / n, 4) if n else 0,
        "latency": {
            "ttft_mean_ms": safe_mean(ttft_list),
            "ttft_p90_ms": safe_p90(ttft_list),
            "total_mean_ms": safe_mean(total_list),
            "total_p90_ms": safe_p90(total_list),
            "paper_targets": {"ttft_ms": 150, "total_ms": 900},
        },
        "coherence": {
            "survival_rate_in_crisis": round(survival_count / success_count, 4) if success_count else 0,
            "paper_target": ">= 0.95",
        },
    }


@app.get("/health")
async def health_check():
    """Health check del sidecar."""
    return {"status": "ok", "version": "1.0.0"}


# ── Helpers ───────────────────────────────────────────────────────────────────
def _requires_llm_reasoning(state: AgentState) -> bool:
    """
    Modo híbrido: decide si este ciclo del Pulse requiere razonamiento LLM.
    Activa el LLM cuando el estado del agente tiene cambios significativos.
    Objetivo: 20-30% de ciclos usan LLM (paper, Sección IV.C).
    """
    return (
        state.health < HYBRID_HEALTH_THRESHOLD        # Crisis de salud
        or state.money < HYBRID_MONEY_THRESHOLD       # Crisis económica
        or state.has_loan                              # Deuda activa
        or state.season == "PLANTING"                 # Decisión crítica de siembra
        or state.season == "HARVEST"                  # Decisión crítica de cosecha
    )
