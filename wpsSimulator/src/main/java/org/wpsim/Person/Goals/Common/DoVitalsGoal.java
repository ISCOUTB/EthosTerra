/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \  *    @since 2023                                  *
 * \_/\_/  | .__/ |___/   *                                                 *
 * | |                    *    @author Jairo Serrano                        *
 * |_|                    *    @author Enrique Gonzalez                     *
 * ==========================================================================
 */
package org.wpsim.Person.Goals.Common;

import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Tasks.Common.DoVitalsTask;
import org.wpsim.WellProdSim.Base.wpsPersonGoalBDI;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * L1 Survival — Daily vitals for every individual Person.
 *
 * Activates once per day (on the {@code newDay} flag). Runs before any
 * other goal so that essential daily costs (food, rest) are always paid.
 * Common to ALL social roles.
 *
 * @author jairo
 */
public class DoVitalsGoal extends wpsPersonGoalBDI {

    public DoVitalsGoal(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static DoVitalsGoal buildGoal() {
        DoVitalsTask task = new DoVitalsTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("DoVitalsTask", plan);
        return new DoVitalsGoal(wpsStart.getPlanID(), role, "DoVitalsTask", GoalBDITypes.SURVIVAL);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (isAlreadyExecutedToday(believes)) return 0;
        return believes.isNewDay() ? 1 : 0;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        return 0.99;
    }
}
