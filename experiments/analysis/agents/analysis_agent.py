"""AnalysisAgent — contenedor de estado para el pipeline ReAct de análisis."""
from __future__ import annotations

from experiments.analysis.state import AnalysisState, TreatmentResult
from experiments.analysis.react_loop import ReActLoop


class AnalysisAgent:
    """Coordinador del pipeline de análisis. No usa el event loop de BESA.

    Se usa de forma síncrona (no se llama a .start()). Actúa como fachada
    que mantiene el AnalysisState y delega en ReActLoop por tratamiento.
    """

    def __init__(self, state: AnalysisState):
        self.state = state

    def run_treatment(
        self,
        treatment_id: str,
        params: dict,
        loop: ReActLoop,
    ) -> TreatmentResult:
        print(f"\n{'='*60}")
        print(f"  Procesando {treatment_id} | params: {params}")
        print(f"{'='*60}")
        return loop.run_treatment(self.state, treatment_id, params)
