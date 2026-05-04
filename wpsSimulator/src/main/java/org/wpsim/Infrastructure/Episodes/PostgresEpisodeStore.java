package org.wpsim.Infrastructure.Episodes;

import BESA.Log.ReportBESA;
import com.google.gson.Gson;
import com.pgvector.PGvector;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * PostgreSQL implementation of EpisodeStore.
 * Uses JSONB for metadata and GIN indexes for tags.
 * Integrates pgvector for semantic search (Stage 3).
 */
public class PostgresEpisodeStore implements EpisodeStore {

    private final PostgresConnectionFactory connectionFactory;
    private final Gson gson = new Gson();
    private final EmbeddingService embeddingService = EmbeddingService.getInstance();

    public PostgresEpisodeStore() {
        this.connectionFactory = PostgresConnectionFactory.getInstance();
    }

    @Override
    public void record(Episode episode) {
        String sql = "INSERT INTO episodes (agent_id, sim_time, real_time, text, source, tags, metadata, embedding) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)";
        
        try (Connection conn = connectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, episode.getAgentId());
            ps.setLong(2, episode.getSimTime());
            ps.setTimestamp(3, Timestamp.from(episode.getTimestamp()));
            ps.setString(4, episode.getContent());
            ps.setString(5, episode.getSource());
            ps.setArray(6, conn.createArrayOf("text", episode.getTags()));
            ps.setString(7, gson.toJson(episode.getMetadata()));
            
            // Generate and set embedding
            float[] vector = embeddingService.getEmbedding(episode.getContent());
            if (vector != null) {
                ps.setObject(8, new PGvector(vector));
            } else {
                ps.setNull(8, Types.OTHER);
            }
            
            ps.executeUpdate();
        } catch (SQLException e) {
            ReportBESA.error("Error recording episode for agent " + episode.getAgentId() + ": " + e.getMessage());
        }
    }

    @Override
    public List<Episode> recall(String query, int limit) {
        List<Episode> results = new ArrayList<>();
        float[] queryVector = embeddingService.getEmbedding(query);
        
        if (queryVector == null) {
            ReportBESA.warn("Could not generate embedding for query: " + query);
            return results;
        }

        String sql = "SELECT agent_id, sim_time, real_time, text, source, tags, metadata " +
                     "FROM episodes " +
                     "ORDER BY embedding <=> ? " +
                     "LIMIT ?";

        try (Connection conn = connectionFactory.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setObject(1, new PGvector(queryVector));
            ps.setInt(2, limit);
            
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Episode episode = new Episode(
                        rs.getString("agent_id"),
                        rs.getLong("sim_time"),
                        rs.getString("text")
                    );
                    episode.setSource(rs.getString("source"));
                    episode.setTimestamp(rs.getTimestamp("real_time").toInstant());
                    Array tagsArray = rs.getArray("tags");
                    if (tagsArray != null) {
                        episode.setTags((String[]) tagsArray.getArray());
                    }
                    String metadataJson = rs.getString("metadata");
                    if (metadataJson != null) {
                        episode.setMetadata(gson.fromJson(metadataJson, Map.class));
                    }
                    results.add(episode);
                }
            }
        } catch (SQLException e) {
            ReportBESA.error("Error in semantic recall: " + e.getMessage());
        }
        
        return results;
    }
}
