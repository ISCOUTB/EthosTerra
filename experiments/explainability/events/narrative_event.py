from __future__ import annotations

from dataclasses import dataclass, field

from experiments.explainability.events.context_event import ContextData


@dataclass(slots=True)
class NarrativeData:
    context: ContextData
    raw_text: str               # texto completo devuelto por Ollama
    narrative: str              # texto limpio (sin artefactos del modelo)


@dataclass(slots=True)
class ValidatedNarrativeData:
    narrative_data: NarrativeData
    variable_id_score: float    # 0-1: ¿identifica las variables correctas?
    comprehensibility_score: float  # 0-1: ¿lenguaje comprensible?
    faithfulness_score: float   # 0-1: ¿fiel al estado real del agente?
    quality_raw: str            # respuesta JSON cruda del validador
