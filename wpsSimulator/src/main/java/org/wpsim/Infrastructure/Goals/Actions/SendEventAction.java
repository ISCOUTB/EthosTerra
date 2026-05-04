package org.wpsim.Infrastructure.Goals.Actions;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.wpsim.SimulationControl.Guards.SimulationControlGuard;
import org.wpsim.PeasantFamily.Guards.FromSimulationControl.ToControlMessage;

/**
 * Action that sends a BESA event to another agent.
 */
public class SendEventAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        String to = (String) context.getParameter("to");
        String type = (String) context.getParameter("type");

        if (to == null || type == null) return false;

        try {
            // Specialized logic for common destinations
            if (to.equals("SimulationControl")) {
                // In WPS, SimulationControl is often updated via ToControlMessage
                AdmBESA.getInstance().getHandlerByAlias("wpsControl").sendEvent(
                    new EventBESA(
                        SimulationControlGuard.class.getName(),
                        new ToControlMessage(
                            beliefs.getAlias(),
                            beliefs.getInternalCurrentDate(),
                            beliefs.getCurrentDay()
                        )
                    )
                );
                return true;
            }
            
            wpsReport.warn("Generic send_event to " + to + " not fully implemented yet", beliefs.getAlias());
            return false;
        } catch (Exception e) {
            wpsReport.error("Error sending event: " + e.getMessage(), beliefs.getAlias());
            return false;
        }
    }
}
