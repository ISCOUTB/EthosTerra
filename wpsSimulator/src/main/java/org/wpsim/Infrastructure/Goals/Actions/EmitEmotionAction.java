package org.wpsim.Infrastructure.Goals.Actions;

import BESA.Emotional.EmotionalEvent;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;

/**
 * Action that updates the emotional state of the agent using BESA Emotional Events.
 */
public class EmitEmotionAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        String event = (String) context.getParameter("event");
        String type = (String) context.getParameter("type");
        String charac = (String) context.getParameter("charac");

        if (event == null || type == null || charac == null) return false;

        beliefs.processEmotionalEvent(new EmotionalEvent(event, type, charac));
        wpsReport.debug("Emotional Event processed: " + event + " - " + type + " - " + charac, beliefs.getAlias());

        return true;
    }
}
