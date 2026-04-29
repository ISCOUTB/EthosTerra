/**
 * ==========================================================================
 * WPSnext – Integración LLM en el BDI Pulse de WellProdSim
 * ==========================================================================
 * DTO (Data Transfer Object) para serializar el estado del agente
 * PeasantFamily y enviarlo al sidecar Python (wpsllm-sidecar).
 *
 * Incluye tanto los campos de estado necsarios para el prompt del LLM
 * como el resultado del motor numérico eBDI para el doble registro.
 * ==========================================================================
 */
package org.wpsim.PeasantFamily.LLM;

import org.json.JSONObject;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Data.PeasantFamilyProfile;

import java.util.List;
import java.util.Map;

/**
 * DTO que encapsula el estado del agente PeasantFamily para el BDI Pulse LLM.
 * Serializable a JSON para envío al sidecar Python.
 *
 * @author WPSnext
 */
public class LLMPulseData {

    // ── Identificación ───────────────────────────────────────────────────────
    private final String agentId;
    private final int day;

    // ── Estado del agente ────────────────────────────────────────────────────
    private final double money;
    private final int health;
    private final String emotionalState;
    private final boolean hasLoan;
    private final double loanAmount;
    private final boolean landAvailable;
    private final String season;

    // ── Metas disponibles (detectGoal() > 0 en este ciclo) ──────────────────
    private final List<String> availableGoals;

    // ── Doble registro: resultado del motor numérico eBDI ───────────────────
    // Java calcula el resultado numérico ANTES de llamar al LLM.
    // Esto permite comparar empíricamente ambos motores.
    private String numericWinnerGoal = "";
    private double numericWinnerContribution = 0.0;
    private Map<String, Double> numericAllScores = Map.of();

    // ── Control ──────────────────────────────────────────────────────────────
    private final boolean hybridMode;
    private final boolean includeStateSnapshot;

    /**
     * Constructor principal a partir del estado del agente.
     *
     * @param believes        estado completo del agente eBDI
     * @param availableGoals  lista de metas elegibles en este ciclo
     * @param hybridMode      si true, el sidecar decide si activar el LLM
     */
    public LLMPulseData(
            PeasantFamilyBelieves believes,
            List<String> availableGoals,
            boolean hybridMode
    ) {
        PeasantFamilyProfile profile = believes.getPeasantProfile();

        this.agentId = believes.getAlias();
        this.day = believes.getCurrentDay();
        this.money = profile.getMoney();
        this.health = profile.getHealth();
        this.emotionalState = extractEmotionalState(believes);
        this.hasLoan = believes.isHaveLoan();
        this.loanAmount = profile.getLoanAmountToPay();
        this.landAvailable = believes.isLandAvailable();
        this.season = extractSeason(believes);
        this.availableGoals = availableGoals;
        this.hybridMode = hybridMode;
        this.includeStateSnapshot = false;
    }

    /**
     * Establece el resultado del motor numérico eBDI (doble registro).
     * Debe llamarse ANTES de enviar al sidecar.
     *
     * @param winnerGoal        meta ganadora del motor numérico
     * @param winnerContribution contribución de la meta ganadora
     * @param allScores         mapa completo {meta: contribución}
     */
    public void setNumericResult(
            String winnerGoal,
            double winnerContribution,
            Map<String, Double> allScores
    ) {
        this.numericWinnerGoal = winnerGoal;
        this.numericWinnerContribution = winnerContribution;
        this.numericAllScores = allScores;
    }

    /**
     * Serializa el DTO a JSON para envío al sidecar Python.
     *
     * @return JSON string compatible con AgentState de main.py
     */
    public String toJson() {
        JSONObject root = new JSONObject();

        // Identificación
        root.put("agent_id", agentId);
        root.put("day", day);

        // Estado
        root.put("money", money);
        root.put("health", health);
        root.put("emotional_state", emotionalState);
        root.put("has_loan", hasLoan);
        root.put("loan_amount", loanAmount);
        root.put("land_available", landAvailable);
        root.put("season", season);

        // Metas disponibles
        root.put("available_goals", availableGoals);

        // Doble registro numérico
        root.put("numeric_winner_goal", numericWinnerGoal);
        root.put("numeric_winner_contribution", numericWinnerContribution);
        JSONObject scores = new JSONObject();
        numericAllScores.forEach(scores::put);
        root.put("numeric_all_scores", scores);

        // Control
        root.put("hybrid_mode", hybridMode);
        root.put("include_state_snapshot", includeStateSnapshot);

        return root.toString();
    }

    // ── Helpers de extracción de estado ─────────────────────────────────────

    /**
     * Extrae el estado emocional dominante del eBDI en formato string.
     */
    private static String extractEmotionalState(PeasantFamilyBelieves believes) {
        try {
            // El eBDI usa EmotionAxis con valores 0-1
            // Extraemos solo si tiene emociones activas
            if (!believes.isHaveEmotions()) {
                return "NEUTRAL";
            }
            var emotions = believes.getEmotionsListCopy();
            if (emotions == null || emotions.isEmpty()) {
                return "NEUTRAL";
            }
            // Encontrar la emoción con mayor valor absoluto
            return emotions.stream()
                    .max(java.util.Comparator.comparingDouble(e -> Math.abs(e.getCurrentValue())))
                    .map(e -> e.toString().toUpperCase())
                    .orElse("NEUTRAL");
        } catch (Exception e) {
            return "NEUTRAL";
        }
    }

    /**
     * Extrae la temporada actual del primer terreno asignado.
     */
    private static String extractSeason(PeasantFamilyBelieves believes) {
        try {
            var lands = believes.getAssignedLands();
            if (lands == null || lands.isEmpty()) {
                return "NONE";
            }
            var season = lands.get(0).getCurrentSeason();
            return season != null ? season.name() : "NONE";
        } catch (Exception e) {
            return "NONE";
        }
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    public String getAgentId() { return agentId; }
    public int getDay() { return day; }
    public String getNumericWinnerGoal() { return numericWinnerGoal; }
    public double getNumericWinnerContribution() { return numericWinnerContribution; }
}
