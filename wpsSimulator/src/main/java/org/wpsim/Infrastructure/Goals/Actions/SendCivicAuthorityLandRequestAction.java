package org.wpsim.Infrastructure.Goals.Actions;

import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.CivicAuthority.Data.CivicAuthorityLandData;
import org.wpsim.CivicAuthority.Guards.CivicAuthorityLandGuard;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Data.Utils.PeasantActivityType;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.wpsim.WellProdSim.wpsStart;

/**
 * Declarative primitive action that sends a land request to the CivicAuthority agent
 * and immediately sets provisional settlement attributes on the agent's profile.
 *
 * <p>Equivalent to the imperative logic inside {@code ObtainALandTask}.
 *
 * <p>No YAML args required beyond the action id itself.
 */
public class SendCivicAuthorityLandRequestAction implements PrimitiveAction {

    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();

        try {
            AdmBESA.getInstance()
                    .getHandlerByAlias(wpsStart.config.getGovernmentAgentName())
                    .sendEvent(new EventBESA(
                            CivicAuthorityLandGuard.class.getName(),
                            new CivicAuthorityLandData(believes.getAlias())));
        } catch (ExceptionBESA ex) {
            wpsReport.error("SendCivicAuthorityLandRequestAction: " + ex.getMessage(), believes.getAlias());
            return false;
        }

        // Set provisional settlement attributes (mirroring ObtainALandTask)
        believes.setCurrentActivity(PeasantActivityType.PRICE_LIST);
        believes.getPeasantProfile().setHousing(1);
        believes.getPeasantProfile().setServicesPresence(1);
        believes.getPeasantProfile().setHousingSize(1);
        believes.getPeasantProfile().setHousingLocation(1);
        believes.getPeasantProfile().setFarmDistance(1);

        return true;
    }
}
