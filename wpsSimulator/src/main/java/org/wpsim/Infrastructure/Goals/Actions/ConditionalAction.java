package org.wpsim.Infrastructure.Goals.Actions;

import org.mvel2.MVEL;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.SimulationControl.Util.ControlCurrentDate;
import org.wpsim.ViewerLens.Util.wpsReport;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Evaluates an MVEL condition against the agent's beliefs and plan bindings,
 * then executes the matching branch (if_true or if_false) of inline sub-steps.
 *
 * Sub-step format (from YAML via SnakeYAML):
 * <pre>
 *   List&lt;Map&lt;String, Object&gt;&gt; where each map has:
 *     id     (String)
 *     action (String) — registered key in ActionRegistry
 *     args   (Map&lt;String, Object&gt;)
 * </pre>
 *
 * The MVEL context exposes: belief, state, bindings, calendar.
 */
public class ConditionalAction implements PrimitiveAction {

    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();
        String condition = (String) context.getParameter("condition");

        if (condition == null) {
            wpsReport.warn("Conditional: missing 'condition' parameter", believes.getAlias());
            return false;
        }

        boolean result = evaluateCondition(condition, believes);
        wpsReport.debug("Conditional [" + condition + "] → " + result, believes.getAlias());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> branch = result
                ? (List<Map<String, Object>>) context.getParameter("if_true")
                : (List<Map<String, Object>>) context.getParameter("if_false");

        if (branch == null) return true;

        return executeSubSteps(branch, believes);
    }

    private boolean evaluateCondition(String condition, PeasantFamilyBelieves believes) {
        try {
            Map<String, Object> ctx = new HashMap<>();
            ctx.put("belief",   believes.getBeliefRepository());
            ctx.put("state",    believes);
            ctx.put("bindings", believes.getPlanBindings());
            ctx.put("calendar", ControlCurrentDate.getInstance());
            Boolean result = (Boolean) MVEL.eval(condition, ctx);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            wpsReport.warn("Conditional: MVEL eval failed for [" + condition + "]: " + e.getMessage(),
                    believes.getAlias());
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private boolean executeSubSteps(List<Map<String, Object>> steps, PeasantFamilyBelieves believes) {
        ActionRegistry registry = ActionRegistry.getInstance();
        for (Map<String, Object> stepMap : steps) {
            String actionId = (String) stepMap.get("action");
            if (actionId == null) continue;

            PrimitiveAction action = registry.getAction(actionId);
            if (action == null) {
                wpsReport.warn("Conditional sub-step: unknown action '" + actionId + "'", believes.getAlias());
                continue;
            }

            ActionContext subCtx = new ActionContext(believes);
            Object args = stepMap.get("args");
            if (args instanceof Map) {
                ((Map<String, Object>) args).forEach(subCtx::setParameter);
            }

            boolean ok = action.execute(subCtx);
            if (!ok) {
                wpsReport.warn("Conditional sub-step '" + stepMap.get("id") + "' returned false", believes.getAlias());
            }
        }
        return true;
    }
}
