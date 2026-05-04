package org.wpsim.Infrastructure.Beliefs;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Validates that a belief key and its value are within the bounds declared in
 * specs/BeliefSchema.json (copied to classpath as BeliefSchema.json).
 * Loaded once at class initialisation; validation is advisory — logs a warning
 * rather than throwing to preserve liveness.
 */
public class BeliefSchemaValidator {

    private static final Map<String, BeliefMeta> CATALOG = new HashMap<>();

    static {
        try (InputStream is = BeliefSchemaValidator.class
                .getClassLoader()
                .getResourceAsStream("BeliefSchema.json")) {
            if (is != null) {
                JSONObject schema = new JSONObject(new JSONTokener(is));
                // BeliefSchema.json uses an array: "beliefs": [ { "key": "...", ... }, ... ]
                JSONArray beliefs = schema.optJSONArray("beliefs");
                if (beliefs != null) {
                    for (int i = 0; i < beliefs.length(); i++) {
                        JSONObject meta = beliefs.getJSONObject(i);
                        String key = meta.optString("key");
                        if (key.isBlank()) continue;
                        double min = meta.optDouble("min", Double.NEGATIVE_INFINITY);
                        double max = meta.optDouble("max", Double.POSITIVE_INFINITY);
                        String type = meta.optString("type", "String");
                        CATALOG.put(key, new BeliefMeta(type, min, max));
                    }
                }
            }
        } catch (Exception e) {
            // Schema not found on classpath — validation is disabled silently.
        }
    }

    /**
     * Returns true if {@code value} is within declared bounds for {@code key}.
     * Always returns true when the key is not in the catalog (unknown beliefs pass through).
     */
    public static boolean validate(String key, Object value) {
        BeliefMeta meta = CATALOG.get(key);
        if (meta == null) return true;
        if (value instanceof Number n) {
            double d = n.doubleValue();
            return d >= meta.min && d <= meta.max;
        }
        return true;
    }

    public static Set<String> knownKeys() {
        return CATALOG.keySet();
    }

    private record BeliefMeta(String type, double min, double max) {}
}
