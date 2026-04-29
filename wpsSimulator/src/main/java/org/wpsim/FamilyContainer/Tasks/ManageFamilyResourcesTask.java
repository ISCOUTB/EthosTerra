package org.wpsim.FamilyContainer.Tasks;

import org.wpsim.FamilyContainer.Data.FamilyCoordinatorBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;
import rational.mapping.Believes;
import rational.mapping.Task;

/**
 * Weekly family resource management task executed by the FamilyCoordinator.
 *
 * <p>Responsibilities each week:</p>
 * <ul>
 *   <li>Check if the family money pool covers the minimum needs of all members
 *       (number of members × daily cost × 7 days).</li>
 *   <li>Log a warning if the family is at risk of starvation.</li>
 *   <li>Emit the updated family state to the WebSocket for UI visualization.</li>
 * </ul>
 *
 * <p>This task does NOT redistribute individual money — that happens via
 * {@link org.wpsim.Person.Tasks.Common.DoVitalsTask} which already falls back
 * to the family pool. This task provides the oversight layer.</p>
 *
 * @author jairo
 */
public class ManageFamilyResourcesTask extends Task {

    /** Estimated daily cost per family member (COP). */
    private static final double DAILY_COST_PER_MEMBER = 5_000;

    @Override
    public void executeTask(Believes parameters) {
        FamilyCoordinatorBelieves believes = (FamilyCoordinatorBelieves) parameters;

        int members = believes.getMemberCount();
        double weeklyNeeds = members * DAILY_COST_PER_MEMBER * 7;

        if (believes.getFamilyMoney() < weeklyNeeds) {
            System.out.println("[ManageFamilyResources] WARNING: Family "
                    + believes.getFamilyAlias()
                    + " money=" + String.format("%.0f", believes.getFamilyMoney())
                    + " < weeklyNeeds=" + String.format("%.0f", weeklyNeeds)
                    + " for " + members + " members");
        }

        // Emit state to WebSocket (UI picks this up as a family state update)
        wpsReport.ws(believes.toJson(), believes.getFamilyAlias());

        believes.addTaskToLog(believes.getInternalCurrentDate(), "ManageFamilyResourcesTask");
        believes.useTime(60); // 1 hour of coordination work
    }

    @Override
    public void interruptTask(Believes parameters) { /* no-op */ }

    @Override
    public void cancelTask(Believes parameters) { /* no-op */ }

    /**
     * The task is considered finished when it has been logged for today.
     * This mirrors the pattern used in {@link org.wpsim.WellProdSim.Base.wpsPersonTask}.
     */
    @Override
    public boolean checkFinish(Believes parameters) {
        FamilyCoordinatorBelieves believes = (FamilyCoordinatorBelieves) parameters;
        return believes.isTaskExecutedOnDate(
                believes.getInternalCurrentDate(),
                "ManageFamilyResourcesTask");
    }
}
