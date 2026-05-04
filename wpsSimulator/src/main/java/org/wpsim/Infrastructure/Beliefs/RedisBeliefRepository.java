package org.wpsim.Infrastructure.Beliefs;

import io.lettuce.core.api.sync.RedisCommands;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BeliefRepository backed by Redis Hashes (Lettuce synchronous client).
 *
 * Key layout per agent:
 *   agent:{id}:state       — numeric + boolean simulation state fields
 *   agent:{id}:personality — personality modulators and affinities
 *   agent:{id}:emotional   — emotional axis values (emotional.happiness, etc.)
 *
 * All writes are synchronous so the simulation tick stays deterministic.
 * Listeners are notified in-thread before the method returns.
 */
public class RedisBeliefRepository implements BeliefRepository {

    private static final String HASH_STATE       = "agent:%s:state";
    private static final String HASH_PERSONALITY = "agent:%s:personality";
    private static final String HASH_EMOTIONAL   = "agent:%s:emotional";

    private final String agentId;
    private final RedisCommands<String, String> redis;
    private final Map<String, List<BeliefChangeListener>> listeners = new ConcurrentHashMap<>();

    public RedisBeliefRepository(String agentId) {
        this.agentId = agentId;
        this.redis = RedisConnectionFactory.getInstance().sync();
    }

    // -------------------------------------------------------------------------
    // BeliefRepository implementation
    // -------------------------------------------------------------------------

    @Override
    public <T> Optional<T> get(String key, Class<T> type) {
        try {
            String raw = redis.hget(hashFor(key), fieldFor(key));
            if (raw == null) return Optional.empty();
            return Optional.of(coerce(raw, type));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public void set(String key, Object value) {
        if (!BeliefSchemaValidator.validate(key, value)) {
            BESA.Log.ReportBESA.warn(
                "BeliefRepository: value " + value + " out of range for key '" + key + "'");
        }
        String raw = String.valueOf(value);
        try {
            Object oldRaw = get(key, Object.class).orElse(null);
            redis.hset(hashFor(key), fieldFor(key), raw);
            notifyListeners(key, oldRaw, value);
        } catch (Exception e) {
            BESA.Log.ReportBESA.error(e);
        }
    }

    @Override
    public void increment(String key, double delta) {
        try {
            redis.hincrbyfloat(hashFor(key), fieldFor(key), delta);
            notifyListeners(key, null, delta);
        } catch (Exception e) {
            BESA.Log.ReportBESA.error(e);
        }
    }

    @Override
    public void subscribe(String key, BeliefChangeListener listener) {
        listeners.computeIfAbsent(key, k -> new ArrayList<>()).add(listener);
    }

    @Override
    public void unsubscribe(String key, BeliefChangeListener listener) {
        List<BeliefChangeListener> list = listeners.get(key);
        if (list != null) list.remove(listener);
    }

    @Override
    public String render(BeliefScope scope) {
        Map<String, Object> data = toStructured(scope);
        StringBuilder sb = new StringBuilder("Beliefs[" + agentId + "]:\n");
        data.forEach((k, v) -> sb.append("  ").append(k).append(" = ").append(v).append('\n'));
        return sb.toString();
    }

    @Override
    public Map<String, Object> toStructured(BeliefScope scope) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (scope.isIncludeState()) {
            Map<String, String> stateMap = redis.hgetall(String.format(HASH_STATE, agentId));
            if (stateMap != null) stateMap.forEach((k, v) -> result.put(k, parseValue(v)));
        }
        if (scope.isIncludePersonality()) {
            Map<String, String> persMap = redis.hgetall(String.format(HASH_PERSONALITY, agentId));
            if (persMap != null) persMap.forEach((k, v) -> result.put("personality." + k, parseValue(v)));
        }
        if (scope.isIncludeEmotional()) {
            Map<String, String> emoMap = redis.hgetall(String.format(HASH_EMOTIONAL, agentId));
            if (emoMap != null) emoMap.forEach((k, v) -> result.put("emotional." + k, parseValue(v)));
        }
        if (scope.hasKeyFilter()) {
            result.keySet().retainAll(scope.getOnlyKeys());
        }
        return result;
    }

    @Override
    public void close() {
        // Connection is shared via RedisConnectionFactory; do not close it here.
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Writes a full snapshot of agent state in bulk (used by PeasantFamilyBelieves.syncToRedis). */
    public void bulkSet(String hash, Map<String, String> fields) {
        if (fields.isEmpty()) return;
        try {
            redis.hset(hash, fields);
        } catch (Exception e) {
            BESA.Log.ReportBESA.error(e);
        }
    }

    public String stateHash()       { return String.format(HASH_STATE,       agentId); }
    public String personalityHash() { return String.format(HASH_PERSONALITY, agentId); }
    public String emotionalHash()   { return String.format(HASH_EMOTIONAL,   agentId); }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    private String hashFor(String key) {
        String pattern = BeliefSchemaValidator.getRedisHash(key);
        return pattern.replace("{id}", agentId);
    }

    private String fieldFor(String key) {
        if (key.startsWith("emotional.")) return key.substring("emotional.".length());
        if (key.startsWith("personality.")) return key.substring("personality.".length());
        return key;
    }

    @SuppressWarnings("unchecked")
    private <T> T coerce(String raw, Class<T> type) {
        if (type == String.class)  return (T) raw;
        if (type == Double.class || type == double.class)
            return (T) Double.valueOf(raw);
        if (type == Float.class || type == float.class)
            return (T) Float.valueOf(raw);
        if (type == Integer.class || type == int.class)
            return (T) Integer.valueOf(raw);
        if (type == Long.class || type == long.class)
            return (T) Long.valueOf(raw);
        if (type == Boolean.class || type == boolean.class)
            return (T) Boolean.valueOf(raw);
        if (type == Object.class)
            return (T) parseValue(raw);
        return (T) raw;
    }

    private Object parseValue(String raw) {
        try { return Double.parseDouble(raw); } catch (NumberFormatException ignored) {}
        if ("true".equalsIgnoreCase(raw))  return true;
        if ("false".equalsIgnoreCase(raw)) return false;
        return raw;
    }

    private void notifyListeners(String key, Object oldValue, Object newValue) {
        List<BeliefChangeListener> list = listeners.get(key);
        if (list != null) {
            for (BeliefChangeListener l : list) {
                try { l.onChanged(key, oldValue, newValue); }
                catch (Exception ignored) {}
            }
        }
    }
}
