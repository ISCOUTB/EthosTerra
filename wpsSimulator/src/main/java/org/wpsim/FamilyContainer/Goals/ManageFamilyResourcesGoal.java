package org.wpsim.FamilyContainer.Goals;

import BESA.BDI.AgentStructuralModel.GoalBDI;
import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.FamilyContainer.Data.FamilyCoordinatorBelieves;
import org.wpsim.FamilyContainer.Tasks.ManageFamilyResourcesTask;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * Weekly family resource oversight goal for the FamilyCoordinator BDI agent.
 *
 * <p>Fires every Monday (every 7 simulation days) to trigger
 * {@link ManageFamilyResourcesTask}, which checks whether the shared family pool
 * can cover the minimum weekly needs of all members and broadcasts the updated
 * family state to the WebSocket UI.</p>
 *
 * @author jairo
 */
public class ManageFamilyResourcesGoal extends GoalBDI {

    private static final int CHECK_INTERVAL_DAYS = 7;

    public ManageFamilyResourcesGoal(long id, RationalRole role,
                                     String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static ManageFamilyResourcesGoal buildGoal() {
        ManageFamilyResourcesTask task = new ManageFamilyResourcesTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("ManageFamilyResourcesTask", plan);
        return new ManageFamilyResourcesGoal(
                wpsStart.getPlanID(), role,
                "ManageFamilyResourcesTask",
                GoalBDITypes.ATTENTION_CYCLE);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        FamilyCoordinatorBelieves believes = (FamilyCoordinatorBelieves) parameters;
        if (isAlreadyExecutedToday(believes)) return 0;
        return (believes.getCurrentDay() % CHECK_INTERVAL_DAYS == 0) ? 1 : 0;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        return 0.7;
    }

    @Override
    public boolean predictResultUnlegality(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        return true;
    }

    @Override
    public boolean goalSucceeded(Believes parameters) throws KernellAgentEventExceptionBESA {
        FamilyCoordinatorBelieves believes = (FamilyCoordinatorBelieves) parameters;
        return believes.isTaskExecutedOnDate(
                believes.getInternalCurrentDate(),
                "ManageFamilyResourcesTask");
    }

    private boolean isAlreadyExecutedToday(FamilyCoordinatorBelieves believes) {
        return believes.isTaskExecutedOnDate(
                believes.getInternalCurrentDate(),
                "ManageFamilyResourcesTask");
    }
}
