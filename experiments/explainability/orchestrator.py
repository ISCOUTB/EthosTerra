#!/usr/bin/env python3
"""Orquestador principal del Experimento de Explicabilidad Natural (20CCC).

Uso:
  PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \\
    python experiments/explainability/orchestrator.py [opciones]

Opciones:
  --treatment ID    Solo procesar un tratamiento (ej: E401)
  --all             Procesar los 27 tratamientos del E5
  --max-episodes N  Máximo de episodios por tratamiento (0 = sin límite)
  --no-quality      Omitir la validación de calidad LLM (más rápido)
  --ollama-url URL  URL base de Ollama (default: http://localhost:11434)
  --model MODEL     Modelo Ollama (default: gemma3:4b)
"""
from __future__ import annotations

import argparse
import sys
import threading
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "besa-python"))
sys.path.insert(0, str(PROJECT_ROOT / "ethosterra-python"))

import os
os.environ.setdefault("ETHOSTERRA_ROOT", str(PROJECT_ROOT))

from besa.kernel.event import EventBESA
from besa.local.local_adm import LocalAdmBESA
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.bdi.declarative.plan_registry import PlanRegistry

from experiments.explainability.taguchi_l27 import TAGUCHI_L27, TREATMENT_BY_ID, get_available_treatments
from experiments.explainability.agents.episode_extractor import (
    EpisodeExtractorAgent, StartExtractionGuard, ExtractionDoneGuard,
)
from experiments.explainability.agents.context_builder import ContextBuilderAgent
from experiments.explainability.agents.narrative_agent import NarrativeAgent
from experiments.explainability.agents.quality_guard import QualityGuardAgent
from experiments.explainability.agents.report_aggregator import (
    ReportAggregatorAgent, ExtractionDoneGuard as AggExtractionDoneGuard, ReportDoneGuard,
)
from experiments.explainability.events.episode_event import StartExtractionData


class OrchestratorDoneGuard:
    """Guard dummy para la señal de fin — usado internamente."""
    def func_exec_guard(self, event): pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Explainability Experiment — EthosTerra / 20CCC")
    parser.add_argument("--treatment", type=str, default="", help="Tratamiento único (ej: E401)")
    parser.add_argument("--all", action="store_true", help="Procesar todos los 27 tratamientos")
    parser.add_argument("--max-episodes", type=int, default=0, help="Máx episodios por tratamiento (0=sin límite)")
    parser.add_argument("--no-quality", action="store_true", help="Omitir validación LLM de calidad")
    parser.add_argument("--ollama-url", type=str, default="http://localhost:11434")
    parser.add_argument("--model", type=str, default="gemma3:4b")
    args = parser.parse_args()

    if not args.treatment and not args.all:
        parser.print_help()
        print("\nError: especifica --treatment ID o --all")
        sys.exit(1)

    # Seleccionar tratamientos
    if args.all:
        treatments = get_available_treatments()
        if not treatments:
            print("No se encontraron CSVs en data/experiments/E5/. Ejecuta primero experimento5.py")
            sys.exit(1)
    elif args.treatment:
        t = TREATMENT_BY_ID.get(args.treatment.upper())
        if t is None:
            print(f"Tratamiento desconocido: {args.treatment}")
            sys.exit(1)
        if not t["csv_exists"]:
            print(f"CSV no encontrado para {args.treatment}: {t['csv_path']}")
            sys.exit(1)
        treatments = [t]
    else:
        treatments = []

    print(f"\n{'='*70}")
    print(f"  EthosTerra — Experimento de Explicabilidad Natural (20CCC)")
    print(f"  Tratamientos: {len(treatments)} | Modelo: {args.model}")
    print(f"  Ollama: {args.ollama_url}")
    print(f"{'='*70}\n")

    # Cargar registros YAML una sola vez
    print("Cargando GoalRegistry y PlanRegistry...")
    GoalRegistry.get_instance()
    PlanRegistry.get_instance()
    print(f"  Goals: {GoalRegistry.get_instance().size()} | Plans: {PlanRegistry.get_instance().size()}")

    # Evento de finalización
    done_event = threading.Event()
    done_reports: list[str] = []

    # Crear container BESA
    adm = LocalAdmBESA(alias="explainability")

    # Crear agentes
    extractor = EpisodeExtractorAgent(alias="EpisodeExtractorAgent")
    builder = ContextBuilderAgent(alias="ContextBuilderAgent")
    narrator = NarrativeAgent(alias="NarrativeAgent", ollama_url=args.ollama_url, model=args.model)
    quality = QualityGuardAgent(alias="QualityGuardAgent", ollama_url=args.ollama_url, model=args.model)
    reporter = ReportAggregatorAgent(alias="ReportAggregatorAgent", total_treatments=len(treatments))

    # Agente orchestrator simple para recibir señales
    class OrchestratorAgent(EpisodeExtractorAgent):
        """Recibe señales de fin y libera el evento de espera."""
        def __init__(self):
            from besa.kernel.agent import AgentBESA
            from besa.kernel.struct import StructBESA
            from besa.kernel.mbox import MBoxBESA
            from besa.kernel.rng import AgentRNG
            AgentBESA.__init__(self, alias="Orchestrator")
            self.register_guard(ExtractionDoneGuard)
            self.register_guard(ReportDoneGuard)

        def _route_event(self, event):
            from besa.kernel.guard_error_handler import GuardErrorHandler
            from besa.kernel.struct import StructBESA
            guard_type = self._struct.get_guard(event)
            if guard_type is None:
                return
            if guard_type.__name__ == "ReportDoneGuard":
                from experiments.explainability.agents.report_aggregator import ReportDoneData
                rd: ReportDoneData = event.data
                done_reports.extend(rd.reports)
                print(f"\n✅ Pipeline completo: {rd.total_narratives} narrativas generadas")
                for r in rd.reports:
                    print(f"   → {r}")
                done_event.set()
            # ExtractionDone se reenvía también al aggregator
            elif guard_type.__name__ == "ExtractionDoneGuard":
                reporter.send_to(EventBESA(guard_type=AggExtractionDoneGuard, data=event.data))

    orchestrator = OrchestratorAgent()

    # Registrar todos los agentes
    for agent in [extractor, builder, narrator, quality, reporter, orchestrator]:
        adm.register_agent(agent)

    adm.start_all()
    time.sleep(0.2)  # dar tiempo a que los hilos arranquen

    # Disparar extracciones via adm.send() para no sobreescribir el sender
    print(f"Iniciando extracción de episodios para {len(treatments)} tratamiento(s)...\n")
    for t in treatments:
        adm.send(
            EventBESA(
                guard_type=StartExtractionGuard,
                data=StartExtractionData(
                    treatment_id=t["id"],
                    csv_path=t["csv_path"],
                    max_episodes=args.max_episodes,
                ),
                sender="Orchestrator",
                target="EpisodeExtractorAgent",
            )
        )

    # Esperar a que termine el pipeline (máx 10 minutos por tratamiento)
    timeout = len(treatments) * 600
    print(f"Esperando pipeline (timeout: {timeout}s)...")
    finished = done_event.wait(timeout=timeout)

    adm.shutdown(timeout=10)

    if not finished:
        print("⚠️  Timeout — el pipeline no completó en el tiempo esperado.")
        print("   Revisa si Ollama está activo: curl http://localhost:11434/api/tags")
        sys.exit(1)

    print(f"\nReportes disponibles en: {PROJECT_ROOT / 'reports' / 'explainability'}")


if __name__ == "__main__":
    main()
