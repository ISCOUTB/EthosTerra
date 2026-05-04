package org.wpsim.Infrastructure.Beliefs;

import java.util.Map;
import java.util.Optional;

/**
 * Abstraction layer between the simulation's belief objects and the Redis backing store.
 * All writes are fire-and-forget (non-blocking); reads prefer Redis with Java-field fallback.
 */
public interface BeliefRepository {

    /**
     * Read a belief value by key. Returns empty if Redis is unavailable or key not set.
     */
    <T> Optional<T> get(String key, Class<T> type);

    /**
     * Simplified read for MVEL/YAML expressions. Returns null if not found.
     */
    default Object get(String key) {
        return get(key, Object.class).orElse(null);
    }

    /**
     * Write a belief value. Notifies registered listeners synchronously before returning.
     */
    void set(String key, Object value);

    /**
     * Atomically add {@code delta} to a numeric belief. Equivalent to HINCRBYFLOAT in Redis.
     */
    void increment(String key, double delta);

    /**
     * Register a listener that fires whenever {@code key} is written via {@link #set}.
     */
    void subscribe(String key, BeliefChangeListener listener);

    void unsubscribe(String key, BeliefChangeListener listener);

    /**
     * Render all beliefs in {@code scope} as a human-readable string (for logging / LLM prompts).
     */
    String render(BeliefScope scope);

    /**
     * Return all beliefs in {@code scope} as a structured map for serialization.
     */
    Map<String, Object> toStructured(BeliefScope scope);

    /**
     * Flush all pending writes and release connections. Called on agent shutdown.
     */
    void close();
}
