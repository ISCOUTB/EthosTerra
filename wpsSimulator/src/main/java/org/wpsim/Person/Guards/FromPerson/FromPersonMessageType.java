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

/**
 * Message types for direct person-to-person communication.
 * These enable individuals to interact across family boundaries,
 * forming community networks independent of household structure.
 *
 * @author jairo
 */
public enum FromPersonMessageType {

    /** Simple social greeting; strengthens the social tie between two individuals. */
    GREETING,

    /** Offer of paid work to a Jornalero by an Agricultor or Lider. */
    WORK_OFFER,

    /** Request for help with a specific task (labor, knowledge, care). */
    COLLABORATION_REQUEST,

    /** Acceptance of a collaboration or work offer. */
    COLLABORATION_ACCEPT,

    /** Rejection of a collaboration or work offer. */
    COLLABORATION_REJECT,

    /** A Maestra shares knowledge, increasing the recipient's skills. */
    KNOWLEDGE_SHARE,

    /** A Curandera offers health-care service to a sick individual. */
    HEALTH_SERVICE,

    /** A LiderComunitario calls all known persons to a collective minga. */
    MINGA_CALL,

    /** Confirmation that an individual will attend a minga. */
    MINGA_CONFIRM,

    /** General news or rumor propagating through the social network. */
    NEWS_SHARE,

    /** Notification that an individual has completed work for another. */
    WORK_DONE
}
