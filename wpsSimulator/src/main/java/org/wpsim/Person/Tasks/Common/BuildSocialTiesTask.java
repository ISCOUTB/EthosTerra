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
package org.wpsim.Person.Tasks.Common;

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

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Reaches out to one person in the social network with a GREETING.
 *
 * Side effects:
 * <ul>
 *   <li>Selects a random known person and sends them a {@link FromPersonMessageType#GREETING}.</li>
 *   <li>Increases own reputation slightly.</li>
 *   <li>Emits a LEISURE emotional event.</li>
 *   <li>Consumes 60 minutes of the daily time budget.</li>
 * </ul>
 *
 * @author jairo
 */
public class BuildSocialTiesTask extends wpsPersonTask {

    private static final double TIME_COST = 60;
    private static final Random RNG = new Random();

    @Override
    public void executeTask(Believes parameters) {
        this.setExecuted(false);
        PersonBelieves believes = (PersonBelieves) parameters;

        believes.useTime(TIME_COST);
        believes.setCurrentActivity("SOCIALIZING");

        List<String> network = new ArrayList<>(believes.getSocialNetwork());
        if (!network.isEmpty()) {
            String target = network.get(RNG.nextInt(network.size()));
            sendGreeting(believes.getAlias(), target);
            believes.recordInteraction(target);
        }

        believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "LEISURE", "TIME"));
        believes.addTaskToLog(believes.getInternalCurrentDate());
    }

    private static void sendGreeting(String senderAlias, String targetAlias) {
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(targetAlias)
                   .sendEvent(new EventBESA(
                           FromPersonGuard.class.getName(),
                           new FromPersonMessage(senderAlias, FromPersonMessageType.GREETING)
                   ));
        } catch (ExceptionBESA ex) {
            ReportBESA.error("BuildSocialTiesTask greeting to " + targetAlias + ": " + ex.getMessage());
        }
    }
}
