/**
 * ==========================================================================
 * WPSnext – Integración LLM en el BDI Pulse de WellProdSim
 * ==========================================================================
 * Respuesta del sidecar Python al BDI Pulse LLM.
 * Encapsula tanto el resultado del motor LLM como la confirmación del
 * motor numérico y el análisis de divergencia.
 * ==========================================================================
 */
package org.wpsim.PeasantFamily.LLM;

import org.json.JSONObject;

/**
 * Resultado del BDI Pulse LLM devuelto por el sidecar Python.
 * Contiene el doble registro: intención LLM + intención numérica.
 *
 * @author WPSnext
 */
public class LLMPulseResponse {

    // ── Motor LLM ────────────────────────────────────────────────────────────
    private final String mode;              // "llm" | "numeric"
    private final String llmIntention;      // Meta seleccionada por el LLM
    private final String llmJustification;  // Justificación en lenguaje natural
    private final double llmConfidence;     // Confianza del LLM [0.0, 1.0]
    private final int ttftMs;              // Time-to-first-token (ms)
    private final int totalMs;             // Latencia total (ms)
    private final boolean llmSuccess;      // True si el JSON fue parseable

    // ── Motor Numérico (doble registro) ──────────────────────────────────────
    private final String numericIntention;
    private final double numericContribution;

    // ── Análisis de divergencia ───────────────────────────────────────────────
    private final boolean agreement;           // ¿LLM y numérico eligieron lo mismo?
    private final boolean llmInNumericTop3;    // ¿Elección LLM en top-3 numérico?

    private LLMPulseResponse(Builder builder) {
        this.mode = builder.mode;
        this.llmIntention = builder.llmIntention;
        this.llmJustification = builder.llmJustification;
        this.llmConfidence = builder.llmConfidence;
        this.ttftMs = builder.ttftMs;
        this.totalMs = builder.totalMs;
        this.llmSuccess = builder.llmSuccess;
        this.numericIntention = builder.numericIntention;
        this.numericContribution = builder.numericContribution;
        this.agreement = builder.agreement;
        this.llmInNumericTop3 = builder.llmInNumericTop3;
    }

    /**
     * Parsea la respuesta JSON del sidecar Python.
     *
     * @param jsonBody cuerpo de la respuesta HTTP del sidecar
     * @return LLMPulseResponse parseado
     * @throws RuntimeException si el JSON es inválido
     */
    public static LLMPulseResponse fromJson(String jsonBody) {
        try {
            JSONObject obj = new JSONObject(jsonBody);
            return new Builder()
                    .mode(obj.optString("mode", "numeric"))
                    .llmIntention(obj.optString("llm_intention", ""))
                    .llmJustification(obj.optString("llm_justification", ""))
                    .llmConfidence(obj.optDouble("llm_confidence", 0.0))
                    .ttftMs(obj.optInt("ttft_ms", 0))
                    .totalMs(obj.optInt("total_ms", 0))
                    .llmSuccess(obj.optBoolean("llm_success", false))
                    .numericIntention(obj.optString("numeric_intention", ""))
                    .numericContribution(obj.optDouble("numeric_contribution", 0.0))
                    .agreement(obj.optBoolean("agreement", false))
                    .llmInNumericTop3(obj.optBoolean("llm_in_numeric_top3", false))
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Error parseando respuesta del sidecar LLM: " + e.getMessage(), e);
        }
    }

    /**
     * Crea una respuesta de fallback cuando el sidecar no está disponible.
     * En este caso, se usa el resultado del motor numérico eBDI.
     *
     * @param numericGoal resultado del motor numérico
     * @param numericScore contribución del motor numérico
     * @return respuesta fallback
     */
    public static LLMPulseResponse numericFallback(String numericGoal, double numericScore) {
        return new Builder()
                .mode("numeric")
                .llmIntention(numericGoal)
                .llmJustification("[Sidecar LLM no disponible – usando motor numérico eBDI]")
                .llmConfidence(numericScore)
                .ttftMs(0)
                .totalMs(0)
                .llmSuccess(false)
                .numericIntention(numericGoal)
                .numericContribution(numericScore)
                .agreement(true)
                .llmInNumericTop3(true)
                .build();
    }

    public boolean isLLMMode() { return "llm".equals(mode); }
    public String getMode() { return mode; }
    public String getLlmIntention() { return llmIntention; }
    public String getLlmJustification() { return llmJustification; }
    public double getLlmConfidence() { return llmConfidence; }
    public int getTtftMs() { return ttftMs; }
    public int getTotalMs() { return totalMs; }
    public boolean isLlmSuccess() { return llmSuccess; }
    public String getNumericIntention() { return numericIntention; }
    public double getNumericContribution() { return numericContribution; }
    public boolean isAgreement() { return agreement; }
    public boolean isLlmInNumericTop3() { return llmInNumericTop3; }

    @Override
    public String toString() {
        return String.format(
                "LLMPulseResponse{mode=%s, llm=%s(%.2f), numeric=%s, agree=%b, TTFT=%dms, total=%dms}",
                mode, llmIntention, llmConfidence, numericIntention, agreement, ttftMs, totalMs
        );
    }

    // ── Builder ───────────────────────────────────────────────────────────────
    public static class Builder {
        private String mode = "numeric";
        private String llmIntention = "";
        private String llmJustification = "";
        private double llmConfidence = 0.0;
        private int ttftMs = 0;
        private int totalMs = 0;
        private boolean llmSuccess = false;
        private String numericIntention = "";
        private double numericContribution = 0.0;
        private boolean agreement = false;
        private boolean llmInNumericTop3 = false;

        public Builder mode(String v) { mode = v; return this; }
        public Builder llmIntention(String v) { llmIntention = v; return this; }
        public Builder llmJustification(String v) { llmJustification = v; return this; }
        public Builder llmConfidence(double v) { llmConfidence = v; return this; }
        public Builder ttftMs(int v) { ttftMs = v; return this; }
        public Builder totalMs(int v) { totalMs = v; return this; }
        public Builder llmSuccess(boolean v) { llmSuccess = v; return this; }
        public Builder numericIntention(String v) { numericIntention = v; return this; }
        public Builder numericContribution(double v) { numericContribution = v; return this; }
        public Builder agreement(boolean v) { agreement = v; return this; }
        public Builder llmInNumericTop3(boolean v) { llmInNumericTop3 = v; return this; }
        public LLMPulseResponse build() { return new LLMPulseResponse(this); }
    }
}
