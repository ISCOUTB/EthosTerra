"""NarrativeAgent — genera narrativas en español usando OllamaLLMBroker.

Recibe ContextData, formatea el prompt con las variables del episodio,
envía la solicitud al OllamaLLMBroker y reenvía la respuesta al QualityGuardAgent.
"""
from __future__ import annotations

import queue
from dataclasses import dataclass, field
from pathlib import Path

from besa.kernel.agent import AgentBESA
from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.llm.llm_client import LLMRequest, LLMResponse

from experiments.explainability.events.context_event import ContextData
from experiments.explainability.events.narrative_event import NarrativeData
from experiments.explainability.ollama_broker import OllamaLLMBroker

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "explainability_v1.md"


@dataclass
class NarrativeState:
    pending: int = 0
    completed: int = 0
    broker: OllamaLLMBroker | None = None
    tick: int = 0
    context_queue: queue.Queue = field(default_factory=queue.Queue)


class ReceiveContextGuard(GuardBESA):
    """Recibe ContextData y envía solicitud al broker Ollama."""

    def func_exec_guard(self, event: EventBESA) -> None:
        ctx: ContextData = event.data
        agent: NarrativeAgent = self._agent  # type: ignore[assignment]
        state: NarrativeState = self.get_state()

        template = _load_prompt_template()
        try:
            filled_prompt = template.format_map(ctx.prompt_vars)
        except KeyError as exc:
            # Sustituir claves faltantes con cadena vacía
            import string
            filled_prompt = template.format_map(_SafeDict(ctx.prompt_vars))

        state.pending += 1
        state.tick += 1
        state.context_queue.put(ctx)  # FIFO: el broker procesa de forma secuencial

        req = LLMRequest(
            template=filled_prompt,
            context={},
            callback_agent=agent.alias,
            callback_guard=NarrativeResponseGuard,
            tick=state.tick,
            agent_alias=agent.alias,
        )
        if state.broker is not None:
            state.broker.submit_request(req)


class NarrativeResponseGuard(GuardBESA):
    """Recibe LLMResponse del broker y reenvía al QualityGuardAgent."""

    def func_exec_guard(self, event: EventBESA) -> None:
        resp: LLMResponse = event.data
        agent: NarrativeAgent = self._agent  # type: ignore[assignment]
        state: NarrativeState = self.get_state()
        state.completed += 1

        try:
            ctx: ContextData = state.context_queue.get_nowait()
        except queue.Empty:
            print("[NarrativeAgent] Advertencia: respuesta sin contexto en cola")
            return

        narrative_text = (resp.narrative or resp.text or "").strip()
        nd = NarrativeData(
            context=ctx,
            raw_text=resp.text,
            narrative=narrative_text,
        )
        agent.send(
            "QualityGuardAgent",
            EventBESA(guard_type=ReceiveNarrativeGuard, data=nd),
        )


class ReceiveNarrativeGuard(GuardBESA):
    """Guard dummy — lo registra QualityGuardAgent."""

    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class NarrativeAgent(AgentBESA):
    def __init__(
        self,
        alias: str = "NarrativeAgent",
        ollama_url: str = "http://localhost:11434",
        model: str = "gemma3:4b",
    ):
        state = NarrativeState()
        super().__init__(alias=alias, state=state)
        self.register_guard(ReceiveContextGuard)
        self.register_guard(NarrativeResponseGuard)
        self.register_guard(ReceiveNarrativeGuard)

        broker = OllamaLLMBroker(ollama_url=ollama_url, model=model)
        broker.start()
        state.broker = broker


def _load_prompt_template() -> str:
    if PROMPT_PATH.exists():
        return PROMPT_PATH.read_text(encoding="utf-8")
    return _DEFAULT_PROMPT


class _SafeDict(dict):
    def __missing__(self, key):
        return f"{{{key}}}"


_DEFAULT_PROMPT = """\
Eres un asistente que explica decisiones de familias campesinas colombianas en una simulación BDI.

## Situación del Agente
Agente: {agent_alias} | Tratamiento: {treatment_id} | Fecha: {current_date}
Capital: {money} | Salud: {health} | Emoción: {emotion}
Meta activa: {goal_display_name} | Nivel: {pyramid_level_human}

## Condición que disparó la decisión
{activation_when_human}

## Historial de los últimos días
{historical_narrative}

## Efectos esperados
{effects_human}

Escribe 2-3 párrafos en español claro para un técnico de extensión rural colombiano.
Explica: (1) por qué la familia tomó esta decisión, (2) qué variables la dispararon,
(3) qué se espera que ocurra. Usa lenguaje campesino, sin jerga de inteligencia artificial.

Narrativa:
"""
