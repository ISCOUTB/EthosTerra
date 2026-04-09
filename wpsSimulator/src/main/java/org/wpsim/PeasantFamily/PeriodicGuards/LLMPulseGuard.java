/**
 * ==========================================================================
 * WPSnext – Integración LLM en el BDI Pulse de WellProdSim
 * ==========================================================================
 * Guard de BESA que implementa el BDI Pulse con motor LLM + doble registro.
 *
 * ARQUITECTURA DEL DOBLE REGISTRO:
 *   1. El motor numérico eBDI original calcula sus puntajes de contribución
 *      (evaluateContribution() de cada GoalBDI activo).
 *   2. LLMPulseGuard captura ese resultado ANTES del InformationFlowGuard.
 *   3. Envía estado + resultado numérico al sidecar Python.
 *   4. El sidecar devuelve la intención LLM con su justificación.
 *   5. Se guarda el registro dual en output/metrics/*.jsonl.
 *   6. La meta LLM seleccionada se almacena en PeasantFamilyBelieves
 *      para influir en el próximo ciclo de evaluateContribution().
 *
 * MODO HÍBRIDO (20-30% de ciclos usan LLM):
 *   - El sidecar decide si activar el LLM según umbrales de estado.
 *   - En ciclos rutinarios, se registra el resultado numérico y no se llama al LLM.
 * ==========================================================================
 */
package org.wpsim.PeasantFamily.PeriodicGuards;

import BESA.BDI.AgentStructuralModel.GoalBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.GuardBESA;
import org.wpsim.PeasantFamily.Agent.PeasantFamily;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.LLM.LLMPulseClient;
import org.wpsim.PeasantFamily.LLM.LLMPulseData;
import org.wpsim.PeasantFamily.LLM.LLMPulseResponse;
import org.wpsim.ViewerLens.Util.wpsReport;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Guard que implementa el BDI Pulse con motor LLM y doble registro.
 * Se dispara una vez por día simulado (controlado por isNewDay()).
 *
 * @author WPSnext
 */
public class LLMPulseGuard extends GuardBESA {

    @Override
    public void funcExecGuard(EventBESA event) {
        PeasantFamily peasantFamily = (PeasantFamily) this.getAgent();
        StateBDI stateBDI = (StateBDI) peasantFamily.getState();
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) stateBDI.getBelieves();

        // Solo ejecutar una vez por día simulado
        if (!believes.isNewDay()) {
            return;
        }

        // ── Paso 1: Capturar el resultado del motor numérico eBDI ─────────────
        // Evaluamos los puntajes de contribución de todas las metas activas
        // ANTES de que el sidecar LLM influya en el ciclo.
        Map<String, Double> numericScores = computeNumericScores(stateBDI);

        // Identificar la meta ganadora según el motor numérico
        String numericWinner = "";
        double numericMaxScore = -1.0;
        for (Map.Entry<String, Double> entry : numericScores.entrySet()) {
            if (entry.getValue() > numericMaxScore) {
                numericMaxScore = entry.getValue();
                numericWinner = entry.getKey();
            }
        }

        // Almacenar resultado numérico en el estado del agente (para el CSV/log)
        believes.setNumericWinnerGoal(numericWinner);
        believes.setNumericWinnerContribution(numericMaxScore);
        believes.setNumericAllScores(numericScores);

        // ── Paso 2: Preparar el DTO para el sidecar ──────────────────────────
        List<String> availableGoals = new ArrayList<>(numericScores.keySet());

        LLMPulseData pulseData = new LLMPulseData(
                believes,
                availableGoals,
                true    // hybridMode: el sidecar decide si activar el LLM
        );

        // Inyectar el resultado del motor numérico en el DTO (doble registro)
        pulseData.setNumericResult(numericWinner, numericMaxScore, numericScores);

        // ── Paso 3: Llamar al sidecar LLM ────────────────────────────────────
        LLMPulseResponse response = LLMPulseClient.callPulse(pulseData);

        // ── Paso 4: Almacenar el resultado LLM en las creencias del agente ────
        believes.setLlmIntention(response.getLlmIntention());
        believes.setLlmJustification(response.getLlmJustification());
        believes.setLlmConfidence(response.getLlmConfidence());
        believes.setLlmActive(response.isLLMMode() && response.isLlmSuccess());
        believes.setLastLlmTtftMs(response.getTtftMs());
        believes.setLastLlmTotalMs(response.getTotalMs());

        // ── Paso 5: Log del resultado ─────────────────────────────────────────
        if (response.isLLMMode()) {
            wpsReport.info(
                    String.format(
                            "[LLM Pulse] día=%d | LLM: %s (conf=%.2f) | Numérico: %s | " +
                            "Acuerdo: %b | TTFT=%dms | Total=%dms | justif: %s",
                            believes.getCurrentDay(),
                            response.getLlmIntention(),
                            response.getLlmConfidence(),
                            response.getNumericIntention(),
                            response.isAgreement(),
                            response.getTtftMs(),
                            response.getTotalMs(),
                            response.getLlmJustification()
                    ),
                    believes.getAlias()
            );
        }
    }

    /**
     * Calcula los puntajes de contribución del motor numérico eBDI
     * para todas las metas activas en el ciclo actual.
     *
     * Este método "espía" el motor numérico sin modificarlo,
     * capturando el rastro del resultado original.
     *
     * @param stateBDI estado del agente BDI
     * @return mapa {nombre_meta: contribución} del motor numérico
     */
    @SuppressWarnings("unchecked")
    private Map<String, Double> computeNumericScores(StateBDI stateBDI) {
        Map<String, Double> scores = new HashMap<>();

        try {
            // Obtenemos todas las metas registradas en la pirámide BDI (DesireHierarchyPyramid)
            var goals = stateBDI.getMachineBDIParams().getPyramidGoals();
            if (goals == null) return scores;

            // Iteramos sobre cada nivel de la pirámide (List de SortedSets)
            for (java.util.Set<GoalBDI> set : goals.getGeneralHerarchyList()) {
                if (set == null || set.isEmpty()) continue;
                
                for (GoalBDI goal : set) {
                    if (goal == null) continue;

                    String goalName = goal.getDescription();
                    // Simplificar el nombre de la meta
                    if (goalName == null || goalName.isBlank()) {
                        goalName = goal.getClass().getSimpleName();
                    }

                    try {
                        double detectScore = goal.detectGoal(stateBDI.getBelieves());
                        if (detectScore > 0) {
                            // La meta es elegible: calculamos su contribución numérica
                            double contribution = goal.evaluateContribution(stateBDI);
                            scores.put(goalName, contribution);
                        }
                    } catch (Exception e) {
                        // Ignorar metas que fallen en la evaluación
                    }
                }
            }
        } catch (Exception e) {
            wpsReport.warn("Error al calcular puntajes numéricos del BDI: " + e.getMessage(),
                    "LLMPulseGuard");
        }

        return scores;
    }
}
