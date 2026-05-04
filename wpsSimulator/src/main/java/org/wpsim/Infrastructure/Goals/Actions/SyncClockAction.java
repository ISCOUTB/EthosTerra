package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.SimulationControl.Util.ControlCurrentDate;

/**
 * Action that synchronizes the agent's internal clock with the simulation global clock.
 */
public class SyncClockAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        beliefs.setInternalCurrentDate(ControlCurrentDate.getInstance().getCurrentDate());
        return true;
    }
}
