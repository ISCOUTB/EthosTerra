/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \  *    @since 2023                                  *
 * \_/\_/  | .__/ |___/   *                                                 *
 * | |                    *    @author Jairo Serrano                        *
 * |_|                    *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package org.wpsim.WellProdSim.Base;

import BESA.BDI.AgentStructuralModel.GoalBDI;
import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.PeasantFamily.Emotions.EmotionalEvaluator;
import org.wpsim.Person.Data.PersonBelieves;
import rational.RationalRole;
import rational.mapping.Believes;

/**
 * Base class for all BDI goals belonging to individual Person agents.
 *
 * Mirrors {@link wpsGoalBDI} but operates on {@link PersonBelieves}
 * instead of PeasantFamilyBelieves, keeping the Person subsystem
 * fully decoupled from the family agent hierarchy.
 *
 * @author jairo
 */
public class wpsPersonGoalBDI extends GoalBDI {

    public wpsPersonGoalBDI(long id, RationalRole role, String description, GoalBDITypes type) {
        super(id, role, description, type);
    }

    @Override
    public double evaluateViability(Believes believes) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double detectGoal(Believes believes) throws KernellAgentEventExceptionBESA {
        return 0;
    }

    @Override
    public double evaluatePlausibility(Believes believes) throws KernellAgentEventExceptionBESA {
        return 1;
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        return 0;
    }

    @Override
    public boolean predictResultUnlegality(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        return true;
    }

    /**
     * A goal succeeds when its associated task has been logged today.
     */
    @Override
    public boolean goalSucceeded(Believes parameters) throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) parameters;
        return believes.isTaskExecutedOnDate(
                believes.getInternalCurrentDate(),
                this.getClass().getSimpleName()
        );
    }

    /**
     * Checks whether this goal's task has already run today.
     */
    public boolean isAlreadyExecutedToday(PersonBelieves believes) {
        return believes.isTaskExecutedOnDate(
                believes.getInternalCurrentDate(),
                this.getClass().getSimpleName().replace("Goal", "Task")
        );
    }

    /**
     * Returns the emotional contribution modifier blended with a base contribution.
     * When emotions are disabled the raw contribution is returned unchanged.
     */
    public double evaluateEmotionalContribution(StateBDI stateBDI, double contribution)
            throws KernellAgentEventExceptionBESA {
        PersonBelieves believes = (PersonBelieves) stateBDI.getBelieves();
        EmotionalEvaluator evaluator = new EmotionalEvaluator("EmotionalRulesFull");
        if (believes.isHaveEmotions()) {
            return (evaluator.evaluate(believes.getEmotionsListCopy()) + contribution) / 2;
        }
        return contribution;
    }
}
