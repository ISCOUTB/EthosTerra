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

import org.wpsim.Person.Data.PersonBelieves;
import rational.mapping.Believes;
import rational.mapping.Task;

/**
 * Base class for all tasks belonging to individual Person agents.
 *
 * Mirrors {@link wpsTask} but binds to {@link PersonBelieves} instead of
 * PeasantFamilyBelieves. Each concrete task subclass overrides
 * {@link #executeTask(Believes)} with role-specific logic.
 *
 * @author jairo
 */
public class wpsPersonTask extends Task {

    protected boolean isExecuted = false;

    /** Standard daily time budget consumed by most individual activities (minutes). */
    public static final double DEFAULT_ACTIVITY_TIME = 240;

    @Override
    public boolean checkFinish(Believes parameters) {
        PersonBelieves believes = (PersonBelieves) parameters;
        isExecuted = believes.isTaskExecutedOnDate(
                believes.getInternalCurrentDate(),
                this.getClass().getSimpleName()
        );

        if (isExecuted && (this.taskState == STATE.WAITING_FOR_EXECUTION
                || this.taskState == STATE.IN_EXECUTION)) {
            return false;
        }

        return isExecuted;
    }

    @Override
    public void executeTask(Believes believes) {
    }

    @Override
    public void interruptTask(Believes believes) {
    }

    @Override
    public void cancelTask(Believes believes) {
    }

    protected void setExecuted(boolean isExecuted) {
        this.isExecuted = isExecuted;
    }
}
