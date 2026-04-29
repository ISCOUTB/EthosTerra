package org.wpsim.Person.Goals.Common;

import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Tasks.Common.SeekSpouseTask;
import org.wpsim.WellProdSim.Base.wpsPersonGoalBDI;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * L4 Reproduction — seeks a spouse within the social network.
 *
 * <p>Activates for adults ({@link org.wpsim.Person.Data.EtapaVida#canReproduce()})
 * who do not yet have a spouse and know at least one other person. Fires at
 * most once per week to avoid continuous searching.</p>
 *
 * <p>Common to all roles for adults of reproductive age.</p>
 *
 * @author jairo
 */
public class SeekSpouseGoal extends wpsPersonGoalBDI {

    private static final int SEEK_INTERVAL_DAYS = 7;

    public SeekSpouseGoal(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static SeekSpouseGoal buildGoal() {
        SeekSpouseTask task = new SeekSpouseTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("SeekSpouseTask", plan);
        return new SeekSpouseGoal(wpsStart.getPlanID(), role, "SeekSpouseTask", GoalBDITypes.NEED);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (!believes.getProfile().getEtapaVida().canReproduce()) return 0;
        return believes.getSocialNetwork().isEmpty() ? 0 : 1;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (!believes.getProfile().getEtapaVida().canReproduce()) return 0;
        if (believes.getProfile().hasSpouse()) return 0;           // already paired
        if (isAlreadyExecutedToday(believes)) return 0;
        return (believes.getCurrentDay() % SEEK_INTERVAL_DAYS == 0) ? 0.6 : 0;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) stateBDI.getBelieves();
        double base = believes.getProfile().getFamilyAffinity() * 0.5;
        return evaluateEmotionalContribution(stateBDI, base);
    }
}
