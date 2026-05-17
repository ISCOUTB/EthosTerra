"""QualityGuardAgent — valida la calidad de las narrativas generadas.

Recibe NarrativeData, envía un segundo prompt de validación al LLM,
parsea el JSON de respuesta y construye ValidatedNarrativeData.
"""
from __future__ import annotations

import json
import queue
import re
from dataclasses import dataclass, field
from pathlib import Path

from besa.kernel.agent import AgentBESA
from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.llm.llm_client import LLMRequest, LLMResponse

from experiments.explainability.events.narrative_event import NarrativeData, ValidatedNarrativeData
from experiments.explainability.ollama_broker import OllamaLLMBroker

QUALITY_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "quality_check_v1.md"

_DEFAULT_QUALITY_PROMPT = """\
Eres un evaluador de calidad de narrativas explicativas en simulaciones BDI.

## Narrativa a evaluar
{narrative}

## Contexto real del episodio
- Tipo de episodio: {episode_type}
- Condición activadora: {activation_when_human}
- Variables disparadoras reales: dinero={money}, salud={health}, emoción={emotion}
- Meta ejecutada: {goal_display_name}

## Tarea
Evalúa la narrativa en tres dimensiones. Responde SOLO con JSON válido, sin texto adicional:

{{
  "variable_id": <0.0-1.0>,      // ¿Menciona correctamente las variables que dispararon la decisión?
  "comprehensibility": <0.0-1.0>, // ¿El lenguaje es comprensible para un técnico rural?
  "faithfulness": <0.0-1.0>,      // ¿Es fiel al estado real del agente?
  "justification": "<texto breve>"
}}
"""


@dataclass
class QualityState:
    processed: int = 0
    broker: OllamaLLMBroker | None = None
    tick: int = 0
    narrative_queue: queue.Queue = field(default_factory=queue.Queue)


class ReceiveNarrativeGuard(GuardBESA):
    """Recibe NarrativeData y solicita evaluación de calidad al LLM."""

    def func_exec_guard(self, event: EventBESA) -> None:
        nd: NarrativeData = event.data
        agent: QualityGuardAgent = self._agent  # type: ignore[assignment]
        state: QualityState = self.get_state()
        state.narrative_queue.put(nd)
        state.tick += 1

        template = _load_quality_prompt()
        vars_ = {
            "narrative": nd.narrative[:1000],
            "episode_type": nd.context.episode.episode_type,
            "activation_when_human": nd.context.activation_when_human,
            "money": nd.context.prompt_vars.get("money", "-"),
            "health": nd.context.prompt_vars.get("health", "-"),
            "emotion": nd.context.prompt_vars.get("emotion", "-"),
            "goal_display_name": nd.context.goal_display_name,
        }
        try:
            filled = template.format_map(vars_)
        except KeyError:
            filled = template.format_map(_SafeDict(vars_))

        req = LLMRequest(
            template=filled,
            context=vars_,
            callback_agent=agent.alias,
            callback_guard=QualityResponseGuard,
            tick=state.tick,
            agent_alias=agent.alias,
        )
        if state.broker is not None:
            state.broker.submit_request(req)
        else:
            agent._dispatch_validated(nd, 0.5, 0.5, 0.5, "{}")


class QualityResponseGuard(GuardBESA):
    """Recibe respuesta del LLM, parsea JSON de calidad y reenvía al aggregator."""

    def func_exec_guard(self, event: EventBESA) -> None:
        resp: LLMResponse = event.data
        agent: QualityGuardAgent = self._agent  # type: ignore[assignment]
        state: QualityState = self.get_state()
        try:
            nd = state.narrative_queue.get_nowait()
        except queue.Empty:
            print("[QualityGuard] Advertencia: respuesta sin narrativa en cola")
            return
        state.processed += 1

        scores = _parse_quality_json(resp.text)
        agent._dispatch_validated(
            nd,
            scores.get("variable_id", 0.5),
            scores.get("comprehensibility", 0.5),
            scores.get("faithfulness", 0.5),
            resp.text,
        )


class ReceiveValidatedGuard(GuardBESA):
    """Guard dummy — lo registra ReportAggregatorAgent."""

    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class QualityGuardAgent(AgentBESA):
    def __init__(
        self,
        alias: str = "QualityGuardAgent",
        ollama_url: str = "http://localhost:11434",
        model: str = "gemma3:4b",
    ):
        state = QualityState()
        super().__init__(alias=alias, state=state)
        self.register_guard(ReceiveNarrativeGuard)
        self.register_guard(QualityResponseGuard)
        self.register_guard(ReceiveValidatedGuard)

        broker = OllamaLLMBroker(ollama_url=ollama_url, model=model, num_predict=256)
        broker.start()
        state.broker = broker

    def _dispatch_validated(
        self,
        nd: NarrativeData,
        vid: float,
        comp: float,
        faith: float,
        raw: str,
    ) -> None:
        vnd = ValidatedNarrativeData(
            narrative_data=nd,
            variable_id_score=vid,
            comprehensibility_score=comp,
            faithfulness_score=faith,
            quality_raw=raw,
        )
        self.send(
            "ReportAggregatorAgent",
            EventBESA(guard_type=ReceiveValidatedGuard, data=vnd),
        )


def _parse_quality_json(text: str) -> dict:
    match = re.search(r"\{.*?\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {"variable_id": 0.5, "comprehensibility": 0.5, "faithfulness": 0.5}


def _load_quality_prompt() -> str:
    if QUALITY_PROMPT_PATH.exists():
        return QUALITY_PROMPT_PATH.read_text(encoding="utf-8")
    return _DEFAULT_QUALITY_PROMPT


class _SafeDict(dict):
    def __missing__(self, key):
        return f"{{{key}}}"
