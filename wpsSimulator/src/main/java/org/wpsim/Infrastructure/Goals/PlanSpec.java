package org.wpsim.Infrastructure.Goals;

import java.util.List;
import java.util.Map;

/**
 * POJO for declarative plan specification (PlanSpec.schema.json).
 * Loaded from YAML files in specs/plans/.
 */
public class PlanSpec {
    private String id;
    private String version;
    private String description;
    private List<String> preconditions;
    private List<PlanStep> steps;
    private List<PlanStep> on_timeout;
    private List<PlanStep> on_failure;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<String> getPreconditions() { return preconditions; }
    public void setPreconditions(List<String> preconditions) { this.preconditions = preconditions; }
    public List<PlanStep> getSteps() { return steps; }
    public void setSteps(List<PlanStep> steps) { this.steps = steps; }
    public List<PlanStep> getOn_timeout() { return on_timeout; }
    public void setOn_timeout(List<PlanStep> on_timeout) { this.on_timeout = on_timeout; }
    public List<PlanStep> getOn_failure() { return on_failure; }
    public void setOn_failure(List<PlanStep> on_failure) { this.on_failure = on_failure; }

    public static class PlanStep {
        private String id;
        private String action;
        private Map<String, Object> args;
        private String binds;
        private String condition;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public Map<String, Object> getArgs() { return args; }
        public void setArgs(Map<String, Object> args) { this.args = args; }
        public String getBinds() { return binds; }
        public void setBinds(String binds) { this.binds = binds; }
        public String getCondition() { return condition; }
        public void setCondition(String condition) { this.condition = condition; }
    }
}
