package org.wpsim.Person.Goals.Common;

import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Tasks.Common.AgeTask;
import org.wpsim.WellProdSim.Base.wpsPersonGoalBDI;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * Annual aging goal — fires once every 365 simulation days.
 *
 * Triggers {@link AgeTask} which advances the individual's age, updates
 * their life stage ({@link org.wpsim.Person.Data.EtapaVida}), reassigns
 * their social role if a stage boundary is crossed, and applies natural
 * health decline for elderly individuals.
 *
 * Common to ALL social roles and ALL life stages.
 *
 * @author jairo
 */
public class AgeGoal extends wpsPersonGoalBDI {

    /** Number of simulation days between age advances. */
    private static final int DAYS_PER_YEAR = 365;

    public AgeGoal(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static AgeGoal buildGoal() {
        AgeTask task = new AgeTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("AgeTask", plan);
        return new AgeGoal(wpsStart.getPlanID(), role, "AgeTask", GoalBDITypes.ATTENTION_CYCLE);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (isAlreadyExecutedToday(believes)) return 0;
        // Fire once every DAYS_PER_YEAR (on the anniversary day)
        return (believes.getCurrentDay() > 0 && believes.getCurrentDay() % DAYS_PER_YEAR == 0) ? 1 : 0;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        // Aging is inevitable — always high contribution when triggered
        return 0.85;
    }
}
