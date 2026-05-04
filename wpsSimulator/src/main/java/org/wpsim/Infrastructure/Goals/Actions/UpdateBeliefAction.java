package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;

/**
 * Action that updates a belief in the agent's state.
 */
public class UpdateBeliefAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        String key = (String) context.getParameter("key");
        Object value = context.getParameter("value");

        if (key == null) return false;

        // Special handling for common keys, or use generic repository
        switch (key) {
            case "new_day":
                beliefs.setNewDay((Boolean) value);
                break;
            default:
                // Fallback to the generic belief repository if available
                if (beliefs.getBeliefRepository() != null) {
                    beliefs.getBeliefRepository().set(key, value);
                } else {
                    wpsReport.warn("Unknown belief key for direct update: " + key, beliefs.getAlias());
                    return false;
                }
        }

        return true;
    }
}
