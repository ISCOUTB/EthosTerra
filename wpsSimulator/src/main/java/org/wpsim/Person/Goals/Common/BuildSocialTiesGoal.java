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
import org.wpsim.Person.Tasks.Common.BuildSocialTiesTask;
import org.wpsim.WellProdSim.Base.wpsPersonGoalBDI;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * L5 Social — Strengthen ties with other individuals in the community.
 *
 * An individual reaches out to someone in their social network, exchanging
 * a greeting or a short conversation. This raises both parties' reputation
 * and produces positive emotional effects.
 *
 * Activates once per day when the person has time available and knows
 * at least one other person. The goal's contribution rises with the
 * individual's community affinity.
 *
 * Common to ALL social roles.
 *
 * @author jairo
 */
public class BuildSocialTiesGoal extends wpsPersonGoalBDI {

    public BuildSocialTiesGoal(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static BuildSocialTiesGoal buildGoal() {
        BuildSocialTiesTask task = new BuildSocialTiesTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("BuildSocialTiesTask", plan);
        return new BuildSocialTiesGoal(
                wpsStart.getPlanID(), role, "BuildSocialTiesTask", GoalBDITypes.NEED);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        // Viable when there is time left and a social network exists
        return (believes.haveTimeAvailable(60) && !believes.getSocialNetwork().isEmpty()) ? 1 : 0;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (isAlreadyExecutedToday(believes)) return 0;
        // Activate once per day based on affinity
        return believes.getProfile().getCommunityAffinity();
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) stateBDI.getBelieves();
        // Social contribution modulated by community affinity and emotional state
        double base = believes.getProfile().getCommunityAffinity() * 0.5;
        return evaluateEmotionalContribution(stateBDI, base);
    }
}
