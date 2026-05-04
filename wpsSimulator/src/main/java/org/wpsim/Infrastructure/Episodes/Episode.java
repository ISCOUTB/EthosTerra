package org.wpsim.Infrastructure.Episodes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * POJO representing a single experience (episode) in the agent's memory.
 */
public class Episode {
    private String agentId;
    private long simTime;
    private Instant timestamp;
    private String content;
    private String source = "self";
    private String[] tags = new String[0];
    private Map<String, Object> metadata;
    private double importance; // [0,1]

    public Episode(String agentId, long simTime, String content) {
        this.agentId = agentId;
        this.simTime = simTime;
        this.timestamp = Instant.now();
        this.content = content;
        this.metadata = new HashMap<>();
        this.importance = 0.5;
    }

    public Episode(String agentId, long simTime, String content, double importance) {
        this(agentId, simTime, content);
        this.importance = importance;
    }

    // Getters and Setters
    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }

    public long getSimTime() { return simTime; }
    public void setSimTime(long simTime) { this.simTime = simTime; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String[] getTags() { return tags; }
    public void setTags(String[] tags) { this.tags = tags; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public double getImportance() { return importance; }
    public void setImportance(double importance) { this.importance = importance; }

    public void addMetadata(String key, Object value) {
        this.metadata.put(key, value);
    }
}
