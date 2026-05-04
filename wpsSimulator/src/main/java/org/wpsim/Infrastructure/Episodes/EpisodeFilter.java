package org.wpsim.Infrastructure.Episodes;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Utility to filter episodes and prevent spamming the database with repetitive events.
 * Currently uses a simple threshold-based filter or deduplication logic.
 */
public class EpisodeFilter {
    
    private static final Map<String, Long> lastRecordedTime = new ConcurrentHashMap<>();
    private static final long DEFAULT_MIN_INTERVAL_MS = 5000; // 5 seconds

    /**
     * Should this episode be recorded?
     */
    public static boolean shouldRecord(Episode episode) {
        // Importance check
        if (episode.getImportance() < 0.2) return false;

        // Repetition check per agent and content type
        String key = episode.getAgentId() + ":" + episode.getContent().hashCode();
        long now = System.currentTimeMillis();
        long last = lastRecordedTime.getOrDefault(key, 0L);
        
        if (now - last < DEFAULT_MIN_INTERVAL_MS) {
            return false;
        }
        
        lastRecordedTime.put(key, now);
        return true;
    }
}
