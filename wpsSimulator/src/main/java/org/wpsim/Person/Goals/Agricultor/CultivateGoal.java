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
package org.wpsim.Person.Goals.Agricultor;

import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Data.SocialRole;
import org.wpsim.Person.Tasks.Agricultor.CultivateTask;
import org.wpsim.WellProdSim.Base.wpsPersonGoalBDI;
import org.wpsim.WellProdSim.wpsStart;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;

/**
 * L3 Development — Daily farming work for the AGRICULTOR role.
 *
 * An Agricultor dedicates a block of their day to cultivating the family's
 * land: checking crops, tending soil, or preparing the next harvest. The
 * task does not yet interact with AgroEcosystem directly; that coupling
 * arrives in Etapa 3 when Person agents are linked to FamilyBelieves.
 *
 * Restricted to: {@link SocialRole#AGRICULTOR}
 *
 * @author jairo
 */
public class CultivateGoal extends wpsPersonGoalBDI {

    public CultivateGoal(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    public static CultivateGoal buildGoal() {
        CultivateTask task = new CultivateTask();
        Plan plan = new Plan();
        plan.addTask(task);
        RationalRole role = new RationalRole("CultivateTask", plan);
        return new CultivateGoal(
                wpsStart.getPlanID(), role, "CultivateTask", GoalBDITypes.OPORTUNITY);
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        // Only viable for Agricultores with enough time
        if (!believes.getRole().equals(SocialRole.AGRICULTOR)) return 0;
        return believes.haveTimeAvailable(480) ? 1 : 0;
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        if (!believes.getRole().equals(SocialRole.AGRICULTOR)) return 0;
        if (isAlreadyExecutedToday(believes)) return 0;
        // Activate once per day (after vitals are done)
        return believes.isNewDay() ? 0 : 1;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) stateBDI.getBelieves();
        // Contribution grows with skills (experienced farmers work more efficiently)
        double base = 0.5 + believes.getProfile().getSkills() * 0.3;
        return evaluateEmotionalContribution(stateBDI, base);
    }
}
