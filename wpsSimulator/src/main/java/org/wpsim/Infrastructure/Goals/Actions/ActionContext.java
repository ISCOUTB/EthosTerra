package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import java.util.HashMap;
import java.util.Map;

/**
 * Context for executing actions, carrying beliefs and parameters.
 */
public class ActionContext {
    private final PeasantFamilyBelieves beliefs;
    private final Map<String, Object> parameters;
    private final Map<String, Object> results;

    public ActionContext(PeasantFamilyBelieves beliefs) {
        this.beliefs = beliefs;
        this.parameters = new HashMap<>();
        this.results = new HashMap<>();
    }

    public PeasantFamilyBelieves getBeliefs() { return beliefs; }
    
    public void setParameter(String key, Object value) { parameters.put(key, value); }
    public Object getParameter(String key) { return parameters.get(key); }
    
    public void setResult(String key, Object value) { results.put(key, value); }
    public Object getResult(String key) { return results.get(key); }
    
    public Map<String, Object> getParameters() { return parameters; }
}
