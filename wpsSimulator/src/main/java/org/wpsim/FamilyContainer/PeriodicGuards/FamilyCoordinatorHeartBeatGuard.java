package org.wpsim.FamilyContainer.PeriodicGuards;

import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.PeriodicGuardBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Log.ReportBESA;
import org.wpsim.FamilyContainer.Data.FamilyCoordinatorBelieves;
import org.wpsim.WellProdSim.wpsStart;
import rational.guards.InformationFlowGuard;

/**
 * Periodic heartbeat for the FamilyCoordinator BDI agent.
 *
 * Follows the same pattern as {@link org.wpsim.Person.PeriodicGuards.PersonHeartBeatGuard}:
 * fires a BDI InformationFlow pulse at each tick so the BDI engine can
 * evaluate goals (ManageFamilyResources, pending births/deaths, etc.).
 *
 * @author jairo
 */
public class FamilyCoordinatorHeartBeatGuard extends PeriodicGuardBESA {

    @Override
    public synchronized void funcPeriodicExecGuard(EventBESA event) {
        AgentBDI coordinator = (AgentBDI) this.agent;
        FamilyCoordinatorBelieves believes =
                (FamilyCoordinatorBelieves) ((StateBDI) coordinator.getState()).getBelieves();

        if (checkFinish(believes)) return;

        sendBDIPulse(this.agent.getAlias());
    }

    private static void sendBDIPulse(String alias) {
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(alias)
                   .sendEvent(new EventBESA(InformationFlowGuard.class.getName(), null));
        } catch (ExceptionBESA ex) {
            ReportBESA.error("FamilyCoordinatorHeartBeat BDI pulse: " + ex.getMessage());
        }
    }

    private boolean checkFinish(FamilyCoordinatorBelieves believes) {
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
