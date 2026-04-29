/**
 * ==========================================================================
 * WPSnext – Integración LLM en el BDI Pulse de WellProdSim
 * ==========================================================================
 * Cliente HTTP síncrono para comunicarse con el sidecar Python.
 * Usa java.net.http.HttpClient (disponible desde Java 11).
 *
 * Diseñado para ser llamado dentro de los Guards de BESA sin bloquear
 * el hilo de forma excesiva (timeout configurable).
 * ==========================================================================
 */
package org.wpsim.PeasantFamily.LLM;

import org.wpsim.ViewerLens.Util.wpsReport;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Cliente HTTP para el sidecar wpsllm-sidecar.
 * Llama a POST /pulse con el estado del agente y retorna la respuesta LLM.
 *
 * @author WPSnext
 */
public class LLMPulseClient {

    private static final String SIDECAR_URL =
            System.getenv().getOrDefault("LLM_SIDECAR_URL", "http://wpsllm-sidecar:8001");

    private static final int TIMEOUT_SECONDS =
            Integer.parseInt(System.getenv().getOrDefault("LLM_TIMEOUT_S", "30"));

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    // Bandera de disponibilidad: si falla, evita reintentos costosos
    private static volatile boolean sidecarAvailable = true;
    private static volatile long lastFailureTime = 0;
    private static final long RETRY_COOLDOWN_MS = 30_000; // 30 segundos

    /**
     * Envía el estado del agente al sidecar y retorna la respuesta LLM.
     * Incluye fallback graceful al motor numérico si el sidecar no está disponible.
     *
     * @param pulseData  estado del agente y resultado numérico
     * @return LLMPulseResponse con resultado LLM + numérico
     */
    public static LLMPulseResponse callPulse(LLMPulseData pulseData) {
        // Verificar cooldown si el sidecar falló recientemente
        if (!sidecarAvailable) {
            long elapsed = System.currentTimeMillis() - lastFailureTime;
            if (elapsed < RETRY_COOLDOWN_MS) {
                return LLMPulseResponse.numericFallback(
                        pulseData.getNumericWinnerGoal(),
                        pulseData.getNumericWinnerContribution()
                );
            }
            // Intentar reconexión después del cooldown
            sidecarAvailable = true;
        }

        try {
            String requestBody = pulseData.toJson();
            // System.out.println("[DEBUG] Pulse Body: " + requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SIDECAR_URL + "/pulse"))
                    .version(HttpClient.Version.HTTP_1_1) // Forzar HTTP/1.1 para evitar problemas de upgrade
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 200) {
                sidecarAvailable = true;
                return LLMPulseResponse.fromJson(response.body());
            } else {
                wpsReport.warn(
                        String.format("Sidecar LLM retornó HTTP %d para agente %s",
                                response.statusCode(), pulseData.getAgentId()),
                        pulseData.getAgentId()
                );
                return LLMPulseResponse.numericFallback(
                        pulseData.getNumericWinnerGoal(),
                        pulseData.getNumericWinnerContribution()
                );
            }

        } catch (java.net.ConnectException e) {
            // Sidecar no disponible → marcar para cooldown
            sidecarAvailable = false;
            lastFailureTime = System.currentTimeMillis();
            wpsReport.warn("Sidecar LLM no disponible (ConnectException) – usando motor numérico",
                    pulseData.getAgentId());
            return LLMPulseResponse.numericFallback(
                    pulseData.getNumericWinnerGoal(),
                    pulseData.getNumericWinnerContribution()
            );

        } catch (java.net.http.HttpTimeoutException e) {
            wpsReport.warn(
                    String.format("Timeout del sidecar LLM (%ds) – usando motor numérico", TIMEOUT_SECONDS),
                    pulseData.getAgentId()
            );
            return LLMPulseResponse.numericFallback(
                    pulseData.getNumericWinnerGoal(),
                    pulseData.getNumericWinnerContribution()
            );

        } catch (Exception e) {
            wpsReport.error(e, pulseData.getAgentId());
            return LLMPulseResponse.numericFallback(
                    pulseData.getNumericWinnerGoal(),
                    pulseData.getNumericWinnerContribution()
            );
        }
    }

    /**
     * Verifica la disponibilidad del sidecar con un health check.
     *
     * @return true si el sidecar está disponible
     */
    public static boolean isHealthy() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SIDECAR_URL + "/health"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );
            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }
}
