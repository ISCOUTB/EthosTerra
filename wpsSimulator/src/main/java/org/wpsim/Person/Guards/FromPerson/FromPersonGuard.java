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
package org.wpsim.Person.Guards.FromPerson;

import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Emotional.EmotionalEvent;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Log.ReportBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.WellProdSim.Base.wpsGuardBESA;

/**
 * Handles incoming messages from other Person agents.
 *
 * When a Person receives a social message, this guard updates the
 * receiver's beliefs (social network, emotions, skills, reputation)
 * and optionally sends a reply.
 *
 * @author jairo
 */
public class FromPersonGuard extends wpsGuardBESA {

    @Override
    public void funcExecGuard(EventBESA event) {
        FromPersonMessage message = (FromPersonMessage) event.getData();
        StateBDI state = (StateBDI) this.getAgent().getState();
        PersonBelieves believes = (PersonBelieves) state.getBelieves();

        String sender = message.getSenderAlias();

        // Always add sender to social network on first contact
        believes.addToSocialNetwork(sender);

        switch (message.getMessageType()) {

            case GREETING -> {
                believes.recordInteraction(sender);
                believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "LEISURE", "TIME"));
                replyGreeting(believes, sender);
            }

            case WORK_OFFER -> {
                believes.setCurrentActivity("EVALUATING_WORK_OFFER");
                believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "WORK", "MONEY"));
                // Accept if Jornalero and has time; otherwise ignore
                if (believes.getRole().name().equals("JORNALERO")
                        && believes.haveTimeAvailable(480)) {
                    sendReply(sender, believes.getAlias(),
                              FromPersonMessageType.COLLABORATION_ACCEPT,
                              0, "");
                }
            }

            case COLLABORATION_REQUEST -> {
                believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "HELPED", "TIME"));
                believes.recordInteraction(sender);
                sendReply(sender, believes.getAlias(),
                          FromPersonMessageType.COLLABORATION_ACCEPT, 0, "");
            }

            case COLLABORATION_ACCEPT -> {
                believes.recordInteraction(sender);
                believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "HELPED", "TIME"));
                believes.setWait(false);
            }

            case KNOWLEDGE_SHARE -> {
                double skillDelta = message.getNumericPayload();
                believes.getProfile().increaseSkills(skillDelta);
                believes.recordInteraction(sender);
                believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "HELPED", "TIME"));
            }

            case HEALTH_SERVICE -> {
                int healAmount = (int) message.getNumericPayload();
                int current = believes.getProfile().getHealth();
                believes.getProfile().setHealth(Math.min(100, current + healAmount));
                believes.recordInteraction(sender);
                believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "DOVITALS", "TIME"));
            }

            case MINGA_CALL -> {
                // Register intent to attend; actual task handled by dedicated goal
                believes.setCurrentActivity("MINGA_PENDING");
                believes.recordInteraction(sender);
                sendReply(sender, believes.getAlias(),
                          FromPersonMessageType.MINGA_CONFIRM, 0, "");
            }

            case NEWS_SHARE -> {
                // Rumor / news propagation: slightly modify uncertainty emotion
                believes.processEmotionalEvent(
                        new EmotionalEvent("FAMILY", "CHECKCROPS", "TIME"));
            }

            case WORK_DONE -> {
                believes.setCurrentActivity("IDLE");
                believes.recordInteraction(sender);
            }

            default -> ReportBESA.info("FromPersonGuard: unhandled type "
                    + message.getMessageType() + " from " + sender);
        }
    }

    /** Sends a GREETING reply back to the original sender. */
    private void replyGreeting(PersonBelieves believes, String targetAlias) {
        sendReply(targetAlias, believes.getAlias(), FromPersonMessageType.GREETING, 0, "");
    }

    /** Generic send helper. */
    private static void sendReply(String targetAlias, String senderAlias,
                                  FromPersonMessageType type,
                                  double numericPayload, String textPayload) {
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(targetAlias)
                   .sendEvent(new EventBESA(
                           FromPersonGuard.class.getName(),
                           new FromPersonMessage(senderAlias, type, numericPayload, textPayload)
                   ));
        } catch (ExceptionBESA ex) {
            ReportBESA.error("FromPersonGuard reply to " + targetAlias + ": " + ex.getMessage());
        }
    }
}
