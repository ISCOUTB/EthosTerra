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
package org.wpsim.Person.Tasks.LiderComunitario;

import BESA.Emotional.EmotionalEvent;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Log.ReportBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Guards.FromPerson.FromPersonGuard;
import org.wpsim.Person.Guards.FromPerson.FromPersonMessage;
import org.wpsim.Person.Guards.FromPerson.FromPersonMessageType;
import org.wpsim.WellProdSim.Base.wpsPersonTask;
import rational.mapping.Believes;

/**
 * A LiderComunitario broadcasts a MINGA_CALL to their entire social network.
 *
 * All reachable contacts receive the call; each one that responds with
 * MINGA_CONFIRM (handled by {@link FromPersonGuard}) logs the interaction.
 * This represents the strongest collective-action mechanism in the
 * individual-agent layer.
 *
 * Side effects:
 * <ul>
 *   <li>Sends {@link FromPersonMessageType#MINGA_CALL} to all known persons.</li>
 *   <li>Increases leader's reputation significantly.</li>
 *   <li>Emits HOUSEHOLDING (community stability) emotional event.</li>
 *   <li>Consumes 360 minutes of the daily time budget.</li>
 * </ul>
 *
 * @author jairo
 */
public class OrganizeMingaTask extends wpsPersonTask {

    private static final double TIME_COST = 360;
    private static final double REPUTATION_BOOST = 0.02;

    @Override
    public void executeTask(Believes parameters) {
        this.setExecuted(false);
        PersonBelieves believes = (PersonBelieves) parameters;

        believes.useTime(TIME_COST);
        believes.setCurrentActivity("ORGANIZING_MINGA");

        // Broadcast to all known community members
        int callsSent = 0;
        for (String memberAlias : believes.getSocialNetwork()) {
            sendMingaCall(believes.getAlias(), memberAlias);
            callsSent++;
        }

        if (callsSent > 0) {
            believes.getProfile().increaseReputation(REPUTATION_BOOST * callsSent);
            believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "HOUSEHOLDING", "TIME"));
        }

        believes.addTaskToLog(believes.getInternalCurrentDate());
    }

    private static void sendMingaCall(String senderAlias, String targetAlias) {
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(targetAlias)
                   .sendEvent(new EventBESA(
                           FromPersonGuard.class.getName(),
                           new FromPersonMessage(senderAlias, FromPersonMessageType.MINGA_CALL)
                   ));
        } catch (ExceptionBESA ex) {
            ReportBESA.error("OrganizeMingaTask call to " + targetAlias + ": " + ex.getMessage());
        }
    }
}
