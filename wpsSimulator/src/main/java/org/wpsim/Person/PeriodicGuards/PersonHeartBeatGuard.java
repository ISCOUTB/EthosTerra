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
package org.wpsim.Person.PeriodicGuards;

import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.PeriodicGuardBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Log.ReportBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.WellProdSim.wpsStart;
import rational.guards.InformationFlowGuard;

/**
 * Periodic heartbeat that drives the BDI reasoning cycle for a Person agent.
 *
 * Avoids importing the concrete {@code Person} class to prevent a circular
 * dependency with {@code Person → PersonHeartBeatGuard → Person}. Instead
 * it casts {@code this.agent} (inherited {@code protected AgentBESA} field
 * from {@link BESA.Kernel.Agent.GuardBESA}) to {@link AgentBDI} — the same
 * pattern used by all BESA periodic guards that need BDI state access.
 *
 * @author jairo
 */
public class PersonHeartBeatGuard extends PeriodicGuardBESA {

    @Override
    public synchronized void funcPeriodicExecGuard(EventBESA event) {
        AgentBDI agentBDI = (AgentBDI) this.agent;
        PersonBelieves believes = (PersonBelieves) ((StateBDI) agentBDI.getState()).getBelieves();

        if (checkDead(believes)) return;
        if (checkFinish(believes)) return;

        sendBDIPulse(this.agent.getAlias());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static void sendBDIPulse(String alias) {
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(alias)
                   .sendEvent(new EventBESA(InformationFlowGuard.class.getName(), null));
        } catch (ExceptionBESA ex) {
            ReportBESA.error("PersonHeartBeat BDI pulse: " + ex.getMessage());
        }
    }

    private boolean checkDead(PersonBelieves believes) {
        if (believes.getProfile().getHealth() <= 0) {
            this.stopPeriodicCall();
            try {
                this.agent.shutdownAgent();
            } catch (Exception e) {
                System.out.println("Error cerrando Person agent");
            }
            return true;
        }
        return false;
    }

    private boolean checkFinish(PersonBelieves believes) {
        int endYear = java.time.LocalDate.now().getYear() + wpsStart.params.years;
        String endDate = "01/01/" + endYear;
        if (believes.getInternalCurrentDate().equals(endDate)) {
            this.stopPeriodicCall();
            this.agent.shutdownAgent();
            return true;
        }
        return false;
    }
}
