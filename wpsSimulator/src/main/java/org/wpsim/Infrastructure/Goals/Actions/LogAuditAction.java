package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;

/**
 * Action that logs a message for auditing/debugging purposes.
 */
public class LogAuditAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        String level = (String) context.getParameters().getOrDefault("level", "INFO");
        String message = (String) context.getParameter("message");

        if (message == null) return false;

        switch (level.toUpperCase()) {
            case "DEBUG":
                wpsReport.debug(message, beliefs.getAlias());
                break;
            case "WARN":
                wpsReport.warn(message, beliefs.getAlias());
                break;
            case "ERROR":
                wpsReport.error(message, beliefs.getAlias());
                break;
            default:
                wpsReport.info(message, beliefs.getAlias());
        }

        return true;
    }
}
