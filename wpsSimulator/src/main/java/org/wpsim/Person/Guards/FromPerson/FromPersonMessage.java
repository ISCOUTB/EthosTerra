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

import BESA.Kernel.Agent.Event.DataBESA;

/**
 * Data payload for direct person-to-person messages.
 *
 * Carries the sender alias, message type, and an optional numeric or
 * string payload (e.g., skill delta for KNOWLEDGE_SHARE, wage for
 * WORK_OFFER, or free-text content for NEWS_SHARE).
 *
 * @author jairo
 */
public class FromPersonMessage extends DataBESA {

    private final String senderAlias;
    private final FromPersonMessageType messageType;
    private final double numericPayload;
    private final String textPayload;

    /**
     * Full constructor.
     *
     * @param senderAlias    BESA alias of the sending Person agent
     * @param messageType    interaction type
     * @param numericPayload numeric value (wage, skill delta, 0 if unused)
     * @param textPayload    text value (content, topic, "" if unused)
     */
    public FromPersonMessage(String senderAlias,
                             FromPersonMessageType messageType,
                             double numericPayload,
                             String textPayload) {
        this.senderAlias = senderAlias;
        this.messageType = messageType;
        this.numericPayload = numericPayload;
        this.textPayload = textPayload;
    }

    /** Convenience constructor for simple messages with no payload. */
    public FromPersonMessage(String senderAlias, FromPersonMessageType messageType) {
        this(senderAlias, messageType, 0.0, "");
    }

    public String getSenderAlias() { return senderAlias; }
    public FromPersonMessageType getMessageType() { return messageType; }
    public double getNumericPayload() { return numericPayload; }
    public String getTextPayload() { return textPayload; }
}
