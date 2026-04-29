package org.wpsim.FamilyContainer.Guards;

import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.GuardBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.FamilyContainer.Data.DeathData;
import org.wpsim.FamilyContainer.Data.FamilyCoordinatorBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.wpsim.WellProdSim.wpsStart;

/**
 * Guard executed on the FamilyCoordinator when a Person agent dies.
 *
 * <p>Responsibilities:</p>
 * <ol>
 *   <li>Remove the deceased from {@link FamilyCoordinatorBelieves#getMemberAliases()}.</li>
 *   <li>Unbind the agent from the family service in the BESA directory.</li>
 *   <li>Kill the agent via {@code AdmBESA.killAgent()}.</li>
 *   <li>Log the death event for the WebSocket UI.</li>
 * </ol>
 *
 * @author jairo
 */
public class DeathGuard extends GuardBESA {

    @Override
    public void funcExecGuard(EventBESA event) {
        DeathData data = (DeathData) event.getData();
        if (data == null) return;

        AgentBDI coordinator = (AgentBDI) this.agent;
        FamilyCoordinatorBelieves believes =
                (FamilyCoordinatorBelieves) ((StateBDI) coordinator.getState()).getBelieves();

        String personAlias = data.getPersonAlias();
        String familyAlias = believes.getFamilyAlias();

        System.out.println("[DeathGuard] " + personAlias + " died (" + data.getCause()
                + ") in family " + familyAlias);

        // Remove from family composition
        believes.removeMember(personAlias);

        // Unbind from family service registry
        try {
            String personId = AdmBESA.getInstance()
                    .getHandlerByAlias(personAlias)
                    .getAgId();
            AdmBESA.getInstance().unbindService(personId, "family:" + familyAlias);
        } catch (ExceptionBESA ignored) {
            // Already unregistered or legacy mode — ignore
        }

        // Kill the agent
        try {
            String personId = AdmBESA.getInstance()
                    .getHandlerByAlias(personAlias)
                    .getAgId();
            AdmBESA.getInstance().killAgent(personId,
                    wpsStart.config.getDoubleProperty("control.passwd"));
        } catch (Exception ex) {
            System.err.println("[DeathGuard] Could not kill " + personAlias + ": " + ex.getMessage());
        }

        // Report updated family state to WebSocket
        wpsReport.ws(believes.toJson(), familyAlias);
    }
}
