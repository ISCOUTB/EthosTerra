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
package org.wpsim.Person.Goals.Jornalero;

import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Data.SocialRole;
import org.wpsim.Person.Tasks.Jornalero.SeekWorkTask;
import org.wpsim.WellProdSim.Base.wpsPersonGoalBDI;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * L3 Development — Search for paid work for the JORNALERO role.
 *
 * A Jornalero reaches out through their social network (or the community
 * dynamics service) to find someone who needs a day laborer. If money
 * is running low the urgency of this goal increases significantly.
 *
 * Restricted to: {@link SocialRole#JORNALERO}
 *
 * @author jairo
 */
public class SeekWorkGoal extends wpsPersonGoalBDI {

    private static final double LOW_MONEY_THRESHOLD = 20000;

    public SeekWorkGoal(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static SeekWorkGoal buildGoal() {
        SeekWorkTask task = new SeekWorkTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("SeekWorkTask", plan);
        return new SeekWorkGoal(
                wpsStart.getPlanID(), role, "SeekWorkTask", GoalBDITypes.OPORTUNITY);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (!believes.getRole().equals(SocialRole.JORNALERO)) return 0;
        return believes.haveTimeAvailable(240) ? 1 : 0;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (!believes.getRole().equals(SocialRole.JORNALERO)) return 0;
        if (isAlreadyExecutedToday(believes)) return 0;
        // Always active for Jornalero; urgency rises when money is scarce
        return believes.getProfile().getMoney() < LOW_MONEY_THRESHOLD ? 1.0 : 0.7;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) stateBDI.getBelieves();
        // Higher contribution when close to broke — survival pressure
        double moneyRatio = Math.min(1.0, believes.getProfile().getMoney() / LOW_MONEY_THRESHOLD);
        double urgency = 1.0 - moneyRatio;  // 0 = rich, 1 = broke
        double base = 0.4 + urgency * 0.5;
        return evaluateEmotionalContribution(stateBDI, base);
    }
}
