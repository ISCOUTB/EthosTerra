package org.wpsim.Infrastructure.Goals.Actions;

import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.CommunityDynamics.Data.CommunityDynamicsDataMessage;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.WellProdSim.wpsStart;

import java.util.Map;

/**
 * Action to send collaboration events to CommunityDynamics (Society).
 * Used for both requesting help and offering help.
 */
public class SendSocietyCollaborationAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();
        Map<String, Object> args = context.getParameters();
        
        String guardClass = (String) args.get("guard");
        int amount = args.get("amount") != null ? ((Number) args.get("amount")).intValue() : 5;
        String flagToSet = (String) args.get("flag"); // "asked_for_collaboration" or "asked_for_contractor"

        try {
            AdmBESA.getInstance().getHandlerByAlias(
                    wpsStart.config.getSocietyAgentName()
            ).sendEvent(
                    new EventBESA(guardClass,
                            new CommunityDynamicsDataMessage(
                                    believes.getPeasantProfile().getPeasantFamilyAlias(),
                                    believes.getPeasantProfile().getPeasantFamilyAlias(),
                                    amount
                            )
                    )
            );

            if ("asked_for_collaboration".equals(flagToSet)) {
                believes.setAskedForCollaboration(true);
            } else if ("asked_for_contractor".equals(flagToSet)) {
                believes.setAskedForContractor(true);
            }
            return true;
        } catch (ExceptionBESA ex) {
            System.err.println("SendSocietyCollaborationAction Error: " + ex.getMessage());
            return false;
        }
    }
}
