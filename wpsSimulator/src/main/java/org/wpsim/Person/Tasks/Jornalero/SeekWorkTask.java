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
package org.wpsim.Person.Tasks.Jornalero;

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
 * A Jornalero contacts people in their social network to offer their labor.
 *
 * Preferentially targets Agricultores (identified by naming convention
 * or network knowledge). If no specific contact is found, broadcasts a
 * WORK_OFFER to all known persons.
 *
 * Side effects:
 * <ul>
 *   <li>Sends {@link FromPersonMessageType#WORK_OFFER} to one or more contacts.</li>
 *   <li>Emits a WORK emotional event.</li>
 *   <li>Consumes 120 minutes of the daily time budget.</li>
 * </ul>
 *
 * @author jairo
 */
public class SeekWorkTask extends wpsPersonTask {

    private static final double TIME_COST = 120;
    private static final double DAILY_WAGE = 30000;
    private static final Random RNG = new Random();

    @Override
    public void executeTask(Believes parameters) {
        this.setExecuted(false);
        PersonBelieves believes = (PersonBelieves) parameters;

        believes.useTime(TIME_COST);
        believes.setCurrentActivity("SEEKING_WORK");

        List<String> network = new ArrayList<>(believes.getSocialNetwork());
        if (!network.isEmpty()) {
            // Send offer to a random known contact
            String target = network.get(RNG.nextInt(network.size()));
            sendWorkOffer(believes.getAlias(), target, DAILY_WAGE);
            believes.setWait(true); // waiting for a response
        }

        believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "WORK", "MONEY"));
        believes.addTaskToLog(believes.getInternalCurrentDate());
    }

    private static void sendWorkOffer(String senderAlias, String targetAlias, double wage) {
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(targetAlias)
                   .sendEvent(new EventBESA(
                           FromPersonGuard.class.getName(),
                           new FromPersonMessage(senderAlias,
                                                 FromPersonMessageType.WORK_OFFER,
                                                 wage, "")
                   ));
        } catch (ExceptionBESA ex) {
            ReportBESA.error("SeekWorkTask offer to " + targetAlias + ": " + ex.getMessage());
        }
    }
}
