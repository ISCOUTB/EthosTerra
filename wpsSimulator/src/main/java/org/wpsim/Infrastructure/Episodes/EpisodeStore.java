package org.wpsim.Infrastructure.Episodes;

import java.util.List;

/**
 * Interface for persisting and querying episodes.
 */
public interface EpisodeStore {
    /**
     * Persists an episode to the database.
     */
    void record(Episode episode);

    /**
     * Recalls episodes based on semantic similarity.
     * Stub for Stage 3.
     */
    List<Episode> recall(String query, int limit);
}
