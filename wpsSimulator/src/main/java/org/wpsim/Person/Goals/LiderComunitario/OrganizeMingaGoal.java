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
package org.wpsim.Person.Goals.LiderComunitario;

import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Data.SocialRole;
import org.wpsim.Person.Tasks.LiderComunitario.OrganizeMingaTask;
import org.wpsim.WellProdSim.Base.wpsPersonGoalBDI;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * L5 Social — Organize a minga (collective community work event).
 *
 * A LiderComunitario mobilizes their social network for a shared task:
 * building a fence, clearing a path, harvesting for a sick neighbor, etc.
 * The call raises the leader's reputation and produces strong positive
 * emotional effects across the network.
 *
 * The goal activates once per week (every 7 simulation days) when the
 * leader knows at least 2 other persons and has sufficient reputation.
 *
 * Restricted to: {@link SocialRole#LIDER_COMUNITARIO}
 *
 * @author jairo
 */
public class OrganizeMingaGoal extends wpsPersonGoalBDI {

    private static final int MINGA_INTERVAL_DAYS = 7;
    private static final double MIN_REPUTATION = 0.4;

    public OrganizeMingaGoal(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static OrganizeMingaGoal buildGoal() {
        OrganizeMingaTask task = new OrganizeMingaTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("OrganizeMingaTask", plan);
        return new OrganizeMingaGoal(
                wpsStart.getPlanID(), role, "OrganizeMingaTask", GoalBDITypes.NEED);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (!believes.getRole().equals(SocialRole.LIDER_COMUNITARIO)) return 0;
        if (believes.getProfile().getReputation() < MIN_REPUTATION) return 0;
        return believes.getSocialNetwork().size() >= 2 ? 1 : 0;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (!believes.getRole().equals(SocialRole.LIDER_COMUNITARIO)) return 0;
        if (isAlreadyExecutedToday(believes)) return 0;
        // Activate on the first day of each week interval
        return (believes.getCurrentDay() % MINGA_INTERVAL_DAYS == 0) ? 1 : 0;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) stateBDI.getBelieves();
        // Contribution is driven by reputation and community affinity
        double base = believes.getProfile().getReputation() * 0.6
                    + believes.getProfile().getCommunityAffinity() * 0.4;
        return evaluateEmotionalContribution(stateBDI, base);
    }
}
